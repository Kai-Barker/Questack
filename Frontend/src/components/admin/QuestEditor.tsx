import { useEffect, useId, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router';
import { createQuest, deleteQuest, updateQuest } from '../../services/adminService';
import type { AdminQuest, AdminQuestSummary, AdminSector, EditableChallengeType, QuestStatus } from '../../types/admin';
import {
  newObjective,
  newQuestDraft,
  OBJECTIVE_TYPES,
  objectiveErrors,
  sameQuest,
  toDraft,
  toInput,
  type ObjectiveDraft,
  type QuestDraft,
} from '../../utils/adminQuest';
import { toRequestFailure } from '../../utils/requestFailure';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import Dropdown from '../ui/Dropdown';
import ConfirmDialog from './ConfirmDialog';
import ObjectiveCard from './ObjectiveCard';
import QuestDetailsForm from './QuestDetailsForm';
import QuestPreviewDialog from './QuestPreviewDialog';

const statusOptions: { value: QuestStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

interface QuestEditorProps {
  original: AdminQuest | null; // null for a new quest
  defaultLanguageId: number; // a new quest starts in the sector being browsed
  sectors: AdminSector[];
  quests: AdminQuestSummary[];
  initialNotice?: string;
  onSaved: (quest: AdminQuest, notice: string, created: boolean) => void;
  onDeleted: (questId: number) => void;
}

// Edits one quest. Nothing reaches the backend until Save; leaving with
// unsaved changes asks first. The backend validates everything again (and
// checks for circular prerequisites), and its messages are shown on the fields.
export default function QuestEditor({
  original,
  defaultLanguageId,
  sectors,
  quests,
  initialNotice,
  onSaved,
  onDeleted,
}: QuestEditorProps) {
  const navigate = useNavigate();
  const headingId = useId();
  const objectivesId = useId();

  const [saved, setSaved] = useState<QuestDraft>(() => (original ? toDraft(original) : newQuestDraft(defaultLanguageId)));
  const [draft, setDraft] = useState<QuestDraft>(saved);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(saved.objectives.length === 1 ? [saved.objectives[0]!.key] : []),
  );
  const [newType, setNewType] = useState<EditableChallengeType>('read_and_explain');
  // The objective last clicked, focused, opened or added: the only one outlined in cyan
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Where to go once the state below has settled (after creating or deleting)
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  const dirty = !sameQuest(draft, saved);
  const isNew = saved.questId === null;
  const sector = sectors.find((s) => s.languageId === draft.languageId);
  const sectorName = sector?.displayName ?? 'Unknown';

  // Ask before leaving the quest (another quest, another tab, Exit Admin)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );

  // And before closing or reloading the page
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Runs after the render where the form stopped being dirty, so the guard lets it through
  useEffect(() => {
    if (leaveTo !== null) navigate({ search: leaveTo }, { replace: true });
  }, [leaveTo, navigate]);

  function change(patch: Partial<QuestDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setNotice(null);
  }

  function changeObjective(key: string, patch: Partial<ObjectiveDraft>) {
    change({ objectives: draft.objectives.map((o) => (o.key === key ? { ...o, ...patch } : o)) });
  }

  function addObjective() {
    const objective = newObjective(newType);
    change({ objectives: [...draft.objectives, objective] });
    setExpanded((keys) => new Set([...keys, objective.key]));
    setActiveKey(objective.key);
  }

  function moveObjective(index: number, direction: -1 | 1) {
    const objectives = [...draft.objectives];
    const target = index + direction;
    [objectives[index], objectives[target]] = [objectives[target]!, objectives[index]!];
    change({ objectives });
    // Messages are keyed by position, so they no longer line up
    setErrors({});
  }

  function removeObjective(key: string) {
    change({ objectives: draft.objectives.filter((o) => o.key !== key) });
    setErrors({});
  }

  function toggle(key: string) {
    setActiveKey(key);
    setExpanded((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setFailure(null);
    setNotice(null);
    try {
      const input = toInput(draft);
      const quest = isNew ? await createQuest(input) : await updateQuest(saved.questId!, input);
      const next = toDraft(quest);
      // Same objectives in the same order: keep their keys, so open cards stay open
      next.objectives = next.objectives.map((o, i) => ({ ...o, key: draft.objectives[i]?.key ?? o.key }));
      const message =
        quest.status === 'published' ? 'Quest saved. It’s live for pilots now.' : 'Draft saved. Pilots can’t see it yet.';
      setSaved(next);
      setDraft(next);
      setErrors({});
      setNotice(message);
      onSaved(quest, message, isNew);
      if (isNew) setLeaveTo(`?quest=${quest.questId}`);
    } catch (err) {
      const result = toRequestFailure(err);
      setErrors(result.fields);
      setFailure(result.message);
      const withErrors = draft.objectives.filter((_, i) => Object.keys(objectiveErrors(result.fields, i)).length > 0);
      if (withErrors.length > 0) setExpanded((keys) => new Set([...keys, ...withErrors.map((o) => o.key)]));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (saved.questId === null) return;
    setDeleting(true);
    try {
      await deleteQuest(saved.questId);
      onDeleted(saved.questId);
      setDraft(saved); // nothing left to lose
      setLeaveTo('');
    } catch (err) {
      setFailure(toRequestFailure(err).message);
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const unpublishing = saved.status === 'published' && draft.status === 'draft';

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">
            Quests <span aria-hidden="true">›</span> <span className="sr-only">in</span> {sectorName} Sector
          </p>
          <h1 id={headingId} className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">
            {isNew ? 'New quest' : `Edit quest: ${saved.title}`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {dirty && <span className="text-xs text-swarm">Unsaved changes</span>}
          <div role="group" aria-label="Visibility" className="flex gap-1.5">
            {statusOptions.map((option) => {
              const active = draft.status === option.value;
              const published = option.value === 'published';
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => change({ status: option.value })}
                  className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <ChamferFrame
                    as="span"
                    size="md"
                    borderClassName={active ? (published ? 'bg-buff/70' : 'bg-slate-400/70') : 'bg-line group-hover:bg-line-bright'}
                    innerClassName={`px-4 py-2.5 font-display text-xs font-semibold tracking-[0.2em] uppercase ${
                      active ? (published ? 'bg-buff-deep text-buff' : 'bg-panel-raised text-slate-100') : 'bg-space-950 text-muted'
                    }`}
                  >
                    {option.label}
                  </ChamferFrame>
                </button>
              );
            })}
          </div>
          {!isNew && saved.status === 'draft' && (
            <Button variant="outline" onClick={() => setConfirmingDelete(true)} disabled={saving}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => setPreviewing(true)}>
            Preview
          </Button>
          <Button onClick={save} disabled={saving || (!dirty && !isNew)}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      {unpublishing && (
        <p className="text-sm text-slate-300">
          Saving as a draft hides this quest from pilots. Their progress and XP are kept.
        </p>
      )}
      {failure && (
        <ChamferFrame size="md" borderClassName="bg-swarm/60" innerClassName="bg-space-950 px-4 py-3 text-sm text-swarm">
          <p role="alert">{failure}</p>
        </ChamferFrame>
      )}
      <p role="status" className={notice ? 'text-sm text-buff' : 'sr-only'}>
        {notice}
      </p>

      <QuestDetailsForm draft={draft} sectors={sectors} quests={quests} errors={errors} onChange={change} />

      <section aria-labelledby={objectivesId} className="chamfer bg-line p-px">
        <div className="chamfer bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={objectivesId} className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Objectives ({draft.objectives.length})
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {/* The dropdown fills its box, so the box sets the width */}
              <div className="w-60">
                <Dropdown
                  id={`${objectivesId}-type`}
                  value={newType}
                  options={OBJECTIVE_TYPES}
                  onChange={setNewType}
                  ariaLabel="Type of objective to add"
                />
              </div>
              <Button onClick={addObjective}>+ Add objective</Button>
            </div>
          </div>

          {errors.objectives && <p className="mt-3 text-xs text-swarm">{errors.objectives}</p>}

          {draft.objectives.length === 0 ? (
            <p className="mt-5 text-sm text-muted">
              No objectives yet. Pick a type and add one: a quest needs at least one before it can be published.
            </p>
          ) : (
            <ol className="mt-5 space-y-3">
              {draft.objectives.map((objective, index) => (
                <ObjectiveCard
                  key={objective.key}
                  index={index}
                  count={draft.objectives.length}
                  objective={objective}
                  language={sectorName}
                  expanded={expanded.has(objective.key)}
                  active={activeKey === objective.key}
                  errors={objectiveErrors(errors, index)}
                  onActivate={() => setActiveKey(objective.key)}
                  onToggle={() => toggle(objective.key)}
                  onChange={(patch) => changeObjective(objective.key, patch)}
                  onMove={(direction) => moveObjective(index, direction)}
                  onRemove={() => removeObjective(objective.key)}
                />
              ))}
            </ol>
          )}
          {!isNew && (
            <p className="mt-4 text-xs text-muted">
              Removing a saved objective also removes pilots’ answers to it when you save.
            </p>
          )}
        </div>
      </section>

      {previewing && <QuestPreviewDialog draft={draft} sectorName={sectorName} onClose={() => setPreviewing(false)} />}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this draft?"
          confirmLabel={deleting ? 'Deleting…' : 'Delete draft'}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        >
          <p>
            “{saved.title}” and its objectives will be removed for good. Published quests can’t be deleted: move them
            to draft to hide them instead.
          </p>
        </ConfirmDialog>
      )}

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Discard changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        >
          <p>This quest has unsaved changes. Leaving now throws them away.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
