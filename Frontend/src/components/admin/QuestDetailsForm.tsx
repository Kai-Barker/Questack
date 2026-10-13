import { useId } from 'react';
import type { AdminQuestSummary, AdminSector } from '../../types/admin';
import { DIFFICULTIES, type QuestDraft } from '../../utils/adminQuest';
import ChamferFrame from '../ui/ChamferFrame';
import Dropdown from '../ui/Dropdown';
import Panel from '../ui/Panel';
import { CloseIcon } from '../ui/icons';
import { FieldError, fieldLabelClasses, SelectField, SwitchField, TextAreaField, TextField } from './fields';

interface QuestDetailsFormProps {
  draft: QuestDraft;
  sectors: AdminSector[];
  quests: AdminQuestSummary[]; // every quest, to pick prerequisites from
  errors: Record<string, string>;
  onChange: (patch: Partial<QuestDraft>) => void;
}

// The "Quest details" panel: everything about a quest except its objectives
export default function QuestDetailsForm({ draft, sectors, quests, errors, onChange }: QuestDetailsFormProps) {
  const baseId = useId();
  const id = (name: string) => `${baseId}-${name}`;

  // Prerequisites must be in the same sector, and a quest can't need itself.
  // The backend also blocks circular chains when saving.
  const titles = new Map(quests.map((q) => [q.questId, q]));
  const candidates = quests.filter(
    (q) => q.languageId === draft.languageId && q.questId !== draft.questId && !draft.prerequisiteIds.includes(q.questId),
  );
  const prerequisiteError = errors.prerequisiteIds;

  return (
    <Panel label="Quest details">
      <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField
          id={id('sector')}
          label="Sector"
          value={draft.languageId}
          options={sectors.map((s) => ({ value: s.languageId, label: `${s.displayName} Sector` }))}
          // Prerequisites can't cross sectors, so a move clears them
          onChange={(languageId) =>
            onChange({ languageId, ...(languageId !== draft.languageId && { prerequisiteIds: [] }) })
          }
          error={errors.languageId}
        />
        <SelectField
          id={id('difficulty')}
          label="Difficulty"
          value={draft.difficulty}
          options={DIFFICULTIES}
          onChange={(difficulty) => onChange({ difficulty })}
          error={errors.difficulty}
        />
        <TextField
          id={id('xp')}
          label="XP reward"
          type="number"
          inputMode="numeric"
          min={0}
          max={10000}
          step={10}
          value={draft.xpReward}
          onChange={(xpReward) => onChange({ xpReward })}
          error={errors.xpReward}
        />
        <SwitchField
          id={id('side')}
          label="Side quest"
          checked={draft.isSideQuest}
          onChange={(isSideQuest) => onChange({ isSideQuest })}
          onText="Side quest"
          offText="Main quest"
        />

        <TextField
          id={id('title')}
          label="Title"
          value={draft.title}
          onChange={(title) => onChange({ title })}
          maxLength={150}
          error={errors.title}
          className="sm:col-span-2"
        />
        <TextField
          id={id('concept')}
          label="Concept"
          value={draft.concept}
          onChange={(concept) => onChange({ concept })}
          maxLength={100}
          placeholder="e.g. Loops"
          error={errors.concept}
          className="sm:col-span-2"
        />

        <div className="group sm:col-span-2 xl:col-span-4">
          <label id={`${id('prerequisite')}-label`} htmlFor={id('prerequisite')} className={fieldLabelClasses}>
            Prerequisites
          </label>
          <ChamferFrame
            size="sm"
            className="mt-2"
            borderClassName={prerequisiteError ? 'bg-swarm/70' : 'bg-line group-focus-within:bg-accent/70'}
            innerClassName="flex flex-wrap items-center gap-2 bg-space-950 px-2 py-1.5"
          >
            <ul className="contents" aria-label="Chosen prerequisites">
              {draft.prerequisiteIds.map((prerequisiteId) => {
                const title = titles.get(prerequisiteId)?.title ?? `Quest ${prerequisiteId}`;
                return (
                  <li key={prerequisiteId}>
                    <ChamferFrame
                      as="span"
                      size="sm"
                      borderClassName="bg-accent/50"
                      innerClassName="flex items-center gap-2 bg-panel-raised py-1 pr-1.5 pl-3 text-sm"
                    >
                      {title}
                      <button
                        type="button"
                        onClick={() => onChange({ prerequisiteIds: draft.prerequisiteIds.filter((p) => p !== prerequisiteId) })}
                        className="p-0.5 text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <CloseIcon />
                        <span className="sr-only">Remove prerequisite {title}</span>
                      </button>
                    </ChamferFrame>
                  </li>
                );
              })}
            </ul>
            <Dropdown
              id={id('prerequisite')}
              variant="bare"
              value={null}
              options={candidates.map((q) => ({
                value: q.questId,
                label: q.status === 'draft' ? `${q.title} (draft)` : q.title,
              }))}
              onChange={(picked) => onChange({ prerequisiteIds: [...draft.prerequisiteIds, picked] })}
              placeholder={candidates.length === 0 ? 'No other quests in this sector' : '+ Add prerequisite'}
              labelId={`${id('prerequisite')}-label`}
              disabled={candidates.length === 0}
              invalid={Boolean(prerequisiteError)}
              describedBy={prerequisiteError ? `${id('prerequisite')}-error` : undefined}
            />
          </ChamferFrame>
          <FieldError id={`${id('prerequisite')}-error`} message={prerequisiteError} />
          {!prerequisiteError && (
            <p className="mt-1.5 text-xs text-muted">
              Pilots unlock this quest once every prerequisite is cleared. Circular prerequisites are blocked when saving.
            </p>
          )}
        </div>

        <TextAreaField
          id={id('briefing')}
          label="Mission briefing"
          value={draft.storyText}
          onChange={(storyText) => onChange({ storyText })}
          rows={3}
          maxLength={5000}
          error={errors.storyText}
          className="sm:col-span-2 xl:col-span-4"
        />
      </div>
    </Panel>
  );
}
