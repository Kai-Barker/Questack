import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useBootSequence } from '../../hooks/useBootSequence';
import SplashScreen from './SplashScreen';

// Pages that are already a sign-in step: no point sending pilots back to them
const ENTRY_PATHS = new Set(['/', '/login', '/enlist']);
// Readable by anyone, straight away: the enlist form opens these in a new tab,
// where the splash would otherwise stand in front of them
const PUBLIC_PATHS = new Set(['/terms', '/privacy', '/recover']);

// Plays the splash on every fresh load, whatever the URL, until the app has
// loaded. Signed-in pilots then go straight to the page they opened; signed-out
// visitors choose Registered pilot or New recruit. After that the gate stays
// out of the way for the rest of the visit.
export default function BootGate() {
  const { status } = useAuth();
  const boot = useBootSequence(status);
  const navigate = useNavigate();
  const location = useLocation();
  const [entered, setEntered] = useState(false);
  // The page a signed-out visitor chose (/login or /enlist), once they've clicked
  const [destination, setDestination] = useState<string | null>(null);
  // Where the visitor was heading, so they come back to it after signing in
  const [requestedPath] = useState(() => `${location.pathname}${location.search}`);

  // Latch once in: signing out later must not bring the splash back.
  // A chosen destination only counts once the router has actually arrived
  // there; until then the page they first opened (perhaps a protected one)
  // must not render, or its own redirect would override the choice.
  const arrived = destination !== null && location.pathname === destination;
  if (!entered && ((boot.phase === 'ready' && status === 'authenticated') || arrived)) setEntered(true);

  if (entered || PUBLIC_PATHS.has(location.pathname)) return <Outlet />;

  const next = ENTRY_PATHS.has(location.pathname) ? '' : `?next=${encodeURIComponent(requestedPath)}`;
  const enter = (pathname: string) => {
    setDestination(pathname);
    navigate(`${pathname}${next}`, { replace: true });
  };

  return (
    <SplashScreen
      phase={boot.phase}
      progress={boot.progress}
      caption={boot.caption}
      diagnostic={boot.diagnostic}
      showChoices={status === 'anonymous'}
      onRetry={boot.retry}
      onRegistered={() => enter('/login')}
      onRecruit={() => enter('/enlist')}
    />
  );
}
