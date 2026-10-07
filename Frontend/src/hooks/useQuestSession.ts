import { useEffect, useReducer, useRef } from 'react';
import {
  CommsError,
  COMMS_DOWN_MESSAGE,
  decodeTransmission,
  evaluateAnswer,
  requestDebrief,
  requestHint,
  sendMentorMessage,
} from '../services/aiService';
import { completeQuest } from '../services/questService';
import type { ChatTurn, Evaluation } from '../types/ai';
import type { ProficiencyLevel } from '../types/pilot';
import type { QuestCompletion, QuestDetail } from '../types/quest';
import { challengeLabel } from '../utils/quests';
import { usePilot } from './usePilot';

// Everything that happens on the Quest screen: which objective the pilot is
// on, their answers, hints and attempts, and the Ship's AI conversation.
// All AI calls go through services/aiService.ts.

export const MAX_HINTS = 3;

export type ObjectiveStatus = 'locked' | 'current' | 'cleared';

export interface ObjectiveProgress {
  status: ObjectiveStatus;
  attempts: number;
  hintsUsed: number;
  answer: string;
  markedLine?: number; // bug hunts
  pastedCode: string; // decode objectives
  decoded: boolean; // decode objectives: the Ship's AI has explained the pasted code
  lastEvaluation?: Evaluation;
}

export type CommsTone = 'chat' | 'hint' | 'success' | 'retry' | 'decode' | 'info' | 'error';

export interface CommsMessage {
  id: number;
  from: 'pilot' | 'ai';
  text: string;
  tone: CommsTone;
  label?: string; // small heading above the message, e.g. "Hint 1 of 3"
}

type Busy = 'hint' | 'submit' | 'chat' | 'decode' | 'complete' | null;

interface SessionState {
  current: number; // the objective being worked on
  viewing: number; // the objective on screen (can be an earlier, cleared one)
  objectives: ObjectiveProgress[];
  messages: CommsMessage[];
  nextMessageId: number;
  busy: Busy;
  online: boolean;
  explainAs: ProficiencyLevel;
  completion: QuestCompletion | null;
  debrief: string | null;
  debriefOpen: boolean;
}

type EditablePart = Partial<Pick<ObjectiveProgress, 'answer' | 'markedLine' | 'pastedCode'>>;

type Action =
  | { type: 'edit'; index: number; patch: EditablePart }
  | { type: 'view'; index: number }
  | { type: 'explainAs'; level: ProficiencyLevel }
  | { type: 'busy'; busy: Busy }
  | { type: 'online'; online: boolean }
  | { type: 'messages'; messages: Omit<CommsMessage, 'id'>[] }
  | { type: 'hintUsed'; index: number }
  | { type: 'decoded'; index: number }
  | { type: 'evaluated'; index: number; evaluation: Evaluation }
  | { type: 'completed'; completion: QuestCompletion; debrief: string }
  | { type: 'debriefOpen'; open: boolean };

function updateObjective(state: SessionState, index: number, patch: Partial<ObjectiveProgress>): ObjectiveProgress[] {
  return state.objectives.map((o, i) => (i === index ? { ...o, ...patch } : o));
}

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'edit': {
      const patch: Partial<ObjectiveProgress> = { ...action.patch };
      // Changing the pasted code means the old decode no longer applies
      if (action.patch.pastedCode !== undefined) patch.decoded = false;
      return { ...state, objectives: updateObjective(state, action.index, patch) };
    }
    case 'view':
      return state.objectives[action.index]?.status === 'locked' ? state : { ...state, viewing: action.index };
    case 'explainAs':
      return { ...state, explainAs: action.level };
    case 'busy':
      return { ...state, busy: action.busy };
    case 'online':
      return { ...state, online: action.online };
    case 'messages': {
      const added = action.messages.map((m, i) => ({ ...m, id: state.nextMessageId + i }));
      return { ...state, messages: [...state.messages, ...added], nextMessageId: state.nextMessageId + added.length };
    }
    case 'hintUsed': {
      const objective = state.objectives[action.index];
      if (!objective) return state;
      return { ...state, objectives: updateObjective(state, action.index, { hintsUsed: objective.hintsUsed + 1 }) };
    }
    case 'decoded':
      return { ...state, objectives: updateObjective(state, action.index, { decoded: true }) };
    case 'evaluated': {
      const objective = state.objectives[action.index];
      if (!objective) return state;
      let objectives = updateObjective(state, action.index, {
        attempts: objective.attempts + 1,
        lastEvaluation: action.evaluation,
        status: action.evaluation.correct ? 'cleared' : objective.status,
      });
      if (!action.evaluation.correct) return { ...state, objectives };

      // Cleared: unlock the next objective and move to it
      const next = action.index + 1;
      if (next < objectives.length) {
        objectives = objectives.map((o, i) => (i === next ? { ...o, status: 'current' } : o));
        return { ...state, objectives, current: next, viewing: next };
      }
      return { ...state, objectives };
    }
    case 'completed':
      return { ...state, completion: action.completion, debrief: action.debrief, debriefOpen: true };
    case 'debriefOpen':
      return { ...state, debriefOpen: action.open };
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

const isClearedOnServer = (quest: QuestDetail, challengeId: number) =>
  quest.progress.clearedChallengeIds.includes(challengeId);

const everyObjectiveCleared = (quest: QuestDetail) =>
  quest.challenges.length > 0 && quest.challenges.every((c) => isClearedOnServer(quest, c.challengeId));

const FALLBACK_DEBRIEF =
  "Strong work, Pilot. The Ship's AI couldn't file a full debrief this time, but every objective is logged.";

function initialState(quest: QuestDetail): SessionState {
  // Resume an unfinished attempt: objectives the server has already marked
  // cleared stay cleared, and the pilot starts on the first one left
  const firstLeft = quest.challenges.findIndex((c) => !isClearedOnServer(quest, c.challengeId));
  // Every objective cleared but the quest not filed yet (e.g. the connection
  // dropped): the session files it on load, see useQuestSession below
  const allCleared = firstLeft === -1 && quest.challenges.length > 0;
  const resumeAt = allCleared ? quest.challenges.length - 1 : Math.max(0, firstLeft);
  const current = quest.challenges[resumeAt];
  const resuming = resumeAt > 0 || allCleared;
  return {
    current: resumeAt,
    viewing: resumeAt,
    objectives: quest.challenges.map((_, i) => ({
      status: allCleared || i < resumeAt ? 'cleared' : i === resumeAt ? 'current' : 'locked',
      attempts: 0,
      hintsUsed: 0,
      answer: '',
      pastedCode: '',
      decoded: false,
    })),
    messages: [
      {
        id: 0,
        from: 'ai',
        tone: 'info',
        text: allCleared
          ? 'Welcome back, Pilot. Every objective is logged: filing the quest as cleared now.'
          : resuming
          ? `Welcome back, Pilot. Your progress is logged: picking up at objective ${pad(resumeAt + 1)}, ${current ? challengeLabel(current.challengeType).toLowerCase() : 'ready'}.`
          : `Comms link established, Pilot. Objective 01 is ${current ? challengeLabel(current.challengeType).toLowerCase() : 'ready'}. Ask me anything along the way: I'll give you hints and questions, never the answer.`,
      },
    ],
    nextMessageId: 1,
    busy: null,
    online: true,
    explainAs: quest.pilotRank ?? 'cadet',
    completion: null,
    debrief: null,
    debriefOpen: false,
  };
}

// Only these tones are real conversation worth sending back as context
const CONTEXT_TONES: CommsTone[] = ['chat', 'hint', 'success', 'retry', 'decode'];
const CHAT_CONTEXT_LIMIT = 12;

export function useQuestSession(quest: QuestDetail) {
  const [state, dispatch] = useReducer(reducer, quest, initialState);
  const { reload: reloadPilot } = usePilot();

  const addMessages = (...messages: Omit<CommsMessage, 'id'>[]) => dispatch({ type: 'messages', messages });

  // Runs one AI call: tracks busy/online state and turns failures into a comms message
  async function withComms<T>(busy: Busy, call: () => Promise<T>): Promise<T | undefined> {
    dispatch({ type: 'busy', busy });
    try {
      const result = await call();
      dispatch({ type: 'online', online: true });
      return result;
    } catch (err) {
      dispatch({ type: 'online', online: false });
      addMessages({ from: 'ai', tone: 'error', text: err instanceof CommsError ? err.message : COMMS_DOWN_MESSAGE });
      return undefined;
    } finally {
      dispatch({ type: 'busy', busy: null });
    }
  }

  const index = state.current;
  const challenge = quest.challenges[index];
  const progress = state.objectives[index];
  const isDecode = challenge?.challengeType === 'decode_transmission';
  const pastedCode = isDecode && progress?.pastedCode.trim() ? progress.pastedCode : undefined;

  async function requestNextHint() {
    if (state.busy || !challenge || !progress || progress.status !== 'current') return;
    if (progress.hintsUsed >= MAX_HINTS) return;
    const tier = (progress.hintsUsed + 1) as 1 | 2 | 3;

    const hint = await withComms('hint', () =>
      requestHint({
        challengeId: challenge.challengeId,
        proficiency: state.explainAs,
        tier,
        answerDraft: progress.answer.trim() || undefined,
        pastedCode,
      }),
    );
    if (hint === undefined) return;
    dispatch({ type: 'hintUsed', index });
    addMessages({ from: 'ai', tone: 'hint', label: `Hint ${tier} of ${MAX_HINTS}`, text: hint });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (state.busy || !challenge || !trimmed) return;
    addMessages({ from: 'pilot', tone: 'chat', text: trimmed });

    const history: ChatTurn[] = [
      ...state.messages.filter((m) => CONTEXT_TONES.includes(m.tone)).map((m) => ({ from: m.from, text: m.text })),
      { from: 'pilot' as const, text: trimmed },
    ].slice(-CHAT_CONTEXT_LIMIT);

    const reply = await withComms('chat', () =>
      sendMentorMessage({ challengeId: challenge.challengeId, proficiency: state.explainAs, messages: history, pastedCode }),
    );
    if (reply !== undefined) addMessages({ from: 'ai', tone: 'chat', text: reply });
  }

  async function decode() {
    if (state.busy || !challenge || !progress || !isDecode || !pastedCode) return;
    const sections = await withComms('decode', () =>
      decodeTransmission({ challengeId: challenge.challengeId, proficiency: state.explainAs, code: pastedCode }),
    );
    if (sections === undefined) return;
    dispatch({ type: 'decoded', index });
    addMessages(
      {
        from: 'ai',
        tone: 'info',
        text: `Transmission decoded in ${sections.length} section${sections.length === 1 ? '' : 's'}. Work through them, then explain the code in your own words.`,
      },
      ...sections.map((s) => ({ from: 'ai' as const, tone: 'decode' as const, label: `Lines ${s.lines}`, text: s.explanation })),
    );
  }

  async function finishQuest(lastIndex: number) {
    const results = quest.challenges.map((c, i) => {
      const o = state.objectives[i];
      // The final objective's last attempt isn't in state yet when this runs
      return { challengeId: c.challengeId, attempts: (o?.attempts ?? 0) + (i === lastIndex ? 1 : 0), hintsUsed: o?.hintsUsed ?? 0 };
    });

    dispatch({ type: 'busy', busy: 'complete' });
    try {
      // The completion must be recorded before the debrief: the server only
      // writes a debrief for a quest the pilot has cleared
      const completion = await completeQuest(quest.questId);
      const debrief = await requestDebrief({
        questId: quest.questId,
        proficiency: state.explainAs,
        objectives: results.map((r, i) => ({
          challengeType: quest.challenges[i]?.challengeType ?? 'read_and_explain',
          attempts: Math.max(1, r.attempts),
          hintsUsed: r.hintsUsed,
        })),
      }).catch(() => FALLBACK_DEBRIEF);
      dispatch({ type: 'completed', completion, debrief });
      reloadPilot(); // the nav bar picks up the new XP and level
    } catch {
      // Every answer is already saved, so reopening the quest files it again
      addMessages({
        from: 'ai',
        tone: 'error',
        text: "Couldn't file the quest as cleared. Your answers are saved: refresh the page to try again, Pilot.",
      });
    } finally {
      dispatch({ type: 'busy', busy: null });
    }
  }

  // Files a quest whose objectives were all cleared before this visit. The ref
  // stops React's development double-run of effects sending it twice.
  const filedOnLoad = useRef(false);
  useEffect(() => {
    if (filedOnLoad.current || !everyObjectiveCleared(quest)) return;
    filedOnLoad.current = true;
    void finishQuest(quest.challenges.length - 1);
    // Only on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAnswer() {
    if (state.busy || !challenge || !progress || progress.status !== 'current') return;
    const answer = progress.answer.trim();
    if (!answer || (isDecode && !progress.decoded)) return;

    const evaluation = await withComms('submit', () =>
      evaluateAnswer({
        challengeId: challenge.challengeId,
        proficiency: state.explainAs,
        answer,
        selectedLine: progress.markedLine,
        hintsUsed: progress.hintsUsed,
        pastedCode,
      }),
    );
    if (evaluation === undefined) return;

    dispatch({ type: 'evaluated', index, evaluation });
    const heading = `Objective ${pad(index + 1)} · ${evaluation.correct ? 'Cleared' : 'Not yet'}`;
    addMessages({
      from: 'ai',
      tone: evaluation.correct ? 'success' : 'retry',
      label: heading,
      text: evaluation.guidingQuestion ? `${evaluation.feedback}\n\n${evaluation.guidingQuestion}` : evaluation.feedback,
    });

    if (!evaluation.correct) return;
    const next = quest.challenges[index + 1];
    if (next) {
      addMessages({
        from: 'ai',
        tone: 'info',
        text: `Objective ${pad(index + 2)} unlocked: ${challengeLabel(next.challengeType).toLowerCase()}.`,
      });
    } else {
      await finishQuest(index);
    }
  }

  return {
    state,
    completed: state.completion !== null,
    editObjective: (i: number, patch: EditablePart) => dispatch({ type: 'edit', index: i, patch }),
    viewObjective: (i: number) => dispatch({ type: 'view', index: i }),
    setExplainAs: (level: ProficiencyLevel) => dispatch({ type: 'explainAs', level }),
    setDebriefOpen: (open: boolean) => dispatch({ type: 'debriefOpen', open }),
    requestNextHint,
    sendMessage,
    decode,
    submitAnswer,
  };
}

export type QuestSession = ReturnType<typeof useQuestSession>;
