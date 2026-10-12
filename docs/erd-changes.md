# Schema changes since the ERD

The base schema (`Backend/database/schema/schema.sql`) matches the proposal's ERD table for table: `users`, `languages`, `user_language_progress`, `quests`, `quest_prerequisites`, `quest_attempts`, `challenges`, `code_challenge_details`, `architecture_challenge_details`, `challenge_answers`, `rewards`, `user_rewards` and `ai_usage_logs`.

Later changes are numbered migrations in `Backend/database/migrations/`, applied with `npm run db:migrate`. Each runs once and is recorded in `schema_migrations`. They only **add**: no ERD table or column has been removed.

## 001: Pilot profile

| Change | Why |
|---|---|
| `rewards.code` (unique) | A stable key for each reward, used for icons and unlock rules instead of database ids |
| `users.bio`, `users.title_reward_id` → `rewards`, `users.goal_language_id` → `languages` | Profile wireframe: bio, chosen title, current goal |
| **New table `user_featured_rewards`** (`user_id`, `slot` 1-3, `reward_id`) | The up-to-3 insignia featured on a profile |
| Seeds the two launch sectors (C#, JavaScript) and 8 insignia | Content the app needs to run |

## 002: Quests in the database and boosters

| Change | Why |
|---|---|
| `quests.created_by` becomes nullable (`ON DELETE SET NULL`) | Seeded quests have no author, and deleting an admin shouldn't delete their quests |
| `quests.reward_id` → `rewards` | A quest can grant a booster on its first clear |
| `code_challenge_details.file_name`; `code_snippet` and `answer_key` nullable | The code tab's file name. Decode objectives have no snippet or key (the pilot brings the code) |
| `rewards.xp_multiplier`, `rewards.booster_charges` | Booster settings (Nice-to-have, built early) |
| **New table `user_boosters`** | Boosters a pilot owns, when they were activated, and charges left |
| Indexes on `quest_attempts (user_id, completed_at)` and `challenge_answers (challenge_id)` | Per-pilot progress queries |
| `ai_usage_logs.feature` gains `debrief` | The mission debrief is an AI feature too |

## 003: Standalone decoder

| Change | Why |
|---|---|
| **New table `transmission_decodes`** (`user_id`, `language_id`, `code_hash` CHAR(64), `decoded_at`; unique per `user_id` + `code_hash`) | Counts comprehension checks passed on the standalone decoder towards the Decoder insignia. Only a SHA-256 hash is kept, never the code (privacy), and the unique key stops the same code counting twice. |

## Updated ERD (additions only)

```
users ──< user_featured_rewards >── rewards
users ──< user_boosters >────────── rewards
users ──< transmission_decodes >─── languages
quests >── rewards            (quests.reward_id: booster granted on first clear)
users  >── rewards            (users.title_reward_id)
users  >── languages          (users.goal_language_id)
```

The dbdiagram.io ERD should be updated with these before the final hand-in (see the [sprint plan](sprint-plan.md)).
