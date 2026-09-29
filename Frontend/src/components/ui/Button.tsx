import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ChamferFrame from './ChamferFrame';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  to?: string; // renders a router link instead of a <button>
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

// The outer element stays unclipped so its focus outline is visible;
// the chamfered shape is drawn by the frame inside it.
const outerClasses =
  'inline-block font-display font-semibold tracking-[0.2em] uppercase ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-4 text-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  onClick,
  disabled,
  className = '',
}: ButtonProps) {
  // Small buttons grow by whole pixels (a scaled 1px border on a small button
  // looks blurry); larger ones scale. Disabled buttons don't react to hover.
  const small = size === 'sm';
  const hoverClasses = disabled ? '' : small ? 'group' : 'group hover-grow';
  const grow = small ? 'sm' : undefined;

  const face =
    variant === 'primary' ? (
      <ChamferFrame
        as="span"
        size="md"
        grow={grow}
        borderClassName="bg-accent transition-colors group-hover:bg-accent-soft"
        innerClassName={`text-center text-space-950 ${sizeClasses[size]}`}
      >
        {children}
      </ChamferFrame>
    ) : (
      <ChamferFrame
        as="span"
        size="md"
        grow={grow}
        borderClassName="bg-accent/60 transition-colors group-hover:bg-accent"
        innerClassName={`bg-panel text-center text-accent transition-colors group-hover:bg-accent-deep ${sizeClasses[size]}`}
      >
        {children}
      </ChamferFrame>
    );

  if (to) {
    return (
      <Link to={to} className={`${outerClasses} ${hoverClasses} ${className}`}>
        {face}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${outerClasses} ${hoverClasses} ${className}`}
    >
      {face}
    </button>
  );
}
