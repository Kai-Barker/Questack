// What the Ship's AI says while it's working. A wait opens with a line that
// says what's happening, then drifts through these, so a long wait feels
// like the ship is busy rather than stuck.

export type WaitKind = 'hint' | 'submit' | 'chat' | 'decode' | 'read' | 'complete' | 'check';

export const FIRST_LINES: Record<WaitKind, string> = {
  hint: 'Preparing a hint…',
  submit: 'Assessing your answer…',
  chat: 'Transmitting…',
  decode: 'Decoding the transmission…',
  read: 'Logging the briefing…',
  complete: 'Filing your mission report…',
  check: 'Checking your answer…',
};

export const LOADING_LINES = [
  'Pontificating…',
  'Consulting the star charts…',
  'Untangling the hyperlanes…',
  'Reticulating splines…',
  'Cogitating…',
  'Asking the navigator nicely…',
  'Herding stray semicolons…',
  'Polishing the photon tubes…',
  'Contemplating the void…',
  'Recalibrating the flux array…',
  'Ruminating on your code…',
  'Bribing the compiler…',
  'Translating from robot…',
  'Counting the stars (nearly there)…',
  'Rerouting power to thinking…',
  'Deliberating…',
  'Sharpening the lasers…',
  'Brewing space coffee…',
];

// How long each line stays up
export const LOADING_LINE_MS = 2500;
