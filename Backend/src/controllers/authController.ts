import type { Request, Response } from 'express';
import { z } from 'zod';
import { clearSessionCookieOptions, SESSION_COOKIE, sessionCookieOptions } from '../config/auth.js';
import { authenticate, LOGIN_FAILED_MESSAGE, registerPilot, signSessionToken } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';

// The same rules are shown live on the Enlist screen; these are the ones that count.
const callsign = z
  .string()
  .trim()
  .min(3, 'Use at least 3 characters.')
  .max(20, 'Use 20 characters or fewer.')
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - and _ only.');

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
  password: z.string().min(1, 'Enter your access code.').max(200),
  remember: z.boolean().optional(),
});

// Validation errors come back as { error, fields: { fieldName: message } }
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fields[field] ??= issue.message;
  }
  throw new HttpError(400, 'Check the highlighted fields.', fields);
}

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

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions);
  res.status(204).end();
}

// requireAuth runs first, so req.user is always set here
export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
