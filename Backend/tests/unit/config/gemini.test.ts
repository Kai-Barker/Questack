import { ApiError, type GenerateContentResponse } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as GeminiModule from '../../../src/config/gemini.js';

// generate(): retries busy errors, then falls back from Flash to Flash-Lite.
// tests/setup/mocks.ts replaces generate() everywhere else, so this file
// loads the real module and fakes the Gemini SDK call underneath it.
// Fake timers skip the waits between retries.

const { ai, generate, MODELS, FLASH_COOLDOWN_MS, CALL_TIMEOUT_MS, resetFlashCooldown } = await vi.importActual<typeof GeminiModule>(
  '../../../src/config/gemini.js',
);

const OK = { text: 'ok' } as GenerateContentResponse;
const busy = (status: number) => new ApiError({ message: `status ${status}`, status });

let sdk: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  resetFlashCooldown();
  sdk = vi.spyOn(ai.models, 'generateContent');
});

afterEach(() => {
  vi.useRealTimers();
  sdk.mockRestore();
});

// Runs generate() while letting the fake clock move past every retry wait
async function run(...args: Parameters<typeof generate>) {
  const result = generate(...args);
  result.catch(() => {}); // checked by the caller
  await vi.runAllTimersAsync();
  return result;
}

describe('Flash cooldown', () => {
  it('skips Flash for a while after it fails, then tries it again', async () => {
    sdk.mockImplementation(async ({ model }: { model: string }) => {
      if (model === MODELS.flash) throw busy(503);
      return OK;
    });

    await run('flash', 'first');
    const flashCalls = () =>
      sdk.mock.calls.filter((call: unknown[]) => (call[0] as { model: string }).model === MODELS.flash).length;
    expect(flashCalls()).toBe(2); // first try + one retry, then the fallback

    const second = await run('flash', 'second');
    expect(second.modelUsed).toBe('flashLite');
    expect(flashCalls()).toBe(2); // Flash wasn't tried again

    vi.advanceTimersByTime(FLASH_COOLDOWN_MS);
    await run('flash', 'third');
    expect(flashCalls()).toBe(4); // cooldown over: Flash gets another chance
  });
});

describe('call timeout', () => {
  it('gives up on a hung Flash call and answers with Flash-Lite', async () => {
    // Flash never answers (until its abort signal fires); Flash-Lite is fine
    sdk.mockImplementation(({ model, config }: { model: string; config: { abortSignal: AbortSignal } }) =>
      model === MODELS.flash
        ? new Promise((_, reject) => config.abortSignal.addEventListener('abort', () => reject(new Error('aborted'))))
        : Promise.resolve(OK),
    );
    const events = vi.fn();

    const result = await run('flash', 'Hello', {}, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flashLite', usedFallback: true });
    // A timeout isn't retried on the same model: straight to the fallback
    expect(sdk).toHaveBeenCalledTimes(2);
    expect(events).toHaveBeenCalledWith({ type: 'fallback', from: 'flash', to: 'flashLite', status: 408 });
    expect(CALL_TIMEOUT_MS.flash + CALL_TIMEOUT_MS.flashLite).toBeLessThan(60_000); // inside the browser's limit
  });

  it('reports a timeout on both models as a Gemini error', async () => {
    sdk.mockImplementation(({ config }: { config: { abortSignal: AbortSignal } }) =>
      new Promise((_, reject) => config.abortSignal.addEventListener('abort', () => reject(new Error('aborted')))),
    );

    await expect(run('flash', 'Hello', {}, vi.fn())).rejects.toMatchObject({ status: 408 });
  });
});

describe('generate', () => {
  it('returns the first reply, using the model’s default output limit', async () => {
    sdk.mockResolvedValue(OK);
    const events = vi.fn();
    const result = await run('flash', 'Hello', { temperature: 0.5 }, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flash', usedFallback: false });
    expect(sdk).toHaveBeenCalledWith({
      model: MODELS.flash,
      contents: 'Hello',
      config: { maxOutputTokens: 2048, temperature: 0.5, abortSignal: expect.any(AbortSignal) },
    });
    expect(events).not.toHaveBeenCalled();
  });

  it('lets a call set its own output limit', async () => {
    sdk.mockResolvedValue(OK);
    await run('flashLite', 'Hi', { maxOutputTokens: 64 });
    expect(sdk.mock.calls[0]![0]).toMatchObject({ config: { maxOutputTokens: 64 } });
  });

  it.each([500, 503, 504])('retries Flash once after a %i, then succeeds', async (status) => {
    sdk.mockRejectedValueOnce(busy(status)).mockResolvedValue(OK);
    const events = vi.fn();
    const result = await run('flash', 'Hi', {}, events);

    expect(result.modelUsed).toBe('flash');
    expect(sdk).toHaveBeenCalledTimes(2);
    expect(events).toHaveBeenCalledWith({ type: 'retry', model: 'flash', status, attempt: 2, maxAttempts: 2, delayMs: 1000 });
  });

  it('falls back to Flash-Lite when Flash stays busy', async () => {
    sdk.mockRejectedValueOnce(busy(503)).mockRejectedValueOnce(busy(503)).mockResolvedValue(OK);
    const events = vi.fn();
    const result = await run('flash', 'Hi', {}, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flashLite', usedFallback: true });
    expect(sdk.mock.calls[2]![0]).toMatchObject({ model: MODELS.flashLite, config: { maxOutputTokens: 1024 } });
    expect(events).toHaveBeenLastCalledWith({ type: 'fallback', from: 'flash', to: 'flashLite', status: 503 });
  });

  it('falls back straight away on a 429 (retrying the same model won’t help)', async () => {
    sdk.mockRejectedValueOnce(busy(429)).mockResolvedValue(OK);
    const result = await run('flash', 'Hi', {}, vi.fn());

    expect(sdk).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(true);
  });

  it('retries Flash-Lite three times with growing waits, then gives up', async () => {
    sdk.mockRejectedValue(busy(503));
    const events = vi.fn();

    await expect(run('flashLite', 'Hi', {}, events)).rejects.toThrow('status 503');
    expect(sdk).toHaveBeenCalledTimes(4);
    expect(events.mock.calls.map(([e]) => e.delayMs)).toEqual([1000, 2000, 4000]);
  });

  it('throws when both models fail', async () => {
    sdk.mockRejectedValue(busy(503));
    await expect(run('flash', 'Hi', {}, vi.fn())).rejects.toBeInstanceOf(ApiError);
    expect(sdk).toHaveBeenCalledTimes(2 + 4);
  });

  it.each([
    ['a bad request (400)', busy(400)],
    ['a network failure', new TypeError('fetch failed')],
  ])('doesn’t retry or fall back after %s', async (_name, error) => {
    sdk.mockRejectedValue(error);
    await expect(run('flash', 'Hi', {}, vi.fn())).rejects.toBe(error);
    expect(sdk).toHaveBeenCalledTimes(1);
  });

  it('logs retries and fallbacks to the console by default', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sdk.mockRejectedValueOnce(busy(503)).mockRejectedValueOnce(busy(503)).mockResolvedValue(OK);
    await run('flash', 'Hi');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('retrying in 1s'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('falling back to flashLite'));
  });
});
