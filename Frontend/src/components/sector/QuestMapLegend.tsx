import ChamferFrame from '../ui/ChamferFrame';
import { CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';

// Each state has its own icon as well as colour, so nothing relies on colour alone
const items = [
  { label: 'Cleared', Icon: CheckIcon, border: 'bg-accent/80', inner: 'bg-wedge-cleared text-accent' },
  { label: 'Swarm infested · available', Icon: SwarmIcon, border: 'bg-swarm', inner: 'bg-wedge-swarm-hover text-swarm' },
  { label: 'Locked', Icon: LockIcon, border: 'bg-line-bright', inner: 'bg-panel text-muted' },
  { label: 'Hive assault', Icon: LockIcon, border: 'bg-swarm/80', inner: 'bg-wedge-swarm text-swarm' },
];

export default function QuestMapLegend() {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      {items.map(({ label, Icon, border, inner }) => (
        <li
          key={label}
          className="flex items-center gap-2 font-display text-xs tracking-[0.15em] text-slate-300 uppercase"
        >
          <ChamferFrame
            as="span"
            size="octagon"
            borderClassName={border}
            innerClassName={`grid place-items-center text-xs ${inner}`}
            className="size-6"
          >
            <Icon />
          </ChamferFrame>
          {label}
        </li>
      ))}
      <li className="font-display text-xs tracking-[0.15em] text-muted uppercase">Smaller node = side quest</li>
    </ul>
  );
}
