import { pool } from '../config/db.js';
import type { AiUsage } from '../services/ai/aiService.js';

export type AiFeature = 'hint' | 'mentor_chat' | 'answer_evaluation' | 'decode_transmission' | 'debrief';

const MODEL_COLUMN = { flash: 'flash', flashLite: 'flash_lite' } as const;

// One row per Ship's AI request: which feature, the model that answered, and
// the tokens used across every Gemini call it took (retries included).
// Only counts are stored, never the pilot's text.
export async function logAiUsage(userId: number, feature: AiFeature, usage: AiUsage[]): Promise<void> {
  const last = usage.at(-1);
  if (!last) return;
  const inputTokens = usage.reduce((sum, u) => sum + u.inputTokens, 0);
  const outputTokens = usage.reduce((sum, u) => sum + u.outputTokens, 0);
  await pool.execute(
    'INSERT INTO ai_usage_logs (user_id, feature, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)',
    [userId, feature, MODEL_COLUMN[last.model], inputTokens, outputTokens],
  );
}
