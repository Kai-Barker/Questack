import { useMemo, type ReactNode } from 'react';
import { PilotContext } from './PilotContext';
import { useApiRequest } from '../hooks/useApiRequest';
import { getCurrentPilot } from '../services/pilotService';

// Fetches the signed-in pilot once and shares it with the nav and every page.
// Week 3 auth can hang the logged-in user off this same provider.
export function PilotProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApiRequest(getCurrentPilot);

  const value = useMemo(() => ({ pilot: data, loading, error, reload }), [data, loading, error, reload]);

  return <PilotContext value={value}>{children}</PilotContext>;
}
