import { useEffect, useState } from 'react';
import { FIRST_LINES, LOADING_LINE_MS, LOADING_LINES, type WaitKind } from '../config/loadingLines';

// The line to show while waiting on the Ship's AI: first one that says what's
// happening, then a new line from LOADING_LINES every few seconds, in a fresh
// random order each wait so they don't repeat the same way. null when idle.
export function useLoadingLine(kind: WaitKind | null): string | null {
  const [wait, setWait] = useState<{ kind: WaitKind; order: string[]; step: number } | null>(null);

  // A new wait (or a different kind of wait) starts from its first line.
  // Adjusted during render, as React recommends for state that follows a prop.
  if (kind !== (wait?.kind ?? null)) {
    setWait(kind === null ? null : { kind, order: shuffled(LOADING_LINES), step: 0 });
  }

  useEffect(() => {
    if (kind === null) return;
    const timer = setInterval(() => setWait((w) => (w ? { ...w, step: w.step + 1 } : w)), LOADING_LINE_MS);
    return () => clearInterval(timer);
  }, [kind]);

  if (!wait || kind === null) return null;
  return wait.step === 0 ? FIRST_LINES[wait.kind] : wait.order[(wait.step - 1) % wait.order.length]!;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
