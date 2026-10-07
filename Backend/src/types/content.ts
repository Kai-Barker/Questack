// Quest content as the Ship's AI sees it. Built from the database by
// services/questCatalog.ts. Answer keys, marking criteria and bug lines only
// ever go into prompts, never into a response to the browser.

export type Proficiency = 'cadet' | 'pilot' | 'commander';
export type ChallengeType = 'read_and_explain' | 'bug_hunt' | 'decode_transmission' | 'architecture';

export interface ChallengeContent {
  challengeId: number;
  questId: number;
  questTitle: string;
  concept: string;
  language: string; // display name, e.g. 'C#'
  challengeType: ChallengeType;
  instructions: string;
  codeSnippet?: string; // decode_transmission has none: the pilot pastes their own
  answerKey?: string;
  markingCriteria: string;
  bugLine?: number; // bug_hunt only
}
