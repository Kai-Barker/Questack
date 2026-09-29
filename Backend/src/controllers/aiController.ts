import type { Request, Response } from 'express';
import { z } from 'zod';
import { findChallenge, findQuest, type ChallengeContent } from '../data/questContent.js';
import {
  decodeTransmission,
  evaluateAnswer,
  getHint,
  mentorChat,
  writeDebrief,
} from '../services/ai/aiService.js';
import { HttpError } from '../utils/httpError.js';

// Request bodies are validated before anything reaches Gemini.
// Length caps keep prompts (and token costs) bounded.
const proficiency = z.enum(['cadet', 'pilot', 'commander']);
const challengeId = z.number().int().positive();
const answerText = z.string().trim().min(1).max(4000);
const pastedCode = z.string().max(20000).optional();

const hintBody = z.object({
  challengeId,
  proficiency,
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  answerDraft: z.string().max(4000).optional(),
  pastedCode,
});

const chatBody = z.object({
  challengeId,
  proficiency,
  messages: z
    .array(z.object({ from: z.enum(['pilot', 'ai']), text: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
  pastedCode,
});

const evaluateBody = z.object({
  challengeId,
  proficiency,
  answer: answerText,
  selectedLine: z.number().int().positive().optional(),
  pastedCode,
});

const decodeBody = z.object({
  challengeId,
  proficiency,
  code: z.string().trim().min(1).max(20000),
});

const debriefBody = z.object({
  questId: z.number().int().positive(),
  proficiency,
  objectives: z
    .array(
      z.object({
        challengeType: z.enum(['read_and_explain', 'bug_hunt', 'decode_transmission', 'architecture']),
        attempts: z.number().int().min(1).max(99),
        hintsUsed: z.number().int().min(0).max(3),
      }),
    )
    .min(1)
    .max(10),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, 'Invalid request body.');
  return result.data;
}

function challengeOr404(id: number): ChallengeContent {
  const challenge = findChallenge(id);
  if (!challenge) throw new HttpError(404, 'Unknown objective.');
  return challenge;
}

export async function hint(req: Request, res: Response) {
  const body = parse(hintBody, req.body);
  const challenge = challengeOr404(body.challengeId);
  res.json({ hint: await getHint(challenge, body.proficiency, body.tier, body.answerDraft, body.pastedCode) });
}

export async function chat(req: Request, res: Response) {
  const body = parse(chatBody, req.body);
  const challenge = challengeOr404(body.challengeId);
  res.json({ reply: await mentorChat(challenge, body.proficiency, body.messages, body.pastedCode) });
}

export async function evaluate(req: Request, res: Response) {
  const body = parse(evaluateBody, req.body);
  const challenge = challengeOr404(body.challengeId);
  if (challenge.challengeType === 'decode_transmission' && !body.pastedCode?.trim()) {
    throw new HttpError(400, 'Paste the intercepted code first.');
  }
  res.json(await evaluateAnswer(challenge, body.proficiency, body.answer, body.selectedLine, body.pastedCode));
}

export async function decode(req: Request, res: Response) {
  const body = parse(decodeBody, req.body);
  const challenge = challengeOr404(body.challengeId);
  res.json({ sections: await decodeTransmission(challenge, body.proficiency, body.code) });
}

export async function debrief(req: Request, res: Response) {
  const body = parse(debriefBody, req.body);
  const quest = findQuest(body.questId);
  if (!quest) throw new HttpError(404, 'Unknown quest.');
  res.json({ debrief: await writeDebrief(quest.questTitle, quest.language, body.proficiency, body.objectives) });
}
