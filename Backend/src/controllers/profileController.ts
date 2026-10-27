import type { Request, Response } from 'express';
import { z } from 'zod';
import { buildProfile, changeCallsign, MAX_FEATURED, startBooster, updateProfile } from '../services/profileService.js';
import { HttpError } from '../utils/httpError.js';
import { callsign, parse } from '../utils/validation.js';

// Control characters (\p{Cc}), invisible format characters such as zero-width
// spaces and text-direction overrides (\p{Cf}), and line/paragraph separators,
// all of which could hide or reorder text when the bio is shown. Written as
// escapes so the characters themselves never appear in this file.
const hiddenCharacters = /[\p{Cc}\p{Cf}\u2028\u2029]/u;

const bio = z
  .string()
  .trim()
  .max(160, 'Keep your bio to 160 characters or fewer.')
  .refine((text) => !hiddenCharacters.test(text), 'Your bio contains characters that can’t be shown.');

const id = z.number().int().positive();

// strictObject rejects any other field, so a request can't slip in changes to
// things like role, total_xp or is_active
const updateBody = z
  .strictObject({
    bio: bio.optional(),
    titleId: id.nullable().optional(),
    goalLanguageId: id.nullable().optional(),
    frameId: id.nullable().optional(),
    visorId: id.nullable().optional(),
    featuredIds: z
      .array(id)
      .max(MAX_FEATURED, `Feature up to ${MAX_FEATURED} insignia.`)
      .refine((ids) => new Set(ids).size === ids.length, 'Each insignia can only be featured once.')
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.');

// The current password is required: a callsign is also a login name
const callsignBody = z.strictObject({
  callsign,
  password: z.string('Enter your password.').min(1, 'Enter your password.').max(200),
});

// requireAuth runs first, so req.user is always set. Every handler uses the
// session's user id; there is no way to name another pilot.

export async function getMyProfile(req: Request, res: Response) {
  res.json({ profile: await buildProfile(req.user!.userId) });
}

export async function updateMyProfile(req: Request, res: Response) {
  const body = parse(updateBody, req.body);
  res.json({ profile: await updateProfile(req.user!.userId, body) });
}

export async function updateMyCallsign(req: Request, res: Response) {
  const body = parse(callsignBody, req.body);
  await changeCallsign(req.user!.userId, body.callsign, body.password);
  res.json({ profile: await buildProfile(req.user!.userId) });
}

export async function activateMyBooster(req: Request, res: Response) {
  const boosterId = z.coerce.number().int().positive().max(2_147_483_647).safeParse(req.params.boosterId);
  if (!boosterId.success) throw new HttpError(404, 'That booster isn’t in your inventory.');
  res.json({ profile: await startBooster(req.user!.userId, boosterId.data) });
}
