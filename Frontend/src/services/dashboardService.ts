import api from './api';
import type { DashboardData } from '../types/dashboard';

// Galaxy Map data: every sector with the pilot's progress, plus the mission to continue
export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<DashboardData>('/dashboard');
  return res.data;
}
