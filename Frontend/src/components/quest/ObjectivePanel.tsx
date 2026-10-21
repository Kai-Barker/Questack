import { MAX_HINTS, type ObjectiveProgress } from '../../hooks/useQuestSession';
import type { QuestChallenge, QuestDetail } from '../../types/quest';
import { challengeLabel } from '../../utils/quests';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import { CheckIcon, ChevronLeftIcon } from '../ui/icons';

const pad = (n: number) => String(n).padStart(2, '0');

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

function attemptsLabel(attempts: number): string {
  if (attempts <= 1) return 'First try';
  const suffix = attempts === 2 ? 'nd' : attempts === 3 ? 'rd' : 'th';
  return `${attempts}${suffix} attempt`;
}

interface ObjectivePanelProps {
  quest: QuestDetail;
  index: number; // objective being viewed
  challenge: QuestChallenge;
  progress: ObjectiveProgress;
  lineCount: number;
  busy: boolean;
  submitting: boolean;
  questCompleted: boolean;
  onAnswerChange: (answer: string) => void;
  onMarkedLineChange: (line: number | undefined) => void;
  onRequestHint: () => void;
  onSubmit: () => void;
  onAcknowledge: () => void; // briefings: "Briefing understood"
  onShowDebrief: () => void;
}

// Left pane: briefing, the objective, and the answer box
export default function ObjectivePanel({
  quest,
  index,
  challenge,
  progress,
  lineCount,
  busy,
  submitting,
  questCompleted,
  onAnswerChange,
  onMarkedLineChange,
  onRequestHint,
  onSubmit,
  onAcknowledge,
  onShowDebrief,
}: ObjectivePanelProps) {
  const total = quest.challenges.length;
  const working = progress.status === 'current';
  const isBugHunt = challenge.challengeType === 'bug_hunt';
  const isDecode = challenge.challengeType === 'decode_transmission';
  const isBriefing = challenge.challengeType === 'briefing';
  const hintsLeft = MAX_HINTS - progress.hintsUsed;
  const needsDecode = isDecode && !progress.decoded;
  const canSubmit = working && !busy && progress.answer.trim().length > 0 && !needsDecode;

  return (
    <ChamferFrame className="h-full" innerClassName="flex h-full flex-col bg-panel">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-4">
        <Button variant="outline" size="sm" to={`/sector/${quest.languageId}`}>
          <span className="inline-flex items-center gap-1.5">
            <ChevronLeftIcon />
            Return to sector map
          </span>
        </Button>

        <p className="mt-5 font-display text-xs tracking-[0.2em] text-muted uppercase">
          {quest.sectorDisplayName} Sector
          {quest.questNumber !== undefined && <> › Quest {pad(quest.questNumber)}</>}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{quest.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip>{quest.difficulty}</Chip>
          <Chip>{quest.concept}</Chip>
          <Chip>{quest.sectorDisplayName}</Chip>
        </div>

        <h2 className="mt-6 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          Mission briefing
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{quest.storyText}</p>

        <hr className="my-5 border-line" />

        <h2 className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          Objective {pad(index + 1)} of {pad(total)} · {challengeLabel(challenge.challengeType)}
        </h2>
        {isBriefing ? (
          // The briefing itself is in the briefing pane
          <p className="mt-2 leading-relaxed text-slate-100">
            Read the Intel briefing. Ask the Ship's AI about anything that isn't clear, then confirm you're ready
            for the objectives that test it.
          </p>
        ) : (
          <p className="mt-2 leading-relaxed text-slate-100">{challenge.instructions}</p>
        )}

        {isDecode && working && (
          <p className="mt-3 text-sm text-slate-300">
            {progress.decoded
              ? 'Decoded. Read the Ship\'s AI breakdown, then explain the code in your own words below.'
              : 'Paste the code into the viewer and press Decode. Then explain it in your own words below.'}
          </p>
        )}

        {progress.status === 'cleared' && (
          <div className="mt-5 border-l-2 border-buff bg-buff-deep/60 px-4 py-3">
            <p className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.2em] text-buff uppercase">
              <CheckIcon />
              {isBriefing ? (
                'Cleared · Briefing read'
              ) : (
                <>
                  Cleared · {attemptsLabel(progress.attempts)} · {progress.hintsUsed}{' '}
                  {progress.hintsUsed === 1 ? 'hint' : 'hints'}
                </>
              )}
            </p>
            {progress.lastEvaluation?.feedback && (
              <p className="mt-1.5 text-sm text-slate-300">{progress.lastEvaluation.feedback}</p>
            )}
          </div>
        )}
      </div>

      {/* A cleared briefing being looked back at has nothing to show down here */}
      {(!isBriefing || working || questCompleted) && (
        <div className="border-t border-line px-6 pt-4 pb-5">
          {isBugHunt && (
            <div className="mb-3 flex items-center gap-3">
              <label htmlFor="marked-line" className="font-display text-xs tracking-[0.2em] text-muted uppercase">
                Suspected line
              </label>
              <input
                id="marked-line"
                type="number"
                min={1}
                max={lineCount}
                value={progress.markedLine ?? ''}
                disabled={!working}
                onChange={(e) => {
                  const line = Number.parseInt(e.target.value, 10);
                  onMarkedLineChange(Number.isNaN(line) ? undefined : Math.min(Math.max(line, 1), lineCount));
                }}
                className="w-20 rounded-md border border-line bg-space-950 px-3 py-1.5 font-mono text-sm text-swarm focus:border-accent/60 focus:outline-none disabled:opacity-60"
              />
              <span className="text-xs text-muted">or click the line in the code</span>
            </div>
          )}

          {!isBriefing && (
            <>
              <label htmlFor="answer" className="font-display text-xs tracking-[0.2em] text-muted uppercase">
                Your answer
              </label>
              <textarea
                id="answer"
                value={progress.answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                readOnly={!working}
                maxLength={4000}
                rows={5}
                placeholder={isBugHunt ? 'Explain what the bug is and why it breaks the code…' : 'Explain in your own words what the code does…'}
                className="mt-2 block w-full resize-none rounded-md border border-line bg-space-950 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-muted focus:border-accent/60 focus:outline-none read-only:opacity-70"
              />
            </>
          )}

          {questCompleted ? (
            <div className={`flex items-center justify-between gap-3 ${isBriefing ? '' : 'mt-4'}`}>
              <p className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.2em] text-buff uppercase">
                <CheckIcon /> Quest cleared
              </p>
              <Button onClick={onShowDebrief}>View debrief</Button>
            </div>
          ) : isBriefing ? (
            working && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 flex-1 text-xs text-slate-300">No answer needed: this one is for reading.</p>
                <Button onClick={onAcknowledge} disabled={busy} className="min-w-48">
                  {submitting ? 'Logging…' : 'Briefing understood'}
                </Button>
              </div>
            )
          ) : (
            working && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" onClick={onRequestHint} disabled={busy || hintsLeft <= 0}>
                  Request hint ({hintsLeft} left)
                </Button>
                <Button onClick={onSubmit} disabled={!canSubmit} className="min-w-40">
                  {submitting ? 'Assessing…' : 'Submit'}
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </ChamferFrame>
  );
}
