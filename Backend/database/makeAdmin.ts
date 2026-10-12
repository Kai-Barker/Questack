// Gives an existing pilot admin rights (or takes them away).
// Run with:  npm run db:make-admin -- <callsign or email>
//      or:   npm run db:make-admin -- <callsign or email> --revoke
//
// Enlist the account in the app first, then promote it here. Roles are
// re-read on every request, so the change applies straight away.
import 'dotenv/config';
import mysql, { type ResultSetHeader } from 'mysql2/promise';
import { dbConnectionOptions } from '../src/config/db.js';

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const identifier = args.find((arg) => !arg.startsWith('--'));

if (!identifier) {
  console.error('Usage: npm run db:make-admin -- <callsign or email> [--revoke]');
  process.exit(1);
}

const role = revoke ? 'user' : 'admin';
const connection = await mysql.createConnection(dbConnectionOptions);

try {
  const [result] = await connection.execute<ResultSetHeader>(
    'UPDATE users SET role = ? WHERE username = ? OR email = ?',
    [role, identifier, identifier.toLowerCase()],
  );
  if (result.affectedRows === 0) {
    console.error(`No pilot found with callsign or email "${identifier}".`);
    process.exitCode = 1;
  } else {
    console.log(`${identifier} is now ${revoke ? 'a regular pilot' : 'an admin'}.`);
  }
} finally {
  await connection.end();
}
