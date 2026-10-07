import { useCallback, useMemo, type ReactNode } from 'react';
import { PilotContext } from './PilotContext';
import { useApiRequest } from '../hooks/useApiRequest';
import { useAuth } from '../hooks/useAuth';
import { getCurrentPilot } from '../services/pilotService';

// Fetches the signed-in pilot (GET /api/pilot/me) and shares it with the nav
// and every page. Pages call reload() after progress changes, e.g. clearing a
// quest or activating a booster. The callsign comes from the auth account, so
// a callsign change shows straight away.
export function PilotProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, loading, error, reload, replace } = useApiRequest(getCurrentPilot);

  // Once loaded, refresh quietly in the background so the nav and pages never
  // flash back to a loading state. A failed refresh keeps the last data.
  const hasData = data !== null;
  const refresh = useCallback(() => {
    if (!hasData) {
      reload();
      return;
    }
    getCurrentPilot().then(replace, () => {});
  }, [hasData, reload, replace]);

  const pilot = useMemo(() => (data && user ? { ...data, callsign: user.username } : data), [data, user]);
  const value = useMemo(() => ({ pilot, loading, error, reload: refresh }), [pilot, loading, error, refresh]);

  return <PilotContext value={value}>{children}</PilotContext>;
}
