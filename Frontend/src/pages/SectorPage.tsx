import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import galaxyTexture from '../assets/GalaxyTexture.webp';
import QuestDetailPanel from '../components/sector/QuestDetailPanel';
import QuestListView from '../components/sector/QuestListView';
import QuestMap from '../components/sector/QuestMap';
import QuestMapLegend from '../components/sector/QuestMapLegend';
import SectorHeader from '../components/sector/SectorHeader';
import { layoutQuests } from '../components/sector/questLayout';
import Button from '../components/ui/Button';
import ChamferFrame from '../components/ui/ChamferFrame';
import Panel from '../components/ui/Panel';
import ViewToggle, { type MapView } from '../components/ui/ViewToggle';
import { useApiRequest } from '../hooks/useApiRequest';
import { getSector } from '../services/sectorService';
import { clearedQuestIds, defaultSelectedQuest, questState } from '../utils/quests';

const pageClasses = 'mx-auto grid max-w-page gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_22rem] min-[1800px]:grid-cols-[minmax(0,1fr)_26rem]';

function SectorSkeleton() {
  const block = 'chamfer bg-panel motion-safe:animate-pulse';
  return (
    <main className={pageClasses} aria-busy="true">
      <p className="sr-only" role="status">
        Loading sector…
      </p>
      <div className="space-y-6">
        <div className={`${block} h-20 max-w-xl`} />
        <div className={`${block} h-[38rem]`} />
      </div>
      <div className={`${block} h-[44rem]`} />
    </main>
  );
}

function SectorScreen({ languageId }: { languageId: number }) {
  const load = useCallback(() => getSector(languageId), [languageId]);
  const { data: sector, loading, error, reload } = useApiRequest(load);
  const [view, setView] = useState<MapView>('map');
  const [chosenId, setChosenId] = useState<number | null>(null);

  // Derived once per load: node positions and each quest's cleared/available/locked state
  const derived = useMemo(() => {
    if (!sector) return null;
    const cleared = clearedQuestIds(sector.quests);
    return {
      layout: layoutQuests(sector.quests),
      states: new Map(sector.quests.map((q) => [q.questId, questState(q, cleared)])),
    };
  }, [sector]);

  if (loading) return <SectorSkeleton />;

  if (!sector || !derived) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Panel label="Transmission lost">
          <p role="alert" className="mt-3 text-sm text-slate-300">
            {error ?? 'This sector could not be loaded.'}
          </p>
          <div className="mt-5 flex gap-3">
            <Button onClick={reload} className="flex-1">
              Retry
            </Button>
            <Button variant="outline" to="/" className="flex-1">
              Galaxy map
            </Button>
          </div>
        </Panel>
      </main>
    );
  }

  const selectedId = chosenId ?? defaultSelectedQuest(sector.quests, sector.shipQuestId);
  const selected = sector.quests.find((q) => q.questId === selectedId);
  const selectedState = selected ? derived.states.get(selected.questId) : undefined;

  return (
    <main className={pageClasses}>
      <div className="flex min-w-0 flex-col gap-6">
        <SectorHeader sector={sector} />

        <ChamferFrame innerClassName="relative isolate overflow-hidden bg-space-950">
          {/* Starfield backdrop, dimmed so labels stay readable */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${galaxyTexture})` }}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-space-950/90" />

          <div className="flex justify-end p-4">
            <ViewToggle view={view} onChange={setView} />
          </div>

          {view === 'map' ? (
            <QuestMap
              layout={derived.layout}
              states={derived.states}
              selectedId={selectedId}
              shipQuestId={sector.shipQuestId}
              onSelect={setChosenId}
            />
          ) : (
            <QuestListView
              quests={derived.layout.order}
              states={derived.states}
              selectedId={selectedId}
              onSelect={setChosenId}
            />
          )}

          <div className="p-5">
            <QuestMapLegend />
          </div>
        </ChamferFrame>
      </div>

      {selected && selectedState && (
        <QuestDetailPanel quest={selected} state={selectedState} quests={sector.quests} />
      )}
    </main>
  );
}

// Keyed by the sector id so moving between sectors starts from a clean slate
export default function SectorPage() {
  const { sectorId } = useParams();
  return <SectorScreen key={sectorId} languageId={Number(sectorId)} />;
}
