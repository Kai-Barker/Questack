import type { PilotProfile } from '../../types/profile';
import { formatNumber } from '../../utils/format';
import ChamferFrame from '../ui/ChamferFrame';

export default function StatTiles({ profile }: { profile: PilotProfile }) {
  const tiles = [
    { label: 'Total XP', value: profile.totalXp },
    { label: 'Quests cleared', value: profile.stats.questsCleared },
    { label: 'Bugs squashed', value: profile.stats.bugsSquashed },
    { label: 'Transmissions decoded', value: profile.stats.transmissionsDecoded },
  ];

  return (
    <ul aria-label="Pilot stats" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.label}>
          {/* Label first in the markup so it's read first; shown under the number */}
          <ChamferFrame size="lg" className="h-full" innerClassName="flex flex-col-reverse justify-end bg-panel px-5 py-4">
            <span className="mt-1 font-display text-xs tracking-[0.2em] text-muted uppercase">{tile.label}</span>
            <span className="font-display text-3xl font-semibold text-slate-100">{formatNumber(tile.value)}</span>
          </ChamferFrame>
        </li>
      ))}
    </ul>
  );
}
