// Creates every table in database/schema/schema.sql.
// Run with: npm run db:schema
// Only works on an empty database — it fails rather than overwrite existing tables.
import 'dotenv/config';
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { dbConnectionOptions } from '../src/config/db.js';

const schema = fs.readFileSync(new URL('./schema/schema.sql', import.meta.url), 'utf8');

// multipleStatements lets the whole file run in one go. It's only enabled
// here, never on the app's pool, because it makes SQL injection more dangerous.
const connection = await mysql.createConnection({ ...dbConnectionOptions, multipleStatements: true });

try {
  await connection.query(schema);
  const [tables] = await connection.query('SHOW TABLES');
  console.log(`Schema created. ${(tables as unknown[]).length} tables in the database.`);
} catch (err) {
  console.error('Schema failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await connection.end();
}
