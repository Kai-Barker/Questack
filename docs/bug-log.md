# Bug and issue log

Log anything found in testing, usability sessions or the demo. Severity: **P1** blocks a core flow · **P2** wrong but there's a workaround · **P3** cosmetic.

| # | Date | Found by / where | Description | Steps to reproduce | Severity | Status | Fix / notes |
|---|---|---|---|---|---|---|---|
| 1 | 2026-10-12 | Milestone audit: role check | The `users.role` column existed but no route checked it, so the admin role wasn't enforced. | Any signed-in pilot could reach every API route; there were no admin routes. | P1 | Fixed | Added `requireAdmin`, `/api/admin/*`, `RequireAdmin` guard, an admin-only nav tab, and endpoint and page tests |
| 2 | 2026-10-12 | Milestone audit: onboarding | New pilots skipped onboarding; enlist steps 02–03 were shown but didn't exist. | Enlist → lands straight on the Galaxy Map with no sector | P1 | Fixed | `/onboarding` page plus `RequireEnlisted` redirect for pilots with no sector |
| 3 | 2026-10-12 | Milestone audit: decoder | The dashboard's "Open decoder" button led to a "Coming soon" placeholder. | Galaxy Map → Decode a transmission → Open decoder | P1 | Fixed | Standalone decoder page with step-through, follow-up chat and comprehension check |
| 4 | 2026-10-12 | Milestone audit: settings | The Settings tab was a placeholder. | Click Settings | P2 | Fixed | Account details, class per sector, sign out |
| 5 | 2026-10-12 | Building onboarding | The pilot summary refreshes in the background, so right after enlisting it could still show 0 sectors and bounce the pilot back to onboarding. | Enlist in a sector on a slow connection | P2 | Fixed | `PilotContext.reload()` now returns a promise; onboarding waits for it before navigating |
| 6 | 2026-10-12 | Running the frontend tests | 92 frontend tests fail when `Frontend/.env` sets `VITE_API_URL=http://localhost:3000/api`: requests go cross-origin, which the MSW fake backend doesn't answer. Cross-origin also means the session cookie isn't first-party in dev. | Set the variable in `.env`, run `npm test` | P2 | Open (local config) | Remove `VITE_API_URL` from the local `.env`; the Vite proxy handles `/api` |
| 7 | 2026-10-12 | Running the backend tests | `cookie-parser` and `express-rate-limit` were in `package.json` but missing from `node_modules`, so the backend wouldn't typecheck or start. | Fresh clone with an old `node_modules` | P2 | Fixed | `npm install` from the lockfile. Run it after pulling. |
| 8 | 2026-10-12 | Content audit | The JavaScript sector had no conditionals, loops or functions quests, and the C# sector had no functions quest (SMART "Content" goal). | Open either sector map | P2 | Fixed | Added Method Moons (C#), Conditional Canyon, Orbit Loop and Function Forge (JS). Run `npm run db:seed`. |
| | | | | | | | |
