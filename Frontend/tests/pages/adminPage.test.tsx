import { screen, waitFor, within } from '@testing-library/react';
import { Link } from 'react-router';
import { describe, expect, it } from 'vitest';
import AdminNav from '../../src/components/admin/AdminNav';
import RequireAdmin from '../../src/components/auth/RequireAdmin';
import TopNav from '../../src/components/layout/TopNav';
import AdminAiPage from '../../src/pages/admin/AdminAiPage';
import AdminUsersPage from '../../src/pages/admin/AdminUsersPage';
import QuestEditorPage from '../../src/pages/admin/QuestEditorPage';
import type { AdminQuest, AdminQuestSummary, AdminUser } from '../../src/types/admin';
import { USER } from '../helpers/fixtures';
import { currentLocation, fakeAuth, renderRoute } from '../helpers/render';
import { respond, unreachable } from '../helpers/server';

// The admin console in the frontend: the way in, the clearance check, its
// own nav, and the Quests, Users and AI tabs. The backend enforces the role
// on its own (see Backend/tests/endpoints/admin.test.ts).

const ADMIN = { ...USER, role: 'admin' as const, username: 'ADMIRAL' };
const adminAuth = () => fakeAuth({ user: ADMIN });

const OVERVIEW = {
  pilots: 12,
  activePilots: 11,
  publishedQuests: 10,
  draftQuests: 1,
  aiCallsToday: 40,
  aiTokensToday: 52000,
  aiFailuresToday: 3,
};

describe('Admin tab in the pilot nav', () => {
  const renderNav = (auth = fakeAuth(), at = '/') =>
    renderRoute(<TopNav slotRef={() => {}} slotInUse={false} />, { path: '*', at, auth });

  it('is hidden from pilots without the admin role', () => {
    renderNav();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('opens the quest editor for admins', () => {
    renderNav(adminAuth());

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin/quests');
  });
});

describe('RequireAdmin', () => {
  const routes = [
    {
      path: '/admin',
      element: <RequireAdmin />,
      children: [
        { path: 'quests', element: <Link to="/admin/users">Quests console</Link> },
        { path: 'users', element: <p>Users console</p> },
      ],
    },
  ];

  it('sends pilots without the admin role back to the Galaxy Map, without asking the backend', async () => {
    renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin/quests', routes });

    await waitFor(() => expect(currentLocation()).toBe('/'));
    expect(screen.queryByText('Quests console')).not.toBeInTheDocument();
  });

  it('confirms the role with the backend before opening the console', async () => {
    const calls = respond('get', '/admin/session', 200, { user: ADMIN });
    renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin/quests', routes, auth: adminAuth() });

    expect(screen.getByText('Verifying command clearance…')).toHaveAttribute('role', 'status');
    expect(screen.queryByText('Quests console')).not.toBeInTheDocument();
    expect(await screen.findByText('Quests console')).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('checks again on every admin tab', async () => {
    const calls = respond('get', '/admin/session', 200, { user: ADMIN });
    const { user } = renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin/quests', routes, auth: adminAuth() });

    await user.click(await screen.findByText('Quests console'));

    expect(await screen.findByText('Users console')).toBeInTheDocument();
    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it('closes the console when the backend says the role is gone', async () => {
    respond('get', '/admin/session', 403, { error: 'Command clearance required, Pilot.' });
    const auth = adminAuth();
    renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin/quests', routes, auth });

    await waitFor(() => expect(currentLocation()).toBe('/'));
    expect(auth.refreshUser).toHaveBeenCalled();
    expect(screen.queryByText('Quests console')).not.toBeInTheDocument();
  });

  it('offers a retry when the backend can’t be reached', async () => {
    unreachable('get', '/admin/session');
    const { user } = renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin/quests', routes, auth: adminAuth() });

    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t confirm your clearance');

    respond('get', '/admin/session', 200, { user: ADMIN });
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Quests console')).toBeInTheDocument();
  });
});

describe('AdminNav', () => {
  it('replaces the pilot tabs with admin tabs and a way out', () => {
    renderRoute(<AdminNav />, { path: '/admin/users', auth: adminAuth() });

    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Quests', 'Users', 'AI', 'Exit Admin']);
    expect(within(nav).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Exit Admin' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Galaxy Map' })).not.toBeInTheDocument();
    expect(screen.getByText('Admin', { selector: 'span' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------
// Quests tab
// ---------------------------------------------------------------------

const SECTORS = [
  { languageId: 1, name: 'csharp', displayName: 'C#' },
  { languageId: 2, name: 'javascript', displayName: 'JavaScript' },
];

const summary = (questId: number, title: string, status: 'draft' | 'published', languageId = 1): AdminQuestSummary => ({
  questId,
  languageId,
  title,
  concept: 'Concept',
  difficulty: 'easy',
  status,
  displayOrder: questId,
  objectiveCount: 1,
});

const QUESTS = [
  summary(4, 'Conditional Canyon', 'published'),
  summary(5, 'The Loop Labyrinth', 'published'),
  summary(6, 'Recursion Reef', 'draft'),
  summary(11, 'Async Asteroids', 'published', 2),
];

const LOOP_QUEST: AdminQuest = {
  questId: 5,
  languageId: 1,
  title: 'The Loop Labyrinth',
  concept: 'Loops',
  difficulty: 'medium',
  status: 'published',
  isSideQuest: false,
  storyText: 'The Swarm has corrupted the fuel systems.',
  xpReward: 150,
  displayOrder: 5,
  prerequisiteIds: [4],
  objectives: [
    {
      challengeId: 501,
      type: 'read_and_explain',
      instructions: 'Explain the fuel loop.',
      fileName: 'Program.cs',
      codeSnippet: 'int fuel = 10;',
      answerKey: 'SECRET ANSWER KEY',
      markingCriteria: 'Mentions the condition.',
      bugLine: null,
      altBugLines: [],
    },
  ],
};

const DRAFT_QUEST: AdminQuest = { ...LOOP_QUEST, questId: 6, title: 'Recursion Reef', status: 'draft', prerequisiteIds: [], objectives: [] };

function editorIndex() {
  respond('get', '/admin/sectors', 200, { sectors: SECTORS });
  respond('get', '/admin/quests', 200, { quests: QUESTS });
}

// Opens a dropdown and chooses an option, as a person would
async function pick(user: ReturnType<typeof renderRoute>['user'], trigger: HTMLElement, option: string) {
  await user.click(trigger);
  await user.click(screen.getByRole('option', { name: option }));
}

const renderEditor = (at = '/admin/quests') =>
  renderRoute(<QuestEditorPage />, { path: '/admin/quests', at, auth: adminAuth() });

describe('QuestEditorPage', () => {
  it('lists the sector’s quests, drafts included', async () => {
    editorIndex();
    const { user } = renderEditor();

    const list = await screen.findByRole('list', { name: 'Quests in this sector' });
    expect(within(list).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Conditional CanyonPublished',
      'The Loop LabyrinthPublished',
      'Recursion ReefDraft',
    ]);

    await pick(user, screen.getByLabelText('Sector'), 'JavaScript Sector');
    expect(within(list).getByText('Async Asteroids')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search quests'), 'zzz');
    expect(within(list).getByText('No quests match that search.')).toBeInTheDocument();
  });

  it('opens a quest with its answer keys and saves changes', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, { quest: LOOP_QUEST });
    const saves = respond('put', '/admin/quests/5', 200, { quest: { ...LOOP_QUEST, title: 'Loop Labyrinth II' } });
    const { user } = renderEditor('/admin/quests?quest=5');

    expect(await screen.findByRole('heading', { name: 'Edit quest: The Loop Labyrinth' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chosen prerequisites' })).toHaveTextContent('Conditional Canyon');
    // One objective: it starts open
    expect(screen.getByLabelText('Answer key')).toHaveValue('SECRET ANSWER KEY');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Loop Labyrinth II');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Quest saved. It’s live for pilots now.')).toBeInTheDocument();
    expect(saves[0]!.body).toMatchObject({
      title: 'Loop Labyrinth II',
      languageId: 1,
      xpReward: 150,
      prerequisiteIds: [4],
      objectives: [{ challengeId: 501, type: 'read_and_explain', answerKey: 'SECRET ANSWER KEY', bugLine: null }],
    });
    expect(screen.getByRole('heading', { name: 'Edit quest: Loop Labyrinth II' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Loop Labyrinth II/ })).toBeInTheDocument();
  });

  it('shows the backend’s messages on the right fields and opens the objective', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, {
      quest: { ...LOOP_QUEST, objectives: [...LOOP_QUEST.objectives, { ...LOOP_QUEST.objectives[0]!, challengeId: 502 }] },
    });
    respond('put', '/admin/quests/5', 400, {
      error: 'Check the highlighted fields.',
      fields: {
        prerequisiteIds: 'Circular prerequisites: The Loop Labyrinth → Conditional Canyon → The Loop Labyrinth.',
        'objectives.1.answerKey': 'Keep line numbers out of the answer key: the Ship’s AI could repeat them.',
      },
    });
    const { user } = renderEditor('/admin/quests?quest=5');

    await user.type(await screen.findByLabelText('Concept'), '!');
    expect(screen.queryByLabelText('Answer key')).not.toBeInTheDocument(); // two objectives: both start closed
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Check the highlighted fields.');
    expect(screen.getByText(/Circular prerequisites/)).toBeInTheDocument();
    const answerKey = screen.getByLabelText('Answer key');
    expect(answerKey).toHaveAccessibleDescription('Keep line numbers out of the answer key: the Ship’s AI could repeat them.');
  });

  it('creates a quest, then keeps editing it at its new address', async () => {
    editorIndex();
    const created: AdminQuest = { ...DRAFT_QUEST, questId: 1000, title: 'Signal Storm', concept: 'Events', objectives: [] };
    const saves = respond('post', '/admin/quests', 201, { quest: created });
    const { user } = renderEditor('/admin/quests?quest=new');

    expect(await screen.findByRole('heading', { name: 'New quest' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Signal Storm');
    await user.type(screen.getByLabelText('Concept'), 'Events');
    await pick(user, screen.getByLabelText('Type of objective to add'), 'Decode the transmission');
    await user.click(screen.getByRole('button', { name: '+ Add objective' }));
    expect(screen.queryByText('Code snippet')).not.toBeInTheDocument(); // decode objectives have none
    await user.type(screen.getByLabelText('Instructions'), 'Paste some event code.');
    await user.type(screen.getByLabelText('Marking criteria'), 'Explains the listener.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(currentLocation()).toBe('/admin/quests?quest=1000'));
    expect(saves[0]!.body).toMatchObject({
      title: 'Signal Storm',
      status: 'draft',
      objectives: [{ type: 'decode_transmission', codeSnippet: null, answerKey: null, markingCriteria: 'Explains the listener.' }],
    });
    expect(await screen.findByText('Draft saved. Pilots can’t see it yet.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit quest: Signal Storm' })).toBeInTheDocument();
  });

  it('only offers to delete drafts', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, { quest: LOOP_QUEST });
    const { user } = renderEditor('/admin/quests?quest=5');

    expect(await screen.findByRole('heading', { name: /Edit quest/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    respond('get', '/admin/quests/6', 200, { quest: DRAFT_QUEST });
    const deletes = respond('delete', '/admin/quests/6', 204);
    await user.click(screen.getByRole('link', { name: /Recursion Reef/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this draft?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete draft' }));

    await waitFor(() => expect(currentLocation()).toBe('/admin/quests'));
    expect(deletes).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /Recursion Reef/ })).not.toBeInTheDocument();
  });

  it('asks before throwing away unsaved changes', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, { quest: LOOP_QUEST });
    const { user } = renderEditor('/admin/quests?quest=5');

    await user.type(await screen.findByLabelText('Title'), '!');
    await user.click(screen.getByRole('link', { name: /Conditional Canyon/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Discard changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(currentLocation()).toBe('/admin/quests?quest=5');
    expect(screen.getByLabelText('Title')).toHaveValue('The Loop Labyrinth!');

    respond('get', '/admin/quests/4', 200, { quest: { ...LOOP_QUEST, questId: 4, title: 'Conditional Canyon', prerequisiteIds: [] } });
    await user.click(screen.getByRole('link', { name: /Conditional Canyon/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }));
    expect(await screen.findByRole('heading', { name: 'Edit quest: Conditional Canyon' })).toBeInTheDocument();
  });

  it('previews the quest as pilots see it, without the answer key', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, { quest: LOOP_QUEST });
    const { user } = renderEditor('/admin/quests?quest=5');

    await user.click(await screen.findByRole('button', { name: 'Preview' }));

    const dialog = screen.getByRole('dialog', { name: 'The Loop Labyrinth' });
    expect(within(dialog).getByText('Explain the fuel loop.')).toBeInTheDocument();
    expect(within(dialog).getByText('Program.cs')).toBeInTheDocument();
    expect(within(dialog).queryByText('SECRET ANSWER KEY')).not.toBeInTheDocument();
  });

  it('keeps prerequisites to the quest’s own sector', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, { quest: LOOP_QUEST });
    const { user } = renderEditor('/admin/quests?quest=5');

    await user.click(await screen.findByLabelText('Prerequisites'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Recursion Reef (draft)']);
    await user.click(screen.getByRole('option', { name: 'Recursion Reef (draft)' }));
    expect(screen.getByRole('button', { name: 'Remove prerequisite Recursion Reef' })).toBeInTheDocument();

    await pick(user, screen.getAllByLabelText('Sector')[1]!, 'JavaScript Sector');
    expect(screen.queryByRole('button', { name: /Remove prerequisite/ })).not.toBeInTheDocument();
  });

  it('outlines only the objective last clicked', async () => {
    editorIndex();
    respond('get', '/admin/quests/5', 200, {
      quest: { ...LOOP_QUEST, objectives: [...LOOP_QUEST.objectives, { ...LOOP_QUEST.objectives[0]!, challengeId: 502 }] },
    });
    const { user } = renderEditor('/admin/quests?quest=5');

    await user.click(await screen.findByRole('button', { name: 'Expand Objective 01' }));
    await user.click(screen.getByRole('button', { name: 'Expand Objective 02' }));

    // Both open, but only the last one clicked is outlined
    const active = () => document.querySelectorAll('li[data-active]');
    expect(active()).toHaveLength(1);
    expect(active()[0]).toHaveTextContent('02');

    await user.click(screen.getAllByLabelText('Instructions')[0]!);
    expect(active()).toHaveLength(1);
    expect(active()[0]).toHaveTextContent('01');
  });
});

// ---------------------------------------------------------------------
// Users and AI tabs
// ---------------------------------------------------------------------

const ROOKIE: AdminUser = {
  userId: 20,
  callsign: 'ROOKIE',
  email: 'rookie@fleet.io',
  role: 'user',
  isActive: true,
  level: 2,
  totalXp: 300,
  lastActive: '2026-10-12T09:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
};
const ADMIN_ROW: AdminUser = { ...ROOKIE, userId: ADMIN.userId, callsign: 'ADMIRAL', role: 'admin', email: 'a@fleet.io' };

describe('AdminUsersPage', () => {
  it('deactivates a pilot', async () => {
    respond('get', '/admin/users', 200, { users: [ADMIN_ROW, ROOKIE] });
    const patches = respond('patch', '/admin/users/20', 200, { user: { ...ROOKIE, isActive: false } });
    const { user } = renderRoute(<AdminUsersPage />, { path: '/admin/users', auth: adminAuth() });

    const row = (await screen.findByRole('rowheader', { name: 'ROOKIE' })).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Deactivate ROOKIE' }));

    expect(await screen.findByText('ROOKIE deactivated.')).toBeInTheDocument();
    expect(patches[0]!.body).toEqual({ isActive: false });
    expect(within(row).getByText('Deactivated')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Reactivate ROOKIE' })).toBeInTheDocument();
  });

  it('never offers to deactivate an admin', async () => {
    respond('get', '/admin/users', 200, { users: [ADMIN_ROW] });
    renderRoute(<AdminUsersPage />, { path: '/admin/users', auth: adminAuth() });

    const row = (await screen.findByRole('rowheader', { name: /ADMIRAL/ })).closest('tr')!;
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('AdminAiPage', () => {
  it('shows the totals and recent calls', async () => {
    respond('get', '/admin/overview', 200, OVERVIEW);
    respond('get', '/admin/ai-usage', 200, {
      usage: [
        {
          logId: 1,
          callsign: 'ROOKIE',
          feature: 'answer_evaluation',
          model: 'flash_lite',
          inputTokens: 1200,
          outputTokens: 80,
          flagged: false,
          createdAt: '2026-10-13T10:00:00.000Z',
        },
      ],
      failures: [],
    });
    renderRoute(<AdminAiPage />, { path: '/admin/ai', auth: adminAuth() });

    expect(await screen.findByText('52,000 tokens')).toBeInTheDocument();
    expect(screen.getByText('11 active')).toBeInTheDocument();
    expect(screen.getByText('Answer marking')).toBeInTheDocument();
    expect(screen.getByText('Flash-Lite')).toBeInTheDocument();
    expect(screen.getByText('1,200 / 80')).toBeInTheDocument();
    expect(screen.getByText('No failed attempts.')).toBeInTheDocument();
  });

  it('shows failed attempts in red, apart from the calls that answered', async () => {
    respond('get', '/admin/overview', 200, OVERVIEW);
    respond('get', '/admin/ai-usage', 200, {
      usage: [],
      failures: [
        { logId: 7, callsign: 'ROOKIE', feature: 'hint', model: 'gemini-3.7-flash', status: 408, createdAt: '2026-10-13T10:00:00.000Z' },
        { logId: 8, callsign: 'ROOKIE', feature: 'hint', model: 'gemini-3.6-flash', status: 429, createdAt: '2026-10-13T10:00:00.000Z' },
        { logId: 9, callsign: 'ROOKIE', feature: 'hint', model: 'gemini-3.5-flash-lite', status: null, createdAt: '2026-10-13T10:00:00.000Z' },
      ],
    });
    renderRoute(<AdminAiPage />, { path: '/admin/ai', auth: adminAuth() });

    const failures = await screen.findByRole('region', { name: 'Failed attempts' });
    expect(within(failures).getByText('gemini-3.7-flash')).toBeInTheDocument();
    expect(within(failures).getByText('408 · Timed out')).toBeInTheDocument();
    expect(within(failures).getByText('429 · Rate limited')).toBeInTheDocument();
    expect(within(failures).getByText('Network error')).toBeInTheDocument();
    expect(within(failures).getByRole('table')).toHaveClass('text-swarm');
    // The 24-hour count sits beside the successful calls, in red too
    expect(screen.getByText('Failed attempts (24h)')).toHaveClass('text-swarm');
    expect(screen.getByText('The Ship’s AI hasn’t been called yet.')).toBeInTheDocument();
  });

  it('explains a refused request and retries it', async () => {
    respond('get', '/admin/overview', 403, { error: 'Command clearance required, Pilot.' });
    respond('get', '/admin/ai-usage', 200, { usage: [], failures: [] });
    const { user } = renderRoute(<AdminAiPage />, { path: '/admin/ai', auth: adminAuth() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Command clearance required, Pilot.');

    respond('get', '/admin/overview', 200, OVERVIEW);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('The Ship’s AI hasn’t been called yet.')).toBeInTheDocument();
  });
});
