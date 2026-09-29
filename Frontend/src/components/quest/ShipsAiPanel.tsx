import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CommsMessage, CommsTone } from '../../hooks/useQuestSession';
import type { ProficiencyLevel } from '../../types/pilot';
import ChamferFrame from '../ui/ChamferFrame';
import { ArrowRightIcon, DiamondIcon } from '../ui/icons';

const levels: ProficiencyLevel[] = ['cadet', 'pilot', 'commander'];

// Left border colour per message type, so hints and results stand out
const toneStyles: Record<CommsTone, string> = {
  chat: '',
  info: '',
  hint: 'border-l-2 border-accent',
  decode: 'border-l-2 border-accent/60',
  success: 'border-l-2 border-buff',
  retry: 'border-l-2 border-swarm',
  error: 'border-l-2 border-swarm text-swarm',
};

const labelStyles: Partial<Record<CommsTone, string>> = {
  hint: 'text-accent',
  decode: 'text-accent',
  success: 'text-buff',
  retry: 'text-swarm',
};

interface ShipsAiPanelProps {
  messages: CommsMessage[];
  busy: boolean;
  online: boolean;
  explainAs: ProficiencyLevel;
  onExplainAsChange: (level: ProficiencyLevel) => void;
  onSend: (text: string) => void;
}

// Bottom-right pane: the Ship's AI mentor chat
export default function ShipsAiPanel({ messages, busy, online, explainAs, onExplainAsChange, onSend }: ShipsAiPanelProps) {
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLOListElement>(null);

  // Keep the newest message in view
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length, busy]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft('');
  }

  return (
    <ChamferFrame className="h-full" innerClassName="flex h-full flex-col bg-panel">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-[0.2em] text-accent uppercase">
          <DiamondIcon className="text-lg" />
          Ship's AI · Comms
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <span id="explain-as-label" className="font-display text-xs tracking-[0.2em] text-muted uppercase">
            Explain as
          </span>
          <div role="group" aria-labelledby="explain-as-label" className="flex gap-1">
            {levels.map((level) => {
              const active = level === explainAs;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onExplainAsChange(level)}
                  className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <ChamferFrame
                    as="span"
                    size="sm"
                    grow="sm"
                    borderClassName={active ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
                    innerClassName={`px-3 py-1 font-display text-[0.65rem] font-semibold tracking-[0.15em] uppercase ${
                      active ? 'bg-accent-deep text-accent' : 'bg-space-950 text-slate-300'
                    }`}
                  >
                    {level}
                  </ChamferFrame>
                </button>
              );
            })}
          </div>
        </div>

        <p className={`flex items-center gap-2 font-display text-xs tracking-[0.2em] uppercase ${online ? 'text-slate-300' : 'text-swarm'}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${online ? 'bg-accent' : 'bg-swarm'}`} />
          {online ? 'Online' : 'Offline'}
        </p>
      </div>

      <ol
        ref={logRef}
        aria-label="Ship's AI conversation"
        aria-live="polite"
        // relative: keeps the absolutely positioned sr-only labels inside this
        // scroll area; otherwise they escape it and stretch the page
        className="relative min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-2"
      >
        {messages.map((message) => (
          <li key={message.id} className={message.from === 'pilot' ? 'flex justify-end' : 'flex'}>
            <div
              className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                message.from === 'pilot' ? 'bg-[#1c2a47] text-slate-100' : `bg-panel-raised text-slate-100 ${toneStyles[message.tone]}`
              }`}
            >
              <span className="sr-only">{message.from === 'pilot' ? 'You: ' : "Ship's AI: "}</span>
              {message.label && (
                <span
                  className={`mb-1 block font-display text-[0.65rem] font-semibold tracking-[0.2em] uppercase ${
                    labelStyles[message.tone] ?? 'text-muted'
                  }`}
                >
                  {message.label}
                </span>
              )}
              {message.text}
            </div>
          </li>
        ))}
        {busy && (
          <li className="flex">
            <p className="rounded-md bg-panel-raised px-4 py-2.5 font-display text-xs tracking-[0.2em] text-accent uppercase motion-safe:animate-pulse">
              Transmitting…
            </p>
          </li>
        )}
      </ol>

      <form onSubmit={handleSubmit} className="flex gap-3 px-5 pt-3">
        <label htmlFor="comms-input" className="sr-only">
          Message the Ship's AI
        </label>
        <input
          id="comms-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Ask the Ship's AI for guidance…"
          className="min-w-0 flex-1 rounded-md border border-line bg-space-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-muted focus:border-accent/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Send message"
          className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChamferFrame
            as="span"
            size="md"
            grow={busy || !draft.trim() ? undefined : 'sm'}
            borderClassName="bg-accent group-hover:bg-accent-soft"
            innerClassName="grid size-[42px] place-items-center text-lg text-space-950"
          >
            <ArrowRightIcon />
          </ChamferFrame>
        </button>
      </form>
      <p className="px-5 pt-2 pb-4 text-xs text-muted">The Ship's AI gives hints, not answers.</p>
    </ChamferFrame>
  );
}
