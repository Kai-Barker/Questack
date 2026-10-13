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

export interface AdminUser {
  userId: number;
  callsign: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  level: number;
  totalXp: number;
  lastActive: string | null; // ISO date
  createdAt: string;
}

const ADMIN_USER_COLUMNS = 'user_id, username, email, role, is_active, level, total_xp, last_active, created_at';

function toAdminUser(r: RowDataPacket): AdminUser {
  return {
    userId: r.user_id,
    callsign: r.username,
    email: r.email,
    role: r.role,
    isActive: r.is_active === 1,
    level: r.level,
    totalXp: r.total_xp,
    lastActive: r.last_active ? new Date(r.last_active).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

// Newest first. Capped: the console is for a class-sized fleet, not paging.
export const USER_LIST_LIMIT = 500;

export async function listUsers(): Promise<AdminUser[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${ADMIN_USER_COLUMNS} FROM users ORDER BY created_at DESC, user_id DESC LIMIT ${USER_LIST_LIMIT}`,
  );
  return rows.map(toAdminUser);
}

export async function findAdminUser(userId: number): Promise<AdminUser | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT ${ADMIN_USER_COLUMNS} FROM users WHERE user_id = ? LIMIT 1`, [
    userId,
  ]);
  return rows[0] ? toAdminUser(rows[0]) : null;
}

// requireAuth re-reads is_active on every request, so a deactivated pilot is
// locked out on their very next one. Admin accounts are never changed here.
export async function setUserActive(userId: number, isActive: boolean): Promise<void> {
  await pool.execute("UPDATE users SET is_active = ? WHERE user_id = ? AND role = 'user'", [isActive, userId]);
}

export interface AiUsageRow {
  logId: number;
  callsign: string;
  feature: string;
  model: 'flash' | 'flash_lite';
  inputTokens: number;
  outputTokens: number;
  flagged: boolean;
  createdAt: string;
}

export const AI_USAGE_LIMIT = 50;

// The most recent Ship's AI calls. The log only holds counts and the feature
// used, never what the pilot or the AI wrote.
export async function recentAiUsage(): Promise<AiUsageRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT l.log_id, u.username, l.feature, l.model, l.input_tokens, l.output_tokens, l.flagged, l.created_at
     FROM ai_usage_logs l JOIN users u ON u.user_id = l.user_id
     ORDER BY l.created_at DESC, l.log_id DESC
     LIMIT ${AI_USAGE_LIMIT}`,
  );
  return rows.map((r) => ({
    logId: r.log_id,
    callsign: r.username,
    feature: r.feature,
    model: r.model,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    flagged: r.flagged === 1,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}
