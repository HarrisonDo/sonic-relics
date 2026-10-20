// Geometry of the turntable, in the device's own (unrotated) pixel space.
// The tonearm is drawn pointing straight down from its pivot; rotating it by a
// positive angle swings the stylus to the left, across the record.

export const TURNTABLE = {
  center: { x: 150, y: 150 },
  recordRadius: 120,
  labelRadius: 42,
  outerGroove: 113,
  innerGroove: 54,
  pivot: { x: 372, y: 62 },
  armLength: 222,
  restAngle: 9,
  maxAngle: 58,
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Distance from the spindle to the stylus for a given arm angle in degrees. */
export function stylusRadius(angle: number): number {
  const radians = (angle * Math.PI) / 180;
  const { pivot, center, armLength } = TURNTABLE;
  return Math.hypot(
    pivot.x - armLength * Math.sin(radians) - center.x,
    pivot.y + armLength * Math.cos(radians) - center.y,
  );
}

/** The arm angle that places the stylus at `radius`; the radius shrinks as the angle grows. */
export function angleForRadius(radius: number): number {
  let low: number = TURNTABLE.restAngle;
  let high: number = TURNTABLE.maxAngle;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (stylusRadius(middle) > radius) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/** Outer groove is the start of the song, inner groove is the end. */
export function progressForRadius(radius: number): number {
  return clamp01(
    (TURNTABLE.outerGroove - radius) /
      (TURNTABLE.outerGroove - TURNTABLE.innerGroove),
  );
}

export function radiusForProgress(progress: number): number {
  return (
    TURNTABLE.outerGroove -
    clamp01(progress) * (TURNTABLE.outerGroove - TURNTABLE.innerGroove)
  );
}

export function angleForProgress(progress: number): number {
  return angleForRadius(radiusForProgress(progress));
}

/** Where a released arm lands: a song position, or `null` when it is off the record. */
export function progressForAngle(angle: number): number | null {
  const radius = stylusRadius(angle);
  if (radius > TURNTABLE.outerGroove + 6) return null;
  return progressForRadius(radius);
}
