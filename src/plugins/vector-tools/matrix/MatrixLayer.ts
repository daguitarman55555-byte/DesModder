/**
 * The Matrix tab's drawing, done inside Desmos's own frame.
 *
 * Desmos draws every expression's sketch through one call,
 * `grapher2d.graphsLayer.redrawToCtx(context, sketches, images, drawOrder, …)`,
 * where `drawOrder` is the list of sketch ids to draw and `context` carries
 * the canvas and a projection from graph coordinates to pixels (measured
 * 2026-10-22). Wrapping that one call on the live layer — an own property on
 * the instance, never the prototype, deleted again on uninstall — does two
 * things no overlay canvas could:
 *
 * - The redraw route takes an expression over by leaving its id out of
 *   `drawOrder`. Desmos still evaluates and samples it, so its polylines stay
 *   current as the view pans or a slider moves, but it is not painted; the
 *   mapped version is painted in its place. The user's expression is never
 *   changed, which is what makes turning the map off exact.
 * - What is drawn here sits in Desmos's own layer order: over the grid, under
 *   the point labels and the trace, and on the same frame as everything else,
 *   so a pan never shows the map a frame behind the graph.
 *
 * If a Desmos build renames the layer or the call, `install` reports it and
 * the session falls back to saying the redraw route is unavailable, rather
 * than throwing on every frame.
 */
import {
  REDRAW_MAX_DEPTH,
  REDRAW_TOLERANCE_PX,
  eigen,
  formatNumber,
  type Mat2,
  type MatrixShows,
  type RedrawDetail,
  type Vec2,
} from "./matrixModel";
import { gridPositions, keptRuns } from "./grid";
import {
  mapPolyline,
  sketchPrimitives,
  type Bounds,
  type PlaneMap,
  type Primitive,
} from "./redraw";

/** What the session wants drawn, read once per frame. */
export interface MatrixScene {
  map: PlaneMap;
  /** T itself, before the scrubber's homotopy, for the probe's readings. */
  linear: boolean;
  kind: "linear" | "formula";
  /** The matrix at the scrubber's t, for eigenvector lines. */
  matrix?: Mat2;
  /** Which sketches this layer paints instead of Desmos. */
  takesOver: (id: string) => boolean;
  /** Draw what it takes over faint as typed, too. */
  ghost: boolean;
  show: MatrixShows;
  detail: RedrawDetail;
  /** Where the grid's walk starts, its spacing there, and its reach. */
  grid?: { centre: Vec2; step: number; limit: number };
  vectors: readonly Vec2[];
  probe?: Vec2;
}

interface Projection {
  mapx: (x: number) => number;
  mapy: (y: number) => number;
  mathCoordinates: Bounds;
}

interface DrawContext {
  ctx: CanvasRenderingContext2D;
  projection: Projection;
}

type RedrawToCtx = (
  context: DrawContext,
  sketches: Record<string, unknown>,
  images: unknown,
  drawOrder: string[],
  ...rest: unknown[]
) => unknown;

interface GraphsLayer {
  redrawToCtx: RedrawToCtx;
}

/** Desmos's own colours, so the tab's marks read as part of the graph. */
export const DESMOS_COLORS = {
  red: "#c74440",
  blue: "#2d70b3",
  green: "#388c46",
  purple: "#6042a6",
  orange: "#fa7e19",
  black: "#000000",
  gray: "#8a9099",
};

const GHOST_ALPHA = 0.22;
const MATH_FONT = '"Times New Roman", Times, serif';
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
export const subscript = (n: number) =>
  String(n).replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]);

export class MatrixLayer {
  private layer?: GraphsLayer;
  private scene?: () => MatrixScene | undefined;
  /** The last error a frame threw, reported once rather than every frame. */
  error = "";

  constructor(
    private readonly grapher: () => unknown,
    private readonly onError: (message: string) => void
  ) {}

  get isInstalled() {
    return this.layer !== undefined;
  }

  /**
   * Starts drawing `scene` in every Desmos frame. Returns why it could not,
   * or undefined once it is drawing.
   */
  install(scene: () => MatrixScene | undefined): string | undefined {
    this.scene = scene;
    if (this.layer !== undefined) {
      this.requestRedraw();
      return undefined;
    }
    const layer = (this.grapher() as { graphsLayer?: GraphsLayer } | undefined)
      ?.graphsLayer;
    const original = layer?.redrawToCtx;
    if (layer === undefined || typeof original !== "function")
      return "This build of Desmos draws its graph differently from the one the Matrix tab was measured on, so the tab cannot draw on it.";
    // An arrow function, so `this` is the layer object and the Desmos
    // layer is named outright; the original is called on it as before.
    const wrapped: RedrawToCtx = (
      context,
      sketches,
      images,
      drawOrder,
      ...rest
    ) => {
      const current = this.scene?.();
      const order =
        current === undefined
          ? drawOrder
          : drawOrder.filter((id) => !current.takesOver(id));
      const result = original.call(
        layer,
        context,
        sketches,
        images,
        order,
        ...rest
      );
      if (current !== undefined) {
        try {
          this.draw(context, sketches, drawOrder, current);
          if (this.error !== "") {
            this.error = "";
            this.onError("");
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (message !== this.error) {
            this.error = message;
            this.onError(message);
          }
        }
      }
      return result;
    };
    Object.defineProperty(layer, "redrawToCtx", {
      value: wrapped,
      configurable: true,
      writable: true,
    });
    this.layer = layer;
    this.requestRedraw();
    return undefined;
  }

  uninstall() {
    const { layer } = this;
    this.layer = undefined;
    this.scene = undefined;
    if (layer === undefined) return;
    // The wrapper is an own property shadowing the prototype's method;
    // deleting it is the whole of the undo.
    delete (layer as Partial<GraphsLayer>).redrawToCtx;
    this.requestRedraw();
  }

  requestRedraw() {
    const grapher = this.grapher() as { redrawAllLayers?: () => void };
    grapher?.redrawAllLayers?.();
  }

  // ---- one frame ---------------------------------------------------------------

  private draw(
    context: DrawContext,
    sketches: Record<string, unknown>,
    drawOrder: readonly string[],
    scene: MatrixScene
  ) {
    const { ctx, projection } = context;
    const bounds = projection.mathCoordinates;
    const px = (x: number) => projection.mapx(x);
    const py = (y: number) => projection.mapy(y);
    const scale: Vec2 = [
      Math.abs(projection.mapx(1) - projection.mapx(0)),
      Math.abs(projection.mapy(1) - projection.mapy(0)),
    ];
    const mapOptions = {
      linear: scene.linear,
      tolerance: REDRAW_TOLERANCE_PX[scene.detail],
      maxDepth: REDRAW_MAX_DEPTH[scene.detail],
      scale,
    };
    const identity: PlaneMap = (x, y) => [x, y];
    const mapped = (points: ArrayLike<number>, map: PlaneMap, closed = false) =>
      mapPolyline(points, map, {
        ...mapOptions,
        closed,
        linear: map === identity || scene.linear,
      });

    const path = (runs: number[][], close = false) => {
      ctx.beginPath();
      for (const run of runs) {
        ctx.moveTo(px(run[0]), py(run[1]));
        for (let i = 2; i < run.length; i += 2)
          ctx.lineTo(px(run[i]), py(run[i + 1]));
        if (close) ctx.closePath();
      }
    };

    const paint = (primitives: Primitive[], map: PlaneMap, alpha: number) => {
      for (const p of primitives) {
        if (p.kind === "fill") {
          const runs = p.rings.flatMap((ring) => mapped(ring, map, true));
          if (runs.length === 0) continue;
          path(runs, true);
          ctx.globalAlpha = alpha * p.opacity;
          ctx.fillStyle = p.color;
          ctx.fill("evenodd");
        } else if (p.kind === "stroke") {
          const runs = mapped(p.points, map);
          if (runs.length === 0) continue;
          path(runs);
          ctx.globalAlpha = alpha * p.opacity;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.setLineDash(
            p.dash === "DASHED" ? [10, 8] : p.dash === "DOTTED" ? [1, 6] : []
          );
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const [x, y] = map(p.x, p.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          ctx.globalAlpha = alpha * p.opacity;
          const r = p.size / 2;
          ctx.beginPath();
          if (p.style === "CROSS") {
            ctx.moveTo(px(x) - r, py(y) - r);
            ctx.lineTo(px(x) + r, py(y) + r);
            ctx.moveTo(px(x) + r, py(y) - r);
            ctx.lineTo(px(x) - r, py(y) + r);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else {
            ctx.arc(px(x), py(y), r, 0, 2 * Math.PI);
            if (p.style === "OPEN") {
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 2.5;
              ctx.stroke();
            } else {
              ctx.fillStyle = p.color;
              ctx.fill();
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    ctx.save();
    try {
      // The grid's image first, so the graph is read over it.
      if (scene.show.grid && scene.grid !== undefined)
        this.drawGrid(scene, mapped, path, ctx, bounds, scale);

      const taken = drawOrder.filter((id) => scene.takesOver(id));
      const primitives = taken.map((id) =>
        sketchPrimitives(sketches[id], bounds)
      );
      if (scene.ghost)
        for (const list of primitives) paint(list, identity, GHOST_ALPHA);
      for (const list of primitives) paint(list, scene.map, 1);

      this.drawGuides(scene, mapped, path, ctx, px, py);
    } finally {
      ctx.restore();
    }
  }

  private drawGrid(
    scene: MatrixScene,
    mapped: (points: ArrayLike<number>, map: PlaneMap) => number[][],
    path: (runs: number[][]) => void,
    ctx: CanvasRenderingContext2D,
    view: Bounds,
    scale: Vec2
  ) {
    const walk = { ...scene.grid!, map: scene.map, view, scale };
    const xs = gridPositions(walk, 0);
    const ys = gridPositions(walk, 1);
    // The crossings, mapped once: both families of lines pass through them,
    // and the thinning reads them to see where lines crowd.
    const lattice = xs.map((x) => ys.map((y) => scene.map(x, y)));
    const runs: number[][] = [];
    const { step } = scene.grid!;
    // Each line runs through the crossings it keeps, so the halving starts
    // from points the other lines already pass through.
    for (const run of keptRuns(
      xs,
      ys.length,
      (i, k) => lattice[i][k],
      step,
      scale
    ))
      runs.push(
        ...mapped(
          ys.slice(run.from, run.to + 1).flatMap((y) => [xs[run.line], y]),
          scene.map
        )
      );
    for (const run of keptRuns(
      ys,
      xs.length,
      (i, k) => lattice[k][i],
      step,
      scale
    ))
      runs.push(
        ...mapped(
          xs.slice(run.from, run.to + 1).flatMap((x) => [x, ys[run.line]]),
          scene.map
        )
      );
    path(runs);
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = DESMOS_COLORS.blue;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawGuides(
    scene: MatrixScene,
    mapped: (
      points: ArrayLike<number>,
      map: PlaneMap,
      closed?: boolean
    ) => number[][],
    path: (runs: number[][], close?: boolean) => void,
    ctx: CanvasRenderingContext2D,
    px: (x: number) => number,
    py: (y: number) => number
  ) {
    const { map, show } = scene;
    const label = (text: string, at: Vec2, color: string, dx = 8, dy = -8) => {
      if (!Number.isFinite(at[0]) || !Number.isFinite(at[1])) return;
      ctx.font = `italic 16px ${MATH_FONT}`;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeText(text, px(at[0]) + dx, py(at[1]) + dy);
      ctx.fillText(text, px(at[0]) + dx, py(at[1]) + dy);
    };

    if (show.square) {
      const runs = mapped([0, 0, 1, 0, 1, 1, 0, 1], map, true);
      const ring = runs.length === 1 ? runs[0] : undefined;
      let area = 0;
      if (ring !== undefined)
        for (let i = 0; i + 3 < ring.length; i += 2)
          area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
      area /= 2;
      // Orientation is the sign of the area: a flipped square runs clockwise.
      const tint = area < 0 ? DESMOS_COLORS.orange : DESMOS_COLORS.green;
      path(runs, true);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = tint;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = tint;
      ctx.lineWidth = 2;
      ctx.stroke();
      const centre = map(0.5, 0.5);
      if (ring !== undefined && Number.isFinite(centre[0])) {
        ctx.font = `13px Arial, sans-serif`;
        ctx.fillStyle = tint;
        ctx.fillText(
          `area ${formatNumber(Math.abs(area))}`,
          px(centre[0]) - 22,
          py(centre[1]) + 4
        );
      }
    }

    if (show.circle) {
      const ring: number[] = [];
      for (let k = 0; k < 120; k++) {
        const a = (k / 120) * 2 * Math.PI;
        ring.push(Math.cos(a), Math.sin(a));
      }
      path(mapped(ring, map, true));
      ctx.strokeStyle = DESMOS_COLORS.black;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (show.eigen && scene.kind === "linear" && scene.matrix !== undefined) {
      const e = eigen(scene.matrix);
      if (e.real !== undefined && !e.everyVector) {
        for (const { value, vector } of e.real) {
          const n = Math.hypot(vector[0], vector[1]);
          if (n === 0) continue;
          const u: Vec2 = [vector[0] / n, vector[1] / n];
          ctx.beginPath();
          ctx.moveTo(px(-u[0] * 1e4), py(-u[1] * 1e4));
          ctx.lineTo(px(u[0] * 1e4), py(u[1] * 1e4));
          ctx.strokeStyle = DESMOS_COLORS.purple;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
          label(
            `λ = ${formatNumber(value)}`,
            [u[0] * 3, u[1] * 3],
            DESMOS_COLORS.purple,
            6,
            -6
          );
        }
      }
    }

    if (scene.probe !== undefined && scene.kind === "formula") {
      this.drawProbe(scene, scene.probe, mapped, path, ctx, px);
    }

    scene.vectors.forEach((v, k) => {
      if (scene.ghost)
        this.arrow(ctx, px, py, v, (x, y) => [x, y], DESMOS_COLORS.gray, 2.5);
      this.arrow(ctx, px, py, v, map, DESMOS_COLORS.red, 3);
      label(
        scene.kind === "linear"
          ? `Av${subscript(k + 1)}`
          : `T(v${subscript(k + 1)})`,
        map(v[0], v[1]),
        DESMOS_COLORS.red
      );
    });
  }

  /**
   * A small square at p under T, solid, and under the Jacobian J(p), dashed.
   * The square's side follows the zoom, so the comparison reads the same at
   * any scale: shrink the square by zooming in and the two agree, which is
   * what the Jacobian means.
   */
  private drawProbe(
    scene: MatrixScene,
    p: Vec2,
    mapped: (
      points: ArrayLike<number>,
      map: PlaneMap,
      closed?: boolean
    ) => number[][],
    path: (runs: number[][], close?: boolean) => void,
    ctx: CanvasRenderingContext2D,
    px: (x: number) => number
  ) {
    const s = Math.abs(1 / (px(1) - px(0))) * 34;
    const square = [
      p[0],
      p[1],
      p[0] + s,
      p[1],
      p[0] + s,
      p[1] + s,
      p[0],
      p[1] + s,
    ];
    const T = scene.map;
    const J = jacobian(T, p);
    const Tp = T(p[0], p[1]);
    const linearised: PlaneMap = (x, y) => {
      const dx = x - p[0];
      const dy = y - p[1];
      return [Tp[0] + J[0] * dx + J[1] * dy, Tp[1] + J[2] * dx + J[3] * dy];
    };
    ctx.strokeStyle = DESMOS_COLORS.purple;
    if (scene.ghost) {
      path(
        mapped(square, (x, y) => [x, y], true),
        true
      );
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    path(mapped(square, T, true), true);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = DESMOS_COLORS.purple;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.stroke();
    path(mapped(square, linearised, true), true);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * An arrow from T(0) along the image of the segment from 0 to v: straight
   * for a matrix, a curve for anything else, because a map moves the whole
   * segment and not only its tip.
   */
  private arrow(
    ctx: CanvasRenderingContext2D,
    px: (x: number) => number,
    py: (y: number) => number,
    v: Vec2,
    map: PlaneMap,
    color: string,
    width: number
  ) {
    const pts: [number, number][] = [];
    for (let s = 0; s <= 48; s++) {
      const [x, y] = map((v[0] * s) / 48, (v[1] * s) / 48);
      pts.push([px(x), py(y)]);
    }
    if (pts.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y)))
      return;
    const tip = pts[pts.length - 1];
    let k = 47;
    const head = 12;
    while (k > 0 && Math.hypot(pts[k][0] - tip[0], pts[k][1] - tip[1]) < head)
      k--;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= k; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
    const from = pts[k];
    const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
    if (len < 0.5) return;
    const ux = (tip[0] - from[0]) / len;
    const uy = (tip[1] - from[1]) / len;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(
      tip[0] - ux * head - uy * head * 0.45,
      tip[1] - uy * head + ux * head * 0.45
    );
    ctx.lineTo(
      tip[0] - ux * head + uy * head * 0.45,
      tip[1] - uy * head - ux * head * 0.45
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** 1, 2 or 5 times a power of ten: the steps a grid is read in. */
export function niceStep(raw: number) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/**
 * The Jacobian by central differences, [∂x′/∂x, ∂x′/∂y, ∂y′/∂x, ∂y′/∂y]. The
 * step is scaled to the point, as `numericDerivative` does, so it is neither
 * too coarse near the origin nor lost in rounding far from it.
 */
export function jacobian(map: PlaneMap, p: Vec2): Mat2 {
  const h = 6e-6 * Math.max(1, Math.abs(p[0]), Math.abs(p[1]));
  const xp = map(p[0] + h, p[1]);
  const xm = map(p[0] - h, p[1]);
  const yp = map(p[0], p[1] + h);
  const ym = map(p[0], p[1] - h);
  return [
    (xp[0] - xm[0]) / (2 * h),
    (yp[0] - ym[0]) / (2 * h),
    (xp[1] - xm[1]) / (2 * h),
    (yp[1] - ym[1]) / (2 * h),
  ];
}
