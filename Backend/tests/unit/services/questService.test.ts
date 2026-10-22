import { describe, expect, it, vi } from 'vitest';
import { pool } from '../../../src/config/db.js';
import * as progress from '../../../src/models/progressModel.js';
import { checkCanAnswer, completeQuest, objectiveAccess, requireCompleted } from '../../../src/services/questService.js';
import { fakeConnection } from '../../helpers/defaults.js';

// Rules for playing a quest that the endpoint tests don't reach directly

const cleared = (...questIds: number[]) => questIds.map((questId) => ({ questId, lastCompletedAt: new Date() }));

describe('objectiveAccess', () => {
  it('returns the objective with its quest and prompt content', async () => {
    const access = await objectiveAccess(7, 102);

    expect(access.quest.questId).toBe(1);
    expect(access.challenge.challengeId).toBe(102);
    expect(access.content).toMatchObject({ language: 'C#', challengeType: 'bug_hunt', bugLine: 3 });
  });

  it('refuses an objective in a locked quest (403)', async () => {
    await expect(objectiveAccess(7, 201)).rejects.toMatchObject({ status: 403 });
  });

  it('allows a cleared quest’s objectives, so it can be replayed', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue(cleared(1));
    await expect(objectiveAccess(7, 101)).resolves.toBeDefined();
  });

  it('refuses an unknown objective (404)', async () => {
    await expect(objectiveAccess(7, 5555)).rejects.toMatchObject({ status: 404, message: 'Unknown objective.' });
  });
});

describe('checkCanAnswer', () => {
  it('lets the first objective be answered in a new attempt', async () => {
    await expect(checkCanAnswer(7, await objectiveAccess(7, 101))).resolves.toBeUndefined();
  });

  it('lets the next objective be answered once the earlier ones are cleared', async () => {
    vi.mocked(progress.listOpenAttempts).mockResolvedValue([{ attemptId: 1, questId: 1, clearedChallengeIds: [101] }]);
    await expect(checkCanAnswer(7, await objectiveAccess(7, 102))).resolves.toBeUndefined();
  });

  it('lets a wrongly answered objective be tried again', async () => {
    vi.mocked(progress.listOpenAttempts).mockResolvedValue([{ attemptId: 1, questId: 1, clearedChallengeIds: [] }]);
    await expect(checkCanAnswer(7, await objectiveAccess(7, 101))).resolves.toBeUndefined();
  });
});

describe('requireCompleted', () => {
  it('returns the quest with its language once cleared', async () => {
    vi.mocked(progress.hasCompletedQuest).mockResolvedValue(true);
    expect(await requireCompleted(7, 11)).toMatchObject({ questId: 11, language: 'JavaScript' });
  });

  it('refuses a quest not yet cleared (409)', async () => {
    await expect(requireCompleted(7, 11)).rejects.toMatchObject({ status: 409 });
  });
});

describe('completeQuest XP', () => {
  // Side quest 3 is worth 50 XP; its only objective is 301
  function readyToCompleteSideQuest() {
    vi.mocked(pool.getConnection).mockResolvedValue(fakeConnection() as never);
    vi.mocked(progress.findOpenAttemptId).mockResolvedValue(8);
    vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set([301]));
    vi.mocked(progress.listClearedQuests).mockResolvedValue(cleared(1, 3));
  }

  it('rounds a replay’s share to whole XP (25% of 50 = 13)', async () => {
    readyToCompleteSideQuest();
    vi.mocked(progress.hasCompletedQuest).mockResolvedValue(true);

    expect((await completeQuest(7, 3)).xpEarned).toBe(13);
  });

  it('applies a fractional booster (1.5 × 50 = 75)', async () => {
    readyToCompleteSideQuest();
    vi.mocked(progress.findActiveBooster).mockResolvedValue({ boosterId: 1, name: 'Half Boost', xpMultiplier: 1.5 });

    expect((await completeQuest(7, 3)).xpEarned).toBe(75);
  });

  it('multiplies a booster with an XP visor (2 × 1.1 × 50 = 110) and reports both', async () => {
    readyToCompleteSideQuest();
    vi.mocked(progress.findActiveBooster).mockResolvedValue({ boosterId: 1, name: 'Overdrive Core', xpMultiplier: 2 });
    vi.mocked(progress.findVisorPerk).mockResolvedValue({ name: 'Nova Visor', perk: 'xp_bonus', xpMultiplier: 1.1 });
    const result = await completeQuest(7, 3);

    expect(result.xpEarned).toBe(110);
    expect(result).toMatchObject({ booster: { name: 'Overdrive Core' }, visor: { name: 'Nova Visor', xpMultiplier: 1.1 } });
  });

  it('gives no visor bonus on a replay', async () => {
    readyToCompleteSideQuest();
    vi.mocked(progress.hasCompletedQuest).mockResolvedValue(true);
    vi.mocked(progress.findVisorPerk).mockResolvedValue({ name: 'Nova Visor', perk: 'xp_bonus', xpMultiplier: 1.1 });
    const result = await completeQuest(7, 3);

    expect(result.xpEarned).toBe(13);
    expect(result).not.toHaveProperty('visor');
  });

  it('gives no XP bonus for a streak shield visor', async () => {
    readyToCompleteSideQuest();
    vi.mocked(progress.findVisorPerk).mockResolvedValue({ name: 'Ember Visor', perk: 'streak_shield', xpMultiplier: null });
    const result = await completeQuest(7, 3);

    expect(result.xpEarned).toBe(50);
    expect(result).not.toHaveProperty('visor');
  });

  it('grants no booster for a quest without one', async () => {
    readyToCompleteSideQuest();
    const result = await completeQuest(7, 3);

    expect(progress.grantBooster).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('boosterEarned');
  });

  it('suggests no next quest when the sector has nothing left', async () => {
    vi.mocked(pool.getConnection).mockResolvedValue(fakeConnection() as never);
    vi.mocked(progress.findOpenAttemptId).mockResolvedValue(9);
    vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set([1101]));
    vi.mocked(progress.listClearedQuests).mockResolvedValue(cleared(11));
    const result = await completeQuest(7, 11);

    expect(result).toMatchObject({ nextQuestId: null, unlocked: [], sector: { displayName: 'JavaScript', percentBefore: 0, percentAfter: 100 } });
  });
});
