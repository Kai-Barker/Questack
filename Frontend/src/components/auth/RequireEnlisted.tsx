import { Navigate, Outlet, useLocation } from 'react-router';
import { usePilot } from '../../hooks/usePilot';

// Wraps the signed-in screens (inside AppLayout). A pilot who hasn't enlisted
// in any sector yet, such as one who has just signed up, goes through
// onboarding first, then on to the page they asked for.
export default function RequireEnlisted() {
  const { pilot } = usePilot();
  const location = useLocation();

  if (pilot && pilot.sectorsEnlisted === 0) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={next === '/' ? '/onboarding' : `/onboarding?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}
