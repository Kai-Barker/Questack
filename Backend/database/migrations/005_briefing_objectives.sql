-- =====================================================================
-- 005: Intel briefing objectives
-- A briefing is reading material with no question: its Markdown lives in
-- challenges.instructions, and the pilot clears it by confirming they've
-- read it (no answer key, marking criteria or AI marking).
-- Only widens the enum; no rows are touched.
-- =====================================================================

ALTER TABLE challenges
  MODIFY challenge_type ENUM('read_and_explain', 'bug_hunt', 'decode_transmission', 'architecture', 'briefing') NOT NULL;
