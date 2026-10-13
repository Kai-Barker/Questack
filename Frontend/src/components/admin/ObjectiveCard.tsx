import { useId } from 'react';
import type { EditableChallengeType } from '../../types/admin';
import { OBJECTIVE_TYPES, objectiveNumber, objectiveTypeLabel, type ObjectiveDraft } from '../../utils/adminQuest';
import CodeViewer from '../quest/CodeViewer';
import ChamferFrame from '../ui/ChamferFrame';
import { ChevronDownIcon, ChevronUpIcon } from '../ui/icons';
import { FieldError, fieldLabelClasses, SelectField, TextAreaField, TextField } from './fields';

export function ObjectiveTypeChip({ type }: { type: EditableChallengeType }) {
  const bug = type === 'bug_hunt';
  return (
    <ChamferFrame
      as="span"
      size="sm"
      borderClassName={bug ? 'bg-swarm/70' : 'bg-accent/60'}
      innerClassName={`bg-space-950 px-3 py-1 font-display text-[0.65rem] font-semibold tracking-[0.15em] whitespace-nowrap uppercase ${
        bug ? 'text-swarm' : 'text-accent'
      }`}
    >
      {objectiveTypeLabel(type)}
    </ChamferFrame>
  );
}

// One line under the number, so a collapsed card still says what it is
function summary(o: ObjectiveDraft): string {
  if (o.type === 'decode_transmission') return 'Learner uploads their own code · No snippet or answer key';
  const first = o.instructions.trim().split('\n')[0] || 'No instructions yet';
  return o.type === 'bug_hunt' && o.bugLine.trim() ? `${first} · Bug on line ${o.bugLine.trim()}` : first;
}

const moveButton =
  'grid size-7 place-items-center text-lg text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-muted';

interface ObjectiveCardProps {
  index: number;
  count: number;
  objective: ObjectiveDraft;
  language: string; // sector display name, for code highlighting
  expanded: boolean;
  active: boolean; // the objective last clicked or focused: the only one outlined in cyan
  errors: Record<string, string>; // this objective's field messages
  onActivate: () => void;
  onToggle: () => void;
  onChange: (patch: Partial<ObjectiveDraft>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export default function ObjectiveCard({
  index,
  count,
  objective,
  language,
  expanded,
  active,
  errors,
  onActivate,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: ObjectiveCardProps) {
  const baseId = useId();
  const id = (name: string) => `${baseId}-${name}`;
  const number = objectiveNumber(index);
  const name = `Objective ${number}`;
  const hasErrors = Object.keys(errors).length > 0;
  const decode = objective.type === 'decode_transmission';
  const bugLine = Number(objective.bugLine);

  return (
    <li data-active={active || undefined} onPointerDown={onActivate} onFocus={onActivate}>
      <ChamferFrame
        size="md"
        borderClassName={active ? 'bg-accent/70' : hasErrors ? 'bg-swarm/60' : 'bg-line'}
        innerClassName="bg-space-950/60"
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex flex-col" role="group" aria-label={`Move ${name}`}>
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={moveButton}>
              <ChevronUpIcon />
              <span className="sr-only">Move {name} up</span>
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={moveButton}>
              <ChevronDownIcon />
              <span className="sr-only">Move {name} down</span>
            </button>
          </div>
          <ChamferFrame
            as="span"
            size="sm"
            innerClassName="bg-panel px-2.5 py-1 font-display text-xs font-semibold text-slate-300"
          >
            {number}
          </ChamferFrame>
          <ObjectiveTypeChip type={objective.type} />
          <p className="min-w-0 flex-1 truncate text-sm text-slate-300">{summary(objective)}</p>
          {hasErrors && !expanded && <span className="text-xs text-swarm">Needs attention</span>}
          <button
            type="button"
            onClick={onRemove}
            className="px-2 py-1 text-xs text-muted hover:text-swarm focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span aria-hidden="true">Remove</span>
            <span className="sr-only">Remove {name}</span>
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={id('body')}
            className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChamferFrame
              as="span"
              size="sm"
              borderClassName={expanded ? 'bg-accent/60' : 'bg-line group-hover:bg-line-bright'}
              innerClassName={`grid size-10 place-items-center bg-panel text-2xl group-hover:text-accent ${
                expanded ? 'text-accent' : 'text-slate-300'
              }`}
            >
              <ChevronDownIcon
                className={`transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
              />
            </ChamferFrame>
            <span className="sr-only">
              {expanded ? 'Collapse' : 'Expand'} {name}
            </span>
          </button>
        </div>

        {expanded && (
          <div id={id('body')} className="space-y-5 border-t border-line px-4 pt-4 pb-5">
            <SelectField
              id={id('type')}
              label="Objective type"
              value={objective.type}
              options={OBJECTIVE_TYPES}
              onChange={(type) => onChange({ type })}
              error={errors.type}
              className="max-w-xs"
            />

            <TextAreaField
              id={id('instructions')}
              label="Instructions"
              value={objective.instructions}
              onChange={(instructions) => onChange({ instructions })}
              rows={3}
              maxLength={5000}
              error={errors.instructions}
            />

            {!decode && (
              <>
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <TextField
                    id={id('file')}
                    label="File name"
                    value={objective.fileName}
                    onChange={(fileName) => onChange({ fileName })}
                    placeholder="Program.cs"
                    maxLength={100}
                    mono
                    error={errors.fileName}
                  />
                  {objective.type === 'bug_hunt' && (
                    <TextField
                      id={id('bug-line')}
                      label="Bug line"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={objective.bugLine}
                      onChange={(value) => onChange({ bugLine: value })}
                      error={errors.bugLine}
                    />
                  )}
                </div>

                <div className="group">
                  <span id={id('code-label')} className={fieldLabelClasses}>
                    Code snippet
                  </span>
                  <ChamferFrame
                    size="sm"
                    className="mt-2"
                    borderClassName={errors.codeSnippet ? 'bg-swarm/70' : 'bg-line group-focus-within:bg-accent/70'}
                    innerClassName="h-64 overflow-auto bg-space-950"
                  >
                    <CodeViewer
                      value={objective.codeSnippet}
                      onChange={(codeSnippet) => onChange({ codeSnippet })}
                      editable
                      language={language}
                      label={`${name} code snippet`}
                      fontSize={13}
                      placeholder="Paste the code the pilot will read…"
                      markedLine={objective.type === 'bug_hunt' && Number.isInteger(bugLine) && bugLine > 0 ? bugLine : undefined}
                    />
                  </ChamferFrame>
                  <FieldError id={id('code-error')} message={errors.codeSnippet} />
                </div>
              </>
            )}

            <div className={`grid gap-5 ${decode ? '' : 'md:grid-cols-2'}`}>
              {!decode && (
                <TextAreaField
                  id={id('answer')}
                  label="Answer key"
                  value={objective.answerKey}
                  onChange={(answerKey) => onChange({ answerKey })}
                  rows={4}
                  maxLength={5000}
                  error={errors.answerKey}
                  hint="Only the Ship’s AI sees this. Keep line numbers out of it."
                />
              )}
              <TextAreaField
                id={id('criteria')}
                label="Marking criteria"
                value={objective.markingCriteria}
                onChange={(markingCriteria) => onChange({ markingCriteria })}
                rows={4}
                maxLength={5000}
                error={errors.markingCriteria}
                hint={decode ? 'What the pilot must show they understood about their own code.' : undefined}
              />
            </div>

            <p className="text-xs text-muted">
              {decode
                ? 'Decode objectives need no snippet or answer key: the learner supplies the code.'
                : objective.type === 'bug_hunt'
                  ? 'The server checks the line the pilot marks against the bug line. It’s never sent to their browser.'
                  : 'Pilots read the snippet and explain it; the Ship’s AI marks them against the answer key.'}
            </p>
          </div>
        )}
      </ChamferFrame>
    </li>
  );
}
