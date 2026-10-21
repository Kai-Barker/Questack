import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mermaid from 'mermaid';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import BriefingPanel from '../../src/components/quest/BriefingPanel';
import CodePanel from '../../src/components/quest/CodePanel';
import CodeViewer from '../../src/components/quest/CodeViewer';
import MarkdownBriefing from '../../src/components/quest/MarkdownBriefing';
import ObjectivePanel from '../../src/components/quest/ObjectivePanel';
import ObjectiveStepper from '../../src/components/quest/ObjectiveStepper';
import QuestDebriefModal from '../../src/components/quest/QuestDebriefModal';
import ShipsAiPanel from '../../src/components/quest/ShipsAiPanel';
import type { ObjectiveProgress } from '../../src/hooks/useQuestSession';
import { BRIEFING_QUEST, COMPLETION, DECODE_QUEST, QUEST } from '../helpers/fixtures';
import { renderRoute } from '../helpers/render';

// Mermaid needs a real browser to lay diagrams out, so a fake draws them.
// Source containing "broken" fails to parse.
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(async (source: string) => {
      if (source.includes('broken')) throw new Error('Parse error');
      return true;
    }),
    render: vi.fn(async () => ({ svg: '<svg data-testid="mermaid-svg"></svg>' })),
  },
}));

const progress = (overrides: Partial<ObjectiveProgress> = {}): ObjectiveProgress => ({
  status: 'current',
  attempts: 0,
  hintsUsed: 0,
  answer: '',
  pastedCode: '',
  decoded: false,
  ...overrides,
});

describe('ObjectivePanel', () => {
  function renderPanel(overrides: Partial<ComponentProps<typeof ObjectivePanel>> = {}) {
    const props: ComponentProps<typeof ObjectivePanel> = {
      quest: QUEST,
      index: 0,
      challenge: QUEST.challenges[0]!,
      progress: progress(),
      lineCount: 3,
      busy: false,
      submitting: false,
      questCompleted: false,
      onAnswerChange: vi.fn(),
      onMarkedLineChange: vi.fn(),
      onRequestHint: vi.fn(),
      onSubmit: vi.fn(),
      onAcknowledge: vi.fn(),
      onShowDebrief: vi.fn(),
      ...overrides,
    };
    return { ...renderRoute(<ObjectivePanel {...props} />), props };
  }

  it('enables Submit only once there’s an answer', async () => {
    const { user, props } = renderPanel({ progress: progress({ answer: 'It stores 10.' }) });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it.each([
    ['an empty answer', { progress: progress({ answer: '   ' }) }],
    ['the AI busy', { progress: progress({ answer: 'x' }), busy: true }],
  ])('disables Submit with %s', (_name, overrides) => {
    renderPanel(overrides);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('counts hints down and stops at zero', () => {
    const { rerender } = renderPanel({ progress: progress({ hintsUsed: 1 }) });
    expect(screen.getByRole('button', { name: 'Request hint (2 left)' })).toBeEnabled();
    rerender(<></>);

    renderPanel({ progress: progress({ hintsUsed: 3 }) });
    expect(screen.getByRole('button', { name: 'Request hint (0 left)' })).toBeDisabled();
  });

  it('shows "Assessing…" while marking', () => {
    renderPanel({ progress: progress({ answer: 'x' }), submitting: true, busy: true });
    expect(screen.getByRole('button', { name: 'Assessing…' })).toBeDisabled();
  });

  it('keeps the marked line within the code', async () => {
    const onMarkedLineChange = vi.fn();
    renderPanel({ index: 1, challenge: QUEST.challenges[1]!, onMarkedLineChange });
    const input = screen.getByLabelText('Suspected line');

    fireEvent.change(input, { target: { value: '99' } });
    expect(onMarkedLineChange).toHaveBeenLastCalledWith(3);
    fireEvent.change(input, { target: { value: '0' } });
    expect(onMarkedLineChange).toHaveBeenLastCalledWith(1);
  });

  it('clears the marked line when the box is emptied', () => {
    const onMarkedLineChange = vi.fn();
    renderPanel({ index: 1, challenge: QUEST.challenges[1]!, progress: progress({ markedLine: 2 }), onMarkedLineChange });

    fireEvent.change(screen.getByLabelText('Suspected line'), { target: { value: '' } });
    expect(onMarkedLineChange).toHaveBeenLastCalledWith(undefined);
  });

  it('only shows the line box on bug hunts', () => {
    renderPanel();
    expect(screen.queryByLabelText('Suspected line')).not.toBeInTheDocument();
  });

  it('summarises a cleared objective and makes the answer read-only', () => {
    renderPanel({
      progress: progress({ status: 'cleared', attempts: 2, hintsUsed: 1, answer: 'x', lastEvaluation: { correct: true, feedback: 'Well read.' } }),
    });

    expect(screen.getByText(/Cleared · 2nd attempt · 1 hint/)).toBeInTheDocument();
    expect(screen.getByText('Well read.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your answer')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it.each([
    [1, 'First try'],
    [3, '3rd attempt'],
    [5, '5th attempt'],
  ])('describes %i attempts as "%s"', (attempts, label) => {
    renderPanel({ progress: progress({ status: 'cleared', attempts }) });
    expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  });

  it('guides the decode steps', () => {
    const { rerender } = renderPanel({ quest: DECODE_QUEST, challenge: DECODE_QUEST.challenges[0]!, progress: progress({ answer: 'x' }) });
    expect(screen.getByText(/Paste the code into the viewer and press Decode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    rerender(<></>);

    renderPanel({ quest: DECODE_QUEST, challenge: DECODE_QUEST.challenges[0]!, progress: progress({ answer: 'x', decoded: true }) });
    expect(screen.getByText(/Decoded\. Read the Ship's AI breakdown/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('offers the debrief once the quest is cleared', async () => {
    const { user, props } = renderPanel({ questCompleted: true, progress: progress({ status: 'cleared' }) });
    await user.click(screen.getByRole('button', { name: 'View debrief' }));
    expect(props.onShowDebrief).toHaveBeenCalled();
  });
});

describe('ObjectivePanel on a briefing', () => {
  const briefing = BRIEFING_QUEST.challenges[0]!;

  function renderBriefing(overrides: Partial<ComponentProps<typeof ObjectivePanel>> = {}) {
    const props: ComponentProps<typeof ObjectivePanel> = {
      quest: BRIEFING_QUEST,
      index: 0,
      challenge: briefing,
      progress: progress(),
      lineCount: 1,
      busy: false,
      submitting: false,
      questCompleted: false,
      onAnswerChange: vi.fn(),
      onMarkedLineChange: vi.fn(),
      onRequestHint: vi.fn(),
      onSubmit: vi.fn(),
      onAcknowledge: vi.fn(),
      onShowDebrief: vi.fn(),
      ...overrides,
    };
    return { ...renderRoute(<ObjectivePanel {...props} />), props };
  }

  it('asks for no answer: one button clears it', async () => {
    const { user, props } = renderBriefing();

    expect(screen.queryByLabelText('Your answer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Request hint/ })).not.toBeInTheDocument();
    // The briefing itself is in the briefing pane, not repeated here
    expect(screen.queryByText(/Cargo crates/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Briefing understood' }));
    expect(props.onAcknowledge).toHaveBeenCalled();
  });

  it('shows "Logging…" while it’s saved', () => {
    renderBriefing({ busy: true, submitting: true });
    expect(screen.getByRole('button', { name: 'Logging…' })).toBeDisabled();
  });

  it('says it was read once cleared', () => {
    renderBriefing({ progress: progress({ status: 'cleared', attempts: 1, lastEvaluation: { correct: true, feedback: '' } }) });

    expect(screen.getByText('Cleared · Briefing read')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Briefing understood' })).not.toBeInTheDocument();
  });
});

describe('BriefingPanel', () => {
  it('renders the briefing’s Markdown, with its code highlighted like quest code', () => {
    renderRoute(
      <BriefingPanel challenge={BRIEFING_QUEST.challenges[0]!} language="C#" fontSize={14} onFontSizeChange={vi.fn()} />,
    );

    const article = screen.getByRole('article', { name: 'Intel briefing' });
    expect(within(article).getByRole('heading', { level: 2, name: 'Cargo crates' })).toBeInTheDocument();
    expect(within(article).getByText('A variable is a labelled crate.')).toBeInTheDocument();
    expect(within(article).getByRole('textbox', { name: 'Code example from the briefing' })).toHaveTextContent('int fuel = 10;');
  });

  it('resizes the briefing text', async () => {
    const onFontSizeChange = vi.fn();
    const { user } = renderRoute(
      <BriefingPanel challenge={BRIEFING_QUEST.challenges[0]!} language="C#" fontSize={14} onFontSizeChange={onFontSizeChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Larger briefing text' }));
    expect(onFontSizeChange).toHaveBeenCalledWith(16);
  });
});

describe('MarkdownBriefing', () => {
  const show = (markdown: string) => renderRoute(<MarkdownBriefing markdown={markdown} language="C#" fontSize={14} />);

  it('renders tables, lists and links that open safely in a new tab', () => {
    show('| Type | Holds |\n| --- | --- |\n| int | whole numbers |\n\n- one\n- two\n\n[Docs](https://learn.microsoft.com)');

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'whole numbers' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('never runs HTML or javascript: links written into the Markdown', () => {
    const { container } = show('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[Click](javascript:alert(1))');

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Click').closest('a')?.getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('shows images with their alt text', () => {
    show('![Stack and heap](https://example.com/memory.png)');
    expect(screen.getByRole('img', { name: 'Stack and heap' })).toHaveAttribute('loading', 'lazy');
  });

  it('draws Mermaid diagrams', async () => {
    show('```mermaid\nflowchart TD\n  A --> B\n```');
    expect(await screen.findByTestId('mermaid-svg')).toBeInTheDocument();
  });

  it('draws diagrams inside the briefing, never on the page body (which would flash its scroll bar)', async () => {
    const source = 'flowchart LR\n  Sandbox --> Check';
    const { container } = show(`\`\`\`mermaid\n${source}\n\`\`\``);
    await screen.findAllByTestId('mermaid-svg');

    const call = vi.mocked(mermaid.render).mock.calls.find(([, text]) => text === source)!;
    expect(call[2]).toBeInstanceOf(HTMLElement);
    expect(call[2]).not.toBe(document.body);
    expect(container.contains(call[2]!)).toBe(true);
  });

  it('keeps the briefing mounted when the Quest screen updates, so code and diagrams aren’t redrawn', async () => {
    const source = 'flowchart LR\n  Steady --> State';
    const briefing = `# Steady\n\n\`\`\`mermaid\n${source}\n\`\`\``;
    // A new onFontSizeChange each time, as when QuestScreen re-renders for the AI or "explain as"
    const panel = () => (
      <BriefingPanel
        challenge={{ ...BRIEFING_QUEST.challenges[0]!, instructions: briefing }}
        language="C#"
        fontSize={14}
        onFontSizeChange={() => {}}
      />
    );
    const { rerender } = render(panel());
    await screen.findAllByTestId('mermaid-svg');
    const heading = screen.getByRole('heading', { name: 'Steady' });

    rerender(panel());

    expect(screen.getByRole('heading', { name: 'Steady' })).toBe(heading);
    expect(vi.mocked(mermaid.render).mock.calls.filter(([, text]) => text === source)).toHaveLength(1);
  });

  it('shows a broken diagram’s source instead of nothing', async () => {
    show('```mermaid\nbroken diagram\n```');

    expect(await screen.findByText('This diagram couldn’t be drawn. Its source is shown instead.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Diagram source' })).toHaveTextContent('broken diagram');
  });
});

describe('ObjectiveStepper', () => {
  it('lets the pilot move between objectives they’ve reached', async () => {
    const onView = vi.fn();
    render(<ObjectiveStepper statuses={['cleared', 'current', 'locked']} viewing={1} onView={onView} />);

    expect(screen.getByRole('button', { name: 'Objective 1, cleared' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Objective 2, current' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Objective 3, locked' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next objective' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Previous objective' }));
    await userEvent.click(screen.getByRole('button', { name: 'Objective 1, cleared' }));
    expect(onView.mock.calls).toEqual([[0], [0]]);
  });

  it('has no previous objective at the start', () => {
    render(<ObjectiveStepper statuses={['current', 'locked']} viewing={0} onView={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous objective' })).toBeDisabled();
  });
});

describe('ShipsAiPanel', () => {
  const messages = [
    { id: 0, from: 'ai' as const, tone: 'info' as const, text: 'Comms link established.' },
    { id: 1, from: 'pilot' as const, tone: 'chat' as const, text: 'Help?' },
    { id: 2, from: 'ai' as const, tone: 'hint' as const, label: 'Hint 1 of 3', text: 'Look at line one.' },
  ];

  function renderComms(overrides: Partial<ComponentProps<typeof ShipsAiPanel>> = {}) {
    const props: ComponentProps<typeof ShipsAiPanel> = {
      messages,
      busy: false,
      online: true,
      explainAs: 'pilot',
      onExplainAsChange: vi.fn(),
      onSend: vi.fn(),
      ...overrides,
    };
    render(<ShipsAiPanel {...props} />);
    return props;
  }

  it('shows the conversation, telling screen readers who said what', () => {
    renderComms();
    const items = within(screen.getByRole('list', { name: "Ship's AI conversation" })).getAllByRole('listitem');

    expect(items.map((li) => li.textContent)).toEqual([
      "Ship's AI: Comms link established.",
      'You: Help?',
      "Ship's AI: Hint 1 of 3Look at line one.",
    ]);
  });

  it('sends a message and clears the box', async () => {
    const props = renderComms();
    const input = screen.getByLabelText("Message the Ship's AI");

    await userEvent.type(input, 'What is a variable?{Enter}');
    expect(props.onSend).toHaveBeenCalledWith('What is a variable?');
    expect(input).toHaveValue('');
  });

  it('won’t send an empty message or while busy', async () => {
    const props = renderComms({ busy: true });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(screen.getByText('Transmitting…')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Message the Ship's AI"), 'hi{Enter}');
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('switches how the AI explains things', async () => {
    const props = renderComms();
    expect(screen.getByRole('button', { name: 'pilot' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'commander' }));
    expect(props.onExplainAsChange).toHaveBeenCalledWith('commander');
  });

  it('shows when comms are offline', () => {
    renderComms({ online: false });
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});

describe('CodePanel', () => {
  function renderCode(overrides: Partial<ComponentProps<typeof CodePanel>> = {}) {
    const props: ComponentProps<typeof CodePanel> = {
      challenge: QUEST.challenges[1]!,
      language: 'C#',
      fontSize: 14,
      onFontSizeChange: vi.fn(),
      readOnly: false,
      onLineMarked: vi.fn(),
      pastedCode: '',
      onPastedCodeChange: vi.fn(),
      decoded: false,
      decoding: false,
      onDecode: vi.fn(),
      ...overrides,
    };
    render(<CodePanel {...props} />);
    return props;
  }

  it('shows the file and changes the text size within limits', async () => {
    const props = renderCode();
    expect(screen.getByText('Total.cs')).toBeInTheDocument();
    expect(screen.getByText('C# · Read-only')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Larger code text' }));
    expect(props.onFontSizeChange).toHaveBeenCalledWith(16);
  });

  it.each([
    [12, 'Smaller code text'],
    [20, 'Larger code text'],
  ])('stops at %ipx', (fontSize, button) => {
    renderCode({ fontSize });
    expect(screen.getByRole('button', { name: button })).toBeDisabled();
  });

  it('shows the marked line on a bug hunt', () => {
    renderCode({ markedLine: 3 });
    expect(screen.getByText('Marked: line 3')).toBeInTheDocument();
  });

  it('is a paste box with a Decode button on decode objectives', async () => {
    const props = renderCode({ challenge: DECODE_QUEST.challenges[0]!, pastedCode: 'let a = 1;' });

    expect(screen.getByText('C# · Paste mode')).toBeInTheDocument();
    expect(screen.getByText(/Don't paste confidential or company code/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Decode' }));
    expect(props.onDecode).toHaveBeenCalled();
  });

  it.each([
    ['nothing is pasted', { pastedCode: '  ' }, 'Decode', true],
    ['it is decoding', { pastedCode: 'x', decoding: true }, 'Decoding…', true],
    ['it was decoded', { pastedCode: 'x', decoded: true }, 'Decode again', false],
  ])('the Decode button when %s', (_name, overrides, label, disabled) => {
    renderCode({ challenge: DECODE_QUEST.challenges[0]!, ...overrides });
    expect(screen.getByRole('button', { name: label })).toHaveProperty('disabled', disabled);
  });
});

describe('CodeViewer', () => {
  it('shows the code with an accessible name', () => {
    render(<CodeViewer value={'int a = 1;\nint b = 2;'} language="C#" label="Program.cs, read-only code" fontSize={14} />);

    // Syntax highlighting splits the code into spans, so check the editor's text
    expect(document.querySelector('.cm-content')).toHaveTextContent('int a = 1;int b = 2;');
    expect(document.querySelector('[aria-label="Program.cs, read-only code"]')).not.toBeNull();
  });

  it('highlights the marked line', () => {
    render(<CodeViewer value={'a\nb\nc'} language="JavaScript" label="code" fontSize={14} markedLine={2} />);
    expect(document.querySelector('.cm-marked-line')).toHaveTextContent('b');
  });

  it('reports a marked line from the editor', () => {
    const onLineMarked = vi.fn();
    render(<CodeViewer value={'a\nb'} language="C#" label="code" fontSize={14} onLineMarked={onLineMarked} />);

    document.querySelector('.cm-editor')!.dispatchEvent(new CustomEvent('questack:mark-line', { detail: 2, bubbles: true }));
    expect(onLineMarked).toHaveBeenCalledWith(2);
  });
});

describe('QuestDebriefModal', () => {
  const objectives = [progress({ status: 'cleared', attempts: 1 }), progress({ status: 'cleared', attempts: 2, hintsUsed: 1 })];

  function renderDebrief(completion = COMPLETION, onClose = vi.fn()) {
    renderRoute(<QuestDebriefModal quest={QUEST} objectives={objectives} completion={completion} debrief="Nice work." onClose={onClose} />);
    return onClose;
  }

  it('summarises the clear: objectives, XP, level, sector and unlocks', () => {
    renderDebrief({ ...COMPLETION, booster: { name: 'Overdrive Core', xpMultiplier: 2 }, xpEarned: 200 });
    const dialog = screen.getByRole('dialog', { name: 'Quest cleared' });

    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText('First try · 0 hints')).toBeInTheDocument();
    expect(within(dialog).getByText('2nd attempt · 1 hint')).toBeInTheDocument();
    expect(within(dialog).getByText('Overdrive Core 2×')).toBeInTheDocument();
    expect(within(dialog).getByText('+200 XP')).toBeInTheDocument();
    expect(within(dialog).getByRole('progressbar', { name: 'Level 2 progress' })).toBeInTheDocument();
    expect(within(dialog).getByText('C# swarm cleared 0% → 33%')).toBeInTheDocument();
    expect(within(dialog).getByText('Loop Patrol')).toBeInTheDocument();
    expect(within(dialog).getByText('Booster acquired')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(within(dialog).getByText('Nice work.')).toBeInTheDocument();
  });

  it('marks a replay', () => {
    renderDebrief({ ...COMPLETION, replay: true, xpEarned: 25, unlocked: [], boosterEarned: undefined });

    expect(screen.getByRole('dialog', { name: 'Quest replayed' })).toBeInTheDocument();
    expect(screen.getByText(/Replays earn a quarter of the quest’s XP/)).toBeInTheDocument();
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument();
  });

  it('closes from the Close button when there is no next quest, or with Escape', async () => {
    const onClose = renderDebrief({ ...COMPLETION, nextQuestId: null });

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('doesn’t claim a level-up when the level is the same', () => {
    renderDebrief({ ...COMPLETION, before: { level: 2, levelXp: 100, levelXpRequired: 750 }, after: { level: 2, levelXp: 200, levelXpRequired: 750 } });
    expect(screen.queryByText('Level up!')).not.toBeInTheDocument();
  });
});
