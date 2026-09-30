import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// An SVG chevron that fills its (relatively positioned) parent, drawn to line
// up with the screen's physical pixels so the outline stays sharp:
// - The slanted edges are exactly 45 degrees. Other angles can't sit evenly on
//   the pixel grid and anti-alias into uneven "stairs".
// - Corners are snapped to whole device pixels and the stroke is a whole
//   number of device pixels wide. With Windows display scaling (e.g. 125%),
//   1 CSS pixel is 1.25 screen pixels, so CSS-pixel positions land mid-pixel.
//
// `inflate` grows the shape outward by that many CSS pixels (used for hover).
// Only the drawing grows, never the element, so nothing around it moves, and
// each frame is still snapped to whole pixels.
export type ChevronKind = 'forwardFirst' | 'forward' | 'backward';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  dpr: number;
}

function chevronGeometry(kind: ChevronKind, box: Box, inflate: number) {
  const { dpr } = box;
  const stroke = Math.max(1, Math.round(dpr)); // in device pixels
  const half = stroke / 2;

  // Work in device pixels, relative to the page, then snap the edges
  const left = Math.round((box.left - inflate) * dpr) + half;
  const right = Math.round((box.left + box.width + inflate) * dpr) - half;
  const top = Math.round((box.top - inflate) * dpr) + half;
  let bottom = Math.round((box.top + box.height + inflate) * dpr) - half;
  // Even height between stroke centres puts the tips on whole pixels too
  if ((bottom - top) % 2 !== 0) bottom -= 1;
  const mid = (top + bottom) / 2;
  const depth = (bottom - top) / 2; // 45 degree edges

  const corners: [number, number][] =
    kind === 'backward'
      ? [[left + depth, top], [right, top], [right - depth, mid], [right, bottom], [left + depth, bottom], [left, mid]]
      : kind === 'forwardFirst'
        ? [[left, top], [right - depth, top], [right, mid], [right - depth, bottom], [left, bottom]]
        : [[left, top], [right - depth, top], [right, mid], [right - depth, bottom], [left, bottom], [left + depth, mid]];

  // Back to CSS pixels, relative to the SVG's own top-left corner
  const toCss = (x: number, y: number) =>
    `${((x - box.left * dpr) / dpr).toFixed(3)},${((y - box.top * dpr) / dpr).toFixed(3)}`;
  return { points: corners.map(([x, y]) => toCss(x, y)).join(' '), strokeWidth: stroke / dpr };
}

const INFLATE_MS = 150;

// Eases the drawn inflation towards the target, or jumps with reduced motion
function useAnimatedInflate(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = reduceMotion ? 1 : Math.min(1, (now - start) / INFLATE_MS);
      const next = from + (target - from) * (1 - (1 - t) ** 2);
      valueRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

interface ChevronShapeProps {
  kind: ChevronKind;
  className: string; // fill-* / stroke-* classes
  inflate?: number;
}

export default function ChevronShape({ kind, className, inflate = 0 }: ChevronShapeProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const drawnInflate = useAnimatedInflate(inflate);

  const measure = useCallback(() => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const next: Box = {
      left: r.left + window.scrollX,
      top: r.top + window.scrollY,
      width: r.width,
      height: r.height,
      dpr: window.devicePixelRatio || 1,
    };
    // Only update when something moved, so this can run after every render
    setBox((prev) => (prev && (Object.keys(next) as (keyof Box)[]).every((k) => prev[k] === next[k]) ? prev : next));
  }, []);

  // Re-measure when the shape resizes, and on window resize (which also fires
  // when the browser zoom or display scaling changes)
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // ...when the pixel density changes (moving the window to another screen,
  // or changing display scaling, doesn't always fire a resize)...
  const dpr = box?.dpr;
  useLayoutEffect(() => {
    if (dpr === undefined) return;
    const media = window.matchMedia(`(resolution: ${dpr}dppx)`);
    media.addEventListener('change', measure);
    return () => media.removeEventListener('change', measure);
  }, [dpr, measure]);

  // ...and after every render, because a neighbour changing width can move
  // this shape without resizing it
  useLayoutEffect(measure);

  const geometry = box && chevronGeometry(kind, box, drawnInflate);

  return (
    <svg ref={ref} aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
      {geometry && (
        <polygon
          points={geometry.points}
          strokeWidth={geometry.strokeWidth}
          strokeLinejoin="miter"
          className={`transition-colors ${className}`}
        />
      )}
    </svg>
  );
}
