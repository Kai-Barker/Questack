import { demoProgress, type FlightLogDay, type ProficiencyLevel, type XpWeek } from '../data/demoProgress.js';
import {
  findProfile,
  listFeaturedIds,
  listInsignia,
  listSectors,
  saveProfile,
  type InsigniaRecord,
  type SectorRecord,
  updateUsername,
  usernameTakenByOther,
  type ProfileChanges,
} from '../models/profileModel.js';
import { SIGN_IN_MESSAGE } from '../middleware/requireAuth.js';
import { verifyPassword } from './authService.js';
import { HttpError } from '../utils/httpError.js';

// The pilot profile (GET /api/profile/me) and its edits. Everything is for the
// signed-in pilot only: callers pass req.user.userId, never an id from the request.

export const MAX_FEATURED = 3;

export interface Insignia {
  rewardId: number;
  code: string; // picks the icon on the frontend
  name: string;
  description: string;
  earned: boolean;
}

export interface SectorProgress {
  languageId: number;
  displayName: string;
  questsCleared: number;
  questsTotal: number;
  proficiencyLevel: ProficiencyLevel;
}

// Everything the profile page shows. Never includes the email or password hash.
export interface PilotProfile {
  callsign: string;
  enlistedAt: string; // ISO date-time
  bio: string | null;
  title: { rewardId: number; code: string; name: string } | null;
  level: number;
  totalXp: number;
  levelXp: number;
  levelXpRequired: number;
  rank: ProficiencyLevel;
  homeSector: string | null;
  stats: { questsCleared: number; bugsSquashed: number; transmissionsDecoded: number };
  flightLog: { days: FlightLogDay[]; activeDays: number; currentStreak: number; longestStreak: number };
  xpHistory: XpWeek[];
  sectors: SectorProgress[];
  goal: SectorProgress | null;
  favouriteObjective: string;
  insignia: Insignia[];
  featuredIds: number[]; // in slot order
  loadout: { helmet: string | null; armour: string | null; insignia: string | null; booster: string | null };
  activeBuff: { name: string; xpMultiplier: number; questsRemaining: number } | null;
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

// unlock_condition is "<stat>>=<number>". Anything else (a typo, or a rule
// this code doesn't know yet) counts as not earned rather than earned.
function isEarned(condition: string, stats: Map<string, number>): boolean {
  const match = /^([a-z_]+)>=(\d+)$/.exec(condition.trim());
  if (!match) return false;
  const value = stats.get(match[1] ?? '');
  return value !== undefined && value >= Number(match[2]);
}

// The insignia and sector lists only change when content is added, so they're
// kept for a minute instead of being queried on every request. Simultaneous
// requests share one load.
const CATALOGUE_TTL_MS = 60 * 1000;
let catalogueCache: { insignia: InsigniaRecord[]; sectors: SectorRecord[]; loadedAt: number } | null = null;
let catalogueLoading: Promise<{ insignia: InsigniaRecord[]; sectors: SectorRecord[] }> | null = null;

async function loadCatalogue() {
  if (catalogueCache && Date.now() - catalogueCache.loadedAt < CATALOGUE_TTL_MS) return catalogueCache;
  catalogueLoading ??= Promise.all([listInsignia(), listSectors()])
    .then(([insignia, sectors]) => {
      catalogueCache = { insignia, sectors, loadedAt: Date.now() };
      return catalogueCache;
    })
    .finally(() => {
      catalogueLoading = null;
    });
  return catalogueLoading;
}

// Loads the pilot's account, progress and insignia, and works out what they've earned
async function loadPilot(userId: number) {
  const [record, featuredIds, { insignia: catalogue, sectors: sectorRecords }] = await Promise.all([
    findProfile(userId),
    listFeaturedIds(userId),
    loadCatalogue(),
  ]);
  if (!record) throw new HttpError(401, SIGN_IN_MESSAGE);

  const progress = demoProgress(userId);
  const flightLog = { days: progress.flightLog, ...streaks(progress.flightLog) };

  const sectors: SectorProgress[] = sectorRecords.map((sector) => ({
    ...sector,
    ...(progress.sectors[sector.languageId] ?? { questsCleared: 0, questsTotal: 0, proficiencyLevel: 'cadet' }),
  }));

  // The stats insignia unlock conditions can refer to
  const stats = new Map<string, number>([
    ['quests_cleared', progress.questsCleared],
    ['bugs_squashed', progress.bugsSquashed],
    ['transmissions_decoded', progress.transmissionsDecoded],
    ['ai_questions', progress.aiQuestions],
    ['longest_streak', flightLog.longestStreak],
    ['hive_assaults', progress.hiveAssaults],
    ['sectors_cleared', sectors.filter((s) => s.questsTotal > 0 && s.questsCleared >= s.questsTotal).length],
    ['commander_ranks', sectors.filter((s) => s.proficiencyLevel === 'commander').length],
  ]);

  const insignia: Insignia[] = catalogue.map(({ unlockCondition, ...reward }) => ({
    ...reward,
    earned: isEarned(unlockCondition, stats),
  }));
  const earnedIds = new Set(insignia.filter((i) => i.earned).map((i) => i.rewardId));

  return { record, progress, flightLog, sectors, insignia, earnedIds, featuredIds };
}

type LoadedPilot = Awaited<ReturnType<typeof loadPilot>>;

export async function buildProfile(userId: number): Promise<PilotProfile> {
  return toProfile(await loadPilot(userId));
}

function toProfile(pilot: LoadedPilot): PilotProfile {
  const { record, progress, flightLog, sectors, insignia, earnedIds, featuredIds } = pilot;

  // A title or featured insignia only shows while it's still earned
  const titleInsignia = insignia.find((i) => i.rewardId === record.titleRewardId && i.earned);
  const title = titleInsignia ? { rewardId: titleInsignia.rewardId, code: titleInsignia.code, name: titleInsignia.name } : null;

  return {
    callsign: record.username,
    enlistedAt: record.enlistedAt.toISOString(),
    bio: record.bio,
    title,
    level: progress.level,
    totalXp: progress.totalXp,
    levelXp: progress.levelXp,
    levelXpRequired: progress.levelXpRequired,
    rank: progress.rank,
    homeSector: sectors.find((s) => s.languageId === progress.homeLanguageId)?.displayName ?? null,
    stats: {
      questsCleared: progress.questsCleared,
      bugsSquashed: progress.bugsSquashed,
      transmissionsDecoded: progress.transmissionsDecoded,
    },
    flightLog,
    xpHistory: progress.xpHistory,
    sectors,
    goal: sectors.find((s) => s.languageId === record.goalLanguageId) ?? null,
    favouriteObjective: progress.favouriteObjective,
    insignia,
    featuredIds: featuredIds.filter((id) => earnedIds.has(id)),
    loadout: { ...progress.loadout, insignia: title?.name ?? null },
    activeBuff: progress.activeBuff,
  };
}

export interface ProfileUpdate {
  bio?: string; // '' clears it
  titleId?: number | null;
  goalLanguageId?: number | null;
  featuredIds?: number[];
}

// Checks every change against the pilot's own progress, saves them together,
// and returns the updated profile
export async function updateProfile(userId: number, update: ProfileUpdate): Promise<PilotProfile> {
  const pilot = await loadPilot(userId);
  const { earnedIds, sectors } = pilot;
  const fields: Record<string, string> = {};

  if (update.titleId != null && !earnedIds.has(update.titleId)) {
    fields.titleId = 'Choose an insignia you have earned.';
  }
  if (update.featuredIds?.some((id) => !earnedIds.has(id))) {
    fields.featuredIds = 'You can only feature insignia you have earned.';
  }
  if (update.goalLanguageId != null && !sectors.some((s) => s.languageId === update.goalLanguageId)) {
    fields.goalLanguageId = 'Choose a sector from the list.';
  }
  if (Object.keys(fields).length > 0) throw new HttpError(400, 'Check the highlighted fields.', fields);

  const changes: ProfileChanges = {
    bio: update.bio === undefined ? undefined : update.bio || null,
    titleRewardId: update.titleId,
    goalLanguageId: update.goalLanguageId,
    featuredIds: update.featuredIds,
  };
  await saveProfile(userId, changes);

  // Only the saved rows changed: re-read those rather than loading everything again
  const [record, featuredIds] = await Promise.all([findProfile(userId), listFeaturedIds(userId)]);
  if (!record) throw new HttpError(401, SIGN_IN_MESSAGE);
  return toProfile({ ...pilot, record, featuredIds });
}

const CALLSIGN_TAKEN = { callsign: 'That callsign is already taken.' };

// Needs the pilot's current access code. Wrong codes count towards the
// callsign rate limit, so this can't be used to guess a password.
export async function changeCallsign(userId: number, callsign: string, password: string): Promise<void> {
  if (!(await verifyPassword(userId, password))) {
    throw new HttpError(400, 'Check the highlighted fields.', { password: 'That access code is incorrect.' });
  }
  if (await usernameTakenByOther(callsign, userId)) {
    throw new HttpError(409, 'That callsign is already taken.', CALLSIGN_TAKEN);
  }
  try {
    await updateUsername(userId, callsign);
  } catch (err) {
    // Two pilots claiming the same callsign at once: the unique key catches the second
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'That callsign is already taken.', CALLSIGN_TAKEN);
    }
    throw err;
  }
}
