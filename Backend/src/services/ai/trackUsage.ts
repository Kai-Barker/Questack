import { logAiUsage, type AiFeature } from '../../models/aiUsageModel.js';
import { withUsage } from './aiService.js';

// Runs a Ship's AI feature and logs its token usage. A failed log never
// fails the pilot's request: the reply has already been paid for.
export async function tracked<T>(userId: number, feature: AiFeature, run: () => Promise<T>): Promise<T> {
  const { result, usage } = await withUsage(run);
  await logAiUsage(userId, feature, usage).catch((err: unknown) => console.error('AI usage log failed:', err));
  return result;
}
