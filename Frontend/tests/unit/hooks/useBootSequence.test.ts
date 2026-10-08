import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPTIONS, HOLD_MS, LIFT_MS, MIN_LOAD_MS, TIMEOUT_MS } from '../../../src/config/splash';
import type { AuthStatus } from '../../../src/context/AuthContext';
import { useBootSequence } from '../../../src/hooks/useBootSequence';
import { getHealth } from '../../../src/services/healthService';
import type { HealthResponse } from '../../../src/types/health';

// The splash screen's boot sequence, on a fake clock. The health check is
// replaced so each test decides what the backend says, and when.
vi.mock('../../../src/services/healthService', () => ({ getHealth: vi.fn() }));

const OK: HealthResponse = { status: 'ok', database: 'connected', timestamp: 'now' };
const NO_DB: HealthResponse = { status: 'degraded', database: 'unreachable', timestamp: 'now' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  // Images "load" straight away (jsdom never loads them)
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

function boot(status: AuthStatus = 'anonymous') {
  return renderHook(({ status }) => useBootSequence(status), { initialProps: { status } });
}

describe('useBootSequence', () => {
  it('holds the logo, lifts it, loads, then is ready after the minimum time', async () => {
    vi.mocked(getHealth).mockResolvedValue(OK);
    const { result } = boot();

    expect(result.current.phase).toBe('hold');
    expect(result.current.caption).toBe(CAPTIONS[0]);

    await advance(HOLD_MS);
    expect(result.current.phase).toBe('lifting');

    await advance(LIFT_MS);
    expect(result.current.phase).toBe('loading');
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.progress).toBeLessThan(1);

    await advance(MIN_LOAD_MS);
    expect(result.current.phase).toBe('ready');
    expect(result.current.progress).toBe(1);
    expect(result.current.caption).toBe(CAPTIONS.at(-1));
  });

  it('asks for the health check with the splash timeout', () => {
    vi.mocked(getHealth).mockResolvedValue(OK);
    boot();
    expect(getHealth).toHaveBeenCalledWith(TIMEOUT_MS);
  });

  it('waits for the session check before it’s ready', async () => {
    vi.mocked(getHealth).mockResolvedValue(OK);
    const { result, rerender } = boot('loading');

    await advance(HOLD_MS + MIN_LOAD_MS + 2000);
    expect(result.current.phase).toBe('loading');

    rerender({ status: 'authenticated' });
    await advance(100);
    expect(result.current.phase).toBe('ready');
  });

  it('reports the database when the backend answers without it', async () => {
    vi.mocked(getHealth).mockResolvedValue(NO_DB);
    const { result } = boot();

    // Even an instant failure waits for the lift to finish
    await advance(HOLD_MS);
    expect(result.current.phase).not.toBe('error');

    await advance(LIFT_MS);
    expect(result.current).toMatchObject({ phase: 'error', diagnostic: 'database' });
  });

  it('reports the backend when it can’t be reached', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('Network Error'));
    const { result } = boot();

    await advance(HOLD_MS + LIFT_MS);
    expect(result.current).toMatchObject({ phase: 'error', diagnostic: 'backend' });
  });

  it('gives up on a backend that never answers', async () => {
    vi.mocked(getHealth).mockReturnValue(new Promise(() => {}));
    const { result } = boot();

    await advance(TIMEOUT_MS - 1);
    expect(result.current.phase).toBe('loading');
    // The timeout fires, then shows the error on the next tick
    await advance(10);
    expect(result.current).toMatchObject({ phase: 'error', diagnostic: 'backend' });
  });

  it('retry clears the error and boots again, skipping the hold and lift', async () => {
    vi.mocked(getHealth).mockRejectedValueOnce(new Error('down')).mockResolvedValue(OK);
    const { result } = boot();
    await advance(HOLD_MS + LIFT_MS);
    expect(result.current.phase).toBe('error');

    act(() => result.current.retry());
    expect(result.current).toMatchObject({ phase: 'loading', diagnostic: null, progress: 0 });
    expect(getHealth).toHaveBeenCalledTimes(2);

    await advance(MIN_LOAD_MS);
    expect(result.current.phase).toBe('ready');
  });
});
