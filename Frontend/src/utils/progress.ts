import type { SectorSummary } from '../types/dashboard';

// Status of a real sector. Empty map slots are drawn as "uncharted" separately.
export type SectorStatus = 'cleared' | 'infested';

// Replays of a cleared quest earn this share of its XP, and boosters only
// apply to first clears (Backend/src/config/progress.ts sets the real rule)
export const REPLAY_XP_SHARE = 0.25;

// Whole-number percentage, safe when total is 0
export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

// A sector is cleared once every quest in it is done; until then the Swarm is still there
export function sectorStatus(sector: SectorSummary): SectorStatus {
  return sector.questsTotal > 0 && sector.questsCleared >= sector.questsTotal ? 'cleared' : 'infested';
}
