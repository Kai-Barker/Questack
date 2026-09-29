import type { ReactNode } from 'react';
import type { PilotSummary } from '../../types/pilot';
import { formatNumber } from '../../utils/format';
import Panel from '../ui/Panel';
import ProgressBar from '../ui/ProgressBar';

function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="font-display text-xs tracking-[0.2em] text-muted uppercase">{label}</dt>
      <dd className="font-display text-base font-semibold whitespace-nowrap">{children}</dd>
    </div>
  );
}

export default function PilotStatusPanel({ pilot }: { pilot: PilotSummary }) {
  const streak = pilot.currentStreak;

  return (
    <Panel label="Pilot status">
      <dl className="mt-3">
        <StatRow label="Rank">
          <span className="tracking-[0.15em] uppercase">{pilot.rank}</span>
        </StatRow>
        <StatRow label="Level">{pilot.level}</StatRow>
        <div className="pb-2">
          <ProgressBar value={pilot.levelXp} max={pilot.levelXpRequired} label={`XP to level ${pilot.level + 1}`} />
          <p className="mt-1.5 text-xs text-muted">
            {formatNumber(pilot.levelXp)} / {formatNumber(pilot.levelXpRequired)} XP to level {pilot.level + 1}
          </p>
        </div>
        {streak !== undefined && (
          <StatRow label="Deployment streak">
            <span className="tracking-[0.1em] text-accent uppercase">
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          </StatRow>
        )}
        <StatRow label="Quests cleared">{pilot.questsCleared}</StatRow>
        <StatRow label="Sectors enlisted">{pilot.sectorsEnlisted}</StatRow>
      </dl>
    </Panel>
  );
}
