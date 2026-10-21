import type { Request, Response } from 'express';
import { z } from 'zod';
import { changeRank, dashboard, pilotSummary, sectorDetail } from '../services/progressService.js';
import { acknowledgeBriefing, completeQuest, questDetail } from '../services/questService.js';
import { HttpError } from '../utils/httpError.js';
import { parse } from '../utils/validation.js';

// Galaxy Map, Sector Map and Quest endpoints. requireAuth runs first, so
// req.user is always set, and every handler only uses the session's user id.

const id = z.coerce.number().int().positive().max(2_147_483_647);

function idParam(value: unknown): number {
  const result = id.safeParse(value);
  if (!result.success) throw new HttpError(404, 'Not found.');
  return result.data;
}

const rankBody = z.strictObject({ proficiencyLevel: z.enum(['cadet', 'pilot', 'commander'], 'Choose a rank.') });

export async function getPilot(req: Request, res: Response) {
  res.json(await pilotSummary(req.user!.userId, req.user!.username));
}

export async function getDashboard(req: Request, res: Response) {
  res.json(await dashboard(req.user!.userId));
}

export async function getSector(req: Request, res: Response) {
  res.json(await sectorDetail(req.user!.userId, idParam(req.params.id)));
}

export async function updateSectorRank(req: Request, res: Response) {
  const body = parse(rankBody, req.body);
  await changeRank(req.user!.userId, idParam(req.params.id), body.proficiencyLevel);
  res.status(204).end();
}

export async function getQuest(req: Request, res: Response) {
  res.json(await questDetail(req.user!.userId, idParam(req.params.id)));
}

// No body: reading a briefing is the whole objective
export async function postBriefingRead(req: Request, res: Response) {
  await acknowledgeBriefing(req.user!.userId, idParam(req.params.id));
  res.status(204).end();
}

// No body: the server already knows which objectives were cleared
export async function postQuestComplete(req: Request, res: Response) {
  res.json(await completeQuest(req.user!.userId, idParam(req.params.id)));
}
