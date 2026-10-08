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

// Ship's AI daily budget per pilot. One request can take several Gemini calls
// (retries and the Flash-Lite fallback), and the free tier's daily quota is
// shared by every pilot, so one pilot must not be able to use it all.
// Like every limiter here it's in memory, so a restart resets it.
export const aiDailyLimiter = rateLimit({
  ...shared,
  windowMs: 24 * 60 * MINUTE,
  limit: 150,
  keyGenerator: (req) => (req.user ? `ai-daily:${req.user.userId}` : `ai-daily-ip:${clientIp(req)}`),
  message: limited("The Ship's AI has done all it can for today, Pilot. Comms reopen tomorrow."),
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

// Runs before requireAuth on every signed-in endpoint (/api/pilot,
// /dashboard, /sectors, /quests, /profile, /ai, /auth/me), so a flood of requests is
// turned away by IP before each one costs a database lookup to check the
// session. Generous, because a classroom of pilots can share one IP.
export const appIpLimiter = rateLimit({
  ...shared,
  windowMs: MINUTE,
  limit: 300,
  keyGenerator: (req) => `app-ip:${clientIp(req)}`,
  message: limited('Too many requests from this terminal. Try again in a minute.'),
});

// The rest run behind requireAuth, so they count per signed-in pilot
const perPilot = (prefix: string) => (req: Request) =>
  req.user ? `${prefix}:${req.user.userId}` : `${prefix}-ip:${clientIp(req)}`;

// Every GET a pilot makes (map, sectors, quests, profile) shares this budget.
// Normal use is a few requests per screen.
export const pilotReadLimiter = rateLimit({
  ...shared,
  windowMs: MINUTE,
  limit: 120,
  keyGenerator: perPilot('pilot-read'),
  message: limited('Too many requests, Pilot. Try again in a minute.'),
});

// Small progress changes: sector rank, activating a booster
export const progressWriteLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: 30,
  keyGenerator: perPilot('progress-write'),
  message: limited('Too many changes. Wait 15 minutes, then try again.'),
});

// Clearing a quest takes several AI-marked answers first, so 20 in 15
// minutes is far more than anyone can legitimately reach
export const questCompleteLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: perPilot('quest-complete'),
  message: limited('Too many quest completions. Wait a few minutes, then try again.'),
});

export const profileUpdateLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: perPilot('profile-update'),
  message: limited('Too many profile changes. Wait 15 minutes, then try again.'),
});

// Callsign changes are rare and a callsign is also a login name, so this is
// tight. Every attempt counts (including taken callsigns), which also stops
// the form being used to check which callsigns exist.
export const callsignLimiter = rateLimit({
  ...shared,
  windowMs: 24 * 60 * MINUTE,
  limit: 5,
  keyGenerator: perPilot('callsign'),
  message: limited('Callsign changes are limited to 5 attempts a day. Try again tomorrow.'),
});
