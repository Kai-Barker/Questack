import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type * as Limiters from '../../../src/middleware/rateLimiters.js';

// The real rate limiters (tests/setup/mocks.ts swaps them for pass-throughs
// everywhere else). Each is mounted on a tiny app. Every limiter keeps its
// own count in memory, so each test uses its own pilot or login name.

const limiters = await vi.importActual<typeof Limiters>('../../../src/middleware/rateLimiters.js');

// A tiny app: an optional signed-in pilot, then the limiter, then a reply
// with the given status (so "failed" logins can be simulated)
function appWith(limiter: RequestHandler, status = 200) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const pilot = req.header('x-test-pilot');
    if (pilot) req.user = { userId: Number(pilot), username: 'p', email: 'p@x.io', role: 'user' };
    next();
  });
  app.post('/', limiter, (_req, res) => {
    res.status(status).json({ ok: status < 400 });
  });
  return app;
}

async function hit(app: express.Express, times: number, pilot?: number, body: object = {}) {
  let last: request.Response | undefined;
  for (let i = 0; i < times; i++) {
    const req = request(app).post('/').send(body);
    last = await (pilot ? req.set('x-test-pilot', String(pilot)) : req);
  }
  return last!;
}

describe.each([
  ['registerLimiter', 'registerLimiter', 5, 'Too many enlistments from this terminal. Try again in an hour.'],
  ['healthLimiter', 'healthLimiter', 30, 'Too many status checks from this terminal. Try again in a minute.'],
] as const)('%s (per IP)', (_name, key, limit, message) => {
  it(`allows ${limit} requests, then answers 429 with its message`, async () => {
    const app = appWith(limiters[key]);

    expect((await hit(app, limit)).status).toBe(200);
    const blocked = await hit(app, 1);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: message });
    expect(blocked.headers.ratelimit).toBeDefined();
  });
});

describe('loginIpLimiter', () => {
  it('counts only failed logins: 10 per IP', async () => {
    const ok = appWith(limiters.loginIpLimiter, 200);
    expect((await hit(ok, 12)).status).toBe(200); // successes never count

    const failing = appWith(limiters.loginIpLimiter, 401);
    expect((await hit(failing, 10)).status).toBe(401);
    expect((await hit(failing, 1)).status).toBe(429);
  });
});

describe('loginAccountLimiter', () => {
  it('locks one login name after 5 failures, whatever its case or spacing', async () => {
    const app = appWith(limiters.loginAccountLimiter, 401);
    await hit(app, 3, undefined, { identifier: 'Target' });
    await hit(app, 2, undefined, { identifier: '  TARGET ' });

    const blocked = await hit(app, 1, undefined, { identifier: 'target' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('Too many access attempts for this pilot. Wait 15 minutes, then try again.');
  });

  it('doesn’t let one account’s failures block another', async () => {
    const app = appWith(limiters.loginAccountLimiter, 401);
    await hit(app, 6, undefined, { identifier: 'victim-a' });

    expect((await hit(app, 1, undefined, { identifier: 'victim-b' })).status).toBe(401);
  });
});

describe.each([
  ['aiLimiter', 'aiLimiter', 40],
  ['aiDailyLimiter', 'aiDailyLimiter', 150],
  ['pilotReadLimiter', 'pilotReadLimiter', 120],
  ['progressWriteLimiter', 'progressWriteLimiter', 30],
  ['questCompleteLimiter', 'questCompleteLimiter', 20],
  ['profileUpdateLimiter', 'profileUpdateLimiter', 20],
  ['callsignLimiter', 'callsignLimiter', 5],
] as const)('%s (per pilot)', (_name, key, limit) => {
  it(`allows ${limit} requests per pilot, and each pilot has their own count`, async () => {
    const app = appWith(limiters[key]);

    expect((await hit(app, limit, 101)).status).toBe(200);
    expect((await hit(app, 1, 101)).status).toBe(429);
    expect((await hit(app, 1, 202)).status).toBe(200);
  });
});

describe('appIpLimiter', () => {
  it('allows 300 requests a minute per IP before the session lookup', async () => {
    const app = appWith(limiters.appIpLimiter);

    expect((await hit(app, 300)).status).toBe(200);
    expect((await hit(app, 1)).status).toBe(429);
  });
});
