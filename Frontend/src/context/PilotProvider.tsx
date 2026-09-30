import { useMemo, type ReactNode } from 'react';
import { PilotContext } from './PilotContext';
import { useApiRequest } from '../hooks/useApiRequest';
import { useAuth } from '../hooks/useAuth';
import { getCurrentPilot } from '../services/pilotService';

// Fetches the signed-in pilot once and shares it with the nav and every page.
// The callsign comes from the real account; XP, level and loadout are still
// mock data until the pilot endpoint is built.
export function PilotProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApiRequest(getCurrentPilot);

  const pilot = useMemo(() => (data && user ? { ...data, callsign: user.username } : data), [data, user]);
  const value = useMemo(() => ({ pilot, loading, error, reload }), [pilot, loading, error, reload]);

  return <PilotContext value={value}>{children}</PilotContext>;
}
