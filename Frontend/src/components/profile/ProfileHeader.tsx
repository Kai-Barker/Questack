import pilotBanner from '../../assets/PilotBanner.png';
import { MAX_FEATURED, type PilotProfile } from '../../types/profile';
import { capitalise } from '../../utils/format';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import PilotAvatar from '../ui/PilotAvatar';
import { PencilIcon } from '../ui/icons';
import InsigniaBadge from './InsigniaBadge';

const enlistedFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

interface ProfileHeaderProps {
  profile: PilotProfile;
  onEdit: () => void;
}

// The nameplate, on the pilot banner
export default function ProfileHeader({ profile, onEdit }: ProfileHeaderProps) {
  const featured = profile.featuredIds
    .map((id) => profile.insignia.find((insignia) => insignia.rewardId === id))
    .filter((insignia) => insignia !== undefined);
  const emptySlots = Math.max(0, MAX_FEATURED - featured.length);

  const meta = [
    `Level ${profile.level}`,
    profile.homeSector ? `${capitalise(profile.rank)} in ${profile.homeSector}` : capitalise(profile.rank),
    `Enlisted ${enlistedFormat.format(new Date(profile.enlistedAt))}`,
  ];

  return (
    <ChamferFrame
      size="xl"
      borderClassName="bg-line-bright"
      innerClassName="relative isolate flex min-h-52 flex-col gap-6 bg-panel px-5 py-6 sm:px-8 lg:flex-row lg:items-center"
    >
      {/* The banner covers the frame. It spreads 2px past the edges so its own
          drawn border and corners are always clipped off and never double up
          with the frame's. Anchored bottom right to keep the planet in view. */}
      <div
        aria-hidden="true"
        className="absolute -inset-0.5 -z-10 bg-cover bg-[position:70%_100%] bg-no-repeat"
        style={{ backgroundImage: `url(${pilotBanner})` }}
      />
      {/* Keeps the text readable where it crosses the planet on small screens */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-space-950/60 to-transparent" />

      <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
        <PilotAvatar frame={profile.loadout.frame} visor={profile.loadout.visor} className="size-24 shrink-0 sm:size-28" />

        <div className="min-w-0">
          <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent uppercase">Pilot profile</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-display text-3xl font-bold tracking-[0.1em] break-all uppercase sm:text-4xl">
              {profile.callsign}
            </h1>
            {profile.title && (
              <ChamferFrame
                as="span"
                size="sm"
                borderClassName="bg-accent/60"
                innerClassName="bg-accent-deep px-2.5 py-1 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase"
              >
                <span className="sr-only">Title: </span>
                {profile.title.name}
              </ChamferFrame>
            )}
          </div>
          <p className="mt-2 font-display text-xs tracking-[0.2em] text-muted uppercase">{meta.join(' · ')}</p>
          {profile.bio ? (
            <p className="mt-3 max-w-prose text-sm break-words text-slate-200">{profile.bio}</p>
          ) : (
            <p className="mt-3 text-sm text-muted italic">No bio yet. Tell the fleet what you’re working on.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-end">
        <div>
          <h2 className="font-display text-xs tracking-[0.2em] text-muted uppercase lg:text-right">Featured insignia</h2>
          <ul className="mt-2 flex gap-2">
            {featured.map((insignia) => (
              <li key={insignia.rewardId} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <InsigniaBadge code={insignia.code} size="sm" />
                <span className="font-display text-[0.6rem] leading-tight font-semibold tracking-[0.15em] text-slate-200 uppercase">
                  {insignia.name}
                </span>
              </li>
            ))}
            {Array.from({ length: emptySlots }, (_, i) => (
              <li key={`empty-${i}`} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <InsigniaBadge size="sm" />
                <span className="font-display text-[0.6rem] leading-tight tracking-[0.15em] text-muted uppercase">
                  Empty slot
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <span className="inline-flex items-center gap-2">
            <PencilIcon /> Edit profile
          </span>
        </Button>
      </div>
    </ChamferFrame>
  );
}
