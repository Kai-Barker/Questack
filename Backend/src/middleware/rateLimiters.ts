import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

// Counts are kept in memory, which is fine for a single server. Running
// several instances would need a shared store (e.g. Redis).

const MINUTE = 60 * 1000;

// Same JSON shape as every other error, so the frontend shows it the same way
function limited(message: string) {
  return { error: message };
}

// ipKeyGenerator groups IPv6 addresses by subnet, so one machine can't dodge
// the limit by cycling through its many IPv6 addresses
const clientIp = (req: Request) => ipKeyGenerator(req.ip ?? 'unknown');

const shared = { standardHeaders: 'draft-8' as const, legacyHeaders: false };

// Login: 10 failed tries per IP, and 5 per account, every 15 minutes.
// Successful logins don't count, so a pilot who gets in isn't penalised.
export const loginIpLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login-ip:${clientIp(req)}`,
  message: limited('Too many access attempts from this terminal. Wait 15 minutes, then try again.'),
});

export const loginAccountLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  // Per callsign/email, which stops guessing one account's code from many IPs
  keyGenerator: (req) => {
    const identifier: unknown = req.body?.identifier;
    return typeof identifier === 'string' && identifier.trim()
      ? `login-account:${identifier.trim().toLowerCase()}`
      : `login-account-ip:${clientIp(req)}`;
  },
  message: limited('Too many access attempts for this pilot. Wait 15 minutes, then try again.'),
});

export const registerLimiter = rateLimit({
  ...shared,
  windowMs: 60 * MINUTE,
  limit: 5,
  keyGenerator: (req) => `register:${clientIp(req)}`,
  message: limited('Too many enlistments from this terminal. Try again in an hour.'),
});

// Ship's AI: per signed-in pilot, to protect the Gemini quota
export const aiLimiter = rateLimit({
  ...shared,
  windowMs: 10 * MINUTE,
  limit: 40,
  keyGenerator: (req) => (req.user ? `ai-user:${req.user.userId}` : `ai-ip:${clientIp(req)}`),
  message: limited("The Ship's AI needs a moment to recharge, Pilot. Try again in a few minutes."),
});

// Health check: public, so capped per IP. A page load uses one or two; the
// systems toast adds one per manual re-check.
export const healthLimiter = rateLimit({
  ...shared,
  windowMs: MINUTE,
  limit: 30,
  keyGenerator: (req) => `health:${clientIp(req)}`,
  message: limited('Too many status checks from this terminal. Try again in a minute.'),
});
