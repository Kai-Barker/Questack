import { loadCatalogRows } from '../models/questModel.js';
import type { ChallengeContent, ChallengeType } from '../types/content.js';
import { parseLineList } from '../utils/lineList.js';

// Every published quest and objective, shaped for the app. Content only
// changes when quests are seeded or edited, so it's kept in memory for a few
// minutes instead of being queried on every request; simultaneous requests
// share one load. Pilot progress is never cached here.

const CATALOG_TTL_MS = 5 * 60 * 1000;

export interface CatalogChallenge {
  challengeId: number;
  questId: number;
  order: number;
  type: ChallengeType;
  instructions: string;
  fileName: string | null;
  // Server-only: never put these in a response
  codeSnippet: string | null;
  answerKey: string | null;
  markingCriteria: string;
  bugLine: number | null;
  altBugLines: number[]; // other lines that also count as finding the bug
}

export interface CatalogQuest {
  questId: number;
  languageId: number;
  title: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  rewardId: number | null; // booster granted on the first clear
  prerequisiteIds: number[];
  challenges: CatalogChallenge[]; // in order
}

export interface CatalogSector {
  languageId: number;
  name: string; // e.g. 'csharp'
  displayName: string; // e.g. 'C#'
  quests: CatalogQuest[]; // in display order
}

export interface Catalog {
  sectors: CatalogSector[];
  sectorById: Map<number, CatalogSector>;
  questById: Map<number, CatalogQuest>;
  challengeById: Map<number, { quest: CatalogQuest; challenge: CatalogChallenge }>;
}

async function buildCatalog(): Promise<Catalog> {
  const rows = await loadCatalogRows();

  const prerequisites = new Map<number, number[]>();
  for (const p of rows.prerequisites) {
    prerequisites.set(p.quest_id, [...(prerequisites.get(p.quest_id) ?? []), p.prerequisite_quest_id]);
  }

  const challengesByQuest = new Map<number, CatalogChallenge[]>();
  for (const c of rows.challenges) {
    const challenge: CatalogChallenge = {
      challengeId: c.challenge_id,
      questId: c.quest_id,
      order: c.challenge_order,
      type: c.challenge_type,
      instructions: c.instructions,
      fileName: c.file_name,
      codeSnippet: c.code_snippet,
      answerKey: c.answer_key,
      markingCriteria: c.marking_criteria ?? '',
      bugLine: c.bug_line,
      altBugLines: parseLineList(c.alt_bug_lines),
    };
    challengesByQuest.set(c.quest_id, [...(challengesByQuest.get(c.quest_id) ?? []), challenge]);
  }

  const sectors: CatalogSector[] = rows.languages.map((l) => ({
    languageId: l.language_id,
    name: l.name,
    displayName: l.display_name,
    quests: [],
  }));
  const sectorById = new Map(sectors.map((s) => [s.languageId, s]));
  const questById = new Map<number, CatalogQuest>();
  const challengeById = new Map<number, { quest: CatalogQuest; challenge: CatalogChallenge }>();

  for (const q of rows.quests) {
    const quest: CatalogQuest = {
      questId: q.quest_id,
      languageId: q.language_id,
      title: q.title,
      concept: q.concept,
      difficulty: q.difficulty,
      isSideQuest: q.is_side_quest === 1,
      storyText: q.story_text ?? '',
      xpReward: q.xp_reward,
      rewardId: q.reward_id,
      prerequisiteIds: prerequisites.get(q.quest_id) ?? [],
      challenges: challengesByQuest.get(q.quest_id) ?? [],
    };
    // A quest with no objectives can't be played, so it isn't shown
    if (quest.challenges.length === 0) continue;
    sectorById.get(quest.languageId)?.quests.push(quest);
    questById.set(quest.questId, quest);
    for (const challenge of quest.challenges) challengeById.set(challenge.challengeId, { quest, challenge });
  }

  return { sectors, sectorById, questById, challengeById };
}

let cached: { catalog: Catalog; loadedAt: number } | null = null;
let loading: Promise<Catalog> | null = null;
// Bumped by invalidateCatalog, so a load that started before an edit isn't cached
let generation = 0;

export async function getCatalog(): Promise<Catalog> {
  if (cached && Date.now() - cached.loadedAt < CATALOG_TTL_MS) return cached.catalog;
  if (!loading) {
    const startedAt = generation;
    const load: Promise<Catalog> = buildCatalog()
      .then((catalog) => {
        if (startedAt === generation) cached = { catalog, loadedAt: Date.now() };
        return catalog;
      })
      .finally(() => {
        if (loading === load) loading = null;
      });
    loading = load;
  }
  return loading;
}

// Called after an admin changes a quest, so pilots see it on their next request
export function invalidateCatalog(): void {
  generation += 1;
  cached = null;
  loading = null;
}

// The objective in the shape the Ship's AI prompts use
export function toChallengeContent(sector: CatalogSector | undefined, quest: CatalogQuest, c: CatalogChallenge): ChallengeContent {
  return {
    challengeId: c.challengeId,
    questId: quest.questId,
    questTitle: quest.title,
    concept: quest.concept,
    language: sector?.displayName ?? 'code',
    challengeType: c.type,
    instructions: c.instructions,
    codeSnippet: c.codeSnippet ?? undefined,
    answerKey: c.answerKey ?? undefined,
    markingCriteria: c.markingCriteria,
    bugLine: c.bugLine ?? undefined,
    ...(c.altBugLines.length > 0 && { altBugLines: c.altBugLines }),
  };
}

export type QuestState = 'cleared' | 'available' | 'locked';

// Unlocked once every prerequisite has been cleared
export function questState(quest: CatalogQuest, cleared: ReadonlySet<number>): QuestState {
  if (cleared.has(quest.questId)) return 'cleared';
  return quest.prerequisiteIds.every((id) => cleared.has(id)) ? 'available' : 'locked';
}
