// Galaxy map geometry, in SVG viewBox units.
// Angles are in degrees: 0° points right (3 o'clock) and angles increase
// clockwise, because SVG's y axis points down.

export const MAP_SIZE = 800;
export const CENTRE = MAP_SIZE / 2;

// The ring always shows at least this many slots; empty ones are "Uncharted"
export const SLOT_COUNT = 6;

export const RING = {
  hub: 118, // command station backdrop
  inner: 128, // wedges start here
  band: 26, // thickness of the "cleared" progress band
  label: 250, // where wedge text is centred
  outer: 350, // wedges end here
  frame: 392, // decorative outer circle
  gap: 10, // gutter between neighbouring wedges
};

export interface Point {
  x: number;
  y: number;
}

export function polar(radius: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTRE + radius * Math.cos(rad), y: CENTRE + radius * Math.sin(rad) };
}

// Slot 0 starts at 12 o'clock and slots run clockwise
export function slotAngles(index: number, count: number) {
  const span = 360 / count;
  const start = -90 + index * span;
  return { start, end: start + span, mid: start + span / 2 };
}

// Angle to trim off each side at `radius` so the straight edges sit gap/2 from
// the slot boundary. That keeps the gutter the same width all the way out.
function trimAngle(radius: number, gap: number): number {
  return (Math.asin(Math.min(1, gap / 2 / radius)) * 180) / Math.PI;
}

// Smallest sweep that still draws a visible sliver once both edges are trimmed
export function minSweep(radius: number, gap = RING.gap): number {
  return trimAngle(radius, gap) * 2 + 1;
}

// SVG path for a ring segment between two radii and two angles
export function wedgePath(rInner: number, rOuter: number, startDeg: number, endDeg: number, gap = RING.gap): string {
  const outerTrim = trimAngle(rOuter, gap);
  const innerTrim = trimAngle(rInner, gap);
  const outerStart = polar(rOuter, startDeg + outerTrim);
  const outerEnd = polar(rOuter, endDeg - outerTrim);
  const innerEnd = polar(rInner, endDeg - innerTrim);
  const innerStart = polar(rInner, startDeg + innerTrim);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const n = (value: number) => value.toFixed(2);

  return [
    `M ${n(outerStart.x)} ${n(outerStart.y)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${n(outerEnd.x)} ${n(outerEnd.y)}`,
    `L ${n(innerEnd.x)} ${n(innerEnd.y)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${n(innerStart.x)} ${n(innerStart.y)}`,
    'Z',
  ].join(' ');
}

// A point on the map as percentages of its box, for positioning HTML over the SVG
export function toPercent(point: Point): { left: number; top: number } {
  return { left: (point.x / MAP_SIZE) * 100, top: (point.y / MAP_SIZE) * 100 };
}
