import type { Request, Response } from 'express';
import { z } from 'zod';
import { clearSessionCookieOptions, SESSION_COOKIE, sessionCookieOptions } from '../config/auth.js';
import { authenticate, LOGIN_FAILED_MESSAGE, registerPilot, signSessionToken } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';
import { callsign, parse } from '../utils/validation.js';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, 'That email is too long.')
  .pipe(z.email('Enter a valid email address.'));

const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .refine((p) => /\d/.test(p), 'Include at least one number.')
  // bcrypt only reads the first 72 bytes; anything longer would be silently ignored
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Use 72 characters or fewer.');

const registerBody = z.object({
  callsign,
  email,
  password: newPassword,
  acceptTerms: z.literal(true, 'Accept the terms to enlist.'),
});

const loginBody = z.object({
  identifier: z.string().trim().min(1, 'Enter your callsign or email.').max(255),
  password: z.string().min(1, 'Enter your password.').max(200),
  remember: z.boolean().optional(),
});

function startSession(res: Response, userId: number, remember: boolean) {
  res.cookie(SESSION_COOKIE, signSessionToken(userId, remember), sessionCookieOptions(remember));
}

export async function register(req: Request, res: Response) {
  const body = parse(registerBody, req.body);
  const user = await registerPilot({ callsign: body.callsign, email: body.email, password: body.password });
  startSession(res, user.userId, false);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const body = parse(loginBody, req.body);
  const user = await authenticate(body.identifier, body.password);
  if (!user) throw new HttpError(401, LOGIN_FAILED_MESSAGE);
  startSession(res, user.userId, body.remember ?? false);
  res.json({ user });
}

// Only clears this browser's cookie. The token itself stays valid until it
// expires (up to REMEMBER_ME_DAYS), so a copy of it would still work.
// The cookie is httpOnly, and deactivating the account (is_active) locks the
// pilot out at once. To revoke sessions properly, add a session_version
// column, put it in the token, and compare it in requireAuth (which already
// loads the user row, so it costs nothing extra).
export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions);
  res.status(204).end();
}

// requireAuth runs first, so req.user is always set here
export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
