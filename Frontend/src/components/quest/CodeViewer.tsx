import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { csharp } from '@codemirror/legacy-modes/mode/clike';
import { Prec, type Extension } from '@codemirror/state';
import { Decoration, EditorView, keymap } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

// Picks syntax highlighting from the sector's language name
function languageFor(name: string): Extension {
  if (/^c#$|csharp/i.test(name)) return StreamLanguage.define(csharp);
  if (/javascript|typescript/i.test(name)) return javascript({ typescript: /typescript/i.test(name) });
  return [];
}

// Colours come from the app palette (see index.css). Every colour keeps at
// least 4.5:1 contrast on the dark code background.
const questackTheme = EditorView.theme(
  {
    '&': { color: '#e2e8f0', backgroundColor: 'transparent', height: '100%' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.75',
      // Learners should see the characters they'd type: <= stays <=, never ≤
      fontVariantLigatures: 'none',
    },
    '.cm-content': { caretColor: '#22d3ee', padding: '14px 0' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#7384a3', border: 'none' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 18px 0 20px' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#22d3ee' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: 'rgba(34, 211, 238, 0.22)' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(34, 211, 238, 0.18)', outline: 'none' },
    '.cm-placeholder': { color: '#7384a3' },
    // The line the pilot marked as the bug
    '.cm-marked-line': { backgroundColor: 'rgba(245, 165, 36, 0.14)', boxShadow: 'inset 3px 0 0 #f5a524' },
  },
  { dark: true },
);

const questackHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: '#67e8f9' },
    { tag: [t.typeName, t.className, t.namespace], color: '#93c5fd' },
    { tag: [t.string, t.special(t.string), t.character], color: '#fcd34d' },
    { tag: [t.number, t.bool, t.null, t.atom], color: '#6ee7b7' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: '#8a9ab5', fontStyle: 'italic' },
    { tag: [t.operator, t.definitionOperator], color: '#cbd5e1' },
    { tag: [t.punctuation, t.bracket, t.separator], color: '#a3b1c6' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#f1f5f9' },
  ]),
);

// Line marking reports through a DOM event rather than a callback, so the
// editor's extensions don't need rebuilding whenever the callback changes
const MARK_LINE_EVENT = 'questack:mark-line';

function reportLine(view: EditorView, pos: number) {
  const line = view.state.doc.lineAt(pos).number;
  view.dom.dispatchEvent(new CustomEvent<number>(MARK_LINE_EVENT, { detail: line, bubbles: true }));
}

const lineMarking: Extension = [
  EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos !== null) reportLine(view, pos);
    },
  }),
  Prec.high(
    keymap.of([
      {
        key: 'Enter',
        run(view) {
          reportLine(view, view.state.selection.main.head);
          return true;
        },
      },
    ]),
  ),
];

function markedLineDecoration(line: number): Extension {
  return EditorView.decorations.compute(['doc'], (state) =>
    line >= 1 && line <= state.doc.lines
      ? Decoration.set([Decoration.line({ class: 'cm-marked-line' }).range(state.doc.line(line).from)])
      : Decoration.none,
  );
}

interface CodeViewerProps {
  value: string;
  language: string; // sector name, e.g. 'C#'
  label: string; // accessible name for the code area
  fontSize: number;
  editable?: boolean; // decode objectives: the pilot pastes code in
  onChange?: (value: string) => void;
  placeholder?: string;
  markedLine?: number;
  onLineMarked?: (line: number) => void; // bug hunts: click a line, or put the cursor on it and press Enter
}

export default function CodeViewer({
  value,
  language,
  label,
  fontSize,
  editable = false,
  onChange,
  placeholder,
  markedLine,
  onLineMarked,
}: CodeViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canMarkLines = onLineMarked !== undefined;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onLineMarked) return;
    const handle = (event: Event) => onLineMarked((event as CustomEvent<number>).detail);
    wrapper.addEventListener(MARK_LINE_EVENT, handle);
    return () => wrapper.removeEventListener(MARK_LINE_EVENT, handle);
  }, [onLineMarked]);

  const extensions = useMemo(() => {
    const list: Extension[] = [
      languageFor(language),
      questackTheme,
      questackHighlight,
      EditorView.theme({ '&': { fontSize: `${fontSize}px` } }),
      EditorView.contentAttributes.of({ 'aria-label': label }),
    ];

    if (canMarkLines) list.push(lineMarking);
    if (markedLine !== undefined) list.push(markedLineDecoration(markedLine));
    return list;
  }, [language, fontSize, label, canMarkLines, markedLine]);

  return (
    <div ref={wrapperRef} className="h-full">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={!editable}
        placeholder={placeholder}
        theme="none"
        height="100%"
        className="h-full"
        // Tab must move focus out of the editor, not insert indentation
        indentWithTab={false}
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          highlightSelectionMatches: false,
          autocompletion: false,
          closeBrackets: false,
          searchKeymap: false,
        }}
        extensions={extensions}
      />
    </div>
  );
}
