import { Link } from 'react-router';
import type { SectorProgress } from '../../types/profile';
import Panel from '../ui/Panel';
import ProgressBar from '../ui/ProgressBar';

export default function SectorProgressPanel({ sectors }: { sectors: SectorProgress[] }) {
  return (
    <Panel label="Sector progress">
      <ul className="mt-4 space-y-5">
        {sectors.map((sector) => (
          <li key={sector.languageId}>
            <div className="flex items-baseline justify-between gap-3">
              <Link
                to={`/sector/${sector.languageId}`}
                className="font-display text-sm font-semibold tracking-[0.15em] uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {sector.displayName} Sector
              </Link>
              <span className="font-display text-xs tracking-[0.2em] whitespace-nowrap text-muted uppercase">
                {sector.proficiencyLevel}
              </span>
            </div>
            <ProgressBar
              value={sector.questsCleared}
              max={sector.questsTotal}
              label={`${sector.displayName} quests cleared`}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted">
              {sector.questsCleared} / {sector.questsTotal} quests cleared
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
