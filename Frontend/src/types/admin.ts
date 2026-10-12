// Shapes for the /api/admin endpoints (Backend/src/routes/adminRoutes.ts)

export interface AdminOverview {
  pilots: number;
  activePilots: number;
  publishedQuests: number;
  draftQuests: number;
  aiCallsToday: number; // the last 24 hours
  aiTokensToday: number;
}
