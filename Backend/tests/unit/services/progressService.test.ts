import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as progress from '../../../src/models/progressModel.js';
import { changeRank, loadFlightLog, loadPilotCore, loadXpHistory } from '../../../src/services/progressService.js';
import { HttpError } from '../../../src/utils/httpError.js';

// Days and weeks run on South African time (UTC+2). The clock is frozen at
// Thursday 8 October 2026, 12:00 in South Africa, unless a test moves it.
const NOW = new Date('2026-10-08T10:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const activity = (entries: Record<string, number>) => vi.mocked(progress.countActivityByDay).mockResolvedValue(new Map(Object.entries(entries)));

describe('loadFlightLog', () => {
  it('covers 26 weeks, from a Monday up to today', async () => {
    const log = await loadFlightLog(7);

    expect(log.days[0]!.date).toBe('2026-04-13'); // a Monday, 25 weeks before this week's
    expect(log.days.at(-1)!.date).toBe('2026-10-08');
    expect(log.days).toHaveLength(179);
  });

  it('asks the database from South African midnight on the first day', async () => {
    await loadFlightLog(7);
    expect(progress.countActivityByDay).toHaveBeenCalledWith(7, new Date('2026-04-12T22:00:00Z'));
  });

  it('puts each day’s count on its date and zero elsewhere', async () => {
    activity({ '2026-10-06': 3 });
    const log = await loadFlightLog(7);

    expect(log.days.find((d) => d.date === '2026-10-06')!.count).toBe(3);
    expect(log.days.find((d) => d.date === '2026-10-07')!.count).toBe(0);
  });

  it('counts the current streak up to today', async () => {
    activity({ '2026-10-08': 1, '2026-10-07': 2, '2026-10-06': 1, '2026-10-04': 5 });
    expect((await loadFlightLog(7)).currentStreak).toBe(3);
  });

  it('keeps yesterday’s streak alive if nothing’s been cleared yet today', async () => {
    activity({ '2026-10-07': 2, '2026-10-06': 1 });
    expect((await loadFlightLog(7)).currentStreak).toBe(2);
  });

  it('has no current streak after a missed day', async () => {
    activity({ '2026-10-06': 2 });
    expect((await loadFlightLog(7)).currentStreak).toBe(0);
  });

  it('finds the longest streak and counts active days', async () => {
    activity({ '2026-09-01': 1, '2026-09-02': 1, '2026-09-03': 1, '2026-09-04': 1, '2026-10-08': 1 });
    const log = await loadFlightLog(7);

    expect(log).toMatchObject({ longestStreak: 4, currentStreak: 1, activeDays: 5 });
  });

  it.each([
    ['21:59 UTC is still the same day in South Africa', '2026-10-07T21:59:00Z', '2026-10-07'],
    ['22:00 UTC is already the next day in South Africa', '2026-10-07T22:00:00Z', '2026-10-08'],
  ])('%s', async (_name, instant, today) => {
    vi.setSystemTime(new Date(instant));
    expect((await loadFlightLog(7)).days.at(-1)!.date).toBe(today);
  });
});

describe('loadXpHistory', () => {
  it('returns 8 weeks, each keyed by its Monday, with XP where it was earned', async () => {
    vi.mocked(progress.sumXpByWeek).mockResolvedValue(new Map([['2026-09-28', 300]]));
    const weeks = await loadXpHistory(7);

    expect(weeks.map((w) => w.weekStart)).toEqual([
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
    ]);
    expect(weeks.find((w) => w.weekStart === '2026-09-28')!.xp).toBe(300);
    expect(weeks.filter((w) => w.xp === 0)).toHaveLength(7);
  });
});

describe('loadPilotCore', () => {
  it('combines the catalogue with the pilot’s rows', async () => {
    vi.mocked(progress.getPilotRow).mockResolvedValue({ totalXp: 750, titleName: 'First Deploy' });
    vi.mocked(progress.listClearedQuests).mockResolvedValue([{ questId: 1, lastCompletedAt: NOW }]);
    vi.mocked(progress.listLanguageProgress).mockResolvedValue([{ languageId: 1, proficiency: 'pilot', languageXp: 100 }]);
    vi.mocked(progress.listBoosters).mockResolvedValue([
      { boosterId: 2, name: 'Spare', xpMultiplier: 1.5, chargesRemaining: 1, active: false },
      { boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2, chargesRemaining: 3, active: true },
    ]);
    const core = await loadPilotCore(7);

    expect(core).toMatchObject({ totalXp: 750, titleName: 'First Deploy', rank: 'pilot', level: { level: 2, levelXp: 250 } });
    expect([...core.clearedIds]).toEqual([1]);
    expect(core.activeBooster!.boosterId).toBe(5);
  });
});

describe('changeRank', () => {
  it('saves the rank for a known sector', async () => {
    await changeRank(7, 2, 'commander');
    expect(progress.setProficiency).toHaveBeenCalledWith(7, 2, 'commander');
  });

  it('throws a 404 for an unknown sector', async () => {
    await expect(changeRank(7, 99, 'pilot')).rejects.toMatchObject(new HttpError(404, 'This sector is uncharted.'));
    expect(progress.setProficiency).not.toHaveBeenCalled();
  });
});
