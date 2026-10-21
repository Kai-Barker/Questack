import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { generate } from '../../src/config/gemini.js';
import * as progress from '../../src/models/progressModel.js';
import * as questModel from '../../src/models/questModel.js';
import { invalidateCatalog } from '../../src/services/questCatalog.js';
import { sessionCookie } from '../helpers/auth.js';
import { CATALOG_ROWS, PILOT } from '../helpers/fixtures.js';

// Intel briefings: reading material with no question. In this file, quest 1's
// first objective (101) is a briefing; the bug hunt (102) follows it.

const BRIEFING = '# Variables\n\nA variable is a labelled cargo crate.\n\n```csharp\nint fuel = 10;\n```';

beforeEach(() => {
  vi.mocked(questModel.loadCatalogRows).mockResolvedValue({
    ...CATALOG_ROWS,
    challenges: CATALOG_ROWS.challenges.map((c) =>
      c.challenge_id === 101
        ? { ...c, challenge_type: 'briefing', instructions: BRIEFING, file_name: null, code_snippet: null, answer_key: null, marking_criteria: '' }
        : c,
    ),
  } as never);
  invalidateCatalog();
});

afterAll(invalidateCatalog);

const read = (id: number | string) =>
  request(app).post(`/api/quests/objectives/${id}/read`).set('Cookie', sessionCookie());

describe('GET /api/quests/:id with a briefing', () => {
  it('sends the briefing’s Markdown as its instructions, with no code', async () => {
    const res = await request(app).get('/api/quests/1').set('Cookie', sessionCookie());

    expect(res.status).toBe(200);
    expect(res.body.challenges[0]).toEqual({
      challengeId: 101,
      challengeOrder: 1,
      challengeType: 'briefing',
      instructions: BRIEFING,
    });
  });
});

describe('POST /api/quests/objectives/:id/read', () => {
  it('is 401 without a session', async () => {
    const res = await request(app).post('/api/quests/objectives/101/read');
    expect(res.status).toBe(401);
  });

  it('clears the briefing in a new attempt, with no AI call', async () => {
    const res = await read(101);

    expect(res.status).toBe(204);
    expect(progress.createAttempt).toHaveBeenCalledWith(expect.anything(), PILOT.userId, 1);
    expect(progress.recordAnswer).toHaveBeenCalledWith(expect.anything(), {
      attemptId: 500,
      challengeId: 101,
      answerText: '',
      feedback: '',
      correct: true,
      hintsUsed: 0,
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it('is 400 for an objective that isn’t a briefing', async () => {
    vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set([101]));
    const res = await read(102);

    expect(res.status).toBe(400);
    expect(progress.recordAnswer).not.toHaveBeenCalled();
  });

  it('is 409 once the briefing is already cleared in this attempt', async () => {
    vi.mocked(progress.findOpenAttemptId).mockResolvedValue(5);
    vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set([101]));
    const res = await read(101);

    expect(res.status).toBe(409);
    expect(progress.recordAnswer).not.toHaveBeenCalled();
  });

  it('is 403 in a locked quest', async () => {
    const res = await read(201);
    expect(res.status).toBe(403);
  });

  it('is 404 for an unknown or non-numeric objective', async () => {
    expect((await read(5555)).status).toBe(404);
    expect((await read('abc')).status).toBe(404);
  });
});

describe("the Ship's AI on a briefing", () => {
  const post = (path: string, body: object) => request(app).post(`/api/ai/${path}`).set('Cookie', sessionCookie()).send(body);

  it('won’t mark an answer or give a hint (400, no AI call)', async () => {
    const evaluate = await post('evaluate', { challengeId: 101, proficiency: 'pilot', answer: 'I read it.' });
    const hint = await post('hint', { challengeId: 101, proficiency: 'pilot', tier: 1 });

    expect(evaluate.status).toBe(400);
    expect(hint.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
    expect(progress.recordAnswer).not.toHaveBeenCalled();
  });

  it('answers questions about it, with the briefing in the prompt', async () => {
    vi.mocked(generate).mockResolvedValue({
      response: { text: 'A crate with a label, Pilot.' } as never,
      modelUsed: 'flash',
      usedFallback: false,
    });
    const res = await post('chat', {
      challengeId: 101,
      proficiency: 'cadet',
      messages: [{ from: 'pilot', text: 'What is a variable?' }],
    });

    expect(res.status).toBe(200);
    const prompt = vi.mocked(generate).mock.calls[0]![1];
    expect(prompt).toContain(`Briefing the pilot is reading:\n${BRIEFING}`);
    expect(prompt).toContain('there is no question to answer');
    expect(prompt).not.toContain('Marking criteria');
  });
});
