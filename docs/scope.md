# Scope: frozen feature list

**Frozen at the milestone check (14 Oct 2026).** Must-haves are fixed from here to the final hand-in (28 Oct 2026). New ideas go to Nice-to-have or Future and are only picked up once every Must-have is done.

Status key: ✅ done · 🟡 partly done (what's left is in the [sprint plan](sprint-plan.md)) · ⬜ not started

## Must-have (MVP)

| Feature | Status | Notes |
|---|---|---|
| Registration, login, logout and profile | ✅ | JWT httpOnly cookie, bcrypt, rate limits. Profile with stats, insignia, XP history and flight log. |
| User roles (user / admin) | ✅ | `requireAdmin` on `/api/admin/*`, admin-only nav tab and console, `db:make-admin` script |
| Onboarding: language, proficiency class, starting concept | ✅ | `/onboarding`, shown automatically to pilots with no sector |
| Galaxy Map with sectors, quests and unlocked progress | ✅ | Map and list views |
| Sector Map with locked, available and cleared quests | ✅ | Layout worked out from prerequisites |
| Read and explain quests, marked by the AI | ✅ | Marked against an admin-written answer key and criteria |
| Bug hunt quests | ✅ | The pilot marks the line; the server checks it, never the model |
| Decode the Transmission | ✅ | As a quest objective, and as a standalone decoder (see changes) |
| Ship's AI with level-adapted explanations and tiered hints | ✅ | Cadet, Pilot and Commander styles; 3 hint tiers; switchable at any time |
| XP, levels and progress tracking | ✅ | Levels from total XP; quest unlocking by prerequisites |
| Quest results screen | ✅ | Mission debrief modal: XP, unlocks, AI debrief |
| Settings | ✅ | Account details, class per sector, sign out |
| Admin tools to create and manage quests | 🟡 | Role enforcement and admin console done. **Quest editor next sprint.** Quests are seeded from `Backend/database/seeds/questContent.ts` until then. |
| Content: each sector covers variables, conditionals, loops, functions | ✅ | C#: Variables, Data types, Loops, Switch, Functions. JS: Variables, Data types, Conditionals, Loops, Functions. |
| Deployment | ⬜ | First item of Sprint 3 (week of 14 Oct), see the [sprint plan](sprint-plan.md) |

## Nice-to-have

| Feature | Status |
|---|---|
| Daily streaks | ✅ (built early: shown on the dashboard and profile) |
| Badges (insignia) | ✅ (built early: 8 insignia with unlock rules, featured on the profile) |
| Boosters (Overdrive Core, 2× XP) | ✅ (built early) |
| Gear and avatar customisation | ⬜ |
| Hive assaults (multi-concept tests) | ⬜ |
| Architecture design quests | ⬜ (schema tables exist from the ERD) |
| Debrief quests (solve, then justify) | ⬜ |
| Leaderboards | ⬜ |
| Additional sectors (Python, TypeScript) | ⬜ (sectors are data, so adding one is a seed change) |
| Admin user management and AI-usage view | ⬜ (the console shows usage totals today) |

## Future considerations

- Codebase navigation quests (find where a change goes in a multi-file project)
- Educator role to assign quests and track a class
- Community-created quests
- Electron desktop version
- Revocable sessions (a `session_version` claim checked in `requireAuth`)

## Changes since the pitch

| Change | Reason |
|---|---|
| **The splash screen is the landing page.** It shows the logo and tagline and offers *Registered pilot* (login) or *New recruit* (enlist). | The splash already introduces Questack and checks that the backend and database are reachable before anyone signs in. A separate landing page would have repeated it. |
| **Onboarding is its own step after enlisting**, not part of the sign-up form. Any account with no sector is sent there. | Keeps sign-up short. It also catches existing accounts that never chose a sector (the "Has adventurer?" check in the user flow). |
| **Decode the Transmission comes in two forms.** Inside quests it is a graded objective that earns XP. The **standalone decoder** (`/decoder`) is *not* a quest: no XP or quest progress, but passing its comprehension check counts towards the Decoder insignia. | The SMART "Code learning" objective is about understanding any code the learner brings, whenever they need it. Tying that to quest progress would gate it behind unlocks. |
| **The admin quest editor moves to the next sprint.** Roles are enforced now and quests are seeded from code. | The learner loop (the core of the MVP and of the AI marks) came first. Seeded content let every quest type be tested end to end. |
| **Streaks, insignia and boosters were built early** (Nice-to-have). | They were cheap once XP tracking existed and they fill out the profile wireframe. Nothing Must-have was delayed for them. |
| **Gemini Flash is pinned to a version, with automatic fallback to Flash-Lite.** | The newest Flash builds were often overloaded on the free tier (see [risks.md](risks.md)). |
| **Schema additions** (featured insignia, boosters, decoder records). | See [erd-changes.md](erd-changes.md). |
