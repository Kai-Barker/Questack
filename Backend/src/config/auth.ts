import type { CookieOptions } from 'express';
import type { SignOptions } from 'jsonwebtoken';

// Session settings. The JWT lives in an httpOnly cookie, so page scripts
// (and anything injected into the page) can never read it.

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'JWT_SECRET must be set in .env and be at least 32 characters. Generate one with: ' +
      `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
  );
}
export const JWT_SECRET = secret;

// How long a normal session's token lasts
export const SESSION_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '12h') as NonNullable<SignOptions['expiresIn']>;
// "Keep this terminal signed in"
export const REMEMBER_ME_DAYS = 30;

export const SESSION_COOKIE = 'questack_session';

const isProduction = process.env.NODE_ENV === 'production';

const baseCookie: CookieOptions = {
  httpOnly: true, // not readable from JavaScript
  secure: isProduction, // HTTPS only in production (local dev runs on http)
  sameSite: 'lax', // not sent on cross-site POSTs, which blocks CSRF
  path: '/',
};

export function sessionCookieOptions(remember: boolean): CookieOptions {
  // Without maxAge it's a session cookie: gone when the browser closes
  return remember ? { ...baseCookie, maxAge: REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000 } : baseCookie;
}

export const clearSessionCookieOptions: CookieOptions = baseCookie;
