import api from './api';
import { mockResponse } from './mockResponse';
import { mockPilot } from '../data/mockData';
import type { PilotSummary } from '../types/pilot';

// Flip to false once GET /api/pilot/me exists in the backend
const USE_MOCKS = true;

export async function getCurrentPilot(): Promise<PilotSummary> {
  if (USE_MOCKS) return mockResponse(mockPilot);

  const res = await api.get<PilotSummary>('/pilot/me');
  return res.data;
}
