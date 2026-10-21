import { useEffect, useId, useState } from 'react';
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

interface MermaidDiagramProps {
  source: string;
  fontSize: number;
}

// A ```mermaid block in a briefing. A diagram with a typo shows its source
// instead, so a mistake never blanks the briefing. Keyed by source by the
// caller, so an edited diagram starts fresh.
export default function MermaidDiagram({ source, fontSize }: MermaidDiagramProps) {
  const id = `mermaid-${useId().replace(/[^\w-]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then(async (mermaid) => {
        // parse() throws on a syntax error without leaving anything in the page
        await mermaid.parse(source);
        const { svg: rendered } = await mermaid.render(id, source);
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (failed) {
    return (
      <figure className="my-4 border border-swarm/50 bg-space-950">
        <figcaption className="border-b border-line px-4 py-2 text-xs text-swarm">
          This diagram couldn’t be drawn. Its source is shown instead.
        </figcaption>
        <CodeViewer value={source} language="mermaid" label="Diagram source" fontSize={fontSize} />
      </figure>
    );
  }

  if (svg === null) {
    return (
      <p role="status" className="my-4 border border-line bg-space-950 px-4 py-6 text-center text-xs text-muted">
        Drawing diagram…
      </p>
    );
  }

  return (
    <figure
      className="my-4 overflow-x-auto border border-line bg-space-950 p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid's own output, sanitised by it (securityLevel 'strict')
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
