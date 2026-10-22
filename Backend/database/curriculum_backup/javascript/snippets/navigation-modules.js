// navigation.js
export const HOME = "Ares Base";

export function distanceTo(planet) {
  const charts = { Ares: 0, Europa: 628, Titan: 1272 };
  return charts[planet];
}

export default function plot(planet) {
  return `Course plotted to ${planet}: ${distanceTo(planet)} million km`;
}

// main.js
import plot, { HOME, distanceTo } from "./navigation.js";

console.log(HOME);
console.log(distanceTo("Europa"));
console.log(plot("Titan"));
