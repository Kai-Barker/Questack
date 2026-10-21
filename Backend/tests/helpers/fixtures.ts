import bcrypt from 'bcrypt';
import type { ChallengeRow, LanguageRow, PrerequisiteRow, QuestRow } from '../../src/models/questModel.js';
import type { InsigniaRecord, ProfileRecord } from '../../src/models/profileModel.js';
import type { UserWithHash } from '../../src/models/userModel.js';

// A small, fixed galaxy used by every unit and endpoint test.
//
//   Sector 1 (C#)
//     Quest 1 "Signal Check"   main, no prerequisites, 100 XP, grants booster 50
//       101 read_and_explain   102 bug_hunt (bug on line 3)
//     Quest 2 "Loop Patrol"    main, needs quest 1, 200 XP
//       201 read_and_explain   202 decode_transmission (no snippet)
//     Quest 3 "Side Scan"      side quest, needs quest 1, 50 XP
//       301 read_and_explain
//     Quest 4 "Empty Orbit"    no objectives, so hidden from pilots
//   Sector 2 (JavaScript)
//     Quest 11 "Script Basics" main, no prerequisites, 120 XP
//       1101 read_and_explain

export const PASSWORD = 'access123';

export const PILOT: UserWithHash = {
  userId: 7,
  username: 'Vega-7',
  email: 'vega@example.com',
  role: 'user',
  // Cost 4 keeps the tests fast; bcrypt.compare works with any cost
  passwordHash: bcrypt.hashSync(PASSWORD, 4),
  isActive: true,
};

export const PROFILE_RECORD: ProfileRecord = {
  userId: PILOT.userId,
  username: PILOT.username,
  enlistedAt: new Date('2026-01-15T08:00:00Z'),
  bio: 'Reading code across the stars.',
  titleRewardId: null,
  goalLanguageId: null,
};

const row = <T>(value: Omit<T, 'constructor'>) => value as T;

const BUG_HUNT_CODE = ['int total = 0;', 'for (int i = 0; i < 5; i++)', '  total =+ i;', 'Console.WriteLine(total);'].join('\n');

export const CATALOG_ROWS = {
  languages: [
    row<LanguageRow>({ language_id: 1, name: 'csharp', display_name: 'C#' }),
    row<LanguageRow>({ language_id: 2, name: 'javascript', display_name: 'JavaScript' }),
  ],
  quests: [
    quest(1, 1, 'Signal Check', 'Variables', 'easy', false, 100, 50, 1),
    quest(2, 1, 'Loop Patrol', 'Loops', 'medium', false, 200, null, 2),
    quest(3, 1, 'Side Scan', 'Strings', 'easy', true, 50, null, 3),
    quest(4, 1, 'Empty Orbit', 'Nothing', 'easy', false, 10, null, 4),
    quest(11, 2, 'Script Basics', 'Variables', 'easy', false, 120, null, 1),
  ],
  prerequisites: [
    row<PrerequisiteRow>({ quest_id: 2, prerequisite_quest_id: 1 }),
    row<PrerequisiteRow>({ quest_id: 3, prerequisite_quest_id: 1 }),
  ],
  challenges: [
    challenge(101, 1, 1, 'read_and_explain', 'Program.cs', 'int fuel = 10;', 'It stores 10 in fuel.', null),
    challenge(102, 1, 2, 'bug_hunt', 'Total.cs', BUG_HUNT_CODE, '=+ assigns instead of adding.', 3),
    challenge(201, 2, 1, 'read_and_explain', 'Loop.cs', 'for (;;) {}', 'It loops forever.', null),
    challenge(202, 2, 2, 'decode_transmission', null, null, null, null),
    challenge(301, 3, 1, 'read_and_explain', 'Scan.cs', 'var s = "scan";', 'It stores a string.', null),
    challenge(1101, 11, 1, 'read_and_explain', 'app.js', 'let x = 1;', 'It declares x as 1.', null),
  ],
};

function quest(
  questId: number,
  languageId: number,
  title: string,
  concept: string,
  difficulty: QuestRow['difficulty'],
  isSideQuest: boolean,
  xpReward: number,
  rewardId: number | null,
  displayOrder: number,
): QuestRow {
  return row<QuestRow>({
    quest_id: questId,
    language_id: languageId,
    title,
    concept,
    difficulty,
    is_side_quest: isSideQuest ? 1 : 0,
    story_text: `${title} story.`,
    xp_reward: xpReward,
    reward_id: rewardId,
    display_order: displayOrder,
  });
}

function challenge(
  challengeId: number,
  questId: number,
  order: number,
  type: ChallengeRow['challenge_type'],
  fileName: string | null,
  code: string | null,
  answerKey: string | null,
  bugLine: number | null,
): ChallengeRow {
  return row<ChallengeRow>({
    challenge_id: challengeId,
    quest_id: questId,
    challenge_order: order,
    challenge_type: type,
    instructions: `Instructions for objective ${challengeId}.`,
    file_name: fileName,
    code_snippet: code,
    answer_key: answerKey,
    marking_criteria: `Criteria for objective ${challengeId}.`,
    bug_line: bugLine,
    alt_bug_lines: null,
  });
}

export const INSIGNIA: InsigniaRecord[] = [
  { rewardId: 1, code: 'first-deploy', name: 'First Deploy', description: 'Clear your first quest.', unlockCondition: 'quests_cleared>=1' },
  { rewardId: 2, code: 'bug-hunter', name: 'Bug Hunter', description: 'Squash 10 bugs.', unlockCondition: 'bugs_squashed>=10' },
  { rewardId: 3, code: 'broken-rule', name: 'Broken Rule', description: 'A rule with a typo.', unlockCondition: 'quests cleared > 1' },
  { rewardId: 8, code: 'commander', name: 'Commander', description: 'Reach Commander.', unlockCondition: 'commander_ranks>=1' },
];
