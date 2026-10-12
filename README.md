# Questack

**Stack up your coding skills, one quest at a time.**

Questack is an AI-driven, sci-fi themed web app that teaches people to **read and understand code**, not just write it. Programming languages are *sectors*, lessons are *quests* made of objectives, and bugs are an alien *Swarm*. The **Ship's AI** (Google Gemini) mentors the learner at their level (Cadet, Pilot or Commander). It gives hints and asks guiding questions, but never writes the solution for them.

DV300 Theme 4: AI-Driven Application · Kai Barker (241065)

## Features

| Area | What's there |
|---|---|
| Accounts | Enlist (sign up), log in, log out. JWT in an httpOnly cookie, bcrypt-hashed access codes, rate-limited. |
| Roles | `user` and `admin`. Admin-only API routes (`requireAdmin`) and an admin-only nav link and console. |
| Onboarding | After enlisting: choose a first sector, proficiency class and starting concept. |
| Galaxy Map | Sectors with progress (map and list views), the mission to continue, and the pilot's status. |
| Sector Map | Quests laid out by prerequisites, with locked, available and cleared states, and rank per sector. |
| Quests | **Read and explain**, **bug hunt** (mark the faulty line) and **decode the transmission** objectives, marked by the Ship's AI against an admin-written answer key. |
| Ship's AI | Tiered hints (3 levels), mentor chat, answer marking, a mission debrief, and explanations adapted to the pilot's class. |
| Decoder | Paste any code and the Ship's AI walks you through it section by section, then sets a comprehension check. Not a quest; the code is never stored. |
| Progress | XP, levels, streaks, insignia, an XP history chart, and a flight log on the profile. |
| Settings | Account details, proficiency class per sector, sign out. |

## Tech stack

- **Frontend:** React 19 + Vite 8 + TypeScript, Tailwind CSS v4, CodeMirror 6, React Router 8
- **Backend:** Node.js + Express 5 + TypeScript, zod validation, express-rate-limit
- **Database:** MySQL 8 (Aiven)
- **AI:** Google Gemini API: Flash for heavier tasks, Flash-Lite for quick ones, with automatic fallback
- **Testing:** Vitest, Supertest (backend), Testing Library + MSW (frontend)

## Project layout

```
Backend/
  database/schema/schema.sql   base schema (from the ERD)
  database/migrations/         numbered changes applied after the schema
  database/seeds/              quest content (answer keys live only here and in the DB)
  src/                         Express app: routes -> controllers -> services -> models
  src/prompts/shipsAi.ts       every prompt the Ship's AI sees
  tests/                       unit + endpoint tests, plus a live Gemini suite
Frontend/
  src/pages, src/components    screens and UI
  src/services                 the only code that calls the API
  tests/                       component and page tests
docs/                          milestone documentation (see below)
```

## Running it locally

Prerequisites: Node.js 24 (what the project is developed on), a MySQL 8 database (the project uses Aiven), and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
# 1. Backend
cd Backend
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm run db:schema           # first time only: creates the tables
npm run db:migrate          # applies database/migrations (safe to re-run)
npm run db:seed             # loads the quests (safe to re-run)
npm run dev                 # API on http://localhost:3000

# 2. Frontend (new terminal)
cd Frontend
npm install
npm run dev                 # app on http://localhost:5173 (proxies /api to the backend)
```

The frontend reaches the API through Vite's `/api` proxy, so the session cookie stays first-party. Leave `VITE_API_URL` unset locally.

### Test accounts

Enlist accounts in the app, then promote one to admin:

```bash
cd Backend
npm run db:make-admin -- <callsign or email>            # grant admin
npm run db:make-admin -- <callsign or email> --revoke   # back to a regular pilot
```

| Account | Role | Purpose |
|---|---|---|
| *(your test pilot)* | user | Normal learner flow |
| *(your admin)* | admin | Shows the Admin tab and console |

## Tests

```bash
cd Backend
npm test                 # unit + endpoint tests (no database or network: all faked)
npm run test:typecheck
npm run test:ai          # LIVE Gemini tests: uses about 20 calls of the daily free quota

cd Frontend
npm test
npm run lint
```

## Documentation

| Doc | What it covers |
|---|---|
| [docs/scope.md](docs/scope.md) | Frozen MVP feature list and changes since the pitch |
| [docs/api-routes.md](docs/api-routes.md) | Every API route with its auth, role and rate limit |
| [docs/ai-prompt-design.md](docs/ai-prompt-design.md) | How the Ship's AI prompts and requests are designed, validated and made reliable |
| [docs/erd-changes.md](docs/erd-changes.md) | Schema changes since the proposal's ERD |
| [docs/risks.md](docs/risks.md) | Technical challenges from the pitch: what happened and what remains |
| [docs/sprint-plan.md](docs/sprint-plan.md) | Plan from the milestone to the final hand-in |
| [docs/bug-log.md](docs/bug-log.md) | Bug and issue log |
| [docs/usability-test.md](docs/usability-test.md) | Informal usability test notes |
