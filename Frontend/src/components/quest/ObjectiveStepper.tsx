import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ObjectiveStatus } from '../../hooks/useQuestSession';
import ChamferFrame from '../ui/ChamferFrame';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';

// Each step is an SVG chevron, drawn to line up with the screen's physical
// pixels so the outline stays sharp:
// - The slanted edges are exactly 45 degrees. Other angles can't sit evenly on
//   the pixel grid and anti-alias into uneven "stairs".
// - Corners are snapped to whole device pixels and the stroke is a whole
//   number of device pixels wide. With Windows display scaling (e.g. 125%),
//   1 CSS pixel is 1.25 screen pixels, so CSS-pixel positions land mid-pixel.
// Cleared objectives point backwards (behind you); the rest point forwards.
type ChevronKind = 'forwardFirst' | 'forward' | 'backward';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  dpr: number;
}

function chevronGeometry(kind: ChevronKind, box: Box) {
  const { dpr } = box;
  const stroke = Math.max(1, Math.round(dpr)); // in device pixels
  const half = stroke / 2;

  // Work in device pixels, relative to the page, then snap the edges
  const left = Math.round(box.left * dpr) + half;
  const right = Math.round((box.left + box.width) * dpr) - half;
  const top = Math.round(box.top * dpr) + half;
  let bottom = Math.round((box.top + box.height) * dpr) - half;
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
  const toCss = (x: number, y: number) => `${((x - box.left * dpr) / dpr).toFixed(3)},${((y - box.top * dpr) / dpr).toFixed(3)}`;
  return { points: corners.map(([x, y]) => toCss(x, y)).join(' '), strokeWidth: stroke / dpr };
}

function ChevronShape({ kind, className }: { kind: ChevronKind; className: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<Box | null>(null);

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

  // Re-measure when the step resizes, and on window resize (which also fires
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

  // ...and after every render, because a neighbouring step's label changing
  // width moves this one without resizing it
  useLayoutEffect(measure);

  const geometry = box && chevronGeometry(kind, box);

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

// The step being viewed is solid cyan ("you are here"). The step being worked
// on, when you're looking back at another one, is a cyan outline instead.
function stepStyle(status: ObjectiveStatus, viewing: boolean): { shape: string; text: string } {
  if (viewing) return { shape: 'fill-accent stroke-accent', text: 'text-space-950' };
  if (status === 'current') return { shape: 'fill-space-950 stroke-accent', text: 'text-accent' };
  if (status === 'cleared') {
    return { shape: 'fill-[#243452] stroke-[#3a4c70] group-hover:stroke-[#6a80ab]', text: 'text-slate-300' };
  }
  return { shape: 'fill-space-950 stroke-line-bright', text: 'text-slate-400' };
}

interface ObjectiveStepperProps {
  statuses: ObjectiveStatus[];
  viewing: number;
  onView: (index: number) => void;
}

// Top bar on the Quest screen: one chevron per objective. Cleared objectives
// can be revisited; locked ones can't be opened yet.
export default function ObjectiveStepper({ statuses, viewing, onView }: ObjectiveStepperProps) {
  const canView = (i: number) => statuses[i] !== undefined && statuses[i] !== 'locked';

  const arrow = (direction: -1 | 1) => {
    const target = viewing + direction;
    const enabled = canView(target);
    return (
      <button
        type="button"
        aria-label={direction === -1 ? 'Previous objective' : 'Next objective'}
        disabled={!enabled}
        onClick={() => onView(target)}
        className="group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChamferFrame
          as="span"
          size="sm"
          grow={enabled ? 'sm' : undefined}
          borderClassName="bg-line group-hover:bg-line-bright"
          innerClassName="grid size-8 place-items-center bg-space-950 text-slate-300"
        >
          {direction === -1 ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </ChamferFrame>
      </button>
    );
  };

  return (
    <nav aria-label="Quest objectives" className="flex items-center gap-2">
      {arrow(-1)}
      <ol className="flex items-center gap-1">
        {statuses.map((status, i) => {
          const isViewing = i === viewing;
          const kind: ChevronKind = status === 'cleared' ? 'backward' : i === 0 ? 'forwardFirst' : 'forward';
          const style = stepStyle(status, isViewing);
          const label = status === 'cleared' ? 'Cleared' : status === 'current' ? 'Current' : '';

          return (
            <li key={i}>
              <button
                type="button"
                disabled={status === 'locked'}
                aria-current={isViewing ? 'step' : undefined}
                aria-label={`Objective ${i + 1}${label ? `, ${label.toLowerCase()}` : ', locked'}`}
                onClick={() => onView(i)}
                className="group relative block h-9 min-w-14 outline-none disabled:cursor-not-allowed sm:min-w-32"
              >
                {/* Keyboard focus: a thicker white outline in the chevron shape */}
                <ChevronShape
                  kind={kind}
                  className={`${style.shape} group-focus-visible:stroke-slate-100 group-focus-visible:[stroke-width:2]`}
                />
                <span
                  className={`relative block font-display text-xs font-semibold tracking-[0.2em] uppercase ${
                    kind === 'backward' ? 'pr-6 pl-7' : kind === 'forwardFirst' ? 'pr-6 pl-5' : 'pr-6 pl-7'
                  } ${style.text}`}
                >
                  {String(i + 1).padStart(2, '0')}
                  {/* Labels are dropped on small screens so the stepper fits; aria-label still says it */}
                  {label && <span className="hidden sm:inline"> {label}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {arrow(1)}
    </nav>
  );
}
