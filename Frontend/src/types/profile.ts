// Shapes for the /api/profile endpoints (Backend/src/routes/profileRoutes.ts).
// The quest stats are demo values from the backend until quest results are stored.

import type { ProficiencyLevel } from './pilot';

// Limits the backend enforces (Backend/src/services/profileService.ts and
// profileController.ts); shown here so the editor can match them
export const MAX_FEATURED = 3;
export const BIO_MAX = 160;

export interface Insignia {
  rewardId: number;
  code: string; // picks the icon (see components/profile/InsigniaBadge.tsx)
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

export interface FlightLogDay {
  date: string; // YYYY-MM-DD
  count: number; // objectives cleared that day
}

export interface XpWeek {
  weekStart: string; // YYYY-MM-DD, a Monday
  xp: number;
}

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
  favouriteObjective: string | null; // null until the pilot has cleared an objective
  insignia: Insignia[];
  featuredIds: number[]; // in slot order, at most 3
  loadout: { helmet: string | null; armour: string | null; insignia: string | null; booster: string | null };
  boosters: Booster[]; // owned, with charges left; the running one first
}

export interface Booster {
  boosterId: number;
  name: string;
  xpMultiplier: number;
  chargesRemaining: number;
  active: boolean;
}

// PATCH /api/profile/me: only the fields being changed
export interface ProfileUpdate {
  bio?: string; // '' clears it
  titleId?: number | null;
  goalLanguageId?: number | null;
  featuredIds?: number[];
}
