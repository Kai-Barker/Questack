// Seeds the quest content in database/seeds/questContent.ts.
// Run with: npm run db:seed (after npm run db:migrate)
//
// Safe to re-run: everything is upserted by its fixed id, so editing the
// content file and seeding again updates the quests in place. Pilots'
// progress is kept. An objective that's been removed from the file is
// deleted (along with any answers to it).
//
// Re-seeding overwrites changes made to these quests' own content in the
// admin quest editor, but keeps what was added around them: objectives added
// in the editor or by the curriculum importer (e.g. briefings) stay, in their
// place, and so do extra prerequisites. Quests created in the editor (ids
// from 1000) are never touched.
import 'dotenv/config';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { dbConnectionOptions } from '../src/config/db.js';
import { formatLineList } from '../src/utils/lineList.js';
import { objectiveProblems } from './seeds/checks.js';
import { boosters, quests, type SeedQuest } from './seeds/questContent.js';

const challengeId = (questId: number, order: number) => questId * 100 + order;

// Catches content mistakes before they reach pilots
function check(quest: SeedQuest) {
  const problems: string[] = [];
  const ids = new Set(quests.map((q) => q.questId));
  for (const id of quest.prerequisites) if (!ids.has(id)) problems.push(`unknown prerequisite ${id}`);
  if (quest.grantsBooster && !boosters.some((b) => b.code === quest.grantsBooster)) {
    problems.push(`unknown booster ${quest.grantsBooster}`);
  }
  if (quest.challenges.length === 0 || quest.challenges.length > 99) problems.push('needs 1-99 objectives');
  // 1000 and up belong to quests made in the admin quest editor (migration 004)
  if (quest.questId < 1 || quest.questId >= 1000) problems.push('questId must be 1-999');

  quest.challenges.forEach((c, i) => problems.push(...objectiveProblems(c, `objective ${i + 1}`)));
  if (problems.length > 0) throw new Error(`Quest ${quest.questId} (${quest.title}): ${problems.join('; ')}`);
}

quests.forEach(check);

// multipleStatements is off: each statement is sent on its own with ? placeholders
const connection = await mysql.createConnection(dbConnectionOptions);

try {
  await connection.beginTransaction();

  // Boosters (rewards.code is unique, so this updates an existing one)
  const boosterIds = new Map<string, number>();
  for (const b of boosters) {
    await connection.execute(
      `INSERT INTO rewards (code, name, description, icon, reward_type, unlock_condition, xp_multiplier, booster_charges)
       VALUES (?, ?, ?, ?, 'booster', 'quest_reward', ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
         xp_multiplier = VALUES(xp_multiplier), booster_charges = VALUES(booster_charges)`,
      [b.code, b.name, b.description, b.code, b.xpMultiplier, b.charges],
    );
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT reward_id FROM rewards WHERE code = ?', [b.code]);
    boosterIds.set(b.code, rows[0]?.reward_id as number);
  }

  for (const q of quests) {
    await connection.execute(
      `INSERT INTO quests (quest_id, language_id, title, concept, difficulty, status, is_side_quest, story_text,
         xp_reward, reward_id, display_order, created_by)
       VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE language_id = VALUES(language_id), title = VALUES(title), concept = VALUES(concept),
         difficulty = VALUES(difficulty), status = VALUES(status), is_side_quest = VALUES(is_side_quest),
         story_text = VALUES(story_text), xp_reward = VALUES(xp_reward), reward_id = VALUES(reward_id),
         display_order = VALUES(display_order)`,
      [
        q.questId,
        q.languageId,
        q.title,
        q.concept,
        q.difficulty,
        q.isSideQuest,
        q.storyText,
        q.xpReward,
        q.grantsBooster ? (boosterIds.get(q.grantsBooster) ?? null) : null,
        q.displayOrder,
      ],
    );
  }

  // Prerequisites and objectives, once every quest exists
  for (const q of quests) {
    // Added, never removed: the curriculum importer chains these quests
    // through newer ones (e.g. Loops also needs Conditionals)
    for (const prerequisite of q.prerequisites) {
      await connection.execute('INSERT IGNORE INTO quest_prerequisites (quest_id, prerequisite_quest_id) VALUES (?, ?)', [
        q.questId,
        prerequisite,
      ]);
    }

    // Only this file's own ids (questId * 100 + order) are cleaned up, so
    // objectives added in the editor or by the importer are kept
    const keep = q.challenges.map((_, i) => challengeId(q.questId, i + 1));
    await connection.execute(
      `DELETE FROM challenges WHERE quest_id = ? AND challenge_id BETWEEN ? AND ?
         AND challenge_id NOT IN (${keep.map(() => '?').join(', ')})`,
      [q.questId, challengeId(q.questId, 1), challengeId(q.questId, 99), ...keep],
    );

    for (const [i, c] of q.challenges.entries()) {
      const id = challengeId(q.questId, i + 1);
      // An existing objective keeps its place, so a briefing put in front of it stays first
      await connection.execute(
        `INSERT INTO challenges (challenge_id, quest_id, challenge_order, challenge_type, instructions)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE challenge_type = VALUES(challenge_type), instructions = VALUES(instructions)`,
        [id, q.questId, i + 1, c.type, c.instructions],
      );
      await connection.execute(
        `INSERT INTO code_challenge_details
           (challenge_id, file_name, code_snippet, answer_key, marking_criteria, bug_line, alt_bug_lines)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), code_snippet = VALUES(code_snippet),
           answer_key = VALUES(answer_key), marking_criteria = VALUES(marking_criteria), bug_line = VALUES(bug_line),
           alt_bug_lines = VALUES(alt_bug_lines)`,
        [
          id,
          c.fileName ?? null,
          c.code ?? null,
          c.answerKey ?? null,
          c.markingCriteria,
          c.bugLine ?? null,
          formatLineList(c.altBugLines ?? []),
        ],
      );
    }
  }

  await connection.commit();

  const [[counts]] = await connection.query<RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM quests WHERE status = 'published') AS quests, (SELECT COUNT(*) FROM challenges) AS objectives",
  );
  console.log(`Seeded ${quests.length} quests. Database now has ${counts?.quests} published quests and ${counts?.objectives} objectives.`);
} catch (err) {
  await connection.rollback();
  console.error('Seeding failed, nothing was changed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await connection.end();
}

