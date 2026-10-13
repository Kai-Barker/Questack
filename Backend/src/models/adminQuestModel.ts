import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db.js';

// Quest content for the admin quest editor: every quest, draft or published,
// including answer keys, marking criteria and bug lines. Only the admin
// routes (behind requireAdmin) may call these. Writes take a connection, so
// adminQuestService can run a whole save in one transaction.

export type QuestStatus = 'draft' | 'published';
export type Difficulty = 'easy' | 'medium' | 'hard';
// architecture is in the schema, but has no editor or marking support yet
export type EditableChallengeType = 'read_and_explain' | 'bug_hunt' | 'decode_transmission';

export interface AdminQuestSummary {
  questId: number;
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  displayOrder: number;
  objectiveCount: number;
}

export interface AdminObjective {
  challengeId: number;
  type: EditableChallengeType;
  instructions: string;
  fileName: string | null;
  codeSnippet: string | null;
  answerKey: string | null;
  markingCriteria: string;
  bugLine: number | null;
}

export interface AdminQuest {
  questId: number;
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  displayOrder: number;
  prerequisiteIds: number[];
  objectives: AdminObjective[];
}

// What a save writes (adminQuestService has already validated it)
export interface QuestFields {
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
}

export interface ObjectiveFields {
  challengeId?: number; // set for an objective that already exists
  type: EditableChallengeType;
  instructions: string;
  fileName: string | null;
  codeSnippet: string | null;
  answerKey: string | null;
  markingCriteria: string;
  bugLine: number | null;
}

export interface QuestNode {
  questId: number;
  languageId: number;
  title: string;
  status: QuestStatus;
  displayOrder: number;
  prerequisiteIds: number[];
  challengeIds: number[];
}

export interface QuestGraph {
  quests: QuestNode[];
  edges: { questId: number; prerequisiteId: number }[]; // questId needs prerequisiteId cleared first
}

export async function listSectors(): Promise<{ languageId: number; name: string; displayName: string }[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT language_id, name, display_name FROM languages ORDER BY display_order, language_id',
  );
  return rows.map((r) => ({ languageId: r.language_id, name: r.name, displayName: r.display_name }));
}

export async function listQuests(): Promise<AdminQuestSummary[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT q.quest_id, q.language_id, q.title, q.concept, q.difficulty, q.status, q.display_order,
            (SELECT COUNT(*) FROM challenges c WHERE c.quest_id = q.quest_id) AS objective_count
     FROM quests q
     ORDER BY q.language_id, q.display_order, q.quest_id`,
  );
  return rows.map((r) => ({
    questId: r.quest_id,
    languageId: r.language_id,
    title: r.title,
    concept: r.concept,
    difficulty: r.difficulty,
    status: r.status,
    displayOrder: r.display_order,
    objectiveCount: Number(r.objective_count),
  }));
}

export async function findQuest(questId: number): Promise<AdminQuest | null> {
  const [[quests], [prerequisites], [objectives]] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT quest_id, language_id, title, concept, difficulty, status, is_side_quest, story_text, xp_reward, display_order
       FROM quests WHERE quest_id = ? LIMIT 1`,
      [questId],
    ),
    pool.execute<RowDataPacket[]>(
      'SELECT prerequisite_quest_id FROM quest_prerequisites WHERE quest_id = ? ORDER BY prerequisite_quest_id',
      [questId],
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT c.challenge_id, c.challenge_type, c.instructions,
              d.file_name, d.code_snippet, d.answer_key, d.marking_criteria, d.bug_line
       FROM challenges c
       LEFT JOIN code_challenge_details d ON d.challenge_id = c.challenge_id
       WHERE c.quest_id = ?
       ORDER BY c.challenge_order, c.challenge_id`,
      [questId],
    ),
  ]);
  const q = quests[0];
  if (!q) return null;
  return {
    questId: q.quest_id,
    languageId: q.language_id,
    title: q.title,
    concept: q.concept,
    difficulty: q.difficulty,
    status: q.status,
    isSideQuest: q.is_side_quest === 1,
    storyText: q.story_text ?? '',
    xpReward: q.xp_reward,
    displayOrder: q.display_order,
    prerequisiteIds: prerequisites.map((p) => p.prerequisite_quest_id as number),
    objectives: objectives.map((c) => ({
      challengeId: c.challenge_id,
      type: c.challenge_type,
      instructions: c.instructions,
      fileName: c.file_name ?? null,
      codeSnippet: c.code_snippet ?? null,
      answerKey: c.answer_key ?? null,
      markingCriteria: c.marking_criteria ?? '',
      bugLine: c.bug_line ?? null,
    })),
  };
}

// The database is a round trip away (~180 ms), so a save is kept to a
// handful of queries: one read for the whole galaxy, then batched writes.
// These use query() rather than execute(): execute() prepares each statement
// on the server first, an extra round trip for every new statement shape (and
// the batched inserts change shape with the number of rows). query() still
// sends values through the driver's escaping, so input can't change the SQL.

// JSON_ARRAYAGG columns arrive parsed or as text depending on the driver's type casting
function idList(value: unknown): number[] {
  const list: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  return Array.isArray(list) ? list.map(Number) : [];
}

// Every quest with its prerequisites and objective ids, in one query, with
// the quest rows locked until the transaction ends. Admin saves are rare, so
// two at once simply queue here, and neither can slip a circular
// prerequisite past the other's check.
export async function lockQuestGraph(connection: PoolConnection): Promise<QuestGraph> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT q.quest_id, q.language_id, q.title, q.status, q.display_order,
            (SELECT JSON_ARRAYAGG(p.prerequisite_quest_id) FROM quest_prerequisites p WHERE p.quest_id = q.quest_id) AS prerequisite_ids,
            (SELECT JSON_ARRAYAGG(c.challenge_id) FROM challenges c WHERE c.quest_id = q.quest_id) AS challenge_ids
     FROM quests q
     ORDER BY q.quest_id
     FOR UPDATE`,
  );
  const quests: QuestNode[] = rows.map((q) => ({
    questId: q.quest_id,
    languageId: q.language_id,
    title: q.title,
    status: q.status,
    displayOrder: q.display_order,
    prerequisiteIds: idList(q.prerequisite_ids),
    challengeIds: idList(q.challenge_ids),
  }));
  return {
    quests,
    edges: quests.flatMap((q) => q.prerequisiteIds.map((prerequisiteId) => ({ questId: q.questId, prerequisiteId }))),
  };
}

export async function insertQuest(
  connection: PoolConnection,
  fields: QuestFields,
  createdBy: number,
  displayOrder: number,
): Promise<number> {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO quests (language_id, title, concept, difficulty, status, is_side_quest, story_text, xp_reward,
       display_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fields.languageId,
      fields.title,
      fields.concept,
      fields.difficulty,
      fields.status,
      fields.isSideQuest,
      fields.storyText,
      fields.xpReward,
      displayOrder,
      createdBy,
    ],
  );
  return result.insertId;
}

// reward_id is kept as it is
export async function updateQuest(
  connection: PoolConnection,
  questId: number,
  fields: QuestFields,
  displayOrder: number,
): Promise<void> {
  await connection.query(
    `UPDATE quests SET language_id = ?, title = ?, concept = ?, difficulty = ?, status = ?, is_side_quest = ?,
       story_text = ?, xp_reward = ?, display_order = ?
     WHERE quest_id = ?`,
    [
      fields.languageId,
      fields.title,
      fields.concept,
      fields.difficulty,
      fields.status,
      fields.isSideQuest,
      fields.storyText,
      fields.xpReward,
      displayOrder,
      questId,
    ],
  );
}

const placeholders = (rows: number, columns: number) =>
  Array.from({ length: rows }, () => `(${Array(columns).fill('?').join(', ')})`).join(', ');

export async function replacePrerequisites(
  connection: PoolConnection,
  questId: number,
  prerequisiteIds: number[],
): Promise<void> {
  await connection.query('DELETE FROM quest_prerequisites WHERE quest_id = ?', [questId]);
  if (prerequisiteIds.length === 0) return;
  await connection.query(
    `INSERT INTO quest_prerequisites (quest_id, prerequisite_quest_id) VALUES ${placeholders(prerequisiteIds.length, 2)}`,
    prerequisiteIds.flatMap((id) => [questId, id]),
  );
}

// Makes the quest's objectives match the list, in its order, and returns
// their ids in that order. Objectives that already exist are updated in place
// (keeping pilots' answers to them); ones left out are deleted, along with
// any answers to them. 2-4 queries, however many objectives there are.
export async function syncObjectives(
  connection: PoolConnection,
  questId: number,
  objectives: ObjectiveFields[],
  existingIds: number[],
): Promise<number[]> {
  const kept = new Set(objectives.flatMap((o) => (o.challengeId === undefined ? [] : [o.challengeId])));
  const removed = existingIds.filter((id) => !kept.has(id));
  if (removed.length > 0) {
    await connection.query(
      `DELETE FROM challenges WHERE quest_id = ? AND challenge_id IN (${removed.map(() => '?').join(', ')})`,
      [questId, ...removed],
    );
  }
  if (objectives.length === 0) return [];

  // Existing rows (by id) are updated; rows without an id are inserted
  await connection.query(
    `INSERT INTO challenges (challenge_id, quest_id, challenge_order, challenge_type, instructions)
     VALUES ${placeholders(objectives.length, 5)}
     ON DUPLICATE KEY UPDATE challenge_order = VALUES(challenge_order),
       challenge_type = VALUES(challenge_type), instructions = VALUES(instructions)`,
    objectives.flatMap((o, i) => [o.challengeId ?? null, questId, i + 1, o.type, o.instructions]),
  );

  // New rows' ids, found by their order (unique within the quest after the writes above)
  let ids = objectives.map((o) => o.challengeId ?? 0);
  if (ids.includes(0)) {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT challenge_id, challenge_order FROM challenges WHERE quest_id = ?',
      [questId],
    );
    const byOrder = new Map(rows.map((r) => [r.challenge_order as number, r.challenge_id as number]));
    ids = objectives.map((o, i) => o.challengeId ?? byOrder.get(i + 1) ?? 0);
  }

  await connection.query(
    `INSERT INTO code_challenge_details (challenge_id, file_name, code_snippet, answer_key, marking_criteria, bug_line)
     VALUES ${placeholders(objectives.length, 6)}
     ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), code_snippet = VALUES(code_snippet),
       answer_key = VALUES(answer_key), marking_criteria = VALUES(marking_criteria), bug_line = VALUES(bug_line)`,
    objectives.flatMap((o, i) => [ids[i] ?? null, o.fileName, o.codeSnippet, o.answerKey, o.markingCriteria, o.bugLine]),
  );
  return ids;
}

// Only drafts that no pilot has ever played can be deleted. A published quest
// is hidden by moving it back to draft instead, which keeps pilots' attempts
// and flight logs intact (deleting would cascade to them).
export async function deleteDraftQuest(questId: number): Promise<'deleted' | 'published' | 'played' | 'not-found'> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM quests WHERE quest_id = ? AND status = 'draft'
       AND NOT EXISTS (SELECT 1 FROM quest_attempts a WHERE a.quest_id = ?)`,
    [questId, questId],
  );
  if (result.affectedRows === 1) return 'deleted';
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT status FROM quests WHERE quest_id = ? LIMIT 1', [questId]);
  if (!rows[0]) return 'not-found';
  return rows[0].status === 'published' ? 'published' : 'played';
}
