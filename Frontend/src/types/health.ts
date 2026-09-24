// Mirrors the response from GET /api/health in Backend/src/index.ts
export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'connected' | 'unreachable';
  timestamp: string;
}
