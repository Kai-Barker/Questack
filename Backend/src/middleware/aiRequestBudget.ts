import type { NextFunction, Request, Response } from 'express';
import { runWithRequestBudget } from '../config/gemini.js';

// Gives each Ship's AI request one time limit shared by all its Gemini calls,
// and stops those calls if the pilot leaves (closes the page, or the browser
// gives up after 60 s), so no quota is spent on a reply nobody will see.
export function aiRequestBudget(_req: Request, res: Response, next: NextFunction): void {
  const pilotLeft = new AbortController();
  // 'close' also fires after a normal reply: only an unfinished one means the pilot left
  res.on('close', () => {
    if (!res.writableFinished) pilotLeft.abort();
  });
  runWithRequestBudget(pilotLeft.signal, next);
}
