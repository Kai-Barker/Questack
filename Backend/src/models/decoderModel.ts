import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db.js';

// Transmissions decoded on the standalone decoder. Only a hash of the code
// is stored, never the code itself.

// Records a passed comprehension check. Returns false if this pilot had
// already decoded the same code (it only counts once).
export async function recordDecode(userId: number, languageId: number, codeHash: string): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT IGNORE INTO transmission_decodes (user_id, language_id, code_hash) VALUES (?, ?, ?)',
    [userId, languageId, codeHash],
  );
  return result.affectedRows === 1;
}

export async function countDecodes(userId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM transmission_decodes WHERE user_id = ?',
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}
