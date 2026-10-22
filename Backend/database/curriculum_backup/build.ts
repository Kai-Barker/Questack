import { questBody } from '../../src/controllers/adminController.js';
import type { AdminObjective, AdminQuest } from '../../src/models/adminQuestModel.js';
import { contentProblems, normaliseObjective, type ObjectiveInput, type QuestInput } from '../../src/services/adminQuestService.js';
import { objectiveProblems } from '../seeds/checks.js';
import { quests as seedQuests, type SeedChallenge } from '../seeds/questContent.js';
import { isSeeded, type Curriculum, type CurriculumQuest } from './types.js';

// Turns a curriculum (database/curriculum_backup/types.ts) into the same quest input
// the admin quest editor sends, and checks it, without touching the database.
// database/importCurriculum.ts does the saving.

const seededChallengeId = (questId: number, order: number) => questId * 100 + order;
const seedQuest = (id: number) => seedQuests.find((q) => q.questId === id);

// Prerequisites first, so every quest's prerequisites are saved (and
// published) before it. Throws on an unknown key or a circular chain.
export function inPrerequisiteOrder(quests: CurriculumQuest[]): CurriculumQuest[] {
  const byKey = new Map(quests.map((q) => [q.key, q]));
  const ordered: CurriculumQuest[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  function visit(quest: CurriculumQuest, path: string[]) {
    if (state.get(quest.key) === 'done') return;
    if (state.get(quest.key) === 'visiting') throw new Error(`Circular prerequisites: ${[...path, quest.key].join(' → ')}`);
    state.set(quest.key, 'visiting');
    for (const key of quest.prerequisites) {
      const prerequisite = byKey.get(key);
      if (!prerequisite) throw new Error(`${quest.key} needs unknown quest "${key}"`);
      visit(prerequisite, [...path, quest.key]);
    }
    state.set(quest.key, 'done');
    ordered.push(quest);
  }

  quests.forEach((q) => visit(q, []));
  return ordered;
}

// Each quest's column on the sector map: the longest prerequisite chain
// leading to it (the same rule as Frontend/src/components/sector/questLayout.ts)
export function mapColumns(quests: CurriculumQuest[]): Map<string, number> {
  const columns = new Map<string, number>();
  for (const quest of inPrerequisiteOrder(quests)) {
    columns.set(quest.key, quest.prerequisites.length ? 1 + Math.max(...quest.prerequisites.map((k) => columns.get(k)!)) : 0);
  }
  return columns;
}

function fromSeed(c: SeedChallenge, challengeId?: number): ObjectiveInput {
  return {
    ...(challengeId !== undefined && { challengeId }),
    type: c.type,
    instructions: c.instructions,
    fileName: c.fileName ?? null,
    codeSnippet: c.code ?? null,
    answerKey: c.answerKey ?? null,
    markingCriteria: c.markingCriteria,
    bugLine: c.bugLine ?? null,
    altBugLines: c.altBugLines ?? [],
  };
}

function fromDatabase(o: AdminObjective): ObjectiveInput {
  return {
    challengeId: o.challengeId,
    type: o.type,
    instructions: o.instructions,
    fileName: o.fileName,
    codeSnippet: o.codeSnippet,
    answerKey: o.answerKey,
    markingCriteria: o.markingCriteria,
    bugLine: o.bugLine,
    altBugLines: o.altBugLines,
  };
}

const briefing = (markdown: string, challengeId?: number): ObjectiveInput => ({
  ...(challengeId !== undefined && { challengeId }),
  type: 'briefing',
  instructions: markdown,
  markingCriteria: '',
});

// The objectives to save, reusing the ids already in the database (`current`
// is the quest as saved, or null for a quest not added yet), so pilots'
// progress is kept and a re-run updates everything in place.
export function objectivesFor(quest: CurriculumQuest, current: AdminQuest | null): ObjectiveInput[] {
  const saved = current?.objectives ?? [];

  if (!isSeeded(quest)) {
    const list = [briefing(quest.briefing), ...quest.challenges.map((c) => fromSeed(c))];
    return list.map((o, i) => {
      const id = saved[i]?.challengeId;
      return id === undefined ? o : { ...o, challengeId: id };
    });
  }

  // A seeded quest: a briefing, then its objectives from the seed file, then
  // anything else added to it in the editor (kept, so nothing is lost)
  const seed = seedQuest(quest.seededQuestId);
  if (!seed) throw new Error(`${quest.key}: no seeded quest ${quest.seededQuestId}`);
  const seedIds = seed.challenges.map((_, i) => seededChallengeId(seed.questId, i + 1));
  const added = saved.filter((o) => !seedIds.includes(o.challengeId));
  const oldBriefing = added.find((o) => o.type === 'briefing');

  const first =
    quest.briefing !== undefined
      ? [briefing(quest.briefing, oldBriefing?.challengeId)]
      : oldBriefing
        ? [fromDatabase(oldBriefing)]
        : [];
  return [
    ...first,
    ...seed.challenges.map((c, i) => fromSeed(c, seedIds[i])),
    ...added.filter((o) => o !== oldBriefing).map(fromDatabase),
  ];
}

// The quest as the editor would send it. Everything is published.
export function questInput(
  quest: CurriculumQuest,
  languageId: number,
  prerequisiteIds: number[],
  objectives: ObjectiveInput[],
): QuestInput {
  const fields = isSeeded(quest) ? seedQuest(quest.seededQuestId) : quest;
  if (!fields) throw new Error(`${quest.key}: no seeded quest ${(quest as { seededQuestId: number }).seededQuestId}`);
  return {
    languageId,
    title: fields.title,
    concept: fields.concept,
    difficulty: fields.difficulty,
    status: 'published',
    isSideQuest: fields.isSideQuest,
    storyText: fields.storyText,
    xpReward: fields.xpReward,
    prerequisiteIds,
    objectives,
  };
}

// Everything that would stop the curriculum saving, checked without the
// database: the editor's own request rules and content rules, the bug-line
// checks the seed file uses, and the shape of the prerequisites
export function curriculumProblems(curriculum: Curriculum): string[] {
  const problems: string[] = [];
  const { quests } = curriculum;

  const duplicates = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i);
  for (const key of duplicates(quests.map((q) => q.key))) problems.push(`Two quests use the key "${key}"`);
  const titles = quests.map((q) => (isSeeded(q) ? (seedQuest(q.seededQuestId)?.title ?? '') : q.title));
  for (const title of duplicates(titles)) problems.push(`Two quests are called "${title}"`);

  try {
    inPrerequisiteOrder(quests);
  } catch (err) {
    problems.push((err as Error).message);
  }

  for (const quest of quests) {
    const name = `${quest.key}`;
    if (isSeeded(quest)) {
      const seed = seedQuest(quest.seededQuestId);
      if (!seed) {
        problems.push(`${name}: no seeded quest ${quest.seededQuestId}`);
        continue;
      }
      if (seed.languageId !== curriculum.languageId) problems.push(`${name}: seeded quest is in another sector`);
    } else {
      quest.challenges.forEach((c, i) => problems.push(...objectiveProblems(c, `${name} objective ${i + 2}`)));
    }

    const objectives = objectivesFor(quest, null);
    // Placeholder ids: the real ones only exist once the prerequisites are saved
    const input = questInput(quest, curriculum.languageId, quest.prerequisites.map((_, i) => i + 1), objectives);
    const parsed = questBody.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) problems.push(`${name} ${issue.path.join('.')}: ${issue.message}`);
      continue;
    }
    const fields = contentProblems('published', parsed.data.objectives.map(normaliseObjective));
    for (const [field, message] of Object.entries(fields)) problems.push(`${name} ${field}: ${message}`);
  }
  return problems;
}
