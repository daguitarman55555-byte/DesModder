import {
  getAxisSampleCount,
  getAxisSpacing,
  type VectorColorMode,
  type VectorFieldConfig,
  type VectorLengthMode,
  ZERO_VECTOR_TOLERANCE,
} from "./model";
import type {
  GeneratedExpressionSpec,
  GeneratedFolderSpec,
  GeneratedItemSnapshot,
} from "./desmos/ExpressionAdapter";

export type VectorFieldPurpose =
  | "x samples"
  | "y samples"
  | "grid x coordinates"
  | "grid y coordinates"
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
  | "shafts"
  | "first arrowhead wing"
  | "second arrowhead wing"
  | "zero vector markers";

export interface GeneratedVectorFieldExpression
  extends GeneratedExpressionSpec {
  purpose: VectorFieldPurpose;
}

export interface VectorFieldPlan {
  namespace: string;
  folder: GeneratedFolderSpec;
  expressions: GeneratedVectorFieldExpression[];
}

export interface ExpressionAuditRow {
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

export function createVectorFieldPlan(
  config: VectorFieldConfig
): VectorFieldPlan {
  const namespace = namespaceForField(config);
  const symbols = createSymbols(config.id);
  const xCount = getAxisSampleCount(config.domain.x);
  const yCount = getAxisSampleCount(config.domain.y);
  const xSpacing = getAxisSpacing(config.domain.x);
  const ySpacing = getAxisSpacing(config.domain.y);
  const targetLength = config.length.autoLength
    ? 0.7 * Math.min(Math.abs(xSpacing), Math.abs(ySpacing))
    : config.length.targetLength;
  const folder: GeneratedFolderSpec = {
    id: `${namespace}_folder`,
    title: `Vector Tools — ${config.name}`,
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
  });

  const xSamples = axisSamplesLatex(
    symbols.xSamples,
    config.domain.x.min,
    xSpacing,
    xCount
  );
  const ySamples = axisSamplesLatex(
    symbols.ySamples,
    config.domain.y.min,
    ySpacing,
    yCount
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
  const nonZeroRestriction = `\\left\\{${symbols.magnitude}>${numberLatex(
    ZERO_VECTOR_TOLERANCE
  )}\\right\\}`;
  const zeroRestriction = `\\left\\{${symbols.magnitude}\\le${numberLatex(
    ZERO_VECTOR_TOLERANCE
  )}\\right\\}`;
  const headSize = numberLatex(config.arrowhead.size);
  const headAngle = numberLatex(config.arrowhead.angleRadians);
  const shaftLatex = parametricSegmentLatex(
    symbols.gridX,
    symbols.gridY,
    symbols.endX,
    symbols.endY,
    nonZeroRestriction
  );
  const head1Latex = arrowheadWingLatex(
    symbols,
    headSize,
    headAngle,
    "-",
    nonZeroRestriction
  );
  const head2Latex = arrowheadWingLatex(
    symbols,
    headSize,
    headAngle,
    "+",
    nonZeroRestriction
  );
  const zeroLatex = `\\left(${symbols.gridX},${symbols.gridY}\\right)${zeroRestriction}`;

  return {
    namespace,
    folder,
    expressions: [
      expression("x_samples", "x samples", xSamples),
      expression("y_samples", "y samples", ySamples),
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
        `${symbols.xFunction}\\left(x,y\\right)=\\left(${config.components.xLatex}\\right)`
      ),
      expression(
        "q_function",
        "y component function",
        `${symbols.yFunction}\\left(x,y\\right)=\\left(${config.components.yLatex}\\right)`
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
      expression("colors", "color list", colorLatex),
      expression("shafts", "shafts", shaftLatex, {
        hidden: false,
        color: config.color.fixedColor,
        colorLatex: symbols.colors,
      }),
      expression("head_1", "first arrowhead wing", head1Latex, {
        hidden: false,
        color: config.color.fixedColor,
        colorLatex: symbols.colors,
      }),
      expression("head_2", "second arrowhead wing", head2Latex, {
        hidden: false,
        color: config.color.fixedColor,
        colorLatex: symbols.colors,
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

function createSymbols(instanceID: string) {
  const instance = instanceID === "test" ? "t" : "d";
  const symbol = (suffix: string) => `v_{tf${instance}${suffix}}`;
  return {
    xSamples: symbol("xs"),
    ySamples: symbol("ys"),
    gridX: symbol("gx"),
    gridY: symbol("gy"),
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
  };
}

function axisSamplesLatex(
  symbol: string,
  min: number,
  spacing: number,
  count: number
) {
  return `${symbol}=${numberLatex(min)}+${numberLatex(spacing)}\\cdot\\left[0...${count - 1}\\right]`;
}

function displayComponentsLatex(
  mode: VectorLengthMode,
  symbols: ReturnType<typeof createSymbols>,
  targetLength: number,
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
      factor = `${numberLatex(targetLength)}/${denominator}`;
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
  const rangeMin =
    config.color.rangeMode === "manual"
      ? numberLatex(config.color.minimum)
      : `\\min\\left(${actualMagnitude}\\right)`;
  const rangeMax =
    config.color.rangeMode === "manual"
      ? numberLatex(config.color.maximum)
      : `\\max\\left(${actualMagnitude}\\right)`;
  const rangeT = clamp01(
    `\\left(${actualMagnitude}-${rangeMin}\\right)/\\max\\left(${rangeMax}-${rangeMin},${numberLatex(ZERO_VECTOR_TOLERANCE)}\\right)`
  );
  const componentT = (component: string) =>
    clamp01(
      `\\left(${component}+\\max\\left(\\max\\left(${component}\\right),-\\min\\left(${component}\\right),${numberLatex(ZERO_VECTOR_TOLERANCE)}\\right)\\right)/\\left(2\\max\\left(\\max\\left(${component}\\right),-\\min\\left(${component}\\right),${numberLatex(ZERO_VECTOR_TOLERANCE)}\\right)\\right)`
    );
  let colorExpression: string;
  switch (mode) {
    case "fixed": {
      const [red, green, blue] = hexToRGB(config.color.fixedColor);
      colorExpression = `\\operatorname{rgb}\\left(${red}+0\\cdot ${symbols.gridX},${green}+0\\cdot ${symbols.gridX},${blue}+0\\cdot ${symbols.gridX}\\right)`;
      break;
    }
    case "direction":
      colorExpression = `\\operatorname{hsv}\\left(180\\left(${symbols.direction}/\\pi+1\\right),0.82,0.9\\right)`;
      break;
    case "x-component":
      colorExpression = divergingColorLatex(componentT(symbols.u));
      break;
    case "y-component":
      colorExpression = divergingColorLatex(componentT(symbols.v));
      break;
    case "magnitude":
    case "log-magnitude":
      colorExpression = paletteColorLatex(config.color.palette, rangeT);
      break;
  }
  return `${symbols.colors}=${colorExpression}`;
}

function paletteColorLatex(
  palette: VectorFieldConfig["color"]["palette"],
  t: string
) {
  switch (palette) {
    case "sequential-b":
      return `\\operatorname{rgb}\\left(30+110\\left(${t}\\right),40+185\\left(${t}\\right),90+125\\left(${t}\\right)\\right)`;
    case "blue-red":
      return divergingColorLatex(t);
    case "grayscale":
      return `\\operatorname{rgb}\\left(30+210\\left(${t}\\right),30+210\\left(${t}\\right),30+210\\left(${t}\\right)\\right)`;
    case "direction-hue":
      return `\\operatorname{hsv}\\left(360\\left(${t}\\right),0.82,0.9\\right)`;
    case "sequential-a":
      return `\\operatorname{rgb}\\left(35+210\\left(${t}\\right),75+130\\left(${t}\\right),155-95\\left(${t}\\right)\\right)`;
  }
}

function divergingColorLatex(t: string) {
  return `\\operatorname{rgb}\\left(35+210\\left(${t}\\right),70+70\\left(1-\\left|2\\left(${t}\\right)-1\\right|\\right),220-185\\left(${t}\\right)\\right)`;
}

function parametricSegmentLatex(
  startX: string,
  startY: string,
  endX: string,
  endY: string,
  restriction: string
) {
  return `\\left(${startX}+t\\left(${endX}-${startX}\\right),${startY}+t\\left(${endY}-${startY}\\right)\\right)\\left\\{0\\le t\\le1\\right\\}${restriction}`;
}

/**
 * A wing runs backwards from the arrow tip, rotated off the arrow direction by
 * ±the arrowhead angle. Emitting it directly (rather than as a generic segment
 * between two points) keeps the generated expression short enough to stay
 * readable when a user opens the folder.
 */
function arrowheadWingLatex(
  symbols: ReturnType<typeof createSymbols>,
  headSize: string,
  headAngle: string,
  sign: "+" | "-",
  restriction: string
) {
  const angle = `\\left(${symbols.direction}${sign}${headAngle}\\right)`;
  return (
    `\\left(${symbols.endX}-t\\cdot ${headSize}\\cos${angle},` +
    `${symbols.endY}-t\\cdot ${headSize}\\sin${angle}\\right)` +
    `\\left\\{0\\le t\\le1\\right\\}${restriction}`
  );
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
