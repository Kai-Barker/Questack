import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import type { ChallengeType } from '../types/content.js';

// Reads the published quest content (the same for every pilot). Four queries,
// no matter how many quests exist. Cached by services/questCatalog.ts.

export interface LanguageRow extends RowDataPacket {
  language_id: number;
  name: string;
  display_name: string;
}

export interface QuestRow extends RowDataPacket {
  quest_id: number;
  language_id: number;
  title: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_side_quest: number;
  story_text: string | null;
  xp_reward: number;
  reward_id: number | null;
  display_order: number;
}

export interface PrerequisiteRow extends RowDataPacket {
  quest_id: number;
  prerequisite_quest_id: number;
}

export interface ChallengeRow extends RowDataPacket {
  challenge_id: number;
  quest_id: number;
  challenge_order: number;
  challenge_type: ChallengeType;
  instructions: string;
  file_name: string | null;
  code_snippet: string | null;
  answer_key: string | null;
  marking_criteria: string | null;
  bug_line: number | null;
}

export async function loadCatalogRows() {
  const [[languages], [quests], [prerequisites], [challenges]] = await Promise.all([
    pool.execute<LanguageRow[]>('SELECT language_id, name, display_name FROM languages ORDER BY display_order, language_id'),
    pool.execute<QuestRow[]>(
      `SELECT quest_id, language_id, title, concept, difficulty, is_side_quest, story_text, xp_reward, reward_id, display_order
       FROM quests WHERE status = 'published' ORDER BY language_id, display_order, quest_id`,
    ),
    pool.execute<PrerequisiteRow[]>(
      `SELECT p.quest_id, p.prerequisite_quest_id
       FROM quest_prerequisites p JOIN quests q ON q.quest_id = p.quest_id
       WHERE q.status = 'published'`,
    ),
    pool.execute<ChallengeRow[]>(
      `SELECT c.challenge_id, c.quest_id, c.challenge_order, c.challenge_type, c.instructions,
              d.file_name, d.code_snippet, d.answer_key, d.marking_criteria, d.bug_line
       FROM challenges c
       JOIN quests q ON q.quest_id = c.quest_id
       LEFT JOIN code_challenge_details d ON d.challenge_id = c.challenge_id
       WHERE q.status = 'published'
       ORDER BY c.quest_id, c.challenge_order`,
    ),
  ]);
  return { languages, quests, prerequisites, challenges };
}
