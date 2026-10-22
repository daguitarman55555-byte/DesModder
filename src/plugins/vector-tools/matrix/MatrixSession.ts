/**
 * The Matrix tab's controller: which map, which route, what Desmos is told,
 * and what the panel says.
 *
 * The map is T(x, y): a matrix A, typed or read from the list, or a formula.
 * The scrubber plays the straight-line homotopy T_t(p) = p + t(T(p) − p) from
 * doing nothing to the whole map. Two routes draw the graph through it (see
 * `exactRoute.ts` and `redraw.ts`), and whichever is in use, everything this
 * tab owns in the expression list lives in one folder and is reconciled
 * against what the list holds rather than against what this session last
 * wrote: so an undo that brings back an older folder is accepted rather than
 * fought, and a page reloaded with the map on picks up where it was.
 *
 * Writes are the expensive part and are kept to what changed. A scrub on the
 * exact route changes the map's own definitions and nothing else, so it is
 * a `setExpressions` of those few; adding or removing a copy needs the
 * folder rebuilt, which is one `setState` — atomic and one undo step — and
 * which waits while the user is typing in the list, because rebuilding the
 * list takes the cursor away.
 */
import type { ExpressionState, GraphState, ItemState } from "graph-state/state";
import type { Node } from "../../../symbolic/tree";
import { evaluate } from "../../../symbolic/evaluate";
import {
  canonicalIdentifier,
  identifierLatex,
  identifierNames,
} from "../../../field-rendering/identifiers";
import {
  DEFAULT_MATRIX_CONFIG,
  FORMULA_PRESETS,
  GRID_LINES,
  IDENTITY,
  LINEAR_PRESETS,
  apply,
  cloneMatrixConfig,
  det,
  eigen,
  formatNumber,
  homotopy,
  inverse,
  isSingular,
  latexNumber,
  matrixLatex,
  presetTakeaway,
  singularValues,
  trace,
  type Mat2,
  type MatrixConfig,
  type MatrixShows,
  type Vec2,
} from "./matrixModel";
import {
  MATRIX_FOLDER_ID,
  IDENTITY_NAMES,
  copyId,
  copyState,
  ghostId,
  ghostState,
  helperId,
  helperState,
  isOwned,
  rewrite,
  sourceOfCopy,
  sourceOfGhost,
  withOwnedItems,
  type ExactSource,
  type MapNames,
} from "./exactRoute";
import {
  MatrixLayer,
  jacobian,
  niceStep,
  subscript,
  type MatrixScene,
} from "./MatrixLayer";
import type { Bounds, PlaneMap } from "./redraw";
import { gridPositions } from "./grid";

/** The part of a Desmos item model this session reads. */
export interface MatrixItem {
  id: string;
  type: string;
  latex?: string;
  hidden?: boolean;
  folderId?: string;
  color?: string;
  formula?: {
    expression_type?: string;
    is_graphable?: boolean;
    is_inequality?: boolean;
    function_definition?: string;
    assignment?: string;
    defined_name?: string;
    domains?: { minNumber?: number; maxNumber?: number }[];
    typed_constant_value?: { valueType?: number; value?: unknown };
  };
}

export interface MatrixHost {
  getState: () => GraphState;
  setState: (state: GraphState) => void;
  setExpressions: (
    expressions: { id: string; latex?: string; color?: string }[]
  ) => void;
  grapher: () => unknown;
  items: () => readonly MatrixItem[];
  bounds: () => Bounds;
  /** Pixels per graph unit on each axis. */
  scale: () => Vec2;
  /** Calls back whenever the view moves; returns how to stop. */
  watchBounds: (callback: () => void) => () => void;
  config: () => MatrixConfig;
  update: (change: (config: MatrixConfig) => void) => void;
  /** Desmos's parse of a formula, with implicit products read as the graph reads them. */
  parse: (latex: string) => Node;
  sliders: () => ReadonlyMap<string, number>;
  dispatching: () => boolean;
  focusInList: () => boolean;
  is3d: () => boolean;
  changed: () => void;
  fieldChanged: () => void;
}

type Compiled =
  | {
      ok: true;
      fx: Node;
      fy: Node;
      gx?: Node;
      gy?: Node;
      names: string[];
      /** Why a typed T⁻¹ could not be read, when one was typed. */
      inverseError?: string;
    }
  | { ok: false; error: string };

export interface RouteInUse {
  route: "exact" | "redraw";
  /** Why the exact route was asked for and is not the one drawing. */
  why?: string;
}

interface Desired {
  items: ItemState[];
  hide: Set<string>;
  skipped: { id: string; reason: string }[];
  /** The lines the panel shows as written to the list. */
  shown: string[];
}

const GRAY = "#8a9099";
const RED = "#c74440";
const PURPLE = "#6042a6";
const KNOWN_NAMES = new Set(["x", "y", "e", "pi", "tau", "theta"]);
const POINT_LATEX =
  /^[^=]*=\\left\((-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?),(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\\right\)$/;

export class MatrixSession {
  /** Where the scrubber is: 0 does nothing, 1 is the whole map. */
  t = 1;
  private playFrame?: number;
  private syncTimer?: ReturnType<typeof setTimeout>;
  private probe: Vec2 = [-2, 1.5];
  private compiled?: { key: string; result: Compiled };
  private skipped: { id: string; reason: string }[] = [];
  private skippedIds = new Set<string>();
  /** Originals the user showed again while a copy stood in for them. */
  private readonly released = new Set<string>();
  private shownLines: string[] = [];
  /** What each expression was last found to be, by its LaTeX at the time. */
  private readonly classified = new Map<
    string,
    { latex: string; source: ExactSource | undefined }
  >();
  /** Whether the last read met an expression Desmos had not analysed yet. */
  private pendingAnalysis = false;
  private deferred = false;
  private drawError = "";
  private installError = "";
  private lastFieldKey = "";
  private unwatchBounds?: () => void;
  readonly layer: MatrixLayer;
  /**
   * How many times this session has written to the list. A reconcile that
   * disagreed with how Desmos stores what it was given would write forever;
   * the integration tests read this across an idle moment to prove it does
   * not.
   */
  writes = 0;

  constructor(private readonly host: MatrixHost) {
    this.layer = new MatrixLayer(host.grapher, (message) => {
      this.drawError = message;
      host.changed();
    });
  }

  get config() {
    return this.host.config();
  }

  // ---- settings ----------------------------------------------------------------

  private set(change: (config: MatrixConfig) => void) {
    this.host.update(change);
    this.schedule();
  }

  setOn(on: boolean) {
    this.set((c) => {
      c.on = on;
    });
    if (!on) this.released.clear();
    else this.play();
  }

  /** Every setting back to its default, and the map off. */
  reset() {
    this.stopPlaying();
    this.t = 1;
    this.released.clear();
    this.set((c) => {
      Object.assign(c, cloneMatrixConfig(DEFAULT_MATRIX_CONFIG));
    });
  }

  setKind(kind: MatrixConfig["kind"]) {
    if (kind === this.config.kind) return;
    this.set((c) => {
      c.kind = kind;
      c.presetId =
        kind === "linear" ? LINEAR_PRESETS[0].id : FORMULA_PRESETS[0].id;
      if (kind === "linear")
        c.entries = [...LINEAR_PRESETS[0].entries] as unknown as Mat2;
      else c.formula = { ...FORMULA_PRESETS[0].formula };
    });
    this.play();
  }

  setRoute(route: MatrixConfig["route"]) {
    this.set((c) => {
      c.route = route;
    });
  }

  setSource(source: MatrixConfig["source"]) {
    this.set((c) => {
      c.source = source;
    });
  }

  setEntry(index: number, value: number) {
    this.set((c) => {
      const entries = [...c.entries];
      entries[index] = value;
      c.entries = entries as unknown as Mat2;
      c.presetId = "";
    });
  }

  setExpressionName(name: string) {
    this.set((c) => {
      c.expressionName = name.trim();
    });
  }

  setFormula(key: keyof MatrixConfig["formula"], latex: string) {
    if (this.config.formula[key] === latex) return;
    this.set((c) => {
      c.formula = { ...c.formula, [key]: latex };
      if (key === "xLatex" || key === "yLatex") c.presetId = "";
    });
  }

  loadPreset(id: string) {
    const linear = LINEAR_PRESETS.find((p) => p.id === id);
    const formula = FORMULA_PRESETS.find((p) => p.id === id);
    this.set((c) => {
      c.presetId = id;
      if (linear !== undefined) {
        c.kind = "linear";
        c.source = "typed";
        c.entries = [...linear.entries] as unknown as Mat2;
      } else if (formula !== undefined) {
        c.kind = "formula";
        c.formula = { ...formula.formula };
      }
    });
    this.play();
  }

  toggleShow(key: keyof MatrixShows) {
    this.set((c) => {
      c.show = { ...c.show, [key]: !c.show[key] };
    });
  }

  setLevel(level: MatrixConfig["level"]) {
    this.set((c) => {
      c.level = level;
    });
  }

  setDetail(detail: MatrixConfig["detail"]) {
    this.set((c) => {
      c.detail = detail;
    });
  }

  setWriteVectors(write: boolean) {
    this.set((c) => {
      c.writeVectors = write;
    });
  }

  setVector(index: number, axis: 0 | 1, value: number) {
    this.set((c) => {
      c.vectors = c.vectors.map((v, k) =>
        k === index ? (axis === 0 ? [value, v[1]] : [v[0], value]) : v
      );
    });
  }

  addVector() {
    this.set((c) => {
      c.vectors = [...c.vectors, [-1, 1 + (c.vectors.length % 3)]];
    });
  }

  removeVector(index: number) {
    this.set((c) => {
      c.vectors = c.vectors.filter((_, k) => k !== index);
    });
  }

  // ---- the scrubber --------------------------------------------------------------

  /**
   * A formula on the exact route draws the finished map only: the maps in
   * between have no formula for their inverse, and inventing one would be
   * drawing something that is not the homotopy.
   */
  get frozen() {
    return this.config.kind === "formula" && this.routeInUse.route === "exact";
  }

  setT(t: number) {
    this.stopPlaying();
    this.applyT(t);
  }

  private applyT(t: number) {
    const next = Math.min(1, Math.max(0, t));
    if (next === this.t) return;
    this.t = next;
    this.layer.requestRedraw();
    // Only the exact route on a matrix has anything in the list that moves
    // with t; the redraw route is this tab's own drawing.
    if (this.config.kind === "linear" && this.routeInUse.route === "exact")
      this.syncNow();
    this.syncField();
    this.host.changed();
  }

  get playing() {
    return this.playFrame !== undefined;
  }

  /** From the identity to the whole map in 1.4 s, eased at both ends. */
  play() {
    this.stopPlaying();
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!this.config.on || this.frozen || reduced) {
      this.applyT(1);
      return;
    }
    const start = performance.now();
    this.t = 0;
    const step = (now: number) => {
      const s = Math.min(1, (now - start) / 1400);
      this.playFrame = s < 1 ? requestAnimationFrame(step) : undefined;
      this.applyT(s < 0.5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2);
    };
    this.playFrame = requestAnimationFrame(step);
  }

  private stopPlaying() {
    if (this.playFrame !== undefined) cancelAnimationFrame(this.playFrame);
    this.playFrame = undefined;
  }

  // ---- the map -----------------------------------------------------------------

  private get definedNames(): Map<string, MatrixItem> {
    const names = new Map<string, MatrixItem>();
    for (const item of this.host.items()) {
      if (isOwned(item.id)) continue;
      const f = item.formula;
      for (const name of [
        f?.defined_name,
        f?.function_definition,
        f?.assignment,
      ])
        if (name !== undefined && name !== "x" && name !== "y")
          names.set(canonicalIdentifier(name), item);
    }
    return names;
  }

  /** The matrix, typed or read from the list, or why there is none. */
  get baseMatrix(): { ok: true; m: Mat2 } | { ok: false; error: string } {
    const { config } = this;
    if (config.source === "typed") return { ok: true, m: config.entries };
    const name = canonicalIdentifier(config.expressionName);
    const item = this.definedNames.get(name);
    if (item === undefined)
      return {
        ok: false,
        error: `The graph does not define ${config.expressionName}. Define it as a 2×2 matrix, for example ${config.expressionName}=[[1,1],[0,1]].`,
      };
    const value = item.formula?.typed_constant_value;
    const rows = value?.value;
    if (
      value?.valueType !== 42 ||
      !Array.isArray(rows) ||
      rows.length !== 2 ||
      !rows.every((r) => Array.isArray(r) && r.length === 2)
    )
      return {
        ok: false,
        error: `${config.expressionName} is not a 2×2 matrix of numbers yet.`,
      };
    const m = [rows[0][0], rows[0][1], rows[1][0], rows[1][1]].map(Number);
    if (!m.every(Number.isFinite))
      return {
        ok: false,
        error: `${config.expressionName} has an undefined entry.`,
      };
    return { ok: true, m: m as unknown as Mat2 };
  }

  private compile(): Compiled {
    const f = this.config.formula;
    const key = [f.xLatex, f.yLatex, f.inverseXLatex, f.inverseYLatex].join(
      "\n"
    );
    if (this.compiled?.key === key) return this.compiled.result;
    const message = (error: unknown) =>
      error instanceof Error ? error.message : String(error);
    let result: Compiled;
    try {
      if (f.xLatex.trim() === "" || f.yLatex.trim() === "")
        throw new Error("Type both x′ and y′.");
      const fx = this.host.parse(f.xLatex);
      const fy = this.host.parse(f.yLatex);
      const names = [
        ...new Set([
          ...identifierNames(f.xLatex),
          ...identifierNames(f.yLatex),
        ]),
      ].filter((n) => !KNOWN_NAMES.has(n));
      result = { ok: true, fx, fy, names };
      const hasX = f.inverseXLatex.trim() !== "";
      const hasY = f.inverseYLatex.trim() !== "";
      if (hasX !== hasY)
        result.inverseError = "T⁻¹ needs both of its coordinates";
      else if (hasX)
        try {
          result.gx = this.host.parse(f.inverseXLatex);
          result.gy = this.host.parse(f.inverseYLatex);
        } catch (error) {
          result.gx = result.gy = undefined;
          result.inverseError = message(error);
        }
    } catch (error) {
      result = { ok: false, error: message(error) };
    }
    this.compiled = { key, result };
    return result;
  }

  /** The names a formula reads that are neither x, y nor a slider. */
  get unreadNames(): string[] {
    const compiled = this.compile();
    if (!compiled.ok) return [];
    const sliders = this.host.sliders();
    return compiled.names.filter((n) => !sliders.has(n));
  }

  private evaluator(fx: Node, fy: Node): PlaneMap {
    const bindings: Record<string, number> = {};
    for (const [name, value] of this.host.sliders()) bindings[name] = value;
    return (x, y) => {
      bindings.x = x;
      bindings.y = y;
      return [evaluate(fx, bindings), evaluate(fy, bindings)];
    };
  }

  /** T itself, at t = 1, or undefined when there is no map to apply. */
  get baseMap(): PlaneMap | undefined {
    if (this.config.kind === "linear") {
      const base = this.baseMatrix;
      if (!base.ok) return undefined;
      const { m } = base;
      return (x, y) => apply(m, [x, y]);
    }
    const compiled = this.compile();
    return compiled.ok ? this.evaluator(compiled.fx, compiled.fy) : undefined;
  }

  /** The matrix at the scrubber's t. */
  get matrixAtT(): Mat2 | undefined {
    const base = this.baseMatrix;
    return base.ok ? homotopy(base.m, this.t) : undefined;
  }

  /** T_t, the map the scrubber is showing. */
  get mapAtT(): PlaneMap | undefined {
    if (this.config.kind === "linear") {
      const m = this.matrixAtT;
      return m === undefined ? undefined : (x, y) => apply(m, [x, y]);
    }
    const T = this.baseMap;
    if (T === undefined) return undefined;
    const { t } = this;
    return (x, y) => {
      const [X, Y] = T(x, y);
      return [x + t * (X - x), y + t * (Y - y)];
    };
  }

  /** T_t⁻¹ where it is known: any t for a matrix, t = 1 for a formula. */
  private get inverseAtT(): PlaneMap | undefined {
    if (this.config.kind === "linear") {
      const m = this.matrixAtT;
      const inv = m === undefined ? undefined : inverse(m);
      return inv === undefined ? undefined : (x, y) => apply(inv, [x, y]);
    }
    const compiled = this.compile();
    if (!compiled.ok || compiled.gx === undefined || compiled.gy === undefined)
      return undefined;
    return this.evaluator(compiled.gx, compiled.gy);
  }

  get routeInUse(): RouteInUse {
    const { config } = this;
    if (config.route === "redraw") return { route: "redraw" };
    if (config.kind === "linear") {
      const base = this.baseMatrix;
      if (base.ok && isSingular(base.m))
        return {
          route: "redraw",
          why: "A has no inverse (det A = 0), so the graph is redrawn instead.",
        };
      return { route: "exact" };
    }
    const compiled = this.compile();
    if (!compiled.ok || compiled.gx === undefined)
      return {
        route: "redraw",
        why:
          compiled.ok && compiled.inverseError !== undefined
            ? `T⁻¹ could not be read (${compiled.inverseError}), so the graph is redrawn instead.`
            : "This formula has no T⁻¹ typed in, so the graph is redrawn instead.",
      };
    return { route: "exact" };
  }

  // ---- what the list holds ------------------------------------------------------

  /**
   * Readable names where the graph leaves them free — `A`, `T`, `v_{1}` —
   * and the tab's own spellings where it does not, so writing into the list
   * never redefines something the user named.
   */
  private names() {
    const taken = this.definedNames;
    const pick = (readable: string, fallback: string) =>
      taken.has(canonicalIdentifier(readable)) ? fallback : readable;
    const tx = pick("T_{x}", "T_{vtmxx}");
    const ty = tx === "T_{x}" ? pick("T_{y}", "T_{vtmxy}") : "T_{vtmxy}";
    const forward =
      tx === "T_{x}" && ty === "T_{y}" ? pick("T", "T_{vtmx}") : "T_{vtmx}";
    const { config } = this;
    const matrix =
      config.source === "expression"
        ? identifierLatex(canonicalIdentifier(config.expressionName))
        : pick("A", "A_{vtmx}");
    const vector = (k: number) => pick(`v_{${k}}`, `v_{vt${k}}`);
    return { tx, ty, forward, matrix, vector, probe: "p_{vt}" };
  }

  private desired(): Desired {
    const { config } = this;
    const names = this.names();
    const route = this.routeInUse;
    const items: ItemState[] = [
      {
        type: "folder",
        id: MATRIX_FOLDER_ID,
        title: "Vector Tools: the graph through the map",
        collapsed: true,
      },
    ];
    const shown: string[] = [];
    const expression = (
      id: string,
      latex: string,
      extra: Partial<ExpressionState> = {}
    ) => {
      const item: ExpressionState = {
        type: "expression",
        id: `${MATRIX_FOLDER_ID}_${id}`,
        latex,
        color: "#000000",
        folderId: MATRIX_FOLDER_ID,
        ...extra,
      };
      items.push(item);
    };

    // T, one coordinate at a time, and as a function of a point. On the exact
    // route a matrix is written at the scrubber's t, which is what moves the
    // copies; everywhere else it is the finished map.
    const linear = config.kind === "linear";
    const movesWithT = linear && route.route === "exact";
    let fx: string;
    let fy: string;
    if (linear) {
      const base = this.baseMatrix;
      const m = base.ok
        ? movesWithT
          ? homotopy(base.m, this.t)
          : base.m
        : IDENTITY;
      fx = `${latexNumber(m[0])}x+${latexNumber(m[1])}y`.replace(/\+-/g, "-");
      fy = `${latexNumber(m[2])}x+${latexNumber(m[3])}y`.replace(/\+-/g, "-");
    } else {
      fx = config.formula.xLatex.trim() || "x";
      fy = config.formula.yLatex.trim() || "y";
    }
    const pt = String.raw`p.x,p.y`;
    expression("fx", String.raw`${names.tx}\left(x,y\right)=${fx}`, {
      hidden: true,
    });
    expression("fy", String.raw`${names.ty}\left(x,y\right)=${fy}`, {
      hidden: true,
    });
    expression(
      "t",
      String.raw`${names.forward}\left(p\right)=\left(${names.tx}\left(${pt}\right),${names.ty}\left(${pt}\right)\right)`,
      { hidden: true }
    );

    if (linear && config.source === "typed") {
      const line = `${names.matrix}=${matrixLatex(config.entries)}`;
      expression("A", line);
      shown.push(line);
    } else if (!linear) {
      shown.push(
        String.raw`${names.forward}\left(p\right)=\left(${names.tx}\left(${pt}\right),${names.ty}\left(${pt}\right)\right)`
      );
    }

    if (config.writeVectors)
      config.vectors.forEach((v, k) => {
        const name = names.vector(k + 1);
        const tail = `${name}=\\left(${latexNumber(v[0])},${latexNumber(v[1])}\\right)`;
        const image = linear
          ? `${names.matrix}\\cdot ${name}`
          : `${names.forward}\\left(${name}\\right)`;
        expression(`v${k + 1}`, tail, { color: GRAY });
        expression(`w${k + 1}`, image, { color: RED });
        shown.push(tail, image);
      });

    if (!linear && config.show.probe)
      expression(
        "p",
        `${names.probe}=\\left(${latexNumber(this.probe[0])},${latexNumber(this.probe[1])}\\right)`,
        { color: PURPLE, showLabel: true, label: "p" }
      );

    const hide = new Set<string>();
    const skipped: { id: string; reason: string }[] = [];
    const sources = this.sources();
    if (route.route === "exact") {
      const inv = this.inverseLatex(movesWithT);
      expression("ix", String.raw`X_{vtmx}\left(x,y\right)=${inv[0]}`, {
        hidden: true,
      });
      expression("iy", String.raw`Y_{vtmx}\left(x,y\right)=${inv[1]}`, {
        hidden: true,
      });
      const map: MapNames = {
        inverseX: "X_{vtmx}",
        inverseY: "Y_{vtmx}",
        forward: names.forward,
      };
      const reservedT = this.definedNames.has("t");
      const reach = this.parametricReach();
      const { ghost } = config.show;
      if (ghost) {
        expression("gx", String.raw`I_{vtmxx}\left(x,y\right)=x`, {
          hidden: true,
        });
        expression("gy", String.raw`I_{vtmxy}\left(x,y\right)=y`, {
          hidden: true,
        });
        expression("g", String.raw`I_{vtmx}\left(p\right)=p`, {
          hidden: true,
        });
      }
      sources.forEach((source, k) => {
        const result = rewrite(source, String(k), map, reservedT, reach);
        if (!result.ok) {
          skipped.push({ id: source.id, reason: result.reason });
          return;
        }
        result.helpers.forEach((latex, i) =>
          items.push(helperState(helperId(source.id, i), latex))
        );
        const copy: ExpressionState = {
          type: "expression",
          id: copyId(source.id),
          latex: result.copy,
          color: source.color ?? "#000000",
          folderId: MATRIX_FOLDER_ID,
          ...(result.parametric !== undefined
            ? {
                parametricDomain: {
                  min: latexNumber(result.parametric[0]),
                  max: latexNumber(result.parametric[1]),
                },
              }
            : {}),
        };
        items.push(copy);
        hide.add(source.id);
        if (!ghost) return;
        // The same helpers called at (x, y) itself: the graph as typed,
        // drawn by Desmos, since the original is hidden. Styled faint when
        // written, from the original's own look.
        const faint = rewrite(
          source,
          String(k),
          IDENTITY_NAMES,
          reservedT,
          reach
        );
        if (faint.ok)
          items.push({ ...copy, id: ghostId(source.id), latex: faint.copy });
      });
    }
    return { items, hide, skipped, shown };
  }

  /**
   * How far t runs in a curve drawn forwards as T(t, f(t)): as far as the
   * grid reaches (the same walk, so a curve ends where its grid does), with
   * room to spare, rounded up to a power of two. Rounded so a pan rewrites
   * the copies only when the view has moved far enough to need more of the
   * curve, not on every frame of the drag.
   */
  private parametricReach(): number {
    const map = this.mapAtT;
    if (map === undefined) return 64;
    const walk = {
      ...this.gridStart(),
      map,
      view: this.host.bounds(),
      scale: this.host.scale(),
    };
    // The last two lines each way are the ones that showed the walk had
    // finished: past where they are, the picture no longer changes, and a
    // parametric run that far spends Desmos's samples on nothing (measured:
    // t to ±65536 left y = sin x 25 px off near the origin).
    const inner = (positions: number[]) => positions.slice(2, -2);
    const far = Math.max(
      ...[
        ...inner(gridPositions(walk, 0)),
        ...inner(gridPositions(walk, 1)),
      ].map(Math.abs)
    );
    const wanted = Number.isFinite(far) ? Math.max(8, far * 1.25) : 64;
    return 2 ** Math.ceil(Math.log2(wanted));
  }

  /** T_t⁻¹ as LaTeX for the exact route's two inverse definitions. */
  private inverseLatex(movesWithT: boolean): [string, string] {
    const { config } = this;
    if (config.kind === "linear") {
      const base = this.baseMatrix;
      const m = base.ok
        ? movesWithT
          ? homotopy(base.m, this.t)
          : base.m
        : IDENTITY;
      // A matrix on the way from I to a singular A can itself be singular
      // (a reflection passes through one at t = ½). Its copies then have
      // nothing to draw for that frame, which is the truth.
      const inv = inverse(m) ?? [NaN, NaN, NaN, NaN];
      const row = (a: number, b: number) =>
        Number.isFinite(a) && Number.isFinite(b)
          ? `${latexNumber(a)}x+${latexNumber(b)}y`.replace(/\+-/g, "-")
          : String.raw`\frac{0}{0}`;
      return [row(inv[0], inv[1]), row(inv[2], inv[3])];
    }
    return [config.formula.inverseXLatex, config.formula.inverseYLatex];
  }

  /**
   * The expressions the map carries: graphed, shown (or hidden only by this
   * tab), outside any hidden folder, and not this tab's own.
   */
  private sources(): (ExactSource & { color?: string })[] {
    const items = this.host.items();
    const hiddenFolders = new Set(
      items
        .filter((i) => i.type === "folder" && i.hidden === true)
        .map((i) => i.id)
    );
    const hiddenByUs = new Set(
      items.flatMap((i) => {
        const source = sourceOfCopy(i.id);
        return source === undefined ? [] : [source];
      })
    );
    const out: (ExactSource & { color?: string })[] = [];
    for (const item of items) {
      if (item.type !== "expression" || isOwned(item.id)) continue;
      if (hiddenByUs.has(item.id) && item.hidden === false)
        this.released.add(item.id);
      if (this.released.has(item.id)) continue;
      if (item.hidden === true && !hiddenByUs.has(item.id)) continue;
      if (item.folderId !== undefined && hiddenFolders.has(item.folderId))
        continue;
      const f = item.formula;
      if (item.latex === undefined) continue;
      // Desmos fills in an expression's analysis only once it has evaluated
      // it; until then the formula holds an error slot and nothing else. A
      // scrub on the exact route changes the map's definitions every frame,
      // and everything that calls them is pending again for a moment, so an
      // unanalysed expression keeps what it was last found to be, as long as
      // its LaTeX has not changed. One never analysed holds the folder as it
      // is until Desmos has looked at it.
      const analysed =
        f !== undefined &&
        ("is_single_identifier" in f ||
          "is_graphable" in f ||
          "expression_type" in f);
      if (!analysed) {
        const known = this.classified.get(item.id);
        if (known?.latex === item.latex) {
          if (known.source !== undefined)
            out.push({ ...known.source, color: item.color });
        } else this.pendingAnalysis = true;
        continue;
      }
      if (f.is_graphable !== true) {
        this.classified.set(item.id, { latex: item.latex, source: undefined });
        continue;
      }
      const domain = f.domains?.[0];
      const source: ExactSource & { color?: string } = {
        id: item.id,
        latex: item.latex,
        type: f.expression_type,
        inequality: f.is_inequality === true,
        functionName: f.function_definition,
        assignment: f.assignment ?? f.defined_name,
        domain:
          domain !== undefined &&
          Number.isFinite(domain.minNumber) &&
          Number.isFinite(domain.maxNumber)
            ? { min: domain.minNumber!, max: domain.maxNumber! }
            : undefined,
        color: item.color,
      };
      this.classified.set(item.id, { latex: item.latex, source });
      out.push(source);
    }
    return out;
  }

  // ---- reconciling with Desmos -------------------------------------------------

  /** Asks for a sync once the current dispatch, if any, is over. */
  schedule() {
    if (this.syncTimer !== undefined) return;
    this.syncTimer = setTimeout(() => {
      this.syncTimer = undefined;
      this.syncNow();
    }, 0);
  }

  /**
   * Brings the list and the drawing into line with the settings. Safe to
   * call often: when nothing differs it reads the item models and returns.
   */
  syncNow() {
    if (this.host.dispatching()) {
      this.schedule();
      return;
    }
    const { config } = this;
    const active = config.on && !this.host.is3d();
    if (!active) {
      this.stopPlaying();
      this.skipped = [];
      this.skippedIds = new Set();
      this.layer.uninstall();
      this.unwatchBounds?.();
      this.unwatchBounds = undefined;
      this.installError = "";
      if (this.host.items().some((i) => isOwned(i.id))) {
        if (this.host.focusInList()) {
          this.deferred = true;
          return;
        }
        this.host.setState(withOwnedItems(this.host.getState(), [], new Set()));
      }
      this.deferred = false;
      this.syncField();
      this.host.changed();
      return;
    }
    this.readBack();
    this.pendingAnalysis = false;
    const desired = this.desired();
    this.skipped = desired.skipped;
    this.skippedIds = new Set(desired.skipped.map((s) => s.id));
    this.shownLines = desired.shown;
    this.write(desired, !this.pendingAnalysis);
    this.installError = this.layer.install(() => this.scene()) ?? "";
    // A curve drawn forwards runs as far as the grid reaches, which depends
    // on the view; the sync after a pan rewrites it only if that changed.
    this.unwatchBounds ??= this.host.watchBounds(() => this.schedule());
    this.layer.requestRedraw();
    this.syncField();
    this.host.changed();
  }

  private write(desired: Desired, structural: boolean) {
    const items = this.host.items();
    const owned = new Map(
      items.filter((i) => isOwned(i.id)).map((i) => [i.id, i])
    );
    const hiddenNow = new Set(
      items.flatMap((i) => {
        const source = sourceOfCopy(i.id);
        return source === undefined ? [] : [source];
      })
    );
    const sameIds =
      owned.size === desired.items.length &&
      desired.items.every((i) => owned.has(i.id));
    const sameHide =
      hiddenNow.size === desired.hide.size &&
      [...desired.hide].every((id) => hiddenNow.has(id));
    if (sameIds && sameHide) {
      const changes = desired.items.flatMap((item) => {
        if (item.type !== "expression") return [];
        const now = owned.get(item.id)!;
        const latexChanged = (now.latex ?? "") !== (item.latex ?? "");
        const colorChanged =
          item.color !== undefined &&
          now.color !== undefined &&
          now.color !== item.color;
        if (!latexChanged && !colorChanged) return [];
        return [{ id: item.id, latex: item.latex, color: item.color }];
      });
      if (changes.length > 0) {
        this.writes++;
        this.host.setExpressions(changes);
      }
      this.deferred = false;
      return;
    }
    // An expression Desmos has not analysed yet would be left out of the
    // rebuild and then put back a moment later; the evaluator's next report
    // schedules another sync, which rebuilds once it knows.
    if (!structural) return;
    // Rebuilding the folder rebuilds the list, which takes the cursor out of
    // whatever expression the user is typing in. Wait for them to leave it.
    if (this.host.focusInList()) {
      this.deferred = true;
      return;
    }
    this.deferred = false;
    const state = this.host.getState();
    const originals = new Map(
      state.expressions.list
        .filter((i): i is ExpressionState => i.type === "expression")
        .map((i) => [i.id, i])
    );
    const final = desired.items.map((item) => {
      const ghostOf = sourceOfGhost(item.id);
      if (ghostOf !== undefined && item.type === "expression") {
        const original = originals.get(ghostOf);
        if (original === undefined) return item;
        const faint = ghostState(original, item.latex ?? "");
        if (item.parametricDomain !== undefined)
          faint.parametricDomain = item.parametricDomain;
        return faint;
      }
      const source = sourceOfCopy(item.id);
      const original = source === undefined ? undefined : originals.get(source);
      if (original === undefined || item.type !== "expression") return item;
      // A copy looks like its original: colour, line and point style,
      // shading and label, all read from the state at the moment of writing.
      const styled = copyState(original, item.latex ?? "");
      if (item.parametricDomain !== undefined)
        styled.parametricDomain = item.parametricDomain;
      return styled;
    });
    this.writes++;
    this.host.setState(withOwnedItems(state, final, desired.hide));
  }

  /**
   * Takes back what was dragged in the list: a vector's tail or the probe,
   * moved on the graph, is the new setting.
   */
  private readBack() {
    const items = new Map(this.host.items().map((i) => [i.id, i]));
    const read = (id: string): Vec2 | undefined => {
      const latex = items.get(`${MATRIX_FOLDER_ID}_${id}`)?.latex;
      const match =
        latex === undefined
          ? null
          : POINT_LATEX.exec(latex.replace(/\s+/g, ""));
      return match === null ? undefined : [Number(match[1]), Number(match[2])];
    };
    const { config } = this;
    if (config.writeVectors) {
      const moved = config.vectors.map((v, k) => read(`v${k + 1}`) ?? v);
      if (
        moved.some(
          (v, k) =>
            v[0] !== config.vectors[k][0] || v[1] !== config.vectors[k][1]
        )
      )
        this.host.update((c) => {
          c.vectors = moved;
        });
    }
    const probe = read("p");
    if (probe !== undefined) this.probe = probe;
  }

  /** What the layer draws this frame. */
  private scene(): MatrixScene | undefined {
    const { config } = this;
    const map = this.mapAtT;
    if (!config.on || map === undefined) return undefined;
    const { route } = this.routeInUse;
    const skipped = this.skippedIds;
    return {
      map,
      linear: config.kind === "linear",
      kind: config.kind,
      matrix: this.matrixAtT,
      takesOver: (id) =>
        !isOwned(id) && (route === "redraw" || skipped.has(id)),
      ghost: config.show.ghost,
      show: config.show,
      detail: config.detail,
      grid: this.gridStart(),
      vectors: config.vectors,
      probe: config.show.probe ? this.probe : undefined,
    };
  }

  /**
   * Where the grid's walk starts: the preimage of the middle of the screen
   * where an inverse says what that is, and the middle itself otherwise. The
   * spacing there follows the viewport, as Desmos's own grid does; how far
   * the walk may go is the Detail control's (see `grid.ts`).
   */
  private gridStart(): { centre: Vec2; step: number; limit: number } {
    const b = this.host.bounds();
    const step = niceStep(Math.max(b.right - b.left, b.top - b.bottom) / 16);
    let centre: Vec2 = [(b.left + b.right) / 2, (b.bottom + b.top) / 2];
    const middle = this.inverseAtT?.(centre[0], centre[1]);
    if (
      middle !== undefined &&
      Number.isFinite(middle[0]) &&
      Number.isFinite(middle[1])
    )
      centre = middle;
    return { centre, step, limit: GRID_LINES[this.config.detail] };
  }

  /**
   * T as a field for the live arrows, at the scrubber's t, or undefined when
   * the Field toggle is off. Linear maps are written out numerically, and a
   * formula as x + t(x′ − x), so the shader compiler sees ordinary LaTeX.
   */
  get field(): { xLatex: string; yLatex: string } | undefined {
    const { config } = this;
    if (!config.on || !config.show.field || this.host.is3d()) return undefined;
    const t = Math.round(this.t * 100) / 100;
    if (config.kind === "linear") {
      const base = this.baseMatrix;
      if (!base.ok) return undefined;
      const m = homotopy(base.m, t);
      const row = (a: number, b: number) =>
        `${latexNumber(a)}x+${latexNumber(b)}y`.replace(/\+-/g, "-");
      return { xLatex: row(m[0], m[1]), yLatex: row(m[2], m[3]) };
    }
    const { xLatex, yLatex } = config.formula;
    if (t === 1) return { xLatex, yLatex };
    const tt = latexNumber(t);
    return {
      xLatex: String.raw`x+${tt}\left(${xLatex}-x\right)`,
      yLatex: String.raw`y+${tt}\left(${yLatex}-y\right)`,
    };
  }

  private syncField() {
    const { field } = this;
    const key =
      field === undefined ? "" : `${field.xLatex}\u0000${field.yLatex}`;
    if (key === this.lastFieldKey) return;
    this.lastFieldKey = key;
    this.host.fieldChanged();
  }

  /** Puts the graph back exactly as typed: for disabling the plugin. */
  stop() {
    this.stopPlaying();
    if (this.syncTimer !== undefined) clearTimeout(this.syncTimer);
    this.syncTimer = undefined;
    this.unwatchBounds?.();
    this.unwatchBounds = undefined;
    this.layer.uninstall();
    if (this.host.items().some((i) => isOwned(i.id)))
      this.host.setState(withOwnedItems(this.host.getState(), [], new Set()));
  }

  // ---- what the panel says -----------------------------------------------------

  get takeaway() {
    return presetTakeaway(this.config);
  }

  get writtenLines() {
    return this.shownLines;
  }

  /** Every reason the picture is not exactly what was asked for. */
  get status(): string[] {
    const { config } = this;
    const notes: string[] = [];
    if (this.host.is3d()) {
      notes.push(
        "The Matrix tab works on the 2D graph paper; Desmos 3D has no flat graph to transform."
      );
      return notes;
    }
    if (config.kind === "linear") {
      const base = this.baseMatrix;
      if (!base.ok) notes.push(base.error);
    } else {
      const compiled = this.compile();
      if (!compiled.ok) notes.push(`T could not be read: ${compiled.error}`);
      else if (this.unreadNames.length > 0)
        notes.push(
          `T reads ${this.unreadNames.join(", ")}, which ${this.unreadNames.length === 1 ? "is not a slider" : "are not sliders"}; only numbers and sliders can be followed here, so those points are left out.`
        );
    }
    if (this.installError !== "") notes.push(this.installError);
    if (this.drawError !== "") notes.push(`Drawing stopped: ${this.drawError}`);
    if (this.deferred)
      notes.push(
        "Waiting for you to leave the expression you are typing in before rewriting the list."
      );
    if (this.skipped.length > 0) {
      const reasons = [...new Set(this.skipped.map((s) => s.reason))];
      notes.push(
        `${this.skipped.length} expression${this.skipped.length === 1 ? " is" : "s are"} redrawn rather than rewritten: ${reasons.join("; ")}.`
      );
    }
    return notes;
  }

  get routeNote(): string {
    const { config } = this;
    const route = this.routeInUse;
    if (config.route === "redraw")
      return "Works for any map, and scrubs smoothly. Desmos only drew what is on screen, so a map that pulls points inward leaves an empty band at the edge.";
    if (route.route === "redraw") return route.why ?? "";
    return config.kind === "linear"
      ? "Each expression is rewritten with (x, y) → A⁻¹(x, y), and Desmos draws it, shading included, sharp to the edge."
      : "Each expression is rewritten with (x, y) → T⁻¹(x, y). With a formula this draws the finished map only: the in-between maps have no formula for their inverse.";
  }

  /** The image of each vector, for the vector rows. */
  imageOf(v: Vec2): Vec2 | undefined {
    const T = this.baseMap;
    return T === undefined ? undefined : T(v[0], v[1]);
  }

  vectorName(k: number) {
    return this.config.kind === "linear"
      ? `Av${subscript(k + 1)}`
      : `T(v${subscript(k + 1)})`;
  }

  /** The rows of "What A does" or "What T does near p", and one plain sentence. */
  get facts(): { rows: [string, string][]; plain: string } {
    const { config } = this;
    const full = config.level === "full";
    const rows: [string, string][] = [];
    if (!config.on)
      return {
        rows,
        plain: "The map is off, so the graph is drawn exactly as typed.",
      };
    const eigenText = (m: Mat2) => {
      const e = eigen(m);
      return e.complex !== undefined
        ? `${formatNumber(e.complex[0])} ± ${formatNumber(e.complex[1])}i`
        : [...new Set((e.real ?? []).map((r) => formatNumber(r.value)))].join(
            ", "
          );
    };
    if (config.kind === "linear") {
      const base = this.baseMatrix;
      if (!base.ok) return { rows, plain: base.error };
      const M = base.m;
      const e = eigen(M);
      rows.push(
        ["det A", formatNumber(e.det)],
        ["trace", formatNumber(e.trace)]
      );
      rows.push(["eigenvalues", eigenText(M)]);
      if (full) {
        const [s1, s2] = singularValues(M);
        const term = (k: number, x: string) =>
          Math.abs(k) < 1e-12
            ? ""
            : `${k < 0 ? " + " : " − "}${Math.abs(k) === 1 && x ? "" : formatNumber(Math.abs(k))}${x}`;
        rows.push([
          "char. polynomial",
          `λ²${term(trace(M), "λ")}${term(-det(M), "")}`,
        ]);
        rows.push([
          "singular values",
          `${formatNumber(s1)}, ${formatNumber(s2)}`,
        ]);
        rows.push([
          "inverse",
          isSingular(M)
            ? "none (det = 0)"
            : `exists; det A⁻¹ = ${formatNumber(1 / det(M))}`,
        ]);
        if (e.complex !== undefined)
          rows.push([
            "rotation per step",
            `${formatNumber((Math.atan2(e.complex[1], e.complex[0]) * 180) / Math.PI)}°, |λ| = ${formatNumber(Math.hypot(e.complex[0], e.complex[1]))}`,
          ]);
      }
      let plain: string;
      if (isSingular(M))
        plain =
          "A squashes the plane onto a line or a point, so areas become 0 and A cannot be undone.";
      else if (e.complex !== undefined)
        plain = `No direction survives. A turns every vector, and scales areas by ${formatNumber(Math.abs(e.det))}.`;
      else if (e.everyVector)
        plain = `A scales every vector by the same amount, ${formatNumber(M[0])}, in every direction.`;
      else
        plain = `Areas are scaled by ${formatNumber(Math.abs(e.det))}${e.det < 0 ? ", and the plane is flipped over" : ""}. Along the purple lines A only stretches, by its eigenvalues.`;
      return { rows, plain };
    }
    const T = this.baseMap;
    if (T === undefined)
      return { rows, plain: "Type a formula for T to see what it does." };
    const p = this.probe;
    const J = jacobian(T, p);
    const d = det(J);
    const Tp = T(p[0], p[1]);
    rows.push(
      ["p", `(${formatNumber(p[0])}, ${formatNumber(p[1])})`],
      ["T(p)", `(${formatNumber(Tp[0])}, ${formatNumber(Tp[1])})`],
      [
        "J(p)",
        `[${J.map(formatNumber).slice(0, 2).join(", ")}; ${J.map(formatNumber).slice(2).join(", ")}]`,
      ],
      ["det J(p)", formatNumber(d)]
    );
    if (full) {
      const [s1, s2] = singularValues(J);
      rows.push(["eigenvalues of J", eigenText(J)]);
      rows.push([
        "stretch range",
        `${formatNumber(s2)} to ${formatNumber(s1)}`,
      ]);
      rows.push([
        "locally invertible",
        Math.abs(d) < 1e-9 ? "no (det J = 0)" : "yes",
      ]);
    }
    const plain = !Number.isFinite(d)
      ? "T is not defined at p. Drag the probe somewhere it is."
      : Math.abs(d) < 1e-9
        ? "At p, T crushes small shapes flat (det J = 0). The dashed square collapses."
        : `Near p, T acts like the matrix J(p). It scales small areas by ${formatNumber(Math.abs(d))}${d < 0 ? " and flips them over" : ""}. The dashed shape is J's guess, the solid one is T, and they agree as the square shrinks.`;
    return { rows, plain };
  }

  get configSnapshot(): MatrixConfig {
    return cloneMatrixConfig(this.config);
  }
}
