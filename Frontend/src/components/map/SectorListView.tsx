import type { SectorSummary } from '../../types/dashboard';
import { capitalise } from '../../utils/format';
import { percent, sectorStatus } from '../../utils/progress';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import ProgressBar from '../ui/ProgressBar';
import { CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';

interface SectorListViewProps {
  sectors: SectorSummary[];
  unchartedCount: number;
}

// Plain list alternative to the galaxy map, for anyone who finds the ring hard to use
export default function SectorListView({ sectors, unchartedCount }: SectorListViewProps) {
  return (
    <ul className="space-y-3">
      {sectors.map((sector) => {
        const status = sectorStatus(sector);
        const cleared = percent(sector.questsCleared, sector.questsTotal);
        const enlisted = sector.proficiencyLevel !== undefined;

        return (
          <li key={sector.languageId}>
            <ChamferFrame
              borderClassName={status === 'cleared' ? 'bg-cleared/50' : 'bg-swarm/30'}
              innerClassName="flex flex-wrap items-center gap-4 bg-panel p-4"
            >
              <span className={`text-xl ${status === 'cleared' ? 'text-accent' : 'text-swarm'}`}>
                {status === 'cleared' ? <CheckIcon /> : <SwarmIcon />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-bold tracking-[0.15em] uppercase">
                  {sector.displayName} Sector
                </h3>
                <p className="text-xs text-muted">
                  {sector.displayName} · {status === 'cleared' ? 'Cleared' : 'Swarm infested'} ·{' '}
                  {sector.proficiencyLevel ? capitalise(sector.proficiencyLevel) : 'Not enlisted'}
                </p>
                <ProgressBar
                  value={sector.questsCleared}
                  max={sector.questsTotal}
                  label={`${sector.displayName} quests cleared`}
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-muted">
                  {sector.questsCleared} / {sector.questsTotal} quests cleared ({cleared}%)
                </p>
              </div>
              <Button variant="outline" to={`/sector/${sector.languageId}`}>
                {enlisted ? 'Enter' : 'Enlist'}
              </Button>
            </ChamferFrame>
          </li>
        );
      })}

      {unchartedCount > 0 && (
        <li>
          <ChamferFrame innerClassName="flex items-center gap-3 bg-panel/60 p-4 text-sm text-muted">
            <LockIcon />
            {unchartedCount} uncharted {unchartedCount === 1 ? 'sector' : 'sectors'}: more languages are on the way
          </ChamferFrame>
        </li>
      )}
    </ul>
  );
}
