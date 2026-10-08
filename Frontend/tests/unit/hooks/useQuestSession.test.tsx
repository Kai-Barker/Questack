import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PilotContext } from '../../../src/context/PilotContext';
import { MAX_HINTS, useQuestSession } from '../../../src/hooks/useQuestSession';
import { COMMS_DOWN_MESSAGE } from '../../../src/services/aiService';
import type { QuestDetail } from '../../../src/types/quest';
import { COMPLETION, DECODE_QUEST, QUEST } from '../../helpers/fixtures';
import { fakePilot } from '../../helpers/render';
import { apiUrl, respond, server, unreachable } from '../../helpers/server';

// The quest screen's state: objectives, answers, hints, the Ship's AI
// conversation and clearing the quest. AI calls are answered by MSW.

const FALLBACK_DEBRIEF = "Strong work, Pilot. The Ship's AI couldn't file a full debrief this time, but every objective is logged.";

function setup(quest: QuestDetail = QUEST) {
  const pilot = fakePilot();
  const wrapper = ({ children }: { children: ReactNode }) => <PilotContext value={pilot}>{children}</PilotContext>;
  const hook = renderHook(() => useQuestSession(quest), { wrapper });
  return { ...hook, pilot, session: () => hook.result.current };
}

const lastMessage = (session: ReturnType<typeof useQuestSession>) => session.state.messages.at(-1)!;

describe('starting a quest', () => {
  it('opens on the first objective with the others locked', () => {
    const { session } = setup();

    expect(session().state).toMatchObject({ current: 0, viewing: 0, busy: null, online: true, explainAs: 'pilot', completion: null });
    expect(session().state.objectives.map((o) => o.status)).toEqual(['current', 'locked']);
    expect(session().state.messages[0]!.text).toContain('Comms link established, Pilot. Objective 01 is read and explain.');
    expect(session().completed).toBe(false);
  });

  it('explains at Cadet level when the pilot has no rank in the sector', () => {
    const { session } = setup({ ...QUEST, pilotRank: undefined });
    expect(session().state.explainAs).toBe('cadet');
  });

  it('resumes where the server says the pilot left off', () => {
    const { session } = setup({ ...QUEST, progress: { clearedChallengeIds: [101] } });

    expect(session().state.current).toBe(1);
    expect(session().state.objectives.map((o) => o.status)).toEqual(['cleared', 'current']);
    expect(session().state.messages[0]!.text).toBe(
      'Welcome back, Pilot. Your progress is logged: picking up at objective 02, bug hunt.',
    );
  });

  it('files a quest whose objectives were all cleared before this visit', async () => {
    const complete = respond('post', '/quests/1/complete', 200, COMPLETION);
    respond('post', '/ai/debrief', 200, { debrief: 'Welcome back and well flown.' });
    const { session, pilot } = setup({ ...QUEST, progress: { clearedChallengeIds: [101, 102] } });

    expect(session().state.messages[0]!.text).toContain('filing the quest as cleared now');
    await waitFor(() => expect(session().completed).toBe(true));
    expect(complete).toHaveLength(1);
    expect(session().state).toMatchObject({ completion: COMPLETION, debrief: 'Welcome back and well flown.', debriefOpen: true });
    expect(pilot.reload).toHaveBeenCalled();
  });
});

describe('editing and viewing', () => {
  it('stores the pilot’s answer and marked line', () => {
    const { result, session } = setup();
    act(() => result.current.editObjective(0, { answer: 'It stores 10.', markedLine: 1 }));

    expect(session().state.objectives[0]).toMatchObject({ answer: 'It stores 10.', markedLine: 1 });
  });

  it('can’t view a locked objective, but can go back to a cleared one', () => {
    const { result, session } = setup({ ...QUEST, progress: { clearedChallengeIds: [101] } });

    act(() => result.current.viewObjective(0));
    expect(session().state.viewing).toBe(0);

    const fresh = setup();
    act(() => fresh.result.current.viewObjective(1));
    expect(fresh.session().state.viewing).toBe(0);
  });

  it('changes how the Ship’s AI explains things', () => {
    const { result, session } = setup();
    act(() => result.current.setExplainAs('commander'));
    expect(session().state.explainAs).toBe('commander');
  });

  it('opens and closes the debrief', () => {
    const { result, session } = setup();
    act(() => result.current.setDebriefOpen(true));
    expect(session().state.debriefOpen).toBe(true);
  });
});

describe('hints', () => {
  it('asks for the next tier with the answer so far', async () => {
    const calls = respond('post', '/ai/hint', 200, { hint: 'Look at the value assigned.' });
    const { result, session } = setup();
    act(() => result.current.editObjective(0, { answer: '  it stores something  ' }));

    await act(() => result.current.requestNextHint());

    expect(calls[0]!.body).toEqual({ challengeId: 101, proficiency: 'pilot', tier: 1, answerDraft: 'it stores something' });
    expect(session().state.objectives[0]!.hintsUsed).toBe(1);
    expect(lastMessage(session())).toMatchObject({ from: 'ai', tone: 'hint', label: 'Hint 1 of 3', text: 'Look at the value assigned.' });
  });

  it(`stops after ${MAX_HINTS} hints`, async () => {
    const calls = respond('post', '/ai/hint', 200, { hint: 'Hint.' });
    const { result, session } = setup();

    for (let i = 0; i < MAX_HINTS + 1; i++) await act(() => result.current.requestNextHint());

    expect(calls.map((c) => (c.body as { tier: number }).tier)).toEqual([1, 2, 3]);
    expect(session().state.objectives[0]!.hintsUsed).toBe(3);
  });

  it('shows the server’s message and goes offline when a hint fails', async () => {
    respond('post', '/ai/hint', 429, { error: "The Ship's AI needs a moment to recharge, Pilot." });
    const { result, session } = setup();

    await act(() => result.current.requestNextHint());

    expect(session().state.online).toBe(false);
    expect(session().state.objectives[0]!.hintsUsed).toBe(0);
    expect(lastMessage(session())).toMatchObject({ tone: 'error', text: "The Ship's AI needs a moment to recharge, Pilot." });
  });
});

describe('chatting with the Ship’s AI', () => {
  it('sends the conversation so far (without status messages) and shows the reply', async () => {
    const calls = respond('post', '/ai/chat', 200, { reply: 'A variable is a labelled crate.' });
    const { result, session } = setup();

    await act(() => result.current.sendMessage('  What is a variable?  '));

    expect(calls[0]!.body).toEqual({
      challengeId: 101,
      proficiency: 'pilot',
      messages: [{ from: 'pilot', text: 'What is a variable?' }],
    });
    expect(session().state.messages.slice(-2)).toMatchObject([
      { from: 'pilot', tone: 'chat', text: 'What is a variable?' },
      { from: 'ai', tone: 'chat', text: 'A variable is a labelled crate.' },
    ]);
  });

  it('ignores an empty message', async () => {
    const { result, session } = setup();
    await act(() => result.current.sendMessage('   '));
    expect(session().state.messages).toHaveLength(1);
  });

  it('shows the comms-down message when the backend can’t be reached', async () => {
    unreachable('post', '/ai/chat');
    const { result, session } = setup();

    await act(() => result.current.sendMessage('hello'));
    expect(lastMessage(session())).toMatchObject({ tone: 'error', text: COMMS_DOWN_MESSAGE });
  });
});

describe('submitting answers', () => {
  it('a correct answer clears the objective and unlocks the next', async () => {
    const calls = respond('post', '/ai/evaluate', 200, { correct: true, feedback: 'Spot on.' });
    const { result, session } = setup();
    act(() => result.current.editObjective(0, { answer: 'It stores 10.' }));

    await act(() => result.current.submitAnswer());

    expect(calls[0]!.body).toEqual({ challengeId: 101, proficiency: 'pilot', answer: 'It stores 10.', hintsUsed: 0 });
    expect(session().state).toMatchObject({ current: 1, viewing: 1 });
    expect(session().state.objectives.map((o) => o.status)).toEqual(['cleared', 'current']);
    expect(session().state.messages.slice(-2)).toMatchObject([
      { tone: 'success', label: 'Objective 01 · Cleared', text: 'Spot on.' },
      { tone: 'info', text: 'Objective 02 unlocked: bug hunt.' },
    ]);
  });

  it('a wrong answer counts the attempt and shows the guiding question', async () => {
    respond('post', '/ai/evaluate', 200, { correct: false, feedback: 'Not quite.', guidingQuestion: 'What value is stored?' });
    const { result, session } = setup();
    act(() => result.current.editObjective(0, { answer: 'It loops.' }));

    await act(() => result.current.submitAnswer());

    expect(session().state.objectives[0]).toMatchObject({ status: 'current', attempts: 1 });
    expect(lastMessage(session())).toMatchObject({ tone: 'retry', label: 'Objective 01 · Not yet', text: 'Not quite.\n\nWhat value is stored?' });
  });

  it('does nothing with an empty answer', async () => {
    const calls = respond('post', '/ai/evaluate', 200, {});
    const { result } = setup();

    await act(() => result.current.submitAnswer());
    expect(calls).toHaveLength(0);
  });

  it('sends the marked line on a bug hunt', async () => {
    const calls = respond('post', '/ai/evaluate', 200, { correct: false, feedback: 'No.' });
    const { result } = setup({ ...QUEST, progress: { clearedChallengeIds: [101] } });
    act(() => result.current.editObjective(1, { answer: '=+ assigns', markedLine: 3 }));

    await act(() => result.current.submitAnswer());
    expect(calls[0]!.body).toMatchObject({ challengeId: 102, selectedLine: 3 });
  });

  it('clearing the last objective files the quest and fetches the debrief', async () => {
    respond('post', '/ai/evaluate', 200, { correct: true, feedback: 'Found it.' });
    const complete = respond('post', '/quests/1/complete', 200, COMPLETION);
    const debrief = respond('post', '/ai/debrief', 200, { debrief: 'Sharp eyes, Pilot.' });
    const { result, session, pilot } = setup({ ...QUEST, progress: { clearedChallengeIds: [101] } });
    act(() => result.current.editObjective(1, { answer: '=+ assigns', markedLine: 3 }));

    await act(() => result.current.submitAnswer());

    expect(complete).toHaveLength(1);
    expect(debrief[0]!.body).toEqual({
      questId: 1,
      proficiency: 'pilot',
      objectives: [
        { challengeType: 'read_and_explain', attempts: 1, hintsUsed: 0 },
        { challengeType: 'bug_hunt', attempts: 1, hintsUsed: 0 },
      ],
    });
    expect(session().state).toMatchObject({ completion: COMPLETION, debrief: 'Sharp eyes, Pilot.', debriefOpen: true, busy: null });
    expect(session().completed).toBe(true);
    expect(pilot.reload).toHaveBeenCalled();
  });

  it('uses a stock debrief when the AI can’t write one', async () => {
    respond('post', '/ai/evaluate', 200, { correct: true, feedback: 'Yes.' });
    respond('post', '/quests/1/complete', 200, COMPLETION);
    respond('post', '/ai/debrief', 503, { error: 'down' });
    const { result, session } = setup({ ...QUEST, progress: { clearedChallengeIds: [101] } });
    act(() => result.current.editObjective(1, { answer: 'x', markedLine: 3 }));

    await act(() => result.current.submitAnswer());
    expect(session().state.debrief).toBe(FALLBACK_DEBRIEF);
  });

  it('tells the pilot their answers are safe when filing the quest fails', async () => {
    respond('post', '/ai/evaluate', 200, { correct: true, feedback: 'Yes.' });
    respond('post', '/quests/1/complete', 500, {});
    const { result, session } = setup({ ...QUEST, progress: { clearedChallengeIds: [101] } });
    act(() => result.current.editObjective(1, { answer: 'x', markedLine: 3 }));

    await act(() => result.current.submitAnswer());

    expect(session().completed).toBe(false);
    expect(lastMessage(session())).toMatchObject({
      tone: 'error',
      text: "Couldn't file the quest as cleared. Your answers are saved: refresh the page to try again, Pilot.",
    });
  });
});

describe('decode objectives', () => {
  it('needs the pasted code decoded before an answer can be sent', async () => {
    const evaluate = respond('post', '/ai/evaluate', 200, { correct: true, feedback: 'Yes.' });
    const decode = respond('post', '/ai/decode', 200, {
      sections: [
        { lines: '1', explanation: 'Sets a counter.' },
        { lines: '2-3', explanation: 'Loops.' },
      ],
    });
    respond('post', '/quests/2/complete', 200, COMPLETION);
    respond('post', '/ai/debrief', 200, { debrief: 'Done.' });
    const { result, session } = setup(DECODE_QUEST);
    act(() => result.current.editObjective(0, { answer: 'It counts.', pastedCode: 'let i = 0;' }));

    await act(() => result.current.submitAnswer());
    expect(evaluate).toHaveLength(0);

    await act(() => result.current.decode());
    expect(decode[0]!.body).toEqual({ challengeId: 202, proficiency: 'pilot', code: 'let i = 0;' });
    expect(session().state.objectives[0]!.decoded).toBe(true);
    expect(session().state.messages.slice(-3)).toMatchObject([
      { tone: 'info', text: 'Transmission decoded in 2 sections. Work through them, then explain the code in your own words.' },
      { tone: 'decode', label: 'Lines 1', text: 'Sets a counter.' },
      { tone: 'decode', label: 'Lines 2-3', text: 'Loops.' },
    ]);

    await act(() => result.current.submitAnswer());
    expect(evaluate[0]!.body).toMatchObject({ pastedCode: 'let i = 0;' });
  });

  it('editing the pasted code means it has to be decoded again', async () => {
    respond('post', '/ai/decode', 200, { sections: [{ lines: '1', explanation: 'x' }] });
    const { result, session } = setup(DECODE_QUEST);
    act(() => result.current.editObjective(0, { pastedCode: 'a()' }));
    await act(() => result.current.decode());

    act(() => result.current.editObjective(0, { pastedCode: 'b()' }));
    expect(session().state.objectives[0]!.decoded).toBe(false);
  });

  it('won’t decode without pasted code', async () => {
    const decode = respond('post', '/ai/decode', 200, {});
    const { result } = setup(DECODE_QUEST);

    await act(() => result.current.decode());
    expect(decode).toHaveLength(0);
  });
});

describe('one AI call at a time', () => {
  it('ignores a second request while one is in flight', async () => {
    let hints = 0;
    server.use(
      http.post(apiUrl('/ai/hint'), async () => {
        hints++;
        await delay(50);
        return HttpResponse.json({ hint: 'h' });
      }),
    );
    const chat = respond('post', '/ai/chat', 200, { reply: 'r' });
    const { result, session } = setup();

    act(() => {
      void result.current.requestNextHint();
    });
    expect(session().state.busy).toBe('hint');

    await act(() => result.current.sendMessage('hello?'));
    await act(() => result.current.requestNextHint());
    await waitFor(() => expect(session().state.busy).toBeNull());

    expect(hints).toBe(1);
    expect(chat).toHaveLength(0);
  });
});
