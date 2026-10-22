// Shape of GET /api/pilot/me (Backend/src/services/progressService.ts).
// Fields map to the users, user_language_progress and user_boosters tables,
// camelCased by the backend.

// Matches the proficiency_level enum in user_language_progress
export type ProficiencyLevel = 'cadet' | 'pilot' | 'commander';

// A piece of gear from the rewards table (reward_type = 'gear')
export interface GearItem {
  rewardId: number;
  code?: string; // picks a frame or visor's look (see components/ui/PilotAvatar.tsx)
  name: string;
}

// A booster the pilot has activated on their profile (e.g. Overdrive Core)
export interface ActiveBooster {
  name: string;
  xpMultiplier: number;
  questsRemaining: number; // first-time quest clears it will still boost
}

export interface PilotLoadout {
  frame?: GearItem;
  visor?: GearItem;
  insignia?: GearItem;
}

export interface PilotSummary {
  userId: number;
  callsign: string; // users.username
  level: number;
  totalXp: number;
  levelXp: number; // XP earned inside the current level
  levelXpRequired: number; // XP needed to finish the current level
  rank: ProficiencyLevel; // highest proficiency across enlisted sectors
  questsCleared: number;
  sectorsEnlisted: number;

  // Nice-to-have features: their panels hide themselves when these are missing
  currentStreak?: number;
  activeBooster?: ActiveBooster; // only while one is activated
  loadout?: PilotLoadout;
}
