import type { SeedChallenge, SeedQuest } from '../seeds/questContent.js';

// A sector's curriculum: the quests that teach a language from the first line
// of syntax onwards, added to the database by database/importCurriculum.ts.
//
// - New quests are written out in full and saved like quests made in the
//   admin quest editor (ids from 1000), so they can be edited there later.
// - Seeded quests (database/seeds/questContent.ts) are only referred to: the
//   curriculum gives them a briefing and new prerequisites, and their other
//   objectives always come from the seed file.
//
// Every quest is identified by a `key`; prerequisites are listed by key.

interface CurriculumQuestBase {
  key: string;
  prerequisites: string[]; // keys of other quests in this curriculum
}

export interface NewCurriculumQuest extends CurriculumQuestBase {
  title: string; // also how a re-run finds the quest again, so keep it stable
  concept: string;
  difficulty: SeedQuest['difficulty'];
  isSideQuest: boolean;
  storyText: string;
  xpReward: number;
  briefing: string; // Markdown, shown as objective 01
  challenges: SeedChallenge[]; // the objectives after the briefing
}

export interface SeededCurriculumQuest extends CurriculumQuestBase {
  seededQuestId: number;
  // Shown as objective 01. Leave out to keep whatever briefing the quest
  // already has (e.g. one written in the editor).
  briefing?: string;
}

export type CurriculumQuest = NewCurriculumQuest | SeededCurriculumQuest;

export interface Curriculum {
  languageId: number;
  quests: CurriculumQuest[];
}

export const isSeeded = (quest: CurriculumQuest): quest is SeededCurriculumQuest => 'seededQuestId' in quest;
