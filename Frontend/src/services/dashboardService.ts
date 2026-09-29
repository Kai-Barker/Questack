import api from './api';
import { mockResponse } from './mockResponse';
import { buildMockDashboard } from '../data/mockData';
import type { DashboardData } from '../types/dashboard';

// Flip to false once GET /api/dashboard exists in the backend
const USE_MOCKS = true;

export async function getDashboard(): Promise<DashboardData> {
  if (USE_MOCKS) return mockResponse(buildMockDashboard());

  const res = await api.get<DashboardData>('/dashboard');
  return res.data;
}
