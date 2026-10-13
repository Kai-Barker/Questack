import { beforeEach, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

// Replaces everything that would leave the process (the database, Gemini)
// with fakes, for every unit and endpoint test. Like Moq in .NET: each test
// sets what the fakes return (see tests/helpers/defaults.ts), then checks
// what the app did with it.
//
// - Model functions that run SQL become vi.fn(). Pure helpers (toPublicUser)
//   keep their real code.
// - The database pool is a fake whose connections record begin/commit/rollback.
// - Gemini's generate() is a vi.fn() that returns canned replies.
// - Rate limiters let everything through. They're tested on their own in
//   tests/unit/middleware/rateLimiters.test.ts (with vi.importActual).

function stubFunctions<T extends object>(original: T, keep: string[] = []): T {
  return Object.fromEntries(
    Object.entries(original).map(([name, value]) => [
      name,
      typeof value === 'function' && !keep.includes(name) ? vi.fn() : value,
    ]),
  ) as T;
}

vi.mock('../../src/config/db.js', () => ({
  dbConnectionOptions: {},
  pool: { query: vi.fn(), execute: vi.fn(), getConnection: vi.fn() },
}));

vi.mock('../../src/models/userModel.js', async (importOriginal) => stubFunctions(await importOriginal(), ['toPublicUser']));
vi.mock('../../src/models/profileModel.js', async (importOriginal) => stubFunctions(await importOriginal()));
vi.mock('../../src/models/progressModel.js', async (importOriginal) => stubFunctions(await importOriginal()));
vi.mock('../../src/models/questModel.js', async (importOriginal) => stubFunctions(await importOriginal()));
vi.mock('../../src/models/aiUsageModel.js', async (importOriginal) => stubFunctions(await importOriginal()));
vi.mock('../../src/models/decoderModel.js', async (importOriginal) => stubFunctions(await importOriginal()));
vi.mock('../../src/models/adminModel.js', async (importOriginal) => stubFunctions(await importOriginal()));
vi.mock('../../src/models/adminQuestModel.js', async (importOriginal) => stubFunctions(await importOriginal()));

vi.mock('../../src/config/gemini.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/gemini.js')>()),
  generate: vi.fn(),
}));

vi.mock('../../src/middleware/rateLimiters.js', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();
  return Object.fromEntries(Object.keys(original).map((name) => [name, passThrough]));
});

beforeEach(async () => {
  vi.resetAllMocks();
  const { applyDefaults } = await import('../helpers/defaults.js');
  applyDefaults();
});
