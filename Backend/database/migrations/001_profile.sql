-- =====================================================================
-- 001: Pilot profile
-- - users: bio, chosen title and current goal
-- - rewards: a stable `code` for each reward (used for icons and unlock rules)
-- - user_featured_rewards: the up-to-3 insignia shown on a profile
-- - seeds the two launch sectors and the eight insignia
-- Only adds; nothing existing is changed or removed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- rewards.code: the rewards table is still empty, so it can be required
-- ---------------------------------------------------------------------
ALTER TABLE rewards
  ADD COLUMN code VARCHAR(50) NOT NULL AFTER reward_id,
  ADD UNIQUE KEY uq_rewards_code (code);

-- ---------------------------------------------------------------------
-- users: profile fields
-- title_reward_id: the earned insignia shown as the pilot's title
-- goal_language_id: the sector the pilot is working towards clearing
-- Both are cleared (not blocked) if the reward or sector is deleted.
-- ---------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN bio              VARCHAR(160) NULL AFTER current_streak,
  ADD COLUMN title_reward_id  INT          NULL AFTER bio,
  ADD COLUMN goal_language_id INT          NULL AFTER title_reward_id,
  ADD CONSTRAINT fk_users_title_reward  FOREIGN KEY (title_reward_id)  REFERENCES rewards (reward_id)     ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_goal_language FOREIGN KEY (goal_language_id) REFERENCES languages (language_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- user_featured_rewards (the insignia a pilot shows off, in slots 1-3)
-- The backend only lets pilots feature insignia they have earned.
-- ---------------------------------------------------------------------
CREATE TABLE user_featured_rewards (
  user_id   INT     NOT NULL,
  slot      TINYINT NOT NULL,
  reward_id INT     NOT NULL,
  PRIMARY KEY (user_id, slot),
  UNIQUE KEY uq_featured_user_reward (user_id, reward_id),
  CONSTRAINT chk_featured_slot CHECK (slot BETWEEN 1 AND 3),
  CONSTRAINT fk_featured_user   FOREIGN KEY (user_id)   REFERENCES users (user_id)     ON DELETE CASCADE,
  CONSTRAINT fk_featured_reward FOREIGN KEY (reward_id) REFERENCES rewards (reward_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Launch sectors. The ids match the frontend's mock sectors (1 = C#, 2 = JavaScript).
-- ---------------------------------------------------------------------
INSERT INTO languages (language_id, name, display_name, description, display_order) VALUES
  (1, 'csharp',     'C#',         'Strongly typed and object oriented. The backbone of the fleet.', 1),
  (2, 'javascript', 'JavaScript', 'The language of the web. Fast moving and full of surprises.',     2);

-- ---------------------------------------------------------------------
-- Insignia. unlock_condition is read by the backend: "<stat>>=<number>",
-- where <stat> is one of the pilot stats in src/services/profileService.ts.
-- ---------------------------------------------------------------------
INSERT INTO rewards (code, name, description, icon, reward_type, unlock_condition) VALUES
  ('first-deploy',   'First Deploy',   'Clear your first quest.',                     'first-deploy',   'insignia', 'quests_cleared>=1'),
  ('bug-hunter',     'Bug Hunter',     'Squash 10 bugs.',                             'bug-hunter',     'insignia', 'bugs_squashed>=10'),
  ('curious-mind',   'Curious Mind',   'Ask the Ship''s AI 25 questions.',            'curious-mind',   'insignia', 'ai_questions>=25'),
  ('streak-5',       '5-Day Streak',   'Deploy 5 days in a row.',                     'streak-5',       'insignia', 'longest_streak>=5'),
  ('decoder',        'Decoder',        'Decode 5 transmissions.',                     'decoder',        'insignia', 'transmissions_decoded>=5'),
  ('hive-breaker',   'Hive Breaker',   'Clear a Hive Assault.',                       'hive-breaker',   'insignia', 'hive_assaults>=1'),
  ('sector-cleared', 'Sector Cleared', 'Clear every quest in a sector.',              'sector-cleared', 'insignia', 'sectors_cleared>=1'),
  ('commander',      'Commander',      'Reach Commander rank in any sector.',         'commander',      'insignia', 'commander_ranks>=1');
