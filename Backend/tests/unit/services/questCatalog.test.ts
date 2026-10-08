import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as questModel from '../../../src/models/questModel.js';
import { getCatalog, questState, toChallengeContent, type CatalogQuest } from '../../../src/services/questCatalog.js';
import { CATALOG_ROWS } from '../../helpers/fixtures.js';

// The catalogue is cached in memory for 5 minutes, so every test starts
// 20 minutes after the last one to get a fresh load (the cache test itself
// moves the clock up to 5 minutes on).
let clock = Date.parse('2026-10-08T10:00:00Z');

beforeEach(() => {
  clock += 20 * 60 * 1000;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(clock);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getCatalog', () => {
  it('groups quests into sectors in display order', async () => {
    const catalog = await getCatalog();

    expect(catalog.sectors.map((s) => [s.displayName, s.quests.map((q) => q.questId)])).toEqual([
      ['C#', [1, 2, 3]],
      ['JavaScript', [11]],
    ]);
  });

  it('hides quests that have no objectives', async () => {
    const catalog = await getCatalog();
    expect(catalog.questById.has(4)).toBe(false);
  });

  it('shapes quests and objectives for the app', async () => {
    const catalog = await getCatalog();
    const quest = catalog.questById.get(2)!;

    expect(quest).toMatchObject({
      questId: 2,
      languageId: 1,
      title: 'Loop Patrol',
      isSideQuest: false,
      xpReward: 200,
      rewardId: null,
      prerequisiteIds: [1],
    });
    expect(catalog.questById.get(3)!.isSideQuest).toBe(true);
    expect(quest.challenges.map((c) => [c.challengeId, c.order, c.type])).toEqual([
      [201, 1, 'read_and_explain'],
      [202, 2, 'decode_transmission'],
    ]);
    expect(quest.challenges[1]).toMatchObject({ codeSnippet: null, answerKey: null, fileName: null });
  });

  it('indexes every objective with its quest', async () => {
    const catalog = await getCatalog();

    expect([...catalog.challengeById.keys()].sort((a, b) => a - b)).toEqual([101, 102, 201, 202, 301, 1101]);
    expect(catalog.challengeById.get(102)!.quest.questId).toBe(1);
    expect(catalog.challengeById.get(102)!.challenge.bugLine).toBe(3);
  });

  it('fills in missing story text and marking criteria', async () => {
    vi.mocked(questModel.loadCatalogRows).mockResolvedValue({
      ...CATALOG_ROWS,
      quests: CATALOG_ROWS.quests.map((q) => ({ ...q, story_text: null })),
      challenges: CATALOG_ROWS.challenges.map((c) => ({ ...c, marking_criteria: null })),
    } as never);
    const catalog = await getCatalog();

    expect(catalog.questById.get(1)!.storyText).toBe('');
    expect(catalog.questById.get(1)!.challenges[0]!.markingCriteria).toBe('');
  });

  it('reuses the loaded catalogue for 5 minutes', async () => {
    await getCatalog();
    vi.setSystemTime(clock + 4 * 60 * 1000);
    await getCatalog();
    expect(questModel.loadCatalogRows).toHaveBeenCalledTimes(1);

    vi.setSystemTime(clock + 5 * 60 * 1000 + 1);
    await getCatalog();
    expect(questModel.loadCatalogRows).toHaveBeenCalledTimes(2);
  });

  it('shares one load between simultaneous requests', async () => {
    const [a, b] = await Promise.all([getCatalog(), getCatalog()]);

    expect(a).toBe(b);
    expect(questModel.loadCatalogRows).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed load', async () => {
    vi.mocked(questModel.loadCatalogRows).mockRejectedValueOnce(new Error('timeout'));

    await expect(getCatalog()).rejects.toThrow('timeout');
    await expect(getCatalog()).resolves.toBeDefined();
  });
});

describe('questState', () => {
  const quest = (prerequisiteIds: number[]) => ({ questId: 9, prerequisiteIds }) as CatalogQuest;

  it.each([
    ['cleared', [], [9], 'cleared'],
    ['available with no prerequisites', [], [], 'available'],
    ['available once every prerequisite is cleared', [1, 2], [1, 2], 'available'],
    ['locked while any prerequisite is left', [1, 2], [1], 'locked'],
  ])('%s', (_name, prereqs, cleared, expected) => {
    expect(questState(quest(prereqs), new Set(cleared))).toBe(expected);
  });
});

describe('toChallengeContent', () => {
  it('builds what the Ship’s AI prompts need, with nulls left out', async () => {
    const catalog = await getCatalog();
    const { quest, challenge } = catalog.challengeById.get(202)!;

    expect(toChallengeContent(catalog.sectorById.get(1), quest, challenge)).toEqual({
      challengeId: 202,
      questId: 2,
      questTitle: 'Loop Patrol',
      concept: 'Loops',
      language: 'C#',
      challengeType: 'decode_transmission',
      instructions: 'Instructions for objective 202.',
      codeSnippet: undefined,
      answerKey: undefined,
      markingCriteria: 'Criteria for objective 202.',
      bugLine: undefined,
    });
  });

  it('calls the language "code" when the sector is missing', async () => {
    const catalog = await getCatalog();
    const { quest, challenge } = catalog.challengeById.get(101)!;

    expect(toChallengeContent(undefined, quest, challenge).language).toBe('code');
  });
});
