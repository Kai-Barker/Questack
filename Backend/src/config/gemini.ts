import { ApiError, GoogleGenAI } from '@google/genai';
import type { GenerateContentConfig, GenerateContentResponse } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in .env');
}

export const ai = new GoogleGenAI({ apiKey });

// The two models from the proposal.
// Flash is pinned to 3.6: the newest Flash versions were often overloaded on the free tier.
// Pinned versions get retired eventually (2.5 already is for new users), so check this
// if Flash starts returning 404 "no longer available".
export const MODELS = {
  flash: 'gemini-3.6-flash', // heavier tasks: explaining code, evaluating answers, mentor chat
  flashLite: 'gemini-flash-lite-latest', // quick, frequent tasks: hints, short feedback
} as const;

export type ModelName = keyof typeof MODELS;

// Max reply length per model, in tokens. This budget also covers the model's hidden
// "thinking", and Flash thinks a lot (often 900+ tokens), so it needs more room.
// Used whenever a call doesn't set its own maxOutputTokens.
export const MAX_OUTPUT_TOKENS: Record<ModelName, number> = {
  flash: 2048,
  flashLite: 1024,
};

// Delays between retries on the same model. Failed requests count towards the daily
// limit, so Flash (20/day on the free tier) retries once before falling back to
// Flash-Lite (500/day), which can afford more retries.
const RETRY_DELAYS_MS: Record<ModelName, number[]> = {
  flash: [1000],
  flashLite: [1000, 2000, 4000],
};

// Google's servers are temporarily busy or broken: worth waiting and retrying
const RETRYABLE_STATUSES = new Set([500, 503, 504]);
// 429 = this model's rate limit hit. Retrying won't help, but the other model has its own limit.
const FALLBACK_STATUSES = new Set([...RETRYABLE_STATUSES, 429]);

function statusOf(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Progress updates while generate() is waiting, so callers can show a loading message
export type GenerateEvent =
  | { type: 'retry'; model: ModelName; status: number; attempt: number; maxAttempts: number; delayMs: number }
  | { type: 'fallback'; from: ModelName; to: ModelName; status: number };

export type GenerateEventHandler = (event: GenerateEvent) => void;

// Default: plain technical log lines for the server console
const logEvent: GenerateEventHandler = (event) => {
  if (event.type === 'retry') {
    console.warn(`Gemini ${MODELS[event.model]} returned ${event.status}, retrying in ${event.delayMs / 1000}s...`);
  } else {
    console.warn(`Gemini ${event.from} unavailable (${event.status}), falling back to ${event.to}`);
  }
};

async function generateWithRetries(
  modelName: ModelName,
  contents: string,
  config: GenerateContentConfig,
  onEvent: GenerateEventHandler,
): Promise<GenerateContentResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODELS[modelName],
        contents,
        config: { maxOutputTokens: MAX_OUTPUT_TOKENS[modelName], ...config },
      });
    } catch (err) {
      const status = statusOf(err);
      const delays = RETRY_DELAYS_MS[modelName];
      const delayMs = delays[attempt];
      if (delayMs === undefined || status === undefined || !RETRYABLE_STATUSES.has(status)) {
        throw err;
      }
      onEvent({
        type: 'retry',
        model: modelName,
        status,
        attempt: attempt + 2, // the attempt about to happen, counting from 1
        maxAttempts: delays.length + 1,
        delayMs,
      });
      await sleep(delayMs);
    }
  }
}

export interface GenerateResult {
  response: GenerateContentResponse;
  modelUsed: ModelName;
  usedFallback: boolean;
}

// Every Gemini call in the app should go through this.
// Retries busy errors with increasing waits, then falls back to Flash-Lite
// if Flash still fails. Throws only if both models fail.
// Pass `onEvent` to show your own loading messages (see src/utils/commsMessages.ts).
export async function generate(
  modelName: ModelName,
  contents: string,
  config: GenerateContentConfig = {},
  onEvent: GenerateEventHandler = logEvent,
): Promise<GenerateResult> {
  try {
    const response = await generateWithRetries(modelName, contents, config, onEvent);
    return { response, modelUsed: modelName, usedFallback: false };
  } catch (err) {
    const status = statusOf(err);
    const canFallBack = modelName === 'flash' && status !== undefined && FALLBACK_STATUSES.has(status);
    if (!canFallBack) {
      throw err;
    }
    onEvent({ type: 'fallback', from: 'flash', to: 'flashLite', status });
    const response = await generateWithRetries('flashLite', contents, config, onEvent);
    return { response, modelUsed: 'flashLite', usedFallback: true };
  }
}
