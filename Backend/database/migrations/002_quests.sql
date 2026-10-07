-- =====================================================================
-- 002: Quests in the database, real progress and boosters
-- - quests can be seeded without an author (created_by is optional)
-- - code_challenge_details: file name for the code tab; decode objectives
--   have no snippet or answer key of their own
-- - boosters: multiplier and charges on the reward, which quest grants one,
--   and each pilot's boosters
-- - indexes for the per-pilot progress queries
-- Quest content itself is seeded by `npm run db:seed` (database/seedQuests.ts).
-- =====================================================================

-- ---------------------------------------------------------------------
-- quests: seeded content has no author. Deleting an admin keeps their quests.
-- ---------------------------------------------------------------------
ALTER TABLE quests DROP FOREIGN KEY fk_quests_created_by;
ALTER TABLE quests
  MODIFY created_by INT NULL,
  ADD COLUMN reward_id INT NULL AFTER xp_reward,
  ADD CONSTRAINT fk_quests_created_by FOREIGN KEY (created_by) REFERENCES users (user_id)   ON DELETE SET NULL,
  ADD CONSTRAINT fk_quests_reward     FOREIGN KEY (reward_id)  REFERENCES rewards (reward_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- code_challenge_details
-- ---------------------------------------------------------------------
ALTER TABLE code_challenge_details
  ADD COLUMN file_name VARCHAR(100) NULL AFTER challenge_id,
  MODIFY code_snippet TEXT NULL,
  MODIFY answer_key   TEXT NULL;

-- ---------------------------------------------------------------------
-- rewards: booster settings (only set when reward_type = 'booster')
-- ---------------------------------------------------------------------
ALTER TABLE rewards
  ADD COLUMN xp_multiplier   DECIMAL(3, 1) NULL AFTER unlock_condition,
  ADD COLUMN booster_charges TINYINT       NULL AFTER xp_multiplier;

-- ---------------------------------------------------------------------
-- user_boosters: boosters a pilot owns. activated_at stays NULL until the
-- pilot activates it on their profile; it runs until charges_remaining is 0.
-- ---------------------------------------------------------------------
CREATE TABLE user_boosters (
  booster_id        INT      NOT NULL AUTO_INCREMENT,
  user_id           INT      NOT NULL,
  reward_id         INT      NOT NULL,
  charges_remaining TINYINT  NOT NULL,
  acquired_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at      DATETIME NULL,
  PRIMARY KEY (booster_id),
  KEY idx_boosters_user_active (user_id, activated_at),
  CONSTRAINT fk_boosters_user   FOREIGN KEY (user_id)   REFERENCES users (user_id)     ON DELETE CASCADE,
  CONSTRAINT fk_boosters_reward FOREIGN KEY (reward_id) REFERENCES rewards (reward_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Indexes for the progress queries
-- ---------------------------------------------------------------------
ALTER TABLE quest_attempts    ADD KEY idx_attempts_user_completed (user_id, completed_at);
ALTER TABLE challenge_answers ADD KEY idx_answers_challenge (challenge_id);

-- ---------------------------------------------------------------------
-- ai_usage_logs: the mission debrief is an AI feature too
-- ---------------------------------------------------------------------
ALTER TABLE ai_usage_logs
  MODIFY feature ENUM('hint', 'mentor_chat', 'answer_evaluation', 'decode_transmission', 'debrief') NOT NULL;
