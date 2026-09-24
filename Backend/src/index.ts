import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Only the Vite frontend may call this API from a browser
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Questack API running on http://localhost:${PORT}`);
});
