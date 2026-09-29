import { getDashboard } from '../services/dashboardService';
import { useApiRequest } from './useApiRequest';

export function useDashboard() {
  return useApiRequest(getDashboard);
}
