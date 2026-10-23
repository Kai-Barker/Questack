import { ApiError, type GenerateContentResponse } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import type * as GeminiModule from '../../../src/config/gemini.js';
import type * as BudgetModule from '../../../src/middleware/aiRequestBudget.js';

// generate(): tries each tier's models in order, retrying busy errors once
// and skipping models that failed recently.
// tests/setup/mocks.ts replaces generate() everywhere else, so this file
// loads the real module and fakes the Gemini SDK call underneath it.
// Fake timers skip the waits between retries and fire the call timeouts.

const {
  ai,
  generate,
  MODEL_CHAINS,
  MODEL_COOLDOWN_MS,
  CALL_TIMEOUT_MS,
  GENERATE_BUDGET_MS,
  REQUEST_BUDGET_MS,
  PilotLeftError,
  resetModelCooldowns,
  runWithRequestBudget,
} = await vi.importActual<typeof GeminiModule>('../../../src/config/gemini.js');
const { aiRequestBudget } = await vi.importActual<typeof BudgetModule>('../../../src/middleware/aiRequestBudget.js');

const OK = { text: 'ok' } as GenerateContentResponse;
const busy = (status: number) => new ApiError({ message: `status ${status}`, status });

const FLASH = MODEL_CHAINS.flash;
const LITE = MODEL_CHAINS.flashLite;
const FIRST_LITE_IN_FLASH = FLASH.findIndex((model) => model.includes('flash-lite'));

type Call = { model: string; config: { abortSignal: AbortSignal } };

let sdk: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  resetModelCooldowns();
  sdk = vi.spyOn(ai.models, 'generateContent');
});

afterEach(() => {
  vi.useRealTimers();
  sdk.mockRestore();
});

// Runs generate() while letting the fake clock move past every wait and timeout
async function run(...args: Parameters<typeof generate>) {
  const result = generate(...args);
  result.catch(() => {}); // checked by the caller
  await vi.runAllTimersAsync();
  return result;
}

// The models the SDK was asked for, in order
const modelsCalled = () => sdk.mock.calls.map((call: unknown[]) => (call[0] as Call).model);

// A call that never answers, until its abort signal fires
const hang = ({ config }: Call) =>
  new Promise((_, reject) => config.abortSignal.addEventListener('abort', () => reject(new Error('aborted'))));

describe('model lists', () => {
  it('prefers Flash for the Flash tier and ends on the Flash-Lite models', () => {
    expect(FLASH[0]).not.toContain('lite');
    expect(FIRST_LITE_IN_FLASH).toBeGreaterThan(1); // several Flash models before Lite
    expect(FLASH.slice(FIRST_LITE_IN_FLASH)).toEqual(LITE);
    expect(LITE.every((model) => model.includes('flash-lite'))).toBe(true);
  });
});

describe('generate', () => {
  it('returns the first reply, using the tier’s default output limit', async () => {
    sdk.mockResolvedValue(OK);
    const events = vi.fn();
    const result = await run('flash', 'Hello', { temperature: 0.5 }, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flash', usedFallback: false });
    expect(sdk).toHaveBeenCalledWith({
      model: FLASH[0],
      contents: 'Hello',
      config: { maxOutputTokens: 2048, temperature: 0.5, abortSignal: expect.any(AbortSignal) },
    });
    expect(events).not.toHaveBeenCalled();
  });

  it('lets a call set its own output limit', async () => {
    sdk.mockResolvedValue(OK);
    await run('flashLite', 'Hi', { maxOutputTokens: 64 });
    expect(sdk.mock.calls[0]![0]).toMatchObject({ model: LITE[0], config: { maxOutputTokens: 64 } });
  });

  it.each([500, 503, 504])('retries a model once after a %i, then succeeds', async (status) => {
    sdk.mockRejectedValueOnce(busy(status)).mockResolvedValue(OK);
    const events = vi.fn();
    const result = await run('flash', 'Hi', {}, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flash', usedFallback: false });
    expect(modelsCalled()).toEqual([FLASH[0], FLASH[0]]);
    expect(events).toHaveBeenCalledWith({ type: 'retry', model: FLASH[0], status, attempt: 2, maxAttempts: 2, delayMs: 1000 });
  });

  it('moves to the next model when one stays busy', async () => {
    sdk.mockRejectedValueOnce(busy(503)).mockRejectedValueOnce(busy(503)).mockResolvedValue(OK);
    const events = vi.fn();
    const result = await run('flash', 'Hi', {}, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flash', usedFallback: true });
    expect(modelsCalled()).toEqual([FLASH[0], FLASH[0], FLASH[1]]);
    expect(events).toHaveBeenLastCalledWith({ type: 'fallback', from: FLASH[0], to: FLASH[1], status: 503 });
  });

  it('moves on straight away after a 429 (retrying the same model won’t help)', async () => {
    sdk.mockRejectedValueOnce(busy(429)).mockResolvedValue(OK);
    const result = await run('flash', 'Hi', {}, vi.fn());

    expect(modelsCalled()).toEqual([FLASH[0], FLASH[1]]);
    expect(result.usedFallback).toBe(true);
  });

  it('works through every Flash model before reaching Flash-Lite', async () => {
    sdk.mockImplementation(async ({ model }: Call) => {
      if (!model.includes('flash-lite')) throw busy(429);
      return OK;
    });
    const result = await run('flash', 'Hi', {}, vi.fn());

    expect(result).toEqual({ response: OK, modelUsed: 'flashLite', usedFallback: true });
    expect(modelsCalled()).toEqual(FLASH.slice(0, FIRST_LITE_IN_FLASH + 1));
  });

  it('throws the last error when every model fails', async () => {
    sdk.mockRejectedValue(busy(429));
    await expect(run('flashLite', 'Hi', {}, vi.fn())).rejects.toBeInstanceOf(ApiError);
    expect(modelsCalled()).toEqual(LITE);
  });

  it.each([
    ['a bad request (400)', busy(400)],
    ['a retired model (404)', busy(404)],
    ['a network failure', new TypeError('fetch failed')],
  ])('doesn’t retry or move on after %s', async (_name, error) => {
    sdk.mockRejectedValue(error);
    await expect(run('flash', 'Hi', {}, vi.fn())).rejects.toBe(error);
    expect(sdk).toHaveBeenCalledTimes(1);
  });

  it('reports every attempt that got no reply, for the usage log', async () => {
    sdk.mockRejectedValueOnce(busy(503)).mockRejectedValueOnce(busy(503)).mockRejectedValueOnce(busy(429)).mockResolvedValue(OK);
    const events = vi.fn();
    await run('flash', 'Hi', {}, events);

    const failed = events.mock.calls.map(([e]) => e).filter((e) => e.type === 'failed');
    expect(failed).toEqual([
      { type: 'failed', model: FLASH[0], status: 503 },
      { type: 'failed', model: FLASH[0], status: 503 },
      { type: 'failed', model: FLASH[1], status: 429 },
    ]);
  });

  it('logs retries and fallbacks to the console by default', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sdk.mockRejectedValueOnce(busy(503)).mockRejectedValueOnce(busy(503)).mockResolvedValue(OK);
    await run('flash', 'Hi');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('retrying in 1s'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`falling back to ${FLASH[1]}`));
  });
});

describe('cooldown', () => {
  it('skips a model for a while after it fails, then tries it again', async () => {
    sdk.mockImplementation(async ({ model }: Call) => {
      if (model === FLASH[0]) throw busy(429);
      return OK;
    });
    const firstModelCalls = () => modelsCalled().filter((model: string) => model === FLASH[0]).length;

    await run('flash', 'first');
    expect(firstModelCalls()).toBe(1);

    const second = await run('flash', 'second');
    expect(second.usedFallback).toBe(true);
    expect(firstModelCalls()).toBe(1); // not tried again

    vi.advanceTimersByTime(MODEL_COOLDOWN_MS);
    await run('flash', 'third');
    expect(firstModelCalls()).toBe(2); // cooldown over: it gets another chance
  });

  it('still tries a cooling model, last, when the others fail', async () => {
    sdk.mockRejectedValueOnce(busy(429)).mockResolvedValue(OK);
    await run('flashLite', 'first'); // the first model fails and starts cooling

    sdk.mockClear();
    sdk.mockImplementation(async ({ model }: Call) => {
      if (model === LITE[0]) return OK;
      throw busy(429);
    });
    const result = await run('flashLite', 'second');

    expect(result.response).toBe(OK);
    expect(modelsCalled()).toEqual([...LITE.slice(1), LITE[0]]);
  });

  it('tries the whole list in order when every model is cooling down', async () => {
    sdk.mockRejectedValue(busy(429));
    await run('flashLite', 'first').catch(() => {});

    sdk.mockClear();
    sdk.mockResolvedValue(OK);
    const result = await run('flashLite', 'second');
    expect(result.response).toBe(OK);
    expect(modelsCalled()).toEqual([LITE[0]]);
  });
});

describe('timeouts and time budget', () => {
  it('gives up on a hung model and moves on without retrying it', async () => {
    sdk.mockImplementation((call: Call) => (call.model === LITE[0] ? hang(call) : Promise.resolve(OK)));
    const events = vi.fn();

    const result = await run('flashLite', 'Hello', {}, events);

    expect(result).toEqual({ response: OK, modelUsed: 'flashLite', usedFallback: true });
    expect(modelsCalled()).toEqual([LITE[0], LITE[1]]);
    expect(events).toHaveBeenCalledWith({ type: 'fallback', from: LITE[0], to: LITE[1], status: 408 });
  });

  it('saves time for Flash-Lite when a Flash model hangs', async () => {
    sdk.mockImplementation((call: Call) => (call.model.includes('flash-lite') ? Promise.resolve(OK) : hang(call)));

    const result = await run('flash', 'Hello', {}, vi.fn());

    expect(result.modelUsed).toBe('flashLite');
    // Only one Flash model fits before Lite's reserved time, and the whole thing stays inside the budget
    expect(modelsCalled()).toEqual([FLASH[0], LITE[0]]);
    expect(CALL_TIMEOUT_MS.flash + CALL_TIMEOUT_MS.flashLite).toBeLessThanOrEqual(GENERATE_BUDGET_MS);
  });

  it('stops trying models once the budget runs out, inside the browser’s 60 s limit', async () => {
    sdk.mockImplementation(hang);
    const started = Date.now();

    await expect(run('flashLite', 'Hello', {}, vi.fn())).rejects.toMatchObject({ status: 408 });
    expect(Date.now() - started).toBeLessThanOrEqual(GENERATE_BUDGET_MS);
    expect(GENERATE_BUDGET_MS).toBeLessThan(60_000);
  });
});

describe('pilot request limits', () => {
  const stillHere = () => new AbortController().signal;

  // Calls aiRequestBudget with a hand-made response, and runs `inside` as the route
  function inRequest(inside: () => Promise<unknown>, { finished = false } = {}) {
    const res = Object.assign(new EventEmitter(), { writableFinished: finished });
    let reply: Promise<unknown> = Promise.resolve();
    aiRequestBudget({} as Request, res as unknown as Response, (() => {
      reply = inside();
    }) as NextFunction);
    reply.catch(() => {}); // checked by the caller
    return { reply, leave: () => res.emit('close') };
  }

  it('shares one time limit across every generate() in a request', async () => {
    sdk.mockImplementation(hang);
    const started = Date.now();
    const both = runWithRequestBudget(stillHere(), async () => {
      await generate('flashLite', 'first', {}, vi.fn()).catch(() => {});
      return generate('flashLite', 'second', {}, vi.fn());
    });
    both.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(both).rejects.toMatchObject({ status: 408 });
    // Each generate() alone could take up to GENERATE_BUDGET_MS; together they stop at the request's limit
    expect(Date.now() - started).toBeLessThanOrEqual(REQUEST_BUDGET_MS);
    expect(REQUEST_BUDGET_MS).toBeLessThan(60_000);
  });

  it('doesn’t start a model once the request is out of time', async () => {
    sdk.mockResolvedValue(OK);
    const late = runWithRequestBudget(stillHere(), async () => {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_BUDGET_MS));
      return generate('flashLite', 'Hi', {}, vi.fn());
    });
    late.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(late).rejects.toMatchObject({ status: 408 });
    expect(sdk).not.toHaveBeenCalled();
  });

  it('doesn’t hold a call cut short by the time limit against its model', async () => {
    sdk.mockImplementation(hang);
    const cut = runWithRequestBudget(stillHere(), async () => {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_BUDGET_MS - 1000));
      return generate('flashLite', 'Hi', {}, vi.fn());
    });
    cut.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(cut).rejects.toMatchObject({ status: 408 });

    sdk.mockClear();
    sdk.mockResolvedValue(OK);
    await run('flashLite', 'next', {}, vi.fn());
    expect(modelsCalled()).toEqual([LITE[0]]); // still first in line, not cooling
  });

  it('stops straight away when the pilot leaves, without blaming the model', async () => {
    sdk.mockImplementation(hang);
    const { reply, leave } = inRequest(() => generate('flashLite', 'Hi', {}, vi.fn()));
    await vi.advanceTimersByTimeAsync(1000);
    leave();

    await expect(reply).rejects.toBeInstanceOf(PilotLeftError);
    expect(modelsCalled()).toEqual([LITE[0]]); // no other model tried

    sdk.mockClear();
    sdk.mockResolvedValue(OK);
    await run('flashLite', 'next', {}, vi.fn());
    expect(modelsCalled()).toEqual([LITE[0]]); // not put into cooldown
  });

  it('carries on normally once the reply has been sent', async () => {
    sdk.mockResolvedValue(OK);
    const { reply, leave } = inRequest(async () => {
      await Promise.resolve(); // the route runs straight away, before `leave` exists
      leave(); // 'close' after a finished reply
      return generate('flashLite', 'Hi', {}, vi.fn());
    }, { finished: true });
    await vi.runAllTimersAsync();

    await expect(reply).resolves.toMatchObject({ response: OK });
  });
});
