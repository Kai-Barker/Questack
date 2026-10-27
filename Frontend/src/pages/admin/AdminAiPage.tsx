import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import { useApiRequest } from '../../hooks/useApiRequest';
import { getAdminOverview, getAiUsage } from '../../services/adminService';
import { formatNumber } from '../../utils/format';

function Stat({ label, value, note, danger = false }: { label: string; value: number; note?: string; danger?: boolean }) {
  return (
    <Panel tone={danger ? 'danger' : 'default'}>
      <p className={`font-display text-xs font-semibold tracking-[0.2em] uppercase ${danger ? 'text-swarm' : 'text-slate-300'}`}>
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-bold ${danger ? 'text-swarm' : ''}`}>{formatNumber(value)}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Panel>
  );
}

const featureLabels: Record<string, string> = {
  hint: 'Hint',
  mentor_chat: 'Mentor chat',
  answer_evaluation: 'Answer marking',
  decode_transmission: 'Decoder',
  debrief: 'Mission debrief',
};

// What a failed attempt's status means, in plain words
function failureReason(status: number | null): string {
  if (status === null) return 'Network error';
  if (status === 429) return `${status} · Rate limited`;
  if (status === 408) return `${status} · Timed out`;
  if (status >= 500) return `${status} · Busy`;
  return `${status} · Error`;
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function loadAiTab() {
  const [overview, { usage, failures }] = await Promise.all([getAdminOverview(), getAiUsage()]);
  return { overview, usage, failures };
}

// Admin › AI: fleet totals, the Ship's AI's most recent calls, and (in red,
// apart from them) the Gemini attempts that got no reply. The log holds
// counts only, never what a pilot or the AI wrote.
export default function AdminAiPage() {
  const { data, loading, error, reload } = useApiRequest(loadAiTab);

  return (
    <main className="mx-auto max-w-page space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Ship’s AI</h1>
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={reload}>
            Refresh
          </Button>
        )}
      </header>

      {loading && (
        <p role="status" className="font-display text-sm tracking-[0.2em] text-accent uppercase motion-safe:animate-pulse">
          Loading fleet status…
        </p>
      )}

      {error && (
        <Panel label="Comms failure" className="max-w-md">
          <p role="alert" className="mt-3 text-sm text-slate-300">
            {error}
          </p>
          <Button onClick={reload} className="mt-5 w-full">
            Retry
          </Button>
        </Panel>
      )}

      {data && (
        <>
          <section aria-label="Fleet status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Ship's AI calls (24h)"
              value={data.overview.aiCallsToday}
              note={`${formatNumber(data.overview.aiTokensToday)} tokens`}
            />
            <Stat
              label="Failed attempts (24h)"
              value={data.overview.aiFailuresToday}
              note="Rate limited, busy or timed out"
              danger
            />
            <Stat label="Pilots" value={data.overview.pilots} note={`${formatNumber(data.overview.activePilots)} active`} />
            <Stat
              label="Published quests"
              value={data.overview.publishedQuests}
              note={`${formatNumber(data.overview.draftQuests)} in draft`}
            />
          </section>

          <Panel label="Recent calls">
            {data.usage.length === 0 ? (
              <p className="mt-3 text-sm text-muted">The Ship’s AI hasn’t been called yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="font-display text-xs tracking-[0.15em] text-muted uppercase">
                    <tr className="border-b border-line">
                      <th scope="col" className="py-2 pr-4 font-semibold">When</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Pilot</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Feature</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Tokens in / out</th>
                      <th scope="col" className="py-2 font-semibold">Flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usage.map((row) => (
                      <tr key={row.logId} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 pr-4 text-slate-300">{timeFormat.format(new Date(row.createdAt))}</td>
                        <td className="py-2.5 pr-4 text-slate-100">{row.callsign}</td>
                        <td className="py-2.5 pr-4 text-slate-300">{featureLabels[row.feature] ?? row.feature}</td>
                        <td className="py-2.5 pr-4 text-slate-300">{row.model === 'flash' ? 'Flash' : 'Flash-Lite'}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-slate-300">
                          {formatNumber(row.inputTokens)} / {formatNumber(row.outputTokens)}
                        </td>
                        <td className={`py-2.5 ${row.flagged ? 'text-swarm' : 'text-muted'}`}>{row.flagged ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel label="Failed attempts" tone="danger">
            {data.failures.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No failed attempts.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm text-swarm">
                  <thead className="font-display text-xs tracking-[0.15em] uppercase">
                    <tr className="border-b border-swarm/40">
                      <th scope="col" className="py-2 pr-4 font-semibold">When</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Pilot</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Feature</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
                      <th scope="col" className="py-2 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failures.map((row) => (
                      <tr key={row.logId} className="border-b border-swarm/20 last:border-0">
                        <td className="py-2.5 pr-4">{timeFormat.format(new Date(row.createdAt))}</td>
                        <td className="py-2.5 pr-4">{row.callsign}</td>
                        <td className="py-2.5 pr-4">{featureLabels[row.feature] ?? row.feature}</td>
                        <td className="py-2.5 pr-4 font-mono">{row.model}</td>
                        <td className="py-2.5">{failureReason(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </main>
  );
}
