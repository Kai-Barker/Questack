import { useState } from 'react';
import { updateSectorRank } from '../../services/sectorService';
import type { ProficiencyLevel } from '../../types/pilot';
import ChamferFrame from '../ui/ChamferFrame';

const ranks: ProficiencyLevel[] = ['cadet', 'pilot', 'commander'];

interface RankSelectorProps {
  languageId: number;
  initialRank?: ProficiencyLevel; // undefined = not enlisted yet
  onSaved?: () => void; // e.g. to refresh the rank shown in the nav
}

// The pilot's proficiency class in this sector, which sets how the Ship's AI
// explains things. Updates straight away and rolls back if saving fails.
export default function RankSelector({ languageId, initialRank, onSaved }: RankSelectorProps) {
  const [rank, setRank] = useState(initialRank);
  const [failed, setFailed] = useState(false);

  function choose(next: ProficiencyLevel) {
    if (next === rank) return;
    const previous = rank;
    setRank(next);
    setFailed(false);
    updateSectorRank(languageId, next).then(
      () => onSaved?.(),
      () => {
        setRank(previous);
        setFailed(true);
      },
    );
  }

  return (
    <div>
      <p id={`rank-label-${languageId}`} className="font-display text-xs tracking-[0.2em] text-muted uppercase">
        {rank ? 'Your rank in this sector' : 'Choose a rank to enlist'}
      </p>
      <div role="group" aria-labelledby={`rank-label-${languageId}`} className="mt-2 flex gap-1.5">
        {ranks.map((option) => {
          const active = option === rank;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => choose(option)}
              className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChamferFrame
                as="span"
                size="sm"
                grow="sm"
                borderClassName={active ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
                innerClassName={`px-4 py-1.5 font-display text-xs font-semibold tracking-[0.15em] uppercase ${
                  active ? 'bg-accent-deep text-accent' : 'bg-space-950 text-slate-300'
                }`}
              >
                {option}
              </ChamferFrame>
            </button>
          );
        })}
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-xs text-swarm">
          Couldn't save your rank. Try again.
        </p>
      )}
    </div>
  );
}
