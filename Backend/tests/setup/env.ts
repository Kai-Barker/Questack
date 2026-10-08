// Fake settings for the unit and endpoint tests. The config modules check
// these as soon as they're imported, so they're set before any test file
// loads. The real .env is never read in these tests (only src/index.ts loads
// it), so no real secret or database is ever used.
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
process.env.JWT_EXPIRES_IN = '12h';
process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:3306/questack_test';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.CLIENT_URL = 'http://localhost:5173';
delete process.env.TRUST_PROXY;
delete process.env.NODE_ENV;
