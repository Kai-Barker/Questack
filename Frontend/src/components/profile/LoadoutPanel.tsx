import type { PilotProfile } from '../../types/profile';
import ChamferFrame from '../ui/ChamferFrame';
import Panel from '../ui/Panel';

function Slot({ slot, item, buff = false }: { slot: string; item: string | null; buff?: boolean }) {
  const active = buff && item;
  return (
    <li>
      <ChamferFrame
        size="md"
        borderClassName={active ? 'bg-buff/50' : 'bg-line'}
        innerClassName={`flex min-h-12 flex-col justify-center px-2.5 py-1.5 ${active ? 'bg-buff-deep' : 'bg-panel'}`}
      >
        <span className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">{slot}</span>
        {item ? (
          <span className={`text-xs ${buff ? 'text-buff' : 'text-slate-200'}`}>{item}</span>
        ) : (
          <span className="text-xs text-muted italic">Empty</span>
        )}
      </ChamferFrame>
    </li>
  );
}

// DUMMY avatar and gear (from the backend's demo progress) until the loadout
// screen exists. The insignia slot shows the pilot's chosen title.
export default function LoadoutPanel({ profile }: { profile: PilotProfile }) {
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
          <Slot slot="Booster" item={loadout.booster} buff />
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted">Avatar customisation is coming soon.</p>
    </Panel>
  );
}
