import { useEffect, useId, useRef } from 'react';
import type { SectorSummary } from '../../types/dashboard';
import type { ProficiencyLevel } from '../../types/pilot';
import { percent } from '../../utils/progress';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import { CloseIcon } from '../ui/icons';

const ranks: ProficiencyLevel[] = ['cadet', 'pilot', 'commander'];

interface SectorPopoverProps {
  sector: SectorSummary;
  anchor: { left: number; top: number }; // % of the map box
  onClose: (returnFocus: boolean) => void;
}

// Details card that opens over the galaxy map when a sector wedge is selected.
// Closes on Escape, the × button, or a click anywhere outside it.
export default function SectorPopover({ sector, anchor, onClose }: SectorPopoverProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const cleared = percent(sector.questsCleared, sector.questsTotal);
  const enlisted = sector.proficiencyLevel !== undefined;

  // Move focus into the card so keyboard users land on its contents
  useEffect(() => {
    dialogRef.current?.focus();
  }, [sector.languageId]);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      // Clicks on wedges are handled by the wedges themselves (toggle or switch sector)
      if (dialogRef.current?.contains(target) || target.closest('[data-sector-wedge]')) return;
      onClose(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose(true);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="absolute z-10 w-60 -translate-x-1/2 -translate-y-1/2 shadow-xl shadow-black/50 outline-none"
      style={{
        // Keep the whole card inside the map box whichever wedge it points at
        left: `clamp(7.5rem, ${anchor.left}%, calc(100% - 7.5rem))`,
        top: `clamp(7.5rem, ${anchor.top}%, calc(100% - 7.5rem))`,
      }}
    >
      <ChamferFrame size="md" borderClassName="bg-accent/70" innerClassName="bg-panel p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 id={titleId} className="font-display text-base font-bold tracking-[0.15em] uppercase">
            {sector.displayName} Sector
          </h3>
          <button
            type="button"
            onClick={() => onClose(true)}
            aria-label="Close sector details"
            className="hover-grow rounded p-0.5 text-muted hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="text-xs text-muted">{sector.displayName}</p>

        <dl className="mt-3 space-y-1.5 font-display text-xs tracking-[0.15em] uppercase">
          <div className="flex gap-2 text-accent">
            <dt>Swarm cleared</dt>
            <dd className="font-semibold">{cleared}%</dd>
          </div>
          <div className="flex gap-2 text-slate-300">
            <dt>Quests cleared</dt>
            <dd className="font-semibold">
              {sector.questsCleared} / {sector.questsTotal}
            </dd>
          </div>
        </dl>

        <p className="mt-3 font-display text-[0.65rem] tracking-[0.15em] text-muted uppercase">Your rank in this sector</p>
        {enlisted ? (
          <ul className="mt-1.5 grid grid-cols-3 gap-1">
            {ranks.map((rank) => {
              const current = rank === sector.proficiencyLevel;
              return (
                <li key={rank} aria-current={current ? 'true' : undefined}>
                  <ChamferFrame
                    size="sm"
                    borderClassName={current ? 'bg-accent/70' : 'bg-line'}
                    innerClassName={`px-0.5 py-1 text-center font-display text-[0.6rem] font-semibold tracking-[0.02em] uppercase ${
                      current ? 'bg-accent-deep text-accent' : 'bg-panel text-muted'
                    }`}
                  >
                    {rank}
                    {current && <span className="sr-only"> (your rank)</span>}
                  </ChamferFrame>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-slate-300">Not enlisted yet</p>
        )}

        <Button to={`/sector/${sector.languageId}`} className="mt-4 w-full">
          {enlisted ? 'Enter sector' : 'Enlist'}
        </Button>
      </ChamferFrame>
    </div>
  );
}
