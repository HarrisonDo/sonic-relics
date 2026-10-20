// Fracture patterns for the device transition. Pure geometry so it can be tested
// without a browser; the DOM side lives in components/deviceTransition.ts.

export type Point = [number, number];

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Shard {
  points: Point[];
  centroid: Point;
  /** Unit vector pointing away from the impact, used to fling the piece. */
  direction: Point;
  /** 0 is the piece at the impact; higher rings sit further out. */
  ring: number;
}

export interface Fracture {
  impact: Point;
  shards: Shard[];
  /** Every crack as a line segment, for the brief glow before the burst. */
  cracks: Array<[Point, Point]>;
}

export function createRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Splits a rectangle into a radial "broken glass" pattern: rays out of an impact
 * point crossed by jittered rings. Adjacent pieces share exact vertices, so the
 * pattern tiles the rectangle with no gaps, and the outer ring always reaches
 * past its corners.
 */
export function createFracture(
  bounds: Bounds,
  { rays = 9, rings = 3, random = Math.random } = {},
): Fracture {
  const impact: Point = [
    bounds.x + bounds.width * (0.5 + (random() - 0.5) * 0.14),
    bounds.y + bounds.height * (0.5 + (random() - 0.5) * 0.14),
  ];
  const radiusX = (bounds.width / 2) * 1.08;
  const radiusY = (bounds.height / 2) * 1.08;
  const ringStops = Array.from({ length: rings }, (_, index) =>
    index === rings - 1 ? 2 : ((index + 1) / rings) * 1.02,
  );
  const step = (Math.PI * 2) / rays;
  const start = random() * Math.PI * 2;
  const angles = Array.from(
    { length: rays },
    (_, index) => start + (index + (random() - 0.5) * 0.4) * step,
  );
  const grid: Point[][] = angles.map((angle) => [
    impact,
    ...ringStops.map((stop, ring): Point => {
      const distance =
        ring === rings - 1 ? stop : stop * (1 + (random() - 0.5) * 0.26);
      return [
        impact[0] + Math.cos(angle) * radiusX * distance,
        impact[1] + Math.sin(angle) * radiusY * distance,
      ];
    }),
  ]);
  const shards: Shard[] = [];
  const cracks: Array<[Point, Point]> = [];
  for (let ray = 0; ray < rays; ray++) {
    const next = (ray + 1) % rays;
    for (let ring = 0; ring < rings; ring++) {
      const points: Point[] =
        ring === 0
          ? [impact, grid[ray][1], grid[next][1]]
          : [
              grid[ray][ring],
              grid[ray][ring + 1],
              grid[next][ring + 1],
              grid[next][ring],
            ];
      const centroid: Point = [
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
        points.reduce((sum, point) => sum + point[1], 0) / points.length,
      ];
      let dx = centroid[0] - impact[0];
      let dy = centroid[1] - impact[1];
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      shards.push({ points, centroid, direction: [dx, dy], ring });
      if (ring < rings - 1)
        cracks.push([grid[ray][ring + 1], grid[next][ring + 1]]);
    }
    cracks.push([impact, grid[ray][Math.max(1, rings - 1)]]);
  }
  return { impact, shards, cracks };
}

/** Signed area of a polygon (shoelace formula). */
export function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

export function toClipPath(points: Point[]): string {
  return `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;
}
