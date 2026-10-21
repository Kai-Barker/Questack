import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router';
import { Group, Panel, type Layout } from 'react-resizable-panels';
import BriefingPanel from '../components/quest/BriefingPanel';
import CodePanel from '../components/quest/CodePanel';
import ObjectivePanel from '../components/quest/ObjectivePanel';
import ObjectiveStepper from '../components/quest/ObjectiveStepper';
import QuestDebriefModal from '../components/quest/QuestDebriefModal';
import ResizeHandle from '../components/quest/ResizeHandle';
import ShipsAiPanel from '../components/quest/ShipsAiPanel';
import Button from '../components/ui/Button';
import PanelBox from '../components/ui/Panel';
import { useApiRequest } from '../hooks/useApiRequest';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNavSlot } from '../hooks/useNavSlot';
import { useQuestSession } from '../hooks/useQuestSession';
import { getQuest } from '../services/questService';
import type { QuestDetail } from '../types/quest';

// The Group re-applies its layout whenever these props change identity, which
// undid every resize. So they're kept stable: a constant here, and the saved
// layout read once on mount by usePaneLayout below.
const RESIZE_TARGET = { coarse: 20, fine: 10 };

// Pane sizes are remembered per browser. Storage can be blocked (private
// mode), so failures just fall back to the default sizes.
function usePaneLayout(key: string) {
  const [defaultLayout] = useState<Layout | undefined>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      const valid =
        saved !== null && typeof saved === 'object' && Object.values(saved).every((v) => typeof v === 'number');
      return valid ? (saved as Layout) : undefined;
    } catch {
      return undefined;
    }
  });

  const onLayoutChanged = useCallback(
    (layout: Layout) => {
      try {
        localStorage.setItem(key, JSON.stringify(layout));
      } catch {
        // Not saved; the default sizes are used next time
      }
    },
    [key],
  );

  return { defaultLayout, onLayoutChanged };
}

function QuestScreen({ quest }: { quest: QuestDetail }) {
  const session = useQuestSession(quest);
  const { state } = session;
  const navSlot = useNavSlot();
  const wide = useMediaQuery('(min-width: 1024px)');
  const [fontSize, setFontSize] = useState(14);
  const mainLayout = usePaneLayout('questack:quest-panes');
  const workspaceLayout = usePaneLayout('questack:quest-workspace-panes');

  const index = state.viewing;
  const challenge = quest.challenges[index];
  const progress = state.objectives[index];
  if (!challenge || !progress) return null;

  const reviewing = progress.status !== 'current';
  const isBriefing = challenge.challengeType === 'briefing';
  const lineCount = challenge.code?.snippet.split('\n').length ?? 1;

  const objectivePanel = (
    <ObjectivePanel
      quest={quest}
      index={index}
      challenge={challenge}
      progress={progress}
      lineCount={lineCount}
      busy={state.busy !== null}
      submitting={state.busy === 'submit' || state.busy === 'read' || state.busy === 'complete'}
      questCompleted={session.completed}
      onAnswerChange={(answer) => session.editObjective(index, { answer })}
      onMarkedLineChange={(markedLine) => session.editObjective(index, { markedLine })}
      onRequestHint={session.requestNextHint}
      onSubmit={session.submitAnswer}
      onAcknowledge={session.acknowledgeBriefing}
      onShowDebrief={() => session.setDebriefOpen(true)}
    />
  );

  // Briefings put their reading where the code usually goes
  const codePanel = isBriefing ? (
    <BriefingPanel
      challenge={challenge}
      language={quest.sectorDisplayName}
      fontSize={fontSize}
      onFontSizeChange={setFontSize}
    />
  ) : (
    <CodePanel
      challenge={challenge}
      language={quest.sectorDisplayName}
      fontSize={fontSize}
      onFontSizeChange={setFontSize}
      readOnly={reviewing}
      markedLine={progress.markedLine}
      onLineMarked={(markedLine) => session.editObjective(index, { markedLine })}
      pastedCode={progress.pastedCode}
      onPastedCodeChange={(pastedCode) => session.editObjective(index, { pastedCode })}
      decoded={progress.decoded}
      decoding={state.busy === 'decode'}
      onDecode={session.decode}
    />
  );

  const commsPanel = (
    <ShipsAiPanel
      messages={state.messages}
      busy={state.busy !== null}
      online={state.online}
      explainAs={state.explainAs}
      onExplainAsChange={session.setExplainAs}
      onSend={session.sendMessage}
    />
  );

  return (
    <>
      {navSlot &&
        createPortal(
          <ObjectiveStepper
            statuses={state.objectives.map((o) => o.status)}
            viewing={state.viewing}
            onView={session.viewObjective}
          />,
          navSlot,
        )}

      {wide ? (
        // Fills the screen under the nav bar; the dashed lines resize the panes
        <main className="h-[calc(100dvh-var(--nav-h,81px))] px-4 py-4 sm:px-6">
          <Group
            id="questack-quest-main"
            orientation="horizontal"
            defaultLayout={mainLayout.defaultLayout}
            onLayoutChanged={mainLayout.onLayoutChanged}
            resizeTargetMinimumSize={RESIZE_TARGET}
            className="h-full"
          >
            <Panel id="objective" defaultSize="38" minSize="25">
              {objectivePanel}
            </Panel>
            <ResizeHandle direction="vertical" label="Resize the objective and code panes" />
            <Panel id="workspace" minSize="35">
              <Group
                id="questack-quest-workspace"
                orientation="vertical"
                defaultLayout={workspaceLayout.defaultLayout}
                onLayoutChanged={workspaceLayout.onLayoutChanged}
                resizeTargetMinimumSize={RESIZE_TARGET}
                className="h-full"
              >
                <Panel id="code" defaultSize="60" minSize="20">
                  {codePanel}
                </Panel>
                <ResizeHandle direction="horizontal" label="Resize the code and Ship's AI panes" />
                <Panel id="comms" defaultSize="40" minSize="20">
                  {commsPanel}
                </Panel>
              </Group>
            </Panel>
          </Group>
        </main>
      ) : (
        // Small screens: stacked, and the page scrolls
        <main className="space-y-4 px-4 py-4">
          {objectivePanel}
          <div className={isBriefing ? 'h-[36rem]' : 'h-[26rem]'}>{codePanel}</div>
          <div className="h-[30rem]">{commsPanel}</div>
        </main>
      )}

      {state.debriefOpen && state.completion && (
        <QuestDebriefModal
          quest={quest}
          objectives={state.objectives}
          completion={state.completion}
          debrief={state.debrief ?? ''}
          onClose={() => session.setDebriefOpen(false)}
        />
      )}
    </>
  );
}

function QuestLoader({ questId }: { questId: number }) {
  const load = useCallback(() => getQuest(questId), [questId]);
  const { data: quest, loading, error, reload } = useApiRequest(load);

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <PanelBox label="Incoming">
          <p role="status" className="mt-3 text-sm text-slate-300">
            Receiving transmission…
          </p>
        </PanelBox>
      </main>
    );
  }

  if (!quest) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <PanelBox label="Transmission not found">
          <p role="alert" className="mt-3 text-sm text-slate-300">
            {error ?? 'This quest could not be loaded.'}
          </p>
          <div className="mt-5 flex gap-3">
            <Button onClick={reload} className="flex-1">
              Retry
            </Button>
            <Button variant="outline" to="/" className="flex-1">
              Galaxy map
            </Button>
          </div>
        </PanelBox>
      </main>
    );
  }

  return <QuestScreen quest={quest} />;
}

// Keyed by the quest id so "Next quest" starts a fresh session
export default function QuestPage() {
  const { questId } = useParams();
  return <QuestLoader key={questId} questId={Number(questId)} />;
}
