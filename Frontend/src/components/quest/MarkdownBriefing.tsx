import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Element } from 'hast';
import CodeViewer from './CodeViewer';
import MermaidDiagram from './MermaidDiagram';

// Fence names authors are likely to use, mapped to the names CodeViewer
// highlights. Anything else is shown without highlighting.
const FENCE_LANGUAGES: Record<string, string> = {
  cs: 'C#',
  csharp: 'C#',
  'c#': 'C#',
  js: 'JavaScript',
  jsx: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  typescript: 'TypeScript',
};

// The language and text of a <pre><code class="language-x"> block
function fencedCode(pre: Element | undefined): { fence: string | null; code: string } {
  const code = pre?.children[0];
  if (!code || code.type !== 'element' || code.tagName !== 'code') return { fence: null, code: '' };
  const classes = Array.isArray(code.properties.className) ? code.properties.className.map(String) : [];
  const fence = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length).toLowerCase() ?? null;
  const text = code.children.map((child) => (child.type === 'text' ? child.value : '')).join('');
  return { fence, code: text.replace(/\n$/, '') };
}

interface MarkdownBriefingProps {
  markdown: string;
  language: string; // the sector's language: the default for unlabelled code blocks
  fontSize: number; // body text; headings and code scale with it
}

// An Intel briefing's Markdown, styled for the ship. Raw HTML in the Markdown
// is shown as text, never run (react-markdown's default), and unsafe link
// targets such as javascript: are dropped.
export default function MarkdownBriefing({ markdown, language, fontSize }: MarkdownBriefingProps) {
  const components: Components = {
    // The quest title is the page's h1, so briefing headings start at h2
    h1: ({ children }) => <h2 className="mt-6 mb-3 font-display text-[1.6em] font-semibold text-slate-50 first:mt-0">{children}</h2>,
    h2: ({ children }) => <h3 className="mt-6 mb-2 font-display text-[1.3em] font-semibold text-slate-50 first:mt-0">{children}</h3>,
    h3: ({ children }) => (
      <h4 className="mt-5 mb-2 font-display text-[1.05em] font-semibold tracking-[0.15em] text-accent uppercase first:mt-0">
        {children}
      </h4>
    ),
    h4: ({ children }) => <h5 className="mt-4 mb-1 font-semibold text-slate-100">{children}</h5>,
    p: ({ children }) => <p className="my-3 leading-relaxed text-slate-300">{children}</p>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-soft">
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-semibold text-slate-50">{children}</strong>,
    ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6 text-slate-300 marker:text-accent">{children}</ul>,
    ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6 text-slate-300 marker:text-accent">{children}</ol>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-accent bg-accent-deep/60 px-4 py-1 text-slate-200">{children}</blockquote>
    ),
    hr: () => <hr className="my-6 border-line" />,
    img: ({ src, alt }) => (
      <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" className="my-4 h-auto max-w-full border border-line" />
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.93em]">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b border-line-bright bg-panel-raised px-3 py-2 font-display text-[0.85em] tracking-[0.1em] text-slate-100 uppercase">
        {children}
      </th>
    ),
    td: ({ children }) => <td className="border-b border-line px-3 py-2 text-slate-300">{children}</td>,
    // Fenced blocks are drawn whole by `pre`, so `code` is only ever inline
    code: ({ children }) => (
      <code className="rounded-sm bg-space-950 px-1.5 py-0.5 font-mono text-[0.9em] text-accent-soft">{children}</code>
    ),
    pre: ({ node }) => {
      const { fence, code } = fencedCode(node);
      if (fence === 'mermaid') return <MermaidDiagram key={code} source={code} fontSize={fontSize - 1} />;
      return (
        <div className="my-4 border border-line bg-space-950">
          <CodeViewer
            value={code}
            language={fence ? (FENCE_LANGUAGES[fence] ?? fence) : language}
            label="Code example from the briefing"
            fontSize={fontSize - 1}
          />
        </div>
      );
    },
  };

  return (
    <div style={{ fontSize }} className="min-w-0 break-words">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
