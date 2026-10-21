import { describe, expect, it, vi } from 'vitest';
import { generate } from '../../../src/config/gemini.js';
import {
  AiReplyError,
  decodeTransmission,
  evaluateAnswer,
  getHint,
  mentorChat,
  withUsage,
  writeDebrief,
} from '../../../src/services/ai/aiService.js';
import type { ChallengeContent } from '../../../src/types/content.js';
import { geminiReply } from '../../helpers/defaults.js';

// The Ship's AI logic around Gemini: the bug-line guard, JSON checking,
// the server's own line check, and token usage. Gemini itself is a fake.

const bugHunt: ChallengeContent = {
  challengeId: 102,
  questId: 1,
  questTitle: 'Signal Check',
  concept: 'Operators',
  language: 'C#',
  challengeType: 'bug_hunt',
  instructions: 'Find the bug.',
  codeSnippet: 'int total = 0;\nfor (;;)\n  total =+ i;',
  answerKey: '=+ assigns instead of adding.',
  markingCriteria: 'Says =+ assigns.',
  bugLine: 3,
};

const explain: ChallengeContent = { ...bugHunt, challengeId: 101, challengeType: 'read_and_explain', bugLine: undefined };

// Gemini replies with these texts in order (the last one repeats)
function geminiSays(...texts: string[]) {
  let call = 0;
  vi.mocked(generate).mockImplementation(async (model) => ({
    response: geminiReply(texts[Math.min(call++, texts.length - 1)]!),
    modelUsed: model,
    usedFallback: false,
  }));
}

const json = (value: object) => JSON.stringify(value);

describe('bug-line guard (hints and chat)', () => {
  it.each([
    'Look at line 3.',
    'Check Line #3 again.',
    'The problem is on LINE 3!',
    'Compare lines 2-3.',
    'Compare lines 2 – 3.',
    'Look at lines 2 and 3.',
    'Lines 1, 2, 3 matter.',
    'See L3.',
  ])('catches "%s", retries, then replaces the mention', async (leak) => {
    geminiSays(leak);
    const hint = await getHint(bugHunt, 'cadet', 1);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(hint).toContain('the right line');
    expect(hint).not.toMatch(/\b3\b/);
  });

  it.each(['Look at line 13.', 'Line 30 is fine.', 'There are 3 lines here.', 'The loop runs 3 times.'])(
    'leaves "%s" alone (not the bug’s line)',
    async (safe) => {
      geminiSays(safe);
      expect(await getHint(bugHunt, 'cadet', 1)).toBe(safe);
      expect(generate).toHaveBeenCalledTimes(1);
    },
  );

  it('doesn’t guard objectives that aren’t bug hunts', async () => {
    geminiSays('Line 3 declares the total.');
    expect(await mentorChat(explain, 'pilot', [{ from: 'pilot', text: 'what does line 3 do?' }])).toBe('Line 3 declares the total.');
  });

  it('guards mentor chat too', async () => {
    geminiSays('It is on line 3.', 'Look inside the loop.');
    expect(await mentorChat(bugHunt, 'pilot', [{ from: 'pilot', text: 'which line?' }])).toBe('Look inside the loop.');
  });
});

describe('models and settings', () => {
  it('uses Flash-Lite for hints and debriefs, Flash for chat, marking and decoding', async () => {
    geminiSays(json({ correct: true, feedback: 'Yes.' }));
    await getHint(explain, 'cadet', 1);
    await writeDebrief('Signal Check', 'C#', 'cadet', [{ challengeType: 'bug_hunt', attempts: 1, hintsUsed: 0 }]);
    await mentorChat(explain, 'cadet', [{ from: 'pilot', text: 'hi' }]);
    await evaluateAnswer(explain, 'cadet', 'answer');

    expect(vi.mocked(generate).mock.calls.map((c) => c[0])).toEqual(['flashLite', 'flashLite', 'flash', 'flash']);
  });

  it('asks for JSON when marking, at temperature 0 so the same answer gets the same mark', async () => {
    geminiSays(json({ correct: true, feedback: 'Yes.' }));
    await evaluateAnswer(explain, 'cadet', 'answer');

    expect(vi.mocked(generate).mock.calls[0]![2]).toMatchObject({ responseMimeType: 'application/json', temperature: 0 });
  });

  it('takes prompt tags the model copied out of its reply', async () => {
    geminiSays('<ai_turn> Pilot, stellar execution. </ai_turn>');
    expect(await writeDebrief('First Contact', 'C#', 'cadet', [{ challengeType: 'bug_hunt', attempts: 1, hintsUsed: 0 }])).toBe(
      'Pilot, stellar execution.',
    );
  });

  it('takes them out of every field of a JSON reply too', async () => {
    geminiSays(json({ correct: false, feedback: '<ai_turn>Close.</ai_turn>', guidingQuestion: 'What is <pilot_input>stored</pilot_input>?' }));
    expect(await evaluateAnswer(explain, 'pilot', 'x')).toEqual({ correct: false, feedback: 'Close.', guidingQuestion: 'What is stored?' });
  });

  it('throws AiReplyError for an empty reply', async () => {
    geminiSays('   ');
    await expect(getHint(explain, 'cadet', 1)).rejects.toBeInstanceOf(AiReplyError);
  });
});

describe('evaluateAnswer', () => {
  it('passes on the model’s mark and feedback', async () => {
    geminiSays(json({ correct: false, feedback: 'Close.', guidingQuestion: 'What is stored?' }));
    expect(await evaluateAnswer(explain, 'pilot', 'it adds')).toEqual({
      correct: false,
      feedback: 'Close.',
      guidingQuestion: 'What is stored?',
    });
  });

  it('drops the guiding question from a correct answer', async () => {
    geminiSays(json({ correct: true, feedback: 'Yes.', guidingQuestion: 'Anything else?' }));
    expect(await evaluateAnswer(explain, 'pilot', 'it stores')).toEqual({ correct: true, feedback: 'Yes.', guidingQuestion: undefined });
  });

  it('retries once when the JSON doesn’t fit, then gives up with AiReplyError', async () => {
    geminiSays('{"correct": "yes"}', '{oops');
    await expect(evaluateAnswer(explain, 'pilot', 'x')).rejects.toBeInstanceOf(AiReplyError);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('accepts JSON that fits on the retry', async () => {
    geminiSays('{oops', json({ correct: true, feedback: 'Yes.' }));
    expect((await evaluateAnswer(explain, 'pilot', 'x')).correct).toBe(true);
  });

  it('passes a bug hunt with the right line marked', async () => {
    geminiSays(json({ correct: true, feedback: 'Found it.' }));
    expect((await evaluateAnswer(bugHunt, 'pilot', '=+ assigns', 3)).correct).toBe(true);
  });

  it('fails a bug hunt with no line marked, asking the pilot to mark it', async () => {
    geminiSays(json({ correct: true, feedback: 'Found it.' }));
    expect(await evaluateAnswer(bugHunt, 'pilot', '=+ assigns')).toEqual({
      correct: false,
      feedback: 'Your explanation is on target, Pilot. Now mark the line where it happens: click it in the code viewer.',
      guidingQuestion: 'Which line in the code actually causes the problem you described?',
    });
  });

  it('fails a bug hunt on the wrong line, whatever the model said', async () => {
    geminiSays(json({ correct: true, feedback: 'Found it.' }));
    const result = await evaluateAnswer(bugHunt, 'pilot', '=+ assigns', 1);

    expect(result.correct).toBe(false);
    expect(result.feedback).toBe("Your explanation is on target, Pilot, but line 1 isn't where the bug lives.");
  });

  describe('a bug that can be fixed on more than one line', () => {
    // Line 1 declares total, so fixing it there is also accepted
    const twoPlaces: ChallengeContent = { ...bugHunt, altBugLines: [1] };

    it('passes when the pilot marks the other accepted line', async () => {
      geminiSays(json({ correct: true, feedback: 'A fix that works.' }));
      expect(await evaluateAnswer(twoPlaces, 'pilot', 'declare it differently', 1)).toMatchObject({ correct: true });
    });

    it('still fails on a line that isn’t accepted', async () => {
      geminiSays(json({ correct: true, feedback: 'Found it.' }));
      expect((await evaluateAnswer(twoPlaces, 'pilot', '=+ assigns', 2)).correct).toBe(false);
    });

    it('keeps the other accepted line out of replies too', async () => {
      geminiSays('Have a look at line 1.', 'Look at where total starts.');
      expect(await getHint(twoPlaces, 'cadet', 1)).toBe('Look at where total starts.');
    });
  });

  it('redacts the bug’s line from failing feedback without re-marking', async () => {
    geminiSays(json({ correct: false, feedback: 'The bug is on line 3.', guidingQuestion: 'What does line 3 do?' }));
    const result = await evaluateAnswer(bugHunt, 'pilot', 'no idea', 1);

    expect(result).toEqual({ correct: false, feedback: 'The bug is on the right line.', guidingQuestion: 'What does the right line do?' });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('decodeTransmission', () => {
  it('returns the sections', async () => {
    const sections = [{ lines: '1-2', explanation: 'Sets up a counter.' }];
    geminiSays(json({ sections }));
    expect(await decodeTransmission(explain, 'cadet', 'let a = 1;')).toEqual(sections);
  });

  it.each([
    ['no sections', { sections: [] }],
    ['more than 8 sections', { sections: Array.from({ length: 9 }, () => ({ lines: '1', explanation: 'x' })) }],
    ['an empty explanation', { sections: [{ lines: '1', explanation: '' }] }],
  ])('rejects a reply with %s', async (_name, reply) => {
    geminiSays(json(reply));
    await expect(decodeTransmission(explain, 'cadet', 'let a = 1;')).rejects.toBeInstanceOf(AiReplyError);
  });
});

describe('withUsage', () => {
  it('collects every Gemini call a feature made, retries included', async () => {
    let call = 0;
    vi.mocked(generate).mockImplementation(async (model) => ({
      response: {
        text: call++ === 0 ? '{bad' : json({ correct: true, feedback: 'Yes.' }),
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10, thoughtsTokenCount: 5 },
      } as never,
      modelUsed: model === 'flash' && call > 1 ? 'flashLite' : model,
      usedFallback: false,
    }));
    const { result, usage } = await withUsage(() => evaluateAnswer(explain, 'pilot', 'x'));

    expect(result.correct).toBe(true);
    expect(usage).toEqual([
      { model: 'flash', inputTokens: 50, outputTokens: 15 },
      { model: 'flashLite', inputTokens: 50, outputTokens: 15 },
    ]);
  });

  it('keeps simultaneous features’ usage apart', async () => {
    geminiSays('A hint.');
    const [a, b] = await Promise.all([
      withUsage(() => getHint(explain, 'cadet', 1)),
      withUsage(() => Promise.all([getHint(explain, 'cadet', 1), getHint(explain, 'cadet', 2)])),
    ]);

    expect(a.usage).toHaveLength(1);
    expect(b.usage).toHaveLength(2);
  });

  it('counts missing usage data as zero tokens', async () => {
    vi.mocked(generate).mockResolvedValue({ response: { text: 'Hi.' } as never, modelUsed: 'flashLite', usedFallback: false });
    const { usage } = await withUsage(() => getHint(explain, 'cadet', 1));

    expect(usage).toEqual([{ model: 'flashLite', inputTokens: 0, outputTokens: 0 }]);
  });
});
