import type { ReactNode } from 'react';
import type { PilotProfile } from '../../types/profile';
import ChamferFrame from '../ui/ChamferFrame';
import Panel from '../ui/Panel';
import ProgressBar from '../ui/ProgressBar';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="font-display text-xs tracking-[0.2em] text-muted uppercase">{label}</dt>
      <dd className="text-right font-display text-sm font-semibold whitespace-nowrap">{children}</dd>
    </div>
  );
}

interface ServiceRecordProps {
  profile: PilotProfile;
  onChangeGoal: () => void;
}

export default function ServiceRecord({ profile, onChangeGoal }: ServiceRecordProps) {
  const { goal, flightLog } = profile;

  return (
    <Panel label="Service record">
      <dl className="mt-3">
        <Row label="Home sector">{profile.homeSector ?? '—'}</Row>
        <Row label="Current rank">
          <span className="tracking-[0.15em] uppercase">{profile.rank}</span>
        </Row>
        <Row label="Longest streak">
          {flightLog.longestStreak} {flightLog.longestStreak === 1 ? 'day' : 'days'}
        </Row>
        <Row label="Favourite objective">{profile.favouriteObjective ?? '—'}</Row>
      </dl>

      <ChamferFrame size="md" className="mt-4" innerClassName="bg-space-950 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xs tracking-[0.2em] text-muted uppercase">Current goal</h3>
          <button
            type="button"
            onClick={onChangeGoal}
            className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {goal ? 'Change' : 'Set goal'}
            <span className="sr-only"> current goal</span>
          </button>
        </div>
        {goal ? (
          <>
            <p className="mt-1 font-display text-sm font-semibold tracking-[0.1em] uppercase">
              Clear the {goal.displayName} Sector
            </p>
            <ProgressBar
              value={goal.questsCleared}
              max={goal.questsTotal}
              label={`Progress towards clearing the ${goal.displayName} Sector`}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted">
              {goal.questsCleared} / {goal.questsTotal} quests cleared
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Pick a sector to work towards clearing.</p>
        )}
      </ChamferFrame>
    </Panel>
  );
}
