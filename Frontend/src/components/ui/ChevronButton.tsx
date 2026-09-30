import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import ChevronShape, { type ChevronKind } from './ChevronShape';

const variants = {
  primary: {
    shape:
      'fill-accent stroke-accent group-hover:fill-accent-soft group-hover:stroke-accent-soft ' +
      'group-focus-visible:stroke-slate-100 group-focus-visible:[stroke-width:2]',
    text: 'text-space-950',
  },
  outline: {
    shape:
      'fill-space-950/60 stroke-accent/70 group-hover:fill-accent-deep group-hover:stroke-accent ' +
      'group-focus-visible:stroke-slate-100 group-focus-visible:[stroke-width:2]',
    text: 'text-accent',
  },
};

// Text padding clears the pointed ends (each is half the button's height)
const padding: Record<ChevronKind, string> = {
  forwardFirst: 'pl-8 pr-12',
  forward: 'px-12',
  backward: 'px-12',
};

interface ChevronButtonProps {
  children: ReactNode;
  variant?: keyof typeof variants;
  kind?: ChevronKind;
  type?: 'button' | 'submit';
  to?: string; // renders a router link instead of a <button>
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

// The angled call-to-action buttons from the login and enlist screens.
// On hover only the drawn shape grows (see ChevronShape's `inflate`), so the
// button's own size never changes and nothing around it moves.
export default function ChevronButton({
  children,
  variant = 'primary',
  kind = variant === 'primary' ? 'forwardFirst' : 'forward',
  type = 'button',
  to,
  onClick,
  disabled = false,
  className = '',
}: ChevronButtonProps) {
  const [hovered, setHovered] = useState(false);
  const style = variants[variant];
  const classes =
    `group relative inline-flex h-12 items-center justify-center font-display text-sm font-semibold ` +
    `tracking-[0.25em] whitespace-nowrap uppercase outline-none ${padding[kind]} ${style.text} ` +
    `${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`;

  const hoverHandlers = {
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
  };
  const content = (
    <>
      <ChevronShape kind={kind} inflate={hovered && !disabled ? 2 : 0} className={style.shape} />
      <span className="relative">{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...hoverHandlers}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} {...hoverHandlers}>
      {content}
    </button>
  );
}
