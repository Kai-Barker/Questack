import type { ProficiencyLevel } from './pilot';
import type { ChallengeType } from './sector';

// Request and response shapes for the Ship's AI endpoints (Backend/src/routes/aiRoutes.ts).
// Only services/aiService.ts should use these to talk to the backend.

export interface ChatTurn {
  from: 'pilot' | 'ai';
  text: string;
}

export interface HintRequest {
  challengeId: number;
  proficiency: ProficiencyLevel;
  tier: 1 | 2 | 3;
  answerDraft?: string;
  pastedCode?: string;
}

export interface ChatRequest {
  challengeId: number;
  proficiency: ProficiencyLevel;
  messages: ChatTurn[];
  pastedCode?: string;
}

export interface EvaluateRequest {
  challengeId: number;
  proficiency: ProficiencyLevel;
  answer: string;
  selectedLine?: number;
  hintsUsed?: number; // saved with the answer in the pilot's progress
  pastedCode?: string;
}

export interface Evaluation {
  correct: boolean;
  feedback: string;
  guidingQuestion?: string;
}

export interface DecodeRequest {
  challengeId: number;
  proficiency: ProficiencyLevel;
  code: string;
}

export interface DecodedSection {
  lines: string; // e.g. "1-4"
  explanation: string;
}

export interface DebriefObjective {
  challengeType: ChallengeType;
  attempts: number;
  hintsUsed: number;
}

export interface DebriefRequest {
  questId: number;
  proficiency: ProficiencyLevel;
  objectives: DebriefObjective[];
}
