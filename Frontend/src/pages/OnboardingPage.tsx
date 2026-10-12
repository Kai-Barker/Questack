import { useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Button from '../components/ui/Button';
import ChamferFrame from '../components/ui/ChamferFrame';
import Panel from '../components/ui/Panel';
import { useApiRequest } from '../hooks/useApiRequest';
import { usePilot } from '../hooks/usePilot';
import { getDashboard } from '../services/dashboardService';
import { getSector, updateSectorRank } from '../services/sectorService';
import type { ProficiencyLevel } from '../types/pilot';
import type { SectorDetail } from '../types/sector';
import { capitalise, errorMessage } from '../utils/format';
import { clearedQuestIds, questState } from '../utils/quests';
import { safeNextPath } from '../utils/redirect';

// Enlistment steps 02 and 03 (step 01 is the Enlist form): the new pilot
// picks their first sector, their proficiency class in it (which sets how the
// Ship's AI explains things), and the concept to start on.

const CLASSES: { rank: ProficiencyLevel; blurb: string }[] = [
  { rank: 'cadet', blurb: 'New to code. The Ship’s AI uses everyday metaphors and explains every term.' },
  { rank: 'pilot', blurb: 'You know the basics. Plain technical terms, kept brief.' },
  { rank: 'commander', blurb: 'Experienced. Precise, pattern-level talk about edge cases and trade-offs.' },
];

function Choice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ChamferFrame
        size="md"
        borderClassName={selected ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
        innerClassName={`h-full px-4 py-3 ${selected ? 'bg-accent-deep' : 'bg-space-950'}`}
      >
        {children}
      </ChamferFrame>
    </button>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <Panel>
      <h2 className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.2em] text-accent uppercase">
        <span className="font-mono text-xs text-muted">{number}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

export default function OnboardingPage() {
  const { data: dashboard, error: sectorsError, reload: reloadSectors } = useApiRequest(getDashboard);
  const { reload: refreshPilot } = usePilot();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [languageId, setLanguageId] = useState<number | null>(null);
  const [rank, setRank] = useState<ProficiencyLevel>('cadet');
  const [sector, setSector] = useState<SectorDetail | null>(null);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const [questId, setQuestId] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  // The sector last clicked, so a slow reply for an earlier click is ignored
  const requestedSector = useRef<number | null>(null);

  // The concepts to start on: quests open to a pilot new to the sector
  const cleared = sector ? clearedQuestIds(sector.quests) : new Set<number>();
  const startingQuests = sector?.quests.filter((q) => questState(q, cleared) === 'available') ?? [];

  function chooseSector(id: number) {
    if (id === languageId) return;
    setLanguageId(id);
    setSector(null);
    setSectorError(null);
    setQuestId(null);
    requestedSector.current = id;
    getSector(id).then(
      (detail) => {
        if (requestedSector.current !== id) return;
        setSector(detail);
        if (detail.proficiencyLevel) setRank(detail.proficiencyLevel);
      },
      (err: unknown) => {
        if (requestedSector.current === id) setSectorError(errorMessage(err));
      },
    );
  }

  async function launch() {
    if (languageId === null || launching) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      await updateSectorRank(languageId, rank);
      // Wait for the enlistment to show in the pilot's record, or the app
      // would send them straight back here
      await refreshPilot();
      const next = params.get('next');
      navigate(questId !== null ? `/quest/${questId}` : next ? safeNextPath(next) : `/sector/${languageId}`, { replace: true });
    } catch (err) {
      setLaunchError(errorMessage(err));
      setLaunching(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <p className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">Enlistment sequence</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.05em] uppercase">Choose your first sector</h1>
        <p className="mt-1 text-sm text-slate-300">
          Each sector is a programming language. You can enlist in others, and change your class, at any time.
        </p>
      </header>

      <Step number="02a" title="Sector">
        {sectorsError && (
          <p role="alert" className="text-sm text-swarm">
            {sectorsError}{' '}
            <button type="button" onClick={reloadSectors} className="underline">
              Retry
            </button>
          </p>
        )}
        {!dashboard && !sectorsError && (
          <p role="status" className="text-sm text-slate-300">
            Scanning sectors…
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {dashboard?.sectors.map((s) => (
            <Choice key={s.languageId} selected={s.languageId === languageId} onSelect={() => chooseSector(s.languageId)}>
              <span className="block font-display text-lg font-semibold tracking-[0.1em] uppercase">{s.displayName} Sector</span>
              <span className="text-xs text-muted">
                {s.questsTotal} quest{s.questsTotal === 1 ? '' : 's'}
                {s.proficiencyLevel ? ` · already enlisted as ${s.proficiencyLevel}` : ''}
              </span>
            </Choice>
          ))}
        </div>
      </Step>

      <Step number="02b" title="Proficiency class">
        <div role="group" aria-label="Proficiency class" className="grid gap-3 sm:grid-cols-3">
          {CLASSES.map((c) => (
            <Choice key={c.rank} selected={c.rank === rank} onSelect={() => setRank(c.rank)}>
              <span className="block font-display text-sm font-semibold tracking-[0.15em] uppercase">{capitalise(c.rank)}</span>
              <span className="mt-1 block text-xs text-slate-300">{c.blurb}</span>
            </Choice>
          ))}
        </div>
      </Step>

      <Step number="03" title="Starting concept">
        {languageId === null && <p className="text-sm text-slate-300">Choose a sector to see where you can start.</p>}
        {sectorError && (
          <p role="alert" className="text-sm text-swarm">
            {sectorError}
          </p>
        )}
        {languageId !== null && !sector && !sectorError && (
          <p role="status" className="text-sm text-slate-300">
            Charting the sector…
          </p>
        )}
        {sector && startingQuests.length === 0 && (
          <p className="text-sm text-slate-300">No quests are open in this sector yet. You can still enlist.</p>
        )}
        <div role="group" aria-label="Starting concept" className="grid gap-3 sm:grid-cols-2">
          {startingQuests.map((q) => (
            <Choice key={q.questId} selected={q.questId === questId} onSelect={() => setQuestId(q.questId)}>
              <span className="block font-display text-sm font-semibold tracking-[0.1em] uppercase">{q.concept}</span>
              <span className="text-xs text-muted">
                {q.title} · {q.difficulty}
                {q.isSideQuest ? ' · side quest' : ''}
              </span>
            </Choice>
          ))}
        </div>
      </Step>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {launchError && (
          <p role="alert" className="mr-auto text-sm text-swarm">
            {launchError}
          </p>
        )}
        <Button size="lg" onClick={() => void launch()} disabled={languageId === null || launching}>
          {launching ? 'Launching…' : questId !== null ? 'Launch quest' : 'Enlist'}
        </Button>
      </div>
    </main>
  );
}
