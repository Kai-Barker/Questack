import { Link } from 'react-router';
import type { SectorDetail } from '../../types/sector';
import ProgressBar from '../ui/ProgressBar';
import RankSelector from './RankSelector';

export default function SectorHeader({ sector }: { sector: SectorDetail }) {
  const cleared = sector.quests.filter((q) => q.cleared).length;
  const total = sector.quests.length;

  return (
    // On laptop widths the rank selector never wraps; if space runs short the
    // progress bar drops under the title instead
    <header>
      <div className="flex flex-wrap items-end justify-between gap-6 lg:flex-nowrap">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted uppercase">
              <li>
                <Link
                  to="/"
                  className="hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Galaxy map
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="text-slate-300">
                {sector.displayName} Sector
              </li>
            </ol>
          </nav>

          <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
            <h1 className="font-display text-3xl font-bold tracking-[0.1em] whitespace-nowrap uppercase">
              {sector.displayName} Sector
              {/* The real term next to the themed name, so beginners know what the sector is */}
              <span className="ml-3 text-base font-medium tracking-normal text-muted normal-case">
                {sector.displayName}
              </span>
            </h1>
            <div className="w-52 pb-1">
              <p className="font-display text-xs tracking-[0.2em] text-slate-300 uppercase">
                {cleared} of {total} quests cleared
              </p>
              <ProgressBar
                value={cleared}
                max={total}
                label={`${sector.displayName} quests cleared`}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <RankSelector languageId={sector.languageId} initialRank={sector.proficiencyLevel} />
        </div>
      </div>
    </header>
  );
}
