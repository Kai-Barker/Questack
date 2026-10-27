import { useState } from 'react';
import ContinueMissionCard from '../components/dashboard/ContinueMissionCard';
import DecodeTransmissionCard from '../components/dashboard/DecodeTransmissionCard';
import PilotLoadoutPanel from '../components/dashboard/PilotLoadoutPanel';
import PilotStatusPanel from '../components/dashboard/PilotStatusPanel';
import GalaxyMap from '../components/map/GalaxyMap';
import MapLegend from '../components/map/MapLegend';
import SectorListView from '../components/map/SectorListView';
import { SLOT_COUNT } from '../components/map/sectorGeometry';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import ViewToggle, { type MapView } from '../components/ui/ViewToggle';
import { useDashboard } from '../hooks/useDashboard';
import { usePilot } from '../hooks/usePilot';

const pageClasses =
  'mx-auto grid max-w-page gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)_17rem] min-[1800px]:grid-cols-[20rem_minmax(0,1fr)_20rem]';

function DashboardSkeleton() {
  const block = 'chamfer bg-panel motion-safe:animate-pulse';
  return (
    <main className={pageClasses} aria-busy="true">
      <p className="sr-only" role="status">
        Loading galaxy map…
      </p>
      <div className="space-y-6">
        <div className={`${block} h-72`} />
        <div className={`${block} h-80`} />
      </div>
      <div className="mx-auto aspect-square w-full max-w-galaxy-map rounded-full bg-panel motion-safe:animate-pulse" />
      <div className="space-y-6">
        <div className={`${block} h-56`} />
        <div className={`${block} h-52`} />
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const pilotRequest = usePilot();
  const dashboardRequest = useDashboard();
  const [view, setView] = useState<MapView>('map');

  if (pilotRequest.loading || dashboardRequest.loading) return <DashboardSkeleton />;

  const { pilot } = pilotRequest;
  const dashboard = dashboardRequest.data;

  if (!pilot || !dashboard) {
    const retry = () => {
      if (pilotRequest.error) pilotRequest.reload();
      if (dashboardRequest.error) dashboardRequest.reload();
    };

    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Panel label="Comms failure">
          <p role="alert" className="mt-3 text-sm text-slate-300">
            {pilotRequest.error ?? dashboardRequest.error ?? 'The galaxy map could not be loaded.'}
          </p>
          <Button onClick={retry} className="mt-5 w-full">
            Retry
          </Button>
        </Panel>
      </main>
    );
  }

  return (
    <main className={pageClasses}>
      <h1 className="sr-only">Galaxy Map</h1>

      <div className="flex flex-col gap-6 lg:justify-between">
        <PilotStatusPanel pilot={pilot} />
        <PilotLoadoutPanel pilot={pilot} />
      </div>

      <section aria-label="Sectors" className="flex flex-col gap-6">
        <ViewToggle view={view} onChange={setView} className="justify-center" />
        {view === 'map' ? (
          <>
            <GalaxyMap sectors={dashboard.sectors} />
            <MapLegend />
          </>
        ) : (
          <SectorListView
            sectors={dashboard.sectors}
            unchartedCount={Math.max(0, SLOT_COUNT - dashboard.sectors.length)}
          />
        )}
      </section>

      <div className="flex flex-col gap-6">
        <ContinueMissionCard mission={dashboard.continueMission} />
        <DecodeTransmissionCard />
      </div>
    </main>
  );
}
