import { useEffect, useState } from 'react';
import { HOLD_MS, LIFT_MS, SPIN_BOOST, SPIN_HOLD_AFTER_LIFT_MS, SPIN_LEAD_MS } from '../../config/splash';
import type { BootDiagnostic, BootPhase } from '../../hooks/useBootSequence';
import OrbitalRings from '../auth/OrbitalRings';
import ChevronButton from '../ui/ChevronButton';
import GalaxyBackdrop from '../ui/GalaxyBackdrop';
import LogoMark from '../ui/LogoMark';

const diagnosticNotes: Record<BootDiagnostic, string> = {
  backend: 'diagnostic · backend unreachable',
  database: 'diagnostic · database unreachable',
};

interface SplashScreenProps {
  phase: BootPhase;
  progress: number; // 0 to 1
  caption: string;
  diagnostic: BootDiagnostic | null;
  showChoices: boolean; // signed out and ready: show Registered pilot / New recruit
  onRetry: () => void;
  onRegistered: () => void;
  onRecruit: () => void;
}

// The boot screen: logo in its rings, then (after the hold) the hero lifts to
// make room for the loading bar, which gives way to the sign-in choices.
export default function SplashScreen({
  phase,
  progress,
  caption,
  diagnostic,
  showChoices,
  onRetry,
  onRegistered,
  onRecruit,
}: SplashScreenProps) {
  const lifted = phase !== 'hold';
  const percent = Math.round(progress * 100);

  // Rings spin up just before the lift, stay at full speed until just after
  // it, then wind down (the easing lives in OrbitalRings)
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setSpinning(true), Math.max(0, HOLD_MS - SPIN_LEAD_MS)),
      window.setTimeout(() => setSpinning(false), HOLD_MS + LIFT_MS + SPIN_HOLD_AFTER_LIFT_MS),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);
  const ringBoost = spinning ? SPIN_BOOST : 1;

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-space-950 text-slate-100">
      <GalaxyBackdrop deep />

      <main className="relative h-dvh min-h-[34rem]">
        {/* The hero: centred while holding, then lifted and slightly smaller */}
        <div
          className="absolute top-1/2 left-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 flex-col items-center px-4 text-center"
        >
          <div
            className="relative isolate flex flex-col items-center ease-out motion-safe:transition-transform"
            style={{
              transitionDuration: `${LIFT_MS}ms`,
              transform: lifted ? 'translateY(-7.5rem) scale(0.75)' : 'none',
            }}
          >
            <OrbitalRings variant="splash" boost={ringBoost} />
            <LogoMark size={208} className="size-[clamp(7.5rem,30vw,13rem)]" />
            <h1 className="mt-10 pl-[0.2em] font-display text-[clamp(2.5rem,10vw,4.5rem)] leading-none font-bold tracking-[0.2em]">
              QUESTACK
            </h1>
            <p className="mt-7 text-[clamp(1rem,3.5vw,1.375rem)] text-slate-300">
              Stack up your coding skills, one quest at a time.
            </p>
          </div>
        </div>

        {/* Status area under the lifted hero, clear of the main ring: loading bar,
            then choices or an error */}
        <div className="absolute top-[calc(50%+13rem)] left-1/2 w-full max-w-xl -translate-x-1/2 px-6">
          {(phase === 'lifting' || phase === 'loading') && (
            <div className="mx-auto w-full max-w-sm motion-safe:animate-fade-up" style={{ animationDelay: phase === 'lifting' ? `${LIFT_MS / 2}ms` : '0ms' }}>
              <div
                role="progressbar"
                aria-label="Loading Questack"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1 w-full bg-line-bright/60"
              >
                <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
              <p
                role="status"
                className="mt-3 text-center font-display text-xs tracking-[0.2em] text-accent uppercase"
              >
                {caption}
              </p>
            </div>
          )}

          {phase === 'ready' && showChoices && (
            <div className="text-center motion-safe:animate-fade-up">
              <p className="font-mono text-xs tracking-[0.2em] text-slate-300 uppercase">
                &gt; Identify yourself, pilot
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-4">
                <ChevronButton onClick={onRegistered}>Registered pilot</ChevronButton>
                <ChevronButton variant="outline" onClick={onRecruit}>
                  New recruit
                </ChevronButton>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div role="alert" className="text-center motion-safe:animate-fade-up">
              <p className="font-display text-sm font-semibold tracking-[0.2em] text-swarm uppercase">
                Cannot connect to Questack servers
              </p>
              <p className="mt-2 text-sm text-slate-300">Check your connection and try again.</p>
              {diagnostic && (
                <p className="mt-1.5 font-mono text-[0.65rem] tracking-[0.15em] text-muted uppercase">
                  {diagnosticNotes[diagnostic]}
                </p>
              )}
              <ChevronButton variant="outline" onClick={onRetry} className="mt-5">
                Retry uplink
              </ChevronButton>
            </div>
          )}
        </div>

        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-display text-[0.65rem] tracking-[0.2em] whitespace-nowrap text-muted uppercase">
          Questack fleet systems · Build 0.1
        </p>
      </main>
    </div>
  );
}
