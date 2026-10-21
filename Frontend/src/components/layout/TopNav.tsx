import { useRef, type Ref } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useNavHeight } from '../../hooks/useNavHeight';
import { usePilot } from '../../hooks/usePilot';
import { formatNumber, initials } from '../../utils/format';
import ChamferFrame from '../ui/ChamferFrame';
import ProgressBar from '../ui/ProgressBar';
import NavTab from './NavTab';
import { BoltIcon, HomeIcon, SignOutIcon } from '../ui/icons';

// `within` lists the screens that live inside a tab, so Galaxy Map stays lit
// while the pilot is in a sector or on a quest
const tabs = [
  { to: '/', label: 'Galaxy Map', within: ['/sector/', '/quest/', '/decoder'] },
  { to: '/profile', label: 'Profile', within: [] },
  { to: '/settings', label: 'Settings', within: [] },
];

// Only added to the bar for admins. Opens the admin console, which has its
// own nav (components/admin/AdminNav.tsx).
const adminTab = { to: '/admin/quests', label: 'Admin', within: ['/admin'] };

interface TopNavProps {
  // A page (the Quest screen) can portal its own controls into the middle of
  // the bar; while it does, the tabs are hidden. See context/NavSlotContext.ts
  slotRef: Ref<HTMLDivElement>;
  slotInUse: boolean;
}

export default function TopNav({ slotRef, slotInUse }: TopNavProps) {
  const { pilot } = usePilot();
  const { user, logout } = useAuth();
  const visibleTabs = user?.role === 'admin' ? [...tabs, adminTab] : tabs;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }
  const headerRef = useRef<HTMLElement>(null);
  useNavHeight(headerRef);

  return (
    <header ref={headerRef} className="border-b border-line/60">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <ChamferFrame size="sm" innerClassName="grid size-9 place-items-center bg-panel text-slate-300">
            <HomeIcon />
          </ChamferFrame>
          <span className="font-display text-xl font-bold tracking-[0.2em]">QUESTACK</span>
        </Link>

        <div
          ref={slotRef}
          className={slotInUse ? 'order-last flex w-full justify-center md:order-none md:w-auto md:flex-1' : 'hidden'}
        />

        <nav
          aria-label="Main"
          className={
            slotInUse ? 'hidden' : 'order-last flex w-full justify-center gap-2 md:order-none md:w-auto md:flex-1'
          }
        >
          {visibleTabs.map((tab) => (
            <NavTab
              key={tab.to}
              to={tab.to}
              active={pathname === tab.to || tab.within.some((prefix) => pathname.startsWith(prefix))}
            >
              {tab.label}
            </NavTab>
          ))}
        </nav>

        {pilot && (
          <div className="ml-auto flex items-center gap-4">
            {/* Only while a booster is activated (on the Profile) */}
            {pilot.activeBooster && (
              <ChamferFrame
                size="sm"
                borderClassName="bg-buff/60"
                innerClassName="flex items-center gap-1.5 bg-buff-deep px-3 py-1.5 font-display text-xs font-semibold tracking-[0.15em] text-buff uppercase"
                className="hidden sm:block"
              >
                <BoltIcon />
                {pilot.activeBooster.xpMultiplier}× XP booster
                <span className="sr-only">: {pilot.activeBooster.name} active</span>
              </ChamferFrame>
            )}

            {/* The pilot's rank, XP and badge open their Profile */}
            <Link
              to="/profile"
              title="Open your profile"
              className="group flex items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <div className="hidden text-right sm:block">
                <p className="font-display text-sm font-semibold tracking-[0.2em] uppercase group-hover:text-accent">
                  {pilot.rank} · Lvl {pilot.level}
                </p>
                <ProgressBar
                  value={pilot.levelXp}
                  max={pilot.levelXpRequired}
                  label={`XP to level ${pilot.level + 1}`}
                  className="mt-1.5 w-40"
                />
                <p className="mt-1 text-xs text-muted">
                  {formatNumber(pilot.levelXp)} / {formatNumber(pilot.levelXpRequired)} XP
                </p>
              </div>

              <ChamferFrame
                as="span"
                size="sm"
                grow="sm"
                borderClassName="bg-line group-hover:bg-accent/70"
                innerClassName="grid size-10 place-items-center bg-panel font-display text-sm font-semibold group-hover:text-accent"
              >
                <span aria-hidden="true">{initials(pilot.callsign)}</span>
                <span className="sr-only">Signed in as {pilot.callsign}</span>
              </ChamferFrame>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChamferFrame
                as="span"
                size="sm"
                grow="sm"
                borderClassName="bg-line group-hover:bg-line-bright"
                innerClassName="grid size-10 place-items-center bg-panel text-lg text-slate-300 group-hover:text-accent"
              >
                <SignOutIcon />
              </ChamferFrame>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
