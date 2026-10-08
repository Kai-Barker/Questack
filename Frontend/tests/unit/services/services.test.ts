import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import * as ai from '../../../src/services/aiService';
import api from '../../../src/services/api';
import * as auth from '../../../src/services/authService';
import { getDashboard } from '../../../src/services/dashboardService';
import { getHealth } from '../../../src/services/healthService';
import { getCurrentPilot } from '../../../src/services/pilotService';
import * as profile from '../../../src/services/profileService';
import { completeQuest, getQuest } from '../../../src/services/questService';
import { getSector, updateSectorRank } from '../../../src/services/sectorService';
import { toRequestFailure } from '../../../src/utils/requestFailure';
import { COMPLETION, DASHBOARD, PILOT, PROFILE, QUEST, SECTOR, USER } from '../../helpers/fixtures';
import { apiUrl, respond, server, unreachable } from '../../helpers/server';

// Each service function: the right method, URL and body, and what it returns

describe('api', () => {
  it('calls the same-origin /api with JSON', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});

describe('authService', () => {
  it('getCurrentUser returns the signed-in pilot', async () => {
    respond('get', '/auth/me', 200, { user: USER });
    expect(await auth.getCurrentUser()).toEqual(USER);
  });

  it('getCurrentUser returns null when signed out (401)', async () => {
    respond('get', '/auth/me', 401, { error: 'Sign in to continue, Pilot.' });
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('getCurrentUser throws for anything else', async () => {
    respond('get', '/auth/me', 500, {});
    await expect(auth.getCurrentUser()).rejects.toThrow();
    unreachable('get', '/auth/me');
    await expect(auth.getCurrentUser()).rejects.toThrow();
  });

  it('login posts the form and returns the user', async () => {
    const calls = respond('post', '/auth/login', 200, { user: USER });
    const input = { identifier: 'Vega-7', password: 'access123', remember: true };

    expect(await auth.login(input)).toEqual(USER);
    expect(calls[0]!.body).toEqual(input);
  });

  it('login rejects with the server’s error', async () => {
    respond('post', '/auth/login', 401, { error: 'Pilot ID or access code is incorrect.' });
    const err = await auth.login({ identifier: 'x', password: 'y', remember: false }).catch((e: unknown) => e);

    expect(toRequestFailure(err)).toMatchObject({ kind: 'denied', message: 'Pilot ID or access code is incorrect.' });
  });

  it('register posts the form and returns the new user', async () => {
    const calls = respond('post', '/auth/register', 201, { user: USER });
    const input = { callsign: 'Vega-7', email: 'vega@example.com', password: 'access123', acceptTerms: true };

    expect(await auth.register(input)).toEqual(USER);
    expect(calls[0]!.body).toEqual(input);
  });

  it('logout posts to /auth/logout', async () => {
    const calls = respond('post', '/auth/logout', 204);
    await auth.logout();
    expect(calls).toHaveLength(1);
  });

  it('re-exports the shared failure helper for the sign-in forms', () => {
    expect(auth.toAuthFailure).toBe(toRequestFailure);
  });
});

describe('aiService', () => {
  const challenge = { challengeId: 101, proficiency: 'pilot' as const };

  it.each([
    ['requestHint', () => ai.requestHint({ ...challenge, tier: 1 }), 'hint', { hint: 'Look at the loop.' }, 'Look at the loop.'],
    [
      'sendMentorMessage',
      () => ai.sendMentorMessage({ ...challenge, messages: [{ from: 'pilot', text: 'hi' }] }),
      'chat',
      { reply: 'Hello, Pilot.' },
      'Hello, Pilot.',
    ],
    [
      'evaluateAnswer',
      () => ai.evaluateAnswer({ ...challenge, answer: 'x' }),
      'evaluate',
      { correct: true, feedback: 'Yes.' },
      { correct: true, feedback: 'Yes.' },
    ],
    [
      'decodeTransmission',
      () => ai.decodeTransmission({ ...challenge, code: 'x' }),
      'decode',
      { sections: [{ lines: '1', explanation: 'Sets x.' }] },
      [{ lines: '1', explanation: 'Sets x.' }],
    ],
    [
      'requestDebrief',
      () => ai.requestDebrief({ questId: 1, proficiency: 'pilot', objectives: [] }),
      'debrief',
      { debrief: 'Well flown.' },
      'Well flown.',
    ],
  ])('%s posts to /ai/%s and unwraps the reply', async (_name, call, path, reply, expected) => {
    const calls = respond('post', `/ai/${path}`, 200, reply);

    expect(await call()).toEqual(expected);
    expect(calls).toHaveLength(1);
  });

  it('sends the request body as given', async () => {
    const calls = respond('post', '/ai/evaluate', 200, { correct: false, feedback: 'No.' });
    await ai.evaluateAnswer({ ...challenge, answer: 'It loops', selectedLine: 3, hintsUsed: 1 });

    expect(calls[0]!.body).toEqual({ challengeId: 101, proficiency: 'pilot', answer: 'It loops', selectedLine: 3, hintsUsed: 1 });
  });

  it('allows a long timeout, since Gemini can retry and fall back', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { hint: 'h' } });
    await ai.requestHint({ ...challenge, tier: 1 });

    expect(post).toHaveBeenCalledWith('/ai/hint', expect.anything(), { timeout: 60_000 });
  });

  it('turns the server’s error message into a CommsError', async () => {
    respond('post', '/ai/hint', 429, { error: "The Ship's AI needs a moment to recharge, Pilot." });
    const err = await ai.requestHint({ ...challenge, tier: 1 }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ai.CommsError);
    expect((err as Error).message).toBe("The Ship's AI needs a moment to recharge, Pilot.");
  });

  it('uses the comms-down message when the backend can’t be reached', async () => {
    unreachable('post', '/ai/chat');
    await expect(ai.sendMentorMessage({ ...challenge, messages: [] })).rejects.toThrow(ai.COMMS_DOWN_MESSAGE);
  });
});

describe('progress services', () => {
  it('getDashboard', async () => {
    respond('get', '/dashboard', 200, DASHBOARD);
    expect(await getDashboard()).toEqual(DASHBOARD);
  });

  it('getCurrentPilot', async () => {
    respond('get', '/pilot/me', 200, PILOT);
    expect(await getCurrentPilot()).toEqual(PILOT);
  });

  it('getSector asks for one sector', async () => {
    const calls = respond('get', '/sectors/1', 200, SECTOR);
    expect(await getSector(1)).toEqual(SECTOR);
    expect(calls[0]!.url.pathname).toBe('/api/sectors/1');
  });

  it('updateSectorRank patches the rank', async () => {
    const calls = respond('patch', '/sectors/2/rank', 204);
    await updateSectorRank(2, 'commander');
    expect(calls[0]!.body).toEqual({ proficiencyLevel: 'commander' });
  });

  it('getQuest asks for one quest, and rejects a locked one', async () => {
    respond('get', '/quests/1', 200, QUEST);
    expect(await getQuest(1)).toEqual(QUEST);

    respond('get', '/quests/2', 403, { error: 'Locked.' });
    await expect(getQuest(2)).rejects.toThrow();
  });

  it('completeQuest posts with no body and returns the debrief data', async () => {
    const calls = respond('post', '/quests/1/complete', 200, COMPLETION);
    expect(await completeQuest(1)).toEqual(COMPLETION);
    expect(calls[0]!.body).toBeUndefined();
  });
});

describe('profileService', () => {
  it('getMyProfile unwraps the profile', async () => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    expect(await profile.getMyProfile()).toEqual(PROFILE);
  });

  it('updateProfile patches only the given fields', async () => {
    const calls = respond('patch', '/profile/me', 200, { profile: PROFILE });
    await profile.updateProfile({ bio: 'New bio', featuredIds: [1] });
    expect(calls[0]!.body).toEqual({ bio: 'New bio', featuredIds: [1] });
  });

  it('changeCallsign sends the callsign with the access code', async () => {
    const calls = respond('patch', '/profile/me/callsign', 200, { profile: PROFILE });
    await profile.changeCallsign('Orion', 'access123');
    expect(calls[0]!.body).toEqual({ callsign: 'Orion', password: 'access123' });
  });

  it('activateBooster posts to the booster’s URL', async () => {
    const calls = respond('post', '/profile/me/boosters/5/activate', 200, { profile: PROFILE });
    await profile.activateBooster(5);
    expect(calls).toHaveLength(1);
  });
});

describe('healthService', () => {
  it('returns the health report', async () => {
    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: 'now' });
    expect(await getHealth()).toMatchObject({ status: 'ok' });
  });

  it('treats 503 as an answer: the backend is up, the database isn’t', async () => {
    respond('get', '/health', 503, { status: 'degraded', database: 'unreachable', timestamp: 'now' });
    expect(await getHealth()).toMatchObject({ database: 'unreachable' });
  });

  it('throws when the backend is down or errors', async () => {
    unreachable('get', '/health');
    await expect(getHealth()).rejects.toThrow();
    respond('get', '/health', 500, {});
    await expect(getHealth()).rejects.toThrow();
  });

  // jsdom's XHR (through MSW) doesn't enforce timeouts, so this checks the
  // setting reaches axios, which enforces it in a real browser
  it('passes its timeout to axios', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: {} });
    await getHealth(15_000);

    const config = get.mock.calls[0]![1]!;
    expect(config.timeout).toBe(15_000);
    expect([200, 204, 503].map((s) => config.validateStatus!(s))).toEqual([true, true, true]);
    expect([401, 500, 502].map((s) => config.validateStatus!(s))).toEqual([false, false, false]);
  });

  it('waits for a slow backend when no timeout is given', async () => {
    server.use(
      http.get(apiUrl('/health'), async () => {
        await delay(100);
        return HttpResponse.json({ status: 'ok', database: 'connected', timestamp: 'now' });
      }),
    );
    expect(await getHealth()).toMatchObject({ status: 'ok' });
  });
});
