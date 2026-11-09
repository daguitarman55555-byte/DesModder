import {
  getAxisSampleCount,
  type VectorColorMode,
  type VectorFieldConfig,
  type VectorLengthMode,
  ZERO_VECTOR_TOLERANCE,
} from "./model";
import {
  adjustRGB,
  adjustedHSV,
  paletteLatex,
  type ColorAdjust,
} from "../../field-rendering/palettes";
import { renameIdentifier } from "../../field-rendering/identifiers";
import { TIME_NAME } from "../../field-rendering/latexToGLSL";
import type {
  GeneratedExpressionSpec,
  GeneratedFolderSpec,
  GeneratedItemSnapshot,
} from "./desmos/ExpressionAdapter";

type VectorFieldPurpose =
  | "arrow count"
  | "x samples"
  | "y samples"
  | "grid x coordinates"
  | "grid y coordinates"
  | "scalar function"
  | "x component function"
  | "y component function"
  | "actual x components"
  | "actual y components"
  | "actual magnitudes"
  | "actual directions"
  | "displayed x components"
  | "displayed y components"
  | "arrow end x coordinates"
  | "arrow end y coordinates"
  | "color list"
  | "arrow start points"
  | "arrow end points"
  | "color range"
  | "color positions"
  | "color formula"
  | "arrow lengths"
  | "arrowhead lengths"
  | "arrowhead half widths"
  | "shafts"
  | "arrowheads"
  | "zero vector markers"
  | "animation clock"
  | "parametric curve"
  | "curve position";

interface GeneratedVectorFieldExpression extends GeneratedExpressionSpec {
  purpose: VectorFieldPurpose;
}

/** The graph-level ticker a generated field needs, if it needs one. */
interface GeneratedTicker {
  handlerLatex: string;
  minStepLatex: string;
}

export interface VectorFieldPlan {
  namespace: string;
  folder: GeneratedFolderSpec;
  expressions: GeneratedVectorFieldExpression[];
  /**
   * Present only for a field written in terms of `t`.
   *
   * A ticker is graph-level rather than an expression, so it does not live in
   * the list and cannot be namespaced. That makes it the one part of a
   * generated field that can collide with something the user set up themselves.
   */
  ticker?: GeneratedTicker;
}

export interface GenerationOptions {
  /**
   * Rewrite `t` onto the field's own symbol and drive it with a ticker.
   *
   * Decided by the caller rather than here, because it depends on whether the
   * graph defines `t` itself — which the generator has no view of.
   */
  animateTime?: boolean;
  /**
   * The id of the expression that defines `N_{arrows}` in the graph now, if
   * any. A field whose own count row is not it names its count after its
   * token instead, so two generated fields never both define `N_{arrows}`.
   */
  arrowCountOwner?: string;
}

/** The arrow count slider's bounds: N² arrows, at most 2,500 of them. */
export const ARROW_COUNT_MIN = 2;
export const ARROW_COUNT_MAX = 50;

interface ExpressionAuditRow {
  id: string;
  purpose: string;
  present: boolean;
  currentLatex?: string;
  visibility: "hidden" | "visible" | "secret" | "missing";
  folderId?: string;
}

export interface ExpressionAudit {
  rows: ExpressionAuditRow[];
  missing: string[];
  unexpected: string[];
  duplicates: string[];
  /** Rendered rows whose mapped color list was dropped by the calculator. */
  colorLatexMissing: string[];
  folderMissing: boolean;
  renderMissing: boolean;
  namespaceCollision: boolean;
}

export function namespaceForField(config: VectorFieldConfig): string {
  return `vector_tools_vf_${config.id}`;
}

/** The symbol a generated field advances as its clock. */
export function timeSymbolFor(config: VectorFieldConfig) {
  return createSymbols(config).time;
}

/**
 * Every ID this generator can ever emit, whatever the configuration.
 *
 * Not the same as the IDs in one plan, and the difference is load-bearing. A
 * plan varies: a gradient field has `f_function` and a component field does
 * not, the curve's two expressions come and go with a checkbox, and the clock
 * appears only when something needs one. Regenerating with fewer expressions
 * has to *remove* the ones no longer wanted — but an item in the namespace that
 * this generator could never have produced is somebody else's, and deleting it
 * is the bug `cad6b0c9` fixed.
 *
 * So the two questions are different: "is this mine?" is asked of this list,
 * and "do I still want it?" is asked of the plan. Held to the plans by a test,
 * because a suffix added to the generator and forgotten here would come back as
 * an expression that cannot be removed.
 */
const GENERATED_SUFFIXES = [
  "folder",
  "n_arrows",
  "x_samples",
  "y_samples",
  "time",
  "curve",
  "curve_point",
  "f_function",
  "grid_x",
  "grid_y",
  "p_function",
  "q_function",
  "u",
  "v",
  "magnitude",
  "direction",
  "display_u",
  "display_v",
  "end_x",
  "end_y",
  "colors",
  "color_low",
  "color_high",
  "color_t",
  "tint_function",
  "starts",
  "ends",
  "lengths",
  "head_lengths",
  "head_halves",
  "shafts",
  "heads",
  "zero_points",
  // The two wings each arrowhead was before 2026-11-07. No longer written,
  // but still removed, so a graph generated before then cleans up whole.
  "head_1",
  "head_2",
] as const;

export function allGeneratedIDs(config: VectorFieldConfig): string[] {
  const namespace = namespaceForField(config);
  return GENERATED_SUFFIXES.map((suffix) => `${namespace}_${suffix}`);
}

export type ComponentSlot = "p" | "q" | "f";

/**
 * The slots the user types into for a given source. In gradient mode P and Q
 * are derived from f, so they are generated but never adopted back: editing
 * them by hand would silently break the link to the function they came from.
 */
export function editableSlots(
  config: VectorFieldConfig
): readonly ComponentSlot[] {
  return config.source === "gradient" ? ["f"] : ["p", "q"];
}

/** The config field a slot reads from and writes back to. */
export function slotBody(config: VectorFieldConfig, slot: ComponentSlot) {
  if (slot === "f") return config.scalar.fLatex;
  return slot === "p" ? config.components.xLatex : config.components.yLatex;
}

export function setSlotBody(
  config: VectorFieldConfig,
  slot: ComponentSlot,
  body: string
) {
  if (slot === "f") config.scalar.fLatex = body;
  else if (slot === "p") config.components.xLatex = body;
  else config.components.yLatex = body;
}

/**
 * IDs of the expressions that hold the field's definitions. They are ordinary
 * expressions in the generated folder, so they can be edited either in the
 * panel or directly in the expression list.
 */
export function componentExpressionID(
  config: VectorFieldConfig,
  slot: ComponentSlot
) {
  return `${namespaceForField(config)}_${slot}_function`;
}

/** The full `v_{tfdp}\left(x,y\right)=...` definition for one slot. */
export function componentFunctionLatex(
  config: VectorFieldConfig,
  slot: ComponentSlot,
  animateTime = false
) {
  const symbols = createSymbols(config);
  return `${slotSymbol(symbols, slot)}\\left(x,y\\right)=\\left(${componentBodyLatex(
    config,
    slot,
    symbols,
    animateTime
  )}\\right)`;
}

function slotSymbol(
  symbols: ReturnType<typeof createSymbols>,
  slot: ComponentSlot
) {
  if (slot === "f") return symbols.scalarFunction;
  return slot === "p" ? symbols.xFunction : symbols.yFunction;
}

/**
 * Moves a component off `t` on its way into the expression list.
 *
 * A global `t` cannot be defined in a graph that draws arrows, because the
 * shafts and wings are restricted parametrics *in* `t`. Defining it does not
 * error — which is why this was nearly missed — it quietly stops them being
 * parametrics: Desmos evaluates them at the global value and draws a point per
 * arrow instead of a segment. `isGraphable` stays true throughout. The
 * difference is only visible in a picture, and it is the difference between a
 * field of arrows and a field of dots.
 *
 * So the user's `t` becomes the field's own `v_{tf?t}`, which nothing else
 * binds, and a ticker drives that instead.
 */
function withTimeRenamed(
  latex: string,
  symbols: ReturnType<typeof createSymbols>,
  animateTime: boolean
) {
  return animateTime ? renameIdentifier(latex, TIME_NAME, symbols.time) : latex;
}

/**
 * The right-hand side of a slot's definition. In gradient mode P and Q are
 * Desmos's own partial derivatives of the scalar function.
 *
 * `\frac{d}{dx}` applied to a two-argument function is the partial with respect
 * to x, holding y — verified against a real Desmos, where it is exact rather
 * than approximated. `\frac{\partial}{\partial x}` and `\partial_{x}` both
 * error, so this is the only spelling that works.
 */
function componentBodyLatex(
  config: VectorFieldConfig,
  slot: ComponentSlot,
  symbols: ReturnType<typeof createSymbols>,
  animateTime = false
) {
  const rename = (latex: string) =>
    withTimeRenamed(latex, symbols, animateTime);
  if (slot === "f") return rename(config.scalar.fLatex);
  if (config.source === "gradient") {
    // Derived from the scalar, which has already been rewritten, so there is
    // nothing here for the rename to find.
    const variable = slot === "p" ? "dx" : "dy";
    return `\\frac{d}{${variable}}${symbols.scalarFunction}\\left(x,y\\right)`;
  }
  return rename(
    slot === "p" ? config.components.xLatex : config.components.yLatex
  );
}

/**
 * Recover a component body from a definition the user may have edited.
 *
 * Returns undefined if the left-hand side no longer matches what the generator
 * owns — renaming the function or changing its parameters means the expression
 * is no longer this field's component, and silently adopting it would rewrite
 * the wrong thing.
 */
export function parseComponentFromLatex(
  config: VectorFieldConfig,
  slot: ComponentSlot,
  latex: string | undefined,
  animateTime = false
): string | undefined {
  if (latex === undefined) return undefined;
  const symbols = createSymbols(config);
  const symbol = slotSymbol(symbols, slot);
  const normalized = latex.replace(/\s+/g, "");
  const prefixes = [
    `${symbol}\\left(x,y\\right)=`,
    `${symbol}\\left(x,y\\right)\\to`,
    `${symbol}(x,y)=`,
  ];
  const prefix = prefixes.find((candidate) => normalized.startsWith(candidate));
  if (prefix === undefined) return undefined;
  const body = stripOuterParens(normalized.slice(prefix.length));
  // Undo the rename on the way back, so what the panel shows is what the user
  // wrote. Without this, editing the definition in the expression list once
  // would replace `t` with the generated symbol in the stored configuration,
  // and the field would stop being time-varying from the plugin's point of
  // view while still animating.
  return animateTime ? renameIdentifier(body, symbols.time, TIME_NAME) : body;
}

/** Remove one layer of `\left(...\right)` or `(...)` wrapping the whole value. */
function stripOuterParens(value: string): string {
  for (const [open, close] of [
    ["\\left(", "\\right)"],
    ["(", ")"],
  ] as const) {
    if (!value.startsWith(open) || !value.endsWith(close)) continue;
    const inner = value.slice(open.length, value.length - close.length);
    // Only strip if those two delimiters are actually paired with each other,
    // so `\left(a\right)+\left(b\right)` is left alone.
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner.startsWith("\\left(", i)) depth++;
      else if (inner.startsWith("\\right)", i)) depth--;
      else if (inner[i] === "(") depth++;
      else if (inner[i] === ")") depth--;
      if (depth < 0) return value;
    }
    if (depth === 0) return inner;
  }
  return value;
}

/**
 * The graph-level ticker that advances a generated field's clock.
 *
 * `\operatorname{dt}` is the milliseconds since the last tick, so the clock
 * gains `speed` per real second whatever rate Desmos happens to tick at. A
 * fixed step per tick would have made the generated animation run at whatever
 * the tick rate turned out to be — measured at about 27 ticks a second in the
 * test harness rather than the 62 a 16ms minimum step suggests — and so at a
 * different speed from the live overlay, which is paced by elapsed time.
 *
 * The minimum step is zero: `dt` already makes the rate independent of how
 * often this runs, so there is nothing to gain by running it less often.
 */
function tickerFor(symbol: string, speed: number) {
  return {
    handlerLatex: `${symbol}\\to ${symbol}+${numberLatex(speed)}\\cdot\\frac{\\operatorname{dt}}{1000}`,
    minStepLatex: "0",
  };
}

export function createVectorFieldPlan(
  config: VectorFieldConfig,
  { animateTime = false, arrowCountOwner }: GenerationOptions = {}
): VectorFieldPlan {
  const namespace = namespaceForField(config);
  const symbols = createSymbols(config);
  // N_{arrows} arrows a side, N² in all, on a slider in the folder (Rafael,
  // 2026-11-09): the grid is the user's to thin or thicken in Desmos itself,
  // without coming back to the panel. It starts at the panel's density.
  const countID = `${namespace}_n_arrows`;
  const count =
    arrowCountOwner === undefined || arrowCountOwner === countID
      ? "N_{arrows}"
      : `N_{arrows${config.id === "test" ? "t" : config.symbolToken}}`;
  const startCount = Math.round(
    clampNumber(
      Math.sqrt(
        getAxisSampleCount(config.domain.x) *
          getAxisSampleCount(config.domain.y)
      ),
      ARROW_COUNT_MIN,
      ARROW_COUNT_MAX
    )
  );
  const xSpan = config.domain.x.max - config.domain.x.min;
  const ySpan = config.domain.y.max - config.domain.y.min;
  // The arrows' length follows the grid's spacing as N_{arrows} moves, so
  // more arrows are shorter ones rather than overlapping ones.
  const targetLength = config.length.autoLength
    ? String.raw`0.7\cdot${numberLatex(
        Math.min(Math.abs(xSpan), Math.abs(ySpan))
      )}/\left(${count}-1\right)`
    : numberLatex(config.length.targetLength);
  const folder: GeneratedFolderSpec = {
    id: `${namespace}_folder`,
    title: `Vector Tools — ${config.name}`,
    // Folded: open, the expression list drew every one of the twenty-odd
    // rows, each with a preview of its thousand-element list.
    collapsed: true,
  };
  const expression = (
    suffix: string,
    purpose: VectorFieldPurpose,
    latex: string,
    opts: Partial<GeneratedExpressionSpec> = {}
  ): GeneratedVectorFieldExpression => ({
    id: `${namespace}_${suffix}`,
    purpose,
    latex,
    folderId: folder.id,
    hidden: opts.hidden ?? true,
    secret: opts.secret,
    color: opts.color,
    colorLatex: opts.colorLatex,
    ...(opts.style === undefined ? {} : { style: opts.style }),
  });

  const xSamples = axisSamplesLatex(
    symbols.xSamples,
    config.domain.x.min,
    xSpan,
    count
  );
  const ySamples = axisSamplesLatex(
    symbols.ySamples,
    config.domain.y.min,
    ySpan,
    count
  );
  const display = displayComponentsLatex(
    config.length.mode,
    symbols,
    targetLength,
    config.length.scale,
    config.length.maximumLength,
    config.length.compression
  );
  const colorLatex = colorListLatex(config.color.mode, config, symbols);
  const zeroRestriction = `\\left\\{${symbols.magnitude}\\le${numberLatex(
    ZERO_VECTOR_TOLERANCE
  )}\\right\\}`;
  const headSize = numberLatex(config.arrowhead.size);
  // Desmos's own geometry, not parametrics. Each arrow was three curves in
  // t ∈ [0, 1] (shaft and two wings), and Desmos samples every parametric
  // adaptively: 273 arrows were 819 sampled curves. One list of two-vertex
  // polygons (each drawn as its edge, a straight segment) and one of filled
  // triangles are drawn exactly, and the heads now match the live arrows'
  // filled ones (Rafael, 2026-11-07: "load faster"). Not `segment`: the
  // graphing calculator refuses it ("does not support the 'segment'
  // function", measured 2026-11-07); it belongs to the geometry tool.
  //
  // A zero vector's start and end are undefined rather than filtered out, so
  // every list keeps one entry per arrow and the colour list, which Desmos
  // only takes as it was written (see the int test on colorLatex), stays in
  // step with them.
  const pointsLatex = (symbol: string, x: string, y: string) =>
    `${symbol}=\\left\\{${symbols.magnitude}>${numberLatex(
      ZERO_VECTOR_TOLERANCE
    )}:\\left(${x},${y}\\right)\\right\\}`;
  const shaftLatex = `\\operatorname{polygon}\\left(${symbols.starts},${symbols.ends}\\right)`;
  // Each head sized by its own arrow, as the live arrows' are (Rafael,
  // 2026-11-08): as long as the arrowhead size, but never more than 0.45 of
  // the arrow, and no wider than half of it, so a short vector keeps a shaft
  // instead of becoming a triangle on a dot. ArrowRenderer's vertex shader
  // is the same rule.
  // Both as fractions of the arrow's own displayed vector (du, dv), so the
  // wings are ends − hl·(du, dv) ± hw·(−dv, du): no angle, no trig, two
  // multiplies a wing for each arrow.
  const R = String.raw;
  const lengthLatex = R`${symbols.lengths}=\sqrt{${symbols.displayU}^{2}+${symbols.displayV}^{2}}`;
  const headLengthLatex = R`${symbols.headLengths}=\min\left(${headSize},0.45${symbols.lengths}\right)/${symbols.lengths}`;
  const headHalfLatex = R`${symbols.headHalves}=\min\left(${symbols.headLengths}\cdot${numberLatex(Math.tan(config.arrowhead.angleRadians))},0.5\right)`;
  const wing = (sign: "+" | "-") =>
    R`${symbols.ends}-${symbols.headLengths}\left(${symbols.displayU},${symbols.displayV}\right)${sign}${symbols.headHalves}\left(-${symbols.displayV},${symbols.displayU}\right)`;
  const headsLatex = `\\operatorname{polygon}\\left(${symbols.ends},${wing("-")},${wing("+")}\\right)`;
  const zeroLatex = `\\left(${symbols.gridX},${symbols.gridY}\\right)${zeroRestriction}`;

  // Only gradient fields carry the scalar function; a component field would
  // have nothing to put in it.
  const scalarExpressions =
    config.source === "gradient"
      ? [
          expression(
            "f_function",
            "scalar function",
            componentFunctionLatex(config, "f", animateTime)
          ),
        ]
      : [];

  // A curve is one parametric expression, because Desmos draws parametrics and
  // there is nothing to gain by drawing one ourselves. Its `t` is the
  // parametric's own, bound inside the expression — safe only because a
  // time-varying field was rewritten off `t` above.
  const { curve } = config;
  const movingPoint = curve.enabled && curve.showPoint;
  const curveExpressions = curve.enabled
    ? [
        expression(
          "curve",
          "parametric curve",
          `\\left(${curve.xLatex},${curve.yLatex}\\right)\\left\\{${numberLatex(
            curve.tMin
          )}\\le t\\le${numberLatex(curve.tMax)}\\right\\}`,
          {
            hidden: false,
            color: curve.color,
            lineWidth: numberLatex(curve.lineWidth),
          }
        ),
        ...(movingPoint
          ? [
              // The same two functions read at the clock instead of swept, so
              // the dot is on the curve by construction rather than by keeping
              // a second copy of it in step.
              expression(
                "curve_point",
                "curve position",
                `\\left(${renameIdentifier(
                  curve.xLatex,
                  TIME_NAME,
                  symbols.time
                )},${renameIdentifier(
                  curve.yLatex,
                  TIME_NAME,
                  symbols.time
                )}\\right)`,
                { hidden: false, color: curve.color }
              ),
            ]
          : []),
      ]
    : [];

  // The clock the ticker drives. Two things can call for one: the field being
  // written in terms of `t`, and a curve wanting a dot that moves along it.
  const needsClock = animateTime || movingPoint;
  const timeExpressions = needsClock
    ? [expression("time", "animation clock", `${symbols.time}=0`)]
    : [];

  return {
    namespace,
    folder,
    ticker: needsClock ? tickerFor(symbols.time, config.time.speed) : undefined,
    expressions: [
      {
        ...expression("n_arrows", "arrow count", `${count}=${startCount}`),
        slider: {
          min: String(ARROW_COUNT_MIN),
          max: String(ARROW_COUNT_MAX),
          step: "1",
        },
        // A rewrite (a palette change rewrites the arrows) keeps the count
        // the user dragged it to.
        keepValue: true,
      },
      expression("x_samples", "x samples", xSamples),
      expression("y_samples", "y samples", ySamples),
      ...timeExpressions,
      ...curveExpressions,
      ...scalarExpressions,
      expression(
        "grid_x",
        "grid x coordinates",
        `${symbols.gridX}=x\\operatorname{for}x=${symbols.xSamples},y=${symbols.ySamples}`
      ),
      expression(
        "grid_y",
        "grid y coordinates",
        `${symbols.gridY}=y\\operatorname{for}x=${symbols.xSamples},y=${symbols.ySamples}`
      ),
      expression(
        "p_function",
        "x component function",
        componentFunctionLatex(config, "p", animateTime)
      ),
      expression(
        "q_function",
        "y component function",
        componentFunctionLatex(config, "q", animateTime)
      ),
      expression(
        "u",
        "actual x components",
        `${symbols.u}=${symbols.xFunction}\\left(${symbols.gridX},${symbols.gridY}\\right)`
      ),
      expression(
        "v",
        "actual y components",
        `${symbols.v}=${symbols.yFunction}\\left(${symbols.gridX},${symbols.gridY}\\right)`
      ),
      expression(
        "magnitude",
        "actual magnitudes",
        `${symbols.magnitude}=\\sqrt{${symbols.u}^{2}+${symbols.v}^{2}}`
      ),
      expression(
        "direction",
        "actual directions",
        `${symbols.direction}=\\arctan\\left(${symbols.v},${symbols.u}\\right)`
      ),
      expression("display_u", "displayed x components", display.u),
      expression("display_v", "displayed y components", display.v),
      expression(
        "end_x",
        "arrow end x coordinates",
        `${symbols.endX}=${symbols.gridX}+${symbols.displayU}`
      ),
      expression(
        "end_y",
        "arrow end y coordinates",
        `${symbols.endY}=${symbols.gridY}+${symbols.displayV}`
      ),
      ...colorLatex.helpers.map((h) =>
        expression(h.suffix, h.purpose, h.latex)
      ),
      expression("colors", "color list", colorLatex.latex),
      expression(
        "starts",
        "arrow start points",
        pointsLatex(symbols.starts, symbols.gridX, symbols.gridY)
      ),
      expression(
        "ends",
        "arrow end points",
        pointsLatex(symbols.ends, symbols.endX, symbols.endY)
      ),
      expression("lengths", "arrow lengths", lengthLatex),
      expression("head_lengths", "arrowhead lengths", headLengthLatex),
      expression("head_halves", "arrowhead half widths", headHalfLatex),
      expression("shafts", "shafts", shaftLatex, {
        hidden: false,
        color: config.color.fixedColor,
        colorLatex: symbols.colors,
      }),
      expression("heads", "arrowheads", headsLatex, {
        hidden: false,
        color: config.color.fixedColor,
        colorLatex: symbols.colors,
        style: { fill: true, fillOpacity: "1" },
      }),
      expression("zero_points", "zero vector markers", zeroLatex, {
        hidden: config.zeroVectorMode === "hide",
        color: config.color.fixedColor,
        colorLatex: symbols.colors,
      }),
    ],
  };
}

export function auditVectorFieldPlan(
  plan: VectorFieldPlan,
  currentItems: GeneratedItemSnapshot[]
): ExpressionAudit {
  const byId = new Map<string, GeneratedItemSnapshot[]>();
  for (const item of currentItems) {
    const items = byId.get(item.id) ?? [];
    items.push(item);
    byId.set(item.id, items);
  }
  const expectedIDs = new Set([
    plan.folder.id,
    ...plan.expressions.map((e) => e.id),
  ]);
  const rows: ExpressionAuditRow[] = plan.expressions.map((expected) => {
    const current = byId.get(expected.id)?.[0];
    return {
      id: expected.id,
      purpose: expected.purpose,
      present: current !== undefined,
      currentLatex: current?.latex,
      visibility:
        current === undefined
          ? "missing"
          : current.secret
            ? "secret"
            : current.hidden
              ? "hidden"
              : "visible",
      folderId: current?.folderId,
    };
  });
  const missing = rows.filter((row) => !row.present).map((row) => row.id);
  const unexpected = currentItems
    .filter((item) => !expectedIDs.has(item.id))
    .map((item) => item.id);
  const duplicates = [...byId.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([id]) => id);
  const folder = byId.get(plan.folder.id)?.[0];
  const renderIDs = plan.expressions
    .filter((expression) => expression.hidden === false)
    .map((expression) => expression.id);
  const colorLatexMissing = plan.expressions
    .filter((expression) => {
      if (expression.colorLatex === undefined) return false;
      const current = byId.get(expression.id)?.[0];
      return (
        current !== undefined && current.colorLatex !== expression.colorLatex
      );
    })
    .map((expression) => expression.id);
  return {
    rows,
    missing,
    unexpected,
    duplicates,
    colorLatexMissing,
    folderMissing: folder?.type !== "folder",
    renderMissing: renderIDs.some((id) => !byId.has(id)),
    namespaceCollision:
      (folder !== undefined && folder.type !== "folder") ||
      duplicates.length > 0,
  };
}

/**
 * The Desmos symbols one field's generated expressions define.
 *
 * Keyed by the field's own token, so two fields generated into the same graph
 * do not both define `v_{tfdp}`. Before the library existed this took the
 * field's id and threw it away — every field produced the same symbols, which
 * was invisible while only one field could exist and a duplicate-definition
 * error the moment two could.
 *
 * The test lab keeps `t`, which is why `SYMBOL_TOKENS` does not offer it.
 */
function createSymbols(config: Pick<VectorFieldConfig, "id" | "symbolToken">) {
  const instance = config.id === "test" ? "t" : config.symbolToken;
  const symbol = (suffix: string) => `v_{tf${instance}${suffix}}`;
  return {
    xSamples: symbol("xs"),
    ySamples: symbol("ys"),
    gridX: symbol("gx"),
    gridY: symbol("gy"),
    scalarFunction: symbol("f"),
    xFunction: symbol("p"),
    yFunction: symbol("q"),
    u: symbol("u"),
    v: symbol("v"),
    magnitude: symbol("m"),
    direction: symbol("a"),
    displayU: symbol("du"),
    displayV: symbol("dv"),
    endX: symbol("ex"),
    endY: symbol("ey"),
    colors: symbol("c"),
    starts: symbol("s"),
    ends: symbol("e"),
    lengths: symbol("l"),
    colorLow: symbol("cl"),
    colorHigh: symbol("ch"),
    colorT: symbol("ct"),
    tint: symbol("w"),
    headLengths: symbol("hl"),
    headHalves: symbol("hw"),
    // The clock a time-varying field is rewritten onto. See `renameIdentifier`.
    time: symbol("t"),
  };
}

/** `count` samples from `min` across `span`, both ends included. */
function axisSamplesLatex(
  symbol: string,
  min: number,
  span: number,
  count: string
) {
  return `${symbol}=${numberLatex(min)}+\\frac{${numberLatex(span)}}{${count}-1}\\cdot\\left[0...${count}-1\\right]`;
}

function clampNumber(value: number, low: number, high: number) {
  return Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;
}

function displayComponentsLatex(
  mode: VectorLengthMode,
  symbols: ReturnType<typeof createSymbols>,
  targetLength: string,
  scale: number,
  maximumLength: number,
  compression: number
) {
  const denominator = `\\max\\left(${symbols.magnitude},${numberLatex(
    ZERO_VECTOR_TOLERANCE
  )}\\right)`;
  let factor: string;
  switch (mode) {
    case "actual":
      factor = "1";
      break;
    case "normalized":
    case "direction-only":
      factor = `${targetLength}/${denominator}`;
      break;
    case "scaled":
      factor = numberLatex(scale);
      break;
    case "clamped":
      factor = `\\min\\left(${numberLatex(scale)}\\cdot ${symbols.magnitude},${numberLatex(maximumLength)}\\right)/${denominator}`;
      break;
    case "compressed":
      factor = `${numberLatex(scale)}\\cdot \\ln\\left(1+${numberLatex(compression)}\\cdot ${symbols.magnitude}\\right)/\\left(${numberLatex(compression)}\\cdot ${denominator}\\right)`;
      break;
  }
  return {
    u: `${symbols.displayU}=\\left(${factor}\\right)\\cdot ${symbols.u}`,
    v: `${symbols.displayV}=\\left(${factor}\\right)\\cdot ${symbols.v}`,
  };
}

function colorListLatex(
  mode: VectorColorMode,
  config: VectorFieldConfig,
  symbols: ReturnType<typeof createSymbols>
) {
  const actualMagnitude =
    mode === "log-magnitude"
      ? `\\ln\\left(1+\\max\\left(${symbols.magnitude},0\\right)\\right)`
      : symbols.magnitude;
  // The ramp position is its own list, and the range it spans its own two
  // numbers. Written inline, the palette's formula repeated the position
  // once per stop and channel (about twenty times), each copy with its own
  // min and max over every arrow: most of the colour list's cost.
  const tol = numberLatex(ZERO_VECTOR_TOLERANCE);
  const helpers: {
    suffix: string;
    purpose: VectorFieldPurpose;
    latex: string;
  }[] = [];
  const auto = config.color.rangeMode !== "manual";
  const rangeMin = auto ? symbols.colorLow : numberLatex(config.color.minimum);
  const rangeMax = auto ? symbols.colorHigh : numberLatex(config.color.maximum);
  const position = (latex: string) => {
    helpers.push({
      suffix: "color_t",
      purpose: "color positions",
      latex: `${symbols.colorT}=${clamp01(latex)}`,
    });
    return symbols.colorT;
  };
  const rangeT = () => {
    if (auto)
      helpers.push(
        {
          suffix: "color_low",
          purpose: "color range",
          // The 5th to the 95th percentile, not min to max: a field with a
          // singularity (a charge, a vortex core) has a few arrows a hundred
          // times the rest, and min to max put every other arrow at the
          // bottom of the ramp, one colour (Rafael, 2026-11-08).
          latex: `${symbols.colorLow}=\\operatorname{quantile}\\left(${actualMagnitude},0.05\\right)`,
        },
        {
          suffix: "color_high",
          purpose: "color range",
          latex: `${symbols.colorHigh}=\\operatorname{quantile}\\left(${actualMagnitude},0.95\\right)`,
        }
      );
    return position(
      `\\left(${actualMagnitude}-${rangeMin}\\right)/\\max\\left(${rangeMax}-${rangeMin},${tol}\\right)`
    );
  };
  const componentT = (component: string) => {
    helpers.push({
      suffix: "color_high",
      purpose: "color range",
      latex: `${symbols.colorHigh}=\\max\\left(\\operatorname{quantile}\\left(\\left|${component}\\right|,0.95\\right),${tol}\\right)`,
    });
    return position(
      `\\left(${component}+${symbols.colorHigh}\\right)/\\left(2${symbols.colorHigh}\\right)`
    );
  };
  // The generated arrows go through the same saturation and contrast the live
  // ones do. Two ways of drawing one field that disagree about its colours
  // would make switching between them look like changing the field.
  const adjust = colorAdjustOf(config);
  let colorExpression: string;
  switch (mode) {
    case "fixed": {
      const [red, green, blue] = adjustRGB(
        hexToRGB(config.color.fixedColor),
        adjust
      );
      colorExpression = `\\operatorname{rgb}\\left(${red}+0\\cdot ${symbols.gridX},${green}+0\\cdot ${symbols.gridX},${blue}+0\\cdot ${symbols.gridX}\\right)`;
      break;
    }
    case "direction": {
      // The direction wheel is an `hsv` call rather than a ramp with stops, so
      // it takes the approximate adjustment; `adjustedHSV` says why.
      const hsv = adjustedHSV(0.82, 0.9, adjust);
      colorExpression = `\\operatorname{hsv}\\left(180\\left(${
        symbols.direction
      }/\\pi+1\\right),${numberLatex(hsv.saturation)},${numberLatex(
        hsv.value
      )}\\right)`;
      break;
    }
    case "x-component":
      colorExpression = divergingColorLatex(componentT(symbols.u), adjust);
      break;
    case "y-component":
      colorExpression = divergingColorLatex(componentT(symbols.v), adjust);
      break;
    case "scalar": {
      // The flow's tint formula at each arrow, through the live arrows'
      // saturating ramp: 0.5 + 0.5 tanh(w / scale), so the colour runs
      // smoothly from one end through the middle to the other.
      const tint = config.flow.tintLatex.trim() || "0";
      helpers.push({
        suffix: "tint_function",
        purpose: "color formula",
        latex: String.raw`${symbols.tint}\left(x,y\right)=${tint}`,
      });
      colorExpression = paletteColorLatex(
        config.color.palette,
        position(
          String.raw`0.5+0.5\tanh\left(${symbols.tint}\left(${symbols.gridX},${symbols.gridY}\right)/${numberLatex(Math.max(1e-9, config.flow.tintScale))}\right)`
        ),
        adjust
      );
      break;
    }
    case "magnitude":
    case "log-magnitude":
      colorExpression = paletteColorLatex(
        config.color.palette,
        rangeT(),
        adjust
      );
      break;
  }
  // Fixed and direction read no range, and push none.
  return { latex: `${symbols.colors}=${colorExpression}`, helpers };
}

/** The saturation and contrast this field's colours are drawn at. */
function colorAdjustOf(config: VectorFieldConfig): ColorAdjust {
  return {
    saturation: config.color.saturation,
    contrast: config.color.contrast,
  };
}

function paletteColorLatex(
  palette: VectorFieldConfig["color"]["palette"],
  t: string,
  adjust: ColorAdjust
) {
  return paletteLatex(palette, t, numberLatex, adjust);
}

/**
 * The ramp a signed component is drawn with: blue below zero, red above, and
 * light through the middle, so the neutral value recedes instead of shouting.
 */
function divergingColorLatex(t: string, adjust: ColorAdjust) {
  return paletteLatex("blue-red", t, numberLatex, adjust);
}

function clamp01(value: string) {
  return `\\min\\left(1,\\max\\left(0,${value}\\right)\\right)`;
}

function hexToRGB(value: string): [number, number, number] {
  const hex = value.slice(1);
  const normalized =
    hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

/**
 * Plain decimals wherever they stay short, so the generated folder reads like
 * something a person wrote. Only genuinely tiny or huge magnitudes fall back to
 * scientific notation.
 */
function numberLatex(value: number) {
  if (Number.isInteger(value) && Math.abs(value) < 1e15)
    return value.toString();
  const magnitude = Math.abs(value);
  if (magnitude >= 1e-4 && magnitude < 1e15) {
    const fixed = value.toPrecision(12);
    return fixed.includes("e")
      ? String(Number(fixed))
      : fixed.replace(/0+$/, "").replace(/\.$/, "");
  }
  const [coefficient, exponent] = value.toExponential(10).split("e");
  const trimmedCoefficient = coefficient.replace(/0+$/, "").replace(/\.$/, "");
  const exponentNumber = Number(exponent);
  return exponentNumber === 0
    ? trimmedCoefficient
    : `${trimmedCoefficient}\\cdot10^{${exponentNumber}}`;
}
