import { useCallback, useState } from 'react';
import type { Layout } from 'react-resizable-panels';

// Resizable pane sizes, remembered per browser under `key` (the Quest screen
// and the decoder each keep their own). Storage can be blocked (private mode),
// so failures just fall back to the default sizes.
//
// The resizable Group re-applies its layout whenever these props change
// identity, which undid every resize, so the saved layout is read once on
// mount and the change handler is stable.
export function usePaneLayout(key: string) {
  const [defaultLayout] = useState<Layout | undefined>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      const valid =
        saved !== null && typeof saved === 'object' && Object.values(saved).every((v) => typeof v === 'number');
      return valid ? (saved as Layout) : undefined;
    } catch {
      return undefined;
    }
  });

  const onLayoutChanged = useCallback(
    (layout: Layout) => {
      try {
        localStorage.setItem(key, JSON.stringify(layout));
      } catch {
        // Not saved; the default sizes are used next time
      }
    },
    [key],
  );

  return { defaultLayout, onLayoutChanged };
}

// How far from a divider a drag still grabs it, for mouse and touch
export const RESIZE_TARGET = { coarse: 20, fine: 10 };
