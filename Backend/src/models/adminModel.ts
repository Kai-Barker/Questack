import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db.js';

export interface AdminOverview {
  pilots: number;
  activePilots: number;
  publishedQuests: number;
  draftQuests: number;
  aiCallsToday: number; // the last 24 hours
  aiTokensToday: number;
}

// Platform-wide counts for the admin console. Only totals: no pilot's
// details or text leave this query.
export async function getOverview(): Promise<AdminOverview> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM users) AS pilots,
       (SELECT COUNT(*) FROM users WHERE is_active = 1) AS active_pilots,
       (SELECT COUNT(*) FROM quests WHERE status = 'published') AS published_quests,
       (SELECT COUNT(*) FROM quests WHERE status = 'draft') AS draft_quests,
       (SELECT COUNT(*) FROM ai_usage_logs WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 1 DAY) AS ai_calls,
       (SELECT COALESCE(SUM(input_tokens + output_tokens), 0) FROM ai_usage_logs
        WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 1 DAY) AS ai_tokens`,
  );
  const r: Partial<Record<string, unknown>> = rows[0] ?? {};
  return {
    pilots: Number(r.pilots ?? 0),
    activePilots: Number(r.active_pilots ?? 0),
    publishedQuests: Number(r.published_quests ?? 0),
    draftQuests: Number(r.draft_quests ?? 0),
    aiCallsToday: Number(r.ai_calls ?? 0),
    aiTokensToday: Number(r.ai_tokens ?? 0),
  };
}
