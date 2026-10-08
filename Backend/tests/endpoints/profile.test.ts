import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import * as profiles from '../../src/models/profileModel.js';
import * as progress from '../../src/models/progressModel.js';
import { sessionCookie } from '../helpers/auth.js';
import { PASSWORD, PILOT, PROFILE_RECORD } from '../helpers/fixtures.js';

// The signed-in pilot's own profile (/api/profile/me) and its edits

const CHECK_FIELDS = 'Check the highlighted fields.';
const UNCHANGEABLE = 'This request includes fields that can’t be changed.';

const get = () => request(app).get('/api/profile/me').set('Cookie', sessionCookie());
const patch = (body: object) => request(app).patch('/api/profile/me').set('Cookie', sessionCookie()).send(body);
const patchCallsign = (body: object) => request(app).patch('/api/profile/me/callsign').set('Cookie', sessionCookie()).send(body);
const activate = (id: string | number) => request(app).post(`/api/profile/me/boosters/${id}/activate`).set('Cookie', sessionCookie());

const cleared = (...questIds: number[]) => questIds.map((questId) => ({ questId, lastCompletedAt: new Date('2026-10-01') }));

// A veteran pilot: quest 1 cleared, 12 bugs squashed, Commander in C#
function veteran() {
  vi.mocked(progress.listClearedQuests).mockResolvedValue(cleared(1));
  vi.mocked(progress.countCorrectAnswersByType).mockResolvedValue(
    new Map([
      ['bug_hunt', 12],
      ['read_and_explain', 3],
    ]),
  );
  vi.mocked(progress.listLanguageProgress).mockResolvedValue([{ languageId: 1, proficiency: 'commander', languageXp: 150 }]);
}

describe('/api/profile routes', () => {
  it.each([
    ['GET', '/api/profile/me'],
    ['PATCH', '/api/profile/me'],
    ['PATCH', '/api/profile/me/callsign'],
    ['POST', '/api/profile/me/boosters/1/activate'],
  ])('%s %s is 401 without a session', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path).send({});
    expect(res.status).toBe(401);
  });

  it('is never cached', async () => {
    const res = await get();
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /api/profile/me', () => {
  it('builds a new pilot’s profile', async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      callsign: 'Vega-7',
      enlistedAt: '2026-01-15T08:00:00.000Z',
      bio: 'Reading code across the stars.',
      title: null,
      level: 1,
      totalXp: 0,
      rank: 'cadet',
      homeSector: null,
      stats: { questsCleared: 0, bugsSquashed: 0, transmissionsDecoded: 0 },
      sectors: [
        { languageId: 1, displayName: 'C#', questsCleared: 0, questsTotal: 3, proficiencyLevel: 'cadet' },
        { languageId: 2, displayName: 'JavaScript', questsCleared: 0, questsTotal: 1, proficiencyLevel: 'cadet' },
      ],
      goal: null,
      favouriteObjective: null,
      featuredIds: [],
      loadout: { helmet: 'Navigator Visor', armour: null, insignia: null, booster: null },
      boosters: [],
    });
    expect(res.body.profile.xpHistory).toHaveLength(8);
    expect(res.body.profile.insignia.every((i: { earned: boolean }) => !i.earned)).toBe(true);
  });

  it('never includes the email or password hash', async () => {
    const res = await get();
    const body = JSON.stringify(res.body);

    expect(body).not.toContain(PILOT.email);
    expect(body).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('works out earned insignia from the pilot’s real stats', async () => {
    veteran();
    const res = await get();
    const earned = Object.fromEntries(res.body.profile.insignia.map((i: { code: string; earned: boolean }) => [i.code, i.earned]));

    expect(earned).toEqual({
      'first-deploy': true, // quests_cleared>=1
      'bug-hunter': true, // bugs_squashed>=10
      'broken-rule': false, // a malformed rule never counts as earned
      commander: true, // commander_ranks>=1
    });
    expect(res.body.profile).toMatchObject({
      rank: 'commander',
      homeSector: 'C#',
      favouriteObjective: 'Bug hunt',
      stats: { questsCleared: 1, bugsSquashed: 12, transmissionsDecoded: 0 },
    });
  });

  it('shows the chosen title and featured insignia only while they are earned', async () => {
    veteran();
    vi.mocked(profiles.findProfile).mockResolvedValue({ ...PROFILE_RECORD, titleRewardId: 2 });
    vi.mocked(profiles.listFeaturedIds).mockResolvedValue([3, 1]);
    const res = await get();

    expect(res.body.profile.title).toEqual({ rewardId: 2, code: 'bug-hunter', name: 'Bug Hunter' });
    expect(res.body.profile.loadout.insignia).toBe('Bug Hunter');
    expect(res.body.profile.featuredIds).toEqual([1]);
  });

  it('hides a title the pilot no longer qualifies for', async () => {
    vi.mocked(profiles.findProfile).mockResolvedValue({ ...PROFILE_RECORD, titleRewardId: 2 });
    const res = await get();

    expect(res.body.profile.title).toBeNull();
  });

  it('shows the goal sector', async () => {
    vi.mocked(profiles.findProfile).mockResolvedValue({ ...PROFILE_RECORD, goalLanguageId: 2 });
    const res = await get();

    expect(res.body.profile.goal).toMatchObject({ languageId: 2, displayName: 'JavaScript' });
  });

  it('is 401 if the account has gone since the session started', async () => {
    vi.mocked(profiles.findProfile).mockResolvedValue(null);
    const res = await get();

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/profile/me', () => {
  it('saves a new bio and returns the updated profile', async () => {
    vi.mocked(profiles.findProfile)
      .mockResolvedValueOnce({ ...PROFILE_RECORD })
      .mockResolvedValueOnce({ ...PROFILE_RECORD, bio: 'Flying solo.' });
    const res = await patch({ bio: '  Flying solo.  ' });

    expect(res.status).toBe(200);
    expect(res.body.profile.bio).toBe('Flying solo.');
    expect(profiles.saveProfile).toHaveBeenCalledWith(PILOT.userId, {
      bio: 'Flying solo.',
      titleRewardId: undefined,
      goalLanguageId: undefined,
      featuredIds: undefined,
    });
  });

  it('clears the bio when it is empty', async () => {
    await patch({ bio: '' });
    expect(vi.mocked(profiles.saveProfile).mock.calls[0]![1].bio).toBeNull();
  });

  it('saves an earned title, featured insignia and a goal together', async () => {
    veteran();
    const res = await patch({ titleId: 1, featuredIds: [8, 1], goalLanguageId: 2 });

    expect(res.status).toBe(200);
    expect(profiles.saveProfile).toHaveBeenCalledWith(PILOT.userId, {
      bio: undefined,
      titleRewardId: 1,
      goalLanguageId: 2,
      featuredIds: [8, 1],
    });
  });

  it('clears the title with null', async () => {
    await patch({ titleId: null });
    expect(vi.mocked(profiles.saveProfile).mock.calls[0]![1].titleRewardId).toBeNull();
  });

  it.each([
    ['a title the pilot hasn’t earned', { titleId: 2 }, 'titleId', 'Choose an insignia you have earned.'],
    ['featured insignia not earned', { featuredIds: [1] }, 'featuredIds', 'You can only feature insignia you have earned.'],
    ['an unknown goal sector', { goalLanguageId: 99 }, 'goalLanguageId', 'Choose a sector from the list.'],
    ['a bio over 160 characters', { bio: 'x'.repeat(161) }, 'bio', 'Keep your bio to 160 characters or fewer.'],
    ['a bio with a zero-width space', { bio: 'hi​there' }, 'bio', 'Your bio contains characters that can’t be shown.'],
    ['a bio with a text-direction override', { bio: 'abc‮def' }, 'bio', 'Your bio contains characters that can’t be shown.'],
    ['a bio with a line break', { bio: 'one\ntwo' }, 'bio', 'Your bio contains characters that can’t be shown.'],
    ['duplicate featured insignia', { featuredIds: [1, 1] }, 'featuredIds', 'Each insignia can only be featured once.'],
    ['more than 3 featured insignia', { featuredIds: [1, 2, 3, 8] }, 'featuredIds', 'Feature up to 3 insignia.'],
    ['a bio that isn’t text', { bio: 42 }, 'bio', 'Enter a valid value.'],
    ['an empty request', {}, 'form', 'Nothing to update.'],
    ['a field that can’t be edited', { totalXp: 999999 }, 'form', UNCHANGEABLE],
    ['an attempt to change role', { bio: 'hi', role: 'admin' }, 'form', UNCHANGEABLE],
  ])('rejects %s (400) and saves nothing', async (_name, body, field, message) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(CHECK_FIELDS);
    expect(res.body.fields[field]).toBe(message);
    expect(profiles.saveProfile).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/profile/me/callsign', () => {
  it('changes the callsign when the access code is right', async () => {
    const res = await patchCallsign({ callsign: 'Orion_2', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(profiles.updateUsername).toHaveBeenCalledWith(PILOT.userId, 'Orion_2');
    expect(res.body.profile).toBeDefined();
  });

  it('rejects a wrong access code (400) without changing anything', async () => {
    const res = await patchCallsign({ callsign: 'Orion_2', password: 'wrongpass9' });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ password: 'That access code is incorrect.' });
    expect(profiles.updateUsername).not.toHaveBeenCalled();
  });

  it('rejects a callsign another pilot has (409)', async () => {
    vi.mocked(profiles.usernameTakenByOther).mockResolvedValue(true);
    const res = await patchCallsign({ callsign: 'Orion_2', password: PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'That callsign is already taken.', fields: { callsign: 'That callsign is already taken.' } });
  });

  it('turns a duplicate-key race into the same 409', async () => {
    vi.mocked(profiles.updateUsername).mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await patchCallsign({ callsign: 'Orion_2', password: PASSWORD });

    expect(res.status).toBe(409);
  });

  it.each([
    ['an invalid callsign', { callsign: 'no spaces', password: PASSWORD }, 'callsign', 'Use letters, numbers, - and _ only.'],
    ['a missing access code', { callsign: 'Orion_2' }, 'password', 'Enter your access code.'],
    ['an extra field', { callsign: 'Orion_2', password: PASSWORD, email: 'x@y.z' }, 'form', UNCHANGEABLE],
  ])('rejects %s (400)', async (_name, body, field, message) => {
    const res = await patchCallsign(body);

    expect(res.status).toBe(400);
    expect(res.body.fields[field]).toBe(message);
    expect(profiles.updateUsername).not.toHaveBeenCalled();
  });
});

describe('POST /api/profile/me/boosters/:boosterId/activate', () => {
  it('activates an owned booster and returns the profile', async () => {
    const res = await activate(5);

    expect(res.status).toBe(200);
    expect(progress.activateBooster).toHaveBeenCalledWith(PILOT.userId, 5);
    expect(res.body.profile).toBeDefined();
  });

  it('is 409 while another booster is running', async () => {
    vi.mocked(progress.activateBooster).mockResolvedValue('busy');
    const res = await activate(5);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('A booster is already running. Use it up first, Pilot.');
  });

  it('is 404 for a booster the pilot doesn’t own', async () => {
    vi.mocked(progress.activateBooster).mockResolvedValue('not-found');
    const res = await activate(5);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('That booster isn’t in your inventory.');
  });

  it.each(['abc', '0', '-3'])('is 404 for the id "%s" without asking the database', async (id) => {
    const res = await activate(id);

    expect(res.status).toBe(404);
    expect(progress.activateBooster).not.toHaveBeenCalled();
  });
});
