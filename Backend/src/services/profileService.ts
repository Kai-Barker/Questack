import {
  findProfile,
  listFeaturedIds,
  listInsignia,
  saveProfile,
  type InsigniaRecord,
  updateUsername,
  usernameTakenByOther,
  type ProfileChanges,
} from '../models/profileModel.js';
import { countDecodes } from '../models/decoderModel.js';
import { activateBooster, countAiQuestions, countCorrectAnswersByType } from '../models/progressModel.js';
import { SIGN_IN_MESSAGE } from '../middleware/requireAuth.js';
import type { ChallengeType, Proficiency } from '../types/content.js';
import { verifyPassword } from './authService.js';
import {
  DEMO_HELMET,
  loadFlightLog,
  loadPilotCore,
  loadXpHistory,
  type FlightLog,
  type XpWeek,
} from './progressService.js';
import { HttpError } from '../utils/httpError.js';

// The pilot profile (GET /api/profile/me) and its edits. Everything is for the
// signed-in pilot only: callers pass req.user.userId, never an id from the request.
// Stats come from the pilot's real progress (services/progressService.ts).

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
  proficiencyLevel: Proficiency;
}

export interface Booster {
  boosterId: number;
  name: string;
  xpMultiplier: number;
  chargesRemaining: number;
  active: boolean;
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
  rank: Proficiency;
  homeSector: string | null;
  stats: { questsCleared: number; bugsSquashed: number; transmissionsDecoded: number };
  flightLog: FlightLog;
  xpHistory: XpWeek[];
  sectors: SectorProgress[];
  goal: SectorProgress | null;
  favouriteObjective: string | null; // null until the pilot has cleared an objective
  insignia: Insignia[];
  featuredIds: number[]; // in slot order
  loadout: { helmet: string | null; armour: string | null; insignia: string | null; booster: string | null };
  boosters: Booster[]; // owned, with charges left; the running one first
}

const OBJECTIVE_LABELS: Record<ChallengeType, string> = {
  read_and_explain: 'Read and explain',
  bug_hunt: 'Bug hunt',
  decode_transmission: 'Decode the transmission',
  architecture: 'Architecture design',
};

// unlock_condition is "<stat>>=<number>". Anything else (a typo, or a rule
// this code doesn't know yet) counts as not earned rather than earned.
function isEarned(condition: string, stats: Map<string, number>): boolean {
  const match = /^([a-z_]+)>=(\d+)$/.exec(condition.trim());
  if (!match) return false;
  const value = stats.get(match[1] ?? '');
  return value !== undefined && value >= Number(match[2]);
}

// The insignia list only changes when content is added, so it's kept for a
// minute instead of being queried on every request. Simultaneous requests
// share one load. (Sectors come from the cached quest catalogue.)
const INSIGNIA_TTL_MS = 60 * 1000;
let insigniaCache: { insignia: InsigniaRecord[]; loadedAt: number } | null = null;
let insigniaLoading: Promise<InsigniaRecord[]> | null = null;

async function loadInsignia(): Promise<InsigniaRecord[]> {
  if (insigniaCache && Date.now() - insigniaCache.loadedAt < INSIGNIA_TTL_MS) return insigniaCache.insignia;
  insigniaLoading ??= listInsignia()
    .then((insignia) => {
      insigniaCache = { insignia, loadedAt: Date.now() };
      return insignia;
    })
    .finally(() => {
      insigniaLoading = null;
    });
  return insigniaLoading;
}

// Loads the pilot's account and progress, and works out what they've earned
async function loadPilot(userId: number) {
  const [record, featuredIds, catalogue, core, flightLog, xpHistory, answersByType, aiQuestions, decodes] = await Promise.all([
    findProfile(userId),
    listFeaturedIds(userId),
    loadInsignia(),
    loadPilotCore(userId),
    loadFlightLog(userId),
    loadXpHistory(userId),
    countCorrectAnswersByType(userId),
    countAiQuestions(userId),
    countDecodes(userId),
  ]);
  if (!record) throw new HttpError(401, SIGN_IN_MESSAGE);

  const sectors: SectorProgress[] = core.catalog.sectors.map((s) => ({
    languageId: s.languageId,
    displayName: s.displayName,
    questsCleared: s.quests.filter((q) => core.clearedIds.has(q.questId)).length,
    questsTotal: s.quests.length,
    proficiencyLevel: core.languages.get(s.languageId)?.proficiency ?? 'cadet',
  }));

  const stats = {
    questsCleared: core.cleared.size,
    bugsSquashed: answersByType.get('bug_hunt') ?? 0,
    // Decode objectives in quests, plus checks passed on the standalone decoder
    transmissionsDecoded: (answersByType.get('decode_transmission') ?? 0) + decodes,
  };

  // The stats insignia unlock conditions can refer to
  const unlockStats = new Map<string, number>([
    ['quests_cleared', stats.questsCleared],
    ['bugs_squashed', stats.bugsSquashed],
    ['transmissions_decoded', stats.transmissionsDecoded],
    ['ai_questions', aiQuestions],
    ['longest_streak', flightLog.longestStreak],
    ['hive_assaults', 0], // Hive Assaults aren't built yet
    ['sectors_cleared', sectors.filter((s) => s.questsTotal > 0 && s.questsCleared >= s.questsTotal).length],
    ['commander_ranks', sectors.filter((s) => core.languages.get(s.languageId)?.proficiency === 'commander').length],
  ]);

  const insignia: Insignia[] = catalogue.map(({ unlockCondition, ...reward }) => ({
    ...reward,
    earned: isEarned(unlockCondition, unlockStats),
  }));
  const earnedIds = new Set(insignia.filter((i) => i.earned).map((i) => i.rewardId));

  // Most-cleared objective type, and the sector with the most XP
  const favourite = [...answersByType.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const home = [...core.languages.values()].filter((l) => l.languageXp > 0).sort((a, b) => b.languageXp - a.languageXp)[0];

  return {
    record,
    core,
    flightLog,
    xpHistory,
    sectors,
    stats,
    insignia,
    earnedIds,
    featuredIds,
    favouriteObjective: favourite ? OBJECTIVE_LABELS[favourite] : null,
    homeSector: home ? (core.catalog.sectorById.get(home.languageId)?.displayName ?? null) : null,
  };
}

type LoadedPilot = Awaited<ReturnType<typeof loadPilot>>;

export async function buildProfile(userId: number): Promise<PilotProfile> {
  return toProfile(await loadPilot(userId));
}

function toProfile(pilot: LoadedPilot): PilotProfile {
  const { record, core, sectors, insignia, earnedIds, featuredIds } = pilot;

  // A title or featured insignia only shows while it's still earned
  const titleInsignia = insignia.find((i) => i.rewardId === record.titleRewardId && i.earned);
  const title = titleInsignia ? { rewardId: titleInsignia.rewardId, code: titleInsignia.code, name: titleInsignia.name } : null;

  return {
    callsign: record.username,
    enlistedAt: record.enlistedAt.toISOString(),
    bio: record.bio,
    title,
    level: core.level.level,
    totalXp: core.totalXp,
    levelXp: core.level.levelXp,
    levelXpRequired: core.level.levelXpRequired,
    rank: core.rank,
    homeSector: pilot.homeSector,
    stats: pilot.stats,
    flightLog: pilot.flightLog,
    xpHistory: pilot.xpHistory,
    sectors,
    goal: sectors.find((s) => s.languageId === record.goalLanguageId) ?? null,
    favouriteObjective: pilot.favouriteObjective,
    insignia,
    featuredIds: featuredIds.filter((id) => earnedIds.has(id)),
    // Helmet is DUMMY gear until the loadout screen exists
    loadout: { helmet: DEMO_HELMET, armour: null, insignia: title?.name ?? null, booster: core.activeBooster?.name ?? null },
    boosters: core.boosters,
  };
}

// Activates one of the pilot's boosters and returns the updated profile.
// Only one can run at a time; it uses one charge per first-time quest clear.
export async function startBooster(userId: number, boosterId: number): Promise<PilotProfile> {
  const outcome = await activateBooster(userId, boosterId);
  if (outcome === 'busy') throw new HttpError(409, 'A booster is already running. Use it up first, Pilot.');
  if (outcome === 'not-found') throw new HttpError(404, 'That booster isn’t in your inventory.');
  return buildProfile(userId);
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
