import { useEffect, useState, type FormEvent } from 'react';
import { Group, Panel } from 'react-resizable-panels';
import DecodeCompleteDialog from '../components/decoder/DecodeCompleteDialog';
import CodeViewer from '../components/quest/CodeViewer';
import ResizeHandle from '../components/quest/ResizeHandle';
import ShipsAiPanel from '../components/quest/ShipsAiPanel';
import TextSizeControls from '../components/quest/TextSizeControls';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import ChamferFrame from '../components/ui/ChamferFrame';
import { AntennaIcon, CheckIcon } from '../components/ui/icons';
import { useApiRequest } from '../hooks/useApiRequest';
import { useDecoder } from '../hooks/useDecoder';
import { useLoadingLine } from '../hooks/useLoadingLine';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { RESIZE_TARGET, usePaneLayout } from '../hooks/usePaneLayout';
import { getDashboard } from '../services/dashboardService';
import type { SectorSummary } from '../types/dashboard';
import { parseLineRange } from '../utils/decoder';

// Decode a transmission: the pilot brings their own code (something from the
// web, or that an AI wrote for them) and the Ship's AI walks them through it,
// section by section, then checks they understood it. This isn't a quest:
// no XP or quest progress, though a passed check counts towards the Decoder
// insignia. The code is sent to Gemini to explain and never saved.
//
// Laid out like the Quest screen: the walkthrough on the left, the code and
// the Ship's AI on the right, in resizable panes on wide screens.

// A dropdown rather than a row of buttons, so it stays tidy as sectors are added
function SectorPicker({
  sectors,
  value,
  disabled,
  onChange,
}: {
  sectors: SectorSummary[];
  value: number | null;
  disabled: boolean;
  onChange: (sector: SectorSummary) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span id="decoder-sector-label" className="font-display text-xs tracking-[0.2em] text-muted uppercase">
        Sector
      </span>
      <div className="w-44">
        <Dropdown
          id="decoder-sector"
          labelId="decoder-sector-label"
          value={value}
          options={sectors.map((s) => ({ value: s.languageId, label: s.displayName }))}
          onChange={(languageId) => {
            const sector = sectors.find((s) => s.languageId === languageId);
            if (sector) onChange(sector);
          }}
          placeholder="Choose a sector"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

const sectionHeading = 'font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase';

export default function DecoderPage() {
  const { data: dashboard, error: sectorsError, reload: reloadSectors } = useApiRequest(getDashboard);
  const decoder = useDecoder();
  const { setLanguageId, setExplainAs } = decoder;
  const sectors = dashboard?.sectors ?? [];
  const sector = sectors.find((s) => s.languageId === decoder.languageId);
  const wide = useMediaQuery('(min-width: 1024px)');
  const [fontSize, setFontSize] = useState(14);
  const mainLayout = usePaneLayout('questack:decoder-panes');
  const workspaceLayout = usePaneLayout('questack:decoder-workspace-panes');
  const decodingLine = useLoadingLine(decoder.decoding ? 'decode' : null);
  const checkingLine = useLoadingLine(decoder.checking ? 'check' : null);

  // Start in the first sector the pilot has enlisted in, at their rank there
  const firstSector = dashboard ? (dashboard.sectors.find((s) => s.proficiencyLevel) ?? dashboard.sectors[0]) : undefined;
  useEffect(() => {
    if (!firstSector) return;
    setLanguageId((current) => current ?? firstSector.languageId);
    if (firstSector.proficiencyLevel) setExplainAs(firstSector.proficiencyLevel);
  }, [firstSector, setLanguageId, setExplainAs]);

  // Passing the check opens the "what next" popup, once per result
  const [seenResult, setSeenResult] = useState(decoder.result);
  const [completeOpen, setCompleteOpen] = useState(false);
  if (decoder.result !== seenResult) {
    setSeenResult(decoder.result);
    if (decoder.result?.correct) setCompleteOpen(true);
  }

  function chooseSector(next: SectorSummary) {
    setLanguageId(next.languageId);
    if (next.proficiencyLevel) setExplainAs(next.proficiencyLevel);
  }

  function decodeAnother() {
    setCompleteOpen(false);
    decoder.reset();
  }

  const section = decoder.sections[decoder.step];
  const highlight = section ? parseLineRange(section.lines) : undefined;
  const canCheck = decoder.decoded && decoder.transmission?.checkToken && decoder.atLastSection;
  const passed = decoder.result?.correct === true;

  function handleCheck(event: FormEvent) {
    event.preventDefault();
    void decoder.submitCheck();
  }

  // Left: what the decoder is, the walkthrough and the comprehension check
  const walkthroughPanel = (
    <ChamferFrame className="h-full" innerClassName="flex h-full flex-col bg-panel">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-5">
        <p className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          <AntennaIcon /> Decode a transmission
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Signal decoder</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Intercepted code you don't understand? Paste it in and the Ship's AI will decode it with you, then check you've got
          it. Not a quest: no XP, but each transmission you understand counts towards the Decoder insignia.
        </p>
        {decoder.decoded && (
          <Button variant="outline" size="sm" onClick={decoder.reset} className="mt-4">
            New transmission
          </Button>
        )}

        {sectorsError && (
          <p role="alert" className="mt-4 text-sm text-swarm">
            Sectors could not be loaded: {sectorsError}{' '}
            <button type="button" onClick={reloadSectors} className="underline">
              Retry
            </button>
          </p>
        )}

        <hr className="my-5 border-line" />

        <h2 className={sectionHeading}>
          {decoder.decoded ? `Section ${decoder.step + 1} of ${decoder.sections.length}` : 'Walkthrough'}
        </h2>
        {!decoder.decoded && (
          <p className="mt-2 text-sm text-slate-300">
            {decoder.decoding
              ? decodingLine
              : "Pick a sector, paste the code, then press Decode. The Ship's AI will explain it one section at a time."}
          </p>
        )}

        {section && (
          <div aria-live="polite">
            <p className="mt-2 font-mono text-xs text-accent">Lines {section.lines}</p>
            <p className="mt-2 leading-relaxed text-slate-100">{section.explanation}</p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" onClick={decoder.previous} disabled={decoder.step === 0}>
                Previous
              </Button>
              <Button size="sm" onClick={decoder.next} disabled={decoder.atLastSection}>
                Next section
              </Button>
            </div>
          </div>
        )}

        {decoder.decoded && decoder.transmission?.question && (
          <>
            <hr className="my-5 border-line" />
            <h2 className={sectionHeading}>Comprehension check</h2>
            {!canCheck ? (
              <p className="mt-2 text-sm text-slate-300">Step through every section to unlock the check.</p>
            ) : (
              <form onSubmit={handleCheck} className="mt-2">
                <p className="text-sm font-semibold text-slate-100">{decoder.transmission.question}</p>
                <label htmlFor="decoder-answer" className="sr-only">
                  Your answer
                </label>
                <textarea
                  id="decoder-answer"
                  value={decoder.answer}
                  onChange={(e) => decoder.setAnswer(e.target.value)}
                  readOnly={passed}
                  maxLength={4000}
                  rows={4}
                  placeholder="Answer in your own words…"
                  className="mt-3 block w-full resize-none rounded-md border border-line bg-space-950 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-muted focus:border-accent/60 focus:outline-none read-only:opacity-70"
                />
                {!passed && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => void decoder.submitCheck()}
                    disabled={decoder.checking || !decoder.answer.trim()}
                  >
                    {decoder.checking ? checkingLine : decoder.result ? 'Try again' : 'Submit answer'}
                  </Button>
                )}
                {decoder.checkError && (
                  <p role="alert" className="mt-3 text-sm text-swarm">
                    {decoder.checkError}
                  </p>
                )}
                {decoder.result && (
                  <div role="status" className={`mt-4 border-l-2 pl-3 text-sm ${passed ? 'border-buff' : 'border-swarm'}`}>
                    <p
                      className={`flex items-center gap-2 font-display text-xs font-semibold tracking-[0.2em] uppercase ${
                        passed ? 'text-buff' : 'text-swarm'
                      }`}
                    >
                      {passed && <CheckIcon />}
                      {passed ? 'Transmission decoded' : 'Not quite'}
                    </p>
                    <p className="mt-1 text-slate-100">{decoder.result.feedback}</p>
                    {decoder.result.guidingQuestion && <p className="mt-1 text-slate-300">{decoder.result.guidingQuestion}</p>}
                    {passed && (
                      <p className="mt-1 text-xs text-muted">
                        {decoder.result.counted
                          ? 'Logged towards your Decoder insignia.'
                          : "You've decoded this transmission before, so it isn't counted again."}
                      </p>
                    )}
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </ChamferFrame>
  );

  // Top right: the code, pasted in then read-only once decoded. The editor
  // fills whatever room the pane has.
  const codePanel = (
    <ChamferFrame className="h-full" innerClassName="flex h-full flex-col bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <SectorPicker
          sectors={sectors}
          value={decoder.languageId}
          disabled={decoder.decoded || decoder.decoding}
          onChange={chooseSector}
        />
        <p className="font-display text-xs tracking-[0.2em] text-muted uppercase">
          {decoder.decoded ? 'Read-only' : 'Paste mode'}
        </p>
        <TextSizeControls fontSize={fontSize} onFontSizeChange={setFontSize} label="code" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-space-950/60">
        <CodeViewer
          value={decoder.code}
          onChange={decoder.decoded ? undefined : decoder.setCode}
          editable={!decoder.decoded}
          language={sector?.displayName ?? ''}
          label={decoder.decoded ? 'Decoded code, read-only' : 'Intercepted code. Paste the code you want decoded here.'}
          placeholder={'// Paste the intercepted code here...'}
          fontSize={fontSize}
          highlightLines={highlight}
        />
      </div>

      {!decoder.decoded && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <p className="min-w-0 flex-1 text-xs text-slate-300">
            Don't paste confidential or company code: it's sent to Google's Gemini to decode. It isn't saved.
          </p>
          <Button
            size="sm"
            onClick={() => void decoder.decode()}
            disabled={decoder.decoding || decoder.languageId === null || !decoder.code.trim()}
          >
            {decoder.decoding ? 'Decoding…' : 'Decode'}
          </Button>
        </div>
      )}
      {decoder.decodeError && (
        <p role="alert" className="border-t border-line px-5 py-2.5 text-sm text-swarm">
          {decoder.decodeError}
        </p>
      )}
    </ChamferFrame>
  );

  const commsPanel = (
    <ShipsAiPanel
      messages={decoder.messages}
      busy={decoder.chatBusy}
      online={decoder.online}
      explainAs={decoder.explainAs}
      onExplainAsChange={decoder.setExplainAs}
      onSend={(text) => void decoder.sendChat(text)}
    />
  );

  return (
    <>
      {wide ? (
        // Fills the screen under the nav bar; the dashed lines resize the panes
        <main className="h-[calc(100dvh-var(--nav-h,81px))] px-4 py-4 sm:px-6">
          <Group
            id="questack-decoder-main"
            orientation="horizontal"
            defaultLayout={mainLayout.defaultLayout}
            onLayoutChanged={mainLayout.onLayoutChanged}
            resizeTargetMinimumSize={RESIZE_TARGET}
            className="h-full"
          >
            <Panel id="walkthrough" defaultSize="34" minSize="22">
              {walkthroughPanel}
            </Panel>
            <ResizeHandle direction="vertical" label="Resize the walkthrough and code panes" />
            <Panel id="workspace" minSize="35">
              <Group
                id="questack-decoder-workspace"
                orientation="vertical"
                defaultLayout={workspaceLayout.defaultLayout}
                onLayoutChanged={workspaceLayout.onLayoutChanged}
                resizeTargetMinimumSize={RESIZE_TARGET}
                className="h-full"
              >
                <Panel id="code" defaultSize="62" minSize="20">
                  {codePanel}
                </Panel>
                <ResizeHandle direction="horizontal" label="Resize the code and Ship's AI panes" />
                <Panel id="comms" defaultSize="38" minSize="20">
                  {commsPanel}
                </Panel>
              </Group>
            </Panel>
          </Group>
        </main>
      ) : (
        // Small screens: stacked, and the page scrolls
        <main className="space-y-4 px-4 py-4">
          {walkthroughPanel}
          <div className="h-[26rem]">{codePanel}</div>
          <div className="h-[30rem]">{commsPanel}</div>
        </main>
      )}

      {completeOpen && decoder.result?.correct && (
        <DecodeCompleteDialog
          feedback={decoder.result.feedback}
          counted={decoder.result.counted}
          onDecodeAnother={decodeAnother}
          onClose={() => setCompleteOpen(false)}
        />
      )}
    </>
  );
}
