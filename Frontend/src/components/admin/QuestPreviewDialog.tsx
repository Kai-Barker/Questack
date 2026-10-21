import { useId, useRef } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import { capitalise } from '../../utils/format';
import { objectiveNumber, type QuestDraft } from '../../utils/adminQuest';
import CodeViewer from '../quest/CodeViewer';
import MarkdownBriefing from '../quest/MarkdownBriefing';
import ChamferFrame from '../ui/ChamferFrame';
import { CloseIcon } from '../ui/icons';
import { ObjectiveTypeChip } from './ObjectiveCard';

interface QuestPreviewDialogProps {
  draft: QuestDraft;
  sectorName: string;
  onClose: () => void;
}

function Chip({ children }: { children: string }) {
  return (
    <ChamferFrame
      as="span"
      size="sm"
      innerClassName="bg-panel px-3 py-1 font-display text-[0.65rem] tracking-[0.15em] text-slate-300 uppercase"
    >
      {children}
    </ChamferFrame>
  );
}

// The quest as pilots will see it, from the unsaved form. Answer keys,
// marking criteria and bug lines are left out, as they are for pilots.
export default function QuestPreviewDialog({ draft, sectorName, onClose }: QuestPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useModalDialog(dialogRef);

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
            <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent uppercase">
              Preview · {sectorName} Sector
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold">
              {draft.title.trim() || 'Untitled quest'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-xl text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
            <span className="sr-only">Close preview</span>
          </button>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>{capitalise(draft.difficulty)}</Chip>
          {draft.concept.trim() && <Chip>{draft.concept.trim()}</Chip>}
          <Chip>{draft.isSideQuest ? 'Side quest' : 'Main quest'}</Chip>
          <Chip>{`${draft.xpReward || 0} XP`}</Chip>
        </div>

        <section className="mt-6">
          <h3 className="font-display text-xs tracking-[0.2em] text-muted uppercase">Mission briefing</h3>
          <p className="mt-2 text-sm whitespace-pre-line text-slate-300">
            {draft.storyText.trim() || 'No briefing yet.'}
          </p>
        </section>

        <section className="mt-6">
          <h3 className="font-display text-xs tracking-[0.2em] text-muted uppercase">
            Objectives ({draft.objectives.length})
          </h3>
          {draft.objectives.length === 0 && <p className="mt-2 text-sm text-muted">No objectives yet.</p>}
          <ol className="mt-3 space-y-5">
            {draft.objectives.map((o, i) => (
              <li key={o.key}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-sm font-semibold text-slate-300">{objectiveNumber(i)}</span>
                  <ObjectiveTypeChip type={o.type} />
                </div>
                {o.type === 'briefing' ? (
                  <div className="mt-3 border border-line bg-space-950 px-5 py-4">
                    {o.instructions.trim() ? (
                      <MarkdownBriefing markdown={o.instructions} language={sectorName} fontSize={14} />
                    ) : (
                      <p className="text-sm text-muted">No briefing yet.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm whitespace-pre-line text-slate-200">{o.instructions.trim() || 'No instructions yet.'}</p>
                )}
                {o.type === 'briefing' ? null : o.type === 'decode_transmission' ? (
                  <p className="mt-2 text-xs text-muted">The pilot pastes their own code here.</p>
                ) : (
                  <ChamferFrame size="sm" className="mt-3" innerClassName="bg-space-950">
                    <p className="border-b border-line px-4 py-2 font-mono text-xs text-muted">{o.fileName || 'untitled'}</p>
                    <div className="max-h-72 overflow-auto">
                      <CodeViewer
                        value={o.codeSnippet}
                        language={sectorName}
                        label={`Objective ${objectiveNumber(i)} code`}
                        fontSize={13}
                      />
                    </div>
                  </ChamferFrame>
                )}
              </li>
            ))}
          </ol>
        </section>
      </ChamferFrame>
    </dialog>
  );
}
