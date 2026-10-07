import { useId, useRef } from 'react';
import { Link } from 'react-router';
import { useModalDialog } from '../../hooks/useModalDialog';
import type { ObjectiveProgress } from '../../hooks/useQuestSession';
import type { QuestCompletion, QuestDetail } from '../../types/quest';
import { formatNumber } from '../../utils/format';
import { percent } from '../../utils/progress';
import { challengeLabel } from '../../utils/quests';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import { BoltIcon, CheckIcon, DiamondIcon } from '../ui/icons';

function attemptsLabel(attempts: number): string {
  if (attempts <= 1) return 'First try';
  const suffix = attempts === 2 ? 'nd' : attempts === 3 ? 'rd' : 'th';
  return `${attempts}${suffix} attempt`;
}

const sectionLabel = 'font-display text-xs tracking-[0.2em] text-muted uppercase';

function UnlockCard({ kicker, title, detail }: { kicker: string; title: string; detail: string }) {
  return (
    <ChamferFrame size="md" innerClassName="h-full bg-space-950 px-4 py-3">
      <p className="font-display text-[0.65rem] font-semibold tracking-[0.2em] text-accent uppercase">{kicker}</p>
      <p className="mt-1 font-display text-base font-semibold">{title}</p>
      <p className="text-xs text-muted">{detail}</p>
    </ChamferFrame>
  );
}

interface QuestDebriefModalProps {
  quest: QuestDetail;
  objectives: ObjectiveProgress[];
  completion: QuestCompletion;
  debrief: string;
  onClose: () => void;
}

// "Quest cleared" summary. Uses the native <dialog> in modal mode, which traps
// focus and closes on Escape.
export default function QuestDebriefModal({ quest, objectives, completion, debrief, onClose }: QuestDebriefModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useModalDialog(dialogRef);

  const { before, after, booster, boosterEarned } = completion;
  const levelledUp = after.level > before.level;
  // Bar: existing progress in cyan, this quest's XP in green (all green after a level-up)
  const existing = levelledUp ? 0 : percent(before.levelXp, after.levelXpRequired);
  const gained = percent(after.levelXp, after.levelXpRequired) - existing;
  const { sector } = completion;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl bg-transparent p-0 text-slate-100 backdrop:bg-space-950/80 backdrop:backdrop-blur-[2px]"
    >
      <ChamferFrame size="lg" borderClassName="bg-accent/70" innerClassName="max-h-[90dvh] overflow-y-auto bg-panel px-8 py-7">
        <header className="text-center">
          <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent uppercase">Mission debrief</p>
          <h2 id={titleId} className="mt-2 font-display text-4xl font-bold tracking-[0.1em] uppercase">
            {completion.replay ? 'Quest replayed' : 'Quest cleared'}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {quest.title} · {quest.sectorDisplayName} Sector
          </p>
          {completion.replay && (
            <p className="mt-1 text-xs text-muted">Replays earn a quarter of the quest’s XP. Boosters only apply to first clears.</p>
          )}
        </header>

        <hr className="my-5 border-line" />

        <h3 className={sectionLabel}>Objectives</h3>
        <ul className="mt-3 space-y-2">
          {quest.challenges.map((challenge, i) => {
            const o = objectives[i];
            return (
              <li key={challenge.challengeId} className="flex items-center gap-3 text-sm">
                <CheckIcon className="text-accent" />
                <span className="flex-1">
                  {String(i + 1).padStart(2, '0')} {challengeLabel(challenge.challengeType)}
                </span>
                <span className="text-slate-300">
                  {attemptsLabel(o?.attempts ?? 1)} · {o?.hintsUsed ?? 0} {o?.hintsUsed === 1 ? 'hint' : 'hints'}
                </span>
              </li>
            );
          })}
        </ul>

        <hr className="my-5 border-line" />

        <div className="flex flex-wrap items-center gap-3">
          <h3 className={`${sectionLabel} flex-1`}>XP earned</h3>
          {booster && (
            <ChamferFrame
              size="sm"
              borderClassName="bg-buff/60"
              innerClassName="flex items-center gap-1.5 bg-buff-deep px-3 py-1 font-display text-[0.65rem] font-semibold tracking-[0.15em] text-buff uppercase"
            >
              <BoltIcon />
              {booster.name} {booster.xpMultiplier}×
            </ChamferFrame>
          )}
          <p className="font-display text-3xl font-bold text-buff">+{formatNumber(completion.xpEarned)} XP</p>
        </div>

        <div
          role="progressbar"
          aria-label={`Level ${after.level} progress`}
          aria-valuemin={0}
          aria-valuemax={after.levelXpRequired}
          aria-valuenow={after.levelXp}
          className="mt-3 flex h-2 w-full bg-line"
        >
          <div className="h-full bg-accent" style={{ width: `${existing}%` }} />
          <div className="h-full bg-buff" style={{ width: `${Math.max(gained, 0)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 font-display text-xs tracking-[0.15em] uppercase">
          <span className="text-slate-300">
            {levelledUp && <span className="mr-2 text-buff">Level up!</span>}
            Level {after.level} · {formatNumber(after.levelXp)} / {formatNumber(after.levelXpRequired)} XP
          </span>
          <span className="text-accent">
            {sector.displayName} swarm cleared {sector.percentBefore}% → {sector.percentAfter}%
          </span>
        </div>

        {(completion.unlocked.length > 0 || boosterEarned) && (
          <>
            <hr className="my-5 border-line" />
            <h3 className={sectionLabel}>Unlocked</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {completion.unlocked.map((q) => (
                <UnlockCard key={q.questId} kicker="New quest" title={q.title} detail={`${sector.displayName} Sector · ${q.concept}`} />
              ))}
              {boosterEarned && (
                <ChamferFrame size="md" borderClassName="bg-buff/50" innerClassName="h-full bg-buff-deep px-4 py-3">
                  <p className="flex items-center gap-1.5 font-display text-[0.65rem] font-semibold tracking-[0.2em] text-buff uppercase">
                    <BoltIcon /> Booster acquired
                  </p>
                  <p className="mt-1 font-display text-base font-semibold">{boosterEarned.name}</p>
                  <p className="text-xs text-slate-300">
                    Activate it from your{' '}
                    <Link
                      to="/profile"
                      className="font-semibold text-buff underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-buff"
                    >
                      Profile
                    </Link>{' '}
                    to boost your next quests.
                  </p>
                </ChamferFrame>
              )}
            </div>
          </>
        )}

        <h3 className="mt-6 flex items-center gap-2 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          <DiamondIcon /> Ship's AI · Debrief
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{debrief}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="outline" to={`/sector/${quest.languageId}`} className="w-full">
            Return to sector map
          </Button>
          {completion.nextQuestId !== null ? (
            <Button to={`/quest/${completion.nextQuestId}`} className="w-full">
              Next quest
            </Button>
          ) : (
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </ChamferFrame>
    </dialog>
  );
}
