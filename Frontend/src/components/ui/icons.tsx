import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

// Line icons drawn on a 24x24 grid. They inherit colour from `currentColor`
// and size from the font size, and are hidden from screen readers.
function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11l9-8 9 8M5 10v10h14V10" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="11" width="14" height="10" rx="1.5" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

// The Swarm: an alien bug
export const SwarmIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 7a3 3 0 0 1 6 0" />
    <rect x="7" y="8" width="10" height="12" rx="5" />
    <path d="M12 8v12M3 13h4M17 13h4M4 7l3 3M20 7l-3 3M4 20l3-3M20 20l-3-3" />
  </Icon>
);

export const BoltIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const ChevronUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 15l6-6 6 6" />
  </Icon>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

// The Ship's AI mark
export const DiamondIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3l9 9-9 9-9-9z" />
  </Icon>
);

export const SignOutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />
  </Icon>
);

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />
  </Icon>
);

export const StarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Icon>
);

// ----- Insignia (one per reward code, see components/profile/InsigniaBadge.tsx) -----

// First Deploy: a ship launching
export const RocketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3c3 2.5 4.5 5.5 4.5 9.5L14.5 16h-5l-2-3.5C7.5 8.5 9 5.5 12 3z" />
    <circle cx="12" cy="10" r="1.5" />
    <path d="M7.5 12.5 5 15l1.5 3 3-2M16.5 12.5 19 15l-1.5 3-3-2M12 18v3" />
  </Icon>
);

// Bug Hunter: a target lock
export const CrosshairIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </Icon>
);

// Curious Mind: a spark of an idea
export const BulbIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 17h6M10 20.5h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v2h5v-2c0-.4.1-.8.5-1.1A6 6 0 0 0 12 3z" />
  </Icon>
);

// 5-Day Streak: a flame
export const FlameIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 21a6 6 0 0 0 6-6c0-4-3-6.5-4-10-2 1.5-3.5 4-3.5 6.5C9.5 10 9 9 8.5 8 7 9.5 6 12 6 15a6 6 0 0 0 6 6z" />
    <path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.5 1.5-3 2.5-4.5 1 1.5 2.5 3 2.5 4.5A2.5 2.5 0 0 1 12 21z" />
  </Icon>
);

// Decoder: an antenna picking up a transmission
export const AntennaIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="10" r="1.5" />
    <path d="M12 11.5 8 21M12 11.5 16 21M9.5 18h5M8.5 6.5a5 5 0 0 0 0 7M15.5 6.5a5 5 0 0 1 0 7M5.5 3.5a9 9 0 0 0 0 13M18.5 3.5a9 9 0 0 1 0 13" />
  </Icon>
);

// Hive Breaker: a cracked hive cell
export const HiveIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />
    <path d="M12 2.5 10.5 8l3 3-2 4 1.5 6.5" />
  </Icon>
);

// Sector Cleared: a ringed planet
export const PlanetIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="5.5" />
    <path d="M7.2 9.4C4 9.4 2 10.2 2.3 11.3c.5 1.9 5.6 3.5 11.3 3.5 4.6 0 8.2-.7 8.1-1.9 0-.8-1.3-1.5-3.4-2" />
  </Icon>
);

// Commander: rank chevrons under a star
export const RankIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2.5l1.5 3 3.3.5-2.4 2.3.6 3.2L12 10l-3 1.5.6-3.2-2.4-2.3 3.3-.5z" />
    <path d="M5 14.5l7 4 7-4M5 18.5l7 4 7-4" />
  </Icon>
);
