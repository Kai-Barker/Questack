// Rules for XP and progress, kept together so they're easy to tune.

// Replaying a quest you've already cleared gives this share of its XP
// (practice is rewarded, but XP can't be farmed). Boosters don't apply.
export const REPLAY_XP_SHARE = 0.25;

// Days (for streaks and the flight log) run on South African time, UTC+2,
// which has no daylight saving. Used for both SQL (CONVERT_TZ) and JavaScript.
export const ACTIVITY_UTC_OFFSET = '+02:00';
export const ACTIVITY_UTC_OFFSET_MS = 2 * 60 * 60 * 1000;

// How far back the flight log and XP history look
export const FLIGHT_LOG_WEEKS = 26;
export const XP_HISTORY_WEEKS = 8;
