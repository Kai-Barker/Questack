import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requireAuth } from '../../../src/middleware/requireAuth.js';
import { HttpError } from '../../../src/utils/httpError.js';
import { sessionCookie } from '../../helpers/auth.js';

// requireAuth on its own, with hand-made request and response objects

function call(cookieValue?: string) {
  const req = { cookies: cookieValue === undefined ? {} : { questack_session: cookieValue } } as unknown as Request;
  const res = { clearCookie: vi.fn() } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, run: () => requireAuth(req, res, next) };
}

const tokenOf = (cookie: string) => cookie.split('=')[1]!;

describe('requireAuth', () => {
  it('attaches the public pilot (never the password hash) and continues', async () => {
    const { req, next, run } = call(tokenOf(sessionCookie()));
    await run();

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ userId: 7, username: 'Vega-7', email: 'vega@example.com', role: 'user' });
    expect(req.user).not.toHaveProperty('passwordHash');
  });

  it('throws a 401 without a cookie, and leaves no cookie to clear', async () => {
    const { res, next, run } = call();

    await expect(run()).rejects.toEqual(new HttpError(401, 'Sign in to continue, Pilot.'));
    expect(next).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('clears a bad cookie', async () => {
    const { res, run } = call('garbage');

    await expect(run()).rejects.toBeInstanceOf(HttpError);
    expect(res.clearCookie).toHaveBeenCalledWith('questack_session', expect.objectContaining({ httpOnly: true }));
  });
});
