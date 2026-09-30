import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from '@google/genai';
import { pool } from './config/db.js';
import { aiLimiter } from './middleware/rateLimiters.js';
import { requireAuth } from './middleware/requireAuth.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { AiReplyError } from './services/ai/aiService.js';
import { COMMS_DOWN_MESSAGE } from './utils/commsMessages.js';
import { HttpError } from './utils/httpError.js';

const app = express();
// Don't advertise the server framework in response headers
app.disable('x-powered-by');
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Behind a proxy (the Vercel /api rewrite in production), trust it to report
// the real client IP, or every pilot would share one rate limit.
// TRUST_PROXY is the number of proxy hops, e.g. 1. Leave it unset locally.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}

// Only the Vite frontend may call this API from a browser
app.use(cors({ origin: CLIENT_URL }));
// Capped so a huge paste can't be sent to Gemini (pasted code is limited to 20k characters anyway)
app.use(express.json({ limit: '100kb' }));
// Reads the httpOnly session cookie (see src/config/auth.ts)
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  let database = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('Database health check failed:', err);
    database = 'unreachable';
  }

  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
// The Ship's AI is for signed-in pilots only, rate limited per pilot
app.use('/api/ai', requireAuth, aiLimiter, aiRoutes);

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

app.listen(PORT, () => {
  console.log(`Questack API running on http://localhost:${PORT}`);
});
