import { afterEach, describe, expect, it, vi } from 'vitest';
import * as decoder from '../../../src/models/decoderModel.js';
import * as profiles from '../../../src/models/profileModel.js';
import * as progress from '../../../src/models/progressModel.js';
import { buildProfile, changeCallsign, startBooster } from '../../../src/services/profileService.js';
import { PASSWORD } from '../../helpers/fixtures.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('insignia list cache', () => {
  it('loads the insignia once a minute, however many profiles are built', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T10:00:00Z'));
    await Promise.all([buildProfile(7), buildProfile(7)]);
    await buildProfile(7);
    expect(profiles.listInsignia).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-10-08T10:01:01Z'));
    await buildProfile(7);
    expect(profiles.listInsignia).toHaveBeenCalledTimes(2);
  });
});

describe('unlock rules', () => {
  // Each case starts 10 minutes after the last, past the 1-minute insignia cache
  let clock = Date.parse('2026-11-01T00:00:00Z');

  it.each([
    ['ai_questions>=25', () => vi.mocked(progress.countAiQuestions).mockResolvedValue(25), true],
    ['ai_questions>=25', () => vi.mocked(progress.countAiQuestions).mockResolvedValue(24), false],
    ['transmissions_decoded>=5', () => vi.mocked(progress.countCorrectAnswersByType).mockResolvedValue(new Map([['decode_transmission', 5]])), true],
    // Standalone decoder checks count alongside decode objectives in quests
    ['transmissions_decoded>=5', () => {
      vi.mocked(progress.countCorrectAnswersByType).mockResolvedValue(new Map([['decode_transmission', 2]]));
      vi.mocked(decoder.countDecodes).mockResolvedValue(3);
    }, true],
    ['transmissions_decoded>=5', () => vi.mocked(decoder.countDecodes).mockResolvedValue(4), false],
    ['sectors_cleared>=1', () => vi.mocked(progress.listClearedQuests).mockResolvedValue([{ questId: 11, lastCompletedAt: new Date() }]), true],
    ['hive_assaults>=1', () => {}, false], // not built yet, so never earned
    ['unknown_stat>=0', () => {}, false],
    ['  quests_cleared>=0  ', () => {}, true], // spaces around the rule are fine
  ])('"%s" is earned: %s', async (rule, arrange, earned) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    clock += 10 * 60 * 1000;
    vi.setSystemTime(clock);
    vi.mocked(profiles.listInsignia).mockResolvedValue([{ rewardId: 1, code: 'x', name: 'X', description: '', unlockCondition: rule }]);
    arrange();

    expect((await buildProfile(7)).insignia[0]!.earned).toBe(earned);
  });
});

describe('changeCallsign', () => {
  it('checks the access code before looking at who has the callsign', async () => {
    await expect(changeCallsign(7, 'Orion', 'wrong-code1')).rejects.toMatchObject({ status: 400 });
    expect(profiles.usernameTakenByOther).not.toHaveBeenCalled();
  });

  it('rethrows unexpected database errors', async () => {
    vi.mocked(profiles.updateUsername).mockRejectedValue(new Error('read-only'));
    await expect(changeCallsign(7, 'Orion', PASSWORD)).rejects.toThrow('read-only');
  });
});

describe('startBooster', () => {
  it('returns the refreshed profile after activating', async () => {
    vi.mocked(progress.listBoosters).mockResolvedValue([{ boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2, chargesRemaining: 3, active: true }]);
    const profile = await startBooster(7, 5);

    expect(profile.loadout.booster).toBe('Overdrive Core');
    expect(profile.boosters).toHaveLength(1);
  });
});
