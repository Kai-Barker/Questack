import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as progress from '../../src/models/progressModel.js';
import { sessionCookie } from '../helpers/auth.js';
import { fakeConnection, type FakeConnection } from '../helpers/defaults.js';
import { PILOT } from '../helpers/fixtures.js';

// Playing a quest: opening it (GET /api/quests/:id) and clearing it
// (POST /api/quests/:id/complete)

const LOCKED = 'This quest is still locked. Clear the quests before it first, Pilot.';

const cleared = (...questIds: number[]) => questIds.map((questId) => ({ questId, lastCompletedAt: new Date('2026-10-01') }));

describe('GET /api/quests/:id', () => {
  const get = (id: number | string) => request(app).get(`/api/quests/${id}`).set('Cookie', sessionCookie());

  it('is 401 without a session', async () => {
    const res = await request(app).get('/api/quests/1');
    expect(res.status).toBe(401);
  });

  it('returns an unlocked quest with its objectives and code', async () => {
    const res = await get(1);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      questId: 1,
      languageId: 1,
      sectorDisplayName: 'C#',
      questNumber: 1,
      title: 'Signal Check',
      concept: 'Variables',
      difficulty: 'easy',
      isSideQuest: false,
      xpReward: 100,
      progress: { clearedChallengeIds: [] },
    });
    expect(res.body.challenges).toEqual([
      {
        challengeId: 101,
        challengeOrder: 1,
        challengeType: 'read_and_explain',
        instructions: 'Instructions for objective 101.',
        code: { fileName: 'Program.cs', snippet: 'int fuel = 10;' },
      },
      expect.objectContaining({ challengeId: 102, challengeType: 'bug_hunt', code: expect.objectContaining({ fileName: 'Total.cs' }) }),
    ]);
  });

  it('never sends the answer key, marking criteria or bug line', async () => {
    const res = await get(1);
    const body = JSON.stringify(res.body);

    expect(body).not.toMatch(/answerKey|markingCriteria|bugLine/);
    expect(body).not.toContain('It stores 10 in fuel.');
    expect(body).not.toContain('Criteria for objective');
  });

  it('is 403 while a prerequisite is still uncleared', async () => {
    const res = await get(2);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe(LOCKED);
  });

  it('opens once the prerequisite is cleared; a decode objective has no code of its own', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue(cleared(1));
    const res = await get(2);

    expect(res.status).toBe(200);
    expect(res.body.questNumber).toBe(2);
    expect(res.body.challenges[1]).toEqual({
      challengeId: 202,
      challengeOrder: 2,
      challengeType: 'decode_transmission',
      instructions: 'Instructions for objective 202.',
    });
  });

  it('resumes the pilot’s unfinished attempt', async () => {
    vi.mocked(progress.listOpenAttempts).mockResolvedValue([{ attemptId: 3, questId: 1, clearedChallengeIds: [101] }]);
    const res = await get(1);

    expect(res.body.progress).toEqual({ clearedChallengeIds: [101] });
    expect(progress.listOpenAttempts).toHaveBeenCalledWith(PILOT.userId, 1);
  });

  it('includes the pilot’s rank in the quest’s sector', async () => {
    vi.mocked(progress.listLanguageProgress).mockResolvedValue([{ languageId: 1, proficiency: 'commander', languageXp: 0 }]);
    const res = await get(1);

    expect(res.body.pilotRank).toBe('commander');
  });

  it.each([
    ['an unknown quest', 999],
    ['a quest with no objectives', 4],
  ])('is 404 for %s', async (_name, id) => {
    const res = await get(id);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("This quest's transmission hasn't been written yet.");
  });

  it('is 404 for a non-numeric id', async () => {
    const res = await get('abc');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/quests/:id/complete', () => {
  let connection: FakeConnection;

  const complete = (id: number) => request(app).post(`/api/quests/${id}/complete`).set('Cookie', sessionCookie());

  // An open attempt (77) with both of quest 1's objectives cleared
  function readyToComplete(totalXpBefore = 400) {
    connection = fakeConnection();
    vi.mocked(pool.getConnection).mockResolvedValue(connection as never);
    vi.mocked(progress.lockPilot).mockResolvedValue(totalXpBefore);
    vi.mocked(progress.findOpenAttemptId).mockResolvedValue(77);
    vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set([101, 102]));
    // Read after the commit: quest 1 now counts as cleared
    vi.mocked(progress.listClearedQuests).mockResolvedValue(cleared(1));
  }

  it('is 401 without a session', async () => {
    const res = await request(app).post('/api/quests/1/complete');
    expect(res.status).toBe(401);
  });

  it('awards full XP on a first clear, levels up and saves it all in one transaction', async () => {
    readyToComplete(400);
    vi.mocked(progress.grantBooster).mockResolvedValue('Overdrive Core');
    const res = await complete(1);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      baseXp: 100,
      xpEarned: 100,
      replay: false,
      boosterEarned: { name: 'Overdrive Core' },
      before: { level: 1, levelXp: 400, levelXpRequired: 500 },
      after: { level: 2, levelXp: 0, levelXpRequired: 750 },
      sector: { displayName: 'C#', percentBefore: 0, percentAfter: 33 },
      unlocked: [
        { questId: 2, title: 'Loop Patrol', concept: 'Loops' },
        { questId: 3, title: 'Side Scan', concept: 'Strings' },
      ],
      nextQuestId: 2, // the main quest is preferred over the side quest
    });
    expect(progress.completeAttempt).toHaveBeenCalledWith(connection, 77, 100);
    expect(progress.addXp).toHaveBeenCalledWith(connection, PILOT.userId, 1, 100, 500, 2);
    expect(progress.grantBooster).toHaveBeenCalledWith(connection, PILOT.userId, 50);
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('multiplies first-clear XP by a running booster and uses one charge', async () => {
    readyToComplete();
    vi.mocked(progress.findActiveBooster).mockResolvedValue({ boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2 });
    const res = await complete(1);

    expect(res.body.xpEarned).toBe(200);
    expect(res.body.booster).toEqual({ name: 'Overdrive Core', xpMultiplier: 2 });
    expect(progress.useBoosterCharge).toHaveBeenCalledWith(connection, 5);
  });

  it('gives a replay 25% XP, never boosted, and grants no new booster', async () => {
    readyToComplete();
    vi.mocked(progress.hasCompletedQuest).mockResolvedValue(true);
    const res = await complete(1);

    expect(res.body).toMatchObject({ replay: true, xpEarned: 25, unlocked: [] });
    expect(res.body.sector).toEqual({ displayName: 'C#', percentBefore: 33, percentAfter: 33 });
    expect(progress.findActiveBooster).not.toHaveBeenCalled();
    expect(progress.grantBooster).not.toHaveBeenCalled();
    expect(progress.hasCompletedQuest).toHaveBeenCalledWith(PILOT.userId, 1, connection);
  });

  it('is 409 with no open attempt, and rolls back', async () => {
    readyToComplete();
    vi.mocked(progress.findOpenAttemptId).mockResolvedValue(null);
    const res = await complete(1);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Clear every objective before completing the quest, Pilot.');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
    expect(progress.addXp).not.toHaveBeenCalled();
  });

  it('is 409 while an objective is still uncleared', async () => {
    readyToComplete();
    vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set([101]));
    const res = await complete(1);

    expect(res.status).toBe(409);
    expect(progress.completeAttempt).not.toHaveBeenCalled();
  });

  it('is 404 for an unknown quest, before touching the database', async () => {
    const res = await complete(999);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Unknown quest.');
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('rolls back and releases the connection when a write fails (500)', async () => {
    readyToComplete();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(progress.addXp).mockRejectedValue(new Error('Lost connection'));
    const res = await complete(1);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something went wrong aboard the ship.');
    expect(JSON.stringify(res.body)).not.toContain('Lost connection');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });
});
