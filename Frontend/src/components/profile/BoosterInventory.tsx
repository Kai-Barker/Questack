import { useState } from 'react';
import { activateBooster } from '../../services/profileService';
import type { Booster, PilotProfile } from '../../types/profile';
import { toRequestFailure } from '../../utils/requestFailure';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import { BoltIcon } from '../ui/icons';

// Boosters the pilot owns. Activating one makes it apply to their next
// first-time quest clears (and shows it on the Galaxy Map); one at a time.
export default function BoosterInventory({ boosters, onActivated }: { boosters: Booster[]; onActivated: (profile: PilotProfile) => void }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = boosters.some((b) => b.active);

  const activate = async (booster: Booster) => {
    setBusyId(booster.boosterId);
    setError(null);
    try {
      onActivated(await activateBooster(booster.boosterId));
    } catch (err) {
      setError(toRequestFailure(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {boosters.length === 0 ? (
        <p className="mt-2 text-xs text-muted">None yet. Some quests award a booster on their first clear.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {boosters.map((b) => (
            <li key={b.boosterId}>
              <ChamferFrame
                size="md"
                borderClassName={b.active ? 'bg-buff/60' : 'bg-line'}
                innerClassName={`flex items-center gap-3 px-3 py-2 ${b.active ? 'bg-buff-deep' : 'bg-space-950'}`}
              >
                <BoltIcon className={`shrink-0 ${b.active ? 'text-buff' : 'text-muted'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xs font-semibold tracking-[0.15em] uppercase">{b.name}</span>
                  <span className="block text-xs text-slate-300">
                    {b.xpMultiplier}× XP · {b.chargesRemaining} {b.chargesRemaining === 1 ? 'quest' : 'quests'}
                  </span>
                </span>
                {b.active ? (
                  <span className="font-display text-[0.65rem] font-semibold tracking-[0.2em] text-buff uppercase">Running</span>
                ) : (
                  <Button size="sm" variant="outline" disabled={running || busyId !== null} onClick={() => void activate(b)}>
                    {busyId === b.boosterId ? 'Starting…' : 'Activate'}
                    <span className="sr-only"> {b.name}</span>
                  </Button>
                )}
              </ChamferFrame>
            </li>
          ))}
        </ul>
      )}
      {running && boosters.some((b) => !b.active) && (
        <p className="mt-2 text-xs text-muted">One booster runs at a time. The next can start once this one is used up.</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-swarm">
          {error}
        </p>
      )}
    </>
  );
}
