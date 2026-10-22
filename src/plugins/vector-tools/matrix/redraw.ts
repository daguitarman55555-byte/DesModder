/**
 * The redraw route: what Desmos already drew, sent through T.
 *
 * Desmos keeps everything it has drawn on the 2D graph paper as polylines in
 * graph coordinates, one sketch per expression (`grapher2d.graphSketches`,
 * measured 2026-10-22). Each sketch has branches, and each branch says what it
 * is by a number:
 *
 *   1  x = f(y)          5  parametric, or a polygon's outline
 *   2  y = f(x)          6  polar
 *   3  points            7  a filled region, as rings
 *   4  movable points    8  an implicit curve
 *
 * A branch's segments are flat arrays [x₀, y₀, x₁, y₁, …], except for points,
 * whose one segment is a list of [x, y] pairs. A shaded inequality comes two
 * ways: an implicit one carries its region as a branch 7, while y < f(x), its
 * mirror x < f(y), and the polar r < f(θ) carry only the boundary, with the
 * operator saying which side Desmos fills to the edge of the screen. Those
 * regions are rebuilt here from the boundary and the viewport.
 *
 * The properties are non-enumerable, so `Object.keys` and a spread see an
 * empty object (`getOwnPropertyNames` is how they were found); reading them by
 * name works. The objects are Desmos's own, and nothing here writes to them.
 */
import type { Vec2 } from "./matrixModel";

export type LineDash = "SOLID" | "DASHED" | "DOTTED";

export interface StrokePrimitive {
  kind: "stroke";
  points: number[];
  color: string;
  width: number;
  opacity: number;
  dash: LineDash;
}

export interface FillPrimitive {
  kind: "fill";
  /** Closed rings, filled even-odd so a hole stays a hole. */
  rings: number[][];
  color: string;
  opacity: number;
}

export interface DotPrimitive {
  kind: "dot";
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  style: "POINT" | "OPEN" | "CROSS";
}

export type Primitive = StrokePrimitive | FillPrimitive | DotPrimitive;

export interface Bounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

interface Branch {
  branchMode?: number;
  segments?: unknown[];
  color?: string;
  style?: string;
  lineWidth?: number;
  lineOpacity?: number;
  fillOpacity?: number;
  operator?: string;
  pointSize?: number;
  pointOpacity?: number;
  showPoint?: boolean;
}

const num = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function dashFor(branch: Branch): LineDash {
  if (branch.style === "DOTTED") return "DOTTED";
  // A strict inequality's boundary is not part of the region, and Desmos
  // dashes it whatever the line style says; `!=` is how it marks a boundary
  // drawn apart from the region it bounds.
  if (
    branch.style === "DASHED" ||
    branch.operator === "<" ||
    branch.operator === ">" ||
    branch.operator === "!="
  )
    return "DASHED";
  return "SOLID";
}

function flat(segment: unknown): number[] | undefined {
  if (!Array.isArray(segment) && !ArrayBuffer.isView(segment)) return undefined;
  const values = Array.from(segment as ArrayLike<unknown>);
  if (values.length < 4 || typeof values[0] !== "number") return undefined;
  return values as number[];
}

/**
 * The region a one-sided inequality shades, as a ring: the boundary, closed
 * along the edge of the screen on the side the operator names.
 */
function regionFromBoundary(
  points: number[],
  mode: number,
  operator: string,
  bounds: Bounds
): number[] | undefined {
  const below = operator === "<" || operator === "<=";
  const above = operator === ">" || operator === ">=";
  if (!below && !above) return undefined;
  const n = points.length;
  if (mode === 2) {
    const edge = below ? bounds.bottom : bounds.top;
    return [...points, points[n - 2], edge, points[0], edge];
  }
  if (mode === 1) {
    const edge = below ? bounds.left : bounds.right;
    return [...points, edge, points[n - 1], edge, points[1]];
  }
  if (mode === 6 && below) return [0, 0, ...points];
  return undefined;
}

/**
 * Everything one sketch drew, in the order Desmos draws it: shading, then
 * lines, then points. `bounds` is the viewport the sketch was sampled over,
 * which is where a one-sided region stops.
 */
export function sketchPrimitives(sketch: unknown, bounds: Bounds): Primitive[] {
  const branches = (sketch as { branches?: unknown })?.branches;
  if (!Array.isArray(branches)) return [];
  const sketchColor = (sketch as { color?: string }).color ?? "#000000";
  const fills: FillPrimitive[] = [];
  const strokes: StrokePrimitive[] = [];
  const dots: DotPrimitive[] = [];
  for (const raw of branches as Branch[]) {
    const mode = num(raw.branchMode, 0);
    const color = typeof raw.color === "string" ? raw.color : sketchColor;
    const segments = Array.isArray(raw.segments) ? raw.segments : [];
    if (mode === 3 || mode === 4) {
      if (raw.showPoint === false) continue;
      for (const segment of segments) {
        if (!Array.isArray(segment)) continue;
        for (const point of segment) {
          if (!Array.isArray(point) && !ArrayBuffer.isView(point)) continue;
          const p = point as ArrayLike<number>;
          if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
          dots.push({
            kind: "dot",
            x: p[0],
            y: p[1],
            color,
            size: num(raw.pointSize, 9),
            opacity: num(raw.pointOpacity, 1),
            style:
              raw.style === "OPEN" || raw.style === "CROSS"
                ? raw.style
                : "POINT",
          });
        }
      }
      continue;
    }
    if (mode === 7) {
      const rings = segments.flatMap((s) => {
        const ring = flat(s);
        return ring === undefined ? [] : [ring];
      });
      if (rings.length > 0)
        fills.push({
          kind: "fill",
          rings,
          color,
          opacity: num(raw.fillOpacity, 0.4),
        });
      continue;
    }
    const opacity = num(raw.lineOpacity, 1);
    const width = num(raw.lineWidth, 2.5);
    for (const segment of segments) {
      const points = flat(segment);
      if (points === undefined) continue;
      if (raw.operator !== undefined) {
        const ring = regionFromBoundary(points, mode, raw.operator, bounds);
        if (ring !== undefined)
          fills.push({
            kind: "fill",
            rings: [ring],
            color,
            opacity: num(raw.fillOpacity, 0.4),
          });
      }
      // A line of width 0 or opacity 0 is a region with its border turned
      // off, and drawing it anyway would put one back.
      if (width > 0 && opacity > 0)
        strokes.push({
          kind: "stroke",
          points,
          color,
          width,
          opacity,
          dash: dashFor(raw),
        });
    }
  }
  return [...fills, ...strokes, ...dots];
}

/** A map of the plane, taking and returning graph coordinates. */
export type PlaneMap = (x: number, y: number) => Vec2;

const finitePoint = (p: Vec2) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

/**
 * A polyline sent through a map, cut wherever the map is undefined.
 *
 * A linear map sends segments to segments, so its vertices are enough. A
 * curved one does not, and each segment is halved until the midpoint of its
 * image lies within `tolerance` of the image's chord, measured in screen
 * pixels through `scale` (pixels per graph unit on each axis) — so a map that
 * barely bends a segment costs one extra evaluation, and one that wraps it
 * round a circle gets what it needs. `maxDepth` is the safety on that
 * recursion, set by the same Detail control as the tolerance rather than
 * fixed. A segment whose image is undefined part of the way along is halved
 * towards where it stops, so a curve ends at the edge of the map's domain
 * rather than a whole segment short of it.
 *
 * Points are emitted in order with NaN as a break, then split into runs.
 */
export function mapPolyline(
  points: ArrayLike<number>,
  map: PlaneMap,
  options: {
    linear: boolean;
    tolerance: number;
    maxDepth: number;
    scale: Vec2;
    closed?: boolean;
  }
): number[][] {
  const out: number[] = [];
  const [sx, sy] = options.scale;
  const tol2 = options.tolerance * options.tolerance;
  // A chord longer than this many pixels is halved even when its midpoint
  // sits on it, because a bend can hide between two far-apart ends.
  const longest2 = 200 * 200;
  const refine = (
    ax: number,
    ay: number,
    A: Vec2,
    bx: number,
    by: number,
    B: Vec2,
    depth: number
  ) => {
    if (depth >= options.maxDepth) return;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const M = map(mx, my);
    let split: boolean;
    if (!finitePoint(A) || !finitePoint(B) || !finitePoint(M)) {
      split = finitePoint(A) || finitePoint(B) || finitePoint(M);
    } else {
      const dx = (M[0] - (A[0] + B[0]) / 2) * sx;
      const dy = (M[1] - (A[1] + B[1]) / 2) * sy;
      const lx = (B[0] - A[0]) * sx;
      const ly = (B[1] - A[1]) * sy;
      split = dx * dx + dy * dy > tol2 || lx * lx + ly * ly > longest2;
    }
    if (!split) return;
    refine(ax, ay, A, mx, my, M, depth + 1);
    out.push(M[0], M[1]);
    refine(mx, my, M, bx, by, B, depth + 1);
  };
  const n = Math.floor(points.length / 2);
  const total = options.closed === true && n > 1 ? n + 1 : n;
  let prev: { x: number; y: number; P: Vec2 } | undefined;
  for (let k = 0; k < total; k++) {
    const i = (k % n) * 2;
    const x = points[i];
    const y = points[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      out.push(NaN, NaN);
      prev = undefined;
      continue;
    }
    const P = map(x, y);
    if (prev !== undefined && !options.linear)
      refine(prev.x, prev.y, prev.P, x, y, P, 0);
    out.push(P[0], P[1]);
    prev = { x, y, P };
  }
  const runs: number[][] = [];
  let run: number[] = [];
  for (let i = 0; i < out.length; i += 2) {
    if (Number.isFinite(out[i]) && Number.isFinite(out[i + 1])) {
      run.push(out[i], out[i + 1]);
    } else {
      if (run.length >= 4) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 4) runs.push(run);
  return runs;
}
