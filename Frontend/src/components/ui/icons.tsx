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

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6l6 6-6 6" />
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
