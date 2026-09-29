import { CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';

// Every state has an icon as well as a colour, so the map never relies on colour alone
const items = [
  { label: 'Cleared', Icon: CheckIcon, className: 'border-cleared bg-wedge-cleared text-accent' },
  { label: 'Swarm infested', Icon: SwarmIcon, className: 'border-swarm/60 bg-wedge-swarm text-swarm' },
  { label: 'Uncharted', Icon: LockIcon, className: 'border-dashed border-line-bright bg-wedge-uncharted text-muted' },
];

export default function MapLegend() {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {items.map(({ label, Icon, className }) => (
        <li
          key={label}
          className="flex items-center gap-2 font-display text-xs tracking-[0.15em] text-slate-300 uppercase"
        >
          <span className={`grid size-5 place-items-center rounded-sm border text-[0.7rem] ${className}`}>
            <Icon />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
