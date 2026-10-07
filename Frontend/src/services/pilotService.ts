import api from './api';
import type { PilotSummary } from '../types/pilot';

// The signed-in pilot's level, XP, rank, streak and active booster (nav and dashboard)
export async function getCurrentPilot(): Promise<PilotSummary> {
  const res = await api.get<PilotSummary>('/pilot/me');
  return res.data;
}
