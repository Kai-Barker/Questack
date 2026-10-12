import { useNavigate } from 'react-router';
import RankSelector from '../components/sector/RankSelector';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import { useApiRequest } from '../hooks/useApiRequest';
import { useAuth } from '../hooks/useAuth';
import { usePilot } from '../hooks/usePilot';
import { getDashboard } from '../services/dashboardService';

// Account details, the pilot's proficiency class in each sector (which sets
// how the Ship's AI explains things), and signing out. Callsign, bio and
// featured insignia are edited on the Profile.
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { reload: refreshPilot } = usePilot();
  const navigate = useNavigate();
  const { data: dashboard, error, reload } = useApiRequest(getDashboard);

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">Settings</h1>

      <Panel label="Account">
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-display text-xs tracking-[0.2em] text-muted uppercase">Callsign</dt>
          <dd className="text-slate-100">{user?.username}</dd>
          <dt className="font-display text-xs tracking-[0.2em] text-muted uppercase">Email</dt>
          <dd className="text-slate-100">{user?.email}</dd>
          <dt className="font-display text-xs tracking-[0.2em] text-muted uppercase">Role</dt>
          <dd className="text-slate-100">{user?.role === 'admin' ? 'Admin' : 'Pilot'}</dd>
        </dl>
        <Button variant="outline" size="sm" to="/profile" className="mt-5">
          Edit profile
        </Button>
      </Panel>

      <Panel label="Proficiency class">
        <p className="mt-3 text-sm text-slate-300">
          Sets how the Ship's AI explains things in each sector: Cadet for everyday metaphors, Pilot for plain technical
          terms, Commander for patterns and trade-offs. You can also switch it for a single conversation in the Ship's AI panel.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-swarm">
            {error}{' '}
            <button type="button" onClick={reload} className="underline">
              Retry
            </button>
          </p>
        )}
        {!dashboard && !error && (
          <p role="status" className="mt-4 text-sm text-slate-300">
            Loading sectors…
          </p>
        )}
        <ul className="mt-4 space-y-5">
          {dashboard?.sectors.map((sector) => (
            <li key={sector.languageId}>
              <p className="font-display text-sm font-semibold tracking-[0.15em] uppercase">{sector.displayName} Sector</p>
              <div className="mt-2">
                <RankSelector
                  languageId={sector.languageId}
                  initialRank={sector.proficiencyLevel}
                  onSaved={() => void refreshPilot()}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel label="Session">
        <p className="mt-3 text-sm text-slate-300">Sign out of Questack on this device.</p>
        <Button variant="outline" size="sm" onClick={() => void handleSignOut()} className="mt-4">
          Sign out
        </Button>
      </Panel>
    </main>
  );
}
