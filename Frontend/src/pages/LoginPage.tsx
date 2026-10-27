import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import AuthCard from '../components/auth/AuthCard';
import AuthCheckbox from '../components/auth/AuthCheckbox';
import AuthField from '../components/auth/AuthField';
import FleetStatus from '../components/auth/FleetStatus';
import ChamferFrame from '../components/ui/ChamferFrame';
import ChevronButton from '../components/ui/ChevronButton';
import { LockIcon } from '../components/ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useUplink } from '../hooks/useUplink';
import { toAuthFailure } from '../services/authService';
import type { AuthFailure } from '../types/auth';
import { withoutField } from '../utils/authRules';
import { safeNextPath } from '../utils/redirect';

const statusLines: Record<AuthFailure['kind'], string> = {
  denied: 'access denied',
  limited: 'terminal locked: too many attempts',
  offline: 'uplink lost',
  invalid: 'credentials incomplete',
  conflict: 'access denied',
  error: 'transmission failed',
};

export default function LoginPage() {
  const { login } = useAuth();
  const uplink = useUplink();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [missing, setMissing] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const empty: Record<string, string> = {};
    if (!identifier.trim()) empty.identifier = 'Enter your callsign or email.';
    if (!password) empty.password = 'Enter your password.';
    setMissing(empty);
    if (Object.keys(empty).length > 0) return;

    setSubmitting(true);
    setFailure(null);
    try {
      await login({ identifier: identifier.trim(), password, remember });
      navigate(safeNextPath(params.get('next')), { replace: true });
    } catch (err) {
      setFailure(toAuthFailure(err));
      setPassword('');
      setSubmitting(false);
    }
  }

  // Editing a field clears its error straight away
  function edit(field: string, set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setMissing((errors) => withoutField(errors, field));
      setFailure((f) => (f?.fields[field] ? { ...f, fields: withoutField(f.fields, field) } : f));
    };
  }

  const fieldErrors = { ...missing, ...failure?.fields };
  const status = submitting ? 'authenticating…' : failure ? statusLines[failure.kind] : 'awaiting credentials';

  return (
    <AuthCard
      tab="Pilot authentication"
      status={status}
      badge={
        <ChamferFrame
          size="sm"
          innerClassName="flex items-center gap-2 bg-panel-raised px-4 py-2 font-mono text-[0.65rem] tracking-[0.15em] text-slate-300 uppercase"
        >
          <LockIcon aria-hidden="true" /> Encrypted channel
        </ChamferFrame>
      }
      aside={<FleetStatus uplink={uplink} />}
    >
      <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase sm:text-4xl">Welcome back, Pilot</h1>
      <p className="mt-2 text-sm text-slate-300">Authenticate to resume your campaign.</p>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        <AuthField
          id="identifier"
          label="Pilot ID / email"
          value={identifier}
          onChange={edit('identifier', setIdentifier)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={255}
          placeholder="Callsign or email"
          error={fieldErrors.identifier}
        />
        <AuthField
          id="password"
          label="Password"
          type={reveal ? 'text' : 'password'}
          value={password}
          onChange={edit('password', setPassword)}
          autoComplete="current-password"
          maxLength={200}
          error={fieldErrors.password}
          reveal={{ shown: reveal, onToggle: () => setReveal((r) => !r) }}
          hint={
            <Link to="/recover" className="hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
              Recover access
            </Link>
          }
        />
        <AuthCheckbox id="remember" checked={remember} onChange={setRemember}>
          Keep this terminal signed in
        </AuthCheckbox>

        {failure && failure.kind !== 'invalid' && (
          <p role="alert" className="border-l-2 border-swarm bg-swarm/10 px-4 py-2.5 text-sm text-swarm">
            {failure.message}
          </p>
        )}

        <div className="flex flex-wrap gap-4 pt-1">
          <ChevronButton type="submit" disabled={submitting}>
            {submitting ? 'Authenticating…' : 'Authenticate'}
          </ChevronButton>
          <ChevronButton variant="outline" to={`/enlist${location.search}`}>
            Enlist instead
          </ChevronButton>
        </div>
        <p className="text-xs text-muted">No pilot record? Enlisting takes under a minute.</p>
      </form>
    </AuthCard>
  );
}
