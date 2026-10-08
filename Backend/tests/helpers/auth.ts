import jwt from 'jsonwebtoken';
import { SESSION_COOKIE } from '../../src/config/auth.js';
import { signSessionToken } from '../../src/services/authService.js';
import { PILOT } from './fixtures.js';

// Session cookies for requests, signed the same way the real login does

export function sessionCookie(userId = PILOT.userId, remember = false): string {
  return `${SESSION_COOKIE}=${signSessionToken(userId, remember)}`;
}

export function expiredCookie(userId = PILOT.userId): string {
  const token = jwt.sign({}, process.env.JWT_SECRET!, { algorithm: 'HS256', subject: String(userId), expiresIn: -10 });
  return `${SESSION_COOKIE}=${token}`;
}

export function wrongSecretCookie(userId = PILOT.userId): string {
  const token = jwt.sign({}, 'a-completely-different-secret-of-enough-length!', { algorithm: 'HS256', subject: String(userId) });
  return `${SESSION_COOKIE}=${token}`;
}

// An unsigned token claiming to be the pilot: the classic "alg: none" forgery
export function unsignedCookie(userId = PILOT.userId): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${SESSION_COOKIE}=${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: String(userId) })}.`;
}
