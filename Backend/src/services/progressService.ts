import { ACTIVITY_UTC_OFFSET_MS, FLIGHT_LOG_WEEKS, XP_HISTORY_WEEKS } from '../config/progress.js';
import {
  countActivityByDay,
  getPilotRow,
  listBoosters,
  listClearedQuests,
  listLanguageProgress,
  listOpenAttempts,
  setProficiency,
  sumXpByWeek,
  type BoosterRecord,
  type LanguageProgress,
} from '../models/progressModel.js';
import type { Proficiency } from '../types/content.js';
import { HttpError } from '../utils/httpError.js';
import { levelFromXp, type LevelSnapshot } from '../utils/levels.js';
import { getCatalog, questState, type Catalog, type CatalogQuest } from './questCatalog.js';

// What the Galaxy Map, Sector Map, nav and profile show about a pilot's
// progress, built from the catalogue (cached) plus a few grouped per-pilot
// queries run in parallel.

const DAY_MS = 24 * 60 * 60 * 1000;
const RANK_ORDER: Proficiency[] = ['cadet', 'pilot', 'commander'];

// DUMMY gear for the avatar until the loadout screen exists
export const DEMO_HELMET = 'Navigator Visor';

// ---------------------------------------------------------------------
// Local (South African) calendar days, for streaks and the flight log.
// "Shifted" times are UTC times moved forward by the offset, so their UTC
// date parts read as the local date.
// ---------------------------------------------------------------------
const isoDate = (shifted: number) => new Date(shifted).toISOString().slice(0, 10);

function localCalendar(now = Date.now()) {
  const today = Math.floor((now + ACTIVITY_UTC_OFFSET_MS) / DAY_MS) * DAY_MS;
  const daysSinceMonday = (new Date(today).getUTCDay() + 6) % 7;
  return { today, thisMonday: today - daysSinceMonday * DAY_MS };
}

// A shifted local midnight back to the real instant, for SQL
const toInstant = (shifted: number) => new Date(shifted - ACTIVITY_UTC_OFFSET_MS);

export interface FlightLogDay {
  date: string; // YYYY-MM-DD, local
  count: number; // objectives cleared that day
}

export interface FlightLog {
  days: FlightLogDay[];
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
}

function streaks(days: FlightLogDay[]) {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // The run up to today, or up to yesterday if nothing's been cleared yet today
  let current = 0;
  let i = days.length - 1;
  if (days[i]?.count === 0) i--;
  while (i >= 0 && (days[i]?.count ?? 0) > 0) {
    current++;
    i--;
  }
  return { activeDays: days.filter((day) => day.count > 0).length, currentStreak: current, longestStreak: longest };
}

// One entry per day from the Monday FLIGHT_LOG_WEEKS - 1 weeks ago up to today
export async function loadFlightLog(userId: number): Promise<FlightLog> {
  const { today, thisMonday } = localCalendar();
  const start = thisMonday - (FLIGHT_LOG_WEEKS - 1) * 7 * DAY_MS;
  const counts = await countActivityByDay(userId, toInstant(start));
  const days: FlightLogDay[] = [];
  for (let t = start; t <= today; t += DAY_MS) days.push({ date: isoDate(t), count: counts.get(isoDate(t)) ?? 0 });
  return { days, ...streaks(days) };
}

export interface XpWeek {
  weekStart: string; // YYYY-MM-DD, a Monday
  xp: number;
}

export async function loadXpHistory(userId: number): Promise<XpWeek[]> {
  const { thisMonday } = localCalendar();
  const start = thisMonday - (XP_HISTORY_WEEKS - 1) * 7 * DAY_MS;
  const totals = await sumXpByWeek(userId, toInstant(start));
  return Array.from({ length: XP_HISTORY_WEEKS }, (_, i) => {
    const weekStart = isoDate(start + i * 7 * DAY_MS);
    return { weekStart, xp: totals.get(weekStart) ?? 0 };
  });
}

// ---------------------------------------------------------------------
// The core every screen needs
// ---------------------------------------------------------------------
export interface PilotCore {
  catalog: Catalog;
  totalXp: number;
  level: LevelSnapshot;
  titleName: string | null;
  cleared: Map<number, Date>; // questId -> last cleared
  clearedIds: Set<number>;
  languages: Map<number, LanguageProgress>;
  boosters: BoosterRecord[];
  activeBooster: BoosterRecord | null;
  rank: Proficiency; // highest across enlisted sectors
}

export async function loadPilotCore(userId: number): Promise<PilotCore> {
  const [catalog, pilot, clearedRows, languageRows, boosters] = await Promise.all([
    getCatalog(),
    getPilotRow(userId),
    listClearedQuests(userId),
    listLanguageProgress(userId),
    listBoosters(userId),
  ]);
  const cleared = new Map(clearedRows.map((c) => [c.questId, c.lastCompletedAt]));
  const languages = new Map(languageRows.map((l) => [l.languageId, l]));
  const rank = languageRows.reduce<Proficiency>(
    (best, l) => (RANK_ORDER.indexOf(l.proficiency) > RANK_ORDER.indexOf(best) ? l.proficiency : best),
    'cadet',
  );
  return {
    catalog,
    totalXp: pilot.totalXp,
    level: levelFromXp(pilot.totalXp),
    titleName: pilot.titleName,
    cleared,
    clearedIds: new Set(cleared.keys()),
    languages,
    boosters,
    activeBooster: boosters.find((b) => b.active) ?? null,
    rank,
  };
}

// ---------------------------------------------------------------------
// GET /api/pilot/me: the nav and dashboard panels
// ---------------------------------------------------------------------
export async function pilotSummary(userId: number, callsign: string) {
  const [core, flightLog] = await Promise.all([loadPilotCore(userId), loadFlightLog(userId)]);
  const booster = core.activeBooster;
  return {
    userId,
    callsign,
    level: core.level.level,
    totalXp: core.totalXp,
    levelXp: core.level.levelXp,
    levelXpRequired: core.level.levelXpRequired,
    rank: core.rank,
    questsCleared: core.cleared.size,
    sectorsEnlisted: core.languages.size,
    currentStreak: flightLog.currentStreak,
    activeBooster: booster
      ? { name: booster.name, xpMultiplier: booster.xpMultiplier, questsRemaining: booster.chargesRemaining }
      : undefined,
    loadout: {
      helmet: { rewardId: 0, name: DEMO_HELMET },
      ...(core.titleName && { insignia: { rewardId: 0, name: core.titleName } }),
    },
  };
}

// ---------------------------------------------------------------------
// GET /api/dashboard: sectors and the mission to continue
// ---------------------------------------------------------------------
function missionCard(core: PilotCore, quest: CatalogQuest, objectivesCompleted: number) {
  return {
    questId: quest.questId,
    title: quest.title,
    languageId: quest.languageId,
    sectorDisplayName: core.catalog.sectorById.get(quest.languageId)?.displayName ?? '',
    concept: quest.concept,
    difficulty: quest.difficulty,
    objectivesCompleted,
    objectivesTotal: quest.challenges.length,
  };
}

export async function dashboard(userId: number) {
  const [core, openAttempts] = await Promise.all([loadPilotCore(userId), listOpenAttempts(userId)]);
  const { catalog } = core;

  const sectors = catalog.sectors.map((s) => ({
    languageId: s.languageId,
    name: s.name,
    displayName: s.displayName,
    questsCleared: s.quests.filter((q) => core.clearedIds.has(q.questId)).length,
    questsTotal: s.quests.length,
    proficiencyLevel: core.languages.get(s.languageId)?.proficiency,
  }));

  // The newest unfinished attempt; otherwise the next quest the pilot can take,
  // preferring sectors they've enlisted in and main quests
  let continueMission = null;
  const open = openAttempts.find((a) => catalog.questById.has(a.questId));
  const openQuest = open && catalog.questById.get(open.questId);
  if (open && openQuest) {
    const done = openQuest.challenges.filter((c) => open.clearedChallengeIds.includes(c.challengeId)).length;
    continueMission = missionCard(core, openQuest, done);
  } else {
    const ordered = [...catalog.sectors].sort(
      (a, b) => Number(core.languages.has(b.languageId)) - Number(core.languages.has(a.languageId)),
    );
    const available = ordered.flatMap((s) => s.quests).filter((q) => questState(q, core.clearedIds) === 'available');
    const next = available.find((q) => !q.isSideQuest) ?? available[0];
    if (next) continueMission = missionCard(core, next, 0);
  }

  return { sectors, continueMission };
}

// ---------------------------------------------------------------------
// GET /api/sectors/:id
// ---------------------------------------------------------------------
export async function sectorDetail(userId: number, languageId: number) {
  const core = await loadPilotCore(userId);
  const sector = core.catalog.sectorById.get(languageId);
  if (!sector) throw new HttpError(404, 'This sector is uncharted.');

  // The ship sits on the quest cleared most recently in this sector
  let shipQuestId: number | null = null;
  let latest = 0;
  for (const q of sector.quests) {
    const when = core.cleared.get(q.questId)?.getTime() ?? 0;
    if (when > latest) {
      latest = when;
      shipQuestId = q.questId;
    }
  }

  return {
    languageId: sector.languageId,
    name: sector.name,
    displayName: sector.displayName,
    proficiencyLevel: core.languages.get(languageId)?.proficiency,
    shipQuestId,
    quests: sector.quests.map((q) => ({
      questId: q.questId,
      title: q.title,
      concept: q.concept,
      difficulty: q.difficulty,
      isSideQuest: q.isSideQuest,
      storyText: q.storyText,
      xpReward: q.xpReward,
      cleared: core.clearedIds.has(q.questId),
      prerequisiteIds: q.prerequisiteIds,
      objectives: q.challenges.map((c) => ({ challengeOrder: c.order, challengeType: c.type })),
    })),
  };
}

// PATCH /api/sectors/:id/rank
export async function changeRank(userId: number, languageId: number, rank: Proficiency): Promise<void> {
  const catalog = await getCatalog();
  if (!catalog.sectorById.has(languageId)) throw new HttpError(404, 'This sector is uncharted.');
  await setProficiency(userId, languageId, rank);
}
