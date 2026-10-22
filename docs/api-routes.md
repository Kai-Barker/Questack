# API routes

Base URL: `/api`. Every response is JSON. Errors look like `{ "error": "message" }`; validation errors also carry `fields: { field: message }`.

**Auth:** the session is a JWT in the httpOnly cookie `questack_session`, set by login or register. There is no user id in any URL: every signed-in route acts on the pilot in the session.

**Role:** `user` or `admin` (`users.role`). It is re-read from the database on every request, so a role change or deactivation applies straight away.

## Public

| Method | Path | Body | Notes | Rate limit |
|---|---|---|---|---|
| GET | `/health` | none | `200 { status: "ok", database: "connected" }` or `503 degraded`. Used by the splash screen. | 30/min per IP |
| POST | `/auth/register` | `{ callsign, email, password, acceptTerms: true }` | `201 { user }` and sets the session cookie. `409` if the callsign or email is taken. | 5/hour per IP |
| POST | `/auth/login` | `{ identifier, password, remember? }` | `identifier` is a callsign or email. `401` on any failure (one generic message). | 10/15 min per IP, 5/15 min per account |
| POST | `/auth/logout` | none | Clears the cookie. `204`. | none |

## Signed in (any role)

All of these run `appIpLimiter` (300/min per IP) first, then `requireAuth`. Without a valid session they return `401`.

### Account and pilot

| Method | Path | Body | Notes | Rate limit |
|---|---|---|---|---|
| GET | `/auth/me` | none | The signed-in account `{ userId, username, email, role }` | IP only |
| GET | `/pilot/me` | none | Nav and dashboard summary: level, XP, rank, sectors enlisted, booster, equipped frame and visor | 120/min per pilot |
| GET | `/profile/me` | none | Full profile: stats, insignia, flight log, XP history, gear (frames and visors, each with `earned`), loadout | 120/min |
| PATCH | `/profile/me` | `{ bio?, titleId?, goalLanguageId?, frameId?, visorId?, featuredIds? }` | Strict: any other field is rejected (e.g. `role`). Gear must be unlocked and in the right slot; `null` goes back to the Standard item. | 20/15 min |
| PATCH | `/profile/me/callsign` | `{ callsign, password }` | Needs the current access code | 5/day |
| POST | `/profile/me/boosters/:boosterId/activate` | none | Starts an owned booster | 30/15 min |

### Galaxy Map, sectors and quests

| Method | Path | Body | Notes | Rate limit |
|---|---|---|---|---|
| GET | `/dashboard` | none | Every sector with the pilot's progress, plus the mission to continue | 120/min |
| GET | `/sectors/:id` | none | One sector's quests with locked, available and cleared state. `404` if unknown. | 120/min |
| PATCH | `/sectors/:id/rank` | `{ proficiencyLevel: "cadet" \| "pilot" \| "commander" }` | Sets the pilot's class in a sector, enlisting them if new (used by onboarding and settings). `204`. | 30/15 min |
| GET | `/quests/:id` | none | A quest to play: objectives and code, never answer keys. `403` while locked. | 120/min |
| POST | `/quests/:id/complete` | none | Clears the quest once every objective is answered correctly. Awards XP, levels and boosters. On a first clear, an equipped XP visor multiplies the XP with any booster and is returned as `visor: { name, xpMultiplier }`. | 20/15 min |

### Ship's AI (Gemini)

Mounted at `/ai`, behind `requireAuth` plus two per-pilot limits: **40 per 10 minutes** and **150 per day**. These protect the free-tier quota. Every call is logged to `ai_usage_logs` (feature, model, token counts; never the pilot's text). Failures: `503` when Gemini is unavailable, `502` when its reply can't be used.

| Method | Path | Body | Model | Returns |
|---|---|---|---|---|
| POST | `/ai/hint` | `{ challengeId, proficiency, tier: 1-3, answerDraft?, pastedCode? }` | Flash-Lite | `{ hint }` |
| POST | `/ai/chat` | `{ challengeId, proficiency, messages[≤20], pastedCode? }` | Flash | `{ reply }` |
| POST | `/ai/evaluate` | `{ challengeId, proficiency, answer, selectedLine?, hintsUsed?, pastedCode? }` | Flash | `{ correct, feedback, guidingQuestion? }`, saved to progress |
| POST | `/ai/decode` | `{ challengeId, proficiency, code }` | Flash | `{ sections: [{ lines, explanation }] }` (decode objective in a quest) |
| POST | `/ai/debrief` | `{ questId, proficiency, objectives[] }` | Flash-Lite | `{ debrief }` (quest must be cleared) |
| POST | `/ai/decoder` | `{ languageId, proficiency, code }` | Flash | `{ sections, question, checkToken }`: the standalone decoder (not a quest) |
| POST | `/ai/decoder/chat` | `{ languageId, proficiency, code, messages[≤20], question? }` | Flash-Lite | `{ reply }` |
| POST | `/ai/decoder/check` | `{ proficiency, code, checkToken, answer }` | Flash | `{ correct, feedback, guidingQuestion?, counted }` |

Quest AI routes check that the objective belongs to a quest the pilot has unlocked (`403` otherwise) *before* calling Gemini, so a refused request costs nothing.

## Admin only

Mounted at `/admin` behind `appIpLimiter`, `requireAuth` and **`requireAdmin`**, so every route below re-reads the account's role from the database first. A signed-in pilot without the admin role gets **`403`** "Command clearance required, Pilot." before any query runs. Every response is `Cache-Control: no-store` (they include answer keys and pilots' details). Limits are per admin: reads share **120/min**, writes share **60 per 15 min**.

| Method | Path | Body | Returns | Limit |
|---|---|---|---|---|
| GET | `/admin/session` | | `{ user }`. The frontend calls it on entering the console and on every admin tab change. | read |
| GET | `/admin/overview` | | `{ pilots, activePilots, publishedQuests, draftQuests, aiCallsToday, aiTokensToday }`: totals only | read |
| GET | `/admin/sectors` | | `{ sectors: [{ languageId, name, displayName }] }` | read |
| GET | `/admin/quests` | | `{ quests }`: every quest, drafts included, with status and objective count | read |
| GET | `/admin/quests/:id` | | `{ quest }` with prerequisites and objectives, **including answer keys, marking criteria and bug lines** | read |
| POST | `/admin/quests` | quest (below) | `201 { quest }`. Added at the end of its sector. | write |
| PUT | `/admin/quests/:id` | quest (below) | `{ quest }`. Existing objectives keep their id (and pilots' answers); ones left out are deleted. | write |
| DELETE | `/admin/quests/:id` | | `204`. **Drafts only**, and only if no pilot has played it: `409` otherwise. Hide a published quest by saving it as a draft. | write |
| GET | `/admin/users` | | `{ users: [{ userId, callsign, email, role, isActive, level, totalXp, lastActive, createdAt }] }` | read |
| PATCH | `/admin/users/:id` | `{ isActive }` | `{ user }`. Locks the pilot out on their next request. `400` for your own account, `409` for another admin. | write |
| GET | `/admin/ai-usage` | | `{ usage }`: the last 50 Ship's AI calls (pilot, feature, model, tokens, flagged). No prompt or reply text is stored. | read |

**Quest body:** `{ languageId, title, concept, difficulty, status: 'draft' | 'published', isSideQuest, storyText, xpReward, prerequisiteIds[], objectives[] }`, where each objective is `{ challengeId?, type: 'read_and_explain' | 'bug_hunt' | 'decode_transmission', instructions, fileName?, codeSnippet?, answerKey?, markingCriteria, bugLine? }`. Unknown fields are rejected. The backend checks:

- Read-and-explain and bug-hunt objectives need a file name, code and an answer key; decode objectives never store any. A bug hunt's `bugLine` must be inside its code.
- Answer keys and marking criteria can't mention line numbers (the Ship's AI could repeat them).
- Publishing needs at least one objective, and every prerequisite published.
- Prerequisites must be in the same sector, and **circular chains are rejected** (`400` naming the loop).
- A published quest can't go back to draft while published quests depend on it, and a quest others depend on can't move sector (`409`).

Validation errors come back as `400 { error, fields }`, with objective fields keyed by position, e.g. `objectives.2.answerKey`. A save clears the quest catalog cache, so pilots see the change on their next request.

Re-running `npm run db:seed` overwrites edits to the seeded quests (ids below 1000). Quests created in the editor start at id 1000 (migration 004) and are never touched by the seed.

## Trying it

Make the requests from the app, or from Insomnia or Postman with the session cookie:

1. `POST /api/auth/login` with `{ "identifier": "...", "password": "..." }`. The response sets `questack_session`.
2. Send that cookie with the other requests (Insomnia keeps it automatically).
3. To test the role check, call `GET /api/admin/session` (or any admin route) with a normal pilot (expect `403`), then with an account promoted by `npm run db:make-admin -- <callsign>` (expect `200`).
