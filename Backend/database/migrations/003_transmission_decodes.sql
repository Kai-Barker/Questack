-- =====================================================================
-- 003: Standalone decoder
-- - transmission_decodes: one row per transmission a pilot decoded on the
--   standalone decoder (/decoder) and passed the comprehension check for.
--   Counts towards the Decoder insignia alongside decode quest objectives.
-- The pilot's code is never stored: only its SHA-256 hash, so the same
-- code can't be counted twice.
-- Only adds; nothing existing is changed or removed.
-- =====================================================================

CREATE TABLE transmission_decodes (
  decode_id   INT      NOT NULL AUTO_INCREMENT,
  user_id     INT      NOT NULL,
  language_id INT      NOT NULL,
  code_hash   CHAR(64) NOT NULL,
  decoded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (decode_id),
  UNIQUE KEY uq_decodes_user_code (user_id, code_hash),
  CONSTRAINT fk_decodes_user     FOREIGN KEY (user_id)     REFERENCES users (user_id)         ON DELETE CASCADE,
  CONSTRAINT fk_decodes_language FOREIGN KEY (language_id) REFERENCES languages (language_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
