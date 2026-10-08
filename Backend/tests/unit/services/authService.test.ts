import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import * as users from '../../../src/models/userModel.js';
import {
  authenticate,
  registerPilot,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../../../src/services/authService.js';
import { PASSWORD, PILOT } from '../../helpers/fixtures.js';

const SECRET = process.env.JWT_SECRET!;

describe('session tokens', () => {
  it('round-trips the pilot id', () => {
    expect(verifySessionToken(signSessionToken(7, false))).toBe(7);
  });

  it('signs with HS256 and puts nothing but the subject in the payload', () => {
    const token = signSessionToken(7, false);
    const decoded = jwt.decode(token, { complete: true })!;
    const payload = decoded.payload as jwt.JwtPayload;

    expect(decoded.header.alg).toBe('HS256');
    expect(payload.sub).toBe('7');
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  it('lasts JWT_EXPIRES_IN normally and 30 days with "remember me"', () => {
    const lifetime = (token: string) => {
      const { iat, exp } = jwt.decode(token) as jwt.JwtPayload;
      return exp! - iat!;
    };
    expect(lifetime(signSessionToken(7, false))).toBe(12 * 60 * 60);
    expect(lifetime(signSessionToken(7, true))).toBe(30 * 24 * 60 * 60);
  });

  it.each([
    ['expired', () => jwt.sign({}, SECRET, { subject: '7', expiresIn: -1 })],
    ['signed with another secret', () => jwt.sign({}, 'another-secret-another-secret-another', { subject: '7' })],
    ['unsigned (alg: none)', () => jwt.sign({}, '', { subject: '7', algorithm: 'none' })],
    ['signed with HS512', () => jwt.sign({}, SECRET, { subject: '7', algorithm: 'HS512' })],
    ['missing a subject', () => jwt.sign({}, SECRET)],
    ['for a non-numeric subject', () => jwt.sign({}, SECRET, { subject: 'admin' })],
    ['for pilot 0', () => jwt.sign({}, SECRET, { subject: '0' })],
    ['tampered with', () => `${signSessionToken(7, false).slice(0, -2)}xx`],
    ['not a token at all', () => 'hello'],
  ])('rejects a token that is %s', (_name, makeToken) => {
    expect(verifySessionToken(makeToken())).toBeNull();
  });
});

describe('authenticate', () => {
  it('returns the public user for the right password and records the visit', async () => {
    const user = await authenticate(PILOT.email, PASSWORD);

    expect(user).toEqual({ userId: PILOT.userId, username: PILOT.username, email: PILOT.email, role: 'user' });
    expect(users.touchLastActive).toHaveBeenCalledWith(PILOT.userId);
  });

  it('returns null for a wrong password', async () => {
    expect(await authenticate(PILOT.email, 'wrong-password1')).toBeNull();
    expect(users.touchLastActive).not.toHaveBeenCalled();
  });

  it('still runs bcrypt for an unknown pilot, so timing doesn’t reveal who exists', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');
    expect(await authenticate('nobody@example.com', PASSWORD)).toBeNull();

    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare.mock.calls[0]![1]).toMatch(/^\$2[aby]\$12\$/);
  });

  it('returns null for a deactivated pilot even with the right password', async () => {
    vi.mocked(users.findByLogin).mockResolvedValue({ ...PILOT, isActive: false });
    expect(await authenticate(PILOT.email, PASSWORD)).toBeNull();
  });
});

describe('verifyPassword', () => {
  it('is true only for the pilot’s current password', async () => {
    expect(await verifyPassword(PILOT.userId, PASSWORD)).toBe(true);
    expect(await verifyPassword(PILOT.userId, 'nope12345')).toBe(false);
  });

  it('is false for a missing or deactivated pilot', async () => {
    expect(await verifyPassword(999, PASSWORD)).toBe(false);
    vi.mocked(users.findById).mockResolvedValue({ ...PILOT, isActive: false });
    expect(await verifyPassword(PILOT.userId, PASSWORD)).toBe(false);
  });
});

describe('registerPilot', () => {
  it('rethrows database errors other than a duplicate', async () => {
    vi.mocked(users.createUser).mockRejectedValue(new Error('disk full'));
    await expect(registerPilot({ callsign: 'Nova', email: 'n@x.io', password: 'abcdefg1' })).rejects.toThrow('disk full');
  });
});
