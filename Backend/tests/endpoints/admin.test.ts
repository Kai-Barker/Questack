import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as admin from '../../src/models/adminModel.js';
import * as adminQuests from '../../src/models/adminQuestModel.js';
import type { AdminQuest, QuestGraph, QuestNode } from '../../src/models/adminQuestModel.js';
import * as questModel from '../../src/models/questModel.js';
import * as users from '../../src/models/userModel.js';
import { getCatalog } from '../../src/services/questCatalog.js';
import { sessionCookie } from '../helpers/auth.js';
import { ADMIN_OVERVIEW, fakeConnection } from '../helpers/defaults.js';
import { PILOT } from '../helpers/fixtures.js';

// Admin console (/api/admin/*). The role is re-read from the database on
// every request, so these tests change what findById returns.

const ADMIN_ID = PILOT.userId + 1;

function adminExists() {
  vi.mocked(users.findById).mockImplementation(async (id) => {
    if (id === PILOT.userId) return { ...PILOT };
    if (id === ADMIN_ID) return { ...PILOT, userId: ADMIN_ID, username: 'ADMIRAL', role: 'admin' };
    return null;
  });
}

const asAdmin = () => sessionCookie(ADMIN_ID);

// A quest an admin could save: one objective of each editable type
function questBody(overrides: Record<string, unknown> = {}) {
  return {
    languageId: 1,
    title: 'The Loop Labyrinth',
    concept: 'Loops',
    difficulty: 'medium',
    status: 'draft',
    isSideQuest: false,
    storyText: 'The Swarm has corrupted the fuel systems.',
    xpReward: 150,
    prerequisiteIds: [],
    objectives: [
      {
        type: 'read_and_explain',
        instructions: 'Explain the fuel loop.',
        fileName: 'Program.cs',
        codeSnippet: 'int fuel = 10;\nwhile (fuel >= 3)\n{\n    fuel -= 3;\n}',
        answerKey: 'The loop runs while fuel is at least 3.',
        markingCriteria: 'Mentions the loop condition.',
      },
      {
        type: 'bug_hunt',
        instructions: 'Find the off-by-one error.',
        fileName: 'Refuel.cs',
        codeSnippet: 'for (int i = 0; i <= 3; i++)\n{\n    Refuel();\n}',
        answerKey: 'The loop runs four times instead of three.',
        markingCriteria: 'Spots the <= in the condition.',
        bugLine: 1,
      },
      {
        type: 'decode_transmission',
        instructions: 'Paste some code that uses a loop.',
        markingCriteria: 'Explains what the loop does.',
      },
    ] as Record<string, unknown>[],
    ...overrides,
  };
}

function savedQuest(questId = 1000, overrides: Partial<AdminQuest> = {}): AdminQuest {
  return {
    questId,
    languageId: 1,
    title: 'The Loop Labyrinth',
    concept: 'Loops',
    difficulty: 'medium',
    status: 'draft',
    isSideQuest: false,
    storyText: '',
    xpReward: 150,
    displayOrder: 6,
    prerequisiteIds: [],
    objectives: [],
    ...overrides,
  };
}

// The locked galaxy a save reads. Each quest's prerequisiteIds are filled in from the edges.
function galaxy(graph: QuestGraph) {
  vi.mocked(adminQuests.lockQuestGraph).mockResolvedValue({
    edges: graph.edges,
    quests: graph.quests.map((q) => ({
      ...q,
      prerequisiteIds: graph.edges.filter((e) => e.questId === q.questId).map((e) => e.prerequisiteId),
    })),
  });
}

const node = (
  questId: number,
  title: string,
  status: 'draft' | 'published' = 'published',
  languageId = 1,
  challengeIds: number[] = [],
): QuestNode => ({
  questId,
  languageId,
  title,
  status,
  displayOrder: questId,
  prerequisiteIds: [],
  challengeIds,
});

// Every admin route, with a body where it needs one
const ROUTES = [
  ['get', '/api/admin/session'],
  ['get', '/api/admin/overview'],
  ['get', '/api/admin/sectors'],
  ['get', '/api/admin/quests'],
  ['get', '/api/admin/quests/1'],
  ['post', '/api/admin/quests'],
  ['put', '/api/admin/quests/1'],
  ['delete', '/api/admin/quests/1'],
  ['get', '/api/admin/users'],
  ['patch', '/api/admin/users/7'],
  ['get', '/api/admin/ai-usage'],
] as const;

const MODEL_CALLS = [
  admin.getOverview,
  admin.listUsers,
  admin.findAdminUser,
  admin.setUserActive,
  admin.recentAiUsage,
  admin.recentAiFailures,
  adminQuests.listSectors,
  adminQuests.listQuests,
  adminQuests.findQuest,
  adminQuests.lockQuestGraph,
  adminQuests.deleteDraftQuest,
];

function send(method: (typeof ROUTES)[number][0], path: string, cookie?: string) {
  const req = request(app)[method](path);
  if (cookie) req.set('Cookie', cookie);
  return method === 'post' || method === 'put' ? req.send(questBody()) : method === 'patch' ? req.send({ isActive: false }) : req;
}

describe.each(ROUTES)('%s %s', (method, path) => {
  it('is 401 without a session', async () => {
    const res = await send(method, path);

    expect(res.status).toBe(401);
    for (const call of MODEL_CALLS) expect(call).not.toHaveBeenCalled();
  });

  it('is 403 for a pilot without the admin role, before any query', async () => {
    const res = await send(method, path, sessionCookie());

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Command clearance required, Pilot.');
    for (const call of MODEL_CALLS) expect(call).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('is 403 as soon as an admin’s role is taken away', async () => {
    const cookie = asAdmin();
    vi.mocked(users.findById).mockResolvedValue({ ...PILOT, userId: ADMIN_ID, role: 'user' });

    const res = await send(method, path, cookie);

    expect(res.status).toBe(403);
  });

  it('is never cached', async () => {
    adminExists();
    vi.mocked(adminQuests.findQuest).mockResolvedValue(savedQuest(1));
    vi.mocked(adminQuests.lockQuestGraph).mockResolvedValue({ quests: [node(1, 'Loops', 'draft')], edges: [] });
    vi.mocked(admin.findAdminUser).mockResolvedValue({
      userId: 7,
      callsign: 'ROOKIE',
      email: 'r@x.io',
      role: 'user',
      isActive: true,
      level: 1,
      totalXp: 0,
      lastActive: null,
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    const res = await send(method, path, asAdmin());

    expect(res.status).toBeLessThan(300);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /api/admin/session', () => {
  it('confirms the admin', async () => {
    adminExists();

    const res = await request(app).get('/api/admin/session').set('Cookie', asAdmin());

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ userId: ADMIN_ID, username: 'ADMIRAL', email: PILOT.email, role: 'admin' });
  });
});

describe('GET /api/admin/overview', () => {
  it('returns the platform totals', async () => {
    adminExists();

    const res = await request(app).get('/api/admin/overview').set('Cookie', asAdmin());

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ADMIN_OVERVIEW);
  });
});

describe('quest editor reads', () => {
  it('lists every sector and quest, drafts included', async () => {
    adminExists();
    const summary = {
      questId: 6,
      languageId: 1,
      title: 'Recursion Reef',
      concept: 'Recursion',
      difficulty: 'hard' as const,
      status: 'draft' as const,
      displayOrder: 13,
      objectiveCount: 0,
    };
    vi.mocked(adminQuests.listQuests).mockResolvedValue([summary]);

    const [sectors, quests] = await Promise.all([
      request(app).get('/api/admin/sectors').set('Cookie', asAdmin()),
      request(app).get('/api/admin/quests').set('Cookie', asAdmin()),
    ]);

    expect(sectors.body.sectors).toHaveLength(2);
    expect(quests.body.quests).toEqual([summary]);
  });

  it('returns one quest with its answer keys', async () => {
    adminExists();
    const quest = savedQuest(5, {
      objectives: [
        {
          challengeId: 501,
          type: 'bug_hunt',
          instructions: 'Find it.',
          fileName: 'A.cs',
          codeSnippet: 'x',
          answerKey: 'The key.',
          markingCriteria: 'Criteria.',
          bugLine: 1,
          altBugLines: [],
        },
      ],
    });
    vi.mocked(adminQuests.findQuest).mockResolvedValue(quest);

    const res = await request(app).get('/api/admin/quests/5').set('Cookie', asAdmin());

    expect(res.status).toBe(200);
    expect(res.body.quest).toEqual(quest);
    expect(adminQuests.findQuest).toHaveBeenCalledWith(5);
  });

  it.each(['999', 'abc', '-1', '1.5'])('is 404 for quest %s', async (id) => {
    adminExists();

    const res = await request(app).get(`/api/admin/quests/${id}`).set('Cookie', asAdmin());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/quests', () => {
  it('creates a draft in one transaction, by the admin, and returns it without reading it back', async () => {
    adminExists();
    const connection = fakeConnection();
    vi.mocked(pool.getConnection).mockResolvedValue(connection as never);
    galaxy({ quests: [node(1, 'Cargo Manifest'), node(5, 'Loops'), node(11, 'JS Basics', 'published', 2)], edges: [] });

    const res = await request(app).post('/api/admin/quests').set('Cookie', asAdmin()).send(questBody());

    expect(res.status).toBe(201);
    expect(res.body.quest).toMatchObject({ questId: 1000, title: 'The Loop Labyrinth', displayOrder: 6, prerequisiteIds: [] });
    expect(res.body.quest.objectives.map((o: { challengeId: number }) => o.challengeId)).toEqual([2000, 2001, 2002]);
    expect(adminQuests.findQuest).not.toHaveBeenCalled();
    // Added after the last C# quest
    expect(adminQuests.insertQuest).toHaveBeenCalledWith(
      connection,
      expect.objectContaining({ title: 'The Loop Labyrinth', status: 'draft', languageId: 1 }),
      ADMIN_ID,
      6,
    );
    // A new quest with no prerequisites has none to write
    expect(adminQuests.replacePrerequisites).not.toHaveBeenCalled();
    const objectives = vi.mocked(adminQuests.syncObjectives).mock.calls[0]![2];
    expect(objectives.map((o) => o.type)).toEqual(['read_and_explain', 'bug_hunt', 'decode_transmission']);
    // The decode objective carries no code or key, whatever was sent
    expect(objectives[2]).toMatchObject({ fileName: null, codeSnippet: null, answerKey: null, bugLine: null });
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('rejects fields an admin can’t set', async () => {
    adminExists();

    const res = await request(app)
      .post('/api/admin/quests')
      .set('Cookie', asAdmin())
      .send({ ...questBody(), createdBy: 1, rewardId: 3 });

    expect(res.status).toBe(400);
    expect(adminQuests.insertQuest).not.toHaveBeenCalled();
  });

  it('marks the exact objective field that’s missing', async () => {
    adminExists();
    const body = questBody();
    body.objectives[0] = { ...body.objectives[0]!, instructions: '   ' };

    const res = await request(app).post('/api/admin/quests').set('Cookie', asAdmin()).send(body);

    expect(res.status).toBe(400);
    expect(res.body.fields['objectives.0.instructions']).toBe('Add instructions for the pilot.');
  });

  it.each([
    ['a code objective without an answer key', { answerKey: '' }, 'objectives.0.answerKey'],
    ['a code objective without code', { codeSnippet: '\n\n' }, 'objectives.0.codeSnippet'],
    ['a code objective without a file name', { fileName: null }, 'objectives.0.fileName'],
    ['an answer key that names a line', { answerKey: 'The bug is on line 4.' }, 'objectives.0.answerKey'],
    ['marking criteria that name a line', { markingCriteria: 'Points at lines 2-3.' }, 'objectives.0.markingCriteria'],
  ])('rejects %s', async (_name, change, field) => {
    adminExists();
    const body = questBody();
    body.objectives[0] = { ...body.objectives[0]!, ...change };

    const res = await request(app).post('/api/admin/quests').set('Cookie', asAdmin()).send(body);

    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty([field]);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('rejects a bug line past the end of the code', async () => {
    adminExists();
    const body = questBody();
    body.objectives[1] = { ...body.objectives[1]!, bugLine: 9 };

    const res = await request(app).post('/api/admin/quests').set('Cookie', asAdmin()).send(body);

    expect(res.status).toBe(400);
    expect(res.body.fields['objectives.1.bugLine']).toBe('The code only has 4 lines.');
  });

  it('won’t publish a quest with no objectives', async () => {
    adminExists();

    const res = await request(app)
      .post('/api/admin/quests')
      .set('Cookie', asAdmin())
      .send(questBody({ status: 'published', objectives: [] }));

    expect(res.status).toBe(400);
    expect(res.body.fields.objectives).toBe('Add at least one objective before publishing.');
  });

  it('won’t publish a quest that needs a draft', async () => {
    adminExists();
    galaxy({ quests: [node(4, 'Conditional Canyon', 'draft')], edges: [] });

    const res = await request(app)
      .post('/api/admin/quests')
      .set('Cookie', asAdmin())
      .send(questBody({ status: 'published', prerequisiteIds: [4] }));

    expect(res.status).toBe(400);
    expect(res.body.fields.prerequisiteIds).toContain('Conditional Canyon');
    expect(adminQuests.insertQuest).not.toHaveBeenCalled();
  });

  it('keeps prerequisites in the same sector', async () => {
    adminExists();
    galaxy({ quests: [node(11, 'JS Basics', 'published', 2)], edges: [] });

    const res = await request(app)
      .post('/api/admin/quests')
      .set('Cookie', asAdmin())
      .send(questBody({ prerequisiteIds: [11] }));

    expect(res.status).toBe(400);
    expect(res.body.fields.prerequisiteIds).toBe('Prerequisites must be in the same sector.');
  });

  it('rejects an unknown sector', async () => {
    adminExists();
    vi.mocked(adminQuests.insertQuest).mockRejectedValue(
      Object.assign(new Error('Cannot add or update a child row: a foreign key constraint fails (fk_quests_language)'), {
        errno: 1452,
      }),
    );
    const connection = fakeConnection();
    vi.mocked(pool.getConnection).mockResolvedValue(connection as never);

    const res = await request(app).post('/api/admin/quests').set('Cookie', asAdmin()).send(questBody({ languageId: 99 }));

    expect(res.status).toBe(400);
    expect(res.body.fields.languageId).toBe('Pick a sector.');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });
});

describe('PUT /api/admin/quests/:id', () => {
  it('saves in place, keeping existing objectives by id', async () => {
    adminExists();
    galaxy({ quests: [node(5, 'The Loop Labyrinth', 'draft', 1, [501, 502])], edges: [] });
    const body = questBody();
    body.objectives[0] = { ...body.objectives[0]!, challengeId: 501 };

    const res = await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(body);

    expect(res.status).toBe(200);
    // Same sector: it keeps its place
    expect(adminQuests.updateQuest).toHaveBeenCalledWith(expect.anything(), 5, expect.anything(), 5);
    const [, , objectives, existingIds] = vi.mocked(adminQuests.syncObjectives).mock.calls[0]!;
    expect(objectives[0]!.challengeId).toBe(501);
    expect(existingIds).toEqual([501, 502]);
    expect(res.body.quest.objectives.map((o: { challengeId: number }) => o.challengeId)).toEqual([501, 2001, 2002]);
  });

  it('only rewrites prerequisites when they changed', async () => {
    adminExists();
    galaxy({ quests: [node(4, 'Conditional Canyon'), node(5, 'Loops', 'draft')], edges: [{ questId: 5, prerequisiteId: 4 }] });

    await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(questBody({ prerequisiteIds: [4] }));
    expect(adminQuests.replacePrerequisites).not.toHaveBeenCalled();

    await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(questBody({ prerequisiteIds: [] }));
    expect(adminQuests.replacePrerequisites).toHaveBeenCalledWith(expect.anything(), 5, []);
  });

  it('moves a quest to the end of its new sector', async () => {
    adminExists();
    galaxy({
      quests: [node(5, 'Loops', 'draft'), node(11, 'JS Basics', 'published', 2), node(14, 'Orbit Loop', 'published', 2)],
      edges: [],
    });

    const res = await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(questBody({ languageId: 2 }));

    expect(res.status).toBe(200);
    expect(adminQuests.updateQuest).toHaveBeenCalledWith(expect.anything(), 5, expect.objectContaining({ languageId: 2 }), 15);
  });

  it('won’t touch another quest’s objectives', async () => {
    adminExists();
    galaxy({ quests: [node(5, 'The Loop Labyrinth', 'draft', 1, [501])], edges: [] });
    const body = questBody();
    body.objectives[0] = { ...body.objectives[0]!, challengeId: 101 };

    const res = await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(body);

    expect(res.status).toBe(400);
    expect(adminQuests.syncObjectives).not.toHaveBeenCalled();
  });

  it('blocks circular prerequisites', async () => {
    adminExists();
    // 6 needs 5, so 5 can't need 6
    galaxy({ quests: [node(5, 'Loops', 'draft'), node(6, 'Switch Station', 'draft')], edges: [{ questId: 6, prerequisiteId: 5 }] });

    const res = await request(app)
      .put('/api/admin/quests/5')
      .set('Cookie', asAdmin())
      .send(questBody({ title: 'Loops', prerequisiteIds: [6] }));

    expect(res.status).toBe(400);
    expect(res.body.fields.prerequisiteIds).toBe('Circular prerequisites: Loops → Switch Station → Loops.');
    expect(adminQuests.updateQuest).not.toHaveBeenCalled();
  });

  it('won’t move a quest to draft while published quests need it', async () => {
    adminExists();
    galaxy({ quests: [node(5, 'Loops'), node(6, 'Switch Station')], edges: [{ questId: 6, prerequisiteId: 5 }] });

    const res = await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(questBody({ status: 'draft' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Switch Station');
  });

  it('is 404 for a quest that no longer exists', async () => {
    adminExists();

    const res = await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(questBody());

    expect(res.status).toBe(404);
  });

  it('shows pilots the change straight away', async () => {
    adminExists();
    await getCatalog();
    vi.mocked(questModel.loadCatalogRows).mockClear();
    galaxy({ quests: [node(5, 'Loops', 'draft')], edges: [] });

    await request(app).put('/api/admin/quests/5').set('Cookie', asAdmin()).send(questBody());
    await getCatalog();

    expect(questModel.loadCatalogRows).toHaveBeenCalledTimes(1);
  });
});

describe('DELETE /api/admin/quests/:id', () => {
  it('deletes a draft', async () => {
    adminExists();

    const res = await request(app).delete('/api/admin/quests/6').set('Cookie', asAdmin());

    expect(res.status).toBe(204);
    expect(adminQuests.deleteDraftQuest).toHaveBeenCalledWith(6);
  });

  it.each([
    ['published', 'Published quests can’t be deleted'],
    ['played', 'Pilots have already flown this quest'],
  ] as const)('keeps a %s quest', async (result, message) => {
    adminExists();
    vi.mocked(adminQuests.deleteDraftQuest).mockResolvedValue(result);

    const res = await request(app).delete('/api/admin/quests/6').set('Cookie', asAdmin());

    expect(res.status).toBe(409);
    expect(res.body.error).toContain(message);
  });
});

describe('admin users', () => {
  const rookie = {
    userId: 7,
    callsign: 'ROOKIE',
    email: 'rookie@fleet.io',
    role: 'user' as const,
    isActive: true,
    level: 2,
    totalXp: 300,
    lastActive: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  };

  it('lists pilots', async () => {
    adminExists();
    vi.mocked(admin.listUsers).mockResolvedValue([rookie]);

    const res = await request(app).get('/api/admin/users').set('Cookie', asAdmin());

    expect(res.body.users).toEqual([rookie]);
  });

  it('deactivates a pilot', async () => {
    adminExists();
    vi.mocked(admin.findAdminUser).mockResolvedValue(rookie);

    const res = await request(app).patch('/api/admin/users/7').set('Cookie', asAdmin()).send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);
    expect(admin.setUserActive).toHaveBeenCalledWith(7, false);
  });

  it('won’t let an admin deactivate themselves', async () => {
    adminExists();

    const res = await request(app).patch(`/api/admin/users/${ADMIN_ID}`).set('Cookie', asAdmin()).send({ isActive: false });

    expect(res.status).toBe(400);
    expect(admin.setUserActive).not.toHaveBeenCalled();
  });

  it('won’t deactivate another admin', async () => {
    adminExists();
    vi.mocked(admin.findAdminUser).mockResolvedValue({ ...rookie, role: 'admin' });

    const res = await request(app).patch('/api/admin/users/7').set('Cookie', asAdmin()).send({ isActive: false });

    expect(res.status).toBe(409);
    expect(admin.setUserActive).not.toHaveBeenCalled();
  });

  it('only accepts isActive', async () => {
    adminExists();
    vi.mocked(admin.findAdminUser).mockResolvedValue(rookie);

    const res = await request(app).patch('/api/admin/users/7').set('Cookie', asAdmin()).send({ isActive: true, role: 'admin' });

    expect(res.status).toBe(400);
    expect(admin.setUserActive).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/ai-usage', () => {
  it('returns the recent calls and, separately, the failed attempts', async () => {
    adminExists();
    const row = {
      logId: 1,
      callsign: 'ROOKIE',
      feature: 'hint',
      model: 'flash' as const,
      inputTokens: 100,
      outputTokens: 20,
      flagged: false,
      createdAt: '2026-10-13T10:00:00.000Z',
    };
    const failure = {
      logId: 2,
      callsign: 'ROOKIE',
      feature: 'answer_evaluation',
      model: 'gemini-3.6-flash',
      status: 429,
      createdAt: '2026-10-13T10:01:00.000Z',
    };
    vi.mocked(admin.recentAiUsage).mockResolvedValue([row]);
    vi.mocked(admin.recentAiFailures).mockResolvedValue([failure]);

    const res = await request(app).get('/api/admin/ai-usage').set('Cookie', asAdmin());

    expect(res.body).toEqual({ usage: [row], failures: [failure] });
  });
});
