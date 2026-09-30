// Huge, faint light-blue rings behind the sign-in screens (from the
// wireframes), slowly turning. Purely decorative.
//
// Each ring is its own element rotated with a CSS transform, which the browser
// can animate cheaply. The global prefers-reduced-motion rule in index.css
// stops the rotation for anyone who has asked for less motion.

interface Ring {
  radius: number; // px
  dash?: string; // in degrees of the circle (pathLength is 360)
  opacity: number;
  seconds: number; // time for one full turn
  reverse?: boolean;
  highlight?: string; // a brighter arc on top, so the rotation is visible
}

const RINGS: Ring[] = [
  { radius: 260, dash: '1 3', opacity: 0.4, seconds: 150 },
  { radius: 420, opacity: 0.24, seconds: 210, reverse: true, highlight: '42 318' },
  { radius: 600, dash: '8 5', opacity: 0.26, seconds: 270 },
  { radius: 800, opacity: 0.2, seconds: 330, reverse: true, highlight: '18 162' },
  { radius: 1020, dash: '1 4', opacity: 0.26, seconds: 420 },
];

// Where the rings are centred: right of the card, a little below middle
const CENTRE = { x: '72vw', y: '58vh' };

function RingLayer({ ring }: { ring: Ring }) {
  const size = ring.radius * 2;
  return (
    <div
      className="absolute motion-safe:animate-[spin_linear_infinite]"
      style={{
        width: size,
        height: size,
        left: `calc(${CENTRE.x} - ${ring.radius}px)`,
        top: `calc(${CENTRE.y} - ${ring.radius}px)`,
        animationDuration: `${ring.seconds}s`,
        animationDirection: ring.reverse ? 'reverse' : 'normal',
      }}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        {/* pathLength 360: dash sizes read as degrees of the circle, whatever its size */}
        <circle
          cx="50"
          cy="50"
          r="50"
          pathLength={360}
          strokeDasharray={ring.dash}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-accent"
          style={{ strokeOpacity: ring.opacity }}
        />
        {ring.highlight && (
          <circle
            cx="50"
            cy="50"
            r="50"
            pathLength={360}
            strokeDasharray={ring.highlight}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className="fill-none stroke-accent"
            style={{ strokeOpacity: Math.min(0.85, ring.opacity * 3) }}
          />
        )}
      </svg>
    </div>
  );
}

export default function OrbitalRings() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {RINGS.map((ring) => (
        <RingLayer key={ring.radius} ring={ring} />
      ))}
    </div>
  );
}
