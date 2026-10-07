import api from './api';
import type { HealthResponse } from '../types/health';

// 503 is still a valid answer: the backend is up but the database isn't.
// This only throws if the backend itself can't be reached (or doesn't answer
// within `timeoutMs`, when one is given).
export async function getHealth(timeoutMs?: number): Promise<HealthResponse> {
  const res = await api.get<HealthResponse>('/health', {
    timeout: timeoutMs,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 503,
  });
  return res.data;
}
