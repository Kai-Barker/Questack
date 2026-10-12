import { useEffect, type FormEvent } from 'react';
import CodeViewer from '../components/quest/CodeViewer';
import ShipsAiPanel from '../components/quest/ShipsAiPanel';
import Button from '../components/ui/Button';
import ChamferFrame from '../components/ui/ChamferFrame';
import Panel from '../components/ui/Panel';
import { AntennaIcon, CheckIcon } from '../components/ui/icons';
import { useApiRequest } from '../hooks/useApiRequest';
import { useDecoder } from '../hooks/useDecoder';
import { getDashboard } from '../services/dashboardService';
import type { SectorSummary } from '../types/dashboard';
import { parseLineRange } from '../utils/decoder';

// Decode a transmission: the pilot brings their own code (something from the
// web, or that an AI wrote for them) and the Ship's AI walks them through it,
// section by section, then checks they understood it. This isn't a quest:
// no XP or quest progress, though a passed check counts towards the Decoder
// insignia. The code is sent to Gemini to explain and never saved.

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
    <div>
      <p id="decoder-sector-label" className="font-display text-xs tracking-[0.2em] text-muted uppercase">
        Sector
      </p>
      <div role="group" aria-labelledby="decoder-sector-label" className="mt-2 flex flex-wrap gap-1.5">
        {sectors.map((sector) => {
          const active = sector.languageId === value;
          return (
            <button
              key={sector.languageId}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(sector)}
              className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChamferFrame
                as="span"
                size="sm"
                grow={disabled ? undefined : 'sm'}
                borderClassName={active ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
                innerClassName={`px-4 py-1.5 font-display text-xs font-semibold tracking-[0.15em] uppercase ${
                  active ? 'bg-accent-deep text-accent' : 'bg-space-950 text-slate-300'
                }`}
              >
                {sector.displayName}
              </ChamferFrame>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DecoderPage() {
  const { data: dashboard, error: sectorsError, reload: reloadSectors } = useApiRequest(getDashboard);
  const decoder = useDecoder();
  const { setLanguageId, setExplainAs } = decoder;
  const sectors = dashboard?.sectors ?? [];
  const sector = sectors.find((s) => s.languageId === decoder.languageId);

  // Start in the first sector the pilot has enlisted in, at their rank there
  const firstSector = dashboard ? (dashboard.sectors.find((s) => s.proficiencyLevel) ?? dashboard.sectors[0]) : undefined;
  useEffect(() => {
    if (!firstSector) return;
    setLanguageId((current) => current ?? firstSector.languageId);
    if (firstSector.proficiencyLevel) setExplainAs(firstSector.proficiencyLevel);
  }, [firstSector, setLanguageId, setExplainAs]);

  function chooseSector(next: SectorSummary) {
    setLanguageId(next.languageId);
    if (next.proficiencyLevel) setExplainAs(next.proficiencyLevel);
  }

  const section = decoder.sections[decoder.step];
  const highlight = section ? parseLineRange(section.lines) : undefined;
  const canCheck = decoder.decoded && decoder.transmission?.checkToken && decoder.atLastSection;
  const passed = decoder.result?.correct === true;

  function handleCheck(event: FormEvent) {
    event.preventDefault();
    void decoder.submitCheck();
  }

  return (
    <main className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            <AntennaIcon /> Decode a transmission
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.05em] uppercase">Signal decoder</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Intercepted code you don't understand? Paste it in and the Ship's AI will decode it with you, then check you've got
            it. Not a quest: no XP, but each transmission you understand counts towards the Decoder insignia.
          </p>
        </div>
        {decoder.decoded && (
          <Button variant="outline" size="sm" onClick={decoder.reset} className="ml-auto">
            New transmission
          </Button>
        )}
      </header>

      {sectorsError && (
        <p role="alert" className="text-sm text-swarm">
          Sectors could not be loaded: {sectorsError}{' '}
          <button type="button" onClick={reloadSectors} className="underline">
            Retry
          </button>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left: the code, pasted in then read-only once decoded */}
        <ChamferFrame innerClassName="flex flex-col bg-panel">
          <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-3">
            <SectorPicker
              sectors={sectors}
              value={decoder.languageId}
              disabled={decoder.decoded || decoder.decoding}
              onChange={chooseSector}
            />
            <p className="ml-auto font-display text-xs tracking-[0.2em] text-muted uppercase">
              {decoder.decoded ? 'Read-only' : 'Paste mode'}
            </p>
          </div>

          <div className="h-[24rem] overflow-hidden bg-space-950/60 lg:h-[32rem]">
            <CodeViewer
              value={decoder.code}
              onChange={decoder.decoded ? undefined : decoder.setCode}
              editable={!decoder.decoded}
              language={sector?.displayName ?? ''}
              label={decoder.decoded ? 'Decoded code, read-only' : 'Intercepted code. Paste the code you want decoded here.'}
              placeholder={'// Paste the intercepted code here...'}
              fontSize={14}
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

        {/* Right: the walkthrough and the check, then the Ship's AI */}
        <div className="flex flex-col gap-6">
          <Panel label={decoder.decoded ? `Section ${decoder.step + 1} of ${decoder.sections.length}` : 'Walkthrough'}>
            {!decoder.decoded && (
              <p className="mt-3 text-sm text-slate-300">
                {decoder.decoding
                  ? 'Decoding the transmission…'
                  : "Pick a sector, paste the code, then press Decode. The Ship's AI will explain it one section at a time."}
              </p>
            )}

            {section && (
              <div aria-live="polite">
                <p className="mt-3 font-mono text-xs text-accent">Lines {section.lines}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-100">{section.explanation}</p>
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
          </Panel>

          {decoder.decoded && decoder.transmission?.question && (
            <Panel label="Comprehension check">
              {!canCheck ? (
                <p className="mt-3 text-sm text-slate-300">Step through every section to unlock the check.</p>
              ) : (
                <form onSubmit={handleCheck} className="mt-3">
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
                      {decoder.checking ? 'Checking…' : decoder.result ? 'Try again' : 'Submit answer'}
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
            </Panel>
          )}

          <div className="h-[26rem]">
            <ShipsAiPanel
              messages={decoder.messages}
              busy={decoder.chatBusy}
              online={decoder.online}
              explainAs={decoder.explainAs}
              onExplainAsChange={decoder.setExplainAs}
              onSend={(text) => void decoder.sendChat(text)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
