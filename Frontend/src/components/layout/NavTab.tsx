import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ChamferFrame from '../ui/ChamferFrame';

interface NavTabProps {
  to: string;
  active: boolean;
  children: ReactNode;
}

// One tab in a top bar (the pilot nav and the admin nav)
export default function NavTab({ to, active, children }: NavTabProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ChamferFrame
        size="md"
        grow="sm"
        borderClassName={active ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
        innerClassName={`px-4 py-2 font-display text-xs font-semibold tracking-[0.2em] uppercase sm:px-8 ${
          active ? 'bg-accent-deep text-accent' : 'bg-space-950 text-slate-300 group-hover:text-slate-100'
        }`}
      >
        {children}
      </ChamferFrame>
    </Link>
  );
}
