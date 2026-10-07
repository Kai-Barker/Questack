import { Link } from 'react-router';
import { usePilot } from '../../hooks/usePilot';
import type { SectorQuest } from '../../types/sector';
import { REPLAY_XP_SHARE } from '../../utils/progress';
import { challengeLabel, questKind, type QuestState } from '../../utils/quests';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import Panel from '../ui/Panel';
import { BoltIcon, CheckIcon, LockIcon, SwarmIcon } from '../ui/icons';

const statusDisplay: Record<QuestState, { label: string; className: string; Icon: typeof CheckIcon }> = {
  available: { label: 'Swarm infested · Available', className: 'text-swarm', Icon: SwarmIcon },
  cleared: { label: 'Swarm purged · Cleared', className: 'text-accent', Icon: CheckIcon },
  locked: { label: 'Locked', className: 'text-muted', Icon: LockIcon },
};

const sectionLabel = 'font-display text-xs tracking-[0.2em] text-muted uppercase';

function Chip({ children }: { children: string }) {
  return (
    <ChamferFrame
      size="sm"
      innerClassName="bg-panel px-3 py-1 font-display text-[0.65rem] tracking-[0.15em] text-slate-300 uppercase"
    >
      {children}
    </ChamferFrame>
  );
}

interface QuestDetailPanelProps {
  quest: SectorQuest;
  state: QuestState;
  quests: SectorQuest[]; // every quest in the sector, to name the prerequisites
}

// "Selected quest" side panel on the sector map
export default function QuestDetailPanel({ quest, state, quests }: QuestDetailPanelProps) {
  const { pilot } = usePilot();
  const status = statusDisplay[state];
  const prerequisites = quests.filter((q) => quest.prerequisiteIds.includes(q.questId));
  const blockers = prerequisites.filter((q) => !q.cleared);
  const booster = pilot?.activeBooster;
  const showLoadout = Boolean(booster || pilot?.loadout);
  // Boosters only apply to first clears; a replay earns a share of the XP
  const boosted = booster && !quest.cleared ? booster : undefined;
  const replayXp = Math.round(quest.xpReward * REPLAY_XP_SHARE);

  return (
    <Panel label="Selected quest" className="h-full" bodyClassName="flex flex-col">
      <div aria-live="polite">
        <h3 className="mt-4 font-display text-2xl font-semibold">{quest.title}</h3>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>{quest.difficulty}</Chip>
          <Chip>{quest.concept}</Chip>
          <Chip>{questKind(quest)}</Chip>
        </div>

        <p
          className={`mt-4 flex items-center gap-2 font-display text-xs font-semibold tracking-[0.15em] uppercase ${status.className}`}
        >
          <status.Icon className="text-base" />
          {status.label}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">{quest.storyText}</p>
      </div>

      <hr className="my-5 border-line" />

      <h4 className={sectionLabel}>Objectives ({quest.objectives.length})</h4>
      <ol className="mt-3 space-y-2">
        {quest.objectives.map((objective) => (
          <li key={objective.challengeOrder} className="flex items-center gap-3 text-sm">
            <ChamferFrame
              size="sm"
              innerClassName="grid size-7 place-items-center bg-panel font-mono text-[0.7rem] text-muted"
            >
              {String(objective.challengeOrder).padStart(2, '0')}
            </ChamferFrame>
            {challengeLabel(objective.challengeType)}
          </li>
        ))}
      </ol>

      <hr className="my-5 border-line" />

      <div className="flex items-baseline justify-between">
        <h4 className={sectionLabel}>XP reward</h4>
        {quest.cleared ? (
          <p className="font-display font-semibold">
            <span className="text-lg text-accent">{replayXp} XP</span>
            <span className="ml-2 text-xs tracking-[0.15em] text-muted uppercase">Replay</span>
          </p>
        ) : boosted ? (
          <p className="font-display font-semibold">
            <s className="mr-2 text-sm text-muted">{quest.xpReward}</s>
            <span className="text-lg text-buff">{quest.xpReward * boosted.xpMultiplier} XP</span>
            <span className="sr-only">
              {' '}
              (boosted from {quest.xpReward} by {boosted.name})
            </span>
          </p>
        ) : (
          <p className="font-display text-lg font-semibold text-accent">{quest.xpReward} XP</p>
        )}
      </div>

      <h4 className={`${sectionLabel} mt-5`}>Prerequisites</h4>
      {prerequisites.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {prerequisites.map((p) => (
            <li key={p.questId} className="flex items-center gap-2 text-sm">
              {p.cleared ? <CheckIcon className="text-accent" /> : <LockIcon className="text-muted" />}
              {p.title} · <span className={p.cleared ? 'text-slate-300' : 'text-muted'}>{p.cleared ? 'Cleared' : 'Locked'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-300">None. Open to every pilot.</p>
      )}

      {/* Loadout is a nice-to-have: hidden when the backend sends no gear or booster */}
      {showLoadout && (
        <>
          <h4 className={`${sectionLabel} mt-5`}>Loadout</h4>
          {booster && (
            <ChamferFrame
              size="md"
              borderClassName="bg-buff/60"
              innerClassName="flex items-center gap-3 bg-buff-deep px-3 py-2.5"
              className="mt-2"
            >
              <BoltIcon className="shrink-0 text-buff" />
              <span className="flex-1">
                <span className="block font-display text-xs font-semibold tracking-[0.15em] text-buff uppercase">
                  {booster.name}
                </span>
                <span className="block text-xs text-slate-300">
                  {booster.xpMultiplier}× XP · {booster.questsRemaining} {booster.questsRemaining === 1 ? 'use' : 'uses'} left
                </span>
              </span>
              <Link
                to="/profile"
                className="hover-grow font-display text-xs font-semibold tracking-[0.15em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Change
              </Link>
            </ChamferFrame>
          )}
          {/* The dashed border is a ::before layer that spreads on hover, so the link
              grows without changing its own size or nudging anything around it */}
          <Link
            to="/profile"
            className="relative mt-2 block py-2.5 text-center font-display text-xs tracking-[0.2em] text-muted uppercase before:absolute before:inset-0 before:border before:border-dashed before:border-line-bright before:transition-[inset] before:duration-150 hover:text-accent hover:before:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-safe:hover:before:-inset-0.5"
          >
            + Equip gear
          </Link>
        </>
      )}

      <div className="mt-auto pt-6">
        {state === 'locked' ? (
          <>
            <Button size="lg" disabled className="w-full">
              Locked
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              Clear {blockers.map((b) => b.title).join(' and ')} first.
            </p>
          </>
        ) : (
          <Button size="lg" to={`/quest/${quest.questId}`} className="w-full">
            {state === 'cleared' ? 'Replay' : 'Deploy'}
          </Button>
        )}
      </div>
    </Panel>
  );
}
