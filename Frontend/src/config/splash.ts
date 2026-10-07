// Splash screen timing. Tweak these to adjust how the boot sequence feels.
//
//   0s ─ HOLD ─▶ lift (LIFT_MS) + loading bar ─▶ ready
//                └──── at least MIN_LOAD_MS ────┘
//
// So the buttons appear no sooner than HOLD_MS + MIN_LOAD_MS after opening.

// The logo sits on its own before anything moves
export const HOLD_MS = 1500;

// The hero lifting up to make room for the bar (0.5s feels snappy, 1s+ feels grand)
export const LIFT_MS = 1100;

// The lift and the loading bar together take at least this long, so the
// animation always plays out even when everything loads instantly
export const MIN_LOAD_MS = 4000;

// Give up and show "Cannot connect to Questack servers" after this long
export const TIMEOUT_MS = 15000;

// Loading-bar captions, shown in turn as the boot progresses
export const CAPTIONS = [
  'Establishing uplink to Command Station…',
  'Syncing star charts…',
  'Verifying pilot credentials…',
  "Calibrating Ship's AI…",
];

// Ring spin burst around the lift: the rings speed up SPIN_LEAD_MS before the
// lift starts, stay at full speed until SPIN_HOLD_AFTER_LIFT_MS after it
// finishes, then wind back down
export const SPIN_LEAD_MS = 800;
export const SPIN_HOLD_AFTER_LIFT_MS = 800;
export const SPIN_BOOST = 80; // how many times faster than their resting speed
export const SPIN_UP_MS = 650; // how quickly they reach full speed (smaller = snappier)
export const SPIN_DOWN_MS = 800; // how quickly they slow back down afterwards
