import type { QuestChallenge } from '../../types/quest';
import ChamferFrame from '../ui/ChamferFrame';
import MarkdownBriefing from './MarkdownBriefing';
import TextSizeControls from './TextSizeControls';

interface BriefingPanelProps {
  challenge: QuestChallenge;
  language: string;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

// Top-right pane on an Intel briefing objective: the briefing itself, in
// place of the code. The text size is shared with the code pane.
export default function BriefingPanel({ challenge, language, fontSize, onFontSizeChange }: BriefingPanelProps) {
  return (
    <ChamferFrame className="h-full" innerClassName="flex h-full flex-col bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <ChamferFrame
          size="sm"
          borderClassName="bg-accent/60"
          innerClassName="bg-accent-deep px-5 py-1 font-display text-xs tracking-[0.15em] text-accent uppercase"
        >
          Intel briefing
        </ChamferFrame>
        <p className="font-display text-xs tracking-[0.2em] text-muted uppercase">{language} · Read-only</p>
        <TextSizeControls fontSize={fontSize} onFontSizeChange={onFontSizeChange} label="briefing" />
      </div>

      <article aria-label="Intel briefing" className="min-h-0 flex-1 overflow-y-auto bg-space-950/60 px-6 py-5">
        <div className="mx-auto max-w-3xl">
          <MarkdownBriefing markdown={challenge.instructions} language={language} fontSize={fontSize + 1} />
        </div>
      </article>
    </ChamferFrame>
  );
}
