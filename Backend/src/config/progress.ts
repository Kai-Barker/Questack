// Rules for XP and progress, kept together so they're easy to tune.

// Replaying a quest you've already cleared gives this share of its XP, so
// practice is rewarded. Boosters don't apply. Every replay earns it, limited
// only by the AI and quest-complete rate limits, so a pilot can still farm XP
// slowly by re-entering answers they know. If XP ever feeds a leaderboard,
// cap replays in questService.completeQuest (e.g. once per quest per day).
export const REPLAY_XP_SHARE = 0.25;

// Days (for streaks and the flight log) run on South African time, UTC+2,
// which has no daylight saving. Used for both SQL (CONVERT_TZ) and JavaScript.
export const ACTIVITY_UTC_OFFSET = '+02:00';
export const ACTIVITY_UTC_OFFSET_MS = 2 * 60 * 60 * 1000;

// How far back the flight log and XP history look
export const FLIGHT_LOG_WEEKS = 26;
export const XP_HISTORY_WEEKS = 8;
