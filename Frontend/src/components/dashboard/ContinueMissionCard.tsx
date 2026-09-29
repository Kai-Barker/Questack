import type { ContinueMission } from '../../types/dashboard';
import { capitalise } from '../../utils/format';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import ProgressBar from '../ui/ProgressBar';

export default function ContinueMissionCard({ mission }: { mission: ContinueMission | null }) {
  if (!mission) {
    return (
      <Panel label="Continue mission">
        <p className="mt-3 text-sm text-slate-300">No active mission. Pick a sector on the map to deploy.</p>
      </Panel>
    );
  }

  return (
    <Panel label="Continue mission">
      <h3 className="mt-3 font-display text-xl font-semibold">{mission.title}</h3>
      <p className="mt-1 text-xs text-muted">
        {mission.sectorDisplayName} Sector · {mission.concept} · {capitalise(mission.difficulty)}
      </p>
      <ProgressBar
        value={mission.objectivesCompleted}
        max={mission.objectivesTotal}
        label="Objectives completed"
        className="mt-4"
      />
      <p className="mt-2 font-display text-xs tracking-[0.2em] text-muted uppercase">
        {mission.objectivesCompleted} of {mission.objectivesTotal} objectives
      </p>
      <Button to={`/quest/${mission.questId}`} className="mt-4 w-full">
        Resume
      </Button>
    </Panel>
  );
}
