import type { GenerateEvent } from '../config/gemini.js';

// Themed loading lines shown while the Ship's AI is retrying or rerouting.
// Add more lines to any list; one is picked at random each time.
const RETRY_MESSAGES = [
  'Comms facing interference... re-establishing link',
  'Solar flare scrambling the signal... boosting transmitter power',
  'Static on the channel... realigning the antenna array',
  'Swarm jamming detected... cycling frequencies',
];

const FALLBACK_MESSAGES = [
  'Main relay jammed... rerouting through the backup relay',
  'Primary array offline... switching to auxiliary comms',
];

// Shown when every retry and the fallback have failed
export const COMMS_DOWN_MESSAGE = "Ship's AI comms are down. Try again in a moment, Pilot.";

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? '';
}

// Only retries and fallbacks get a loading line; a failed attempt is followed by one of them
export function commsMessage(event: Exclude<GenerateEvent, { type: 'failed' }>): string {
  if (event.type === 'retry') {
    return `${pick(RETRY_MESSAGES)} (attempt ${event.attempt}/${event.maxAttempts})`;
  }
  return pick(FALLBACK_MESSAGES);
}
