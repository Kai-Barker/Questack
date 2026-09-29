import type { SectorQuest } from '../../types/sector';
import { questKind, type QuestState } from '../../utils/quests';
import ChamferFrame from '../ui/ChamferFrame';
import { CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';
import type { NodePosition } from './questLayout';

const stateLabels: Record<QuestState, string> = {
  cleared: 'cleared',
  available: 'Swarm infested, available',
  locked: 'locked',
};

const stateStyles: Record<QuestState, { border: string; inner: string }> = {
  cleared: { border: 'bg-accent/80', inner: 'bg-wedge-cleared text-accent' },
  available: { border: 'bg-swarm', inner: 'bg-wedge-swarm-hover text-swarm' },
  locked: { border: 'bg-line-bright', inner: 'bg-panel text-muted' },
};

interface QuestNodeProps {
  quest: SectorQuest;
  state: QuestState;
  position: NodePosition;
  selected: boolean;
  isShip: boolean;
  onSelect: () => void;
}

export default function QuestNode({ quest, state, position, selected, isShip, onSelect }: QuestNodeProps) {
  const hive = quest.isHiveAssault === true;
  // Size goes on the inner layer so the frame is free to grow on hover.
  // Outer = inner + the 1px border each side: 64px, 34px and 44px.
  const size = hive ? 'size-[62px] text-2xl' : quest.isSideQuest ? 'size-8 text-sm' : 'size-[42px] text-lg';
  const styles = hive && state !== 'cleared' ? { border: 'bg-swarm/80', inner: 'bg-wedge-swarm text-swarm' } : stateStyles[state];
  const Icon = state === 'cleared' ? CheckIcon : state === 'available' ? SwarmIcon : LockIcon;

  const node = (
    <ChamferFrame
      as="span"
      size="octagon"
      grow={selected ? undefined : 'md'}
      borderClassName={styles.border}
      innerClassName={`grid place-items-center ${size} ${styles.inner}`}
    >
      <Icon />
    </ChamferFrame>
  );

  return (
    <li
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${selected ? 'z-10' : ''}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {isShip && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-center font-display text-[0.65rem] font-semibold tracking-[0.2em] whitespace-nowrap text-accent uppercase"
        >
          Your ship
          <span className="block text-[0.6rem] leading-none">▼</span>
        </p>
      )}

      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${quest.title}, ${questKind(quest).toLowerCase()}, ${stateLabels[state]}${isShip ? ', your ship is here' : ''}`}
        onClick={onSelect}
        className="group block cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {selected ? (
          // Selection ring: a second octagon around the node
          <ChamferFrame
            as="span"
            size="octagon"
            grow="md"
            borderClassName="bg-accent"
            innerClassName="block bg-space-950/80 p-1"
          >
            {node}
          </ChamferFrame>
        ) : (
          node
        )}
      </button>

      <div className="pointer-events-none absolute top-full left-1/2 mt-2 w-36 -translate-x-1/2 text-center">
        <p
          className={
            hive
              ? 'font-display text-xs font-bold tracking-[0.15em] text-swarm uppercase'
              : `text-xs ${state === 'locked' ? 'text-slate-400' : 'text-slate-100'}`
          }
        >
          {quest.title}
        </p>
        {quest.isSideQuest && (
          <p className="font-display text-[0.6rem] tracking-[0.2em] text-muted uppercase">Side quest</p>
        )}
      </div>
    </li>
  );
}
