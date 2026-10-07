import { useLayoutEffect, useRef, type Ref } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { usePilot } from '../../hooks/usePilot';
import { formatNumber, initials } from '../../utils/format';
import ChamferFrame from '../ui/ChamferFrame';
import ProgressBar from '../ui/ProgressBar';
import { BoltIcon, HomeIcon, SignOutIcon } from '../ui/icons';

// `within` lists the screens that live inside a tab, so Galaxy Map stays lit
// while the pilot is in a sector or on a quest
const tabs = [
  { to: '/', label: 'Galaxy Map', within: ['/sector/', '/quest/', '/decoder'] },
  { to: '/profile', label: 'Profile', within: [] },
  { to: '/settings', label: 'Settings', within: [] },
];

interface TopNavProps {
  // A page (the Quest screen) can portal its own controls into the middle of
  // the bar; while it does, the tabs are hidden. See context/NavSlotContext.ts
  slotRef: Ref<HTMLDivElement>;
  slotInUse: boolean;
}

export default function TopNav({ slotRef, slotInUse }: TopNavProps) {
  const { pilot } = usePilot();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }
  const headerRef = useRef<HTMLElement>(null);

  // Publish the bar's height as --nav-h so full-height screens can fill the rest
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--nav-h', `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

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
          {tabs.map((tab) => {
            const isActive = pathname === tab.to || tab.within.some((prefix) => pathname.startsWith(prefix));
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <ChamferFrame
                  size="md"
                  grow="sm"
                  borderClassName={isActive ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
                  innerClassName={`px-4 py-2 font-display text-xs font-semibold tracking-[0.2em] uppercase sm:px-8 ${
                    isActive ? 'bg-accent-deep text-accent' : 'bg-space-950 text-slate-300 group-hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </ChamferFrame>
              </Link>
            );
          })}
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

            <div className="hidden text-right sm:block">
              <p className="font-display text-sm font-semibold tracking-[0.2em] uppercase">
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
              size="sm"
              innerClassName="grid size-10 place-items-center bg-panel font-display text-sm font-semibold"
            >
              <span aria-hidden="true">{initials(pilot.callsign)}</span>
              <span className="sr-only">Signed in as {pilot.callsign}</span>
            </ChamferFrame>

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
