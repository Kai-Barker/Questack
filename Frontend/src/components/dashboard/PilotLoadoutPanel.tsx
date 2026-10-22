import { Link } from 'react-router';
import type { GearItem, PilotSummary } from '../../types/pilot';
import ChamferFrame from '../ui/ChamferFrame';
import Panel from '../ui/Panel';
import PilotAvatar from '../ui/PilotAvatar';
import { BoltIcon, ChevronRightIcon } from '../ui/icons';

function GearSlot({ slot, item }: { slot: string; item?: GearItem }) {
  return (
    <ChamferFrame size="md" innerClassName="flex min-h-10 flex-col justify-center bg-panel px-2 py-1.5 text-center">
      <span className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">{slot}</span>
      {item ? (
        <span className="text-xs text-slate-200">{item.name}</span>
      ) : (
        <span className="sr-only">empty</span>
      )}
    </ChamferFrame>
  );
}

// Avatar, gear and active booster. These are nice-to-have features, so the
// panel hides itself when the backend sends neither a loadout nor a booster.
// The booster only shows once the pilot has activated it on their Profile.
export default function PilotLoadoutPanel({ pilot }: { pilot: PilotSummary }) {
  const { loadout, activeBooster } = pilot;
  if (!loadout && !activeBooster) return null;

  return (
    <Panel label="Pilot">
      {loadout && (
        <div className="mt-4 grid grid-cols-[6.5rem_1fr] gap-3">
          <PilotAvatar frame={loadout.frame} visor={loadout.visor} shape="md" className="min-h-32" />
          <div className="flex flex-col gap-2">
            <GearSlot slot="Frame" item={loadout.frame} />
            <GearSlot slot="Visor" item={loadout.visor} />
            <GearSlot slot="Insignia" item={loadout.insignia} />
          </div>
        </div>
      )}

      <p className="mt-4 font-display text-sm font-semibold tracking-[0.2em] uppercase">
        Callsign <span className="ml-1">{pilot.callsign}</span>
      </p>

      {activeBooster && (
        <>
          <p className="mt-3 font-display text-xs tracking-[0.2em] text-muted uppercase">Active booster</p>
          <ChamferFrame
            size="md"
            borderClassName="bg-buff/60"
            innerClassName="flex items-center gap-3 bg-buff-deep px-3 py-2.5"
            className="mt-2"
          >
            <BoltIcon className="shrink-0 text-buff" />
            <span>
              <span className="block font-display text-xs font-semibold tracking-[0.15em] text-buff uppercase">
                {activeBooster.name}
              </span>
              <span className="block text-xs text-slate-300">
                {activeBooster.xpMultiplier}× XP · {activeBooster.questsRemaining} more{' '}
                {activeBooster.questsRemaining === 1 ? 'quest' : 'quests'}
              </span>
            </span>
          </ChamferFrame>
        </>
      )}

      <Link
        to="/profile"
        className="mt-4 inline-flex items-center gap-1 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Manage loadout <ChevronRightIcon />
      </Link>
    </Panel>
  );
}
