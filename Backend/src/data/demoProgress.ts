// ---------------------------------------------------------------------------
// TEMPORARY: demo quest progress for the profile page.
//
// Quest results aren't stored yet, so every pilot gets the same stats as the
// frontend's dummy data (Frontend/src/data/mockData.ts and mockSectors.ts).
// The real account details (callsign, bio, title, goal, featured insignia)
// already come from the database. Each value below will be replaced by:
//
// - xp / level           users.total_xp, users.level
// - questsCleared        quest_attempts with completed_at set (distinct quest_id)
// - bugsSquashed         correct challenge_answers on bug_hunt challenges
// - transmissionsDecoded correct challenge_answers on decode_transmission challenges
// - aiQuestions          ai_usage_logs where feature = 'mentor_chat'
// - flight log           correct challenge_answers grouped by DATE(answered_at)
// - xpHistory            quest_attempts.xp_earned grouped by week of completed_at
// - sectors              user_language_progress + quest counts per language
// - favouriteObjective   the challenge_type the pilot has cleared most
// - loadout / buff       user_rewards (gear and boosters)
// ---------------------------------------------------------------------------

export type ProficiencyLevel = 'cadet' | 'pilot' | 'commander';

export interface DemoSectorProgress {
  questsCleared: number;
  questsTotal: number;
  proficiencyLevel: ProficiencyLevel;
}

export interface FlightLogDay {
  date: string; // YYYY-MM-DD (UTC)
  count: number; // objectives cleared that day
}

export interface XpWeek {
  weekStart: string; // YYYY-MM-DD, a Monday (UTC)
  xp: number;
}

export interface DemoProgress {
  level: number;
  totalXp: number;
  levelXp: number;
  levelXpRequired: number;
  rank: ProficiencyLevel;
  questsCleared: number;
  bugsSquashed: number;
  transmissionsDecoded: number;
  aiQuestions: number;
  hiveAssaults: number;
  favouriteObjective: string;
  homeLanguageId: number;
  sectors: Record<number, DemoSectorProgress>; // keyed by language_id
  xpHistory: XpWeek[];
  flightLog: FlightLogDay[];
  loadout: {
    helmet: string | null;
    armour: string | null;
    booster: string | null;
  };
  activeBuff: { name: string; xpMultiplier: number; questsRemaining: number } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const FLIGHT_LOG_WEEKS = 26;

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

// Midnight UTC at the start of this week's Monday
function startOfWeek(time: number): number {
  const day = new Date(time);
  day.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  return day.getTime() - daysSinceMonday * DAY_MS;
}

// Small seeded random number generator (mulberry32), so each pilot's demo
// flight log is the same on every visit
function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One entry per day, from the Monday 25 weeks ago up to today, shaped to match
// the dashboard: a current 5-day streak and a longest streak of 12 days.
function demoFlightLog(userId: number, now: number): FlightLogDay[] {
  const random = seededRandom(Math.imul(userId, 2654435761));
  const today = new Date(now).setUTCHours(0, 0, 0, 0);
  const start = startOfWeek(now) - (FLIGHT_LOG_WEEKS - 1) * 7 * DAY_MS;
  const total = Math.round((today - start) / DAY_MS) + 1;

  // About half the days active, usually 1-3 objectives, sometimes more
  const counts = Array.from({ length: total }, () => (random() < 0.5 ? 0 : 1 + Math.floor(random() ** 2 * 6)));

  // Break up any run longer than 11 days, so the planted 12-day run is the longest
  let run = 0;
  counts.forEach((count, i) => {
    run = count > 0 ? run + 1 : 0;
    if (run > 11) {
      counts[i] = 0;
      run = 0;
    }
  });

  const plantRun = (lastIndex: number, length: number) => {
    for (let i = lastIndex - length + 1; i <= lastIndex; i++) counts[i] = Math.max(counts[i] ?? 0, 1);
    counts[lastIndex - length] = 0; // a rest day either side keeps the run exactly this long
    if (lastIndex + 1 < total) counts[lastIndex + 1] = 0;
  };
  plantRun(total - 41, 12); // longest streak, ending about six weeks ago
  plantRun(total - 1, 5); // current streak, ending today

  return counts.map((count, i) => ({ date: isoDate(start + i * DAY_MS), count }));
}

// Weekly XP for the last 8 weeks, oldest first; this week is still in progress
function demoXpHistory(now: number): XpWeek[] {
  const xp = [620, 880, 450, 1120, 960, 1340, 780, 1240];
  const thisWeek = startOfWeek(now);
  return xp.map((value, i) => ({ weekStart: isoDate(thisWeek - (xp.length - 1 - i) * 7 * DAY_MS), xp: value }));
}

export function demoProgress(userId: number, now = Date.now()): DemoProgress {
  return {
    level: 7,
    totalXp: 12340,
    levelXp: 1240,
    levelXpRequired: 2000,
    rank: 'pilot',
    questsCleared: 5,
    bugsSquashed: 14,
    transmissionsDecoded: 6,
    aiQuestions: 31,
    hiveAssaults: 0,
    favouriteObjective: 'Bug hunt',
    homeLanguageId: 1,
    sectors: {
      1: { questsCleared: 4, questsTotal: 12, proficiencyLevel: 'pilot' },
      2: { questsCleared: 1, questsTotal: 10, proficiencyLevel: 'cadet' },
    },
    xpHistory: demoXpHistory(now),
    flightLog: demoFlightLog(userId, now),
    // Dummy avatar gear until the loadout screen exists
    loadout: { helmet: 'Navigator Visor', armour: null, booster: 'Overdrive Core' },
    activeBuff: { name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 3 },
  };
}
