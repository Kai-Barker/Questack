import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router';
import galaxyTexture from '../../assets/GalaxyTexture.webp';
import { UplinkContext, type Uplink } from '../../hooks/useUplink';
import { getHealth } from '../../services/healthService';
import LogoMark from '../ui/LogoMark';
import OrbitalRings from './OrbitalRings';

const uplinkLabels: Record<Uplink, { text: string; dot: string }> = {
  checking: { text: 'Connecting', dot: 'bg-muted motion-safe:animate-pulse' },
  online: { text: 'Online', dot: 'bg-accent' },
  degraded: { text: 'Degraded', dot: 'bg-swarm' },
  offline: { text: 'Offline', dot: 'bg-swarm' },
};

// Page frame for the signed-out screens (login, enlist, recovery): the galaxy
// backdrop, the wordmark and the network status. Pages render inside <Outlet />.
export default function AuthShell() {
  const [uplink, setUplink] = useState<Uplink>('checking');

  useEffect(() => {
    let cancelled = false;
    getHealth().then(
      (health) => {
        if (!cancelled) setUplink(health.status === 'ok' ? 'online' : 'degraded');
      },
      () => {
        if (!cancelled) setUplink('offline');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const label = uplinkLabels[uplink];

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-space-950 text-slate-100">
      {/* Starfield backdrop, dimmed so the forms stay readable */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${galaxyTexture})` }}
      />
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-space-950/75" />
      <OrbitalRings />

      <header className="flex items-center justify-between gap-4 px-5 py-6 sm:px-12">
        <Link
          to="/login"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <LogoMark size={36} />
          <span className="font-display text-xl font-bold tracking-[0.2em]">QUESTACK</span>
        </Link>
        <p className="flex items-center gap-2 font-mono text-xs tracking-[0.15em] text-slate-300 uppercase">
          <span aria-hidden="true" className={`size-2 rounded-full ${label.dot}`} />
          <span className="hidden sm:inline">Sector network /</span> {label.text}
        </p>
      </header>

      <main className="flex justify-center px-4 pt-6 pb-16 sm:px-8 sm:pt-14">
        <UplinkContext value={uplink}>
          <Outlet />
        </UplinkContext>
      </main>
    </div>
  );
}
