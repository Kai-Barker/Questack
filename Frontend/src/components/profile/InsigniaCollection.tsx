import { useState } from 'react';
import { useInsigniaFeaturing } from '../../hooks/useInsigniaFeaturing';
import type { Insignia } from '../../types/profile';
import Panel from '../ui/Panel';
import AllInsigniaDialog from './AllInsigniaDialog';
import FeatureInsigniaBar from './FeatureInsigniaBar';
import InsigniaBadge, { InsigniaStatus } from './InsigniaBadge';

// How many insignia the panel shows; "View all" lists every one
const PREVIEW_COUNT = 8;

const linkButton =
  'font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

interface InsigniaCollectionProps {
  insignia: Insignia[];
  featuredIds: number[];
  onChooseFeatured: () => void;
  onSetFeatured: (featuredIds: number[]) => Promise<void>;
}

// Clicking an insignia features it (or offers which featured one to replace)
export default function InsigniaCollection({ insignia, featuredIds, onChooseFeatured, onSetFeatured }: InsigniaCollectionProps) {
  const [showAll, setShowAll] = useState(false);
  const featuring = useInsigniaFeaturing(featuredIds, onSetFeatured);
  const earnedCount = insignia.filter((i) => i.earned).length;
  // Earned first, so once the collection outgrows the panel it still shows off what the pilot has
  const preview = [...insignia].sort((a, b) => Number(b.earned) - Number(a.earned)).slice(0, PREVIEW_COUNT);

  return (
    <Panel label="Insignia collection">
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-muted">
          {earnedCount} of {insignia.length} earned · click an insignia to feature it (up to 3)
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
          <li key={item.rewardId}>
            <button
              type="button"
              onClick={() => featuring.choose(item)}
              aria-pressed={featuring.selected?.rewardId === item.rewardId}
              className="group flex w-full flex-col items-center gap-2 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span className="transition-transform group-hover:scale-105 motion-reduce:transition-none">
                <InsigniaBadge code={item.code} earned={item.earned} />
              </span>
              <span
                className={`font-display text-xs leading-tight font-semibold tracking-[0.12em] uppercase ${
                  item.earned ? 'text-slate-100 group-hover:text-accent' : 'text-muted'
                }`}
              >
                {item.name}
              </span>
              <InsigniaStatus earned={item.earned} featured={featuredIds.includes(item.rewardId)} />
            </button>
          </li>
        ))}
      </ul>

      <FeatureInsigniaBar insignia={insignia} featuredIds={featuredIds} featuring={featuring} />

      {showAll && (
        <AllInsigniaDialog
          insignia={insignia}
          featuredIds={featuredIds}
          onSetFeatured={onSetFeatured}
          onClose={() => setShowAll(false)}
        />
      )}
    </Panel>
  );
}
