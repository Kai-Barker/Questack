// Applies database changes made after the base schema (database/schema/schema.sql).
// Run with: npm run db:migrate
//
// Each file in database/migrations runs once, in name order (001_, 002_, ...).
// Applied files are recorded in the schema_migrations table, so running this
// again only applies new ones. Never edit a migration that has already run:
// add a new numbered file instead.
//
// MySQL commits table changes (ALTER/CREATE) immediately, so a migration that
// fails halfway can't be rolled back automatically. The error says which file
// failed; fix the database by hand, then re-run.
import 'dotenv/config';
import fs from 'node:fs';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { dbConnectionOptions } from '../src/config/db.js';

const migrationsDir = new URL('./migrations/', import.meta.url);
const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d{3}_[\w-]+\.sql$/.test(file))
  .sort();

// multipleStatements lets a whole file run in one go. It's only enabled in
// these scripts, never on the app's pool, because it makes SQL injection more dangerous.
const connection = await mysql.createConnection({ ...dbConnectionOptions, multipleStatements: true });

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) NOT NULL,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [rows] = await connection.query<RowDataPacket[]>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name as string));
  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log('Database is up to date. No migrations to run.');
  }

  for (const file of pending) {
    const sql = fs.readFileSync(new URL(file, migrationsDir), 'utf8');
    try {
      await connection.query(sql);
    } catch (err) {
      throw new Error(`${file} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    console.log(`Applied ${file}`);
  }
} catch (err) {
  console.error('Migration stopped.', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await connection.end();
}
