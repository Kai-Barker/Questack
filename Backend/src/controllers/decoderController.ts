import type { Request, Response } from 'express';
import { z } from 'zod';
import { checkDecoderAnswer, decodeStandalone, decoderChat } from '../services/ai/aiService.js';
import { tracked } from '../services/ai/trackUsage.js';
import { decoderLanguage, recordPassedCheck, signCheckToken, verifyCheckToken } from '../services/decoderService.js';
import { parse } from '../utils/validation.js';

// The standalone decoder (/decoder), mounted under /api/ai behind requireAuth
// and the AI rate limits. Not a quest: nothing here touches attempts or XP,
// and the pilot's code is never stored or logged.

const proficiency = z.enum(['cadet', 'pilot', 'commander'], 'Choose a rank.');
const languageId = z.number('Choose a sector.').int().positive();
const code = z.string().trim().min(1, 'Paste some code to decode.').max(20000, 'Keep it under 20,000 characters.');

const decodeBody = z.strictObject({ languageId, proficiency, code });

const chatBody = z.strictObject({
  languageId,
  proficiency,
  code,
  messages: z
    .array(z.strictObject({ from: z.enum(['pilot', 'ai']), text: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
  question: z.string().max(1000).optional(),
});

const checkBody = z.strictObject({
  proficiency,
  code,
  checkToken: z.string().min(1).max(4000),
  answer: z.string().trim().min(1, 'Write your answer first.').max(4000),
});

// Explains the code section by section and sets one comprehension question
export async function decode(req: Request, res: Response) {
  const body = parse(decodeBody, req.body);
  const userId = req.user!.userId;
  const language = await decoderLanguage(body.languageId);
  const result = await tracked(userId, 'decode_transmission', () =>
    decodeStandalone(language, body.proficiency, body.code),
  );
  res.json({
    sections: result.sections,
    question: result.question,
    // No question means the text wasn't code, so there's nothing to check
    checkToken: result.question ? signCheckToken(userId, body.languageId, result.question, body.code) : null,
  });
}

// Follow-up questions about the code
export async function chat(req: Request, res: Response) {
  const body = parse(chatBody, req.body);
  const userId = req.user!.userId;
  const language = await decoderLanguage(body.languageId);
  const reply = await tracked(userId, 'mentor_chat', () =>
    decoderChat(language, body.proficiency, body.code, body.messages, body.question),
  );
  res.json({ reply });
}

// Marks the comprehension answer. The question comes from the signed token,
// never the request, and a pass counts towards the Decoder insignia.
export async function check(req: Request, res: Response) {
  const body = parse(checkBody, req.body);
  const userId = req.user!.userId;
  // Checked before the AI call, so a stale or forged token costs nothing
  const { languageId, question } = verifyCheckToken(body.checkToken, userId, body.code);
  const language = await decoderLanguage(languageId);
  const evaluation = await tracked(userId, 'answer_evaluation', () =>
    checkDecoderAnswer(language, body.proficiency, body.code, question, body.answer),
  );
  // counted: false when the pilot had already decoded this same code
  const counted = evaluation.correct ? await recordPassedCheck(userId, languageId, body.code) : false;
  res.json({ ...evaluation, counted });
}
