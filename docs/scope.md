# Scope: frozen feature list

**Frozen at the milestone check (14 Oct 2026).** Must-haves are fixed from here to the final hand-in (28 Oct 2026). New ideas go to Nice-to-have or Future and are only picked up once every Must-have is done.

Status key: ✅ done · 🟡 partly done (what's left is in the [sprint plan](sprint-plan.md)) · ⬜ not started

## Must-have (MVP)

| Feature | Status | Notes |
|---|---|---|
| Registration, login, logout and profile | ✅ | JWT httpOnly cookie, bcrypt, rate limits. Profile with stats, insignia, XP history and flight log. |
| User roles (user / admin) | ✅ | `requireAdmin` on every `/api/admin/*` route (the role is re-read from the database on each request), per-admin rate limits, and an admin console with its own nav that re-checks the role with the server on entry and on every tab change. `db:make-admin` script. |
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
| Admin tools to create and manage quests | ✅ | Quest editor (Admin › Quests): quest list per sector with search, create and edit, publish or hide as a draft, delete drafts no pilot has played, prerequisites with a same-sector rule and a circular-chain check, objectives by type (read and explain, bug hunt, decode) with reordering, preview as a pilot sees it, and an unsaved-changes guard. Changes reach pilots on their next request. The launch quests are still seeded from `Backend/database/seeds/questContent.ts`; editor-made quests start at id 1000 so the seed never overwrites them. |
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
| Admin user management and AI-usage view | 🟡 Light versions built early: Admin › Users lists pilots (search, level, last active) and deactivates or reactivates them, locking them out on their next request; Admin › AI shows fleet totals and the last 50 Ship's AI calls (counts only, no text). Not done: changing roles from the console, per-pilot or per-feature usage breakdowns. |

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
| **The admin quest editor moved to Sprint 3.** Roles were enforced first and quests were seeded from code; the editor followed. | The learner loop (the core of the MVP and of the AI marks) came first. Seeded content let every quest type be tested end to end. |
| **The admin console has its own nav** (Quests, Users, AI, Exit Admin) instead of being one page in the pilot app. | Admin work is a separate mode: it doesn't need the pilot's XP bar or an enlisted sector, and the console re-checks the role each time it's entered. |
| **Published quests can't be deleted, only moved back to draft.** Drafts can be deleted only if no pilot has played them. | Deleting a quest would also delete pilots' attempts and flight-log history. A draft is hidden from pilots, which is all an admin needs. |
| **Admin user management and the AI-usage view were built early** (Nice-to-have), in light versions. | They were small once the admin console and its role checks existed, and they make the admin role worth demoing. |
| **Streaks, insignia and boosters were built early** (Nice-to-have). | They were cheap once XP tracking existed and they fill out the profile wireframe. Nothing Must-have was delayed for them. |
| **Gemini Flash is pinned to a version, with automatic fallback to Flash-Lite.** | The newest Flash builds were often overloaded on the free tier (see [risks.md](risks.md)). |
| **Schema additions** (featured insignia, boosters, decoder records) and editor id ranges (migration 004). | See [erd-changes.md](erd-changes.md). |
