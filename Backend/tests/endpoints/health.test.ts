import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';

// GET /api/health: public, used by the splash screen. The database result is
// cached for 5 seconds, so each test moves the clock past that window.
let clock = Date.parse('2026-10-08T10:00:00Z');

function nextWindow() {
  clock += 10_000;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(clock);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    nextWindow();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('reports degraded (503) when the database is unreachable', async () => {
    nextWindow();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(pool.query).mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'unreachable' });
  });

  it('reuses one database check for requests inside the cache window', async () => {
    nextWindow();
    await request(app).get('/api/health');
    await request(app).get('/api/health');

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('needs no session cookie', async () => {
    nextWindow();
    const res = await request(app).get('/api/health');
    expect(res.status).not.toBe(401);
  });
});
