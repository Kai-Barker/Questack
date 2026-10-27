import type { ObjectiveStatus } from '../../hooks/useQuestSession';
import ChamferFrame from '../ui/ChamferFrame';
import ChevronShape, { type ChevronKind } from '../ui/ChevronShape';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';

// Steps are chevrons (see ui/ChevronShape): cleared objectives point
// backwards (behind you); the rest point forwards.
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
                className={`group relative block h-9 min-w-14 outline-none disabled:cursor-not-allowed ${
                  isViewing ? 'sm:min-w-32' : 'min-[1800px]:min-w-32'
                }`}
              >
                {/* Keyboard focus: a thicker white outline in the chevron shape */}
                <ChevronShape
                  kind={kind}
                  className={`${style.shape} group-focus-visible:stroke-slate-100 group-focus-visible:[stroke-width:2]`}
                />
                <span
                  className={`relative block font-display text-xs font-semibold tracking-[0.2em] whitespace-nowrap uppercase ${
                    kind === 'backward' ? 'pr-6 pl-7' : kind === 'forwardFirst' ? 'pr-6 pl-5' : 'pr-6 pl-7'
                  } ${style.text}`}
                >
                  {String(i + 1).padStart(2, '0')}
                  {/* Labels are dropped where they won't fit beside the rank and XP (only the
                      viewed step keeps one below 1800px, none on phones); aria-label still says it */}
                  {label && (
                    <span className={isViewing ? 'hidden sm:inline' : 'hidden min-[1800px]:inline'}> {label}</span>
                  )}
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
