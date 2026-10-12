import { vi } from 'vitest';
import type { GenerateContentResponse } from '@google/genai';
import { pool } from '../../src/config/db.js';
import { generate } from '../../src/config/gemini.js';
import * as admin from '../../src/models/adminModel.js';
import * as aiUsage from '../../src/models/aiUsageModel.js';
import * as decoder from '../../src/models/decoderModel.js';
import * as profiles from '../../src/models/profileModel.js';
import * as progress from '../../src/models/progressModel.js';
import * as questModel from '../../src/models/questModel.js';
import * as users from '../../src/models/userModel.js';
import { CATALOG_ROWS, INSIGNIA, PILOT, PROFILE_RECORD } from './fixtures.js';

// What the fakes return unless a test says otherwise: a brand-new pilot with
// no progress, signed in as PILOT, in the fixture galaxy. Applied before
// every test (tests/setup/mocks.ts).

// A Gemini reply with the fields the app reads
export function geminiReply(text: string, tokens = { input: 100, output: 20 }): GenerateContentResponse {
  return {
    text,
    usageMetadata: { promptTokenCount: tokens.input, candidatesTokenCount: tokens.output },
  } as GenerateContentResponse;
}

export const DEFAULT_EVALUATION = { correct: true, feedback: 'Spot on, Pilot.', guidingQuestion: null };
export const ADMIN_OVERVIEW = {
  pilots: 12,
  activePilots: 11,
  publishedQuests: 10,
  draftQuests: 1,
  aiCallsToday: 40,
  aiTokensToday: 52000,
};

export const DEFAULT_TEXT_REPLY = 'Trace the loop one pass at a time, Pilot. What changes each time?';

// A fake database connection that records how the transaction was handled
export function fakeConnection() {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    execute: vi.fn().mockResolvedValue([[], []]),
    query: vi.fn().mockResolvedValue([[], []]),
  };
}

export type FakeConnection = ReturnType<typeof fakeConnection>;

export function applyDefaults() {
  vi.mocked(pool.query).mockResolvedValue([[{ 1: 1 }], []] as never);
  vi.mocked(pool.getConnection).mockImplementation(async () => fakeConnection() as never);

  vi.mocked(users.findById).mockImplementation(async (id) => (id === PILOT.userId ? { ...PILOT } : null));
  vi.mocked(users.findByLogin).mockImplementation(async (identifier) =>
    identifier.toLowerCase() === PILOT.email || identifier.toLowerCase() === PILOT.username.toLowerCase() ? { ...PILOT } : null,
  );
  vi.mocked(users.usernameOrEmailTaken).mockResolvedValue(false);
  vi.mocked(users.createUser).mockResolvedValue(42);
  vi.mocked(users.touchLastActive).mockResolvedValue(undefined);

  vi.mocked(profiles.findProfile).mockResolvedValue({ ...PROFILE_RECORD });
  vi.mocked(profiles.listInsignia).mockResolvedValue(INSIGNIA);
  vi.mocked(profiles.listFeaturedIds).mockResolvedValue([]);
  vi.mocked(profiles.saveProfile).mockResolvedValue(undefined);
  vi.mocked(profiles.usernameTakenByOther).mockResolvedValue(false);
  vi.mocked(profiles.updateUsername).mockResolvedValue(undefined);

  vi.mocked(questModel.loadCatalogRows).mockResolvedValue(CATALOG_ROWS);

  vi.mocked(progress.getPilotRow).mockResolvedValue({ totalXp: 0, titleName: null });
  vi.mocked(progress.listClearedQuests).mockResolvedValue([]);
  vi.mocked(progress.listOpenAttempts).mockResolvedValue([]);
  vi.mocked(progress.listLanguageProgress).mockResolvedValue([]);
  vi.mocked(progress.countCorrectAnswersByType).mockResolvedValue(new Map());
  vi.mocked(progress.countActivityByDay).mockResolvedValue(new Map());
  vi.mocked(progress.sumXpByWeek).mockResolvedValue(new Map());
  vi.mocked(progress.countAiQuestions).mockResolvedValue(0);
  vi.mocked(progress.listBoosters).mockResolvedValue([]);
  vi.mocked(progress.hasCompletedQuest).mockResolvedValue(false);
  vi.mocked(progress.setProficiency).mockResolvedValue(undefined);
  vi.mocked(progress.lockPilot).mockResolvedValue(0);
  vi.mocked(progress.findOpenAttemptId).mockResolvedValue(null);
  vi.mocked(progress.createAttempt).mockResolvedValue(500);
  vi.mocked(progress.listAttemptClears).mockResolvedValue(new Set());
  vi.mocked(progress.recordAnswer).mockResolvedValue(undefined);
  vi.mocked(progress.findActiveBooster).mockResolvedValue(null);
  vi.mocked(progress.useBoosterCharge).mockResolvedValue(undefined);
  vi.mocked(progress.grantBooster).mockResolvedValue(null);
  vi.mocked(progress.completeAttempt).mockResolvedValue(undefined);
  vi.mocked(progress.addXp).mockResolvedValue(undefined);
  vi.mocked(progress.activateBooster).mockResolvedValue('activated');

  vi.mocked(aiUsage.logAiUsage).mockResolvedValue(undefined);

  vi.mocked(decoder.recordDecode).mockResolvedValue(true);
  vi.mocked(decoder.countDecodes).mockResolvedValue(0);

  vi.mocked(admin.getOverview).mockResolvedValue({ ...ADMIN_OVERVIEW });

  // JSON calls (evaluate, decode) get JSON back; everything else gets text
  vi.mocked(generate).mockImplementation(async (model, _contents, config = {}) => ({
    response: geminiReply(config.responseMimeType === 'application/json' ? JSON.stringify(DEFAULT_EVALUATION) : DEFAULT_TEXT_REPLY),
    modelUsed: model,
    usedFallback: false,
  }));
}
