import type { QuestChallenge } from '../../types/quest';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import CodeViewer from './CodeViewer';
import TextSizeControls from './TextSizeControls';

interface CodePanelProps {
  challenge: QuestChallenge;
  language: string;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  readOnly: boolean; // true when reviewing a cleared objective
  markedLine?: number;
  onLineMarked: (line: number) => void;
  pastedCode: string;
  onPastedCodeChange: (code: string) => void;
  decoded: boolean;
  decoding: boolean;
  onDecode: () => void;
}

// Top-right pane: the objective's code, or the pilot's pasted code on decode objectives
export default function CodePanel({
  challenge,
  language,
  fontSize,
  onFontSizeChange,
  readOnly,
  markedLine,
  onLineMarked,
  pastedCode,
  onPastedCodeChange,
  decoded,
  decoding,
  onDecode,
}: CodePanelProps) {
  const isDecode = challenge.challengeType === 'decode_transmission';
  const isBugHunt = challenge.challengeType === 'bug_hunt';
  const pasteMode = isDecode && !readOnly;
  const fileName = challenge.code?.fileName ?? 'Transmission';

  return (
    <ChamferFrame className="h-full" innerClassName="flex h-full flex-col bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <ChamferFrame
          size="sm"
          borderClassName="bg-accent/60"
          innerClassName="bg-accent-deep px-5 py-1 font-mono text-xs text-accent"
        >
          {fileName}
        </ChamferFrame>
        <p className="font-display text-xs tracking-[0.2em] text-muted uppercase">
          {language} · {pasteMode ? 'Paste mode' : 'Read-only'}
        </p>

        <TextSizeControls fontSize={fontSize} onFontSizeChange={onFontSizeChange} label="code" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-space-950/60">
        {isDecode ? (
          <CodeViewer
            value={pastedCode}
            onChange={onPastedCodeChange}
            editable={pasteMode}
            language={language}
            label="Intercepted code. Paste the code you want decoded here."
            placeholder={'// Paste the intercepted code here...'}
            fontSize={fontSize}
          />
        ) : (
          <CodeViewer
            value={challenge.code?.snippet ?? ''}
            language={language}
            label={`${fileName}, read-only code${isBugHunt && !readOnly ? '. Click a line, or move to it and press Enter, to mark the bug.' : ''}`}
            fontSize={fontSize}
            markedLine={isBugHunt ? markedLine : undefined}
            onLineMarked={isBugHunt && !readOnly ? onLineMarked : undefined}
          />
        )}
      </div>

      {isBugHunt && !readOnly && (
        <p className="border-t border-line px-5 py-2.5 text-xs text-slate-300">
          Click the line where the bug is, or move to it and press Enter.
          {markedLine !== undefined && (
            <span className="ml-2 font-display tracking-[0.15em] text-swarm uppercase">Marked: line {markedLine}</span>
          )}
        </p>
      )}

      {pasteMode && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <p className="min-w-0 flex-1 text-xs text-slate-300">
            Don't paste confidential or company code: it's sent to Google's Gemini to decode. It isn't saved.
          </p>
          <Button size="sm" onClick={onDecode} disabled={decoding || pastedCode.trim().length === 0}>
            {decoding ? 'Decoding…' : decoded ? 'Decode again' : 'Decode'}
          </Button>
        </div>
      )}
    </ChamferFrame>
  );
}
