import type { AuthUser } from '../../src/types/auth';
import type { DashboardData } from '../../src/types/dashboard';
import type { PilotSummary } from '../../src/types/pilot';
import type { PilotProfile } from '../../src/types/profile';
import type { QuestCompletion, QuestDetail } from '../../src/types/quest';
import type { SectorDetail, SectorQuest } from '../../src/types/sector';

// Backend responses shaped like the real API, for the frontend tests

// A calendar day `offset` days after `start`, as YYYY-MM-DD
function isoDay(start: string, offset: number): string {
  return new Date(Date.parse(`${start}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}

export const USER: AuthUser = { userId: 7, username: 'Vega-7', email: 'vega@example.com', role: 'user' };

export const PILOT: PilotSummary = {
  userId: 7,
  callsign: 'Vega-7',
  level: 3,
  totalXp: 1300,
  levelXp: 50,
  levelXpRequired: 1000,
  rank: 'pilot',
  questsCleared: 4,
  sectorsEnlisted: 1,
  currentStreak: 2,
  loadout: { helmet: { rewardId: 0, name: 'Navigator Visor' } },
};

export const DASHBOARD: DashboardData = {
  sectors: [
    { languageId: 1, name: 'csharp', displayName: 'C#', questsCleared: 1, questsTotal: 3, proficiencyLevel: 'pilot' },
    { languageId: 2, name: 'javascript', displayName: 'JavaScript', questsCleared: 0, questsTotal: 2 },
  ],
  continueMission: {
    questId: 2,
    title: 'Loop Patrol',
    languageId: 1,
    sectorDisplayName: 'C#',
    concept: 'Loops',
    difficulty: 'medium',
    objectivesCompleted: 1,
    objectivesTotal: 2,
  },
};

export function sectorQuest(overrides: Partial<SectorQuest> & { questId: number }): SectorQuest {
  return {
    title: `Quest ${overrides.questId}`,
    concept: 'Concept',
    difficulty: 'easy',
    isSideQuest: false,
    storyText: 'A story.',
    xpReward: 100,
    cleared: false,
    prerequisiteIds: [],
    objectives: [{ challengeOrder: 1, challengeType: 'read_and_explain' }],
    ...overrides,
  };
}

export const SECTOR: SectorDetail = {
  languageId: 1,
  name: 'csharp',
  displayName: 'C#',
  proficiencyLevel: 'pilot',
  shipQuestId: 1,
  quests: [
    sectorQuest({ questId: 1, title: 'Signal Check', concept: 'Variables', cleared: true }),
    sectorQuest({ questId: 2, title: 'Loop Patrol', concept: 'Loops', prerequisiteIds: [1], difficulty: 'medium' }),
    sectorQuest({ questId: 3, title: 'Side Scan', concept: 'Strings', prerequisiteIds: [1], isSideQuest: true }),
    sectorQuest({ questId: 4, title: 'Deep Space', concept: 'Classes', prerequisiteIds: [2], difficulty: 'hard' }),
  ],
};

// Quest 1: a read-and-explain (101) then a bug hunt (102)
export const QUEST: QuestDetail = {
  questId: 1,
  languageId: 1,
  sectorDisplayName: 'C#',
  questNumber: 1,
  pilotRank: 'pilot',
  title: 'Signal Check',
  concept: 'Variables',
  difficulty: 'easy',
  isSideQuest: false,
  storyText: 'The relay is jammed.',
  xpReward: 100,
  challenges: [
    {
      challengeId: 101,
      challengeOrder: 1,
      challengeType: 'read_and_explain',
      instructions: 'Explain what this stores.',
      code: { fileName: 'Program.cs', snippet: 'int fuel = 10;' },
    },
    {
      challengeId: 102,
      challengeOrder: 2,
      challengeType: 'bug_hunt',
      instructions: 'Find the bug.',
      code: { fileName: 'Total.cs', snippet: 'int total = 0;\nfor (;;)\n  total =+ 1;' },
    },
  ],
  progress: { clearedChallengeIds: [] },
};

export const DECODE_QUEST: QuestDetail = {
  ...QUEST,
  questId: 2,
  title: 'Loop Patrol',
  challenges: [{ challengeId: 202, challengeOrder: 1, challengeType: 'decode_transmission', instructions: 'Paste some code.' }],
};

export const COMPLETION: QuestCompletion = {
  baseXp: 100,
  xpEarned: 100,
  replay: false,
  boosterEarned: { name: 'Overdrive Core' },
  before: { level: 1, levelXp: 400, levelXpRequired: 500 },
  after: { level: 2, levelXp: 0, levelXpRequired: 750 },
  sector: { displayName: 'C#', percentBefore: 0, percentAfter: 33 },
  unlocked: [{ questId: 2, title: 'Loop Patrol', concept: 'Loops' }],
  nextQuestId: 2,
};

export const PROFILE: PilotProfile = {
  callsign: 'Vega-7',
  enlistedAt: '2026-01-15T08:00:00.000Z',
  bio: 'Reading code across the stars.',
  title: { rewardId: 1, code: 'first-deploy', name: 'First Deploy' },
  level: 3,
  totalXp: 1300,
  levelXp: 50,
  levelXpRequired: 1000,
  rank: 'pilot',
  homeSector: 'C#',
  stats: { questsCleared: 4, bugsSquashed: 3, transmissionsDecoded: 1 },
  // Two weeks from Monday 28 Sep 2026; counts cycle 0, 1, 2
  flightLog: {
    days: Array.from({ length: 14 }, (_, i) => ({ date: isoDay('2026-09-28', i), count: i % 3 })),
    activeDays: 9,
    currentStreak: 2,
    longestStreak: 4,
  },
  // Eight Mondays from 17 Aug 2026: 0, 50, 100 … 350 XP (1,400 in all)
  xpHistory: Array.from({ length: 8 }, (_, i) => ({ weekStart: isoDay('2026-08-17', i * 7), xp: i * 50 })),
  sectors: [
    { languageId: 1, displayName: 'C#', questsCleared: 1, questsTotal: 3, proficiencyLevel: 'pilot' },
    { languageId: 2, displayName: 'JavaScript', questsCleared: 0, questsTotal: 2, proficiencyLevel: 'cadet' },
  ],
  goal: { languageId: 1, displayName: 'C#', questsCleared: 1, questsTotal: 3, proficiencyLevel: 'pilot' },
  favouriteObjective: 'Bug hunt',
  insignia: [
    { rewardId: 1, code: 'first-deploy', name: 'First Deploy', description: 'Clear your first quest.', earned: true },
    { rewardId: 2, code: 'bug-hunter', name: 'Bug Hunter', description: 'Squash 10 bugs.', earned: false },
    { rewardId: 8, code: 'commander', name: 'Commander', description: 'Reach Commander.', earned: true },
  ],
  featuredIds: [1],
  loadout: { helmet: 'Navigator Visor', armour: null, insignia: 'First Deploy', booster: null },
  boosters: [{ boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2, chargesRemaining: 3, active: false }],
};
