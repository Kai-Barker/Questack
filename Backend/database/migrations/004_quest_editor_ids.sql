-- =====================================================================
-- 004: Quest editor ids
-- Seeded quests use fixed ids below 1000, and their objectives use
-- questId * 100 + order (so below 100000). Quests and objectives made in the
-- admin quest editor start above both ranges, so adding a quest to the seed
-- file later can never overwrite one an admin wrote.
-- Only changes the next auto-increment values; no rows are touched.
-- =====================================================================

ALTER TABLE quests     AUTO_INCREMENT = 1000;
ALTER TABLE challenges AUTO_INCREMENT = 1000000;
