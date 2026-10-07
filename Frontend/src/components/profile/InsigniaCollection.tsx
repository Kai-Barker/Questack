import { useState } from 'react';
import type { Insignia } from '../../types/profile';
import Panel from '../ui/Panel';
import AllInsigniaDialog from './AllInsigniaDialog';
import InsigniaBadge, { InsigniaStatus } from './InsigniaBadge';

// How many insignia the panel shows; "View all" lists every one
const PREVIEW_COUNT = 8;

const linkButton =
  'font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

interface InsigniaCollectionProps {
  insignia: Insignia[];
  featuredIds: number[];
  onChooseFeatured: () => void;
}

export default function InsigniaCollection({ insignia, featuredIds, onChooseFeatured }: InsigniaCollectionProps) {
  const [showAll, setShowAll] = useState(false);
  const earnedCount = insignia.filter((i) => i.earned).length;
  // Earned first, so once the collection outgrows the panel it still shows off what the pilot has
  const preview = [...insignia].sort((a, b) => Number(b.earned) - Number(a.earned)).slice(0, PREVIEW_COUNT);

  return (
    <Panel label="Insignia collection">
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-muted">
          {earnedCount} of {insignia.length} earned · choose up to 3 to feature
        </p>
        <div className="flex gap-5">
          <button type="button" onClick={onChooseFeatured} className={linkButton}>
            Choose featured
          </button>
          <button type="button" onClick={() => setShowAll(true)} className={linkButton}>
            View all <span className="text-muted">({insignia.length})</span>
          </button>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-x-2 gap-y-5 min-[480px]:grid-cols-4 2xl:grid-cols-8">
        {preview.map((item) => (
          <li key={item.rewardId} className="flex flex-col items-center gap-2 text-center">
            <InsigniaBadge code={item.code} earned={item.earned} />
            <span
              className={`font-display text-xs leading-tight font-semibold tracking-[0.12em] uppercase ${
                item.earned ? 'text-slate-100' : 'text-muted'
              }`}
            >
              {item.name}
            </span>
            <InsigniaStatus earned={item.earned} featured={featuredIds.includes(item.rewardId)} />
          </li>
        ))}
      </ul>

      {showAll && <AllInsigniaDialog insignia={insignia} featuredIds={featuredIds} onClose={() => setShowAll(false)} />}
    </Panel>
  );
}
