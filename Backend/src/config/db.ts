import fs from 'node:fs';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

// Aiven's URI ends with ?ssl-mode=REQUIRED, which mysql2 doesn't understand.
// SSL is configured below instead, so strip it from the URI.
const uri = new URL(databaseUrl);
uri.searchParams.delete('ssl-mode');

// Aiven's CA certificate lets us verify we're really talking to our database.
// Prefer the DB_CA_CERT env var if set, otherwise read certs/ca.pem.
// The path is relative to this file, so it works from both src/ and dist/.
function loadCaCert(): string {
  if (process.env.DB_CA_CERT) {
    return process.env.DB_CA_CERT;
  }
  return fs.readFileSync(new URL('../../certs/ca.pem', import.meta.url), 'utf8');
}

// Shared by the app's pool and the database scripts (e.g. database/runSchema.ts)
export const dbConnectionOptions = {
  uri: uri.toString(),
  ssl: { ca: loadCaCert() },
};

export const pool = mysql.createPool({
  ...dbConnectionOptions,
  waitForConnections: true,
  connectionLimit: 5,
  // Cap requests waiting for a connection, so a slow or unreachable database
  // makes extra requests fail fast instead of piling up in memory
  queueLimit: 50,
});
