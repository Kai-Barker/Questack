import { createHash, createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth.js';
import { recordDecode } from '../models/decoderModel.js';
import { HttpError } from '../utils/httpError.js';
import { getCatalog } from './questCatalog.js';

// The standalone decoder (/decoder). It isn't a quest: no attempts, answers
// or XP. It's stateless, and the pilot's code is never stored, so the
// comprehension question travels with the pilot in a signed check token:
// the server can then trust the question it marks against, and only count a
// decode for the code that was actually decoded.

const CHECK_TOKEN_TTL = '30m';
const CHECK_AUDIENCE = 'questack-decoder-check';
export const CHECK_EXPIRED_MESSAGE = 'This transmission has gone cold. Decode it again to get a fresh question.';
export const CODE_CHANGED_MESSAGE = 'The code has changed since it was decoded. Decode it again to get a fresh question.';

// Check tokens are signed with their own key (derived from JWT_SECRET), so one
// can never be passed off as a session token, or the other way round
const CHECK_SECRET = createHmac('sha256', JWT_SECRET).update('decoder-check-token').digest();

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// The sector's display name (e.g. 'C#'), or a 400 for a sector that doesn't exist
export async function decoderLanguage(languageId: number): Promise<string> {
  const sector = (await getCatalog()).sectorById.get(languageId);
  if (!sector) throw new HttpError(400, 'Check the highlighted fields.', { languageId: 'Choose a sector.' });
  return sector.displayName;
}

interface CheckClaims {
  lang: number; // the sector the code was decoded in
  q: string; // the comprehension question
  h: string; // SHA-256 of the decoded code
}

export function signCheckToken(userId: number, languageId: number, question: string, code: string): string {
  const claims: CheckClaims = { lang: languageId, q: question, h: hashCode(code) };
  return jwt.sign(claims, CHECK_SECRET, {
    algorithm: 'HS256',
    subject: String(userId),
    audience: CHECK_AUDIENCE,
    expiresIn: CHECK_TOKEN_TTL,
  });
}

// The question and sector from a check token, after making sure it was issued
// to this pilot, for exactly this code, and hasn't expired
export function verifyCheckToken(token: string, userId: number, code: string): { languageId: number; question: string } {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, CHECK_SECRET, { algorithms: ['HS256'], audience: CHECK_AUDIENCE });
  } catch {
    throw new HttpError(400, CHECK_EXPIRED_MESSAGE);
  }
  if (typeof payload !== 'object' || payload.sub !== String(userId)) throw new HttpError(400, CHECK_EXPIRED_MESSAGE);

  const { lang, q, h } = payload as jwt.JwtPayload & Partial<CheckClaims>;
  if (typeof lang !== 'number' || typeof q !== 'string' || typeof h !== 'string') {
    throw new HttpError(400, CHECK_EXPIRED_MESSAGE);
  }
  if (h !== hashCode(code)) throw new HttpError(400, CODE_CHANGED_MESSAGE);
  return { languageId: lang, question: q };
}

// A passed check counts towards the Decoder insignia, once per piece of code.
// Returns false if this pilot had already decoded the same code.
export async function recordPassedCheck(userId: number, languageId: number, code: string): Promise<boolean> {
  return recordDecode(userId, languageId, hashCode(code));
}
