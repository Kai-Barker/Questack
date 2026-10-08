import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { COMMS_DOWN_MESSAGE, commsMessage } from '../../../src/utils/commsMessages.js';
import { HttpError } from '../../../src/utils/httpError.js';
import { levelFromXp, xpToClear } from '../../../src/utils/levels.js';
import { callsign, parse } from '../../../src/utils/validation.js';

describe('levels', () => {
  it.each([
    [1, 500],
    [2, 750],
    [7, 2000],
  ])('level %i takes %i XP to clear', (level, xp) => {
    expect(xpToClear(level)).toBe(xp);
  });

  it.each([
    [0, { level: 1, levelXp: 0, levelXpRequired: 500 }],
    [499, { level: 1, levelXp: 499, levelXpRequired: 500 }],
    [500, { level: 2, levelXp: 0, levelXpRequired: 750 }],
    [1249, { level: 2, levelXp: 749, levelXpRequired: 750 }],
    [1250, { level: 3, levelXp: 0, levelXpRequired: 1000 }],
    [-50, { level: 1, levelXp: 0, levelXpRequired: 500 }],
  ])('%i total XP is %o', (xp, expected) => {
    expect(levelFromXp(xp)).toEqual(expected);
  });
});

describe('validation.parse', () => {
  const schema = z.strictObject({ name: z.string().min(2, 'Too short.'), age: z.number() });

  it('returns the parsed body', () => {
    expect(parse(schema, { name: 'Vega', age: 3 })).toEqual({ name: 'Vega', age: 3 });
  });

  it('throws a 400 with one plain message per field', () => {
    try {
      parse(schema, { name: 'V', age: 'three', extra: true });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({
        status: 400,
        message: 'Check the highlighted fields.',
        fields: { name: 'Too short.', age: 'Enter a valid value.', form: 'This request includes fields that can’t be changed.' },
      });
    }
  });

  it.each([
    ['Vega-7', true],
    ['  trimmed_ok  ', true],
    ['ab', false],
    ['x'.repeat(21), false],
    ['has space', false],
    ['emoji🚀', false],
    ['vega@mail', false],
  ])('callsign "%s" is valid: %s', (value, valid) => {
    expect(callsign.safeParse(value).success).toBe(valid);
  });
});

describe('HttpError', () => {
  it('carries a status, message and optional field messages', () => {
    const err = new HttpError(409, 'Taken.', { callsign: 'Taken.' });

    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ name: 'HttpError', status: 409, message: 'Taken.', fields: { callsign: 'Taken.' } });
  });
});

describe('commsMessage', () => {
  it('describes a retry with its attempt count', () => {
    expect(commsMessage({ type: 'retry', model: 'flash', status: 503, attempt: 2, maxAttempts: 4, delayMs: 1000 })).toMatch(/\(attempt 2\/4\)$/);
  });

  it('describes a fallback', () => {
    expect(commsMessage({ type: 'fallback', from: 'flash', to: 'flashLite', status: 503 })).toMatch(/relay|auxiliary/);
  });

  it('has a fixed message for when comms are down', () => {
    expect(COMMS_DOWN_MESSAGE).toBe("Ship's AI comms are down. Try again in a moment, Pilot.");
  });
});
