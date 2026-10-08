import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { sessionCookie } from '../helpers/auth.js';

// Behaviour shared by every route: unknown paths, bad bodies, headers, proxy setup

afterEach(() => {
  delete process.env.TRUST_PROXY;
});

describe('unknown routes', () => {
  it.each(['/api/nope', '/api/auth/unknown', '/api/quests'])('%s is a JSON 404, not an HTML page', async (path) => {
    const res = await request(app).get(path).set('Cookie', sessionCookie());

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'Not found.' });
  });
});

describe('request bodies', () => {
  it('rejects malformed JSON (400)', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"identifier": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON.' });
  });

  it('rejects a body over 100kb (413)', async () => {
    const res = await request(app)
      .post('/api/ai/decode')
      .set('Cookie', sessionCookie())
      .send({ challengeId: 101, proficiency: 'cadet', code: 'x'.repeat(110_000) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Request too large.' });
  });

  it('never leaks an unexpected error’s details (500)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { findByLogin } = await import('../../src/models/userModel.js');
    vi.mocked(findByLogin).mockRejectedValue(new Error('SELECT * FROM users failed: secret detail'));
    const res = await request(app).post('/api/auth/login').send({ identifier: 'vega', password: 'x' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong aboard the ship.' });
  });
});

describe('response headers', () => {
  it('sends the security headers on every response', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
  });

  it('doesn’t advertise Express', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('only allows the frontend’s origin in CORS', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('TRUST_PROXY', () => {
  async function freshApp() {
    vi.resetModules();
    return (await import('../../src/app.js')).app;
  }

  it('is off by default', async () => {
    expect((await freshApp()).get('trust proxy')).toBe(false);
  });

  it('accepts a number of proxy hops', async () => {
    process.env.TRUST_PROXY = '1';
    expect((await freshApp()).get('trust proxy')).toBe(1);
  });

  it.each(['true', 'loopback', '-1', '1.5'])('refuses "%s" at startup', async (value) => {
    process.env.TRUST_PROXY = value;
    await expect(freshApp()).rejects.toThrow('TRUST_PROXY must be the number of proxy hops');
  });
});
