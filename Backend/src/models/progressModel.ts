import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db.js';
import { ACTIVITY_UTC_OFFSET } from '../config/progress.js';
import type { ChallengeType, Proficiency } from '../types/content.js';

// A pilot's progress. Every query is parameterised, scoped to one user_id
// taken from the session, and grouped in SQL (never one query per quest).
// Functions that take a `connection` run inside the caller's transaction.

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

// Total XP and the name of the title the pilot has chosen (if any)
export async function getPilotRow(userId: number): Promise<{ totalXp: number; titleName: string | null }> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT u.total_xp, r.name AS title_name
     FROM users u LEFT JOIN rewards r ON r.reward_id = u.title_reward_id
     WHERE u.user_id = ?`,
    [userId],
  );
  return { totalXp: (rows[0]?.total_xp as number | undefined) ?? 0, titleName: (rows[0]?.title_name as string | null) ?? null };
}

// Each quest the pilot has cleared, with when they last cleared it
export async function listClearedQuests(userId: number): Promise<{ questId: number; lastCompletedAt: Date }[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT quest_id, MAX(completed_at) AS last_completed_at
     FROM quest_attempts WHERE user_id = ? AND completed_at IS NOT NULL
     GROUP BY quest_id`,
    [userId],
  );
  return rows.map((r) => ({ questId: r.quest_id as number, lastCompletedAt: r.last_completed_at as Date }));
}

export interface OpenAttempt {
  attemptId: number;
  questId: number;
  clearedChallengeIds: number[];
}

// Unfinished attempts, newest first, with the objectives already cleared in each
export async function listOpenAttempts(userId: number, questId?: number): Promise<OpenAttempt[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.attempt_id, a.quest_id, GROUP_CONCAT(DISTINCT ca.challenge_id) AS cleared
     FROM quest_attempts a
     LEFT JOIN challenge_answers ca ON ca.attempt_id = a.attempt_id AND ca.is_correct = 1
     WHERE a.user_id = ? AND a.completed_at IS NULL ${questId === undefined ? '' : 'AND a.quest_id = ?'}
     GROUP BY a.attempt_id, a.quest_id, a.started_at
     ORDER BY a.started_at DESC, a.attempt_id DESC`,
    questId === undefined ? [userId] : [userId, questId],
  );
  return rows.map((r) => ({
    attemptId: r.attempt_id as number,
    questId: r.quest_id as number,
    clearedChallengeIds: r.cleared ? String(r.cleared).split(',').map(Number) : [],
  }));
}

export interface LanguageProgress {
  languageId: number;
  proficiency: Proficiency;
  languageXp: number;
}

export async function listLanguageProgress(userId: number): Promise<LanguageProgress[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT language_id, proficiency_level, language_xp FROM user_language_progress WHERE user_id = ?',
    [userId],
  );
  return rows.map((r) => ({
    languageId: r.language_id as number,
    proficiency: r.proficiency_level as Proficiency,
    languageXp: r.language_xp as number,
  }));
}

// How many objectives of each type the pilot has answered correctly
export async function countCorrectAnswersByType(userId: number): Promise<Map<ChallengeType, number>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT c.challenge_type, COUNT(*) AS total
     FROM challenge_answers ca
     JOIN quest_attempts a ON a.attempt_id = ca.attempt_id
     JOIN challenges c ON c.challenge_id = ca.challenge_id
     WHERE a.user_id = ? AND ca.is_correct = 1
     GROUP BY c.challenge_type`,
    [userId],
  );
  return new Map(rows.map((r) => [r.challenge_type as ChallengeType, Number(r.total)]));
}

// Objectives cleared per local day since `since` (a UTC instant)
export async function countActivityByDay(userId: number, since: Date): Promise<Map<string, number>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE_FORMAT(CONVERT_TZ(ca.answered_at, '+00:00', ?), '%Y-%m-%d') AS day, COUNT(*) AS total
     FROM challenge_answers ca
     JOIN quest_attempts a ON a.attempt_id = ca.attempt_id
     WHERE a.user_id = ? AND ca.is_correct = 1 AND ca.answered_at >= ?
     GROUP BY day`,
    [ACTIVITY_UTC_OFFSET, userId, since],
  );
  return new Map(rows.map((r) => [r.day as string, Number(r.total)]));
}

// XP earned per local week (keyed by the Monday) since `since` (a UTC instant)
export async function sumXpByWeek(userId: number, since: Date): Promise<Map<string, number>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE_FORMAT(DATE_SUB(DATE(local_time), INTERVAL WEEKDAY(local_time) DAY), '%Y-%m-%d') AS week_start,
            SUM(xp_earned) AS xp
     FROM (SELECT CONVERT_TZ(completed_at, '+00:00', ?) AS local_time, xp_earned
           FROM quest_attempts WHERE user_id = ? AND completed_at >= ?) AS finished
     GROUP BY week_start`,
    [ACTIVITY_UTC_OFFSET, userId, since],
  );
  return new Map(rows.map((r) => [r.week_start as string, Number(r.xp)]));
}

export async function countAiQuestions(userId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM ai_usage_logs WHERE user_id = ? AND feature = 'mentor_chat'",
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}

export interface BoosterRecord {
  boosterId: number;
  name: string;
  xpMultiplier: number;
  chargesRemaining: number;
  active: boolean;
}

// Boosters the pilot still has charges on, the running one first
export async function listBoosters(userId: number): Promise<BoosterRecord[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.booster_id, r.name, r.xp_multiplier, b.charges_remaining, b.activated_at
     FROM user_boosters b JOIN rewards r ON r.reward_id = b.reward_id
     WHERE b.user_id = ? AND b.charges_remaining > 0
     ORDER BY b.activated_at IS NULL, b.acquired_at, b.booster_id`,
    [userId],
  );
  return rows.map((r) => ({
    boosterId: r.booster_id as number,
    name: r.name as string,
    xpMultiplier: Number(r.xp_multiplier),
    chargesRemaining: r.charges_remaining as number,
    active: r.activated_at !== null,
  }));
}

// Pass a connection to check inside a transaction
export async function hasCompletedQuest(
  userId: number,
  questId: number,
  db: Pick<PoolConnection, 'execute'> = pool,
): Promise<boolean> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT 1 FROM quest_attempts WHERE user_id = ? AND quest_id = ? AND completed_at IS NOT NULL LIMIT 1',
    [userId, questId],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------

// Enlists the pilot in the sector if needed
export async function setProficiency(userId: number, languageId: number, level: Proficiency): Promise<void> {
  await pool.execute(
    `INSERT INTO user_language_progress (user_id, language_id, proficiency_level) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE proficiency_level = VALUES(proficiency_level)`,
    [userId, languageId, level],
  );
}

// Locks the pilot's row so their progress writes happen one at a time
// (e.g. a double-clicked submit can't create two attempts or award XP twice)
export async function lockPilot(connection: PoolConnection, userId: number): Promise<number> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT total_xp FROM users WHERE user_id = ? FOR UPDATE',
    [userId],
  );
  return (rows[0]?.total_xp as number | undefined) ?? 0;
}

export async function findOpenAttemptId(connection: PoolConnection, userId: number, questId: number): Promise<number | null> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT attempt_id FROM quest_attempts
     WHERE user_id = ? AND quest_id = ? AND completed_at IS NULL
     ORDER BY started_at DESC, attempt_id DESC LIMIT 1`,
    [userId, questId],
  );
  return (rows[0]?.attempt_id as number | undefined) ?? null;
}

export async function createAttempt(connection: PoolConnection, userId: number, questId: number): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    'INSERT INTO quest_attempts (user_id, quest_id) VALUES (?, ?)',
    [userId, questId],
  );
  return result.insertId;
}

export async function listAttemptClears(connection: PoolConnection, attemptId: number): Promise<Set<number>> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT DISTINCT challenge_id FROM challenge_answers WHERE attempt_id = ? AND is_correct = 1',
    [attemptId],
  );
  return new Set(rows.map((r) => r.challenge_id as number));
}

export async function recordAnswer(
  connection: PoolConnection,
  answer: { attemptId: number; challengeId: number; answerText: string; feedback: string; correct: boolean; hintsUsed: number },
): Promise<void> {
  await connection.execute(
    `INSERT INTO challenge_answers (attempt_id, challenge_id, answer_text, ai_feedback, is_correct, hints_used)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [answer.attemptId, answer.challengeId, answer.answerText, answer.feedback, answer.correct, answer.hintsUsed],
  );
}

export async function findActiveBooster(
  connection: PoolConnection,
  userId: number,
): Promise<{ boosterId: number; name: string; xpMultiplier: number } | null> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT b.booster_id, r.name, r.xp_multiplier
     FROM user_boosters b JOIN rewards r ON r.reward_id = b.reward_id
     WHERE b.user_id = ? AND b.activated_at IS NOT NULL AND b.charges_remaining > 0
     ORDER BY b.activated_at LIMIT 1 FOR UPDATE`,
    [userId],
  );
  const row = rows[0];
  return row ? { boosterId: row.booster_id, name: row.name, xpMultiplier: Number(row.xp_multiplier) } : null;
}

export async function useBoosterCharge(connection: PoolConnection, boosterId: number): Promise<void> {
  await connection.execute(
    'UPDATE user_boosters SET charges_remaining = charges_remaining - 1 WHERE booster_id = ? AND charges_remaining > 0',
    [boosterId],
  );
}

// Gives the pilot a booster (not yet active). Returns its name.
export async function grantBooster(connection: PoolConnection, userId: number, rewardId: number): Promise<string | null> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT name, booster_charges FROM rewards WHERE reward_id = ? AND reward_type = 'booster'",
    [rewardId],
  );
  const reward = rows[0];
  if (!reward || !reward.booster_charges) return null;
  await connection.execute('INSERT INTO user_boosters (user_id, reward_id, charges_remaining) VALUES (?, ?, ?)', [
    userId,
    rewardId,
    reward.booster_charges,
  ]);
  return reward.name as string;
}

export async function completeAttempt(connection: PoolConnection, attemptId: number, xpEarned: number): Promise<void> {
  await connection.execute('UPDATE quest_attempts SET completed_at = NOW(), xp_earned = ? WHERE attempt_id = ?', [
    xpEarned,
    attemptId,
  ]);
}

export async function addXp(
  connection: PoolConnection,
  userId: number,
  languageId: number,
  xp: number,
  totalXp: number,
  level: number,
): Promise<void> {
  await connection.execute('UPDATE users SET total_xp = ?, level = ?, last_active = NOW() WHERE user_id = ?', [
    totalXp,
    level,
    userId,
  ]);
  // Enlists the pilot in the sector on their first clear there
  await connection.execute(
    `INSERT INTO user_language_progress (user_id, language_id, language_xp) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE language_xp = language_xp + VALUES(language_xp)`,
    [userId, languageId, xp],
  );
}

// Activates one of the pilot's boosters, if none is already running.
// Returns false if it isn't theirs, is used up, or another one is running.
export async function activateBooster(userId: number, boosterId: number): Promise<'activated' | 'not-found' | 'busy'> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await lockPilot(connection, userId);
    const [running] = await connection.execute<RowDataPacket[]>(
      'SELECT 1 FROM user_boosters WHERE user_id = ? AND activated_at IS NOT NULL AND charges_remaining > 0 LIMIT 1',
      [userId],
    );
    if (running.length > 0) {
      await connection.rollback();
      return 'busy';
    }
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE user_boosters SET activated_at = NOW()
       WHERE booster_id = ? AND user_id = ? AND activated_at IS NULL AND charges_remaining > 0`,
      [boosterId, userId],
    );
    await connection.commit();
    return result.affectedRows === 1 ? 'activated' : 'not-found';
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
