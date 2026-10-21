-- =====================================================================
-- 006: Other lines a bug hunt also accepts
-- Many bugs can be fixed in more than one place (e.g. converting text to a
-- number where it's added, or storing it as a number where it's declared).
-- alt_bug_lines lists the other lines that count as finding the bug, as
-- comma-separated line numbers (e.g. '1,7'). NULL means only bug_line counts.
-- Like bug_line, it's checked on the server and never sent to the browser.
-- =====================================================================

ALTER TABLE code_challenge_details
  ADD COLUMN alt_bug_lines VARCHAR(100) NULL AFTER bug_line;
