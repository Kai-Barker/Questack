-- =====================================================================
-- 007: Gear (avatar frames and visors)
-- - rewards: which loadout slot a piece of gear goes in, and a visor's perk
--   (the XP bonus reuses xp_multiplier)
-- - users: the frame and visor the pilot has equipped
-- - seeds the starter frames and visors
-- Gear is earned by unlock rules, like insignia, so nothing goes in user_rewards.
-- =====================================================================

ALTER TABLE rewards
  ADD COLUMN gear_slot ENUM('frame', 'visor')              NULL AFTER booster_charges,
  ADD COLUMN perk      ENUM('streak_shield', 'xp_bonus')   NULL AFTER gear_slot;

-- ---------------------------------------------------------------------
-- users: equipped gear. NULL shows the Standard item. Cleared (not
-- blocked) if the reward is deleted.
-- ---------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN frame_reward_id INT NULL AFTER goal_language_id,
  ADD COLUMN visor_reward_id INT NULL AFTER frame_reward_id,
  ADD CONSTRAINT fk_users_frame_reward FOREIGN KEY (frame_reward_id) REFERENCES rewards (reward_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_visor_reward FOREIGN KEY (visor_reward_id) REFERENCES rewards (reward_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Starter gear. unlock_condition uses the same "<stat>>=<number>" rules as
-- insignia; quests_cleared>=0 means every pilot has it from the start.
-- The code picks the item's look on the frontend.
-- ---------------------------------------------------------------------
INSERT INTO rewards (code, name, description, icon, reward_type, unlock_condition, xp_multiplier, gear_slot, perk) VALUES
  ('frame-standard', 'Standard Issue', 'Issued to every pilot.',            'frame-standard', 'gear', 'quests_cleared>=0',        NULL, 'frame', NULL),
  ('frame-circuit',  'Circuit',        'Clear 5 quests.',                   'frame-circuit',  'gear', 'quests_cleared>=5',        NULL, 'frame', NULL),
  ('frame-hunter',   'Bug Hunter',     'Squash 10 bugs.',                   'frame-hunter',   'gear', 'bugs_squashed>=10',        NULL, 'frame', NULL),
  ('frame-decoder',  'Signal',         'Decode 5 transmissions.',           'frame-decoder',  'gear', 'transmissions_decoded>=5', NULL, 'frame', NULL),
  ('frame-ace',      'Sector Ace',     'Clear every quest in a sector.',    'frame-ace',      'gear', 'sectors_cleared>=1',       NULL, 'frame', NULL),
  ('visor-standard', 'Standard Visor', 'Issued to every pilot.',            'visor-standard', 'gear', 'quests_cleared>=0',        NULL, 'visor', NULL),
  ('visor-mirror',   'Mirror Visor',   'Ask the Ship''s AI 25 questions.',  'visor-mirror',   'gear', 'ai_questions>=25',         NULL, 'visor', NULL),
  ('visor-ember',    'Ember Visor',    'Deploy 3 days in a row.',           'visor-ember',    'gear', 'longest_streak>=3',        NULL, 'visor', 'streak_shield'),
  ('visor-nova',     'Nova Visor',     'Clear 10 quests.',                  'visor-nova',     'gear', 'quests_cleared>=10',       1.1,  'visor', 'xp_bonus');
