import { pool } from '../config/db.js';
import { REPLAY_XP_SHARE } from '../config/progress.js';
import {
  addXp,
  completeAttempt,
  createAttempt,
  findActiveBooster,
  findOpenAttemptId,
  grantBooster,
  hasCompletedQuest,
  listAttemptClears,
  listClearedQuests,
  listLanguageProgress,
  listOpenAttempts,
  lockPilot,
  recordAnswer,
  useBoosterCharge,
} from '../models/progressModel.js';
import type { ChallengeContent } from '../types/content.js';
import { HttpError } from '../utils/httpError.js';
import { levelFromXp } from '../utils/levels.js';
import {
  getCatalog,
  questState,
  toChallengeContent,
  type Catalog,
  type CatalogChallenge,
  type CatalogQuest,
} from './questCatalog.js';

// Playing a quest: what the pilot may open, recording their answers in
// order, and clearing the quest. Every check happens here on the server; the
// browser is never trusted to say an objective or quest was cleared.

const LOCKED_MESSAGE = 'This quest is still locked. Clear the quests before it first, Pilot.';

async function clearedQuestIds(userId: number): Promise<Set<number>> {
  return new Set((await listClearedQuests(userId)).map((c) => c.questId));
}

function requireUnlocked(quest: CatalogQuest, cleared: ReadonlySet<number>) {
  if (questState(quest, cleared) === 'locked') throw new HttpError(403, LOCKED_MESSAGE);
}

// ---------------------------------------------------------------------
// GET /api/quests/:id
// ---------------------------------------------------------------------
export async function questDetail(userId: number, questId: number) {
  const [catalog, cleared, languages, open] = await Promise.all([
    getCatalog(),
    clearedQuestIds(userId),
    listLanguageProgress(userId),
    listOpenAttempts(userId, questId),
  ]);
  const quest = catalog.questById.get(questId);
  if (!quest) throw new HttpError(404, "This quest's transmission hasn't been written yet.");
  requireUnlocked(quest, cleared);

  const sector = catalog.sectorById.get(quest.languageId);
  const position = sector?.quests.findIndex((q) => q.questId === questId) ?? -1;

  return {
    questId: quest.questId,
    languageId: quest.languageId,
    sectorDisplayName: sector?.displayName ?? '',
    questNumber: position >= 0 ? position + 1 : undefined,
    pilotRank: languages.find((l) => l.languageId === quest.languageId)?.proficiency,
    title: quest.title,
    concept: quest.concept,
    difficulty: quest.difficulty,
    isSideQuest: quest.isSideQuest,
    storyText: quest.storyText,
    xpReward: quest.xpReward,
    // Only what the pilot needs to see: no answer keys, marking criteria or bug lines
    challenges: quest.challenges.map((c) => ({
      challengeId: c.challengeId,
      challengeOrder: c.order,
      challengeType: c.type,
      instructions: c.instructions,
      ...(c.codeSnippet && { code: { fileName: c.fileName ?? 'Program', snippet: c.codeSnippet } }),
    })),
    // Resume an unfinished attempt where the pilot left off
    progress: { clearedChallengeIds: open[0]?.clearedChallengeIds ?? [] },
  };
}

// ---------------------------------------------------------------------
// Ship's AI: which objective, and may this pilot work on it?
// ---------------------------------------------------------------------
export interface ObjectiveAccess {
  catalog: Catalog;
  quest: CatalogQuest;
  challenge: CatalogChallenge;
  content: ChallengeContent; // for the prompts
}

export async function objectiveAccess(userId: number, challengeId: number): Promise<ObjectiveAccess> {
  const [catalog, cleared] = await Promise.all([getCatalog(), clearedQuestIds(userId)]);
  const found = catalog.challengeById.get(challengeId);
  if (!found) throw new HttpError(404, 'Unknown objective.');
  requireUnlocked(found.quest, cleared);
  return {
    catalog,
    quest: found.quest,
    challenge: found.challenge,
    content: toChallengeContent(catalog.sectorById.get(found.quest.languageId), found.quest, found.challenge),
  };
}

// Objectives are cleared in order, once each per attempt
function orderProblem(quest: CatalogQuest, challenge: CatalogChallenge, cleared: ReadonlySet<number>): string | null {
  if (cleared.has(challenge.challengeId)) return 'You have already cleared this objective.';
  const earlier = quest.challenges.filter((c) => c.order < challenge.order);
  return earlier.every((c) => cleared.has(c.challengeId)) ? null : 'Clear the earlier objectives first, Pilot.';
}

// Before spending an AI call on an answer, check it can count
export async function checkCanAnswer(userId: number, access: ObjectiveAccess): Promise<void> {
  const [open] = await listOpenAttempts(userId, access.quest.questId);
  const problem = orderProblem(access.quest, access.challenge, new Set(open?.clearedChallengeIds ?? []));
  if (problem) throw new HttpError(409, problem);
}

// Records a marked answer in the pilot's open attempt (starting one if needed)
export async function saveAnswer(
  userId: number,
  access: ObjectiveAccess,
  answer: { text: string; feedback: string; correct: boolean; hintsUsed: number },
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await lockPilot(connection, userId);
    const attemptId =
      (await findOpenAttemptId(connection, userId, access.quest.questId)) ??
      (await createAttempt(connection, userId, access.quest.questId));
    // Checked again inside the lock, in case two answers were sent at once
    const problem = orderProblem(access.quest, access.challenge, await listAttemptClears(connection, attemptId));
    if (problem) throw new HttpError(409, problem);
    await recordAnswer(connection, {
      attemptId,
      challengeId: access.challenge.challengeId,
      answerText: answer.text,
      feedback: answer.feedback,
      correct: answer.correct,
      hintsUsed: answer.hintsUsed,
    });
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------
// POST /api/quests/objectives/:id/read
// ---------------------------------------------------------------------
// A briefing has nothing to mark: confirming it was read clears it
export async function acknowledgeBriefing(userId: number, challengeId: number): Promise<void> {
  const access = await objectiveAccess(userId, challengeId);
  if (access.challenge.type !== 'briefing') throw new HttpError(400, 'Only briefings can be cleared by reading them.');
  await saveAnswer(userId, access, { text: '', feedback: '', correct: true, hintsUsed: 0 });
}

// The debrief is only written for a quest the pilot has actually cleared
export async function requireCompleted(userId: number, questId: number): Promise<CatalogQuest & { language: string }> {
  const catalog = await getCatalog();
  const quest = catalog.questById.get(questId);
  if (!quest) throw new HttpError(404, 'Unknown quest.');
  if (!(await hasCompletedQuest(userId, questId))) throw new HttpError(409, 'Clear the quest before its debrief.');
  return { ...quest, language: catalog.sectorById.get(quest.languageId)?.displayName ?? 'code' };
}

// ---------------------------------------------------------------------
// POST /api/quests/:id/complete
// ---------------------------------------------------------------------
const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export async function completeQuest(userId: number, questId: number) {
  const catalog = await getCatalog();
  const quest = catalog.questById.get(questId);
  if (!quest) throw new HttpError(404, 'Unknown quest.');
  const sector = catalog.sectorById.get(quest.languageId);

  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    // Locks the pilot's row: a double-clicked submit waits here, then finds
    // the attempt already completed and is turned away below
    const totalXpBefore = await lockPilot(connection, userId);

    const attemptId = await findOpenAttemptId(connection, userId, questId);
    const clears = attemptId === null ? new Set<number>() : await listAttemptClears(connection, attemptId);
    if (attemptId === null || !quest.challenges.every((c) => clears.has(c.challengeId))) {
      throw new HttpError(409, 'Clear every objective before completing the quest, Pilot.');
    }

    const replay = await hasCompletedQuest(userId, questId, connection);
    // First clear: full XP, boosted. Replay: a share of it, never boosted.
    const booster = replay ? null : await findActiveBooster(connection, userId);
    const xpEarned = replay
      ? Math.round(quest.xpReward * REPLAY_XP_SHARE)
      : Math.round(quest.xpReward * (booster?.xpMultiplier ?? 1));

    const totalXpAfter = totalXpBefore + xpEarned;
    const after = levelFromXp(totalXpAfter);
    await completeAttempt(connection, attemptId, xpEarned);
    await addXp(connection, userId, quest.languageId, xpEarned, totalXpAfter, after.level);
    if (booster) await useBoosterCharge(connection, booster.boosterId);
    const boosterEarned = !replay && quest.rewardId ? await grantBooster(connection, userId, quest.rewardId) : null;

    await connection.commit();
    result = { replay, xpEarned, booster, boosterEarned, before: levelFromXp(totalXpBefore), after };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // What changed on the sector map
  const clearedAfter = await clearedQuestIds(userId);
  const clearedBefore = new Set(clearedAfter);
  if (!result.replay) clearedBefore.delete(questId);
  const sectorQuests = sector?.quests ?? [];
  const unlocked = sectorQuests
    .filter((q) => questState(q, clearedBefore) === 'locked' && questState(q, clearedAfter) === 'available')
    .map((q) => ({ questId: q.questId, title: q.title, concept: q.concept }));
  const available = sectorQuests.filter((q) => questState(q, clearedAfter) === 'available');
  const next = available.find((q) => !q.isSideQuest) ?? available[0];
  const countIn = (ids: ReadonlySet<number>) => sectorQuests.filter((q) => ids.has(q.questId)).length;

  return {
    baseXp: quest.xpReward,
    xpEarned: result.xpEarned,
    replay: result.replay,
    ...(result.booster && { booster: { name: result.booster.name, xpMultiplier: result.booster.xpMultiplier } }),
    ...(result.boosterEarned && { boosterEarned: { name: result.boosterEarned } }),
    before: result.before,
    after: result.after,
    sector: {
      displayName: sector?.displayName ?? '',
      percentBefore: percent(countIn(clearedBefore), sectorQuests.length),
      percentAfter: percent(countIn(clearedAfter), sectorQuests.length),
    },
    unlocked,
    nextQuestId: next?.questId ?? null,
  };
}
