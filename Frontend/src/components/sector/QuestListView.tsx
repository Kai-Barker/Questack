import type { SectorQuest } from '../../types/sector';
import { capitalise } from '../../utils/format';
import { questKind, type QuestState } from '../../utils/quests';
import ChamferFrame from '../ui/ChamferFrame';
import { CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';

const stateDisplay: Record<QuestState, { label: string; className: string; Icon: typeof CheckIcon }> = {
  cleared: { label: 'Cleared', className: 'text-accent', Icon: CheckIcon },
  available: { label: 'Available', className: 'text-swarm', Icon: SwarmIcon },
  locked: { label: 'Locked', className: 'text-muted', Icon: LockIcon },
};

interface QuestListViewProps {
  quests: SectorQuest[]; // already in map order
  states: Map<number, QuestState>;
  selectedId: number | null;
  onSelect: (questId: number) => void;
}

// Plain list alternative to the quest map. Rows select a quest, like the nodes do.
export default function QuestListView({ quests, states, selectedId, onSelect }: QuestListViewProps) {
  return (
    <ul aria-label="Quests in this sector" className="space-y-2 px-4 pb-2">
      {quests.map((quest) => {
        const state = states.get(quest.questId) ?? 'locked';
        const { label, className, Icon } = stateDisplay[state];
        const selected = quest.questId === selectedId;

        return (
          <li key={quest.questId}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(quest.questId)}
              className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChamferFrame
                as="span"
                size="md"
                grow="sm"
                borderClassName={selected ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
                innerClassName={`flex items-center gap-4 px-4 py-3 ${selected ? 'bg-accent-deep/95' : 'bg-panel/90'}`}
              >
                <span className={`text-xl ${className}`}>
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-semibold tracking-[0.1em] uppercase">
                    {quest.title}
                  </span>
                  <span className="block text-xs text-muted">
                    {quest.concept} · {capitalise(quest.difficulty)} · {questKind(quest)}
                  </span>
                </span>
                <span className="hidden font-display text-xs tracking-[0.15em] text-slate-300 uppercase sm:block">
                  {quest.xpReward} XP
                </span>
                <span className={`w-20 text-right font-display text-xs tracking-[0.15em] uppercase ${className}`}>
                  {label}
                </span>
              </ChamferFrame>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
