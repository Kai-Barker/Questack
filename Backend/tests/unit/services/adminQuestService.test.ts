import { describe, expect, it } from 'vitest';
import {
  checkAgainstGalaxy,
  contentProblems,
  findCircularChain,
  isUnknownSectorError,
  normaliseObjective,
  type QuestInput,
} from '../../../src/services/adminQuestService.js';
import type { QuestGraph } from '../../../src/models/adminQuestModel.js';
import { HttpError } from '../../../src/utils/httpError.js';

// The quest editor's rules, without the database

describe('findCircularChain', () => {
  // 2 needs 1, 3 needs 2
  const edges = [
    { questId: 2, prerequisiteId: 1 },
    { questId: 3, prerequisiteId: 2 },
  ];

  it('allows a straight chain', () => {
    expect(findCircularChain(4, [3], edges)).toBeNull();
  });

  it('finds a direct loop', () => {
    expect(findCircularChain(1, [2], edges)).toEqual([1, 2, 1]);
  });

  it('finds a longer loop', () => {
    expect(findCircularChain(1, [3], edges)).toEqual([1, 3, 2, 1]);
  });

  it('ignores the quest’s old prerequisites, which the save replaces', () => {
    expect(findCircularChain(2, [], [...edges, { questId: 2, prerequisiteId: 3 }])).toBeNull();
  });

  it('handles diamonds without false alarms', () => {
    const diamond = [
      { questId: 2, prerequisiteId: 1 },
      { questId: 3, prerequisiteId: 1 },
      { questId: 4, prerequisiteId: 2 },
      { questId: 4, prerequisiteId: 3 },
    ];
    expect(findCircularChain(5, [4], diamond)).toBeNull();
  });
});

describe('normaliseObjective', () => {
  it('strips code and keys from decode objectives', () => {
    expect(
      normaliseObjective({
        type: 'decode_transmission',
        instructions: 'Paste code.',
        fileName: 'a.js',
        codeSnippet: 'x',
        answerKey: 'k',
        markingCriteria: 'm',
        bugLine: 2,
      }),
    ).toEqual({
      type: 'decode_transmission',
      instructions: 'Paste code.',
      fileName: null,
      codeSnippet: null,
      answerKey: null,
      markingCriteria: 'm',
      bugLine: null,
    });
  });

  it('keeps indentation but tidies line endings and edges', () => {
    const o = normaliseObjective({
      type: 'read_and_explain',
      instructions: 'i',
      codeSnippet: '\r\n\r\nif (x)\r\n{\r\n    y();\r\n}   \r\n',
      markingCriteria: 'm',
    });
    expect(o.codeSnippet).toBe('if (x)\n{\n    y();\n}');
  });

  it('drops a bug line from anything but a bug hunt', () => {
    expect(normaliseObjective({ type: 'read_and_explain', instructions: 'i', markingCriteria: 'm', bugLine: 3 }).bugLine).toBeNull();
  });

  it('keeps only the Markdown of a briefing', () => {
    expect(
      normaliseObjective({
        type: 'briefing',
        instructions: '# Variables\n\nA variable is a labelled cargo crate.',
        fileName: 'a.cs',
        codeSnippet: 'x',
        answerKey: 'k',
        markingCriteria: 'm',
        bugLine: 2,
      }),
    ).toEqual({
      type: 'briefing',
      instructions: '# Variables\n\nA variable is a labelled cargo crate.',
      fileName: null,
      codeSnippet: null,
      answerKey: null,
      markingCriteria: '',
      bugLine: null,
    });
  });
});

describe('contentProblems', () => {
  const bugHunt = normaliseObjective({
    type: 'bug_hunt',
    instructions: 'i',
    fileName: 'A.cs',
    codeSnippet: 'a\nb',
    answerKey: 'k',
    markingCriteria: 'm',
    bugLine: 2,
  });

  it('passes a complete objective', () => {
    expect(contentProblems('published', [bugHunt])).toEqual({});
  });

  it('allows a draft with no objectives yet', () => {
    expect(contentProblems('draft', [])).toEqual({});
  });

  it('needs a bug line inside the code', () => {
    expect(contentProblems('draft', [{ ...bugHunt, bugLine: null }])).toEqual({
      'objectives.0.bugLine': 'Enter the line the bug is on.',
    });
    expect(contentProblems('draft', [{ ...bugHunt, bugLine: 3 }])).toEqual({
      'objectives.0.bugLine': 'The code only has 2 lines.',
    });
  });

  it('needs marking criteria on everything but a briefing', () => {
    expect(contentProblems('draft', [{ ...bugHunt, markingCriteria: '  ' }])).toEqual({
      'objectives.0.markingCriteria': 'Add marking criteria for the Ship’s AI.',
    });
  });

  describe('briefings', () => {
    const briefing = normaliseObjective({ type: 'briefing', instructions: 'Read me.', markingCriteria: '' });

    it('need no code, answer key or marking criteria', () => {
      expect(contentProblems('published', [briefing, bugHunt])).toEqual({});
    });

    it('can be long; other instructions are kept to 5,000 characters', () => {
      const long = 'x'.repeat(5001);
      expect(contentProblems('draft', [{ ...briefing, instructions: long }])).toEqual({});
      expect(contentProblems('draft', [{ ...bugHunt, instructions: long }])).toEqual({
        'objectives.0.instructions': 'Keep this to 5,000 characters or fewer.',
      });
    });

    it('can’t be the only objectives in a published quest', () => {
      expect(contentProblems('published', [briefing])).toEqual({
        objectives: 'Add an objective that tests the pilot, not only briefings, before publishing.',
      });
      expect(contentProblems('draft', [briefing])).toEqual({});
    });
  });
});

describe('isUnknownSectorError', () => {
  it('spots the quest language foreign key failing, and nothing else', () => {
    const fk = (message: string) => Object.assign(new Error(message), { errno: 1452 });
    expect(isUnknownSectorError(fk('a foreign key constraint fails (fk_quests_language)'))).toBe(true);
    expect(isUnknownSectorError(fk('a foreign key constraint fails (fk_prereq_quest)'))).toBe(false);
    expect(isUnknownSectorError(new Error('timeout'))).toBe(false);
    expect(isUnknownSectorError(null)).toBe(false);
  });
});

describe('checkAgainstGalaxy', () => {
  const input = (overrides: Partial<QuestInput> = {}): QuestInput => ({
    languageId: 1,
    title: 'New',
    concept: 'c',
    difficulty: 'easy',
    status: 'draft',
    isSideQuest: false,
    storyText: '',
    xpReward: 10,
    prerequisiteIds: [],
    objectives: [],
    ...overrides,
  });
  const graph: QuestGraph = {
    quests: [
      { questId: 1, languageId: 1, title: 'One', status: 'published', displayOrder: 1, prerequisiteIds: [], challengeIds: [] },
      { questId: 2, languageId: 1, title: 'Two', status: 'published', displayOrder: 2, prerequisiteIds: [1], challengeIds: [] },
    ],
    edges: [{ questId: 2, prerequisiteId: 1 }],
  };

  const error = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      return err as HttpError;
    }
    return null;
  };

  it('rejects being its own prerequisite', () => {
    expect(error(() => checkAgainstGalaxy(1, input({ prerequisiteIds: [1] }), graph))?.fields?.prerequisiteIds).toBe(
      'A quest can’t be its own prerequisite.',
    );
  });

  it('rejects a prerequisite that doesn’t exist', () => {
    expect(error(() => checkAgainstGalaxy(null, input({ prerequisiteIds: [9] }), graph))?.status).toBe(400);
  });

  it('won’t move a quest other quests need to another sector', () => {
    const err = error(() => checkAgainstGalaxy(1, input({ languageId: 2, status: 'published' }), graph));
    expect(err?.status).toBe(409);
    expect(err?.message).toContain('Two');
  });

  it('lets a published quest with no published dependents go back to draft', () => {
    expect(error(() => checkAgainstGalaxy(2, input({ prerequisiteIds: [1] }), graph))).toBeNull();
  });
});
