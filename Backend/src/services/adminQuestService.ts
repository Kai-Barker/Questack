import { pool } from '../config/db.js';
import {
  insertQuest,
  lockQuestGraph,
  replacePrerequisites,
  syncObjectives,
  updateQuest,
  type AdminQuest,
  type EditableChallengeType,
  type ObjectiveFields,
  type QuestFields,
  type QuestGraph,
  type QuestNode,
} from '../models/adminQuestModel.js';
import { HttpError } from '../utils/httpError.js';
import { invalidateCatalog } from './questCatalog.js';

// Rules for saving a quest from the admin quest editor. The same content
// rules as the seed script (database/seedQuests.ts), plus the ones that need
// the rest of the galaxy: prerequisites in the same sector, no circular
// chains, and nothing published that depends on a draft.

export interface ObjectiveInput {
  challengeId?: number;
  type: EditableChallengeType;
  instructions: string;
  fileName?: string | null;
  codeSnippet?: string | null;
  answerKey?: string | null;
  markingCriteria: string;
  bugLine?: number | null;
  altBugLines?: number[] | null; // other lines where a fix also counts
}

export interface QuestInput extends QuestFields {
  prerequisiteIds: number[];
  objectives: ObjectiveInput[];
}

export const MAX_OBJECTIVES = 99;
export const MAX_INSTRUCTIONS_LENGTH = 5000;
export const MAX_BRIEFING_LENGTH = 20_000; // a briefing's Markdown is its instructions
export const FIELDS_MESSAGE = 'Check the highlighted fields.';

// Only these show the pilot a snippet of quest code and mark against an answer key
const needsCode = (type: EditableChallengeType) => type === 'read_and_explain' || type === 'bug_hunt';

// Answer keys and marking criteria go into the Ship's AI prompt, which could
// repeat a line number back to the pilot. Same check as the seed script.
const mentionsLineNumber = (text: string) => /\blines?\s*\d/i.test(text);

const blankToNull = (value: string | null | undefined) => (value && value.trim() ? value : null);

// Snippets keep their indentation; only blank lines at the start and
// trailing whitespace go, and Windows line endings become \n so the bug line
// is counted the same way the code tab shows it
function tidyCode(code: string | null | undefined): string | null {
  const tidy = blankToNull(code)?.replace(/\r\n?/g, '\n').replace(/^\n+/, '').trimEnd();
  return tidy || null;
}

// Decode objectives have no code or answer key (the pilot brings the code);
// briefings have nothing to mark at all; only bug hunts have a bug line
export function normaliseObjective(o: ObjectiveInput): ObjectiveFields {
  const code = needsCode(o.type);
  return {
    ...(o.challengeId !== undefined && { challengeId: o.challengeId }),
    type: o.type,
    instructions: o.instructions,
    fileName: code ? blankToNull(o.fileName)?.trim() ?? null : null,
    codeSnippet: code ? tidyCode(o.codeSnippet) : null,
    answerKey: code ? blankToNull(o.answerKey) : null,
    markingCriteria: o.type === 'briefing' ? '' : o.markingCriteria,
    bugLine: o.type === 'bug_hunt' ? (o.bugLine ?? null) : null,
    // Sorted, without repeats or the bug line itself
    altBugLines:
      o.type === 'bug_hunt'
        ? [...new Set(o.altBugLines ?? [])].filter((line) => line !== o.bugLine).sort((a, b) => a - b)
        : [],
  };
}

// Problems with the quest's own content, keyed by field. Objective problems
// are keyed `objectives.<index>.<field>` so the editor can mark the right card.
export function contentProblems(status: QuestFields['status'], objectives: ObjectiveFields[]): Record<string, string> {
  const fields: Record<string, string> = {};
  if (objectives.length > MAX_OBJECTIVES) fields.objectives = `A quest can have up to ${MAX_OBJECTIVES} objectives.`;
  if (status === 'published' && objectives.length === 0) {
    fields.objectives = 'Add at least one objective before publishing.';
  } else if (status === 'published' && objectives.every((o) => o.type === 'briefing')) {
    fields.objectives = 'Add an objective that tests the pilot, not only briefings, before publishing.';
  }

  objectives.forEach((o, i) => {
    const key = (field: string) => `objectives.${i}.${field}`;
    if (o.type !== 'briefing') {
      if (o.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
        fields[key('instructions')] = `Keep this to ${MAX_INSTRUCTIONS_LENGTH.toLocaleString('en')} characters or fewer.`;
      }
      if (!o.markingCriteria.trim()) fields[key('markingCriteria')] = 'Add marking criteria for the Ship’s AI.';
    }
    if (needsCode(o.type)) {
      if (!o.fileName) fields[key('fileName')] = 'Name the file, e.g. Program.cs.';
      if (!o.codeSnippet) fields[key('codeSnippet')] = 'Add the code the pilot will read.';
      if (!o.answerKey) fields[key('answerKey')] = 'Add an answer key for the Ship’s AI to mark against.';
    }
    if (o.type === 'bug_hunt') {
      const lines = o.codeSnippet?.split('\n').length ?? 0;
      if (o.bugLine === null) fields[key('bugLine')] = 'Enter the line the bug is on.';
      else if (o.bugLine > lines) fields[key('bugLine')] = `The code only has ${lines} line${lines === 1 ? '' : 's'}.`;
      const pastEnd = o.altBugLines.find((line) => line > lines);
      if (pastEnd !== undefined) fields[key('altBugLines')] = `The code only has ${lines} line${lines === 1 ? '' : 's'}.`;
    }
    if (o.answerKey && mentionsLineNumber(o.answerKey)) {
      fields[key('answerKey')] = 'Keep line numbers out of the answer key: the Ship’s AI could repeat them.';
    }
    if (mentionsLineNumber(o.markingCriteria)) {
      fields[key('markingCriteria')] = 'Keep line numbers out of the marking criteria: the Ship’s AI could repeat them.';
    }
  });
  return fields;
}

// If giving questId these prerequisites would create a loop, returns it as a
// list of quest ids that starts and ends with questId. Otherwise null.
// The existing graph has no loops (every save is checked), so any new loop
// must pass through questId.
export function findCircularChain(
  questId: number,
  prerequisiteIds: number[],
  edges: QuestGraph['edges'],
): number[] | null {
  const needs = new Map<number, number[]>();
  for (const e of edges) {
    if (e.questId === questId) continue; // replaced by the new list
    needs.set(e.questId, [...(needs.get(e.questId) ?? []), e.prerequisiteId]);
  }
  needs.set(questId, prerequisiteIds);

  const visited = new Set<number>();
  const path: number[] = [questId];
  function walk(id: number): boolean {
    for (const next of needs.get(id) ?? []) {
      if (next === questId) {
        path.push(next);
        return true;
      }
      if (visited.has(next)) continue;
      visited.add(next);
      path.push(next);
      if (walk(next)) return true;
      path.pop();
    }
    return false;
  }
  return walk(questId) ? path : null;
}

const quoteList = (quests: QuestNode[]) => quests.map((q) => `“${q.title}”`).join(', ');

// Checks the save against every other quest. Throws 400 for a field the
// admin can fix in the form, 409 when other quests are in the way.
export function checkAgainstGalaxy(
  questId: number | null,
  input: QuestInput,
  graph: QuestGraph,
): void {
  const byId = new Map(graph.quests.map((q) => [q.questId, q]));
  const existing = questId === null ? undefined : byId.get(questId);
  const problem = (message: string) => new HttpError(400, FIELDS_MESSAGE, { prerequisiteIds: message });

  for (const id of input.prerequisiteIds) {
    const prerequisite = byId.get(id);
    if (!prerequisite) throw problem('One of the prerequisites no longer exists.');
    if (id === questId) throw problem('A quest can’t be its own prerequisite.');
    if (prerequisite.languageId !== input.languageId) throw problem('Prerequisites must be in the same sector.');
    if (input.status === 'published' && prerequisite.status !== 'published') {
      throw problem(`“${prerequisite.title}” is still a draft. Publish it first, or remove it.`);
    }
  }

  if (questId === null || !existing) return; // nothing can depend on a new quest yet

  const chain = findCircularChain(questId, input.prerequisiteIds, graph.edges);
  if (chain) {
    const names = chain.map((id) => (id === questId ? input.title : (byId.get(id)?.title ?? `#${id}`)));
    throw problem(`Circular prerequisites: ${names.join(' → ')}.`);
  }

  const dependents = graph.edges
    .filter((e) => e.prerequisiteId === questId)
    .flatMap((e) => byId.get(e.questId) ?? []);
  if (existing.languageId !== input.languageId && dependents.length > 0) {
    throw new HttpError(
      409,
      `${quoteList(dependents)} need${dependents.length === 1 ? 's' : ''} this quest, so it can’t move sector. Remove it from their prerequisites first.`,
    );
  }
  const publishedDependents = dependents.filter((q) => q.status === 'published');
  if (existing.status === 'published' && input.status === 'draft' && publishedDependents.length > 0) {
    throw new HttpError(
      409,
      `${quoteList(publishedDependents)} need${publishedDependents.length === 1 ? 's' : ''} this quest. Remove it from their prerequisites, or move them to draft first.`,
    );
  }
}

// An unknown sector fails the quest's language foreign key (errno 1452)
export const isUnknownSectorError = (err: unknown) =>
  (err as { errno?: number } | null)?.errno === 1452 && String((err as Error).message).includes('fk_quests_language');

const sameIds = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

// Creates (questId null) or updates a quest with its prerequisites and
// objectives, all in one transaction, and returns it as saved. The database
// is a long round trip away, so everything the checks need comes from one
// locked read, writes are batched, and the reply is built from what was
// written rather than read back.
export async function saveQuest(adminId: number, questId: number | null, input: QuestInput): Promise<AdminQuest> {
  const objectives = input.objectives.map(normaliseObjective);
  const fields = contentProblems(input.status, objectives);
  if (Object.keys(fields).length > 0) throw new HttpError(400, FIELDS_MESSAGE, fields);

  const quest: QuestFields = {
    languageId: input.languageId,
    title: input.title,
    concept: input.concept,
    difficulty: input.difficulty,
    status: input.status,
    isSideQuest: input.isSideQuest,
    storyText: input.storyText,
    xpReward: input.xpReward,
  };
  const prerequisiteIds = [...new Set(input.prerequisiteIds)];

  const connection = await pool.getConnection();
  let saved: AdminQuest;
  try {
    await connection.beginTransaction();
    const graph = await lockQuestGraph(connection);
    const existing = questId === null ? undefined : graph.quests.find((q) => q.questId === questId);
    if (questId !== null && !existing) throw new HttpError(404, 'That quest no longer exists.');
    checkAgainstGalaxy(questId, { ...input, prerequisiteIds }, graph);

    // An objective can only be edited through the quest it belongs to
    const owned = new Set(existing?.challengeIds ?? []);
    if (objectives.some((o) => o.challengeId !== undefined && !owned.has(o.challengeId))) {
      throw new HttpError(400, FIELDS_MESSAGE, {
        objectives: existing ? 'Some objectives belong to another quest. Reload and try again.' : 'Those objectives belong to another quest.',
      });
    }

    // New quests, and quests moved to another sector, go to the end of that sector
    const displayOrder =
      existing && existing.languageId === quest.languageId
        ? existing.displayOrder
        : Math.max(0, ...graph.quests.filter((q) => q.languageId === quest.languageId).map((q) => q.displayOrder)) + 1;

    let savedId: number;
    try {
      if (existing) {
        await updateQuest(connection, existing.questId, quest, displayOrder);
        savedId = existing.questId;
      } else {
        savedId = await insertQuest(connection, quest, adminId, displayOrder);
      }
    } catch (err) {
      if (isUnknownSectorError(err)) throw new HttpError(400, FIELDS_MESSAGE, { languageId: 'Pick a sector.' });
      throw err;
    }

    if (!sameIds(prerequisiteIds, existing?.prerequisiteIds ?? [])) {
      await replacePrerequisites(connection, savedId, prerequisiteIds);
    }
    const challengeIds = await syncObjectives(connection, savedId, objectives, existing?.challengeIds ?? []);
    await connection.commit();

    saved = {
      questId: savedId,
      ...quest,
      displayOrder,
      prerequisiteIds,
      objectives: objectives.map((o, i) => ({
        challengeId: challengeIds[i]!,
        type: o.type,
        instructions: o.instructions,
        fileName: o.fileName,
        codeSnippet: o.codeSnippet,
        answerKey: o.answerKey,
        markingCriteria: o.markingCriteria,
        bugLine: o.bugLine,
        altBugLines: o.altBugLines,
      })),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Pilots see the change on their next request, not after the cache expires
  invalidateCatalog();
  return saved;
}
