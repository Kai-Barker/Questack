import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { XpWeek } from '../../types/profile';
import { formatNumber } from '../../utils/format';
import Panel from '../ui/Panel';

// XP earned each week, as a single line. Drawn at the container's real pixel
// width (not a stretched viewBox) so text and the 2px line stay crisp.
// Hover or arrow keys move a crosshair between weeks; a hidden table lists
// every value for screen readers.

const HEIGHT = 190;
const MARGIN = { top: 26, right: 28, bottom: 28, left: 44 };
const MIN_LABEL_SPACING = 64; // px between week labels, so they never collide
const TICK_STEP = 500;

const weekFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekLabel = (iso: string) => weekFormat.format(new Date(`${iso}T00:00:00Z`));

// Tracks an element's width so the chart can be drawn at real pixel size
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export default function XpHistoryChart({ weeks }: { weeks: XpWeek[] }) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const summaryId = useId();

  const total = weeks.reduce((sum, week) => sum + week.xp, 0);
  const yMax = Math.max(TICK_STEP, Math.ceil(Math.max(...weeks.map((w) => w.xp)) / TICK_STEP) * TICK_STEP);
  const ticks = Array.from({ length: yMax / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  // Whole pixels, plus 0.5 for 1px lines, keep the hairlines sharp
  const x = (i: number) => Math.round(MARGIN.left + (weeks.length > 1 ? (i * plotWidth) / (weeks.length - 1) : 0));
  const y = (xp: number) => Math.round(MARGIN.top + plotHeight - (xp / yMax) * plotHeight);

  const line = weeks.map((week, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(week.xp)}`).join(' ');
  const area = `${line} L${x(weeks.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = weeks.length - 1;
  const lastWeek = weeks[last];
  // Label every nth week, counting back from this week, so labels never collide
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / (plotWidth / Math.max(1, last))));

  const nearest = (event: PointerEvent<HTMLDivElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const step = weeks.length > 1 ? plotWidth / (weeks.length - 1) : 1;
    const index = Math.round((event.clientX - left - MARGIN.left) / step);
    setActive(Math.min(last, Math.max(0, index)));
  };

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? last;
    const next =
      event.key === 'ArrowLeft' ? current - 1
      : event.key === 'ArrowRight' ? current + 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  };

  const activeWeek = active === null ? undefined : weeks[active];
  // Keep the readout inside the chart near either edge
  const readoutAnchor =
    active === null ? '' : active === 0 ? 'translate-x-0' : active === last ? '-translate-x-full' : '-translate-x-1/2';

  return (
    <Panel label="XP history">
      <p id={summaryId} className="mt-1 text-xs text-muted">
        {formatNumber(total)} XP earned in the last {weeks.length} weeks
      </p>

      <div
        ref={boxRef}
        role="group"
        tabIndex={0}
        aria-label="XP earned per week. Use the arrow keys to move between weeks."
        aria-describedby={summaryId}
        onPointerMove={nearest}
        onPointerDown={nearest}
        onPointerLeave={() => {
          if (!focused) setActive(null);
        }}
        onFocus={() => {
          setFocused(true);
          setActive((current) => current ?? last);
        }}
        onBlur={() => {
          setFocused(false);
          setActive(null);
        }}
        onKeyDown={move}
        className="relative mt-3 touch-pan-y outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          // Absolute, so the drawn width never holds the container open while it shrinks
          <svg width={width} height={HEIGHT} aria-hidden="true" className="absolute inset-0 block">
            <defs>
              <linearGradient id={`${summaryId}-wash`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.14" />
                <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Hairline gridlines on round values */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick) + 0.5}
                  y2={y(tick) + 0.5}
                  className="stroke-line"
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted font-mono text-[0.65rem] [font-variant-numeric:tabular-nums]"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            ))}

            {weeks.map((week, i) =>
              (last - i) % labelEvery !== 0 ? null : (
                <text
                  key={week.weekStart}
                  x={x(i)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted font-display text-[0.65rem] tracking-[0.1em] uppercase"
                >
                  {weekLabel(week.weekStart)}
                </text>
              ),
            )}

            <path d={area} fill={`url(#${summaryId}-wash)`} />
            <path d={line} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* Crosshair on the active week */}
            {activeWeek && active !== null && (
              <>
                <line
                  x1={x(active) + 0.5}
                  x2={x(active) + 0.5}
                  y1={MARGIN.top - 6}
                  y2={y(0)}
                  className="stroke-line-bright"
                  strokeWidth={1}
                />
                <circle cx={x(active)} cy={y(activeWeek.xp)} r={5} className="fill-accent stroke-panel" strokeWidth={2} />
              </>
            )}

            {/* This week: end dot and its value */}
            {lastWeek && (
              <>
                <circle cx={x(last)} cy={y(lastWeek.xp)} r={4.5} className="fill-accent stroke-panel" strokeWidth={2} />
                {active === null && (
                  <text
                    x={x(last)}
                    y={y(lastWeek.xp) - 12}
                    textAnchor="end"
                    className="fill-slate-100 font-display text-xs font-semibold"
                  >
                    {formatNumber(lastWeek.xp)} XP
                  </text>
                )}
              </>
            )}
          </svg>
        )}

        {activeWeek && active !== null && (
          <div
            className={`pointer-events-none absolute top-0 border border-line-bright bg-space-950 px-2 py-1 text-xs whitespace-nowrap ${readoutAnchor}`}
            style={{ left: x(active) }}
          >
            <strong className="font-semibold text-slate-100">{formatNumber(activeWeek.xp)} XP</strong>
            <span className="text-muted"> · week of {weekLabel(activeWeek.weekStart)}</span>
          </div>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {focused && activeWeek ? `${formatNumber(activeWeek.xp)} XP, week of ${weekLabel(activeWeek.weekStart)}` : ''}
      </p>

      <table className="sr-only">
        <caption>XP earned each week</caption>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col">XP</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <th scope="row">{weekLabel(week.weekStart)}</th>
              <td>{formatNumber(week.xp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
