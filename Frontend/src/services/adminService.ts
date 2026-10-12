import api from './api';
import type { AdminOverview } from '../types/admin';

// Platform totals for the admin console. The backend answers 403 for anyone
// who isn't an admin, whatever the frontend shows.
export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await api.get<AdminOverview>('/admin/overview');
  return res.data;
}
