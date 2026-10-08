import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from '@google/genai';
import { pool } from './config/db.js';
import { aiDailyLimiter, aiLimiter, appIpLimiter, healthLimiter } from './middleware/rateLimiters.js';
import { requireAuth } from './middleware/requireAuth.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import { AiReplyError } from './services/ai/aiService.js';
import { COMMS_DOWN_MESSAGE } from './utils/commsMessages.js';
import { HttpError } from './utils/httpError.js';

// The Express app, without a running server: index.ts starts it, and tests
// send requests to it directly (see tests/helpers/app.ts)
export const app = express();
// Don't advertise the server framework in response headers
app.disable('x-powered-by');
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Behind a proxy (the Vercel /api rewrite in production), trust it to report
// the real client IP, or every pilot would share one rate limit.
// TRUST_PROXY is the number of proxy hops, e.g. 1. Leave it unset locally.
// Only a hop count is accepted: "true" would trust an X-Forwarded-For header
// sent by anyone, letting a client pick its own IP and dodge every IP limit.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY must be the number of proxy hops in front of the API, e.g. 1.');
  }
  app.set('trust proxy', hops);
}

// The API only ever returns JSON: never let a browser sniff it as something
// else, frame it, or run anything from it
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  next();
});

// Only the Vite frontend may call this API from a browser
app.use(cors({ origin: CLIENT_URL }));
// Capped so a huge paste can't be sent to Gemini (pasted code is limited to 20k characters anyway)
app.use(express.json({ limit: '100kb' }));
// Reads the httpOnly session cookie (see src/config/auth.ts)
app.use(cookieParser());

// Database status for the health check. Public endpoints must never let
// traffic turn into database load, so:
// - the result is reused for DB_STATUS_TTL_MS, and simultaneous requests share
//   one in-flight check (at most one query every few seconds, however busy)
// - a hanging database counts as unreachable after DB_HEALTH_TIMEOUT_MS, so the
//   splash screen can tell it apart from the backend being down
// The route itself is also rate limited per IP (healthLimiter).
const DB_HEALTH_TIMEOUT_MS = 5000;
const DB_STATUS_TTL_MS = 5000;
type DbStatus = 'connected' | 'unreachable';
let cachedDbStatus: { status: DbStatus; checkedAt: number } | null = null;
let dbCheckInFlight: Promise<DbStatus> | null = null;

async function checkDatabase(): Promise<DbStatus> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Database check timed out')), DB_HEALTH_TIMEOUT_MS);
      }),
    ]);
    return 'connected';
  } catch (err) {
    console.error('Database health check failed:', err);
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

async function databaseStatus(): Promise<DbStatus> {
  if (cachedDbStatus && Date.now() - cachedDbStatus.checkedAt < DB_STATUS_TTL_MS) return cachedDbStatus.status;
  dbCheckInFlight ??= checkDatabase().then((status) => {
    cachedDbStatus = { status, checkedAt: Date.now() };
    dbCheckInFlight = null;
    return status;
  });
  return dbCheckInFlight;
}

app.get('/api/health', healthLimiter, async (_req, res) => {
  const database = await databaseStatus();
  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
// Signed-in endpoints: an IP limit first (before the session's database
// lookup), then the session, then each route's own per-pilot limit.
// The Ship's AI is rate limited per pilot (short burst and daily) to protect the Gemini quota.
app.use('/api/ai', appIpLimiter, requireAuth, aiLimiter, aiDailyLimiter, aiRoutes);
app.use('/api/profile', appIpLimiter, requireAuth, profileRoutes);
// Galaxy Map, Sector Map, quests and the nav summary (see progressRoutes for paths)
app.use('/api', progressRoutes);

// Unknown API routes get JSON, not Express's default HTML page
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Turns thrown errors into JSON replies. Express 5 forwards errors from async
// handlers here automatically. Request bodies are never logged: they can
// contain the pilot's pasted code.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
    return;
  }
  if (err instanceof ApiError) {
    console.error(`Gemini request failed (${err.status}): ${err.message}`);
    res.status(503).json({ error: COMMS_DOWN_MESSAGE });
    return;
  }
  if (err instanceof AiReplyError) {
    res.status(502).json({ error: err.message });
    return;
  }
  // Body parser errors (bad JSON, body too large) carry their own status
  const status = (err as { status?: number }).status;
  if (status === 400 || status === 413) {
    res.status(status).json({ error: status === 413 ? 'Request too large.' : 'Invalid JSON.' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong aboard the ship.' });
});

