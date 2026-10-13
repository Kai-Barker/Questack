import { useState } from 'react';
import Button from '../../components/ui/Button';
import ChamferFrame from '../../components/ui/ChamferFrame';
import Panel from '../../components/ui/Panel';
import { useApiRequest } from '../../hooks/useApiRequest';
import { useAuth } from '../../hooks/useAuth';
import { getAdminUsers, setUserActive } from '../../services/adminService';
import type { AdminUser } from '../../types/admin';
import { formatNumber } from '../../utils/format';
import { toRequestFailure } from '../../utils/requestFailure';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : 'Never');

function StateChip({ user }: { user: AdminUser }) {
  const [label, border, text] =
    user.role === 'admin'
      ? ['Admin', 'bg-swarm/70', 'text-swarm']
      : user.isActive
        ? ['Active', 'bg-buff/60', 'text-buff']
        : ['Deactivated', 'bg-line-bright', 'text-muted'];
  return (
    <ChamferFrame
      as="span"
      size="sm"
      borderClassName={border}
      innerClassName={`bg-space-950 px-2.5 py-0.5 font-display text-[0.6rem] font-semibold tracking-[0.15em] uppercase ${text}`}
    >
      {label}
    </ChamferFrame>
  );
}

// Admin › Users: every pilot, and a switch to lock one out. Deactivating
// takes effect on the pilot's very next request (the backend re-reads it).
export default function AdminUsersPage() {
  const { data, loading, error, reload, replace } = useApiRequest(getAdminUsers);
  const { user: me } = useAuth();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function toggle(target: AdminUser) {
    if (!data) return;
    setBusyId(target.userId);
    setFailure(null);
    setNotice(null);
    try {
      const updated = await setUserActive(target.userId, !target.isActive);
      replace(data.map((u) => (u.userId === updated.userId ? updated : u)));
      setNotice(`${updated.callsign} ${updated.isActive ? 'reactivated' : 'deactivated'}.`);
    } catch (err) {
      setFailure(toRequestFailure(err).message);
    } finally {
      setBusyId(null);
    }
  }

  const term = search.trim().toLowerCase();
  const shown = (data ?? []).filter(
    (u) => !term || u.callsign.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
  );

  return (
    <main className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Users</h1>
        </div>
        {data && (
          <div className="w-full max-w-xs">
            <label htmlFor="user-search" className="sr-only">
              Search by callsign or email
            </label>
            <ChamferFrame size="sm" borderClassName="bg-line focus-within:bg-accent/70" innerClassName="bg-space-950">
              <input
                id="user-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search callsign or email…"
                className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-muted focus:outline-none"
              />
            </ChamferFrame>
          </div>
        )}
      </header>

      {loading && (
        <p role="status" className="font-display text-sm tracking-[0.2em] text-accent uppercase motion-safe:animate-pulse">
          Loading pilots…
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

      {failure && <p role="alert" className="text-sm text-swarm">{failure}</p>}
      <p role="status" className={notice ? 'text-sm text-buff' : 'sr-only'}>
        {notice}
      </p>

      {data && (
        <Panel label={`Pilots (${formatNumber(data.length)})`}>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="font-display text-xs tracking-[0.15em] text-muted uppercase">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-4 font-semibold">Callsign</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Email</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Level</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Last active</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Joined</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                  <th scope="col" className="py-2 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.userId} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="py-3 pr-4 font-medium text-slate-100">
                      {u.callsign}
                      {u.userId === me?.userId && <span className="ml-2 text-xs text-muted">(you)</span>}
                    </th>
                    <td className="py-3 pr-4 text-slate-300">{u.email}</td>
                    <td className="py-3 pr-4 text-slate-300">
                      {u.level} <span className="text-xs text-muted">· {formatNumber(u.totalXp)} XP</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{formatDate(u.lastActive)}</td>
                    <td className="py-3 pr-4 text-slate-300">{formatDate(u.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <StateChip user={u} />
                    </td>
                    <td className="py-3 text-right">
                      {u.role === 'user' && (
                        <Button
                          size="sm"
                          variant={u.isActive ? 'outline' : 'primary'}
                          onClick={() => toggle(u)}
                          disabled={busyId !== null}
                        >
                          <span aria-hidden="true">{u.isActive ? 'Deactivate' : 'Reactivate'}</span>
                          <span className="sr-only">
                            {u.isActive ? 'Deactivate' : 'Reactivate'} {u.callsign}
                          </span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                {term ? 'No pilots match that search.' : 'No pilots have enlisted yet.'}
              </p>
            )}
          </div>
        </Panel>
      )}
    </main>
  );
}
