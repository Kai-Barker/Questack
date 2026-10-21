import { useId, useRef } from 'react';
import { useInsigniaFeaturing } from '../../hooks/useInsigniaFeaturing';
import { useModalDialog } from '../../hooks/useModalDialog';
import type { Insignia } from '../../types/profile';
import ChamferFrame from '../ui/ChamferFrame';
import { CloseIcon } from '../ui/icons';
import FeatureInsigniaBar from './FeatureInsigniaBar';
import InsigniaBadge, { InsigniaStatus } from './InsigniaBadge';

interface AllInsigniaDialogProps {
  insignia: Insignia[];
  featuredIds: number[];
  onSetFeatured: (featuredIds: number[]) => Promise<void>;
  onClose: () => void;
}

// Every insignia with how to earn it, earned ones first. Clicking one
// features it, as on the Profile.
export default function AllInsigniaDialog({ insignia, featuredIds, onSetFeatured, onClose }: AllInsigniaDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const featuring = useInsigniaFeaturing(featuredIds, onSetFeatured);

  useModalDialog(dialogRef);

  const earned = insignia.filter((i) => i.earned);
  const groups = [
    { label: 'Earned', items: earned },
    { label: 'Locked', items: insignia.filter((i) => !i.earned) },
  ].filter((group) => group.items.length > 0);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl bg-transparent p-0 text-slate-100 backdrop:bg-space-950/80 backdrop:backdrop-blur-[2px]"
    >
      <ChamferFrame size="lg" borderClassName="bg-accent/70" innerClassName="max-h-[90dvh] overflow-y-auto bg-panel px-5 py-6 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent uppercase">Pilot profile</p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold tracking-[0.1em] uppercase">
              Insignia collection
            </h2>
            <p className="mt-1 text-xs text-muted">
              {earned.length} of {insignia.length} earned · click one to feature it
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-xl text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <FeatureInsigniaBar insignia={insignia} featuredIds={featuredIds} featuring={featuring} />

        {groups.map((group) => (
          <section key={group.label} className="mt-6">
            <h3 className="font-display text-xs tracking-[0.2em] text-muted uppercase">
              {group.label} · {group.items.length}
            </h3>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.rewardId}>
                  <button
                    type="button"
                    onClick={() => featuring.choose(item)}
                    aria-pressed={featuring.selected?.rewardId === item.rewardId}
                    className="group block h-full w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <ChamferFrame
                      as="span"
                      size="md"
                      grow="sm"
                      className="h-full"
                      borderClassName={
                        featuredIds.includes(item.rewardId) ? 'bg-accent/60' : 'bg-line group-hover:bg-line-bright'
                      }
                      innerClassName={`flex items-center gap-3 px-3 py-3 ${item.earned ? 'bg-space-950' : 'bg-panel'}`}
                    >
                      <InsigniaBadge code={item.code} earned={item.earned} size="sm" />
                      {/* Spans, not divs: this sits inside a button */}
                      <span className="block min-w-0">
                        <span
                          className={`block font-display text-sm font-semibold tracking-[0.1em] uppercase ${
                            item.earned ? 'text-slate-100' : 'text-muted'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="block text-xs text-muted">{item.description}</span>
                        <InsigniaStatus
                          earned={item.earned}
                          featured={featuredIds.includes(item.rewardId)}
                          align="start"
                          className="mt-1"
                        />
                      </span>
                    </ChamferFrame>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </ChamferFrame>
    </dialog>
  );
}
