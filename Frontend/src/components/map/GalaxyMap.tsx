import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import type { SectorSummary } from '../../types/dashboard';
import { percent, sectorStatus } from '../../utils/progress';
import { CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';
import SectorPopover from './SectorPopover';
import { CENTRE, MAP_SIZE, RING, SLOT_COUNT, minSweep, polar, slotAngles, toPercent, wedgePath } from './sectorGeometry';

// Wedge colours per state. Hover, keyboard focus and "selected" all share the
// highlighted look; the grow effect itself is the .sector-wedge rule in index.css.
const wedgeStyles = {
  infested:
    'fill-wedge-swarm stroke-swarm/25 ' +
    'group-hover:fill-wedge-swarm-hover group-hover:stroke-accent ' +
    'group-focus-visible:fill-wedge-swarm-hover group-focus-visible:stroke-accent group-focus-visible:stroke-3 ' +
    'group-data-[selected=true]:fill-wedge-swarm-hover group-data-[selected=true]:stroke-accent',
  cleared:
    'fill-wedge-cleared stroke-cleared/40 ' +
    'group-hover:fill-wedge-cleared-hover group-hover:stroke-accent ' +
    'group-focus-visible:fill-wedge-cleared-hover group-focus-visible:stroke-accent group-focus-visible:stroke-3 ' +
    'group-data-[selected=true]:fill-wedge-cleared-hover group-data-[selected=true]:stroke-accent',
};

interface SectorWedgeProps {
  sector: SectorSummary;
  index: number;
  count: number;
  selected: boolean;
  onToggle: () => void;
  registerRef: (el: SVGGElement | null) => void;
}

function SectorWedge({ sector, index, count, selected, onToggle, registerRef }: SectorWedgeProps) {
  const { start, end, mid } = slotAngles(index, count);
  const status = sectorStatus(sector);
  const cleared = percent(sector.questsCleared, sector.questsTotal);
  const label = polar(RING.label, mid);
  const bandOuter = RING.inner + RING.band;
  const progressEnd = start + Math.max(((end - start) * cleared) / 100, minSweep(RING.inner));
  const StatusIcon = status === 'cleared' ? CheckIcon : SwarmIcon;

  function handleKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <g
      ref={registerRef}
      data-sector-wedge=""
      data-selected={selected}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={selected}
      aria-label={`${sector.displayName} Sector, ${status === 'cleared' ? 'cleared' : 'Swarm infested'}, ${cleared}% cleared`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className="sector-wedge group cursor-pointer outline-none"
    >
      <path
        d={wedgePath(RING.inner, RING.outer, start, end)}
        strokeWidth={1.5}
        className={`transition-colors ${wedgeStyles[status]}`}
      />

      {/* Inner band: how much of the Swarm has been cleared from this sector */}
      <path d={wedgePath(RING.inner, bandOuter, start, end)} className="fill-space-950/60" />
      {cleared > 0 && <path d={wedgePath(RING.inner, bandOuter, start, progressEnd)} className="fill-cleared" />}

      <g className="pointer-events-none select-none" textAnchor="middle">
        <StatusIcon
          x={label.x - 10}
          y={label.y - 70}
          width={20}
          height={20}
          className={status === 'cleared' ? 'text-accent' : 'text-swarm'}
        />
        <text x={label.x} y={label.y - 26} fontSize={18} className="fill-slate-100 font-display font-bold tracking-[0.15em]">
          {sector.displayName.toUpperCase()}
        </text>
        <text x={label.x} y={label.y - 4} fontSize={18} className="fill-slate-100 font-display font-bold tracking-[0.15em]">
          SECTOR
        </text>
        <text x={label.x} y={label.y + 18} fontSize={13} className="fill-muted">
          {sector.displayName}
        </text>
        <text x={label.x} y={label.y + 40} fontSize={13} className="fill-accent font-display font-semibold tracking-[0.15em]">
          {cleared}% CLEARED
        </text>
      </g>
    </g>
  );
}

function UnchartedWedge({ index, count }: { index: number; count: number }) {
  const { start, end, mid } = slotAngles(index, count);
  const label = polar(RING.label - 10, mid);

  return (
    <g role="img" aria-label="Uncharted sector, locked">
      <path
        d={wedgePath(RING.inner, RING.outer, start, end)}
        strokeWidth={1.5}
        strokeDasharray="6 6"
        className="fill-wedge-uncharted stroke-line-bright"
      />
      <g className="pointer-events-none select-none" textAnchor="middle">
        <LockIcon x={label.x - 10} y={label.y - 30} width={20} height={20} className="text-muted" />
        <text x={label.x} y={label.y + 8} fontSize={14} className="fill-muted font-display font-semibold tracking-[0.2em]">
          UNCHARTED
        </text>
      </g>
    </g>
  );
}

function CommandStation() {
  const octagon = Array.from({ length: 8 }, (_, i) => polar(92, 22.5 + i * 45))
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  return (
    <g aria-hidden="true" className="pointer-events-none select-none" textAnchor="middle">
      <circle cx={CENTRE} cy={CENTRE} r={RING.hub} strokeWidth={1.5} className="fill-space-950 stroke-line" />
      <polygon points={octagon} strokeWidth={1.5} className="fill-panel stroke-line-bright" />
      <text x={CENTRE} y={CENTRE - 12} fontSize={17} className="fill-slate-100 font-display font-bold tracking-[0.15em]">
        COMMAND
      </text>
      <text x={CENTRE} y={CENTRE + 11} fontSize={17} className="fill-slate-100 font-display font-bold tracking-[0.15em]">
        STATION
      </text>
      <text x={CENTRE} y={CENTRE + 34} fontSize={11} className="fill-muted font-display tracking-[0.2em]">
        HOME BASE
      </text>
    </g>
  );
}

interface GalaxyMapProps {
  sectors: SectorSummary[];
}

// Radial map of every sector (language). Sectors fill the ring clockwise from
// 12 o'clock; leftover slots are drawn as locked "Uncharted" space.
export default function GalaxyMap({ sectors }: GalaxyMapProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const wedgeRefs = useRef(new Map<number, SVGGElement>());

  const slotCount = Math.max(SLOT_COUNT, sectors.length);
  const slots = Array.from({ length: slotCount }, (_, i) => sectors[i] ?? null);
  const selectedIndex = sectors.findIndex((s) => s.languageId === selectedId);
  const selected = selectedIndex >= 0 ? sectors[selectedIndex] : null;

  const closePopover = useCallback(
    (returnFocus: boolean) => {
      if (returnFocus && selectedId !== null) wedgeRefs.current.get(selectedId)?.focus();
      setSelectedId(null);
    },
    [selectedId],
  );

  return (
    <div className="relative mx-auto w-full max-w-galaxy-map">
      <svg
        viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
        role="group"
        aria-label="Galaxy map of sectors"
        className="block h-auto w-full overflow-visible"
      >
        <circle cx={CENTRE} cy={CENTRE} r={RING.frame} strokeWidth={1.5} className="fill-none stroke-line" />

        {slots.map((sector, i) =>
          sector ? (
            <SectorWedge
              key={sector.languageId}
              sector={sector}
              index={i}
              count={slotCount}
              selected={sector.languageId === selectedId}
              onToggle={() => setSelectedId((current) => (current === sector.languageId ? null : sector.languageId))}
              registerRef={(el) => {
                if (el) wedgeRefs.current.set(sector.languageId, el);
                else wedgeRefs.current.delete(sector.languageId);
              }}
            />
          ) : (
            <UnchartedWedge key={`uncharted-${i}`} index={i} count={slotCount} />
          ),
        )}

        <CommandStation />
      </svg>

      {selected && (
        <SectorPopover
          sector={selected}
          anchor={toPercent(polar(RING.label - 20, slotAngles(selectedIndex, slotCount).mid))}
          onClose={closePopover}
        />
      )}
    </div>
  );
}
