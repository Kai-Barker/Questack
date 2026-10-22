import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';

// Profile queries. Every one is parameterised and scoped to a single user_id
// that the caller takes from the session, never from the request.

interface ProfileRow extends RowDataPacket {
  user_id: number;
  username: string;
  created_at: Date;
  bio: string | null;
  title_reward_id: number | null;
  goal_language_id: number | null;
  frame_reward_id: number | null;
  visor_reward_id: number | null;
}

interface RewardRow extends RowDataPacket {
  reward_id: number;
  code: string;
  name: string;
  description: string | null;
  unlock_condition: string;
}

export interface ProfileRecord {
  userId: number;
  username: string;
  enlistedAt: Date;
  bio: string | null;
  titleRewardId: number | null;
  goalLanguageId: number | null;
  frameRewardId: number | null;
  visorRewardId: number | null;
}

export interface InsigniaRecord {
  rewardId: number;
  code: string;
  name: string;
  description: string;
  unlockCondition: string;
}

export type GearSlot = 'frame' | 'visor';
export type GearPerk = 'streak_shield' | 'xp_bonus';

// Shown in a slot when the pilot hasn't equipped anything there
export const STANDARD_GEAR: Record<GearSlot, string> = { frame: 'frame-standard', visor: 'visor-standard' };

export interface GearRecord extends InsigniaRecord {
  slot: GearSlot;
  perk: GearPerk | null;
  xpMultiplier: number | null; // the xp_bonus perk's multiplier
}

export async function findProfile(userId: number): Promise<ProfileRecord | null> {
  const [rows] = await pool.execute<ProfileRow[]>(
    `SELECT user_id, username, created_at, bio, title_reward_id, goal_language_id, frame_reward_id, visor_reward_id
     FROM users WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    username: row.username,
    enlistedAt: row.created_at,
    bio: row.bio,
    titleRewardId: row.title_reward_id,
    goalLanguageId: row.goal_language_id,
    frameRewardId: row.frame_reward_id,
    visorRewardId: row.visor_reward_id,
  };
}

export async function listInsignia(): Promise<InsigniaRecord[]> {
  const [rows] = await pool.execute<RewardRow[]>(
    "SELECT reward_id, code, name, description, unlock_condition FROM rewards WHERE reward_type = 'insignia' ORDER BY reward_id",
  );
  return rows.map((row) => ({
    rewardId: row.reward_id,
    code: row.code,
    name: row.name,
    description: row.description ?? '',
    unlockCondition: row.unlock_condition,
  }));
}

export async function listGear(): Promise<GearRecord[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT reward_id, code, name, description, unlock_condition, gear_slot, perk, xp_multiplier
     FROM rewards WHERE reward_type = 'gear' AND gear_slot IS NOT NULL ORDER BY reward_id`,
  );
  return rows.map((row) => ({
    rewardId: row.reward_id as number,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? '',
    unlockCondition: row.unlock_condition as string,
    slot: row.gear_slot as GearSlot,
    perk: row.perk as GearPerk | null,
    xpMultiplier: row.xp_multiplier === null ? null : Number(row.xp_multiplier),
  }));
}

// The pilot's featured insignia ids, in slot order
export async function listFeaturedIds(userId: number): Promise<number[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT reward_id FROM user_featured_rewards WHERE user_id = ? ORDER BY slot',
    [userId],
  );
  return rows.map((row) => row.reward_id as number);
}

export interface ProfileChanges {
  bio?: string | null;
  titleRewardId?: number | null;
  goalLanguageId?: number | null;
  frameRewardId?: number | null;
  visorRewardId?: number | null;
  featuredIds?: number[];
}

// Only these columns can ever be written from a profile edit
const EDITABLE_COLUMNS = {
  bio: 'bio',
  titleRewardId: 'title_reward_id',
  goalLanguageId: 'goal_language_id',
  frameRewardId: 'frame_reward_id',
  visorRewardId: 'visor_reward_id',
} as const;

// Saves every change together, or none of them
export async function saveProfile(userId: number, changes: ProfileChanges): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, column] of Object.entries(EDITABLE_COLUMNS) as [keyof typeof EDITABLE_COLUMNS, string][]) {
      if (changes[key] !== undefined) {
        sets.push(`${column} = ?`);
        values.push(changes[key]);
      }
    }
    if (sets.length > 0) {
      await connection.execute(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, [...values, userId]);
    }

    if (changes.featuredIds) {
      await connection.execute('DELETE FROM user_featured_rewards WHERE user_id = ?', [userId]);
      if (changes.featuredIds.length > 0) {
        // One row per slot, all in a single insert (only ? placeholders are added)
        const rows = changes.featuredIds.map(() => '(?, ?, ?)').join(', ');
        const values = changes.featuredIds.flatMap((rewardId, i) => [userId, i + 1, rewardId]);
        await connection.execute(`INSERT INTO user_featured_rewards (user_id, slot, reward_id) VALUES ${rows}`, values);
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function usernameTakenByOther(username: string, userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM users WHERE username = ? AND user_id <> ? LIMIT 1',
    [username, userId],
  );
  return rows.length > 0;
}

export async function updateUsername(userId: number, username: string): Promise<void> {
  await pool.execute<ResultSetHeader>('UPDATE users SET username = ? WHERE user_id = ?', [username, userId]);
}
