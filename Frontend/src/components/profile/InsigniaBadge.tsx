import type { ComponentType, SVGProps } from 'react';
import {
  AntennaIcon,
  BulbIcon,
  CrosshairIcon,
  DiamondIcon,
  FlameIcon,
  HiveIcon,
  LockIcon,
  PlanetIcon,
  RankIcon,
  RocketIcon,
  StarIcon,
} from '../ui/icons';

// Icon for each reward code (rewards.code in the database)
const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  'first-deploy': RocketIcon,
  'bug-hunter': CrosshairIcon,
  'curious-mind': BulbIcon,
  'streak-5': FlameIcon,
  decoder: AntennaIcon,
  'hive-breaker': HiveIcon,
  'sector-cleared': PlanetIcon,
  commander: RankIcon,
};

export function InsigniaIcon({ code, ...props }: { code: string } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[code] ?? DiamondIcon;
  return <Icon {...props} />;
}

const sizes = {
  xs: 'size-10 text-lg',
  sm: 'size-12 text-xl',
  md: 'size-16 text-[1.75rem]',
};

// Pointy-top hexagon, inset so the stroke stays inside the box
const HEXAGON = '50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5';

interface InsigniaBadgeProps {
  code?: string; // leave out for an empty slot
  earned?: boolean;
  size?: keyof typeof sizes;
  className?: string;
}

// The hexagon badge. Purely visual: the caller gives it a name in text.
// Locked badges are dimmed and carry a lock, so the state isn't shown by colour alone.
export default function InsigniaBadge({ code, earned = true, size = 'md', className = '' }: InsigniaBadgeProps) {
  const empty = code === undefined;
  const shape = empty
    ? 'fill-transparent stroke-line-bright [stroke-dasharray:4_4]'
    : earned
      ? 'fill-accent-deep stroke-accent'
      : 'fill-space-950 stroke-line-bright';

  return (
    <span aria-hidden="true" className={`relative inline-grid shrink-0 place-items-center ${sizes[size]} ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
        <polygon points={HEXAGON} vectorEffect="non-scaling-stroke" strokeWidth={1.5} className={shape} />
      </svg>
      {!empty && (
        <InsigniaIcon code={code} className={`relative ${earned ? 'text-accent' : 'text-muted/50'}`} />
      )}
      {!empty && !earned && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border border-line-bright bg-panel text-[0.65rem] text-muted">
          <LockIcon />
        </span>
      )}
    </span>
  );
}

interface InsigniaStatusProps {
  earned: boolean;
  featured: boolean;
  align?: 'center' | 'start';
  className?: string;
}

// Featured / Earned / Locked, in words as well as colour
export function InsigniaStatus({ earned, featured, align = 'center', className = '' }: InsigniaStatusProps) {
  return (
    <span
      className={`flex items-center gap-1 font-display text-[0.6rem] tracking-[0.2em] uppercase ${
        align === 'center' ? 'justify-center' : 'justify-start'
      } ${className}`}
    >
      {featured ? (
        <span className="flex items-center gap-1 text-accent">
          <StarIcon /> Featured
        </span>
      ) : earned ? (
        <span className="text-buff">Earned</span>
      ) : (
        <span className="text-muted">Locked</span>
      )}
    </span>
  );
}
