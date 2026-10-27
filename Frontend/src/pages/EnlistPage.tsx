import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import AuthCard from '../components/auth/AuthCard';
import AuthCheckbox from '../components/auth/AuthCheckbox';
import AuthField from '../components/auth/AuthField';
import ChamferFrame from '../components/ui/ChamferFrame';
import ChevronButton from '../components/ui/ChevronButton';
import { CheckIcon, CloseIcon } from '../components/ui/icons';
import { useAuth } from '../hooks/useAuth';
import { toAuthFailure } from '../services/authService';
import type { AuthFailure } from '../types/auth';
import { accessCodeChecks, callsignError, emailError, passwordError, withoutField } from '../utils/authRules';
import { safeNextPath } from '../utils/redirect';

// This screen is step 01. Steps 02 and 03 are onboarding (OnboardingPage),
// which new pilots are sent to once signed in (see RequireEnlisted)
const SEQUENCE = [
  { number: '01', title: 'Pilot record', detail: 'Callsign and password' },
  { number: '02', title: 'First sector', detail: 'Choose a language and rank' },
  { number: '03', title: 'Launch', detail: 'Deploy on your first quest' },
];

function EnlistAside({ password, confirm }: { password: string; confirm: string }) {
  return (
    <div>
      <h2 className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">Enlistment sequence</h2>
      <ol className="mt-4">
        {SEQUENCE.map((step, i) => {
          const active = i === 0;
          return (
            <li key={step.number} aria-current={active ? 'step' : undefined} className="relative flex gap-4 pb-6 last:pb-0">
              {i < SEQUENCE.length - 1 && (
                <span aria-hidden="true" className="absolute top-8 bottom-1 left-[13px] border-l border-dashed border-line-bright" />
              )}
              <ChamferFrame
                size="octagon"
                borderClassName={active ? 'bg-accent' : 'bg-line-bright'}
                innerClassName={`grid size-[26px] place-items-center font-mono text-[0.65rem] ${active ? 'bg-accent text-space-950' : 'bg-space-950 text-muted'}`}
              >
                {step.number}
              </ChamferFrame>
              <div>
                <p className={`font-display text-sm font-semibold ${active ? 'text-slate-100' : 'text-slate-300'}`}>{step.title}</p>
                <p className="text-xs text-muted">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <hr className="my-6 border-line" />

      <h2 className="font-display text-xs tracking-[0.2em] text-slate-300 uppercase">Password checks</h2>
      <ul className="mt-3 space-y-2 font-mono text-xs">
        {accessCodeChecks(password, confirm).map((check) => (
          <li key={check.label} className={`flex items-center gap-2 ${check.met ? 'text-buff' : 'text-muted'}`}>
            {check.met ? <CheckIcon aria-hidden="true" /> : <CloseIcon aria-hidden="true" />}
            {check.label}
            <span className="sr-only">{check.met ? '(met)' : '(not met yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const statusLines: Record<AuthFailure['kind'], string> = {
  invalid: 'record incomplete: check the highlighted fields',
  conflict: 'enlistment rejected',
  limited: 'terminal locked: too many enlistments',
  offline: 'uplink lost',
  denied: 'enlistment rejected',
  error: 'transmission failed',
};

export default function EnlistPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const checks = {
      callsign: callsignError(callsign),
      email: emailError(email),
      password: passwordError(password),
      confirm: confirm === password ? undefined : "The passwords don't match.",
      acceptTerms: acceptTerms ? undefined : 'Accept the terms to enlist.',
    };
    for (const [field, message] of Object.entries(checks)) if (message) errors[field] = message;
    setClientErrors(errors);
    setFailure(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await register({ callsign: callsign.trim(), email: email.trim(), password, acceptTerms });
      navigate(safeNextPath(params.get('next')), { replace: true });
    } catch (err) {
      setFailure(toAuthFailure(err));
      setSubmitting(false);
    }
  }

  // Editing a field clears its error straight away
  function edit<T>(field: string, set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setClientErrors((errors) => withoutField(errors, field));
      setFailure((f) => (f?.fields[field] ? { ...f, fields: withoutField(f.fields, field) } : f));
    };
  }

  const fieldErrors: Record<string, string | undefined> = { ...clientErrors, ...failure?.fields };
  const status = submitting ? 'transmitting pilot record…' : failure ? statusLines[failure.kind] : 'creating pilot record';

  return (
    <AuthCard
      tab="Pilot enlistment"
      status={status}
      badge={
        <ChamferFrame
          size="sm"
          borderClassName="bg-accent/50"
          innerClassName="bg-panel-raised px-5 py-2 font-mono text-xs tracking-[0.15em] text-accent uppercase"
        >
          Step 01 / 03
        </ChamferFrame>
      }
      aside={<EnlistAside password={password} confirm={confirm} />}
    >
      <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase sm:text-4xl">Create your pilot</h1>
      <p className="mt-2 text-sm text-slate-300">
        Your callsign is how the fleet sees you. Everything else stays private.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        <AuthField
          id="callsign"
          label="Callsign"
          hint="Public"
          value={callsign}
          onChange={edit('callsign', setCallsign)}
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          placeholder="e.g. VEGA-7"
          valid={callsign.length > 0 && !callsignError(callsign)}
          error={fieldErrors.callsign}
        />
        <AuthField
          id="email"
          label="Email"
          hint="Private"
          type="email"
          value={email}
          onChange={edit('email', setEmail)}
          autoComplete="email"
          spellCheck={false}
          maxLength={255}
          placeholder="you@example.com"
          error={fieldErrors.email}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField
            id="password"
            label="Password"
            type={reveal ? 'text' : 'password'}
            value={password}
            onChange={edit('password', setPassword)}
            autoComplete="new-password"
            maxLength={200}
            error={fieldErrors.password}
          />
          <AuthField
            id="confirm"
            label="Confirm"
            type={reveal ? 'text' : 'password'}
            value={confirm}
            onChange={edit('confirm', setConfirm)}
            autoComplete="new-password"
            maxLength={200}
            error={fieldErrors.confirm}
            reveal={{ shown: reveal, onToggle: () => setReveal((r) => !r) }}
          />
        </div>
        <AuthCheckbox id="acceptTerms" checked={acceptTerms} onChange={edit('acceptTerms', setAcceptTerms)} error={fieldErrors.acceptTerms}>
          I accept the{' '}
          <Link to="/terms" target="_blank" rel="noopener" className="text-accent underline-offset-2 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" target="_blank" rel="noopener" className="text-accent underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </AuthCheckbox>

        {failure && failure.kind !== 'invalid' && (
          <p role="alert" className="border-l-2 border-swarm bg-swarm/10 px-4 py-2.5 text-sm text-swarm">
            {failure.message}
          </p>
        )}

        <div className="flex flex-wrap gap-4 pt-1">
          <ChevronButton type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create pilot'}
          </ChevronButton>
          <ChevronButton variant="outline" to={`/login${location.search}`}>
            Already enlisted
          </ChevronButton>
        </div>
      </form>
    </AuthCard>
  );
}
