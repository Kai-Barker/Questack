import { useState } from 'react';
import type { PilotProfile, ProfileUpdate } from '../../types/profile';
import ChamferFrame from '../ui/ChamferFrame';
import Panel from '../ui/Panel';
import PilotAvatar from '../ui/PilotAvatar';
import { ChevronRightIcon } from '../ui/icons';
import LoadoutDialog, { type LoadoutSlot } from './LoadoutDialog';

interface SlotProps {
  slot: string;
  item: string | null;
  booster?: boolean;
  perk?: string | null;
  onOpen: () => void;
}

// A slot is a button: it opens the picker for that slot
function Slot({ slot, item, booster = false, perk, onOpen }: SlotProps) {
  const active = booster && item;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ChamferFrame
          as="span"
          size="md"
          borderClassName={active ? 'bg-buff/50 group-hover:bg-buff' : 'bg-line group-hover:bg-line-bright'}
          innerClassName={`flex min-h-12 items-center gap-2 px-2.5 py-1.5 ${active ? 'bg-buff-deep' : 'bg-panel'}`}
        >
          {/* Spans, not divs: this sits inside a button */}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">{slot}</span>
            {item ? (
              <span className={`text-xs ${booster ? 'text-buff' : 'text-slate-200'}`}>{item}</span>
            ) : (
              <span className="text-xs text-muted italic">Empty</span>
            )}
            {perk && <span className="mt-0.5 text-[0.65rem] leading-snug text-buff">{perk}</span>}
          </span>
          <ChevronRightIcon className="shrink-0 text-muted group-hover:text-accent" />
        </ChamferFrame>
      </button>
    </li>
  );
}

interface LoadoutPanelProps {
  profile: PilotProfile;
  onBoosterActivated: (profile: PilotProfile) => void;
  onEquip: (update: ProfileUpdate) => Promise<void>;
}

// The avatar wears the equipped frame and visor. The insignia slot shows the
// pilot's chosen title; the booster slot the running booster. Clicking a slot
// opens its picker.
export default function LoadoutPanel({ profile, onBoosterActivated, onEquip }: LoadoutPanelProps) {
  const { loadout } = profile;
  const [open, setOpen] = useState<LoadoutSlot | null>(null);
  const visorPerk = profile.gear.visors.find((v) => v.rewardId === loadout.visor?.rewardId)?.perk;

  return (
    <Panel label="Loadout">
      {/* Equipment alongside the avatar, as on the Galaxy Map */}
      <div className="mt-4 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
        <PilotAvatar frame={loadout.frame} visor={loadout.visor} shape="md" className="min-h-56" />
        <ul className="flex flex-col gap-2">
          <Slot slot="Frame" item={loadout.frame?.name ?? null} onOpen={() => setOpen('frame')} />
          <Slot slot="Visor" item={loadout.visor?.name ?? null} perk={visorPerk} onOpen={() => setOpen('visor')} />
          <Slot slot="Insignia" item={loadout.insignia} onOpen={() => setOpen('insignia')} />
          <Slot slot="Booster" item={loadout.booster} booster onOpen={() => setOpen('booster')} />
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted">Choose a slot to change it.</p>

      {open && (
        <LoadoutDialog
          slot={open}
          profile={profile}
          onEquip={onEquip}
          onBoosterActivated={onBoosterActivated}
          onClose={() => setOpen(null)}
        />
      )}
    </Panel>
  );
}
