import { useEffect, useId, useRef, useState } from 'react';
import type { Mermaid } from 'mermaid';
import CodeViewer from './CodeViewer';

// Mermaid is large, so it's only downloaded the first time a briefing has a
// diagram, and set up once. securityLevel 'strict' sanitises the SVG and
// turns off click handlers in diagrams.
let mermaidLoad: Promise<Mermaid> | null = null;
function loadMermaid(): Promise<Mermaid> {
  mermaidLoad ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict', fontFamily: 'Inter, ui-sans-serif, sans-serif' });
    return mermaid;
  });
  return mermaidLoad;
}

// Drawn diagrams by source, so a diagram shown again (a re-render, a text
// size change, going back to the briefing) appears straight away instead of
// being laid out again
const drawn = new Map<string, string>();

interface MermaidDiagramProps {
  source: string;
  fontSize: number;
}

// A ```mermaid block in a briefing. A diagram with a typo shows its source
// instead, so a mistake never blanks the briefing. Keyed by source by the
// caller, so an edited diagram starts fresh.
export default function MermaidDiagram({ source, fontSize }: MermaidDiagramProps) {
  const id = `mermaid-${useId().replace(/[^\w-]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(() => drawn.get(source) ?? null);
  const [failed, setFailed] = useState(false);
  // Mermaid lays a diagram out at full size before handing it back. Without
  // a container it does that on <body>, which briefly makes the whole page
  // taller and flashes its scroll bar, so it gets this clipped, hidden box
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (drawn.has(source)) return;
    let cancelled = false;
    loadMermaid()
      .then(async (mermaid) => {
        // parse() throws on a syntax error without leaving anything in the page
        await mermaid.parse(source);
        const { svg: rendered } = await mermaid.render(id, source, sandboxRef.current ?? undefined);
        drawn.set(source, rendered);
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  let content;
  if (failed) {
    content = (
      <figure className="border border-swarm/50 bg-space-950">
        <figcaption className="border-b border-line px-4 py-2 text-xs text-swarm">
          This diagram couldn’t be drawn. Its source is shown instead.
        </figcaption>
        <CodeViewer value={source} language="mermaid" label="Diagram source" fontSize={fontSize} />
      </figure>
    );
  } else if (svg === null) {
    content = (
      <p role="status" className="border border-line bg-space-950 px-4 py-6 text-center text-xs text-muted">
        Drawing diagram…
      </p>
    );
  } else {
    content = (
      <figure
        className="overflow-x-auto border border-line bg-space-950 p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        // Mermaid's own output, sanitised by it (securityLevel 'strict')
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return (
    <div className="relative my-4">
      <div ref={sandboxRef} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden" />
      {content}
    </div>
  );
}
