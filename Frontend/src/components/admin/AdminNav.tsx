import { useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useNavHeight } from '../../hooks/useNavHeight';
import { initials } from '../../utils/format';
import NavTab from '../layout/NavTab';
import ChamferFrame from '../ui/ChamferFrame';

const tabs = [
  { to: '/admin/quests', label: 'Quests' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/ai', label: 'AI' },
];

// The admin console's top bar. Replaces the pilot nav while inside /admin:
// admin tabs in the middle, and Exit Admin to go back to the Galaxy Map.
export default function AdminNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  useNavHeight(headerRef);

  return (
    <header ref={headerRef} className="border-b border-line/60">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
        <Link
          to="/admin/quests"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span className="font-display text-xl font-bold tracking-[0.2em]">QUESTACK</span>
          <ChamferFrame
            as="span"
            size="sm"
            borderClassName="bg-swarm/70"
            innerClassName="bg-space-950 px-3 py-0.5 font-display text-xs font-semibold tracking-[0.2em] text-swarm uppercase"
          >
            Admin
          </ChamferFrame>
        </Link>

        <nav
          aria-label="Admin"
          className="order-last flex w-full flex-wrap justify-center gap-2 md:order-none md:w-auto md:flex-1"
        >
          {tabs.map((tab) => (
            <NavTab key={tab.to} to={tab.to} active={pathname === tab.to || pathname.startsWith(`${tab.to}/`)}>
              {tab.label}
            </NavTab>
          ))}
          <NavTab to="/" active={false}>
            Exit Admin
          </NavTab>
        </nav>

        {user && (
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-sm text-slate-300 sm:block">
              Signed in as <span className="text-slate-100">{user.username}</span>
            </p>
            <ChamferFrame size="sm" innerClassName="grid size-10 place-items-center bg-panel font-display text-sm font-semibold">
              <span aria-hidden="true">{initials(user.username)}</span>
              <span className="sr-only sm:hidden">Signed in as {user.username}</span>
            </ChamferFrame>
          </div>
        )}
      </div>
    </header>
  );
}
