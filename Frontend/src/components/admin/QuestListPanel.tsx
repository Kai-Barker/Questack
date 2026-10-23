import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { AdminQuestSummary, AdminSector, QuestStatus } from '../../types/admin';
import ChamferFrame from '../ui/ChamferFrame';
import { SelectField } from './fields';

export function StatusChip({ status }: { status: QuestStatus }) {
  const published = status === 'published';
  return (
    <ChamferFrame
      as="span"
      size="sm"
      borderClassName={published ? 'bg-buff/60' : 'bg-line-bright'}
      innerClassName={`bg-space-950 px-2.5 py-0.5 font-display text-[0.6rem] font-semibold tracking-[0.15em] uppercase ${
        published ? 'text-buff' : 'text-muted'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </ChamferFrame>
  );
}

interface QuestListPanelProps {
  sectors: AdminSector[];
  quests: AdminQuestSummary[];
  sectorId: number;
  onSectorChange: (languageId: number) => void;
  selected: number | 'new' | null;
}

// Left column of the quest editor: every quest in one sector, drafts included.
// Choosing one is a link (?quest=<id>), so the unsaved-changes guard can stop it.
export default function QuestListPanel({ sectors, quests, sectorId, onSectorChange, selected }: QuestListPanelProps) {
  const [search, setSearch] = useState('');
  const baseId = useId();
  const term = search.trim().toLowerCase();
  const shown = quests.filter(
    (q) =>
      q.languageId === sectorId &&
      (!term || q.title.toLowerCase().includes(term) || q.concept.toLowerCase().includes(term)),
  );

  // A flex column so the max height caps the inner panel and the list scrolls,
  // instead of it growing past the screen where later quests can't be reached
  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="chamfer flex flex-col bg-line p-px lg:sticky lg:top-6 lg:max-h-[calc(100dvh-var(--nav-h,5rem)-3rem)]"
    >
      <div className="chamfer flex min-h-0 flex-1 flex-col bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${baseId}-heading`} className="font-display text-base font-bold tracking-[0.15em] uppercase">
            Quests
          </h2>
          <Link
            to="?quest=new"
            className="group inline-block font-display text-xs font-semibold tracking-[0.15em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChamferFrame
              as="span"
              size="md"
              grow="sm"
              borderClassName="bg-accent group-hover:bg-accent-soft"
              innerClassName="bg-accent px-4 py-2 text-space-950 group-hover:bg-accent-soft"
            >
              + New quest
            </ChamferFrame>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor={`${baseId}-search`} className="sr-only">
              Search quests
            </label>
            <ChamferFrame size="sm" borderClassName="bg-line focus-within:bg-accent/70" innerClassName="bg-space-950">
              <input
                id={`${baseId}-search`}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search quests…"
                className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-muted focus:outline-none"
              />
            </ChamferFrame>
          </div>
          <SelectField
            id={`${baseId}-sector`}
            label="Sector"
            value={sectorId}
            options={sectors.map((s) => ({ value: s.languageId, label: `${s.displayName} Sector` }))}
            onChange={onSectorChange}
          />
        </div>

        <ul className="-mx-1 mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-1" aria-label="Quests in this sector">
          {shown.map((quest) => {
            const active = selected === quest.questId;
            return (
              <li key={quest.questId}>
                <Link
                  to={`?quest=${quest.questId}`}
                  aria-current={active ? 'page' : undefined}
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                >
                  <ChamferFrame
                    size="sm"
                    borderClassName={active ? 'bg-accent/70' : 'bg-transparent group-hover:bg-line'}
                    innerClassName={`flex items-center justify-between gap-3 px-3 py-3 text-sm ${
                      active ? 'bg-accent-deep text-slate-100' : 'bg-panel text-slate-300 group-hover:text-slate-100'
                    }`}
                  >
                    <span className="min-w-0 truncate">{quest.title}</span>
                    <StatusChip status={quest.status} />
                  </ChamferFrame>
                </Link>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">
              {term ? 'No quests match that search.' : 'No quests in this sector yet.'}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
