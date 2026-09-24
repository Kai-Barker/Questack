import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '../services/healthService';
import type { HealthResponse } from '../types/health';

type RowState = 'ok' | 'fail' | 'unknown';

const rowStyles: Record<RowState, { icon: string; colour: string }> = {
  ok: { icon: '✓', colour: 'text-emerald-400 border-emerald-400/40' },
  fail: { icon: '✕', colour: 'text-amber-400 border-amber-400/40' },
  unknown: { icon: '?', colour: 'text-slate-400 border-slate-500/40' },
};

function StatusRow({ label, state, text }: { label: string; state: RowState; text: string }) {
  const { icon, colour } = rowStyles[state];
  return (
    <li className="flex items-center justify-between border-b border-slate-800 py-3 last:border-b-0">
      <span className="text-slate-300">{label}</span>
      <span className={`flex items-center gap-2 rounded border px-2 py-0.5 text-sm font-medium ${colour}`}>
        <span aria-hidden="true">{icon}</span>
        {text}
      </span>
    </li>
  );
}

function DashboardPage() {
  const [checking, setChecking] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  // `null` means the backend couldn't be reached at all
  const showResult = useCallback((result: HealthResponse | null) => {
    setHealth(result);
    setError(result ? null : 'Backend unreachable. Is `npm run dev` running in Backend/?');
    setChecking(false);
    setCheckedAt(new Date());
  }, []);

  // Run the check once when the page loads
  useEffect(() => {
    getHealth().then(showResult, () => showResult(null));
  }, [showResult]);

  function handleRunCheck() {
    setChecking(true);
    getHealth().then(showResult, () => showResult(null));
  }

  const backendState: RowState = health ? 'ok' : error ? 'fail' : 'unknown';
  const databaseState: RowState = !health ? 'unknown' : health.database === 'connected' ? 'ok' : 'fail';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1120] p-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-cyan-400/20 bg-slate-900/60 p-6">
        <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Systems check</p>
        <h1 className="mt-1 text-2xl font-bold">Questack Dashboard</h1>

        <ul className="mt-6" aria-live="polite">
          <StatusRow label="Frontend" state="ok" text="Online" />
          <StatusRow
            label="Backend API"
            state={checking ? 'unknown' : backendState}
            text={checking ? 'Checking…' : backendState === 'ok' ? 'Online' : 'Offline'}
          />
          <StatusRow
            label="Database"
            state={checking ? 'unknown' : databaseState}
            text={
              checking
                ? 'Checking…'
                : databaseState === 'ok'
                  ? 'Connected'
                  : databaseState === 'fail'
                    ? 'Unreachable'
                    : 'Unknown'
            }
          />
        </ul>

        {error && !checking && (
          <p role="alert" className="mt-4 rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {checkedAt ? `Last checked ${checkedAt.toLocaleTimeString()}` : 'Not checked yet'}
          </span>
          <button
            type="button"
            onClick={handleRunCheck}
            disabled={checking}
            className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Run check'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
