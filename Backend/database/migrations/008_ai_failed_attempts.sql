-- =====================================================================
-- 008: Failed Ship's AI attempts in the usage log
-- generate() works through a list of Gemini models (bug log #34), and every
-- attempt that gets no reply still counts against the free quota. Those
-- attempts are now logged too, so the admin console can show them apart from
-- successes. Successes keep one row per request (outcome 'success', the
-- default, so existing rows stay correct); each failed attempt gets its own
-- row with the exact model and the status it failed with (429 rate limited,
-- 408 timed out, 5xx busy, NULL for a network error).
-- =====================================================================

ALTER TABLE ai_usage_logs
  ADD COLUMN outcome      ENUM('success', 'failed') NOT NULL DEFAULT 'success' AFTER model,
  ADD COLUMN model_name   VARCHAR(64) NULL AFTER outcome,
  ADD COLUMN error_status SMALLINT    NULL AFTER model_name;
