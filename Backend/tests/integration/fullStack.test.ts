import { describe, it } from 'vitest';

// TODO: frontend -> backend -> database tests.
//
// These are placeholders: they show up as "todo" in every test run until
// they're written. Two decisions are still open:
//   1. Which database to run against: a separate Aiven database
//      (e.g. questack_test, with schema + migrations + seed), a local MySQL
//      in Docker, or the dev database with throwaway pilots.
//   2. How to drive it: Playwright in a real browser (frontend included),
//      or API-level requests through the real app (backend + database only).
// Whichever is chosen, every test pilot must be deleted afterwards (their
// progress cascades with them).

describe('frontend -> backend -> database', () => {
  it.todo('a new pilot can enlist and is saved to the users table');
  it.todo('the pilot can sign out and sign back in with the same callsign');
  it.todo('the dashboard lists the seeded sectors and suggests the first quest');
  it.todo('a locked quest is refused until its prerequisite is cleared');
  it.todo('answering every objective and completing the quest saves XP and level to the database');
  it.todo('replaying a cleared quest saves 25% XP');
  it.todo('profile edits (bio, goal) are saved and read back');
  it.todo('a changed callsign works for the next sign-in');
  it.todo('the test pilot and all their progress are deleted afterwards');
});
