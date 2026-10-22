# Questack: notes for Claude

Gamified code-reading app. `Backend/` (Express + TypeScript, MySQL on Aiven, Gemini)
and `Frontend/` (React 19 + Vite + Tailwind 4). Setup is in README.md; design docs are in `docs/`.

## Commands
- Backend tests: `npm test` (unit + endpoint, everything faked). Never `npx vitest run`
  on its own: it also runs the live Gemini suite and uses the daily free quota.
- Live AI tests: `npm run test:ai`. Only when asked.
- Typecheck: `npm run test:typecheck` in both apps. Frontend lint: `npm run lint`.
- Run tests in both apps before saying a change is done.

## Database (Aiven: the real, shared database)
- `db:migrate`, `db:seed` and `db:curriculum` write to the real database. Ask first.
- Never edit an applied migration: add the next numbered file in `Backend/database/migrations/`.
- The dev backend runs `tsx watch`, so code that reads a new column breaks as soon as
  it's saved. Write the migration together with the code.
- Quest ids: seeded quests are below 1000 and the editor/curriculum use 1000+.
  Seeded objective ids are `questId * 100 + order`.
- Content sources: `database/seeds/questContent.ts` (the 10 seeded quests) and
  `database/curriculum_backup/<language>/` (full paths, imported with
  `npm run db:curriculum -- <csharp|javascript> --admin <user> [--dry-run]`).
  Always run `--dry-run` first.

## Rules that must hold
- Answer keys, marking criteria and bug lines (`bugLine`, `altBugLines`) never reach
  the browser. Marking happens on the server.
- Answer keys and marking criteria never contain line numbers (the AI could repeat them).
  Every bug hunt needs `bugLineContains`, and `altBugLines` wherever a second fix location works.
- All Gemini calls go through `generate()` in `src/config/gemini.ts`. All prompts
  are in `src/prompts/shipsAi.ts`. Pilot text is wrapped as untrusted input.
- Briefing examples must not give away their own quest's objective answers.
- JavaScript snippets run as ES modules (strict mode), so check their output with
  `node <file>` before writing answer keys.

## Frontend
- Leave `VITE_API_URL` unset; the Vite proxy keeps the session cookie first-party
  (setting it breaks the tests: bug log #6).
- Reuse the UI components instead of new markup: `ChamferFrame`, `Panel`, `Button`, `Dropdown`.
  Colours come from the tokens in `src/index.css`.
- New routes get endpoint tests (`Backend/tests/endpoints/`); new screens get page
  tests (`Frontend/tests/pages/`).

## Style
- Comments: a short plain-English line above anything non-obvious, explaining *why*.
- UI copy: plain and friendly with a light space theme ("Pilot", "Ship's AI"); clarity first.
- Log bugs found in testing in `docs/bug-log.md`.

## Working style

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
