import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  decodeTransmission,
  evaluateAnswer,
  getHint,
  mentorChat,
  writeDebrief,
} from '../services/ai/aiService.js';
import { tracked } from '../services/ai/trackUsage.js';
import { checkCanAnswer, objectiveAccess, requireCompleted, saveAnswer } from '../services/questService.js';
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
  hintsUsed: z.number().int().min(0).max(3).optional(),
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

// requireAuth runs first, so req.user is always set. Every call checks the
// objective belongs to a quest this pilot has unlocked.

export async function hint(req: Request, res: Response) {
  const body = parse(hintBody, req.body);
  const userId = req.user!.userId;
  const { content } = await objectiveAccess(userId, body.challengeId);
  const reply = await tracked(userId, 'hint', () =>
    getHint(content, body.proficiency, body.tier, body.answerDraft, body.pastedCode),
  );
  res.json({ hint: reply });
}

export async function chat(req: Request, res: Response) {
  const body = parse(chatBody, req.body);
  const userId = req.user!.userId;
  const { content } = await objectiveAccess(userId, body.challengeId);
  const reply = await tracked(userId, 'mentor_chat', () =>
    mentorChat(content, body.proficiency, body.messages, body.pastedCode),
  );
  res.json({ reply });
}

// Marks an answer and records it in the pilot's progress. Objectives must be
// answered in order, and the server's mark is the only one that counts.
export async function evaluate(req: Request, res: Response) {
  const body = parse(evaluateBody, req.body);
  const userId = req.user!.userId;
  const access = await objectiveAccess(userId, body.challengeId);
  if (access.challenge.type === 'decode_transmission' && !body.pastedCode?.trim()) {
    throw new HttpError(400, 'Paste the intercepted code first.');
  }
  // Checked before the AI call, so a turned-away answer costs nothing
  await checkCanAnswer(userId, access);

  const evaluation = await tracked(userId, 'answer_evaluation', () =>
    evaluateAnswer(access.content, body.proficiency, body.answer, body.selectedLine, body.pastedCode),
  );
  await saveAnswer(userId, access, {
    text: body.answer,
    feedback: evaluation.feedback,
    correct: evaluation.correct,
    hintsUsed: body.hintsUsed ?? 0,
  });
  res.json(evaluation);
}

export async function decode(req: Request, res: Response) {
  const body = parse(decodeBody, req.body);
  const userId = req.user!.userId;
  const { content } = await objectiveAccess(userId, body.challengeId);
  const sections = await tracked(userId, 'decode_transmission', () =>
    decodeTransmission(content, body.proficiency, body.code),
  );
  res.json({ sections });
}

export async function debrief(req: Request, res: Response) {
  const body = parse(debriefBody, req.body);
  const userId = req.user!.userId;
  const quest = await requireCompleted(userId, body.questId);
  const text = await tracked(userId, 'debrief', () =>
    writeDebrief(quest.title, quest.language, body.proficiency, body.objectives),
  );
  res.json({ debrief: text });
}
