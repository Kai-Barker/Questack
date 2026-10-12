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

// The standalone decoder (/decoder): not a quest, so no challengeId

export interface DecoderRequest {
  languageId: number;
  proficiency: ProficiencyLevel;
  code: string;
}

export interface DecodedTransmission {
  sections: DecodedSection[];
  question: string | null; // null when the text wasn't code
  checkToken: string | null; // proves the question to the check endpoint
}

export interface DecoderChatRequest extends DecoderRequest {
  messages: ChatTurn[];
  question?: string;
}

export interface DecoderCheckRequest {
  proficiency: ProficiencyLevel;
  code: string; // must be exactly the code that was decoded
  checkToken: string;
  answer: string;
}

export interface DecoderCheckResult extends Evaluation {
  counted: boolean; // a pass that counted towards the Decoder insignia (false if this code was already decoded)
}
