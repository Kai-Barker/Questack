import type { Uplink } from '../../hooks/useUplink';
import { CENTRE, MAP_SIZE, RING, SLOT_COUNT, polar, slotAngles, wedgePath } from '../map/sectorGeometry';

// Decorative mini galaxy ring for the login screen: the two open sectors lit,
// the rest uncharted. Reuses the Galaxy Map's geometry.
function MiniGalaxy() {
  const octagon = Array.from({ length: 8 }, (_, i) => polar(92, 22.5 + i * 45))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} aria-hidden="true" className="mt-5 w-40">
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const { start, end } = slotAngles(i, SLOT_COUNT);
        const open = i < 2;
        return (
          <path
            key={i}
            d={wedgePath(RING.inner, RING.outer, start, end)}
            strokeWidth={6}
            strokeDasharray={open ? undefined : '18 18'}
            className={open ? 'fill-wedge-cleared stroke-accent/80' : 'fill-transparent stroke-line-bright'}
          />
        );
      })}
      <circle cx={CENTRE} cy={CENTRE} r={RING.hub} strokeWidth={6} className="fill-space-950 stroke-line" />
      <polygon points={octagon} strokeWidth={8} className="fill-accent-deep stroke-accent/80" />
    </svg>
  );
}

const uplinkText: Record<Uplink, { text: string; className: string }> = {
  checking: { text: 'Checking', className: 'text-muted' },
  online: { text: 'Stable', className: 'text-accent' },
  degraded: { text: 'Degraded', className: 'text-swarm' },
  offline: { text: 'Offline', className: 'text-swarm' },
};

// Left column of the login card. Only real values: no invented pilot counts.
export default function FleetStatus({ uplink }: { uplink: Uplink }) {
  const rows = [
    { label: 'Sectors open', value: '02 / 06', className: 'text-slate-100' },
    { label: 'Swarm activity', value: 'High', className: 'text-swarm' },
    { label: 'Uplink', value: uplinkText[uplink].text, className: uplinkText[uplink].className },
  ];

  return (
    <section aria-labelledby="fleet-status-heading">
      <h2 id="fleet-status-heading" className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        Fleet status
      </h2>
      <MiniGalaxy />
      <dl className="mt-6 space-y-3 font-mono text-xs uppercase">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="tracking-[0.15em] text-muted">{row.label}</dt>
            <dd className={`tracking-[0.1em] ${row.className}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
