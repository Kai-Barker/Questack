import { describe, expect, it } from 'vitest';
import { newObjective, newQuestDraft, toDraft, toInput, type ObjectiveDraft, type QuestDraft } from '../../../src/utils/adminQuest';
import { accessCodeChecks, callsignError, emailError, passwordError, withoutField } from '../../../src/utils/authRules';
import { capitalise, errorMessage, formatNumber, initials } from '../../../src/utils/format';
import { percent, REPLAY_XP_SHARE, sectorStatus } from '../../../src/utils/progress';
import { challengeLabel, clearedQuestIds, defaultSelectedQuest, questKind, questState } from '../../../src/utils/quests';
import { safeNextPath } from '../../../src/utils/redirect';
import { toRequestFailure } from '../../../src/utils/requestFailure';
import { axiosError } from '../../helpers/axios';
import { DASHBOARD, SECTOR, sectorQuest } from '../../helpers/fixtures';

describe('authRules', () => {
  it.each([
    ['Vega-7', undefined],
    ['  ok_name  ', undefined],
    ['ab', 'Use at least 3 characters.'],
    ['x'.repeat(21), 'Use 20 characters or fewer.'],
    ['has space', 'Use letters, numbers, - and _ only.'],
    ['vega@mail', 'Use letters, numbers, - and _ only.'],
  ])('callsignError(%j) is %j', (value, expected) => {
    expect(callsignError(value)).toBe(expected);
  });

  it.each([
    ['pilot@example.com', undefined],
    ['  pilot@example.com  ', undefined],
    ['no-at-sign.com', 'Enter a valid email address.'],
    ['two@@example.com', 'Enter a valid email address.'],
    ['spaces in@example.com', 'Enter a valid email address.'],
    ['missing@tld', 'Enter a valid email address.'],
    [`${'a'.repeat(250)}@example.com`, 'Enter a valid email address.'],
  ])('emailError(%j) is %j', (value, expected) => {
    expect(emailError(value)).toBe(expected);
  });

  it.each([
    ['launch2026', undefined],
    ['abc1', 'Use at least 8 characters.'],
    ['abcdefgh', 'Include at least one number.'],
    // 38 characters but 74 bytes: bcrypt only reads 72
    [`a1${'é'.repeat(36)}`, 'Use 72 characters or fewer.'],
    [`a1${'x'.repeat(70)}`, undefined],
  ])('passwordError(%j) is %j', (value, expected) => {
    expect(passwordError(value)).toBe(expected);
  });

  it('accessCodeChecks reports each rule', () => {
    expect(accessCodeChecks('launch2026', 'launch2026')).toEqual([
      { label: '8 characters or more', met: true },
      { label: 'Contains a number', met: true },
      { label: 'Passwords match', met: true },
    ]);
    expect(accessCodeChecks('short', '').map((c) => c.met)).toEqual([false, false, false]);
    expect(accessCodeChecks('launch2026', 'launch2027')[2]!.met).toBe(false);
  });

  it('withoutField drops one field and leaves the original alone', () => {
    const errors = { email: 'Bad', password: 'Short' };
    expect(withoutField(errors, 'email')).toEqual({ password: 'Short' });
    expect(errors).toEqual({ email: 'Bad', password: 'Short' });
  });
});

describe('format', () => {
  it.each([
    [0, '0'],
    [1300, '1,300'],
    [1234567, '1,234,567'],
  ])('formatNumber(%i) is %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it.each([
    ['pilot', 'Pilot'],
    ['Commander', 'Commander'],
    ['', ''],
  ])('capitalise(%j) is %j', (value, expected) => {
    expect(capitalise(value)).toBe(expected);
  });

  it.each([
    ['VEGA-7', 'VE'],
    ['nova', 'NO'],
    ['x', 'X'],
    ['--', ''],
    ['_a_b', 'AB'],
  ])('initials(%j) is %j', (value, expected) => {
    expect(initials(value)).toBe(expected);
  });

  it.each([
    ['no response (backend down)', axiosError(), 'Could not reach Questack command. Is the backend running?'],
    ['a 4xx with a message', axiosError(403, { error: 'This quest is still locked.' }), 'This quest is still locked.'],
    ['a 4xx without a message', axiosError(404, {}), 'Command responded with an error (404).'],
    ['a 5xx (its message is never shown)', axiosError(500, { error: 'stack trace' }), 'Command responded with an error (500).'],
    ['a plain Error', new Error('boom'), 'boom'],
    ['anything else', 'weird', 'Something went wrong.'],
  ])('errorMessage for %s', (_name, err, expected) => {
    expect(errorMessage(err)).toBe(expected);
  });
});

describe('progress', () => {
  it.each([
    [1, 3, 33],
    [2, 3, 67],
    [3, 3, 100],
    [0, 0, 0],
    [5, 3, 100],
    [-1, 3, 0],
    [1, -2, 0],
  ])('percent(%i, %i) is %i', (value, total, expected) => {
    expect(percent(value, total)).toBe(expected);
  });

  it('sectorStatus is cleared only when every quest is done', () => {
    const sector = DASHBOARD.sectors[0]!;
    expect(sectorStatus({ ...sector, questsCleared: 3, questsTotal: 3 })).toBe('cleared');
    expect(sectorStatus({ ...sector, questsCleared: 2, questsTotal: 3 })).toBe('infested');
    expect(sectorStatus({ ...sector, questsCleared: 0, questsTotal: 0 })).toBe('infested');
  });

  it('matches the backend’s replay share', () => {
    expect(REPLAY_XP_SHARE).toBe(0.25);
  });
});

describe('quests', () => {
  const cleared = new Set([1]);

  it('questState: cleared, available or locked', () => {
    const [q1, q2, , q4] = SECTOR.quests;
    expect(questState(q1!, cleared)).toBe('cleared');
    expect(questState(q2!, cleared)).toBe('available');
    expect(questState(q4!, cleared)).toBe('locked');
  });

  it('clearedQuestIds collects the cleared quests', () => {
    expect(clearedQuestIds(SECTOR.quests)).toEqual(new Set([1]));
  });

  it.each([
    ['read_and_explain', 'Read and explain'],
    ['bug_hunt', 'Bug hunt'],
    ['decode_transmission', 'Decode the transmission'],
    ['architecture', 'Architecture design'],
  ] as const)('challengeLabel(%s) is %s', (type, label) => {
    expect(challengeLabel(type)).toBe(label);
  });

  it('questKind names hive assaults, side quests and main quests', () => {
    expect(questKind(sectorQuest({ questId: 1, isHiveAssault: true, isSideQuest: true }))).toBe('Hive assault');
    expect(questKind(sectorQuest({ questId: 1, isSideQuest: true }))).toBe('Side quest');
    expect(questKind(sectorQuest({ questId: 1 }))).toBe('Main quest');
  });

  describe('defaultSelectedQuest', () => {
    it('prefers the next available main quest', () => {
      expect(defaultSelectedQuest(SECTOR.quests, 1)).toBe(2);
    });

    it('falls back to an available side quest', () => {
      const quests = SECTOR.quests.map((q) => (q.questId === 2 ? { ...q, cleared: true } : q)).filter((q) => q.questId !== 4);
      expect(defaultSelectedQuest(quests, 1)).toBe(3);
    });

    it('falls back to the ship’s quest when nothing is available', () => {
      const allCleared = SECTOR.quests.map((q) => ({ ...q, cleared: true }));
      expect(defaultSelectedQuest(allCleared, 3)).toBe(3);
    });

    it('falls back to the first quest, then to null', () => {
      const allCleared = SECTOR.quests.map((q) => ({ ...q, cleared: true }));
      expect(defaultSelectedQuest(allCleared, null)).toBe(1);
      expect(defaultSelectedQuest([], null)).toBeNull();
    });
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/profile', '/profile'],
    ['/quest/2?tab=code', '/quest/2?tab=code'],
    [null, '/'],
    ['', '/'],
    ['profile', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['javascript:alert(1)', '/'],
  ])('safeNextPath(%j) is %j', (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});

describe('toRequestFailure', () => {
  it.each([
    [400, 'invalid'],
    [401, 'denied'],
    [409, 'conflict'],
    [429, 'limited'],
    [403, 'error'],
    [500, 'error'],
  ] as const)('a %i is "%s"', (status, kind) => {
    const failure = toRequestFailure(axiosError(status, { error: 'Server says no.', fields: { email: 'Bad.' } }));
    expect(failure).toEqual({ kind, message: 'Server says no.', fields: { email: 'Bad.' } });
  });

  it('fills in a message and fields when the server sent none', () => {
    expect(toRequestFailure(axiosError(500, ''))).toEqual({ kind: 'error', message: 'Something went wrong. Try again.', fields: {} });
  });

  it.each([
    ['no response', axiosError()],
    ['a non-axios error', new Error('boom')],
  ])('is "offline" for %s', (_name, err) => {
    expect(toRequestFailure(err)).toEqual({
      kind: 'offline',
      message: 'Could not reach Questack command. Check your connection and try again.',
      fields: {},
    });
  });
});

describe('adminQuest: other accepted bug lines', () => {
  const draft = (objective: Partial<ObjectiveDraft>): QuestDraft => ({
    ...newQuestDraft(1),
    objectives: [{ ...newObjective('bug_hunt'), bugLine: '5', ...objective }],
  });

  it('sends the lines typed with commas or spaces as numbers', () => {
    expect(toInput(draft({ altBugLines: '1, 7  9' })).objectives[0]!.altBugLines).toEqual([1, 7, 9]);
    expect(toInput(draft({ altBugLines: '' })).objectives[0]!.altBugLines).toEqual([]);
  });

  it('only sends them for bug hunts', () => {
    expect(toInput(draft({ type: 'read_and_explain', altBugLines: '1' })).objectives[0]!.altBugLines).toEqual([]);
  });

  it('shows saved lines as "1, 7" in the editor', () => {
    const saved = toInput(draft({ altBugLines: '1,7' }));
    const quest = { ...saved, questId: 9, displayOrder: 1, objectives: saved.objectives.map((o) => ({ ...o, challengeId: 90 })) };
    expect(toDraft(quest).objectives[0]!.altBugLines).toBe('1, 7');
  });
});
