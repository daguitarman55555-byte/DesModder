/**
 * The Matrix tab's configuration, its presets, and the 2×2 algebra it explains.
 *
 * The tab applies one map to the whole graph: a matrix A, typed here or read
 * from a matrix the expression list defines, or any formula T(x, y). Its
 * settings are a block of their own with their own `schemaVersion`, kept on
 * the field library beside the panel's geometry rather than on a field,
 * because a transformation of the graph is not a property of the vector field
 * being drawn — switching fields should not switch the map off.
 *
 * Nothing here touches Desmos. The session decides what to draw; this decides
 * what the settings mean and what the numbers say.
 */

export const MATRIX_SCHEMA_VERSION = 1;

/** A matrix, row by row: [a, b, c, d] is [[a, b], [c, d]]. */
export type Mat2 = readonly [number, number, number, number];
export type Vec2 = readonly [number, number];

export type MatrixKind = "linear" | "formula";
/**
 * How the graph itself is carried through the map. `exact` writes hidden
 * copies of each expression with (x, y) replaced by T⁻¹(x, y), so Desmos
 * draws the image itself, sharp to the edge; `redraw` sends the polylines
 * Desmos already drew through T. Both are kept because each fails where the
 * other works: the exact route needs an inverse, and the redraw route only
 * has what Desmos sampled, which is what is on screen.
 */
export type MatrixRoute = "exact" | "redraw";
export type MatrixSource = "typed" | "expression";
export type MatrixLevel = "simple" | "full";
/**
 * How finely a curved map bends what it redraws: the largest gap, in screen
 * pixels, a mapped segment may leave between itself and the curve it stands
 * for. A trade-off between a smooth picture and a quick one, so it is a
 * control rather than a constant.
 */
export type RedrawDetail = "fine" | "balanced" | "fast";

export const REDRAW_TOLERANCE_PX: Record<RedrawDetail, number> = {
  fine: 0.25,
  balanced: 1,
  fast: 4,
};
/** How many times one segment may be halved, by the same control. */
export const REDRAW_MAX_DEPTH: Record<RedrawDetail, number> = {
  fine: 12,
  balanced: 9,
  fast: 6,
};

/**
 * The most grid lines the map's grid walks out in one direction, by the same
 * Detail control. The walk normally stops on its own, once its lines leave
 * the screen or stop adding to the picture (see `grid.ts`); this is for maps
 * like polar coordinates, which wrap round and never do.
 */
export const GRID_LINES: Record<RedrawDetail, number> = {
  fine: 200,
  balanced: 64,
  fast: 32,
};

export interface MatrixShows {
  /** The image of the integer grid under the map. */
  grid: boolean;
  square: boolean;
  circle: boolean;
  /** Eigenvector lines; a linear idea, so read only for a matrix. */
  eigen: boolean;
  /** The field T(x, y) drawn by the live arrows. */
  field: boolean;
  /** The graph as typed, faint beneath the image. */
  ghost: boolean;
  /** The Jacobian probe; read only for a formula. */
  probe: boolean;
}

export interface MatrixFormula {
  xLatex: string;
  yLatex: string;
  /** T⁻¹, for the exact route; both empty when there is none. */
  inverseXLatex: string;
  inverseYLatex: string;
}

export interface MatrixConfig {
  schemaVersion: number;
  on: boolean;
  kind: MatrixKind;
  route: MatrixRoute;
  source: MatrixSource;
  entries: Mat2;
  /** The name of the matrix read from the list when `source` is expression. */
  expressionName: string;
  formula: MatrixFormula;
  /** The preset last loaded, or "" once the map has been edited by hand. */
  presetId: string;
  show: MatrixShows;
  vectors: Vec2[];
  /** Whether each v and its image are written into the expression list. */
  writeVectors: boolean;
  level: MatrixLevel;
  detail: RedrawDetail;
}

export interface LinearPreset {
  id: string;
  name: string;
  entries: Mat2;
  takeaway: string;
}

export interface FormulaPreset {
  id: string;
  name: string;
  formula: MatrixFormula;
  takeaway: string;
}

/**
 * Every preset says what to notice. A preset without a takeaway is a picture
 * without a point, and the point is the reason for the tab.
 */
export const LINEAR_PRESETS: readonly LinearPreset[] = [
  {
    id: "shear",
    name: "Shear",
    entries: [1, 1, 0, 1],
    takeaway:
      "A shear slides each row of the grid sideways. Area stays 1 (det = 1), and only the x-axis keeps its direction.",
  },
  {
    id: "rotate",
    name: "Rotate 90°",
    entries: [0, -1, 1, 0],
    takeaway:
      "A rotation turns every vector by the same angle, so no real direction survives: the eigenvalues are ±i. Area is unchanged.",
  },
  {
    id: "stretch",
    name: "Stretch",
    entries: [2, 0, 0, 0.5],
    takeaway:
      "Stretching x by 2 and squeezing y by ½ keeps the area (det = 1). The axes are the eigenvectors, with λ = 2 and ½.",
  },
  {
    id: "reflect",
    name: "Reflect",
    entries: [1, 0, 0, -1],
    takeaway:
      "A reflection flips orientation, so det is negative. The square turns orange because its corners now run clockwise.",
  },
  {
    id: "project",
    name: "Project",
    entries: [1, 0, 0, 0],
    takeaway:
      "A projection flattens the plane onto a line. det = 0: every curve collapses onto the x-axis, and A has no inverse.",
  },
  {
    id: "general",
    name: "[[1,2],[3,4]]",
    entries: [1, 2, 3, 4],
    takeaway:
      "A general matrix mixes all of these. Two real directions survive, one flipped (λ < 0), so det is negative.",
  },
  {
    id: "spiral",
    name: "Spiral",
    entries: [0.9, -0.5, 0.5, 0.9],
    takeaway:
      "Complex eigenvalues mean a rotation with scaling. Here |λ| ≈ 1.03, so applying A again and again spirals a vector slowly outward.",
  },
];

/**
 * The swirl turns each point by an angle that fades with distance. Written
 * once and spliced in, because a typo in one of its four copies would be a
 * map whose stated inverse is not its inverse.
 */
const SWIRL_ANGLE = String.raw`1.5e^{-\frac{x^{2}+y^{2}}{8}}`;
const RADIUS = String.raw`\sqrt{x^{2}+y^{2}}`;

export const FORMULA_PRESETS: readonly FormulaPreset[] = [
  {
    id: "wave",
    name: "Wave",
    formula: {
      xLatex: String.raw`x+0.4\sin\left(y\right)`,
      yLatex: String.raw`y+0.4\sin\left(x\right)`,
      inverseXLatex: "",
      inverseYLatex: "",
    },
    takeaway:
      "Straight lines bend, but look closely at the probe: a tiny square still lands on a near-parallelogram. Up close every smooth map is a matrix, its Jacobian.",
  },
  {
    id: "swirl",
    name: "Swirl",
    formula: {
      xLatex: String.raw`x\cos\left(${SWIRL_ANGLE}\right)-y\sin\left(${SWIRL_ANGLE}\right)`,
      yLatex: String.raw`x\sin\left(${SWIRL_ANGLE}\right)+y\cos\left(${SWIRL_ANGLE}\right)`,
      // A rotation keeps the radius, so turning back by the same angle,
      // which depends only on the radius, undoes it.
      inverseXLatex: String.raw`x\cos\left(${SWIRL_ANGLE}\right)+y\sin\left(${SWIRL_ANGLE}\right)`,
      inverseYLatex: String.raw`-x\sin\left(${SWIRL_ANGLE}\right)+y\cos\left(${SWIRL_ANGLE}\right)`,
    },
    takeaway:
      "Each point is rotated by an angle that fades with distance. It is a rotation everywhere, so det J = 1 and no area is gained or lost, yet the grid twists.",
  },
  {
    id: "square",
    name: "Square z²",
    formula: {
      xLatex: String.raw`x^{2}-y^{2}`,
      yLatex: String.raw`2xy`,
      inverseXLatex: "",
      inverseYLatex: "",
    },
    takeaway:
      "Squaring a complex number doubles angles: the upper half-plane covers the whole plane. det J = 4(x² + y²), so area grows away from the origin and vanishes at it. Two points square to each one, so there is no inverse: only Redraw can draw it.",
  },
  {
    id: "fisheye",
    name: "Fisheye",
    formula: {
      xLatex: String.raw`\frac{x}{1+\frac{${RADIUS}}{4}}`,
      yLatex: String.raw`\frac{y}{1+\frac{${RADIUS}}{4}}`,
      // Defined only inside the disc of radius 4, which is everything the
      // map reaches; outside it nothing maps there, so nothing is drawn.
      inverseXLatex: String.raw`\left\{${RADIUS}<4:\frac{x}{1-\frac{${RADIUS}}{4}}\right\}`,
      inverseYLatex: String.raw`\left\{${RADIUS}<4:\frac{y}{1-\frac{${RADIUS}}{4}}\right\}`,
    },
    takeaway:
      "Far points are pulled in, so the entire plane fits inside a disc of radius 4. Lines through the origin stay straight; the others curve.",
  },
  {
    id: "polar",
    name: "Polar",
    formula: {
      xLatex: String.raw`x\cos\left(y\right)`,
      yLatex: String.raw`x\sin\left(y\right)`,
      inverseXLatex: "",
      inverseYLatex: "",
    },
    takeaway:
      "Reads (x, y) as (r, θ). Vertical lines become circles and horizontal lines become rays, which is how polar graphs are drawn. det J = x, which is 0 along the y-axis. θ wraps, so there is no single inverse: only Redraw can draw it.",
  },
];

export const OWN_MATRIX_TAKEAWAY =
  "Your own matrix. Watch the square's area and the purple lines as you change it.";
export const OWN_FORMULA_TAKEAWAY =
  "Your own map. Drag the probe to see where it stretches, squeezes or folds.";
export const EXPRESSION_MATRIX_TAKEAWAY =
  "The matrix your graph defines. Its value is what Desmos computed, so a slider inside it moves the whole picture.";

export const DEFAULT_MATRIX_CONFIG: MatrixConfig = {
  schemaVersion: MATRIX_SCHEMA_VERSION,
  // Off until somebody turns it on: enabling the plugin must never change
  // what the graph shows.
  on: false,
  kind: "linear",
  route: "exact",
  source: "typed",
  entries: [1, 1, 0, 1],
  expressionName: "A",
  formula: { ...FORMULA_PRESETS[0].formula },
  presetId: "shear",
  show: {
    grid: true,
    square: true,
    circle: false,
    eigen: true,
    field: false,
    ghost: true,
    probe: true,
  },
  vectors: [
    [1, 2],
    [2, -1],
  ],
  writeVectors: true,
  level: "simple",
  detail: "balanced",
};

export function cloneMatrixConfig(config: MatrixConfig): MatrixConfig {
  return {
    ...config,
    entries: [...config.entries] as unknown as Mat2,
    formula: { ...config.formula },
    show: { ...config.show },
    vectors: config.vectors.map((v) => [v[0], v[1]] as const),
  };
}

/**
 * The stored block, read back into a whole configuration.
 *
 * Every key is rebuilt in the order of the default, because the library is
 * compared with its own JSON on every enable and two objects with the same
 * values in a different order are two different strings. Nothing throws: a
 * setting that cannot be read falls back field by field, and a version this
 * build does not know is read as far as its keys allow rather than discarded,
 * since it can only have come from a newer build of the same tab.
 */
export function normalizeMatrixConfig(value: unknown): MatrixConfig {
  const fallback = DEFAULT_MATRIX_CONFIG;
  const v = isRecord(value) ? value : {};
  const show = isRecord(v.show) ? v.show : {};
  const formula = isRecord(v.formula) ? v.formula : {};
  const flag = (stored: unknown, from: boolean) =>
    typeof stored === "boolean" ? stored : from;
  const text = (stored: unknown, from: string) =>
    typeof stored === "string" ? stored : from;
  const entries =
    Array.isArray(v.entries) &&
    v.entries.length === 4 &&
    v.entries.every((n) => typeof n === "number" && Number.isFinite(n))
      ? (v.entries.slice() as unknown as Mat2)
      : ([...fallback.entries] as unknown as Mat2);
  const vectors = Array.isArray(v.vectors)
    ? v.vectors.flatMap((pair): Vec2[] =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every((n) => typeof n === "number" && Number.isFinite(n))
          ? [[pair[0] as number, pair[1] as number]]
          : []
      )
    : fallback.vectors.map((p) => [p[0], p[1]] as const);
  const name = text(v.expressionName, fallback.expressionName).trim();
  return {
    schemaVersion: MATRIX_SCHEMA_VERSION,
    on: flag(v.on, fallback.on),
    kind: v.kind === "formula" ? "formula" : "linear",
    route: v.route === "redraw" ? "redraw" : "exact",
    source: v.source === "expression" ? "expression" : "typed",
    entries,
    expressionName: name === "" ? fallback.expressionName : name,
    formula: {
      xLatex: text(formula.xLatex, fallback.formula.xLatex),
      yLatex: text(formula.yLatex, fallback.formula.yLatex),
      inverseXLatex: text(
        formula.inverseXLatex,
        fallback.formula.inverseXLatex
      ),
      inverseYLatex: text(
        formula.inverseYLatex,
        fallback.formula.inverseYLatex
      ),
    },
    presetId: text(v.presetId, fallback.presetId),
    show: {
      grid: flag(show.grid, fallback.show.grid),
      square: flag(show.square, fallback.show.square),
      circle: flag(show.circle, fallback.show.circle),
      eigen: flag(show.eigen, fallback.show.eigen),
      field: flag(show.field, fallback.show.field),
      ghost: flag(show.ghost, fallback.show.ghost),
      probe: flag(show.probe, fallback.show.probe),
    },
    vectors,
    writeVectors: flag(v.writeVectors, fallback.writeVectors),
    level: v.level === "full" ? "full" : "simple",
    detail: v.detail === "fine" || v.detail === "fast" ? v.detail : "balanced",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function presetTakeaway(config: MatrixConfig): string {
  if (config.kind === "linear") {
    if (config.source === "expression") return EXPRESSION_MATRIX_TAKEAWAY;
    return (
      LINEAR_PRESETS.find((p) => p.id === config.presetId)?.takeaway ??
      OWN_MATRIX_TAKEAWAY
    );
  }
  return (
    FORMULA_PRESETS.find((p) => p.id === config.presetId)?.takeaway ??
    OWN_FORMULA_TAKEAWAY
  );
}

// ---- 2×2 algebra -----------------------------------------------------------

export const IDENTITY: Mat2 = [1, 0, 0, 1];

export const det = (m: Mat2) => m[0] * m[3] - m[1] * m[2];
export const trace = (m: Mat2) => m[0] + m[3];
export const apply = (m: Mat2, v: Vec2): Vec2 => [
  m[0] * v[0] + m[1] * v[1],
  m[2] * v[0] + m[3] * v[1],
];

/**
 * (1 − t)I + tA, the straight-line path from doing nothing to A that the
 * scrubber plays. Straight in the space of matrices, which is why a rotation
 * shrinks on its way round: halfway to a quarter turn is a matrix of
 * determinant ½, not a turn of 45°. That is the honest homotopy, and the one
 * a formula gets too.
 */
export function homotopy(m: Mat2, t: number): Mat2 {
  return [1 + t * (m[0] - 1), t * m[1], t * m[2], 1 + t * (m[3] - 1)];
}

/**
 * A determinant this small, against the size of the entries, is a matrix
 * with no inverse worth drawing through: its inverse's entries are noise.
 * Relative, because a matrix of entries near 10⁻⁶ is perfectly invertible.
 */
export function isSingular(m: Mat2) {
  const scale = Math.max(...m.map(Math.abs), 1e-300);
  return Math.abs(det(m)) <= 1e-12 * scale * scale;
}

export function inverse(m: Mat2): Mat2 | undefined {
  if (isSingular(m)) return undefined;
  const d = det(m);
  return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d];
}

export interface Eigen {
  trace: number;
  det: number;
  /** Real eigenvalues with an eigenvector each, when they are real. */
  real?: { value: number; vector: Vec2 }[];
  /** Re ± Im·i, when they are not. */
  complex?: readonly [number, number];
  /** A multiple of the identity: every vector is an eigenvector. */
  everyVector: boolean;
}

/**
 * Eigenvalues from the characteristic polynomial λ² − (tr)λ + det, and an
 * eigenvector for each from a row of A − λI. The tolerance decides when a
 * discriminant of 10⁻¹⁶ is a repeated root rather than two roots a hair
 * apart, which is the difference between one eigen-line and two drawn on
 * top of each other.
 */
export function eigen(m: Mat2): Eigen {
  const [a, b, c, d] = m;
  const tr = a + d;
  const dt = a * d - b * c;
  const disc = tr * tr - 4 * dt;
  const eps = 1e-9 * Math.max(1, tr * tr);
  if (disc < -eps)
    return {
      trace: tr,
      det: dt,
      complex: [tr / 2, Math.sqrt(-disc) / 2],
      everyVector: false,
    };
  const root = Math.sqrt(Math.max(disc, 0));
  const values = disc <= eps ? [tr / 2] : [(tr + root) / 2, (tr - root) / 2];
  const real: { value: number; vector: Vec2 }[] = [];
  for (const l of values) {
    if (Math.abs(b) > 1e-12) real.push({ value: l, vector: [b, l - a] });
    else if (Math.abs(c) > 1e-12) real.push({ value: l, vector: [l - d, c] });
    else {
      if (Math.abs(a - l) < 1e-9) real.push({ value: l, vector: [1, 0] });
      if (Math.abs(d - l) < 1e-9) real.push({ value: l, vector: [0, 1] });
    }
  }
  const everyVector =
    Math.abs(b) < 1e-12 && Math.abs(c) < 1e-12 && Math.abs(a - d) < 1e-12;
  return { trace: tr, det: dt, real, everyVector };
}

/** σ₁ ≥ σ₂: the most and least a matrix stretches any vector. */
export function singularValues(m: Mat2): readonly [number, number] {
  const [a, b, c, d] = m;
  const p = a * a + c * c;
  const q = a * b + c * d;
  const r = b * b + d * d;
  const h = Math.sqrt(((p - r) / 2) ** 2 + q * q);
  const mid = (p + r) / 2;
  return [Math.sqrt(mid + h), Math.sqrt(Math.max(mid - h, 0))];
}

/** A number for a person: three decimals at most, a real minus sign. */
export function formatNumber(x: number) {
  if (!Number.isFinite(x)) return "—";
  const r = Math.round(x * 1000) / 1000;
  return (Object.is(r, -0) ? 0 : r).toString().replace("-", "−");
}

/**
 * A number for Desmos: as short as it can be while still being the same
 * number. Twelve significant digits, because a matrix entry pushed into the
 * list at every frame of a scrub should not grow twenty digits of float
 * noise, and an exponent spelt the way Desmos reads one.
 */
export function latexNumber(x: number) {
  if (!Number.isFinite(x)) return "0";
  const r = Number(x.toPrecision(12));
  const s = (Object.is(r, -0) ? 0 : r).toString();
  const m = /^(-?[\d.]+)e([-+]\d+)$/.exec(s);
  return m === null ? s : `${m[1]}\\cdot10^{${Number(m[2])}}`;
}

/** [[a, b], [c, d]] as Desmos's only matrix spelling (measured 2026-10-22). */
export function matrixLatex(m: Mat2) {
  const [a, b, c, d] = m.map(latexNumber);
  return String.raw`\begin{bmatrix}${a}&${b}\\${c}&${d}\end{bmatrix}`;
}
