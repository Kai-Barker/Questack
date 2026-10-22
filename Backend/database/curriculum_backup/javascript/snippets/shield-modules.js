// shields.js
let level = 50;

export function raise() {
  level += 25;
  return level;
}

export function current() {
  return level;
}

// bridge.js
import { raise, current as shieldLevel } from "./shields.js";
import * as shields from "./shields.js";

raise();
console.log(shieldLevel());
console.log(shields.raise());
console.log(typeof level);
