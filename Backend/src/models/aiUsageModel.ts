import { pool } from '../config/db.js';
import { tierOf } from '../config/gemini.js';
import type { AiFailure, AiUsage } from '../services/ai/aiService.js';

export type AiFeature = 'hint' | 'mentor_chat' | 'answer_evaluation' | 'decode_transmission' | 'debrief';

const MODEL_COLUMN = { flash: 'flash', flashLite: 'flash_lite' } as const;

// One row per Ship's AI request that got a reply: which feature, the model that
// answered, and the tokens used across every Gemini call it took (retries
// included). Plus one row per failed attempt (rate limited, busy, timed out),
// with the exact model and status, so the admin console shows what the model
// rotation really costs. Only counts are stored, never the pilot's text.
export async function logAiUsage(userId: number, feature: AiFeature, usage: AiUsage[], failures: AiFailure[] = []): Promise<void> {
  const rows: (string | number | null)[][] = [];
  const last = usage.at(-1);
  if (last) {
    const inputTokens = usage.reduce((sum, u) => sum + u.inputTokens, 0);
    const outputTokens = usage.reduce((sum, u) => sum + u.outputTokens, 0);
    rows.push([userId, feature, MODEL_COLUMN[last.model], 'success', null, null, inputTokens, outputTokens]);
  }
  for (const failure of failures) {
    rows.push([userId, feature, MODEL_COLUMN[tierOf(failure.model)], 'failed', failure.model, failure.status, 0, 0]);
  }
  if (rows.length === 0) return;
  await pool.query(
    `INSERT INTO ai_usage_logs
       (user_id, feature, model, outcome, model_name, error_status, input_tokens, output_tokens)
     VALUES ?`,
    [rows],
  );
}
