import { useCallback, useState } from 'react';
import EditProfileDialog, { type EditSection } from '../components/profile/EditProfileDialog';
import FlightLog from '../components/profile/FlightLog';
import InsigniaCollection from '../components/profile/InsigniaCollection';
import LoadoutPanel from '../components/profile/LoadoutPanel';
import ProfileHeader from '../components/profile/ProfileHeader';
import SectorProgressPanel from '../components/profile/SectorProgressPanel';
import ServiceRecord from '../components/profile/ServiceRecord';
import StatTiles from '../components/profile/StatTiles';
import XpHistoryChart from '../components/profile/XpHistoryChart';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import { useApiRequest } from '../hooks/useApiRequest';
import { useAuth } from '../hooks/useAuth';
import { usePilot } from '../hooks/usePilot';
import { getMyProfile } from '../services/profileService';
import type { PilotProfile } from '../types/profile';

const pageClasses = 'mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)]';

function ProfileSkeleton() {
  const block = 'chamfer bg-panel motion-safe:animate-pulse';
  return (
    <main className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading pilot profile…
      </p>
      <div className={`${block} h-44`} />
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className={`${block} h-96`} />
        <div className="space-y-6">
          <div className={`${block} h-24`} />
          <div className={`${block} h-64`} />
        </div>
      </div>
    </main>
  );
}

// The signed-in pilot's own profile. There's no way to open anyone else's:
// the backend only ever returns the pilot in the session.
export default function ProfilePage() {
  const { data: profile, loading, error, reload, replace } = useApiRequest(getMyProfile);
  const { refreshUser } = useAuth();
  const { reload: refreshPilot } = usePilot();
  const [editing, setEditing] = useState<EditSection | null>(null);

  const handleSaved = useCallback(
    (updated: PilotProfile, callsignChanged: boolean) => {
      replace(updated);
      // The nav shows the callsign from the signed-in account
      if (callsignChanged) void refreshUser();
    },
    [replace, refreshUser],
  );

  // The nav and Galaxy Map show the running booster, so they refresh too
  const handleBoosterActivated = useCallback(
    (updated: PilotProfile) => {
      replace(updated);
      refreshPilot();
    },
    [replace, refreshPilot],
  );

  if (loading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Panel label="Comms failure">
          <p role="alert" className="mt-3 text-sm text-slate-300">
            {error ?? 'Your profile could not be loaded.'}
          </p>
          <Button onClick={reload} className="mt-5 w-full">
            Retry
          </Button>
        </Panel>
      </main>
    );
  }

  return (
    <main className={pageClasses}>
      <div className="lg:col-span-2">
        <ProfileHeader profile={profile} onEdit={() => setEditing('callsign')} />
      </div>

      <div className="flex flex-col gap-6">
        <LoadoutPanel profile={profile} onBoosterActivated={handleBoosterActivated} />
        <ServiceRecord profile={profile} onChangeGoal={() => setEditing('goal')} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <StatTiles profile={profile} />
        <FlightLog flightLog={profile.flightLog} />
        <div className="grid gap-6 xl:grid-cols-2">
          <XpHistoryChart weeks={profile.xpHistory} />
          <SectorProgressPanel sectors={profile.sectors} />
        </div>
        <InsigniaCollection
          insignia={profile.insignia}
          featuredIds={profile.featuredIds}
          onChooseFeatured={() => setEditing('featured')}
        />
      </div>

      {editing && (
        <EditProfileDialog
          profile={profile}
          focusSection={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
