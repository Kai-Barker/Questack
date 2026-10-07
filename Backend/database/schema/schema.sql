-- =====================================================================
-- Questack database schema (MySQL 8)
-- Built from the ERD. Tables are ordered so every foreign key points
-- at a table that already exists.
--
-- Run against an empty database. Re-running will fail on existing
-- tables, which is deliberate so real data is never wiped by accident.
--
-- Later changes live in database/migrations (npm run db:migrate). Run
-- those after this file to bring a new database up to date.
-- =====================================================================

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id        INT          NOT NULL AUTO_INCREMENT,
  username       VARCHAR(50)  NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  level          INT          NOT NULL DEFAULT 1,
  total_xp       INT          NOT NULL DEFAULT 0,
  current_streak INT          NOT NULL DEFAULT 0,
  last_active    DATETIME     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- languages (shown as "sectors" in the UI, e.g. "C# Sector")
-- ---------------------------------------------------------------------
CREATE TABLE languages (
  language_id   INT          NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  description   TEXT         NULL,
  display_order INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (language_id),
  UNIQUE KEY uq_languages_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- user_language_progress (a user's proficiency and XP within one language)
-- ---------------------------------------------------------------------
CREATE TABLE user_language_progress (
  progress_id       INT      NOT NULL AUTO_INCREMENT,
  user_id           INT      NOT NULL,
  language_id       INT      NOT NULL,
  proficiency_level ENUM('cadet', 'pilot', 'commander') NOT NULL DEFAULT 'cadet',
  language_xp       INT      NOT NULL DEFAULT 0,
  started_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (progress_id),
  UNIQUE KEY uq_progress_user_language (user_id, language_id),
  CONSTRAINT fk_progress_user     FOREIGN KEY (user_id)     REFERENCES users (user_id)         ON DELETE CASCADE,
  CONSTRAINT fk_progress_language FOREIGN KEY (language_id) REFERENCES languages (language_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- quests
-- ---------------------------------------------------------------------
CREATE TABLE quests (
  quest_id      INT          NOT NULL AUTO_INCREMENT,
  language_id   INT          NOT NULL,
  title        VARCHAR(150) NOT NULL,
  concept       VARCHAR(100) NOT NULL,
  difficulty    ENUM('easy', 'medium', 'hard') NOT NULL,
  status        ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  is_side_quest BOOLEAN      NOT NULL DEFAULT FALSE,
  story_text    TEXT         NULL,
  xp_reward     INT          NOT NULL DEFAULT 0,
  display_order INT          NOT NULL DEFAULT 0,
  created_by    INT          NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (quest_id),
  KEY idx_quests_language (language_id),
  -- Languages and admins can't be deleted while they still own quests
  CONSTRAINT fk_quests_language   FOREIGN KEY (language_id) REFERENCES languages (language_id) ON DELETE RESTRICT,
  CONSTRAINT fk_quests_created_by FOREIGN KEY (created_by)  REFERENCES users (user_id)         ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- quest_prerequisites (quest_id is locked until prerequisite_quest_id is cleared)
-- Circular prerequisites are blocked in the backend when saving.
-- ---------------------------------------------------------------------
CREATE TABLE quest_prerequisites (
  quest_id              INT NOT NULL,
  prerequisite_quest_id INT NOT NULL,
  PRIMARY KEY (quest_id, prerequisite_quest_id),
  CONSTRAINT fk_prereq_quest        FOREIGN KEY (quest_id)              REFERENCES quests (quest_id) ON DELETE CASCADE,
  CONSTRAINT fk_prereq_prerequisite FOREIGN KEY (prerequisite_quest_id) REFERENCES quests (quest_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- quest_attempts (one run of a quest by a user)
-- ---------------------------------------------------------------------
CREATE TABLE quest_attempts (
  attempt_id   INT      NOT NULL AUTO_INCREMENT,
  user_id      INT      NOT NULL,
  quest_id     INT      NOT NULL,
  started_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  xp_earned    INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (attempt_id),
  KEY idx_attempts_user_quest (user_id, quest_id),
  CONSTRAINT fk_attempts_user  FOREIGN KEY (user_id)  REFERENCES users (user_id)   ON DELETE CASCADE,
  CONSTRAINT fk_attempts_quest FOREIGN KEY (quest_id) REFERENCES quests (quest_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- challenges (the objectives inside a quest)
-- ---------------------------------------------------------------------
CREATE TABLE challenges (
  challenge_id    INT  NOT NULL AUTO_INCREMENT,
  quest_id        INT  NOT NULL,
  challenge_order INT  NOT NULL,
  challenge_type  ENUM('read_and_explain', 'bug_hunt', 'decode_transmission', 'architecture') NOT NULL,
  instructions    TEXT NOT NULL,
  PRIMARY KEY (challenge_id),
  KEY idx_challenges_quest (quest_id, challenge_order),
  CONSTRAINT fk_challenges_quest FOREIGN KEY (quest_id) REFERENCES quests (quest_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- code_challenge_details (read_and_explain / bug_hunt; 1-to-1 with challenges)
-- ---------------------------------------------------------------------
CREATE TABLE code_challenge_details (
  challenge_id    INT  NOT NULL,
  code_snippet    TEXT NOT NULL,
  answer_key      TEXT NOT NULL,
  marking_criteria TEXT NOT NULL,
  bug_line        INT  NULL,
  PRIMARY KEY (challenge_id),
  CONSTRAINT fk_code_details_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- architecture_challenge_details (architecture quests; 1-to-1 with challenges)
-- ---------------------------------------------------------------------
CREATE TABLE architecture_challenge_details (
  challenge_id     INT  NOT NULL,
  scenario         TEXT NOT NULL,
  requirements     TEXT NOT NULL,
  marking_criteria TEXT NOT NULL,
  PRIMARY KEY (challenge_id),
  CONSTRAINT fk_arch_details_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- challenge_answers (a user's answer to one challenge within an attempt)
-- ---------------------------------------------------------------------
CREATE TABLE challenge_answers (
  answer_id    INT      NOT NULL AUTO_INCREMENT,
  attempt_id   INT      NOT NULL,
  challenge_id INT      NOT NULL,
  answer_text  TEXT     NULL,
  ai_feedback  TEXT     NULL,
  is_correct   BOOLEAN  NOT NULL DEFAULT FALSE,
  hints_used   INT      NOT NULL DEFAULT 0,
  answered_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (answer_id),
  KEY idx_answers_attempt (attempt_id),
  CONSTRAINT fk_answers_attempt   FOREIGN KEY (attempt_id)   REFERENCES quest_attempts (attempt_id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- rewards (insignia, gear and boosters that can be earned)
-- ---------------------------------------------------------------------
CREATE TABLE rewards (
  reward_id        INT          NOT NULL AUTO_INCREMENT,
  name             VARCHAR(100) NOT NULL,
  description      TEXT         NULL,
  icon             VARCHAR(255) NULL,
  reward_type      ENUM('insignia', 'gear', 'booster') NOT NULL,
  unlock_condition VARCHAR(255) NOT NULL,
  PRIMARY KEY (reward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- user_rewards (which rewards each user has earned)
-- ---------------------------------------------------------------------
CREATE TABLE user_rewards (
  user_id   INT      NOT NULL,
  reward_id INT      NOT NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, reward_id),
  CONSTRAINT fk_user_rewards_user   FOREIGN KEY (user_id)   REFERENCES users (user_id)     ON DELETE CASCADE,
  CONSTRAINT fk_user_rewards_reward FOREIGN KEY (reward_id) REFERENCES rewards (reward_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ai_usage_logs (every Gemini call, for cost control and misuse checks)
-- ---------------------------------------------------------------------
CREATE TABLE ai_usage_logs (
  log_id        INT      NOT NULL AUTO_INCREMENT,
  user_id       INT      NOT NULL,
  feature       ENUM('hint', 'mentor_chat', 'answer_evaluation', 'decode_transmission') NOT NULL,
  model         ENUM('flash', 'flash_lite') NOT NULL,
  input_tokens  INT      NOT NULL DEFAULT 0,
  output_tokens INT      NOT NULL DEFAULT 0,
  flagged       BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_ai_logs_user_created (user_id, created_at),
  CONSTRAINT fk_ai_logs_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
