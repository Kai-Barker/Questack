import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuestPage from '../../src/pages/QuestPage';
import { COMPLETION, QUEST } from '../helpers/fixtures';
import { renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// The Quest screen, end to end in the browser: objectives, code, the Ship's
// AI and the debrief, with the backend answered by MSW

afterEach(() => {
  localStorage.clear();
});

function renderQuest(options: { navSlot?: HTMLElement } = {}) {
  const navSlot = options.navSlot ? { element: options.navSlot, setInUse: vi.fn() } : null;
  return renderRoute(<QuestPage />, { path: '/quest/:questId', at: '/quest/1', navSlot });
}

const conversation = () => screen.getByRole('list', { name: "Ship's AI conversation" });

describe('QuestPage', () => {
  it('shows it is receiving the quest, then the first objective', async () => {
    respond('get', '/quests/1', 200, QUEST);
    renderQuest();

    expect(screen.getByText('Receiving transmission…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Signal Check' })).toBeInTheDocument();
    expect(screen.getByText('C# Sector › Quest 01')).toBeInTheDocument();
    expect(screen.getByText('Objective 01 of 02 · Read and explain')).toBeInTheDocument();
    expect(screen.getByText('Explain what this stores.')).toBeInTheDocument();
    expect(document.querySelector('.cm-content')).toHaveTextContent('int fuel = 10;');
    expect(screen.getByRole('link', { name: 'Return to sector map' })).toHaveAttribute('href', '/sector/1');
    expect(within(conversation()).getByText(/Comms link established/)).toBeInTheDocument();
  });

  it('explains a locked quest and offers a retry', async () => {
    respond('get', '/quests/1', 403, { error: 'This quest is still locked. Clear the quests before it first, Pilot.' });
    renderQuest();

    expect(await screen.findByRole('alert')).toHaveTextContent('This quest is still locked.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Galaxy map' })).toHaveAttribute('href', '/');
  });

  it('plays the whole quest: answer, mark the bug, clear it and read the debrief', async () => {
    respond('get', '/quests/1', 200, QUEST);
    const evaluate = respond('post', '/ai/evaluate', 200, { correct: true, feedback: 'Spot on, Pilot.' });
    respond('post', '/quests/1/complete', 200, COMPLETION);
    respond('post', '/ai/debrief', 200, { debrief: 'Sharp eyes, Pilot.' });
    const { user } = renderQuest();
    await screen.findByRole('heading', { level: 1, name: 'Signal Check' });

    // Objective 1: Submit stays disabled until there's an answer
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await user.type(screen.getByLabelText('Your answer'), 'It stores 10 in fuel.');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await within(conversation()).findByText('Spot on, Pilot.')).toBeInTheDocument();

    // Objective 2: a bug hunt, with the line marked in the box
    expect(await screen.findByText('Objective 02 of 02 · Bug hunt')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Suspected line'), '3');
    expect(screen.getByText('Marked: line 3')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your answer'), '=+ assigns instead of adding');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Quest cleared' });
    expect(evaluate[1]!.body).toMatchObject({ challengeId: 102, selectedLine: 3, answer: '=+ assigns instead of adding' });
    expect(within(dialog).getByText('+100 XP')).toBeInTheDocument();
    expect(within(dialog).getByText('Level up!')).toBeInTheDocument();
    expect(within(dialog).getByText('Sharp eyes, Pilot.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Next quest' })).toHaveAttribute('href', '/quest/2');

    // Escape closes it, and it can be reopened from the objective panel
    fireEvent(dialog, new Event('cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'View debrief' }));
    expect(screen.getByRole('dialog', { name: 'Quest cleared' })).toBeInTheDocument();
  });

  it('asks for hints and chats with the Ship’s AI', async () => {
    respond('get', '/quests/1', 200, QUEST);
    respond('post', '/ai/hint', 200, { hint: 'Look at what fuel is set to.' });
    respond('post', '/ai/chat', 200, { reply: 'An int is a whole number.' });
    const { user } = renderQuest();
    await screen.findByRole('heading', { level: 1, name: 'Signal Check' });

    await user.click(screen.getByRole('button', { name: 'Request hint (3 left)' }));
    expect(await within(conversation()).findByText('Look at what fuel is set to.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request hint (2 left)' })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Message the Ship's AI"), 'What is an int?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await within(conversation()).findByText('An int is a whole number.')).toBeInTheDocument();
  });

  it('puts the objective stepper in the nav bar', async () => {
    respond('get', '/quests/1', 200, QUEST);
    const slot = document.body.appendChild(document.createElement('div'));
    renderQuest({ navSlot: slot });
    await screen.findByRole('heading', { level: 1, name: 'Signal Check' });

    const stepper = within(slot).getByRole('navigation', { name: 'Quest objectives' });
    expect(within(stepper).getByRole('button', { name: 'Objective 1, current' })).toHaveAttribute('aria-current', 'step');
    expect(within(stepper).getByRole('button', { name: 'Objective 2, locked' })).toBeDisabled();
    slot.remove();
  });

  describe('on a wide screen', () => {
    function wideScreen() {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query) =>
          ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
      );
    }

    it('lays the panes out side by side with resize handles', async () => {
      wideScreen();
      respond('get', '/quests/1', 200, QUEST);
      renderQuest();
      await screen.findByRole('heading', { level: 1, name: 'Signal Check' });

      expect(screen.getByRole('separator', { name: 'Resize the objective and code panes' })).toBeInTheDocument();
      expect(screen.getByRole('separator', { name: "Resize the code and Ship's AI panes" })).toBeInTheDocument();
    });

    it.each([
      ['a corrupt saved layout', () => localStorage.setItem('questack:quest-panes', '{not json')],
      ['a saved layout of the wrong shape', () => localStorage.setItem('questack:quest-panes', '{"objective":"wide"}')],
      [
        'blocked storage',
        () =>
          vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
          }),
      ],
    ])('falls back to the default sizes with %s', async (_name, arrange) => {
      wideScreen();
      arrange();
      respond('get', '/quests/1', 200, QUEST);
      renderQuest();

      expect(await screen.findByRole('heading', { level: 1, name: 'Signal Check' })).toBeInTheDocument();
    });
  });
});
