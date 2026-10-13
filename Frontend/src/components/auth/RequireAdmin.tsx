import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { verifyAdminSession } from '../../services/adminService';
import Button from '../ui/Button';
import GalaxyBackdrop from '../ui/GalaxyBackdrop';
import Panel from '../ui/Panel';

type Clearance = 'checking' | 'cleared' | 'denied' | 'offline';

// Wraps the admin console, inside RequireAuth. Pilots without the admin role
// are sent back to the Galaxy Map at once. For admins, the role is confirmed
// with the backend before the console opens, and again each time they switch
// admin tab, so a role taken away (or an account deactivated) closes the
// console straight away. The backend also checks the role on every admin request.
export default function RequireAdmin() {
  const { user, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';
  const [clearance, setClearance] = useState<Clearance>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    verifyAdminSession().then(
      () => {
        if (!cancelled) setClearance('cleared');
      },
      (err: unknown) => {
        if (cancelled) return;
        const status = isAxiosError(err) ? err.response?.status : undefined;
        if (status === 403) {
          setClearance('denied');
          // Picks up the new role, so the Admin tab disappears too
          void refreshUser();
        } else if (status !== 401) {
          // 401 signs the pilot out (AuthProvider), and RequireAuth takes over.
          // Otherwise the backend couldn't confirm: an open console stays open
          // (its own requests are still checked), a closed one waits for a retry.
          setClearance((current) => (current === 'cleared' ? current : 'offline'));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isAdmin, pathname, attempt, refreshUser]);

  if (!isAdmin || clearance === 'denied') return <Navigate to="/" replace />;
  if (clearance === 'cleared') return <Outlet />;

  return (
    <div className="relative isolate grid min-h-screen place-items-center px-4 text-slate-100">
      <GalaxyBackdrop deep />
      {clearance === 'checking' ? (
        <p role="status" className="font-display text-sm tracking-[0.2em] text-accent uppercase motion-safe:animate-pulse">
          Verifying command clearance…
        </p>
      ) : (
        <Panel label="Clearance check failed" className="w-full max-w-md">
          <p role="alert" className="mt-3 text-sm text-slate-300">
            Command couldn’t confirm your clearance. Check your connection and try again.
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => {
                setClearance('checking');
                setAttempt((n) => n + 1);
              }}
              className="flex-1"
            >
              Retry
            </Button>
            <Button to="/" variant="outline" className="flex-1">
              Exit admin
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
