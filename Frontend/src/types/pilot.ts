// Shape of GET /api/pilot/me (not built yet, see services/pilotService.ts).
// Fields map to the users, user_language_progress and user_rewards tables,
// camelCased by the backend.

// Matches the proficiency_level enum in user_language_progress
export type ProficiencyLevel = 'cadet' | 'pilot' | 'commander';

// A piece of gear from the rewards table (reward_type = 'gear')
export interface GearItem {
  rewardId: number;
  name: string;
}

export interface ActiveBuff {
  name: string;
  xpMultiplier: number;
  questsRemaining: number;
}

export interface PilotLoadout {
  helmet?: GearItem;
  armour?: GearItem;
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
  activeBuff?: ActiveBuff;
  loadout?: PilotLoadout;
}
