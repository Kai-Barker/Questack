import { logAiUsage, type AiFeature } from '../../models/aiUsageModel.js';
import { withUsage, type AiCalls } from './aiService.js';

// Runs a Ship's AI feature and logs its token usage and failed attempts. It
// logs even when the feature fails, as that's when the failed attempts matter
// most. A failed log never fails the pilot's request: the reply has already
// been paid for.
export async function tracked<T>(userId: number, feature: AiFeature, run: () => Promise<T>): Promise<T> {
  const calls: AiCalls = { usage: [], failures: [] };
  try {
    const { result } = await withUsage(run, calls);
    return result;
  } finally {
    await logAiUsage(userId, feature, calls.usage, calls.failures).catch((err: unknown) =>
      console.error('AI usage log failed:', err),
    );
  }
}
