import { screen, waitFor, within } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import DecoderPage from '../../src/pages/DecoderPage';
import { parseLineRange } from '../../src/utils/decoder';
import { DASHBOARD } from '../helpers/fixtures';
import { renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// The standalone decoder: paste, step through, ask, then the comprehension
// check. Not a quest, so it never calls any quest endpoint.

const CODE = 'let fuel = 10;\nwhile (fuel >= 3) fuel -= 3;';
const DECODED = {
  sections: [
    { lines: '1', explanation: 'Fills the tank with 10.' },
    { lines: '2', explanation: 'Burns 3 at a time while at least 3 is left.' },
  ],
  question: 'What is fuel when the loop ends?',
  checkToken: 'signed-token',
};

// CodeMirror can't be typed into in jsdom, so the paste goes through its API
function paste(code: string) {
  const view = EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)!;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
}

const conversation = () => screen.getByRole('list', { name: "Ship's AI conversation" });

async function renderDecoder() {
  respond('get', '/dashboard', 200, DASHBOARD);
  const view = renderRoute(<DecoderPage />, { path: '/decoder' });
  // Starts in the first sector the pilot has enlisted in
  await waitFor(() => expect(screen.getByRole('button', { name: 'C#' })).toHaveAttribute('aria-pressed', 'true'));
  return view;
}

describe('DecoderPage', () => {
  it('decodes pasted code, steps through it, and passes the check', async () => {
    const decodeCalls = respond('post', '/ai/decoder', 200, DECODED);
    const checkCalls = respond('post', '/ai/decoder/check', 200, { correct: true, feedback: 'Spot on, Pilot.', counted: true });
    const { user } = await renderDecoder();

    expect(screen.getByRole('button', { name: 'Decode' })).toBeDisabled();
    paste(CODE);
    await user.click(screen.getByRole('button', { name: 'Decode' }));

    expect(await screen.findByText('Fills the tank with 10.')).toBeInTheDocument();
    // Explains at the pilot's rank in the chosen sector
    expect(decodeCalls[0]!.body).toEqual({ languageId: 1, proficiency: 'pilot', code: CODE });
    expect(screen.getByText('Section 1 of 2')).toBeInTheDocument();
    expect(document.querySelector('.cm-highlight-line')).toHaveTextContent('let fuel = 10;');
    expect(screen.getByText('Step through every section to unlock the check.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next section' }));
    expect(screen.getByText('Burns 3 at a time while at least 3 is left.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next section' })).toBeDisabled();

    expect(screen.getByText(DECODED.question)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your answer'), 'It ends at 1.');
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(await screen.findByText('Transmission decoded')).toBeInTheDocument();
    expect(screen.getByText('Logged towards your Decoder insignia.')).toBeInTheDocument();
    expect(checkCalls[0]!.body).toEqual({ proficiency: 'pilot', code: CODE, checkToken: 'signed-token', answer: 'It ends at 1.' });
  });

  it('lets the pilot retry a wrong answer, with a guiding question', async () => {
    respond('post', '/ai/decoder', 200, { ...DECODED, sections: [DECODED.sections[0]] });
    respond('post', '/ai/decoder/check', 200, {
      correct: false,
      feedback: 'Not quite.',
      guidingQuestion: 'What is 10 - 3 - 3 - 3?',
      counted: false,
    });
    const { user } = await renderDecoder();

    paste(CODE);
    await user.click(screen.getByRole('button', { name: 'Decode' }));
    await user.type(await screen.findByLabelText('Your answer'), 'Zero');
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(await screen.findByText('Not quite.')).toBeInTheDocument();
    expect(screen.getByText('What is 10 - 3 - 3 - 3?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('offers no check when the text was not code', async () => {
    respond('post', '/ai/decoder', 200, {
      sections: [{ lines: '1', explanation: "That's a shopping list, not code." }],
      question: null,
      checkToken: null,
    });
    const { user } = await renderDecoder();

    paste('eggs, milk, bread');
    await user.click(screen.getByRole('button', { name: 'Decode' }));

    expect(await screen.findAllByText("That's a shopping list, not code.")).not.toHaveLength(0);
    expect(screen.queryByText('Comprehension check')).not.toBeInTheDocument();
  });

  it('shows why a decode failed', async () => {
    respond('post', '/ai/decoder', 503, { error: "Ship's AI comms are down. Try again in a moment, Pilot." });
    const { user } = await renderDecoder();

    paste(CODE);
    await user.click(screen.getByRole('button', { name: 'Decode' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Ship's AI comms are down");
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('asks the pilot to decode before chatting, then answers follow-ups about the code', async () => {
    respond('post', '/ai/decoder', 200, DECODED);
    const chatCalls = respond('post', '/ai/decoder/chat', 200, { reply: 'It takes 3 away each pass.' });
    const { user } = await renderDecoder();

    await user.type(screen.getByLabelText("Message the Ship's AI"), 'What does this do?{Enter}');
    expect(within(conversation()).getByText(/Decode the transmission first/)).toBeInTheDocument();

    paste(CODE);
    await user.click(screen.getByRole('button', { name: 'Decode' }));
    await screen.findByText('Fills the tank with 10.');
    await user.type(screen.getByLabelText("Message the Ship's AI"), 'What does -= do?{Enter}');

    expect(await within(conversation()).findByText('It takes 3 away each pass.')).toBeInTheDocument();
    expect(chatCalls[0]!.body).toMatchObject({ languageId: 1, code: CODE, question: DECODED.question });
  });

  it('starts over with a new transmission', async () => {
    respond('post', '/ai/decoder', 200, DECODED);
    const { user } = await renderDecoder();

    paste(CODE);
    await user.click(screen.getByRole('button', { name: 'Decode' }));
    await user.click(await screen.findByRole('button', { name: 'New transmission' }));

    expect(screen.getByRole('button', { name: 'Decode' })).toBeDisabled();
    expect(screen.getByText('Walkthrough')).toBeInTheDocument();
  });
});

describe('parseLineRange', () => {
  it.each([
    ['1-4', { from: 1, to: 4 }],
    ['7', { from: 7, to: 7 }],
    ['lines 10–12', { from: 10, to: 12 }],
    ['3 to 5', { from: 3, to: 5 }],
    ['the whole thing', undefined],
  ])('reads "%s"', (label, range) => {
    expect(parseLineRange(label)).toEqual(range);
  });
});
