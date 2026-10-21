import type { InsigniaFeaturing } from '../../hooks/useInsigniaFeaturing';
import type { Insignia } from '../../types/profile';
import ChamferFrame from '../ui/ChamferFrame';
import InsigniaBadge from './InsigniaBadge';

const linkButton =
  'font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

interface FeatureInsigniaBarProps {
  insignia: Insignia[];
  featuredIds: number[];
  featuring: InsigniaFeaturing;
}

// What happens after clicking an insignia: pick a featured one to replace,
// remove it from featured, or see how to earn it. Also confirms a change.
export default function FeatureInsigniaBar({ insignia, featuredIds, featuring }: FeatureInsigniaBarProps) {
  const { selected, status, saving } = featuring;

  if (!selected) {
    if (!status && !saving) return null;
    return (
      <p
        role="status"
        className={`mt-5 border-l-2 px-4 py-2 text-sm ${
          status?.tone === 'error' ? 'border-swarm text-swarm' : 'border-buff bg-buff-deep/60 text-slate-200'
        }`}
      >
        {saving ? 'Updating featured insignia…' : status?.text}
      </p>
    );
  }

  const featured = featuredIds.flatMap((id) => insignia.find((i) => i.rewardId === id) ?? []);
  const isFeatured = featuredIds.includes(selected.rewardId);

  return (
    <ChamferFrame size="md" className="mt-5" borderClassName="bg-accent/50" innerClassName="bg-space-950 px-4 py-4">
      <div role="region" aria-label={`${selected.name} insignia`}>
        {!selected.earned ? (
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{selected.name}</span> isn't earned yet. {selected.description}
          </p>
        ) : isFeatured ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="min-w-0 flex-1 text-sm text-slate-300">
              <span className="font-semibold text-slate-100">{selected.name}</span> is featured in slot{' '}
              {featuredIds.indexOf(selected.rewardId) + 1}.
            </p>
            <button type="button" onClick={featuring.remove} disabled={saving} className={linkButton}>
              Remove from featured
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-300">
              All three slots are taken. Which featured insignia should{' '}
              <span className="font-semibold text-slate-100">{selected.name}</span> replace?
            </p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {featured.map((item) => (
                <li key={item.rewardId}>
                  <button
                    type="button"
                    onClick={() => featuring.replace(item.rewardId)}
                    disabled={saving}
                    aria-label={`Replace ${item.name}`}
                    className="group flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                  >
                    <InsigniaBadge code={item.code} earned size="xs" />
                    <span className="font-display text-xs font-semibold tracking-[0.12em] uppercase group-hover:text-accent">
                      {item.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {status?.tone === 'error' && <p className="mt-2 text-sm text-swarm">{status.text}</p>}
        <button type="button" onClick={featuring.cancel} className={`${linkButton} mt-3`}>
          {selected.earned ? 'Cancel' : 'Close'}
        </button>
      </div>
    </ChamferFrame>
  );
}
