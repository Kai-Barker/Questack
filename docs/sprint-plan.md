# Sprint plan: milestone to final hand-in

| | Dates | Goal |
|---|---|---|
| **Milestone check** | Wed 14 Oct 2026 | Core learner loop, AI, roles and docs demoed |
| **Sprint 3** | 14 – 20 Oct | Deploy early, admin quest editor, usability testing |
| **Sprint 4** | 21 – 28 Oct | Fix what testing finds, polish, accessibility, final docs |
| **Final hand-in** | Wed 28 Oct 2026 | |

Priority: **P1** must ship (MVP), **P2** should ship, **P3** only if time allows. Each item is a card on the board. Move it to Done only once it's tested.

## Sprint 3 (14 – 20 Oct): deploy, admin tools, test with users

| # | Item | Priority | Est. | Done when |
|---|---|---|---|---|
| 1 | **Deploy**: frontend on Vercel (`/api` rewrite to the backend), backend on Render, Aiven MySQL. Set `NODE_ENV=production`, `TRUST_PROXY=1`, `CLIENT_URL`, secrets. | P1 | 1 day | Live URL works end to end: sign up, quest, AI reply, sign out |
| 2 | **Admin quest editor, backend**: list, get, create and update quests with objectives and details; publish and draft; prerequisites with a cycle check. All under `requireAdmin`. | P1 | 1.5 days | Endpoint tests for 403 (pilot) and 200 (admin), validation and cycle rejection |
| 3 | **Admin quest editor, frontend** (from the wireframe): quest list, details form, objective editor by type, preview | P1 | 2 days | An admin creates and publishes a quest and it appears on the sector map |
| 4 | Usability test with 2–3 people outside the project ([template](usability-test.md)) | P1 | 0.5 day | Notes written up; issues logged in the [bug log](bug-log.md) |
| 5 | Run the live AI suite (`npm run test:ai`) and keep its output; manual check of repeated "just give me the answer" requests at all three classes | P1 | 0.5 day | Output saved as evidence for the SMART "Mentor rule" and "Adaptive Ship AI" goals |
| 6 | Update the ERD diagram with migrations 001–003 ([erd-changes.md](erd-changes.md)) | P2 | 1 hr | New image in the proposal folder |
| 7 | Replace the temporary logo (`QuestackLogoTemp.png`) | P2 | 2 hrs | Final logo in the app and favicon |

## Sprint 4 (21 – 28 Oct): fix, polish, hand in

| # | Item | Priority | Est. | Done when |
|---|---|---|---|---|
| 8 | Fix issues from usability testing and the bug log | P1 | 2 days | No open P1 bugs |
| 9 | Accessibility pass: contrast, keyboard paths through every screen, reduced motion, screen-reader labels | P1 | 1 day | Every screen usable by keyboard; Lighthouse accessibility ≥ 90 |
| 10 | Responsive pass on phone and tablet widths (dashboard, sector, quest panes, decoder) | P2 | 1 day | No horizontal scroll at 375 px; quest panes stack |
| 11 | Admin: user list (activate/deactivate) and AI-usage table from `ai_usage_logs` | P2 | 1 day | Admin can deactivate a pilot, who is locked out at once |
| 12 | More content: one more quest per sector (e.g. arrays) | P3 | 0.5 day | Seeded and played through |
| 13 | Nice-to-haves if time allows: gear and avatar, Hive Assault | P3 | – | Only after 8–11 |
| 14 | Final docs: README, scope, risks, test notes, screenshots; demo rehearsal | P1 | 1 day | Hand-in checklist complete |

## Testing throughout

- `npm test` in both apps before every commit, and `npm run lint` in the Frontend.
- New backend routes get endpoint tests (auth, role, validation) like `Backend/tests/endpoints/*.test.ts`.
- New screens get page tests like `Frontend/tests/pages/*.test.tsx`.
- Smoke-test the live URL after every deploy.
