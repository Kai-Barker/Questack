import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import * as users from '../../src/models/userModel.js';
import { expiredCookie, sessionCookie, unsignedCookie, wrongSecretCookie } from '../helpers/auth.js';
import { PASSWORD, PILOT } from '../helpers/fixtures.js';

// /api/auth: enlist, sign in, sign out, and "who am I"

const LOGIN_FAILED = 'Pilot ID or password is incorrect.';

function cookieHeader(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith('questack_session=')) ?? '';
}

describe('POST /api/auth/register', () => {
  const valid = { callsign: 'Nova_9', email: 'Nova@Example.com', password: 'launch2026', acceptTerms: true };

  it('creates the pilot, starts a session and returns them (201)', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ userId: 42, username: 'Nova_9', email: 'nova@example.com', role: 'user' });
    // The email is stored lowercase and the password only as a bcrypt hash
    const saved = vi.mocked(users.createUser).mock.calls[0]![0];
    expect(saved.email).toBe('nova@example.com');
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(saved.passwordHash).not.toContain(valid.password);
  });

  it('sets an httpOnly, SameSite=Lax session cookie that ends with the browser', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    const cookie = cookieHeader(res);

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Max-Age/i);
  });

  it('never returns a password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(JSON.stringify(res.body)).not.toMatch(/hash|\$2b\$/i);
  });

  it.each([
    ['callsign too short', { callsign: 'ab' }, 'callsign', 'Use at least 3 characters.'],
    ['callsign with spaces', { callsign: 'bad name' }, 'callsign', 'Use letters, numbers, - and _ only.'],
    ['callsign too long', { callsign: 'x'.repeat(21) }, 'callsign', 'Use 20 characters or fewer.'],
    ['invalid email', { email: 'not-an-email' }, 'email', 'Enter a valid email address.'],
    ['short password', { password: 'abc1' }, 'password', 'Use at least 8 characters.'],
    ['password without a number', { password: 'abcdefgh' }, 'password', 'Include at least one number.'],
    ['password over 72 bytes', { password: `1${'é'.repeat(40)}` }, 'password', 'Use 72 characters or fewer.'],
    ['terms not accepted', { acceptTerms: false }, 'acceptTerms', 'Accept the terms to enlist.'],
  ])('rejects %s (400) with a field message', async (_name, change, field, message) => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, ...change });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Check the highlighted fields.');
    expect(res.body.fields[field]).toBe(message);
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('rejects a callsign or email already enlisted (409), with one message for either', async () => {
    vi.mocked(users.usernameOrEmailTaken).mockResolvedValue(true);
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('That callsign or email is already enlisted.');
    expect(cookieHeader(res)).toBe('');
  });

  it('turns a duplicate-key race at insert time into the same 409', async () => {
    vi.mocked(users.createUser).mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it.each([
    ['callsign', PILOT.username],
    ['callsign in another case', PILOT.username.toUpperCase()],
    ['email', PILOT.email],
  ])('signs in with the %s', async (_name, identifier) => {
    const res = await request(app).post('/api/auth/login').send({ identifier, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ userId: PILOT.userId, username: PILOT.username, email: PILOT.email, role: 'user' });
    expect(cookieHeader(res)).toMatch(/HttpOnly/i);
    expect(users.touchLastActive).toHaveBeenCalledWith(PILOT.userId);
  });

  it('"keep me signed in" sets a 30-day cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: PILOT.email, password: PASSWORD, remember: true });

    expect(cookieHeader(res)).toMatch(/Max-Age=2592000/);
  });

  it.each([
    ['a wrong password', () => ({ identifier: PILOT.email, password: 'wrongpass1' })],
    ['an unknown pilot', () => ({ identifier: 'ghost@example.com', password: PASSWORD })],
  ])('gives one generic 401 for %s', async (_name, body) => {
    const res = await request(app).post('/api/auth/login').send(body());

    expect(res.status).toBe(401);
    expect(res.body.error).toBe(LOGIN_FAILED);
    expect(cookieHeader(res)).toBe('');
  });

  it('turns away a deactivated pilot with the same generic 401', async () => {
    vi.mocked(users.findByLogin).mockResolvedValue({ ...PILOT, isActive: false });
    const res = await request(app).post('/api/auth/login').send({ identifier: PILOT.email, password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe(LOGIN_FAILED);
  });

  it('rejects an empty form (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: '', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ identifier: 'Enter your callsign or email.', password: 'Enter your password.' });
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie (204)', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', sessionCookie());

    expect(res.status).toBe(204);
    expect(cookieHeader(res)).toMatch(/questack_session=;/);
    expect(cookieHeader(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('works without a session too', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in pilot', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', sessionCookie());

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ userId: PILOT.userId, username: PILOT.username, email: PILOT.email, role: 'user' });
  });

  it('is 401 without a cookie, and never looks anyone up', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Sign in to continue, Pilot.');
    expect(users.findById).not.toHaveBeenCalled();
  });

  it.each([
    ['expired', expiredCookie],
    ['signed with the wrong secret', wrongSecretCookie],
    ['unsigned ("alg: none")', unsignedCookie],
  ])('rejects an %s token and clears the cookie', async (_name, makeCookie) => {
    const res = await request(app).get('/api/auth/me').set('Cookie', makeCookie());

    expect(res.status).toBe(401);
    expect(cookieHeader(res)).toMatch(/questack_session=;/);
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('locks out a pilot deleted since the token was issued', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(999));
    expect(res.status).toBe(401);
  });

  it('locks out a pilot deactivated since the token was issued', async () => {
    vi.mocked(users.findById).mockResolvedValue({ ...PILOT, isActive: false });
    const res = await request(app).get('/api/auth/me').set('Cookie', sessionCookie());
    expect(res.status).toBe(401);
  });
});
