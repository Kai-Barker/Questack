import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

// Wraps every signed-in screen. Signed-out pilots are sent to /login, which
// brings them back here afterwards.
export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center bg-space-950">
        <p role="status" className="font-display text-sm tracking-[0.25em] text-accent uppercase motion-safe:animate-pulse">
          Establishing uplink…
        </p>
      </main>
    );
  }

  if (status === 'anonymous') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
