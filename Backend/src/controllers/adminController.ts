import type { Request, Response } from 'express';
import { z } from 'zod';
import { findAdminUser, getOverview, listUsers, recentAiUsage, setUserActive } from '../models/adminModel.js';
import { deleteDraftQuest, findQuest, listQuests, listSectors } from '../models/adminQuestModel.js';
import { invalidateCatalog } from '../services/questCatalog.js';
import { MAX_BRIEFING_LENGTH, MAX_OBJECTIVES, saveQuest } from '../services/adminQuestService.js';
import { HttpError } from '../utils/httpError.js';
import { parse } from '../utils/validation.js';

// Admin console endpoints. requireAuth and requireAdmin run first (see
// app.ts), so req.user is always an admin whose role was just re-read from
// the database.

const id = z.number().int().positive().max(2_147_483_647);

function idParam(value: unknown, notFound: string): number {
  const parsed = z.coerce.number().pipe(id).safeParse(value);
  if (!parsed.success) throw new HttpError(404, notFound);
  return parsed.data;
}

const QUEST_NOT_FOUND = 'That quest doesn’t exist.';
const PILOT_NOT_FOUND = 'That pilot doesn’t exist.';

const text = (max: number, required: string) =>
  z.string(required).trim().min(1, required).max(max, `Keep this to ${max.toLocaleString('en')} characters or fewer.`);
const optionalText = (max: number) =>
  z.string().max(max, `Keep this to ${max.toLocaleString('en')} characters or fewer.`).nullable().optional();

const objective = z.strictObject({
  challengeId: id.optional(),
  type: z.enum(['read_and_explain', 'bug_hunt', 'decode_transmission', 'briefing'], 'Pick an objective type.'),
  // Briefings hold a whole Markdown lesson; adminQuestService keeps the other types to 5,000
  instructions: text(MAX_BRIEFING_LENGTH, 'Add instructions for the pilot.'),
  fileName: optionalText(100).refine(
    (name) => !name?.trim() || /^[\w.-]+$/.test(name.trim()),
    'Use letters, numbers, dots, - and _ only, e.g. Program.cs.',
  ),
  // Snippets aren't trimmed here: indentation matters
  codeSnippet: optionalText(20_000),
  answerKey: optionalText(5000),
  // Briefings have none, so whether it's required is checked by adminQuestService
  markingCriteria: z.string().trim().max(5000, 'Keep this to 5,000 characters or fewer.'),
  bugLine: z.number('Enter a line number.').int('Enter a whole line number.').min(1, 'Lines start at 1.').max(5000).nullable().optional(),
});

// strictObject rejects any other field, so a request can't set things like
// created_by, reward_id or a quest id
const questBody = z.strictObject({
  languageId: id,
  title: text(150, 'Give the quest a title.'),
  concept: text(100, 'Name the concept this quest teaches.'),
  difficulty: z.enum(['easy', 'medium', 'hard'], 'Pick a difficulty.'),
  status: z.enum(['draft', 'published'], 'Pick draft or published.'),
  isSideQuest: z.boolean(),
  storyText: z.string().trim().max(5000, 'Keep the briefing to 5,000 characters or fewer.'),
  xpReward: z.number('Enter an XP reward.').int('Use a whole number.').min(0, 'XP can’t be negative.').max(10_000, 'Keep XP to 10,000 or less.'),
  prerequisiteIds: z.array(id).max(20, 'Use 20 prerequisites or fewer.'),
  objectives: z
    .array(objective)
    .max(MAX_OBJECTIVES, `A quest can have up to ${MAX_OBJECTIVES} objectives.`)
    .refine((list) => {
      const ids = list.flatMap((o) => (o.challengeId === undefined ? [] : [o.challengeId]));
      return new Set(ids).size === ids.length;
    }, 'Each objective can only appear once.'),
});

const userBody = z.strictObject({ isActive: z.boolean() });

// The frontend asks this each time an admin opens an admin tab, so a role
// that was taken away closes the console straight away
export function session(req: Request, res: Response) {
  res.json({ user: req.user });
}

export async function overview(_req: Request, res: Response) {
  res.json(await getOverview());
}

export async function sectors(_req: Request, res: Response) {
  res.json({ sectors: await listSectors() });
}

export async function quests(_req: Request, res: Response) {
  res.json({ quests: await listQuests() });
}

export async function quest(req: Request, res: Response) {
  const quest = await findQuest(idParam(req.params.questId, QUEST_NOT_FOUND));
  if (!quest) throw new HttpError(404, QUEST_NOT_FOUND);
  res.json({ quest });
}

export async function createQuest(req: Request, res: Response) {
  const body = parse(questBody, req.body, { fullPaths: true });
  res.status(201).json({ quest: await saveQuest(req.user!.userId, null, body) });
}

export async function updateQuest(req: Request, res: Response) {
  const questId = idParam(req.params.questId, QUEST_NOT_FOUND);
  const body = parse(questBody, req.body, { fullPaths: true });
  res.json({ quest: await saveQuest(req.user!.userId, questId, body) });
}

export async function deleteQuest(req: Request, res: Response) {
  const result = await deleteDraftQuest(idParam(req.params.questId, QUEST_NOT_FOUND));
  if (result === 'not-found') throw new HttpError(404, QUEST_NOT_FOUND);
  if (result === 'published') {
    throw new HttpError(409, 'Published quests can’t be deleted. Move it to draft to hide it from pilots.');
  }
  if (result === 'played') {
    throw new HttpError(409, 'Pilots have already flown this quest, so it’s kept. As a draft, it stays hidden from them.');
  }
  invalidateCatalog();
  res.status(204).end();
}

export async function users(_req: Request, res: Response) {
  res.json({ users: await listUsers() });
}

export async function updateUser(req: Request, res: Response) {
  const userId = idParam(req.params.userId, PILOT_NOT_FOUND);
  const body = parse(userBody, req.body);
  if (userId === req.user!.userId) throw new HttpError(400, 'You can’t deactivate your own account.');

  const target = await findAdminUser(userId);
  if (!target) throw new HttpError(404, PILOT_NOT_FOUND);
  if (target.role === 'admin') throw new HttpError(409, 'Admin accounts can’t be deactivated from the console.');

  await setUserActive(userId, body.isActive);
  res.json({ user: { ...target, isActive: body.isActive } });
}

export async function aiUsage(_req: Request, res: Response) {
  res.json({ usage: await recentAiUsage() });
}
