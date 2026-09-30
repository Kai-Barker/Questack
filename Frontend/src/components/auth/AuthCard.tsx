import type { ReactNode } from 'react';
import ChamferFrame from '../ui/ChamferFrame';

// Corner brackets that frame the card, like a targeting reticle
function Brackets() {
  const bracket = 'absolute size-8 border-accent/70';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -inset-3 hidden sm:block">
      <span className={`${bracket} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${bracket} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${bracket} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${bracket} right-0 bottom-0 border-r-2 border-b-2`} />
    </div>
  );
}

interface AuthCardProps {
  tab: string; // e.g. "Pilot authentication"
  badge?: ReactNode; // top-right chip
  aside?: ReactNode; // left column
  status: string; // terminal line under the card
  children: ReactNode;
}

// The framed console card used by every signed-out screen
export default function AuthCard({ tab, badge, aside, status, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-5xl">
      <div className="relative">
        <Brackets />

        {/* The tab and badge sit over the card's top edge */}
        <div className="relative z-10 -mb-6 flex items-end justify-between gap-4 px-4 sm:px-10">
          <ChamferFrame
            size="md"
            borderClassName="bg-accent/60"
            innerClassName="bg-panel-raised px-5 py-3 font-display text-sm font-semibold tracking-[0.2em] uppercase sm:px-7"
          >
            <span aria-hidden="true" className="mr-2 text-accent">
              //
            </span>
            {tab}
          </ChamferFrame>
          {badge && <div className="hidden sm:block">{badge}</div>}
        </div>

        <ChamferFrame size="lg" innerClassName="bg-panel/95 px-5 pt-12 pb-8 backdrop-blur-sm sm:px-10">
          {aside ? (
            <div className="grid gap-10 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-0">
              <div className="order-last md:order-first md:border-r md:border-line md:pr-10">{aside}</div>
              <div className="md:pl-10">{children}</div>
            </div>
          ) : (
            children
          )}
        </ChamferFrame>
      </div>

      {/* Tick ruler and terminal status line */}
      <div
        aria-hidden="true"
        className="mx-4 mt-5 h-2.5 bg-[repeating-linear-gradient(90deg,var(--color-line-bright)_0_1px,transparent_1px_40px)] sm:mx-10"
      />
      <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 font-mono text-xs sm:mx-10">
        <p role="status" aria-live="polite" className="text-slate-300">
          &gt; {status}{' '}
          <span aria-hidden="true" className="text-accent motion-safe:animate-blink">
            ▌
          </span>
        </p>
        <p className="tracking-[0.15em] text-muted uppercase">Questack fleet systems · Build 0.1</p>
      </div>
    </div>
  );
}
