import { useEffect, useRef } from 'react';
import type { SectorQuest } from '../../types/sector';
import type { QuestState } from '../../utils/quests';
import type { QuestEdge, QuestLayout } from './questLayout';
import QuestNode from './QuestNode';

interface QuestMapProps {
  layout: QuestLayout;
  states: Map<number, QuestState>;
  selectedId: number | null;
  shipQuestId: number | null;
  onSelect: (questId: number) => void;
}

// Cleared routes glow cyan, the route into an open quest is solid, and
// anything leading to a locked quest is dashed.
function edgeStyle(edge: QuestEdge, states: Map<number, QuestState>) {
  const from = states.get(edge.from);
  const to = states.get(edge.to);
  if (from === 'cleared' && to === 'cleared') return { className: 'stroke-accent/80', dash: undefined };
  if (from === 'cleared' && to === 'available') return { className: 'stroke-slate-300/70', dash: undefined };
  return { className: 'stroke-slate-500/60', dash: '4 5' };
}

// Every column of the path gets at least this much room, enough for a node's
// 9rem title label, so a long sector widens the map instead of overlapping
const COLUMN_WIDTH_REM = 10;
const MIN_WIDTH_REM = 52;

// Quest graph for one sector. Nodes are HTML buttons placed by %, and the
// connecting lines are an SVG stretched over the same box, so both line up
// at any size.
export default function QuestMap({ layout, states, selectedId, shipQuestId, onSelect }: QuestMapProps) {
  const { positions, edges, order, columnCount } = layout;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const shipX = shipQuestId === null ? undefined : positions.get(shipQuestId)?.x;

  // A map wider than its box opens centred on the ship, not on quest 01
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || shipX === undefined) return;
    scroller.scrollTo({ left: (shipX / 100) * scroller.scrollWidth - scroller.clientWidth / 2 });
  }, [shipX]);

  return (
    // Scrolls sideways inside its box when the path is longer than the screen
    <div ref={scrollerRef} className="overflow-x-auto">
      <div
        className="relative mx-auto h-[30rem] lg:h-sector-map"
        style={{ minWidth: `${Math.max(MIN_WIDTH_REM, columnCount * COLUMN_WIDTH_REM)}rem` }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
        >
          {edges.map((edge) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            const { className, dash } = edgeStyle(edge, states);
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth={1.5}
                strokeDasharray={dash}
                vectorEffect="non-scaling-stroke"
                className={className}
              />
            );
          })}
        </svg>

        <ul aria-label="Quests in this sector">
          {order.map((quest: SectorQuest) => {
            const position = positions.get(quest.questId);
            const state = states.get(quest.questId);
            if (!position || !state) return null;
            return (
              <QuestNode
                key={quest.questId}
                quest={quest}
                state={state}
                position={position}
                selected={quest.questId === selectedId}
                isShip={quest.questId === shipQuestId}
                onSelect={() => onSelect(quest.questId)}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}
