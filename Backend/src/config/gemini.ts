import { AsyncLocalStorage } from 'node:async_hooks';
import { ApiError, GoogleGenAI } from '@google/genai';
import type { GenerateContentConfig, GenerateContentResponse } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in .env');
}

export const ai = new GoogleGenAI({ apiKey });

// The two tiers from the proposal. Callers pick a tier; generate() picks the model.
// 'flash': heavier tasks where accuracy matters (marking answers, explaining code)
// 'flashLite': quick, frequent tasks (mentor chat, hints, short feedback)
export type ModelName = 'flash' | 'flashLite';

// Every model has its own free-tier quota, so when one is rate limited (429),
// overloaded or hanging, the next one in the list usually answers. Checked
// against our key on 2026-10-23:
// - gemini-3.7-flash and gemini-3.8-flash often hang on the free tier (the
//   newest Flash versions are overloaded), so they come last of the Flash models
// - left out: gemini-3.5-flash (no free quota), the 2.5 models (retired for new
//   users), gemini-flash-latest and gemini-3.1-flash-lite-preview (aliases that
//   share another model's quota)
// Pinned versions get retired eventually: take a model off the list if it
// starts returning 404 "no longer available".
const LITE_CHAIN = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];

export const MODEL_CHAINS: Record<ModelName, readonly string[]> = {
  // Prefer Flash's judgement, but a Flash-Lite answer beats "comms down"
  flash: ['gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.7-flash', 'gemini-3.8-flash', ...LITE_CHAIN],
  flashLite: LITE_CHAIN,
};

// Which tier a model belongs to: sets its limits below and is what usage logs record
export function tierOf(model: string): ModelName {
  return model.includes('flash-lite') ? 'flashLite' : 'flash';
}

// Max reply length per tier, in tokens. This budget also covers the model's hidden
// "thinking", and Flash thinks a lot (often 900+ tokens), so it needs more room.
// Used whenever a call doesn't set its own maxOutputTokens.
export const MAX_OUTPUT_TOKENS: Record<ModelName, number> = {
  flash: 2048,
  flashLite: 1024,
};

// Longest one call may take. When a model is overloaded its calls can hang
// instead of failing, and the SDK has no limit of its own. Flash gets longer
// because it thinks before answering; Flash-Lite normally answers in 1-3 s.
export const CALL_TIMEOUT_MS: Record<ModelName, number> = {
  flash: 20_000,
  flashLite: 10_000,
};

// Longest one generate() may take across every model it tries. The browser
// gives up after 60 s, so this leaves room for the rest of the request.
export const GENERATE_BUDGET_MS = 45_000;

// Longest one pilot request may spend on Gemini across all its generate()
// calls: a JSON retry or the bug-line guard can ask a second time. Anything
// after the browser gives up (60 s) would be spent on a reply nobody sees.
export const REQUEST_BUDGET_MS = 50_000;

// The pilot closed the page or the browser gave up, so the reply can't be delivered
export class PilotLeftError extends Error {
  constructor() {
    super("The pilot left before the Ship's AI replied.");
    this.name = 'PilotLeftError';
  }
}

// The current pilot request's limits, found without passing them through every
// AI function (the same way aiService collects usage)
const requestLimits = new AsyncLocalStorage<{ deadline: number; pilotLeft: AbortSignal }>();

// Runs one pilot request (see middleware/aiRequestBudget.ts): every generate()
// inside it shares one deadline, and stops once `pilotLeft` aborts
export function runWithRequestBudget<T>(pilotLeft: AbortSignal, run: () => T): T {
  return requestLimits.run({ deadline: Date.now() + REQUEST_BUDGET_MS, pilotLeft }, run);
}

// A Flash model is only started if, should it hang, a Flash-Lite model would
// still have this long afterwards. However many Flash models hang, Lite gets a turn.
const LITE_RESERVE_MS = 12_000;

// Wait before the one retry on the same model after a busy error
const RETRY_DELAY_MS = 1000;

// Our own status for a call that hit its timeout
const TIMED_OUT = 408;

// Google's servers are temporarily busy or broken: worth one retry
const RETRYABLE_STATUSES = new Set([500, 503, 504]);
// 429 = this model's rate limit hit; 408 = it timed out. Retrying the same
// model won't help, but the next model in the list may be fine.
const FALLBACK_STATUSES = new Set([...RETRYABLE_STATUSES, 429, TIMED_OUT]);

function statusOf(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Progress updates while generate() is waiting, so callers can show a loading
// message. 'failed' reports every attempt that got no reply (status null for a
// network error), so the usage log can count them.
export type GenerateEvent =
  | { type: 'retry'; model: string; status: number; attempt: number; maxAttempts: number; delayMs: number }
  | { type: 'fallback'; from: string; to: string; status: number }
  | { type: 'failed'; model: string; status: number | null };

export type GenerateEventHandler = (event: GenerateEvent) => void;

// Default: plain technical log lines for the server console. 'failed' needs no
// line of its own: the retry or fallback line (or the final error) says it.
export const logGenerateEvent: GenerateEventHandler = (event) => {
  if (event.type === 'retry') {
    console.warn(`Gemini ${event.model} returned ${event.status}, retrying in ${event.delayMs / 1000}s...`);
  } else if (event.type === 'fallback') {
    console.warn(`Gemini ${event.from} unavailable (${event.status}), falling back to ${event.to}`);
  }
};

async function generateWithRetries(
  model: string,
  contents: string,
  config: GenerateContentConfig,
  onEvent: GenerateEventHandler,
  deadline: number,
  pilotLeft: AbortSignal | undefined,
): Promise<GenerateContentResponse> {
  const tier = tierOf(model);
  for (let attempt = 1; ; attempt++) {
    const timeoutMs = Math.min(CALL_TIMEOUT_MS[tier], deadline - Date.now());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortSignal = pilotLeft ? AbortSignal.any([controller.signal, pilotLeft]) : controller.signal;
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config: { maxOutputTokens: MAX_OUTPUT_TOKENS[tier], ...config, abortSignal },
      });
    } catch (caught) {
      if (pilotLeft?.aborted) throw new PilotLeftError();
      // A hung call becomes an ApiError like any other failure, so the
      // fallback, the cooldown and the error handler all treat it the same
      const err = controller.signal.aborted
        ? new ApiError({ message: `${model} timed out after ${Math.round(timeoutMs / 1000)}s`, status: TIMED_OUT })
        : caught;
      const status = statusOf(err);
      onEvent({ type: 'failed', model, status: status ?? null });
      const canRetry = attempt === 1 && status !== undefined && RETRYABLE_STATUSES.has(status);
      if (!canRetry || deadline - Date.now() <= RETRY_DELAY_MS) {
        throw err;
      }
      onEvent({ type: 'retry', model, status, attempt: 2, maxAttempts: 2, delayMs: RETRY_DELAY_MS });
      await sleep(RETRY_DELAY_MS);
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

// A model that failed (busy, rate limited or hung) goes to the back of the
// list for this long. Otherwise, while it's down, every request would first
// wait for its error (up to a whole timeout for a hung one) before reaching a
// working model.
export const MODEL_COOLDOWN_MS = 5 * 60 * 1000;
const modelDownUntil = new Map<string, number>();

// For tests: forget which models were down
export function resetModelCooldowns(): void {
  modelDownUntil.clear();
}

// Every Gemini call in the app should go through this.
// Tries the tier's models in order (see MODEL_CHAINS), leaving any that failed
// recently until last, until one answers or GENERATE_BUDGET_MS runs out.
// Pass `onEvent` to show your own loading messages (see src/utils/commsMessages.ts).
export async function generate(
  modelName: ModelName,
  contents: string,
  config: GenerateContentConfig = {},
  onEvent: GenerateEventHandler = logGenerateEvent,
): Promise<GenerateResult> {
  const request = requestLimits.getStore();
  const deadline = Math.min(Date.now() + GENERATE_BUDGET_MS, request?.deadline ?? Infinity);
  const chain = MODEL_CHAINS[modelName];
  const now = Date.now();
  const cooling = (model: string) => (modelDownUntil.get(model) ?? 0) > now;
  // Recently failed models move to the back rather than out: when the others
  // fail too, one rate limited a few minutes ago may well answer again
  const candidates = [...chain.filter((model) => !cooling(model)), ...chain.filter(cooling)];

  let failed: { model: string; status: number; err: unknown } | undefined;
  for (const [i, model] of candidates.entries()) {
    if (request?.pilotLeft.aborted) throw new PilotLeftError();
    const timeLeft = deadline - Date.now();
    if (timeLeft <= 0) break;
    const liteLater = candidates.slice(i + 1).some((next) => tierOf(next) === 'flashLite');
    if (tierOf(model) === 'flash' && liteLater && timeLeft < CALL_TIMEOUT_MS.flash + LITE_RESERVE_MS) continue;

    if (failed) onEvent({ type: 'fallback', from: failed.model, to: model, status: failed.status });
    try {
      const response = await generateWithRetries(model, contents, config, onEvent, deadline, request?.pilotLeft);
      return { response, modelUsed: tierOf(model), usedFallback: model !== chain[0] };
    } catch (err) {
      const status = statusOf(err);
      if (status === undefined || !FALLBACK_STATUSES.has(status)) {
        throw err;
      }
      // A call cut short because the time ran out didn't fail on its own
      const outOfTime = status === TIMED_OUT && Date.now() >= deadline;
      if (!outOfTime) modelDownUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
      failed = { model, status, err };
    }
  }
  // Every model tried failed, or the request had no time left to try one
  throw failed?.err ?? new ApiError({ message: "No time left in this request to ask the Ship's AI", status: TIMED_OUT });
}
