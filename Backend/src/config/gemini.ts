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

// Longest one call may take. When a model is overloaded its calls can hang
// instead of failing, and the SDK has no limit of its own, so without this a
// request could wait forever (the browser gives up after 60 s). Flash plus a
// Flash-Lite fallback both timing out still answers within that.
export const CALL_TIMEOUT_MS: Record<ModelName, number> = {
  flash: 20_000,
  flashLite: 15_000,
};
// Our own status for a call that hit CALL_TIMEOUT_MS
const TIMED_OUT = 408;

// Google's servers are temporarily busy or broken: worth waiting and retrying
const RETRYABLE_STATUSES = new Set([500, 503, 504]);
// 429 = this model's rate limit hit; 408 = it timed out. Retrying the same
// model won't help (and a timeout has already cost the most time), but the
// other model may be fine.
const FALLBACK_STATUSES = new Set([...RETRYABLE_STATUSES, 429, TIMED_OUT]);

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS[modelName]);
    try {
      return await ai.models.generateContent({
        model: MODELS[modelName],
        contents,
        config: { maxOutputTokens: MAX_OUTPUT_TOKENS[modelName], ...config, abortSignal: controller.signal },
      });
    } catch (caught) {
      // A hung call becomes an ApiError like any other failure, so the
      // fallback, the cooldown and the error handler all treat it the same
      const err = controller.signal.aborted
        ? new ApiError({ message: `${MODELS[modelName]} timed out after ${CALL_TIMEOUT_MS[modelName] / 1000}s`, status: TIMED_OUT })
        : caught;
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
    } finally {
      clearTimeout(timer);
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
// Once Flash has failed and a call has fallen back, Flash is skipped for this
// long. Otherwise, while Flash is down, every request would first wait for its
// error and a retry before reaching Flash-Lite.
export const FLASH_COOLDOWN_MS = 2 * 60 * 1000;
let flashDownUntil = 0;

// For tests: forget that Flash was down
export function resetFlashCooldown(): void {
  flashDownUntil = 0;
}

export async function generate(
  modelName: ModelName,
  contents: string,
  config: GenerateContentConfig = {},
  onEvent: GenerateEventHandler = logEvent,
): Promise<GenerateResult> {
  if (modelName === 'flash' && Date.now() < flashDownUntil) {
    const response = await generateWithRetries('flashLite', contents, config, onEvent);
    return { response, modelUsed: 'flashLite', usedFallback: true };
  }
  try {
    const response = await generateWithRetries(modelName, contents, config, onEvent);
    return { response, modelUsed: modelName, usedFallback: false };
  } catch (err) {
    const status = statusOf(err);
    const canFallBack = modelName === 'flash' && status !== undefined && FALLBACK_STATUSES.has(status);
    if (!canFallBack) {
      throw err;
    }
    flashDownUntil = Date.now() + FLASH_COOLDOWN_MS;
    onEvent({ type: 'fallback', from: 'flash', to: 'flashLite', status });
    const response = await generateWithRetries('flashLite', contents, config, onEvent);
    return { response, modelUsed: 'flashLite', usedFallback: true };
  }
}
