import type { NextFunction, Request, Response } from 'express';
import { clearSessionCookieOptions, SESSION_COOKIE } from '../config/auth.js';
import { findById, toPublicUser } from '../models/userModel.js';
import { verifySessionToken } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';

const SIGN_IN_MESSAGE = 'Sign in to continue, Pilot.';

// Lets the request through only with a valid session cookie. The user is
// re-loaded each time, so a deactivated or deleted account is locked out at
// once instead of when its token expires.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const userId = typeof token === 'string' ? verifySessionToken(token) : null;
  const user = userId === null ? null : await findById(userId);

  if (!user || !user.isActive) {
    if (token) res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions);
    throw new HttpError(401, SIGN_IN_MESSAGE);
  }

  req.user = toPublicUser(user);
  next();
}
