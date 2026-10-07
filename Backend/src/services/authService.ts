import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, REMEMBER_ME_DAYS, SESSION_EXPIRES_IN } from '../config/auth.js';
import {
  createUser,
  findById,
  findByLogin,
  toPublicUser,
  touchLastActive,
  usernameOrEmailTaken,
  type PublicUser,
} from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';

// Cost 12 takes roughly a quarter of a second per hash: slow enough to make
// guessing stolen hashes impractical, quick enough for a login
const BCRYPT_COST = 12;

// Compared against when no account matches, so a wrong callsign takes as long
// as a wrong password and response times don't reveal which accounts exist
const DUMMY_HASH = bcrypt.hashSync('questack-timing-guard', BCRYPT_COST);

const DUPLICATE_MESSAGE = 'That callsign or email is already enlisted.';
export const LOGIN_FAILED_MESSAGE = 'Pilot ID or access code is incorrect.';

export async function registerPilot(input: { callsign: string; email: string; password: string }): Promise<PublicUser> {
  // One generic message for either clash, so enlisting can't be used to check
  // whether someone's email has an account
  if (await usernameOrEmailTaken(input.callsign, input.email)) throw new HttpError(409, DUPLICATE_MESSAGE);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    const userId = await createUser({ username: input.callsign, email: input.email, passwordHash });
    return { userId, username: input.callsign, email: input.email, role: 'user' };
  } catch (err) {
    // Two sign-ups for the same callsign at once: the unique key catches the second
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new HttpError(409, DUPLICATE_MESSAGE);
    throw err;
  }
}

// Returns the user, or null for any failure (unknown pilot, wrong code, deactivated)
export async function authenticate(identifier: string, password: string): Promise<PublicUser | null> {
  const user = await findByLogin(identifier);
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches || !user.isActive) return null;

  await touchLastActive(user.userId);
  return toPublicUser(user);
}

// Re-checks a signed-in pilot's access code before a sensitive change
export async function verifyPassword(userId: number, password: string): Promise<boolean> {
  const user = await findById(userId);
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return Boolean(user && user.isActive && matches);
}

export function signSessionToken(userId: number, remember: boolean): string {
  return jwt.sign({}, JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(userId),
    expiresIn: remember ? `${REMEMBER_ME_DAYS}d` : SESSION_EXPIRES_IN,
  });
}

// The user id from a valid token, or null if it's missing, forged or expired
export function verifySessionToken(token: string): number | null {
  try {
    // Only HS256 is accepted, so a token can't pick a weaker algorithm (or "none")
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const userId = typeof payload === 'object' ? Number(payload.sub) : NaN;
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
