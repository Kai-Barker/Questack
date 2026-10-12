import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import { useApiRequest } from '../../hooks/useApiRequest';
import { getAdminOverview } from '../../services/adminService';
import { formatNumber } from '../../utils/format';

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <Panel>
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{formatNumber(value)}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Panel>
  );
}

// The admin console. Only reachable by admins (RequireAdmin here, requireAdmin
// on the backend). The quest editor is planned for weeks 3–4.
export default function AdminPage() {
  const { data, loading, error, reload } = useApiRequest(getAdminOverview);

  return (
    <main className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-6">
      <header>
        <p className="font-display text-xs font-semibold tracking-[0.2em] text-swarm uppercase">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.05em] uppercase">Command console</h1>
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
        <section aria-label="Fleet status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Pilots" value={data.pilots} note={`${formatNumber(data.activePilots)} active`} />
          <Stat label="Published quests" value={data.publishedQuests} note={`${formatNumber(data.draftQuests)} in draft`} />
          <Stat
            label="Ship's AI calls (24h)"
            value={data.aiCallsToday}
            note={`${formatNumber(data.aiTokensToday)} tokens`}
          />
        </section>
      )}

      <Panel label="Quest editor" className="max-w-2xl">
        <p className="mt-3 text-sm text-slate-300">
          Creating, editing and publishing quests is coming in the next sprint.
        </p>
      </Panel>
    </main>
  );
}
