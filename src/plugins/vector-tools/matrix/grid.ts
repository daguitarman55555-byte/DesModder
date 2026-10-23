/**
 * Where the map's grid lines go, so the grid's image fills everything the map
 * reaches on screen.
 *
 * A grid of fixed spacing over a fixed box cannot do that for a map like the
 * fisheye, which brings the whole plane inside a disc: the lines a box holds
 * stop short of the rim, and the mapped curves, which Desmos draws all the way
 * out, run on past the last line into empty paper. So the lines are found by
 * walking outward from the middle of the screen's preimage, one axis at a time,
 * and the walk adapts to what each line looks like on screen:
 *
 * - when two neighbouring lines land within `minPx` of each other, the spacing
 *   doubles (at a multiple of the new spacing, so the lines kept are still the
 *   grid's own lines, every other one);
 * - the walk stops once the lines it adds no longer reach the screen, or have
 *   converged, adding less than `convergedPx` of new picture each.
 *
 * For the fisheye that runs out to a radius of about a thousand in a few dozen
 * lines, and the last one is within a pixel of the rim; for a linear map it
 * stops at the edge of the screen, as a fixed grid would. `limit` is the most
 * lines one direction may take, from the Detail control: a map like polar
 * coordinates wraps forever and would otherwise never stop.
 */
import type { Vec2 } from "./matrixModel";
import type { Bounds, PlaneMap } from "./redraw";

export interface GridWalk {
  map: PlaneMap;
  /** The point the walk starts from, in the map's own coordinates. */
  centre: Vec2;
  /** The spacing near the centre. */
  step: number;
  /** What is on screen, in graph coordinates. */
  view: Bounds;
  /** Pixels per graph unit on each axis. */
  scale: Vec2;
  /** The most lines one direction of one axis may take. */
  limit: number;
  minPx?: number;
  convergedPx?: number;
}

/** Whether the segment p–q meets the rectangle. */
function segmentMeets(p: Vec2, q: Vec2, b: Bounds) {
  const inside = (r: Vec2) =>
    r[0] >= b.left && r[0] <= b.right && r[1] >= b.bottom && r[1] <= b.top;
  if (inside(p) || inside(q)) return true;
  // Liang–Barsky: clip the segment's parameter range against each side.
  let t0 = 0;
  let t1 = 1;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const sides: [number, number][] = [
    [-dx, p[0] - b.left],
    [dx, b.right - p[0]],
    [-dy, p[1] - b.bottom],
    [dy, b.top - p[1]],
  ];
  for (const [d, n] of sides) {
    if (d === 0) {
      if (n < 0) return false;
      continue;
    }
    const t = n / d;
    if (d < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * The grid's positions on one axis (0 for the lines x = a, 1 for y = b),
 * sorted, centre included.
 */
export function gridPositions(walk: GridWalk, axis: 0 | 1): number[] {
  const { map, centre, step, view, scale, limit } = walk;
  const minPx = walk.minPx ?? 5;
  const convergedPx = walk.convergedPx ?? 0.5;
  const along = centre[1 - axis];
  // Samples along each line: dense near the middle, then doubling, so a line
  // is followed far out with a couple of dozen evaluations.
  const samples = [along];
  for (let j = 0; j <= 12; j++) {
    const d = step * 2 ** j;
    samples.push(along - d, along + d);
  }
  samples.sort((a, b) => a - b);
  const image = (a: number): Vec2[] =>
    samples.map((v) => (axis === 0 ? map(a, v) : map(v, a)));
  const finite = (p: Vec2) => Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const onScreen = (points: Vec2[]) =>
    points.some(
      (p, i) =>
        i > 0 &&
        finite(p) &&
        finite(points[i - 1]) &&
        segmentMeets(points[i - 1], p, view)
    );
  /**
   * How far apart two lines' images are near the middle of the walk, in
   * pixels: the widest gap over the samples within sixteen steps of it, or
   * −1 if they share no defined point there. Near the middle, because that is
   * where crowding shows: far out every one of the fisheye's lines meets the
   * rim, and judging there would call the whole grid crowded from its first
   * line. The widest, so a map whose lines meet at one point (the rays of
   * polar coordinates, at the origin) is judged where they have separated.
   */
  const near = samples.map((v) => Math.abs(v - along) <= 16 * step + 1e-9);
  const spacing = (a: Vec2[], b: Vec2[]) => {
    let widest = -1;
    a.forEach((p, i) => {
      const q = b[i];
      if (!near[i] || !finite(p) || !finite(q)) return;
      widest = Math.max(
        widest,
        Math.hypot((q[0] - p[0]) * scale[0], (q[1] - p[1]) * scale[1])
      );
    });
    return widest;
  };
  const start = Math.round(centre[axis] / step) * step;
  const out = [start];
  const startImage = image(start);
  for (const direction of [1, -1]) {
    let position = start;
    let current = startImage;
    let gap = step;
    let offScreen = 0;
    let converged = 0;
    for (let n = 0; n < limit; n++) {
      // Double the spacing while neighbours crowd together, but only from a
      // line that is also a line of the coarser grid.
      for (let k = 0; k < 40; k++) {
        const wider = gap * 2;
        const ratio = position / wider;
        if (Math.abs(ratio - Math.round(ratio)) > 1e-9) break;
        const next = spacing(current, image(position + direction * gap));
        if (next < 0 || next >= minPx) break;
        gap = wider;
      }
      const position2 = position + direction * gap;
      if (!Number.isFinite(position2) || position2 === position) break;
      const next = image(position2);
      const gapPx = spacing(current, next);
      out.push(position2);
      offScreen = onScreen(next) ? 0 : offScreen + 1;
      converged = gapPx >= 0 && gapPx < convergedPx ? converged + 1 : 0;
      if (offScreen >= 3 || converged >= 2 || gapPx < 0) break;
      position = position2;
      current = next;
    }
  }
  return out.sort((a, b) => a - b);
}

/** A stretch of one grid line to draw: line `line`, crossings `from`..`to`. */
export interface GridRun {
  line: number;
  from: number;
  to: number;
}

/** How many times 2 divides n: how coarse a grid line n steps out is. */
function coarseness(n: number) {
  if (n === 0) return Infinity;
  let level = 0;
  let m = Math.abs(n);
  while (m % 2 === 0) {
    m /= 2;
    level++;
  }
  return level;
}

/**
 * Which stretches of each line to draw, so lines that crowd together on
 * screen are thinned rather than stacked into a solid band.
 *
 * At each crossing the lines are visited coarsest first — the axis, then
 * every line a multiple of a high power of two steps out — and a line is
 * kept there only if its image is at least `minGap` pixels from the curves
 * of the nearest lines already kept on either side. The distance is to the
 * neighbour's curve, not to the neighbour's point at the same crossing:
 * towards the fisheye's rim, far lines lie along one another, each arc the
 * last one slid along itself, and measured point to point they looked eight
 * pixels apart while drawing the same pixels. So a crowded region keeps the
 * grid's own coarser lines and drops the rest, and the grid thins out evenly
 * towards a rim instead of piling into a ring.
 *
 * `at(i, k)` is the image of line i's crossing with line k of the other axis.
 */
export function keptRuns(
  positions: readonly number[],
  crossings: number,
  at: (i: number, k: number) => Vec2,
  step: number,
  scale: Vec2,
  minGap = 8
): GridRun[] {
  const finite = (p: Vec2 | undefined): p is Vec2 =>
    p !== undefined && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const toPixels = (p: Vec2): Vec2 => [p[0] * scale[0], p[1] * scale[1]];
  /** Distance in pixels from p to the segment a–b. */
  const toSegment = (p: Vec2, a: Vec2, b: Vec2) => {
    const [px, py] = toPixels(p);
    const [ax, ay] = toPixels(a);
    const [bx, by] = toPixels(b);
    const dx = bx - ax;
    const dy = by - ay;
    const l = dx * dx + dy * dy;
    const t =
      l === 0
        ? 0
        : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
    return Math.hypot(ax + t * dx - px, ay + t * dy - py);
  };
  /**
   * Distance from p to line j's curve near crossing k: its segments six
   * crossings either side. Six, because the arcs that pile up at a rim are
   * each the last slid along itself by a factor of a few in the other
   * coordinate, which the doubled spacing of far lines puts a couple of
   * crossings away; looking further costs time on every frame and finds
   * nothing nearer.
   */
  const toLine = (p: Vec2, j: number, k: number) => {
    let best = Infinity;
    const from = Math.max(0, k - 6);
    const to = Math.min(crossings - 1, k + 6);
    let previous = at(j, from);
    if (finite(previous))
      best = Math.hypot(...toPixels([previous[0] - p[0], previous[1] - p[1]]));
    for (let other = from + 1; other <= to; other++) {
      const there = at(j, other);
      if (finite(previous) && finite(there))
        best = Math.min(best, toSegment(p, previous, there));
      previous = there;
    }
    return best;
  };
  const order = positions
    .map((position, i) => ({ i, n: Math.round(position / step) }))
    .sort(
      (a, b) =>
        coarseness(b.n) - coarseness(a.n) || Math.abs(a.n) - Math.abs(b.n)
    )
    .map(({ i }) => i);
  const kept = positions.map(() => new Array<boolean>(crossings).fill(false));
  for (let k = 0; k < crossings; k++) {
    for (const i of order) {
      const p = at(i, k);
      if (!finite(p)) continue;
      let room = true;
      for (const direction of [-1, 1]) {
        let j = i + direction;
        while (j >= 0 && j < positions.length && !kept[j][k]) j += direction;
        if (j < 0 || j >= positions.length) continue;
        if (toLine(p, j, k) < minGap) room = false;
      }
      kept[i][k] = room;
    }
  }
  const runs: GridRun[] = [];
  kept.forEach((row, line) => {
    let from = -1;
    for (let k = 0; k <= crossings; k++) {
      if (k < crossings && row[k]) {
        if (from < 0) from = k;
        continue;
      }
      if (from >= 0 && k - 1 > from) runs.push({ line, from, to: k - 1 });
      from = -1;
    }
  });
  return runs;
}
