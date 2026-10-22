// fuel.js
const MAX_FUEL = 100;

export function refuel(current) {
  return Math.min(current + 40, MAX_FUEL);
}

// dock.js
import { refuel, MAX_FUEL } from "./fuel.js";

console.log(`Tank: ${refuel(70)} of ${MAX_FUEL}`);
