import type { Difficulty } from './dashboard';
import type { ProficiencyLevel } from './pilot';
import type { ChallengeType } from './sector';

// Shape of GET /api/quests/:id (Backend/src/services/questService.ts).
//
// answer_key, marking_criteria and bug_line are deliberately NOT part of this
// response. The backend marks answers itself, so they never need to reach the
// browser, where anyone could read them in dev tools.

export interface ChallengeCode {
  fileName: string;
  snippet: string;
}

export interface QuestChallenge {
  challengeId: number;
  challengeOrder: number;
  challengeType: ChallengeType;
  instructions: string; // briefings: the whole briefing, in Markdown
  code?: ChallengeCode; // decode_transmission and briefings have none
}

export interface QuestDetail {
  questId: number;
  languageId: number;
  sectorDisplayName: string;
  questNumber?: number; // position in the sector, for the "Quest 05" breadcrumb
  pilotRank?: ProficiencyLevel; // the pilot's rank in this sector; sets the Ship's AI style
  title: string;
  concept: string;
  difficulty: Difficulty;
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  challenges: QuestChallenge[];
  // An unfinished attempt picks up where the pilot left off
  progress: { clearedChallengeIds: number[] };
}

export interface LevelSnapshot {
  level: number;
  levelXp: number;
  levelXpRequired: number;
}

// What POST /api/quests/:id/complete returns: everything the Mission Debrief shows
export interface QuestCompletion {
  baseXp: number;
  xpEarned: number; // first clear: baseXp with any booster and visor bonus applied; replay: a share of it
  replay: boolean; // the pilot had cleared this quest before
  booster?: { name: string; xpMultiplier: number }; // the booster that boosted this clear
  visor?: { name: string; xpMultiplier: number }; // an equipped XP-bonus visor
  boosterEarned?: { name: string }; // a new booster for the inventory
  before: LevelSnapshot;
  after: LevelSnapshot;
  sector: { displayName: string; percentBefore: number; percentAfter: number };
  unlocked: { questId: number; title: string; concept: string }[];
  nextQuestId: number | null;
}
