import { useId, useState } from 'react';
import { activateBooster } from '../../services/profileService';
import type { Booster, PilotProfile } from '../../types/profile';
import { toRequestFailure } from '../../utils/requestFailure';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import Panel from '../ui/Panel';
import { BoltIcon } from '../ui/icons';

function Slot({ slot, item, booster = false }: { slot: string; item: string | null; booster?: boolean }) {
  const active = booster && item;
  return (
    <li>
      <ChamferFrame
        size="md"
        borderClassName={active ? 'bg-buff/50' : 'bg-line'}
        innerClassName={`flex min-h-12 flex-col justify-center px-2.5 py-1.5 ${active ? 'bg-buff-deep' : 'bg-panel'}`}
      >
        <span className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">{slot}</span>
        {item ? (
          <span className={`text-xs ${booster ? 'text-buff' : 'text-slate-200'}`}>{item}</span>
        ) : (
          <span className="text-xs text-muted italic">Empty</span>
        )}
      </ChamferFrame>
    </li>
  );
}

// Boosters the pilot owns. Activating one makes it apply to their next
// first-time quest clears (and shows it on the Galaxy Map); one at a time.
function BoosterInventory({ boosters, onActivated }: { boosters: Booster[]; onActivated: (profile: PilotProfile) => void }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = boosters.some((b) => b.active);
  const headingId = useId();

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
    <section aria-labelledby={headingId} className="mt-5">
      <h3 id={headingId} className="font-display text-xs tracking-[0.2em] text-muted uppercase">
        Boosters
      </h3>
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
    </section>
  );
}

interface LoadoutPanelProps {
  profile: PilotProfile;
  onBoosterActivated: (profile: PilotProfile) => void;
}

// The avatar and helmet are DUMMY until the loadout screen exists. The
// insignia slot shows the pilot's chosen title; the booster slot the running booster.
export default function LoadoutPanel({ profile, onBoosterActivated }: LoadoutPanelProps) {
  const { loadout } = profile;

  return (
    <Panel label="Loadout">
      {/* Equipment alongside the full-body avatar, as on the Galaxy Map */}
      <div className="mt-4 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
        <ChamferFrame
          size="md"
          innerClassName="grid min-h-56 place-items-center bg-space-950 font-display text-xs tracking-[0.2em] text-muted uppercase"
        >
          Avatar
        </ChamferFrame>
        <ul className="flex flex-col gap-2">
          <Slot slot="Helmet" item={loadout.helmet} />
          <Slot slot="Armour" item={loadout.armour} />
          <Slot slot="Insignia" item={loadout.insignia} />
          <Slot slot="Booster" item={loadout.booster} booster />
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted">Avatar customisation is coming soon.</p>
      <BoosterInventory boosters={profile.boosters} onActivated={onBoosterActivated} />
    </Panel>
  );
}
