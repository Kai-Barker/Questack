import type { Difficulty } from './dashboard';
import type { ProficiencyLevel } from './pilot';

// Shape of GET /api/sectors/:id (not built yet, see services/sectorService.ts).
// One language plus every published quest in it, with the pilot's progress.

// Matches the challenge_type enum in challenges
export type ChallengeType = 'read_and_explain' | 'bug_hunt' | 'decode_transmission' | 'architecture';

export interface QuestObjective {
  challengeOrder: number;
  challengeType: ChallengeType;
}

export interface SectorQuest {
  questId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  isSideQuest: boolean;
  isHiveAssault?: boolean; // nice-to-have: no schema column for this yet
  storyText: string;
  xpReward: number;
  cleared: boolean; // pilot has a completed attempt
  prerequisiteIds: number[]; // from quest_prerequisites
  objectives: QuestObjective[];
}

export interface SectorDetail {
  languageId: number;
  name: string;
  displayName: string;
  proficiencyLevel?: ProficiencyLevel; // undefined = not enlisted in this sector
  shipQuestId: number | null; // where the "Your ship" marker sits (last quest cleared)
  quests: SectorQuest[]; // in display_order
}
