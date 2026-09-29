//----------------FOR TESTING-----------------------
// Checks that frontend -> backend -> database are all talking.
// Dismiss it with the ×; it comes back on the next page load.
// Remove it (and its line in AppLayout.tsx) before release.

import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '../../services/healthService';
import type { HealthResponse } from '../../types/health';
import ChamferFrame from '../ui/ChamferFrame';
import { CloseIcon, RefreshIcon } from '../ui/icons';

type RowState = 'ok' | 'fail' | 'unknown';

const rowStyles: Record<RowState, { icon: string; colour: string }> = {
  ok: { icon: '✓', colour: 'text-buff' },
  fail: { icon: '✕', colour: 'text-swarm' },
  unknown: { icon: '…', colour: 'text-muted' },
};

function StatusRow({ label, state, text }: { label: string; state: RowState; text: string }) {
  const { icon, colour } = rowStyles[state];
  return (
    <li className="flex items-center justify-between py-1 text-xs">
      <span className="text-slate-300">{label}</span>
      <span className={`flex items-center gap-1.5 font-medium ${colour}`}>
        <span aria-hidden="true">{icon}</span>
        {text}
      </span>
    </li>
  );
}

export default function SystemsStatusToast() {
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);

  // `null` means the backend couldn't be reached at all
  const showResult = useCallback((result: HealthResponse | null) => {
    setHealth(result);
    setReachable(result !== null);
    setChecking(false);
  }, []);

  // Run the check once when the app loads
  useEffect(() => {
    getHealth().then(showResult, () => showResult(null));
  }, [showResult]);

  function handleRunCheck() {
    setChecking(true);
    getHealth().then(showResult, () => showResult(null));
  }

  if (dismissed) return null;

  const backendState: RowState = checking || reachable === null ? 'unknown' : reachable ? 'ok' : 'fail';
  const databaseState: RowState =
    checking || !health ? 'unknown' : health.database === 'connected' ? 'ok' : 'fail';
  const allOnline = backendState === 'ok' && databaseState === 'ok';

  const summary = checking ? 'Running systems check…' : allOnline ? 'All systems online' : 'Systems degraded';

  return (
    <aside aria-label="Systems status" className="fixed top-24 right-4 z-50 w-64 shadow-lg shadow-black/40">
      <ChamferFrame
        size="md"
        borderClassName={checking ? 'bg-line-bright' : allOnline ? 'bg-buff/60' : 'bg-swarm/60'}
        innerClassName="bg-panel p-3"
      >
        <div className="flex items-center gap-2">
          <p aria-live="polite" className="flex-1 font-display text-xs font-semibold tracking-[0.15em] uppercase">
            {summary}
          </p>
          <button
            type="button"
            onClick={handleRunCheck}
            disabled={checking}
            aria-label="Run systems check again"
            className="hover-grow rounded p-1 text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss systems status"
            className="hover-grow rounded p-1 text-muted hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
          </button>
        </div>

        <ul className="mt-2 border-t border-line pt-1">
          <StatusRow label="Frontend" state="ok" text="Online" />
          <StatusRow
            label="Backend API"
            state={backendState}
            text={backendState === 'unknown' ? 'Checking…' : backendState === 'ok' ? 'Online' : 'Offline'}
          />
          <StatusRow
            label="Database"
            state={databaseState}
            text={
              databaseState === 'ok'
                ? 'Connected'
                : databaseState === 'fail'
                  ? 'Unreachable'
                  : checking
                    ? 'Checking…'
                    : 'Unknown'
            }
          />
        </ul>

        {backendState === 'fail' && (
          <p className="mt-2 text-xs text-swarm">
            Backend unreachable. Is <code className="font-mono">npm run dev</code> running in Backend/?
          </p>
        )}
      </ChamferFrame>
    </aside>
  );
}
