import { useEffect, useRef } from 'react';
import { SPIN_DOWN_MS, SPIN_UP_MS } from '../../config/splash';

// Huge, faint light-blue rings (from the wireframes), slowly turning. Purely
// decorative.
//
// Variants:
// - "auth": screen-wide rings behind the sign-in screens, centred right of the card
// - "splash": rings centred on the splash logo, placed inside the hero so they
//   move and scale with it
//
// Two ways of spinning:
// - By default each ring spins with a CSS animation, which the browser runs
//   cheaply. The global prefers-reduced-motion rule in index.css stops it.
// - With a `boost` value, rings are turned frame by frame instead, so their
//   speed can change smoothly (the splash's spin-up around the lift). Changing
//   a CSS animation's speed mid-spin would make the rings jump. With reduced
//   motion they don't turn at all.

interface Ring {
  radius: number; // px
  dash?: string; // "dash gap" in px at full size, e.g. '8 5' (see fitDash)
  opacity: number;
  seconds: number; // time for one full turn at resting speed
  reverse?: boolean;
  highlight?: string; // a brighter dashed arc on top ("dash gap" in px), so the rotation is visible
}

// Turns a "dash gap" pattern in px into one that fits the circle a whole
// number of times. Otherwise the last repeat is cut short where the circle
// closes, leaving two pieces bunched together. The spacing is stretched very
// slightly so the repeats meet evenly. The result is in degrees, since each
// circle has pathLength 360.
function fitDash(pattern: string | undefined, radius: number): string | undefined {
  if (!pattern) return undefined;
  const [dash = 0, gap = 0] = pattern.split(' ').map(Number);
  const circumference = 2 * Math.PI * radius;
  const repeats = Math.max(1, Math.round(circumference / (dash + gap)));
  const degreesPerPx = 360 / repeats / (dash + gap);
  return `${(dash * degreesPerPx).toFixed(4)} ${(gap * degreesPerPx).toFixed(4)}`;
}

// Stroke widths in the SVG's own units (its 100-unit viewBox spans the ring's
// full diameter). Unlike vector-effect="non-scaling-stroke", this keeps the
// dash pattern measured in degrees, even when the splash hero scales down.
const strokeUnits = (px: number, radius: number) => (px * 100) / (radius * 2);

const VARIANTS = {
  auth: {
    centre: { x: '72vw', y: '58vh' },
    container: 'pointer-events-none fixed inset-0 -z-10 overflow-hidden',
    rings: [
      { radius: 260, dash: '1 3', opacity: 0.4, seconds: 150 },
      { radius: 420, opacity: 0.24, seconds: 210, reverse: true, highlight: '42 318' },
      { radius: 600, dash: '8 5', opacity: 0.26, seconds: 270 },
      { radius: 800, opacity: 0.2, seconds: 330, reverse: true, highlight: '18 162' },
      { radius: 1020, dash: '1 4', opacity: 0.26, seconds: 420 },
    ] as Ring[],
  },
  splash: {
    centre: { x: '50%', y: '50%' },
    container: 'pointer-events-none absolute inset-0 -z-10',
    rings: [
      { radius: 280, dash: '1 3', opacity: 0.5, seconds: 100 },
      { radius: 360, opacity: 0.32, seconds: 140, reverse: true, highlight: '40 140' },
      // Outer rings sit well clear of the loading bar and buttons below the hero
      { radius: 620, dash: '8 5', opacity: 0.28, seconds: 190 },
      { radius: 820, opacity: 0.22, seconds: 240, reverse: true, highlight: '24 156' },
      { radius: 1040, dash: '1 4', opacity: 0.26, seconds: 300 },
    ] as Ring[],
  },
};

interface RingLayerProps {
  ring: Ring;
  centre: { x: string; y: string };
  cssSpin: boolean;
  layerRef?: (el: HTMLDivElement | null) => void;
}

function RingLayer({ ring, centre, cssSpin, layerRef }: RingLayerProps) {
  const size = ring.radius * 2;
  return (
    <div
      ref={layerRef}
      className={`absolute ${cssSpin ? 'motion-safe:animate-[spin_linear_infinite]' : ''}`}
      style={{
        width: size,
        height: size,
        left: `calc(${centre.x} - ${ring.radius}px)`,
        top: `calc(${centre.y} - ${ring.radius}px)`,
        ...(cssSpin && {
          animationDuration: `${ring.seconds}s`,
          animationDirection: ring.reverse ? 'reverse' : 'normal',
        }),
      }}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <circle
          cx="50"
          cy="50"
          r="50"
          pathLength={360}
          strokeDasharray={fitDash(ring.dash, ring.radius)}
          strokeWidth={strokeUnits(1, ring.radius)}
          className="fill-none stroke-accent"
          style={{ strokeOpacity: ring.opacity }}
        />
        {ring.highlight && (
          <circle
            cx="50"
            cy="50"
            r="50"
            pathLength={360}
            strokeDasharray={fitDash(ring.highlight, ring.radius)}
            strokeWidth={strokeUnits(1.5, ring.radius)}
            className="fill-none stroke-accent"
            style={{ strokeOpacity: Math.min(0.9, ring.opacity * 3) }}
          />
        )}
      </svg>
    </div>
  );
}

interface OrbitalRingsProps {
  variant?: keyof typeof VARIANTS;
  boost?: number; // speed multiplier; when given, rings are turned frame by frame
}

export default function OrbitalRings({ variant = 'auth', boost }: OrbitalRingsProps) {
  const { centre, container, rings } = VARIANTS[variant];
  const frameDriven = boost !== undefined;
  const layers = useRef<(HTMLDivElement | null)[]>([]);

  // The animation loop reads the latest boost without restarting
  const boostRef = useRef(boost ?? 1);
  useEffect(() => {
    boostRef.current = boost ?? 1;
  }, [boost]);

  useEffect(() => {
    if (!frameDriven || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let last = performance.now();
    let speed = boostRef.current;
    const angles = rings.map(() => 0);

    const tick = (now: number) => {
      const dt = Math.min(100, now - last); // cap jumps after the tab was hidden
      last = now;
      // Ease the speed towards the target: quick to spin up, a little slower to settle
      const target = boostRef.current;
      const smoothing = target > speed ? SPIN_UP_MS : SPIN_DOWN_MS;
      speed += (target - speed) * (1 - Math.exp(-dt / smoothing));

      rings.forEach((ring, i) => {
        const direction = ring.reverse ? -1 : 1;
        angles[i] = ((angles[i] ?? 0) + direction * (360 / ring.seconds) * speed * (dt / 1000)) % 360;
        const layer = layers.current[i];
        if (layer) layer.style.transform = `rotate(${angles[i]}deg)`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [frameDriven, rings]);

  return (
    <div aria-hidden="true" className={container}>
      {rings.map((ring, i) => (
        <RingLayer
          key={ring.radius}
          ring={ring}
          centre={centre}
          cssSpin={!frameDriven}
          layerRef={
            frameDriven
              ? (el) => {
                  layers.current[i] = el;
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
