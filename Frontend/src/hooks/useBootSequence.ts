import { useCallback, useEffect, useRef, useState } from 'react';
import galaxyTexture from '../assets/GalaxyTexture.webp';
import logo from '../assets/QuestackLogoTemp.png';
import { CAPTIONS, HOLD_MS, LIFT_MS, MIN_LOAD_MS, TIMEOUT_MS } from '../config/splash';
import type { AuthStatus } from '../context/AuthContext';
import { getHealth } from '../services/healthService';

// Drives the splash screen: the timed phases (see config/splash.ts) and the
// real loading behind the bar.
//
// Loading tasks, all started the moment the app opens:
//   1. servers: the health check (is the backend up, and can it reach the database?)
//   2. session: AuthProvider's /auth/me check settling (signed in or not)
//   3. assets:  the background, the logo and the fonts
//
// The bar shows the lower of "time elapsed" and "tasks done", so it never
// finishes before the minimum time and never claims more than has loaded.

export type BootPhase = 'hold' | 'lifting' | 'loading' | 'ready' | 'error';
export type BootDiagnostic = 'backend' | 'database';

const TASK_COUNT = 3;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    // A missing decoration shouldn't block the app, so errors count as done too
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function preloadAssets(): Promise<void> {
  return Promise.all([loadImage(galaxyTexture), loadImage(logo), document.fonts.ready]).then(() => undefined);
}

export function useBootSequence(authStatus: AuthStatus) {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<BootPhase>('hold');
  const [progress, setProgress] = useState(0);
  const [diagnostic, setDiagnostic] = useState<BootDiagnostic | null>(null);

  // Read inside the animation loop, so kept in a ref
  const sessionDone = useRef(false);
  useEffect(() => {
    sessionDone.current = authStatus !== 'loading';
  }, [authStatus]);

  useEffect(() => {
    let stopped = false;
    let frame = 0;
    const timers: number[] = []; // loading work: cleared on success or failure
    const phaseTimers: number[] = []; // the hold and lift: always play out
    const start = performance.now();
    const firstRun = attempt === 0;
    // A retry skips the hold and the lift (the hero is already up), but the
    // bar still runs for the rest of the minimum time
    const liftStart = firstRun ? start + HOLD_MS : start - LIFT_MS;
    let serverDone = false;
    let assetsDone = false;

    let errorTimer = 0;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      timers.forEach((t) => clearTimeout(t));
    };
    const fail = (reason: BootDiagnostic) => {
      if (stopped) return;
      stop();
      // Even an instant failure waits for the lift to finish, so the error
      // appears in the space made for it rather than cutting the animation off
      const wait = Math.max(0, liftStart + LIFT_MS - performance.now());
      errorTimer = window.setTimeout(() => {
        setDiagnostic(reason);
        setPhase('error');
      }, wait);
    };

    if (firstRun) {
      phaseTimers.push(window.setTimeout(() => setPhase('lifting'), HOLD_MS));
      phaseTimers.push(window.setTimeout(() => setPhase((p) => (p === 'lifting' ? 'loading' : p)), HOLD_MS + LIFT_MS));
    }

    getHealth(TIMEOUT_MS).then(
      (health) => {
        if (health.database === 'connected') serverDone = true;
        else fail('database'); // the backend answered, but can't reach the database
      },
      () => fail('backend'), // no answer at all
    );
    preloadAssets().then(() => {
      assetsDone = true;
    });
    // Anything still unfinished after the limit: treat it as the servers not answering
    timers.push(window.setTimeout(() => fail('backend'), TIMEOUT_MS));

    const tick = (now: number) => {
      if (stopped) return;
      const done = Number(serverDone) + Number(assetsDone) + Number(sessionDone.current);
      const timeShare = clamp01((now - liftStart) / MIN_LOAD_MS);
      // While a task is still running, creep part of the way into its share
      const creep = done < TASK_COUNT ? 0.8 * clamp01((now - start) / 4000) : 0;
      const taskShare = Math.min(1, (done + creep) / TASK_COUNT);
      const value = Math.min(timeShare, taskShare);
      setProgress(value);

      if (value >= 1) {
        stop();
        setPhase('ready');
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      stop();
      clearTimeout(errorTimer);
      phaseTimers.forEach((t) => clearTimeout(t));
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setDiagnostic(null);
    setProgress(0);
    setPhase('loading');
    setAttempt((n) => n + 1);
  }, []);

  const caption = CAPTIONS[Math.min(CAPTIONS.length - 1, Math.floor(progress * CAPTIONS.length))] ?? CAPTIONS[0] ?? '';

  return { phase, progress, caption, diagnostic, retry };
}
