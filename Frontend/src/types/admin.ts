// Shapes for the /api/admin endpoints (Backend/src/routes/adminRoutes.ts)

import type { AuthUser } from './auth';
import type { Difficulty } from './dashboard';

export interface AdminOverview {
  pilots: number;
  activePilots: number;
  publishedQuests: number;
  draftQuests: number;
  aiCallsToday: number; // the last 24 hours, answered requests only
  aiTokensToday: number;
  aiFailuresToday: number; // Gemini attempts that got no reply
}

export interface AdminSession {
  user: AuthUser;
}

export interface AdminSector {
  languageId: number;
  name: string; // e.g. 'csharp'
  displayName: string; // e.g. 'C#'
}

export type QuestStatus = 'draft' | 'published';
// architecture objectives exist in the schema but have no editor yet
export type EditableChallengeType = 'read_and_explain' | 'bug_hunt' | 'decode_transmission' | 'briefing';

export interface AdminQuestSummary {
  questId: number;
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  displayOrder: number;
  objectiveCount: number;
}

// Unlike a pilot's quest, this includes the answer keys, marking criteria and
// bug lines. Only the admin endpoints return it.
export interface AdminObjective {
  challengeId: number;
  type: EditableChallengeType;
  instructions: string;
  fileName: string | null;
  codeSnippet: string | null;
  answerKey: string | null;
  markingCriteria: string;
  bugLine: number | null;
  altBugLines: number[]; // other lines where fixing the bug also counts
}

export interface AdminQuest {
  questId: number;
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  displayOrder: number;
  prerequisiteIds: number[];
  objectives: AdminObjective[];
}

// What POST /admin/quests and PUT /admin/quests/:id take. A new objective
// has no challengeId.
export interface AdminQuestInput {
  languageId: number;
  title: string;
  concept: string;
  difficulty: Difficulty;
  status: QuestStatus;
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  prerequisiteIds: number[];
  objectives: (Omit<AdminObjective, 'challengeId'> & { challengeId?: number })[];
}

export interface AdminUser {
  userId: number;
  callsign: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  level: number;
  totalXp: number;
  lastActive: string | null; // ISO date
  createdAt: string;
}

export interface AiUsageRow {
  logId: number;
  callsign: string;
  feature: string; // hint, mentor_chat, answer_evaluation, decode_transmission, debrief
  model: 'flash' | 'flash_lite';
  inputTokens: number;
  outputTokens: number;
  flagged: boolean;
  createdAt: string;
}

// A Gemini attempt that got no reply (the model list moves on to the next model)
export interface AiFailureRow {
  logId: number;
  callsign: string;
  feature: string;
  model: string; // the exact model, e.g. gemini-3.7-flash
  status: number | null; // 429 rate limited, 408 timed out, 5xx busy, null network error
  createdAt: string;
}
