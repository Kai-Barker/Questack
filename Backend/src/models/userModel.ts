import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';

// Every query here is parameterised (the `?` placeholders), so user input is
// always sent as data and can't change the SQL.

export type UserRole = 'user' | 'admin';

interface UserRow extends RowDataPacket {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
}

// What the rest of the app (and the browser) may see about a user.
// Never includes the password hash.
export interface PublicUser {
  userId: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface UserWithHash extends PublicUser {
  passwordHash: string;
  isActive: boolean;
}

const USER_COLUMNS = 'user_id, username, email, password_hash, role, is_active';

function toUser(row: UserRow): UserWithHash {
  return {
    userId: row.user_id,
    username: row.username,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
  };
}

export function toPublicUser({ userId, username, email, role }: PublicUser): PublicUser {
  return { userId, username, email, role };
}

// Login accepts either the callsign or the email. The table's collation makes
// the username match case-insensitive; emails are stored lowercase.
export async function findByLogin(identifier: string): Promise<UserWithHash | null> {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ? OR username = ? LIMIT 1`,
    [identifier.toLowerCase(), identifier],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findById(userId: number): Promise<UserWithHash | null> {
  const [rows] = await pool.execute<UserRow[]>(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = ? LIMIT 1`, [userId]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function usernameOrEmailTaken(username: string, email: string): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email],
  );
  return rows.length > 0;
}

export async function createUser(user: { username: string; email: string; passwordHash: string }): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO users (username, email, password_hash, last_active) VALUES (?, ?, ?, NOW())',
    [user.username, user.email, user.passwordHash],
  );
  return result.insertId;
}

export async function touchLastActive(userId: number): Promise<void> {
  await pool.execute('UPDATE users SET last_active = NOW() WHERE user_id = ?', [userId]);
}
