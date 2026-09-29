import type { ProficiencyLevel } from './pilot';

// Shape of GET /api/dashboard (not built yet, see services/dashboardService.ts).
// The backend sends raw counts; percentages and statuses are derived in utils/progress.ts.

// Matches the difficulty enum in quests
export type Difficulty = 'easy' | 'medium' | 'hard';

// One language from the languages table, plus the pilot's progress in it
export interface SectorSummary {
  languageId: number;
  name: string; // languages.name, e.g. 'csharp'
  displayName: string; // languages.display_name, e.g. 'C#'
  questsCleared: number;
  questsTotal: number;
  proficiencyLevel?: ProficiencyLevel; // undefined = not enlisted in this sector
}

// The pilot's most recent unfinished quest attempt
export interface ContinueMission {
  questId: number;
  title: string;
  languageId: number;
  sectorDisplayName: string;
  concept: string;
  difficulty: Difficulty;
  objectivesCompleted: number;
  objectivesTotal: number;
}

export interface DashboardData {
  sectors: SectorSummary[];
  continueMission: ContinueMission | null;
}
