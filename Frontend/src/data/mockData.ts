import type { DashboardData } from '../types/dashboard';
import type { PilotSummary } from '../types/pilot';
import { mockSectors } from './mockSectors';

// Dummy data matching the Galaxy Map wireframe.
// Only used while the services have USE_MOCKS = true.

export const mockPilot: PilotSummary = {
  userId: 1,
  callsign: 'VEGA-7',
  level: 7,
  totalXp: 12340,
  levelXp: 1240,
  levelXpRequired: 2000,
  rank: 'pilot',
  questsCleared: 5, // matches the cleared quests in mockSectors
  sectorsEnlisted: 2,
  currentStreak: 5,
  activeBuff: { name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 3 },
  loadout: {
    helmet: { rewardId: 11, name: 'Navigator Visor' },
    insignia: { rewardId: 2, name: 'Bug Hunter' },
  },
};

// Built at call time from mockSectors so the dashboard and sector screens
// always agree (including rank changes made on the sector screen).
export function buildMockDashboard(): DashboardData {
  return {
    sectors: mockSectors.map((sector) => ({
      languageId: sector.languageId,
      name: sector.name,
      displayName: sector.displayName,
      questsCleared: sector.quests.filter((quest) => quest.cleared).length,
      questsTotal: sector.quests.length,
      proficiencyLevel: sector.proficiencyLevel,
    })),
    continueMission: {
      questId: 5,
      title: 'The Loop Labyrinth',
      languageId: 1,
      sectorDisplayName: 'C#',
      concept: 'Loops',
      difficulty: 'medium',
      objectivesCompleted: 2,
      objectivesTotal: 4,
    },
  };
}
