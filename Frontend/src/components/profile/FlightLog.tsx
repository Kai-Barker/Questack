import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { FlightLogDay, PilotProfile } from '../../types/profile';
import Panel from '../ui/Panel';

// GitHub-style activity heatmap: one square per day for the last 26 weeks,
// Monday at the top of each column and the newest week on the right. The
// brighter the square, the more objectives were cleared that day.
//
// The grid is a single tab stop: arrow keys move between days (left/right by
// week, up/down by day) and the focused day is announced. Hovering or tapping a
// day shows the same label. A hidden table gives screen readers weekly totals.

// Brightness levels: none, 1, 2-3, 4-5, 6+ objectives
const LEVEL_CLASSES = ['bg-line', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent'];

function levelOf(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// Dates are calendar days (YYYY-MM-DD), so they're read and shown in UTC to
// stop the local timezone shifting them by a day
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

function describe(day: FlightLogDay): string {
  const objectives =
    day.count === 0 ? 'No objectives' : `${day.count} ${day.count === 1 ? 'objective' : 'objectives'}`;
  return `${objectives} cleared · ${dayFormat.format(toDate(day.date))}`;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function chunkWeeks(days: FlightLogDay[]): FlightLogDay[][] {
  const weeks: FlightLogDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

// Month names above the first column of each month. The very first column is
// skipped when the next label is too close to fit beside it.
function monthLabels(weeks: FlightLogDay[][]) {
  const labels: { column: number; text: string }[] = [];
  weeks.forEach((week, column) => {
    const month = toDate(week[0]?.date ?? '').getUTCMonth();
    const previous = column > 0 ? toDate(weeks[column - 1]?.[0]?.date ?? '').getUTCMonth() : -1;
    if (month !== previous) labels.push({ column, text: monthFormat.format(toDate(week[0]?.date ?? '')) });
  });
  if (labels.length > 1 && labels[0]?.column === 0 && (labels[1]?.column ?? 0) < 3) labels.shift();
  return labels;
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <dt className="font-display text-xs tracking-[0.2em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl font-semibold">
        {value}
        {unit && <span className="ml-1.5 text-sm font-normal text-muted">{unit}</span>}
      </dd>
    </div>
  );
}

export default function FlightLog({ flightLog }: { flightLog: PilotProfile['flightLog'] }) {
  const { days, activeDays, currentStreak, longestStreak } = flightLog;
  // Layout only changes with the data, not on every hover
  const weeks = useMemo(() => chunkWeeks(days), [days]);
  const months = useMemo(() => monthLabels(weeks), [weeks]);
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const summaryId = useId();
  const activeDay = active === null ? undefined : days[active];

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    const current = active ?? days.length - 1;
    let next: number | undefined;
    if (event.key in steps) next = current + (steps[event.key] ?? 0);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = days.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(days.length - 1, Math.max(0, next)));
  };

  const dayDays = (n: number) => (n === 1 ? 'day' : 'days');

  return (
    <Panel label="Flight log">
      <p id={summaryId} className="mt-1 text-xs text-muted">
        {activeDays} active {dayDays(activeDays)} in the last {weeks.length} weeks
      </p>

      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div
            role="group"
            tabIndex={0}
            aria-label="Daily activity. Use the arrow keys to move between days."
            aria-describedby={summaryId}
            onKeyDown={move}
            onFocus={() => {
              setFocused(true);
              setActive((current) => current ?? days.length - 1);
            }}
            onBlur={() => {
              setFocused(false);
              setActive(null);
            }}
            // Clear the hover label even if the grid has focus (e.g. after a click);
            // the arrow keys pick up again from the last day
            onPointerLeave={() => setActive(null)}
            className="grid w-fit max-w-full gap-[3px] rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
            style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1.375rem))` }}
          >
            {/* Month labels along the top */}
            {months.map((label) => (
              <span
                key={label.column}
                aria-hidden="true"
                className="pb-1 font-display text-[0.65rem] tracking-[0.15em] whitespace-nowrap text-muted uppercase"
                style={{ gridRow: 1, gridColumn: label.column + 2 }}
              >
                {label.text}
              </span>
            ))}

            {/* Day labels down the side */}
            {DAY_LABELS.map((text, row) => (
              <span
                key={row}
                aria-hidden="true"
                className="pr-1.5 font-display text-[0.65rem] leading-none tracking-[0.1em] text-muted uppercase self-center"
                style={{ gridRow: row + 2, gridColumn: 1 }}
              >
                {text}
              </span>
            ))}

            {days.map((day, i) => {
              const column = Math.floor(i / 7);
              const isActive = i === active;
              // Keep the label inside the panel near either edge
              const anchor =
                column < 5 ? 'left-0' : column > weeks.length - 6 ? 'right-0' : 'left-1/2 -translate-x-1/2';
              return (
                <span
                  key={day.date}
                  aria-hidden="true"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  className={`relative aspect-square rounded-[2px] ${LEVEL_CLASSES[levelOf(day.count)]} ${
                    isActive ? 'outline-2 outline-offset-1 outline-accent-soft' : ''
                  }`}
                  style={{ gridRow: (i % 7) + 2, gridColumn: column + 2 }}
                >
                  {isActive && (
                    <span
                      className={`pointer-events-none absolute bottom-[calc(100%+6px)] z-10 border border-line-bright bg-space-950 px-2 py-1 text-xs whitespace-nowrap text-slate-100 ${anchor}`}
                    >
                      <strong className="font-semibold">
                        {day.count} {day.count === 1 ? 'objective' : 'objectives'}
                      </strong>
                      <span className="text-muted"> · {dayFormat.format(toDate(day.date))}</span>
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Announces the day under the keyboard cursor */}
          <p aria-live="polite" className="sr-only">
            {focused && activeDay ? describe(activeDay) : ''}
          </p>

          <div aria-hidden="true" className="mt-3 flex items-center justify-end gap-1.5 text-[0.65rem] text-muted">
            <span className="mr-1 font-display tracking-[0.15em] uppercase">Less</span>
            {LEVEL_CLASSES.map((level) => (
              <span key={level} className={`size-2.5 rounded-[2px] ${level}`} />
            ))}
            <span className="ml-1 font-display tracking-[0.15em] uppercase">More</span>
          </div>

          <table className="sr-only">
            <caption>Objectives cleared each week</caption>
            <thead>
              <tr>
                <th scope="col">Week of</th>
                <th scope="col">Objectives cleared</th>
                <th scope="col">Active days</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]?.date}>
                  <th scope="row">{weekFormat.format(toDate(week[0]?.date ?? ''))}</th>
                  <td>{week.reduce((sum, day) => sum + day.count, 0)}</td>
                  <td>{week.filter((day) => day.count > 0).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="grid shrink-0 grid-cols-3 gap-4 md:grid-cols-1 md:gap-5 md:pr-2">
          <Stat label="Active days" value={activeDays} />
          <Stat label="Current streak" value={currentStreak} unit={dayDays(currentStreak)} />
          <Stat label="Longest streak" value={longestStreak} unit={dayDays(longestStreak)} />
        </dl>
      </div>
    </Panel>
  );
}
