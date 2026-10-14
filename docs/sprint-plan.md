# Sprint plan

One-week sprints from the end of planning to the final hand-in. Each item is a card on the [Kanban board](https://www.figma.com/board/7CAN507piPnhhPYq8rX5Yl/Questack-planning) (Sprint rows, plus To do / In progress / In review / Completed columns). A card moves to Completed only once it's tested.

| | Dates | Proposal weeks | Goal | Status |
|---|---|---|---|---|
| **Sprint 1** | 24 Sep – 5 Oct | 2–3 | Foundations, the Ship's AI and the first playable screens | ✅ Done |
| **Sprint 2** | 6 – 13 Oct | 4–5 | Real data, progress, onboarding and admin | ✅ Done |
| **Milestone check** | Wed 14 Oct 2026 | | Core learner loop, AI, roles and docs demoed | |
| **Sprint 3** | 14 – 20 Oct | 5–6 | Deploy, test with users, gather evidence | Planned |
| **Sprint 4** | 21 – 28 Oct | 6–7 | Fix what testing finds, polish, accessibility, final docs | Planned |
| **Final hand-in** | Wed 28 Oct 2026 | | | |

Priority: **P1** must ship (MVP), **P2** should ship, **P3** only if time allows.

## Sprint 1 (24 Sep – 5 Oct): foundations, Ship's AI, first screens ✅

**Goal:** the project runs locally with all three layers talking, the Ship's AI answers through the backend, and a pilot can sign in and play a quest screen. Covers proposal weeks 2 and 3. Week 3's "seed one sector with hand-written quests" was done with in-code content first (moved to the database in Sprint 2).

| Item | Date | Commit |
|---|---|---|
| Repository, folder structure and README | 24 Sep | `bff2f6e` |
| Express + TypeScript backend | 24 Sep | `3977db8` |
| Aiven MySQL connection and health check | 24 Sep | `2a04a4f` |
| SQL schema from the ERD; frontend ↔ backend connection test | 24 Sep | `90f7a19` |
| Gemini API working from the backend | 29 Sep | `69ac931` |
| Ship's AI service and prompts: persona, Cadet / Pilot / Commander styles, 3 hint tiers, mentor chat | 29 Sep | `99d01f1` |
| Galaxy Map (dashboard), Sector Map and Quest screen (CodeMirror viewer, Ship's AI panel) | 29 Sep | `99d01f1` |
| AI marking for read-and-explain and bug-hunt objectives; mission debrief modal | 29 Sep | `99d01f1` |
| Sign up, login, logout: JWT in an httpOnly cookie, bcrypt; protected routes and rate limits | 30 Sep | `27471fc` |

**Outcome:** proposal week 3's checkpoint was met ("log in and get a level-appropriate explanation of a code snippet"). Quest content and progress were still in-code demo data at the end of the sprint.

## Sprint 2 (6 – 13 Oct): real data, progress, onboarding, admin ✅

**Goal:** a pilot can register, onboard, clear quests stored in the database, earn XP and see it on the maps and profile; admins can manage quests. Covers proposal weeks 4 and 5 (except deployment, moved to Sprint 3).

| Item | Date | Commit |
|---|---|---|
| Splash screen that checks the backend and database before sign-in | 7 Oct | `b9e61a3` |
| Profile page: stats, insignia, XP history, flight log | 7 Oct | `e84c74f` |
| Quests in the database (migration 002 + seed script); XP, levels, quest unlocking, attempts and answers saved; maps on real progress | 7 Oct | `147ee96` |
| Automated tests: backend endpoints and units, frontend pages and components, live AI suite | 8 Oct | `73e407d` |
| Admin role enforced (`requireAdmin`), onboarding, standalone decoder, settings page | 12 Oct | `f6e27a0` |
| New content: JavaScript conditionals, loops and functions; C# functions (SMART "Content" goal) | 12 Oct | `f6e27a0` |
| Milestone docs: scope, risks, AI prompt design, API routes, bug log, sprint plan | 12 Oct | `f6e27a0` |
| Admin console with its own nav: quest editor, Users and AI usage tabs | 13 Oct | `ad15990` |
| Quest editor polish: saves cut from ~5.5 s to ~1.4 s, HUD-styled dropdowns (bug log #9–13) | 13 Oct | `ad15990` |

**Outcome:** every Must-have feature works end to end except deployment. Admin user management and the AI-usage view (originally Sprint 4, P2) were built early in light versions.

## Sprint 3 (14 – 20 Oct): deploy, test with users, evidence

| # | Item | Priority | Est. | Done when |
|---|---|---|---|---|
| 1 | **Deploy**: frontend on Vercel (`/api` rewrite to the backend), backend on Render, Aiven MySQL. Set `NODE_ENV=production`, `TRUST_PROXY=1`, `CLIENT_URL`, secrets. Host the backend in a region close to the database (bug log #9). | P1 | 1 day | Live URL works end to end: sign up, quest, AI reply, sign out |
| 2 | Usability test with 2–3 people outside the project ([template](usability-test.md)) | P1 | 0.5 day | Notes written up; issues logged in the [bug log](bug-log.md) |
| 3 | Run the live AI suite (`npm run test:ai`) and keep its output; manual check of repeated "just give me the answer" requests at all three classes | P1 | 0.5 day | Output saved as evidence for the SMART "Mentor rule" and "Adaptive Ship AI" goals |
| 4 | Update this plan, the README and the board after the milestone | P1 | 1 hr | Docs match the app |
| 5 | Decide whether Decode the Transmission stays as a quest objective (the standalone decoder stays either way) | P2 | 1 hr | Decision recorded in [scope.md](scope.md) |
| 6 | Update the ERD diagram with migrations 001–004 ([erd-changes.md](erd-changes.md)) | P2 | 1 hr | New image in the proposal folder |
| 7 | Replace the temporary logo (`QuestackLogoTemp.png`) | P2 | 2 hrs | Final logo in the app and favicon |

## Sprint 4 (21 – 28 Oct): fix, polish, hand in

| # | Item | Priority | Est. | Done when |
|---|---|---|---|---|
| 8 | Fix issues from usability testing and the bug log | P1 | 2 days | No open P1 bugs |
| 9 | Accessibility pass: contrast, keyboard paths through every screen, reduced motion, screen-reader labels | P1 | 1 day | Every screen usable by keyboard; Lighthouse accessibility ≥ 90 |
| 10 | Responsive pass on phone and tablet widths (dashboard, sector, quest panes, decoder) | P2 | 1 day | No horizontal scroll at 375 px; quest panes stack |
| 11 | Lazy-load the decoder page so CodeMirror leaves the main bundle | P3 | 1 hr | Main bundle no longer includes CodeMirror |
| 12 | More content: one more quest per sector (e.g. arrays) | P3 | 0.5 day | Seeded and played through |
| 13 | Nice-to-haves if time allows: gear and avatar, Hive Assault | P3 | – | Only after 8–10 |
| 14 | Final docs: README, scope, risks, test notes, screenshots; demo rehearsal | P1 | 1 day | Hand-in checklist complete |

## Testing throughout

- `npm test` in both apps before every commit, and `npm run lint` in the Frontend.
- New backend routes get endpoint tests (auth, role, validation) like `Backend/tests/endpoints/*.test.ts`.
- New screens get page tests like `Frontend/tests/pages/*.test.tsx`.
- Smoke-test the live URL after every deploy.
