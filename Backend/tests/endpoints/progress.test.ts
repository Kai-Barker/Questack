import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import * as progress from '../../src/models/progressModel.js';
import { sessionCookie } from '../helpers/auth.js';
import { PILOT, STANDARD_LOADOUT } from '../helpers/fixtures.js';

// The signed-in pilot's progress: nav summary, Galaxy Map, Sector Map and rank

const get = (path: string) => request(app).get(path).set('Cookie', sessionCookie());

afterEach(() => {
  vi.useRealTimers();
});

describe('signed-in progress routes', () => {
  it.each(['/api/pilot/me', '/api/dashboard', '/api/sectors/1'])('%s is 401 without a session', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  it('PATCH /api/sectors/:id/rank is 401 without a session', async () => {
    const res = await request(app).patch('/api/sectors/1/rank').send({ proficiencyLevel: 'pilot' });
    expect(res.status).toBe(401);
    expect(progress.setProficiency).not.toHaveBeenCalled();
  });

  it.each(['/api/pilot/me', '/api/dashboard', '/api/sectors/1'])('%s is never cached', async (path) => {
    const res = await get(path);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /api/pilot/me', () => {
  it('summarises a brand-new pilot', async () => {
    const res = await get('/api/pilot/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: PILOT.userId,
      callsign: PILOT.username,
      level: 1,
      totalXp: 0,
      levelXp: 0,
      levelXpRequired: 500,
      rank: 'cadet',
      questsCleared: 0,
      sectorsEnlisted: 0,
      currentStreak: 0,
      loadout: STANDARD_LOADOUT,
    });
  });

  it('leaves out gear the database has no row for', async () => {
    vi.mocked(progress.getPilotRow).mockResolvedValue({ totalXp: 0, titleName: null, frame: null, visor: null });
    const res = await get('/api/pilot/me');

    expect(res.body.loadout).toEqual({});
  });

  it('works out the level from total XP (1,300 XP = level 3, 50 into it)', async () => {
    vi.mocked(progress.getPilotRow).mockResolvedValue({ totalXp: 1300, titleName: null, ...STANDARD_LOADOUT });
    const res = await get('/api/pilot/me');

    expect(res.body).toMatchObject({ level: 3, totalXp: 1300, levelXp: 50, levelXpRequired: 1000 });
  });

  it('uses the highest rank across enlisted sectors', async () => {
    vi.mocked(progress.listLanguageProgress).mockResolvedValue([
      { languageId: 1, proficiency: 'pilot', languageXp: 300 },
      { languageId: 2, proficiency: 'commander', languageXp: 0 },
    ]);
    const res = await get('/api/pilot/me');

    expect(res.body).toMatchObject({ rank: 'commander', sectorsEnlisted: 2 });
  });

  it('shows the running booster and the chosen title', async () => {
    vi.mocked(progress.getPilotRow).mockResolvedValue({ totalXp: 0, titleName: 'First Deploy', ...STANDARD_LOADOUT });
    vi.mocked(progress.listBoosters).mockResolvedValue([
      { boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2, chargesRemaining: 2, active: true },
    ]);
    const res = await get('/api/pilot/me');

    expect(res.body.activeBooster).toEqual({ name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 2 });
    expect(res.body.loadout.insignia).toEqual({ rewardId: 0, name: 'First Deploy' });
  });

  it('counts the current streak in South African days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T10:00:00Z')); // 12:00 in South Africa
    vi.mocked(progress.countActivityByDay).mockResolvedValue(
      new Map([
        ['2026-10-08', 2],
        ['2026-10-07', 1],
        ['2026-10-05', 4],
      ]),
    );
    const res = await get('/api/pilot/me');

    expect(res.body.currentStreak).toBe(2);
  });
});

describe('GET /api/dashboard', () => {
  it('lists every sector with the pilot’s progress', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue([{ questId: 1, lastCompletedAt: new Date() }]);
    vi.mocked(progress.listLanguageProgress).mockResolvedValue([{ languageId: 1, proficiency: 'pilot', languageXp: 100 }]);
    const res = await get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.sectors).toEqual([
      // Quest 4 has no objectives, so it isn't counted
      { languageId: 1, name: 'csharp', displayName: 'C#', questsCleared: 1, questsTotal: 3, proficiencyLevel: 'pilot' },
      { languageId: 2, name: 'javascript', displayName: 'JavaScript', questsCleared: 0, questsTotal: 1 },
    ]);
  });

  it('suggests the first available main quest to a new pilot', async () => {
    const res = await get('/api/dashboard');

    expect(res.body.continueMission).toEqual({
      questId: 1,
      title: 'Signal Check',
      languageId: 1,
      sectorDisplayName: 'C#',
      concept: 'Variables',
      difficulty: 'easy',
      objectivesCompleted: 0,
      objectivesTotal: 2,
    });
  });

  it('prefers a sector the pilot has enlisted in', async () => {
    vi.mocked(progress.listLanguageProgress).mockResolvedValue([{ languageId: 2, proficiency: 'cadet', languageXp: 0 }]);
    const res = await get('/api/dashboard');

    expect(res.body.continueMission.questId).toBe(11);
  });

  it('resumes the newest unfinished attempt first', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue([{ questId: 1, lastCompletedAt: new Date() }]);
    vi.mocked(progress.listOpenAttempts).mockResolvedValue([{ attemptId: 9, questId: 2, clearedChallengeIds: [201] }]);
    const res = await get('/api/dashboard');

    expect(res.body.continueMission).toMatchObject({ questId: 2, objectivesCompleted: 1, objectivesTotal: 2 });
  });

  it('skips an open attempt on a quest that is no longer published', async () => {
    vi.mocked(progress.listOpenAttempts).mockResolvedValue([{ attemptId: 9, questId: 999, clearedChallengeIds: [] }]);
    const res = await get('/api/dashboard');

    expect(res.body.continueMission.questId).toBe(1);
  });

  it('has no mission once everything is cleared', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue(
      [1, 2, 3, 11].map((questId) => ({ questId, lastCompletedAt: new Date() })),
    );
    const res = await get('/api/dashboard');

    expect(res.body.continueMission).toBeNull();
  });
});

describe('GET /api/sectors/:id', () => {
  it('lists the sector’s quests with what the pilot has cleared', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue([{ questId: 1, lastCompletedAt: new Date('2026-10-01') }]);
    const res = await get('/api/sectors/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ languageId: 1, name: 'csharp', displayName: 'C#', shipQuestId: 1 });
    expect(res.body.quests.map((q: { questId: number }) => q.questId)).toEqual([1, 2, 3]);
    expect(res.body.quests[0]).toEqual({
      questId: 1,
      title: 'Signal Check',
      concept: 'Variables',
      difficulty: 'easy',
      isSideQuest: false,
      storyText: 'Signal Check story.',
      xpReward: 100,
      cleared: true,
      prerequisiteIds: [],
      objectives: [
        { challengeOrder: 1, challengeType: 'read_and_explain' },
        { challengeOrder: 2, challengeType: 'bug_hunt' },
      ],
    });
    expect(res.body.quests[1]).toMatchObject({ questId: 2, cleared: false, prerequisiteIds: [1] });
  });

  it('parks the ship on the most recently cleared quest', async () => {
    vi.mocked(progress.listClearedQuests).mockResolvedValue([
      { questId: 1, lastCompletedAt: new Date('2026-10-01') },
      { questId: 3, lastCompletedAt: new Date('2026-10-05') },
    ]);
    const res = await get('/api/sectors/1');

    expect(res.body.shipQuestId).toBe(3);
  });

  it('has no ship position before any clear', async () => {
    const res = await get('/api/sectors/1');
    expect(res.body.shipQuestId).toBeNull();
  });

  it('never sends answer keys, marking criteria or bug lines', async () => {
    const res = await get('/api/sectors/1');
    expect(JSON.stringify(res.body)).not.toMatch(/answerKey|markingCriteria|bugLine|Criteria for objective|=\+ assigns/);
  });

  it('is 404 for an unknown sector', async () => {
    const res = await get('/api/sectors/99');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('This sector is uncharted.');
  });

  it.each(['abc', '0', '-1', '1.5', '99999999999'])('is 404 for the id "%s"', async (id) => {
    const res = await get(`/api/sectors/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found.');
  });
});

describe('PATCH /api/sectors/:id/rank', () => {
  const patch = (path: string, body: object) => request(app).patch(path).set('Cookie', sessionCookie()).send(body);

  it.each(['cadet', 'pilot', 'commander'])('sets the rank to %s (204)', async (rank) => {
    const res = await patch('/api/sectors/1/rank', { proficiencyLevel: rank });

    expect(res.status).toBe(204);
    expect(progress.setProficiency).toHaveBeenCalledWith(PILOT.userId, 1, rank);
  });

  it('rejects an unknown rank (400)', async () => {
    const res = await patch('/api/sectors/1/rank', { proficiencyLevel: 'admiral' });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ proficiencyLevel: 'Choose a rank.' });
  });

  it('rejects extra fields (400), so nothing else can be changed', async () => {
    const res = await patch('/api/sectors/1/rank', { proficiencyLevel: 'pilot', languageXp: 9999 });

    expect(res.status).toBe(400);
    expect(Object.values(res.body.fields)).toContain('This request includes fields that can’t be changed.');
    expect(progress.setProficiency).not.toHaveBeenCalled();
  });

  it('is 404 for an unknown sector', async () => {
    const res = await patch('/api/sectors/99/rank', { proficiencyLevel: 'pilot' });

    expect(res.status).toBe(404);
    expect(progress.setProficiency).not.toHaveBeenCalled();
  });
});
