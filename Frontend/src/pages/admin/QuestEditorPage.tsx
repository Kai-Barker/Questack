import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import QuestEditor from '../../components/admin/QuestEditor';
import QuestListPanel from '../../components/admin/QuestListPanel';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import { useApiRequest } from '../../hooks/useApiRequest';
import { getAdminQuest, getQuestEditorIndex, type QuestEditorIndex } from '../../services/adminService';
import type { AdminQuest, AdminQuestSummary } from '../../types/admin';
import { errorMessage } from '../../utils/format';

type Selection = number | 'new' | null;

function readSelection(raw: string | null): Selection {
  if (raw === 'new') return 'new';
  return raw && /^\d{1,10}$/.test(raw) ? Number(raw) : null;
}

const toSummary = (quest: AdminQuest): AdminQuestSummary => ({
  questId: quest.questId,
  languageId: quest.languageId,
  title: quest.title,
  concept: quest.concept,
  difficulty: quest.difficulty,
  status: quest.status,
  displayOrder: quest.displayOrder,
  objectiveCount: quest.objectives.length,
});

const byPosition = (a: AdminQuestSummary, b: AdminQuestSummary) =>
  a.languageId - b.languageId || a.displayOrder - b.displayOrder || a.questId - b.questId;

function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="font-display text-sm tracking-[0.2em] text-accent uppercase motion-safe:animate-pulse">
      {text}
    </p>
  );
}

function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Panel label="Comms failure" className="max-w-md">
      <p role="alert" className="mt-3 text-sm text-slate-300">
        {message}
      </p>
      <Button onClick={onRetry} className="mt-5 w-full">
        Retry
      </Button>
    </Panel>
  );
}

// A quest just created (or saved) is handed to the editor that mounts for
// its new URL, so it opens without a reload and keeps the "saved" message
interface Handoff {
  quest: AdminQuest;
  notice: string;
}

interface EditorSlotProps {
  selection: number | 'new';
  index: QuestEditorIndex;
  defaultLanguageId: number;
  handoff: Handoff | null;
  onHandoffUsed: () => void;
  onSaved: (quest: AdminQuest, notice: string, created: boolean) => void;
  onDeleted: (questId: number) => void;
}

type SlotState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; quest: AdminQuest | null; notice?: string };

// Loads the chosen quest (with its answer keys) and opens the editor on it
function EditorSlot({ selection, index, defaultLanguageId, handoff, onHandoffUsed, onSaved, onDeleted }: EditorSlotProps) {
  const [state, setState] = useState<SlotState>(() => {
    if (selection === 'new') return { status: 'ready', quest: null };
    if (handoff?.quest.questId === selection) return { status: 'ready', quest: handoff.quest, notice: handoff.notice };
    return { status: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => onHandoffUsed(), [onHandoffUsed]);

  const loading = state.status === 'loading';
  useEffect(() => {
    if (selection === 'new' || !loading) return;
    let cancelled = false;
    getAdminQuest(selection).then(
      (quest) => {
        if (!cancelled) setState({ status: 'ready', quest });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selection, loading, attempt]);

  if (state.status === 'loading') return <Loading text="Loading quest…" />;
  if (state.status === 'error') {
    return (
      <LoadFailed
        message={state.message}
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  return (
    <QuestEditor
      original={state.quest}
      defaultLanguageId={defaultLanguageId}
      sectors={index.sectors}
      quests={index.quests}
      initialNotice={state.notice}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}

// Admin › Quests: the quest list on the left, the chosen quest's editor on
// the right. The chosen quest is in the URL (?quest=<id> or ?quest=new).
export default function QuestEditorPage() {
  const { data, loading, error, reload, replace } = useApiRequest(getQuestEditorIndex);
  const [params] = useSearchParams();
  const selection = readSelection(params.get('quest'));
  const [sectorChoice, setSectorChoice] = useState<number | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const clearHandoff = useCallback(() => setHandoff(null), []);

  if (loading) {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6">
        <Loading text="Loading quests…" />
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6">
        <LoadFailed message={error ?? 'Could not load the quests.'} onRetry={reload} />
      </main>
    );
  }

  const selectedSummary = typeof selection === 'number' ? data.quests.find((q) => q.questId === selection) : undefined;
  const sectorId = sectorChoice ?? selectedSummary?.languageId ?? data.sectors[0]?.languageId ?? 0;

  function handleSaved(quest: AdminQuest, notice: string, created: boolean) {
    if (!data) return;
    const others = data.quests.filter((q) => q.questId !== quest.questId);
    replace({ ...data, quests: [...others, toSummary(quest)].sort(byPosition) });
    setSectorChoice(quest.languageId);
    if (created) setHandoff({ quest, notice });
  }

  function handleDeleted(questId: number) {
    if (!data) return;
    replace({ ...data, quests: data.quests.filter((q) => q.questId !== questId) });
  }

  return (
    <main className="mx-auto grid max-w-[90rem] items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <QuestListPanel
        sectors={data.sectors}
        quests={data.quests}
        sectorId={sectorId}
        onSectorChange={setSectorChoice}
        selected={selection}
      />

      {selection === null ? (
        <Panel label="Quest editor">
          <p className="mt-3 text-sm text-slate-300">
            Pick a quest from the list to edit it, or start a new one. Drafts stay hidden from pilots until you publish them.
          </p>
          <Button to="?quest=new" className="mt-5">
            + New quest
          </Button>
        </Panel>
      ) : (
        <EditorSlot
          key={String(selection)}
          selection={selection}
          index={data}
          defaultLanguageId={sectorId}
          handoff={handoff}
          onHandoffUsed={clearHandoff}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </main>
  );
}
