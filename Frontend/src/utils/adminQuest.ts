import type { AdminQuest, AdminQuestInput, EditableChallengeType, QuestStatus } from '../types/admin';
import type { Difficulty } from '../types/dashboard';

// The quest editor's form state, and how it maps to and from the API. Number
// fields are kept as the text typed, so a half-typed value isn't lost; the
// backend validates them and explains any problem.

export interface ObjectiveDraft {
  key: string; // stable React key, also for objectives not saved yet
  challengeId?: number;
  type: EditableChallengeType;
  instructions: string;
  fileName: string;
  codeSnippet: string;
  answerKey: string;
  markingCriteria: string;
  bugLine: string;
}

export interface QuestDraft {
  questId: number | null; // null until first saved
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  isSideQuest: boolean;
  storyText: string;
  xpReward: string;
  prerequisiteIds: number[];
  objectives: ObjectiveDraft[];
}

export const OBJECTIVE_TYPES: { value: EditableChallengeType; label: string }[] = [
  { value: 'read_and_explain', label: 'Read and explain' },
  { value: 'bug_hunt', label: 'Bug hunt' },
  { value: 'decode_transmission', label: 'Decode the transmission' },
  { value: 'briefing', label: 'Intel briefing' },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

// Decode objectives use the pilot's own code; briefings have none at all
export const hasQuestCode = (type: EditableChallengeType) => type === 'read_and_explain' || type === 'bug_hunt';

export const objectiveTypeLabel = (type: EditableChallengeType) =>
  OBJECTIVE_TYPES.find((t) => t.value === type)?.label ?? type;

let lastKey = 0;
const newKey = () => `objective-${++lastKey}`;

export function newObjective(type: EditableChallengeType): ObjectiveDraft {
  return {
    key: newKey(),
    type,
    instructions: '',
    fileName: '',
    codeSnippet: '',
    answerKey: '',
    markingCriteria: '',
    bugLine: '',
  };
}

export function newQuestDraft(languageId: number): QuestDraft {
  return {
    questId: null,
    languageId,
    title: '',
    concept: '',
    difficulty: 'easy',
    status: 'draft',
    isSideQuest: false,
    storyText: '',
    xpReward: '100',
    prerequisiteIds: [],
    objectives: [],
  };
}

export function toDraft(quest: AdminQuest): QuestDraft {
  return {
    questId: quest.questId,
    languageId: quest.languageId,
    title: quest.title,
    concept: quest.concept,
    difficulty: quest.difficulty,
    status: quest.status,
    isSideQuest: quest.isSideQuest,
    storyText: quest.storyText,
    xpReward: String(quest.xpReward),
    prerequisiteIds: quest.prerequisiteIds,
    objectives: quest.objectives.map((o) => ({
      key: newKey(),
      challengeId: o.challengeId,
      type: o.type,
      instructions: o.instructions,
      fileName: o.fileName ?? '',
      codeSnippet: o.codeSnippet ?? '',
      answerKey: o.answerKey ?? '',
      markingCriteria: o.markingCriteria,
      bugLine: o.bugLine === null ? '' : String(o.bugLine),
    })),
  };
}

// '' becomes null; anything else is sent as typed, so the backend can say
// what's wrong with it (NaN is sent as null, which it reports as missing)
const toNumber = (text: string) => (text.trim() === '' ? null : Number(text));

export function toInput(draft: QuestDraft): AdminQuestInput {
  return {
    languageId: draft.languageId,
    title: draft.title,
    concept: draft.concept,
    difficulty: draft.difficulty,
    status: draft.status,
    isSideQuest: draft.isSideQuest,
    storyText: draft.storyText,
    xpReward: toNumber(draft.xpReward) as number,
    prerequisiteIds: draft.prerequisiteIds,
    objectives: draft.objectives.map((o) => {
      const code = hasQuestCode(o.type);
      return {
        ...(o.challengeId !== undefined && { challengeId: o.challengeId }),
        type: o.type,
        instructions: o.instructions,
        fileName: code ? o.fileName || null : null,
        codeSnippet: code ? o.codeSnippet || null : null,
        answerKey: code ? o.answerKey || null : null,
        markingCriteria: o.type === 'briefing' ? '' : o.markingCriteria,
        bugLine: o.type === 'bug_hunt' ? toNumber(o.bugLine) : null,
      };
    }),
  };
}

// True when saving would change nothing
export const sameQuest = (a: QuestDraft, b: QuestDraft) => JSON.stringify(toInput(a)) === JSON.stringify(toInput(b));

// The server's field messages for one objective, keyed by field name
export function objectiveErrors(errors: Record<string, string>, index: number): Record<string, string> {
  const prefix = `objectives.${index}.`;
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message]),
  );
}

// '01', '02', … as on the objective cards
export const objectiveNumber = (index: number) => String(index + 1).padStart(2, '0');
