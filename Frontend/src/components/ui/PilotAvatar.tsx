import type { GearItem } from '../../types/pilot';
import ChamferFrame from './ChamferFrame';

// The look of each frame and visor, by rewards.code. A code this file doesn't
// know yet (gear added to the database first) gets the Standard look.
const FRAMES: Record<string, { border: string; gap: string; inner: string }> = {
  'frame-standard': { border: 'bg-line-bright', gap: 'bg-space-950', inner: 'bg-line' },
  'frame-circuit': { border: 'bg-accent', gap: 'bg-accent/15', inner: 'bg-accent/50' },
  'frame-hunter': { border: 'bg-swarm', gap: 'bg-swarm/15', inner: 'bg-swarm/50' },
  'frame-decoder': { border: 'bg-cleared', gap: 'bg-cleared/20', inner: 'bg-cleared/60' },
  'frame-ace': { border: 'bg-buff', gap: 'bg-buff/15', inner: 'bg-buff/50' },
};

const VISORS: Record<string, string> = {
  'visor-standard': 'text-accent',
  'visor-mirror': 'text-slate-300',
  'visor-ember': 'text-swarm',
  'visor-nova': 'text-buff',
};

interface PilotAvatarProps {
  frame?: GearItem | null;
  visor?: GearItem | null;
  shape?: 'octagon' | 'md';
  className?: string; // size of the outer frame, e.g. 'size-24'
  decorative?: boolean; // hidden from screen readers, e.g. inside a labelled button
}

// The pilot's helmet: the visor tints the glass and the frame is the border around it
export default function PilotAvatar({ frame, visor, shape = 'octagon', className = '', decorative = false }: PilotAvatarProps) {
  const look = FRAMES[frame?.code ?? ''] ?? FRAMES['frame-standard']!;
  const glass = VISORS[visor?.code ?? ''] ?? VISORS['visor-standard'];
  const label = `Pilot avatar: ${frame?.name ?? 'Standard Issue'} frame, ${visor?.name ?? 'Standard Visor'}`;

  return (
    <ChamferFrame size={shape} borderClassName={look.border} className={className} innerClassName={`p-1 ${look.gap}`}>
      <ChamferFrame size={shape} borderClassName={look.inner} className="h-full" innerClassName="grid place-items-center bg-space-950 p-[12%]">
        <svg
          viewBox="0 0 64 64"
          className={`w-full max-w-28 ${glass}`}
          {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
        >
          <line x1="42" y1="11" x2="46" y2="4" strokeWidth="1.5" className="stroke-line-bright" />
          <circle cx="46" cy="4" r="2" fill="currentColor" />
          <rect x="7" y="30" width="5" height="12" rx="2" className="fill-line-bright" />
          <rect x="52" y="30" width="5" height="12" rx="2" className="fill-line-bright" />
          <path
            d="M32 9C19.8 9 11 18.6 11 31v12c0 4.4 3.6 8 8 8h26c4.4 0 8-3.6 8-8V31C53 18.6 44.2 9 32 9Z"
            strokeWidth="1.5"
            className="fill-panel-raised stroke-line-bright"
          />
          <path
            d="M17 30c0-6.6 6.7-11 15-11s15 4.4 15 11v5c0 3.9-3.1 7-7 7H24c-3.9 0-7-3.1-7-7v-5Z"
            fill="currentColor"
            fillOpacity="0.85"
            style={{ filter: 'drop-shadow(0 0 3px currentColor)' }}
          />
          <path d="M21.5 29c.8-3.6 4.4-6 9-6.5" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 51h26v4c0 1.7-1.3 3-3 3H22c-1.7 0-3-1.3-3-3v-4Z" className="fill-line-bright" />
        </svg>
      </ChamferFrame>
    </ChamferFrame>
  );
}
