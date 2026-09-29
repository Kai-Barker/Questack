import type { Difficulty } from './dashboard';
import type { ProficiencyLevel } from './pilot';
import type { ChallengeType } from './sector';

// Shape of GET /api/quests/:id (not built yet, see services/questService.ts).
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
  instructions: string;
  code?: ChallengeCode; // decode_transmission has none: the learner supplies the code
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
}

// Sent to POST /api/quests/:id/complete (not built yet, see services/questService.ts)
export interface ObjectiveResult {
  challengeId: number;
  attempts: number;
  hintsUsed: number;
}

export interface LevelSnapshot {
  level: number;
  levelXp: number;
  levelXpRequired: number;
}

// What the Mission Debrief shows once a quest is cleared
export interface QuestCompletion {
  baseXp: number;
  xpEarned: number; // baseXp with any buff applied
  buff?: { name: string; xpMultiplier: number };
  before: LevelSnapshot;
  after: LevelSnapshot;
  sector: { displayName: string; percentBefore: number; percentAfter: number };
  unlocked: { questId: number; title: string; concept: string }[];
  gearFound?: { slot: 'helmet' | 'armour' | 'insignia'; name: string }; // nice-to-have
  nextQuestId: number | null;
}
