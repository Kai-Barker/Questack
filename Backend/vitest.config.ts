import { defineConfig } from 'vitest/config';

// Two kinds of test, run separately:
//   npm test        unit + endpoint tests. No network, no database: the models,
//                   the database pool and Gemini are replaced with fakes
//                   (tests/setup/mocks.ts). Safe to run any time.
//   npm run test:ai the live Ship's AI suite. Calls the real Gemini API with
//                   the key in .env, so it uses a little of the daily quota.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tests/endpoints/**/*.test.ts', 'tests/integration/**/*.test.ts'],
          setupFiles: ['tests/setup/env.ts', 'tests/setup/mocks.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ai-live',
          include: ['tests/ai-live/**/*.test.ts'],
          setupFiles: ['tests/setup/liveEnv.ts'],
          environment: 'node',
          // Gemini can take minutes on the free tier when Flash is overloaded
          // (it retries, then falls back to Flash-Lite)
          testTimeout: 300_000,
          // The model isn't deterministic: one retry before calling it a failure
          retry: 1,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Startup only, and the type declarations
      exclude: ['src/index.ts', 'src/types/**'],
      reporter: ['text', 'html'],
    },
  },
});
