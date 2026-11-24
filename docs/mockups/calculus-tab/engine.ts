/**
 * The Calculus tab mock-up's engine: Physics Lab's real symbolic engines,
 * behind one function that reads any request.
 *
 * Nothing here is a stand-in. Derivatives, integrals, limits, ODEs and the
 * decimal recogniser are the code in src/plugins/physics-lab/symbolic and
 * src/symbolic, bundled by build.mjs. What is new, and what the mock-up is
 * for, is the layer in front of them: one input instead of six tabs, any
 * variable names, graph sliders and functions pulled in, and the request
 * read back before it is answered.
 */
import {
  AugBuilders,
  buildConfigFromGlobals,
  parseLatex,
  type Aug,
  type Config,
} from "../../../text-mode-core";
import {
  differentiate,
  stepsOf,
} from "../../../src/plugins/physics-lab/symbolic/differentiate";
import {
  describeMethod,
  implicitProducts,
  integrateWithMethod,
  IntegrationError,
  NonElementaryError,
  tidySigns,
} from "../../../src/plugins/physics-lab/symbolic/integrate";
import {
  definiteIntegral,
  DefiniteError,
  exactConstant,
  interiorSingularity,
  type Bound,
  type Limit,
} from "../../../src/plugins/physics-lab/symbolic/definite";
import { absoluteDefinite } from "../../../src/plugins/physics-lab/symbolic/absolute";
import { theoremDefinite } from "../../../src/plugins/physics-lab/symbolic/definiteTheorems";
import { specialAntiderivative } from "../../../src/plugins/physics-lab/symbolic/specialIntegrals";
import {
  fractionalDerivatives,
  type FractionalResult,
} from "../../../src/plugins/physics-lab/symbolic/fractional";
import { preciseIntegral } from "../../../src/plugins/physics-lab/symbolic/quadrature";
import {
  describeLimitMethod,
  findLimit,
} from "../../../src/plugins/physics-lab/symbolic/limit";
import {
  logSubstitution,
  parametricLimit,
} from "../../../src/plugins/physics-lab/symbolic/limitRewrites";
import { solveFirstOrder } from "../../../src/plugins/physics-lab/symbolic/ode";
import {
  resolvePrimes,
  solveSecondOrder,
} from "../../../src/plugins/physics-lab/symbolic/secondOrder";
import { seriesFallback } from "../../../src/plugins/physics-lab/symbolic/seriesSum";
import { recognizeDecimal } from "../../../src/plugins/physics-lab/symbolic/recognize";
import {
  toNode as exactToNode,
  toNumber as exactToNumber,
} from "../../../src/plugins/physics-lab/symbolic/exact";
import {
  add,
  agreesOnSamples,
  condense,
  desmosDefinitions,
  ensureSpecialFunctions,
  SPECIAL_FUNCTIONS,
  specialFunctionsIn,
  withSpecialFunctionNames,
  evaluate,
  fold,
  freshName,
  id,
  identifiersIn,
  normsToAbs,
  specialFunction,
  toLatex as toLatexTree,
  type Bindings,
} from "../../../src/symbolic";
import { renameIdentifier } from "../../../src/field-rendering/identifiers";
export { placeAnswer } from "../../../src/plugins/physics-lab/graphNames";

type Node = Aug.Latex.AnyChild;

let cfg: Config;

let desmosGlobal: unknown;

export function init(Desmos: unknown, calc: unknown) {
  desmosGlobal = Desmos;
  cfg = buildConfigFromGlobals(Desmos, calc);
}

/**
 * What Physics Lab's afterEnable does in the extension: the calculator's
 * expression fields learn the special functions' names, so Ei, Li_2, Gamma
 * and the rest can be typed letter by letter. The state is set again so that
 * fields already on screen are rebuilt with the new config.
 */
export function installSpecialFunctionNames(calc: {
  controller: { getMathquillConfig: (e: unknown) => object };
  getState: () => unknown;
  setState: (s: unknown) => void;
}) {
  const original = calc.controller.getMathquillConfig;
  calc.controller.getMathquillConfig = function (this: unknown, e: unknown) {
    return withSpecialFunctionNames(original.call(this, e));
  };
  calc.setState(calc.getState());
  // As Physics Lab's watcher does: a line that calls a special function
  // brings the whole library into the hidden folder, without moving the
  // cursor while it is being typed.
  const watched = calc as unknown as {
    observeEvent: (name: string, cb: () => void) => void;
    getExpressions: () => { latex?: string }[];
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    timer = undefined;
    const used = watched
      .getExpressions()
      .some((e) => specialFunctionsIn(e.latex ?? "").length > 0);
    if (!used) return;
    const active = document.activeElement;
    ensureSpecialFunctions(
      calc as unknown as Parameters<typeof ensureSpecialFunctions>[0],
      SPECIAL_FUNCTIONS.map((f) => f.symbol),
      { editing: active?.closest(".dcg-expressionlist") != null }
    );
  };
  watched.observeEvent("change.special-functions", () => {
    timer ??= setTimeout(check, 400);
  });
  document.addEventListener("focusout", () => {
    timer ??= setTimeout(check, 400);
  });
  // And the answers are written with them: γ, not g·a·m·m·a.
  if (desmosGlobal !== undefined)
    cfg = buildConfigFromGlobals(desmosGlobal, calc);
}

/**
 * The locked definitions folder, with the whole library in it, the first
 * time an answer calls any special function: once one is in the graph,
 * typing any of the others should work too.
 */
export function defineSpecialFunctionsFor(calc: unknown, latex: string) {
  if (specialFunctionsIn(latex).length === 0) return 0;
  return ensureSpecialFunctions(
    calc as Parameters<typeof ensureSpecialFunctions>[0],
    SPECIAL_FUNCTIONS.map((f) => f.symbol)
  );
}

const emit = (node: Node) => toLatexTree(cfg, node);

// ---- the graph ----------------------------------------------------------------

export interface GraphDefs {
  /** Sliders and constants: canonical name → value and the LaTeX name. */
  constants: Map<string, { value: number; latex: string }>;
  /** f(x)=… definitions: canonical name → parameters and body. */
  functions: Map<string, { params: string[]; body: Node; latex: string }>;
}

/** A Desmos variable name as LaTeX: x, x_1, x_{ab}, \theta, \theta_{0}. */
const NAME = String.raw`(?:[a-zA-Z]|\\[a-zA-Z]+)(?:_\{[a-zA-Z0-9]+\}|_[a-zA-Z0-9])?`;

function canonical(latexName: string): string | undefined {
  try {
    const node = parseLatex(cfg, latexName);
    return node.type === "Identifier" ? node.symbol : undefined;
  } catch {
    return undefined;
  }
}

/** What the graph defines, read from its expression list's LaTeX. */
export function readGraph(latexList: readonly string[]): GraphDefs {
  const constants: GraphDefs["constants"] = new Map();
  const functions: GraphDefs["functions"] = new Map();
  for (const latex of latexList) {
    const fn = new RegExp(
      String.raw`^(${NAME})\\left\((.+?)\\right\)=(.+)$`
    ).exec(latex);
    if (fn) {
      const name = canonical(fn[1]);
      const params = fn[2].split(",").map((p) => canonical(p.trim()));
      if (name && params.every((p) => p !== undefined)) {
        try {
          functions.set(name, {
            params: params as string[],
            body: parseLatex(cfg, fn[3]),
            latex: fn[1],
          });
        } catch {}
      }
      continue;
    }
    const constant = new RegExp(String.raw`^(${NAME})=(.+)$`).exec(latex);
    if (constant) {
      const name = canonical(constant[1]);
      try {
        const value = evaluate(parseLatex(cfg, constant[2]), {});
        if (name && Number.isFinite(value))
          constants.set(name, { value, latex: constant[1] });
      } catch {}
    }
  }
  return { constants, functions };
}

/** A copy of the tree with identifiers and graph functions replaced. */
function substitute(
  node: Node,
  values: ReadonlyMap<string, Node>,
  functions: GraphDefs["functions"],
  depth = 0
): Node {
  if (depth > 20) throw new Error("A graph function refers to itself.");
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (value === null || typeof value !== "object") return value;
    const n = value as Node;
    if (n.type === "Identifier" && values.has(n.symbol))
      return values.get(n.symbol);
    if (
      n.type === "FunctionCall" &&
      n.callee.type === "Identifier" &&
      functions.has(n.callee.symbol)
    ) {
      const fn = functions.get(n.callee.symbol)!;
      const args = (n.args as Node[]).map((a) => walk(a) as Node);
      if (args.length === fn.params.length) {
        const bound = new Map(values);
        fn.params.forEach((p, i) => bound.set(p, args[i]));
        return substitute(fn.body, bound, functions, depth + 1);
      }
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) out[k] = walk(v);
    return out;
  };
  return walk(node) as Node;
}

// ---- reading the request ------------------------------------------------------

export type Operation =
  | "derivative"
  | "fractional"
  | "integral"
  | "definite"
  | "limit"
  | "ode"
  | "sum"
  | "none";

export const OPERATION_LABELS: Record<Operation, string> = {
  derivative: "Differentiate",
  fractional: "Fractional derivative",
  integral: "Integrate",
  definite: "Definite integral",
  limit: "Limit",
  ode: "Solve the ODE",
  sum: "Sum the series",
  none: "",
};

interface Parsed {
  operation: Operation;
  /** The variable the notation itself names (d/dt, dt, t→0, n=1). */
  binder?: string;
  bodyLatex: string;
  order?: number;
  /** A fractional order as typed: \pi, \frac{1}{2}, -0.5. */
  orderLatex?: string;
  lowerLatex?: string;
  upperLatex?: string;
  pointLatex?: string;
  side?: "both" | "left" | "right";
  /** For an ODE: the dependent function's name. */
  dependent?: string;
}

/** Index of the brace closing the one at `open`. */
function closing(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

/** `_{…}` or `_x`, starting at `i`: the group's contents and where it ends. */
function group(s: string, i: number): { text: string; end: number } {
  if (s[i] === "{") {
    const end = closing(s, i);
    return { text: s.slice(i + 1, end), end: end + 1 };
  }
  return { text: s[i] ?? "", end: i + 1 };
}

/** `\frac{d^{α}}{dx^{α}}` at the start: the order as typed, the variable, the rest. */
function derivativeHead(
  s: string
): { order: string; binder: string; body: string } | undefined {
  const opening = String.raw`\frac{d`;
  if (!s.startsWith(opening)) return undefined;
  let i = opening.length;
  let order = "";
  if (s[i] === "^") {
    const g = group(s, i + 1);
    order = g.text.trim();
    i = g.end;
  }
  if (s[i] !== "}" || s[i + 1] !== "{" || s[i + 2] !== "d") return undefined;
  const below = closing(s, i + 1);
  if (below < 0) return undefined;
  const inside = s.slice(i + 3, below);
  const hat = inside.indexOf("^");
  const binder = (hat < 0 ? inside : inside.slice(0, hat)).trim();
  if (binder === "") return undefined;
  return { order, binder, body: s.slice(below + 1) };
}

function readRequest(raw: string): Parsed {
  const s = raw.replace(/\\ /g, " ").trim();

  // d/dt, dⁿ/dtⁿ, or d^α/dt^α for any order α in front.
  const head = derivativeHead(s);
  if (head !== undefined) {
    // No order (plain d/dt) is order 1.
    const whole = head.order === "" || /^\d+$/.test(head.order);
    return whole
      ? {
          operation: "derivative",
          order: head.order === "" ? 1 : Number(head.order),
          binder: head.binder,
          bodyLatex: head.body,
        }
      : {
          operation: "fractional",
          orderLatex: head.order,
          binder: head.binder,
          bodyLatex: head.body,
        };
  }

  // ∫, with or without bounds, ending in d(variable).
  if (s.startsWith("\\int")) {
    let i = 4;
    let lower: string | undefined;
    let upper: string | undefined;
    if (s[i] === "_") {
      const g = group(s, i + 1);
      lower = g.text;
      i = g.end;
    }
    if (s[i] === "^") {
      const g = group(s, i + 1);
      upper = g.text;
      i = g.end;
    }
    const rest = s.slice(i);
    const d = new RegExp(String.raw`d(${NAME})\s*$`).exec(rest);
    // Desmos's MathQuill gives every ∫ bound slots; left empty, it is an
    // indefinite integral, and filling them in makes it definite.
    const blank = (b: string | undefined) => b === undefined || b.trim() === "";
    if (blank(lower) && blank(upper)) lower = upper = undefined;
    return {
      operation: lower !== undefined ? "definite" : "integral",
      binder: d?.[1],
      bodyLatex: d ? rest.slice(0, d.index) : rest,
      lowerLatex: lower,
      upperLatex: upper,
    };
  }

  // lim_{t→a}, from MathQuill (\lim) or typed (\operatorname{lim}).
  let m = /^\\(?:lim|operatorname\{lim\})_\{/.exec(s);
  if (m) {
    const g = group(s, m[0].length - 1);
    const arrow = /^(.+?)\\(?:to|rightarrow)(.+)$/.exec(g.text);
    let point = arrow?.[2].trim() ?? "";
    let side: Parsed["side"] = "both";
    const sided = /^(.+)\^\{?([+-])\}?$/.exec(point);
    if (sided) {
      point = sided[1];
      side = sided[2] === "+" ? "right" : "left";
    }
    return {
      operation: "limit",
      binder: arrow?.[1].trim(),
      pointLatex: point,
      side,
      bodyLatex: s.slice(g.end),
    };
  }

  // Σ_{n=a}^{b}
  m = /^\\sum_\{([^=}]+)=([^}]*)\}\^/.exec(s);
  if (m) {
    const g = group(s, m[0].length);
    return {
      operation: "sum",
      binder: m[1].trim(),
      lowerLatex: m[2],
      upperLatex: g.text,
      bodyLatex: s.slice(g.end),
    };
  }

  // y' = …, y'' = …, dy/dt = …
  m = new RegExp(String.raw`^(${NAME})('{1,2})=(.+)$`).exec(s);
  if (m)
    return {
      operation: "ode",
      dependent: m[1],
      order: m[2].length,
      bodyLatex: m[3],
    };
  m = new RegExp(String.raw`^\\frac\{d(${NAME})\}\{d(${NAME})\}=(.+)$`).exec(s);
  if (m)
    return {
      operation: "ode",
      dependent: m[1],
      binder: m[2],
      order: 1,
      bodyLatex: m[3],
    };

  return { operation: "none", bodyLatex: s };
}

// ---- answering ----------------------------------------------------------------

export type Depth = "simple" | "standard" | "every";

export interface Step {
  title: string;
  detail: string;
  latex?: string;
  depth: number;
}

export type Verdict =
  | "Proved"
  | "Proved, checked by differentiating back"
  | "Checked numerically, not proved"
  | "Series answer"
  | "Not decided"
  | "Refused";

export interface Answer {
  latex: string;
  decimal?: string;
  verdict: Verdict;
  method: string;
  steps: Step[];
  notes: string[];
  /** What "Add to graph" writes, as Desmos expressions. */
  graph: { latex: string; slider?: string }[];
}

export interface Analysis {
  status: "empty" | "error" | "choose" | "ok";
  error?: string;
  operation: Operation;
  /** The request in words, shown before the answer. */
  summary: string;
  variable?: string;
  variableLatex?: string;
  /** Every name that could be the variable, as LaTeX, when it is unclear. */
  candidates: { name: string; latex: string }[];
  /** Graph sliders the request uses. */
  sliders: { name: string; latex: string; value: number }[];
  /** Graph functions written into the request. */
  inlined: string[];
  /** Other letters, treated as constants. */
  parameters: string[];
  answer?: Answer;
  /** For a fractional derivative: every definition's answer. */
  fractional?: FractionalResult;
}

export interface Options {
  /** The operation picked by a shortcut, for a bare expression. */
  operation?: Operation;
  /** A variable picked by a chip, overriding the guess. */
  variable?: string;
  useSliderValues: boolean;
  depth: Depth;
  /** For a bare limit or definite integral picked by a shortcut. */
  pointLatex?: string;
  lowerLatex?: string;
  upperLatex?: string;
  seriesTerms: number;
}

const SPECIAL = new Set(["pi", "e", "tau", "infty"]);

const GREEK = new Set(
  "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega varphi vartheta".split(
    " "
  )
);

function latexOfName(name: string) {
  const at = name.indexOf("_");
  const base = at < 0 ? name : name.slice(0, at);
  const head = GREEK.has(base) ? `\\${base}` : base;
  return at < 0 ? head : `${head}_{${name.slice(at + 1)}}`;
}

function readBound(latex: string): Bound | undefined {
  const t = latex.trim().replace(/\\left|\\right/g, "");
  if (/^\+?\\infty$/.test(t)) return { kind: "infinite", sign: 1 };
  if (/^-\\infty$/.test(t)) return { kind: "infinite", sign: -1 };
  try {
    const node = parseLatex(cfg, latex);
    const value = evaluate(node, {});
    return Number.isFinite(value) ? { kind: "finite", node, value } : undefined;
  } catch {
    return undefined;
  }
}

const limitLatex = (l: Limit) =>
  l.kind === "infinite"
    ? l.sign > 0
      ? "\\infty"
      : "-\\infty"
    : emit(tidySigns(exactToNode(l.value)));

const limitDecimal = (l: Limit) =>
  l.kind === "finite" ? fmt(exactToNumber(l.value)) : undefined;

function fmt(x: number) {
  if (!Number.isFinite(x)) return String(x);
  return Number(x.toPrecision(15)).toString();
}

export function analyze(
  latex: string,
  defs: GraphDefs,
  options: Options
): Analysis {
  const base: Analysis = {
    status: "empty",
    operation: "none",
    summary: "",
    candidates: [],
    sliders: [],
    inlined: [],
    parameters: [],
  };
  if (latex.trim() === "") return base;

  const request = readRequest(latex);
  let operation = request.operation;
  if (operation === "none" && options.operation) operation = options.operation;
  base.operation = operation;

  let body: Node;
  try {
    body = parseLatex(
      cfg,
      operation === "ode" && request.order === 2
        ? resolvePrimes(request.bodyLatex, request.dependent)
        : request.bodyLatex
    );
  } catch {
    return {
      ...base,
      status: "error",
      error: "This doesn't read as maths yet.",
    };
  }

  // Graph functions are written in; sliders are symbols unless asked otherwise.
  const used = identifiersIn(body);
  const calls = new Set<string>();
  const collectCalls = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(collectCalls);
    if (value === null || typeof value !== "object") return;
    const n = value as Node;
    if (n.type === "FunctionCall" && n.callee.type === "Identifier")
      calls.add(n.callee.symbol);
    Object.values(n).forEach(collectCalls);
  };
  collectCalls(body);
  base.inlined = [...calls]
    .filter((c) => defs.functions.has(c))
    .map((c) => defs.functions.get(c)!.latex);
  const binderName =
    request.binder !== undefined ? canonical(request.binder) : undefined;
  const dependentName =
    request.dependent !== undefined ? canonical(request.dependent) : undefined;
  base.sliders = used
    .filter((n) => defs.constants.has(n) && n !== binderName)
    .map((n) => ({ name: n, ...defs.constants.get(n)! }));
  const values = new Map<string, Node>();
  if (options.useSliderValues)
    for (const s of base.sliders)
      values.set(s.name, AugBuilders.number(s.value));
  try {
    body = substitute(body, values, defs.functions);
  } catch (error) {
    return { ...base, status: "error", error: String(error) };
  }

  // The variable: named by the notation, picked by a chip, or the one free
  // letter left. Never the first of several.
  // A name only ever called (sin, ln, a graph function) is not a letter.
  const plain = new Set<string>();
  const sortNames = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(sortNames);
    if (value === null || typeof value !== "object") return;
    const n = value as Node;
    if (n.type === "Identifier") plain.add(n.symbol);
    if (n.type === "FunctionCall") return sortNames(n.args);
    Object.values(n).forEach(sortNames);
  };
  sortNames(body);
  const free = identifiersIn(body).filter(
    (n) =>
      plain.has(n) &&
      !SPECIAL.has(n) &&
      !defs.constants.has(n) &&
      !defs.functions.has(n) &&
      n !== dependentName &&
      !(operation === "ode" && n === "v")
  );
  base.candidates = free.map((name) => ({ name, latex: latexOfName(name) }));
  let variable = options.variable ?? binderName;
  if (variable === undefined && operation === "ode") variable = "x";
  if (variable === undefined && free.length === 1) variable = free[0];
  // A constant on its own, Γ(1/2) or ζ(2): its exact value, the known
  // constant where it is one.
  if (variable === undefined && operation === "none" && free.length === 0) {
    const exact = exactConstant(fold(normsToAbs(body)));
    if (exact !== undefined) {
      const latex = emit(tidySigns(fold(exactToNode(exact))));
      return {
        ...base,
        status: "ok",
        summary: "The exact value.",
        answer: {
          latex,
          decimal: fmt(exactToNumber(exact)),
          verdict: "Proved",
          method:
            "Special values and their families: Γ at whole and half-integer points, ζ at even and negative integers, ψ, B, Li₂, W₀ and the rest; anything else is kept exactly as it is.",
          steps: [],
          notes: [],
          graph: [{ latex }],
        },
      };
    }
  }
  if (variable === undefined && operation === "none") {
    return {
      ...base,
      status: "choose",
      summary:
        free.length === 0
          ? "A constant. Pick what to do with it, or give it a variable."
          : "Pick what to do with this expression.",
    };
  }
  if (variable === undefined) {
    return {
      ...base,
      status: "choose",
      summary: `${OPERATION_LABELS[operation]} with respect to which letter?`,
    };
  }
  base.variable = variable;
  base.variableLatex = latexOfName(variable);
  base.parameters = free
    .filter((n) => n !== variable)
    .map((n) => latexOfName(n));

  const v = base.variableLatex;
  const treat =
    base.parameters.length === 0
      ? ""
      : ` Treating ${base.parameters.map((p) => `\\(${p}\\)`).join(", ")} as constant${base.parameters.length > 1 ? "s" : ""}.`;
  const sliderWords =
    base.sliders.length === 0
      ? ""
      : options.useSliderValues
        ? ` Using the slider value${base.sliders.length > 1 ? "s" : ""} ${base.sliders.map((s) => `\\(${s.latex}=${fmt(s.value)}\\)`).join(", ")}.`
        : ` Keeping the slider${base.sliders.length > 1 ? "s" : ""} ${base.sliders.map((s) => `\\(${s.latex}\\)`).join(", ")} as ${base.sliders.length > 1 ? "symbols" : "a symbol"}.`;
  const inlinedWords =
    base.inlined.length === 0
      ? ""
      : ` Writing in the graph's ${base.inlined.map((f) => `\\(${f}\\)`).join(", ")}.`;

  try {
    switch (operation) {
      case "derivative": {
        const n = request.order ?? 1;
        base.summary = `Differentiate${n > 1 ? ` ${n} times` : ""} with respect to \\(${v}\\).${treat}${sliderWords}${inlinedWords}`;
        base.answer = derivativeAnswer(body, variable, n, options.depth);
        break;
      }
      case "fractional": {
        const orderLatex = request.orderLatex ?? "";
        const order = readBound(orderLatex);
        if (order === undefined || order.kind !== "finite")
          throw new Error(
            "The order has to be a number, such as π, 1/2 or −0.5."
          );
        const lowerLatex = options.lowerLatex?.trim() || "0";
        const lower = readBound(lowerLatex);
        const pointLatex = options.pointLatex?.trim() || "2";
        const point = readBound(pointLatex);
        if (lower?.kind !== "finite" || point?.kind !== "finite")
          throw new Error("The lower limit and the point have to be numbers.");
        const result = fractionalDerivatives({
          f: implicitProducts(normsToAbs(body), variable),
          variable,
          variableLatex: v,
          order: order.value,
          orderLatex,
          lower: lower.value,
          lowerLatex,
          point: point.value,
          emit,
        });
        base.fractional = result;
        const what =
          result.kind === "integral"
            ? `The fractional integral of order \\(${orderLatex.replace(/^-/, "")}\\)`
            : `The derivative of order \\(${orderLatex}\\)`;
        base.summary = `${what} with respect to \\(${v}\\), under every definition that gives a different answer, from \\(${lowerLatex}\\) and evaluated at \\(${v}=${pointLatex}\\).${treat}${sliderWords}${inlinedWords}`;
        const head = result.answers[0];
        base.answer = {
          latex: head.latex,
          decimal: head.value === undefined ? undefined : fmt(head.value),
          verdict: "Proved",
          method: head.name,
          steps: [],
          notes: result.notes,
          graph: [
            ...head.definitions.map((d) => ({ latex: d })),
            ...(head.graphLatex ? [{ latex: `y=${head.graphLatex}` }] : []),
          ],
        };
        break;
      }
      case "integral":
        base.summary = `Integrate with respect to \\(${v}\\).${treat}${sliderWords}${inlinedWords}`;
        base.answer = integralAnswer(body, variable, options);
        break;
      case "definite": {
        const lo = request.lowerLatex ?? options.lowerLatex ?? "";
        const hi = request.upperLatex ?? options.upperLatex ?? "";
        base.summary = `Integrate with respect to \\(${v}\\) from \\(${lo || "?"}\\) to \\(${hi || "?"}\\).${treat}${sliderWords}${inlinedWords}`;
        base.answer = definiteAnswer(body, variable, lo, hi);
        break;
      }
      case "limit": {
        const point = request.pointLatex ?? options.pointLatex ?? "";
        const side = request.side ?? "both";
        const sideWords =
          side === "both"
            ? ""
            : side === "right"
              ? " from the right"
              : " from the left";
        base.summary = `The limit as \\(${v}\\to ${point || "?"}\\)${sideWords}.${treat}${sliderWords}${inlinedWords}`;
        base.answer = limitAnswer(body, variable, point, side);
        break;
      }
      case "ode": {
        const dep = request.dependent ?? "y";
        base.summary = `Solve the ${request.order === 2 ? "second" : "first"}-order equation for \\(${dep}\\) as a function of \\(${v}\\).${treat}${sliderWords}`;
        base.answer = odeAnswer(request, variable);
        break;
      }
      case "sum": {
        base.summary = `Sum over \\(${v}\\) from \\(${request.lowerLatex}\\) to \\(${request.upperLatex}\\).${treat}${sliderWords}`;
        base.answer = sumAnswer(body, variable, request);
        break;
      }
      case "none":
        return {
          ...base,
          status: "choose",
          summary: `Pick what to do with this expression in \\(${v}\\).`,
        };
    }
  } catch (error) {
    return {
      ...base,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return { ...base, status: "ok" };
}

function derivativeAnswer(
  body: Node,
  variable: string,
  order: number,
  depth: Depth
): Answer {
  let tree = implicitProducts(body, variable);
  const steps: Step[] = [];
  for (let k = 0; k < order; k++) {
    const d = differentiate(cfg, tree, variable);
    if (k === 0 && depth !== "simple") {
      for (const { step, depth: level } of stepsOf(d.root)) {
        if (depth === "standard" && step.importance !== "major") continue;
        steps.push({
          title: step.title,
          detail: step.recognition + (step.detail ? ` ${step.detail}` : ""),
          latex: step.intermediate ? emit(step.intermediate) : undefined,
          depth: level,
        });
      }
    }
    tree = d.result;
  }
  const result = emit(tree);
  const shorter = condense(tree);
  const factored = emit(shorter.node);
  return {
    latex: result,
    verdict: "Proved",
    method:
      order > 1
        ? `The differentiation rules, applied ${order} times.`
        : "The differentiation rules, each step one rule.",
    steps,
    notes:
      shorter.notes.length > 0 && factored !== result
        ? [`Also: \\(${factored}\\)`]
        : [],
    graph: [{ latex: `y=${result}` }],
  };
}

function checkAntiderivative(F: Node, f: Node, variable: string) {
  return agreesOnSamples(
    (b: Bindings) =>
      (evaluate(F, { ...b, [variable]: b[variable] + 1e-5 }) -
        evaluate(F, { ...b, [variable]: b[variable] - 1e-5 })) /
      2e-5,
    (b: Bindings) => evaluate(f, b),
    [0.31, 0.77, 1.4, 2.3, 3.7, -0.6].map((x) => ({
      [variable]: x,
      ...Object.fromEntries(
        identifiersIn(f)
          .filter((n) => n !== variable && !SPECIAL.has(n))
          .map((n, i) => [n, 1.3 + 0.4 * i])
      ),
    })),
    1e-3
  );
}

function integralAnswer(
  body: Node,
  variable: string,
  options: Options
): Answer {
  const integrand = normsToAbs(implicitProducts(body, variable));
  try {
    const found = integrateWithMethod(integrand, variable);
    const constant = freshName(integrand, ["C", "K", "D"]);
    const latex = emit(add(found.value, id(constant)));
    const checked = checkAntiderivative(found.value, integrand, variable);
    return {
      latex,
      verdict: checked
        ? "Proved, checked by differentiating back"
        : "Checked numerically, not proved",
      method: describeMethod(found.techniques),
      steps: [],
      notes: [],
      graph: [{ latex: `y=${latex}`, slider: `${constant}=0` }],
    };
  } catch (error) {
    if (!(error instanceof IntegrationError)) throw error;
    const special = error instanceof NonElementaryError ? error.special : "";
    // No elementary antiderivative, but an exact one in a special function
    // (Ei, Si, erf, Li₂, …), defined in Desmos so it graphs as written.
    const named = specialAntiderivative(integrand, variable, (term) => {
      try {
        return integrateWithMethod(term, variable).value;
      } catch {
        return undefined;
      }
    });
    if (
      named !== undefined &&
      checkAntiderivative(named.value, integrand, variable)
    ) {
      const constant = freshName(integrand, ["C", "K", "D"]);
      const latex = emit(add(named.value, id(constant)));
      const definitions = desmosDefinitions(named.uses);
      return {
        latex,
        verdict: "Proved, checked by differentiating back",
        method: `No elementary antiderivative${special && !named.byParts ? ` (${special})` : ""}, so it is written with ${named.uses.map((u) => specialFunction(u)?.name ?? u).join(" and ")}${named.byParts ? ", after one integration by parts" : ""}.`,
        steps: [],
        notes: named.uses
          .map((u) => specialFunction(u))
          .filter((f) => f?.domain !== undefined)
          .map((f) => `${f!.name}: defined in Desmos for ${f!.domain}.`),
        graph: [
          ...definitions.map((d) => ({ latex: d })),
          { latex: `y=${latex}`, slider: `${constant}=0` },
        ],
      };
    }
    const series = seriesFallback(integrand, variable, options.seriesTerms);
    if (series === undefined)
      return {
        latex: "",
        verdict: "Not decided",
        method: error.message,
        steps: [],
        notes: [],
        graph: [],
      };
    const partial = emit(series.partial);
    const sum = emit(series.sum);
    return {
      latex: `${partial}+C`,
      verdict: "Series answer",
      method:
        (special
          ? `No elementary antiderivative (${special}). `
          : "No closed form found. ") +
        "Integrated term by term as an infinite series instead.",
      steps: series.term
        ? [
            {
              title: "General term",
              detail: "Each term of the series, before summing:",
              latex: emit(series.term),
              depth: 0,
            },
          ]
        : [],
      notes: [
        // The engine words the interval in x whatever the variable was.
        `Converges ${series.interval.replace(/\bx\b/g, `\\(${latexOfName(variable)}\\)`)}.`,
        series.order
          ? `Shown to ${options.seriesTerms} terms; exact below \\(${latexOfName(variable)}^{${series.order}}\\).`
          : `Shown to ${options.seriesTerms} terms.`,
      ],
      graph: [{ latex: `y=${sum}` }],
    };
  }
}

function definiteAnswer(
  body: Node,
  variable: string,
  lowerLatex: string,
  upperLatex: string
): Answer {
  const lower = readBound(lowerLatex);
  const upper = readBound(upperLatex);
  if (!lower || !upper)
    throw new Error(
      "Each bound has to be a number, an expression in numbers, or ∞."
    );
  const integrand = normsToAbs(implicitProducts(body, variable));
  const statement = `\\int_{${lowerLatex}}^{${upperLatex}}`;
  try {
    const F = integrateWithMethod(integrand, variable);
    const result = definiteIntegral(integrand, F.value, variable, lower, upper);
    if (result.diverges !== undefined)
      return {
        latex:
          result.diverges === 0
            ? ""
            : result.diverges > 0
              ? "\\infty"
              : "-\\infty",
        verdict: "Proved",
        method:
          result.diverges === 0
            ? "The integral diverges, to different infinities on either side of a point inside the interval."
            : "The integral diverges.",
        steps: [],
        notes: [],
        graph: [],
      };
    const latex = result.exact
      ? emit(exactToNode(result.exact))
      : fmt(result.value);
    return {
      latex,
      decimal: fmt(result.value),
      verdict: "Proved",
      method: `Antiderivative by ${describeMethod(F.techniques).toLowerCase()}, then F(upper) − F(lower)${result.improper ? ", as a limit at an improper bound" : ""}.`,
      steps: [
        {
          title: "Antiderivative",
          detail: "",
          latex: emit(F.value),
          depth: 0,
        },
      ],
      notes: [],
      graph: [
        { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` },
      ],
    };
  } catch (error) {
    if (
      !(error instanceof IntegrationError) &&
      !(error instanceof DefiniteError)
    )
      throw error;
    const cut = absoluteDefinite(integrand, variable, lower, upper);
    if (cut?.exact !== undefined)
      return {
        latex: emit(exactToNode(cut.exact)),
        decimal: fmt(cut.value),
        verdict: "Proved",
        method:
          "The absolute value has no single antiderivative, so the interval was cut where what is inside it changes sign, and each piece integrated exactly.",
        steps: [],
        notes: [],
        graph: [
          { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` },
        ],
      };
    const theorem = theoremDefinite(integrand, variable, lower, upper);
    if (theorem !== undefined)
      return {
        latex: emit(exactToNode(theorem.exact)),
        decimal: fmt(theorem.value),
        verdict: theorem.proved ? "Proved" : "Checked numerically, not proved",
        method: `No antiderivative to evaluate. ${theorem.method}`,
        steps: [],
        notes: theorem.proved
          ? []
          : [
              "The exact form is right if the identity it rests on holds everywhere; that was checked at sample points.",
            ],
        graph: [
          { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` },
        ],
      };
    const refuse = (why: string): Answer => ({
      latex: "",
      verdict: "Not decided",
      method: `${error.message} ${why}`,
      steps: [],
      notes: [],
      graph: [],
    });
    // The panel's own numerical route: refuse a point inside where the
    // integrand has no value (∫₋₁¹ dx/x would otherwise come back 0), then the
    // double-exponential rules, whose nodes never land on an endpoint, so
    // ln(sin x) at 0 or 1/√x at 0 costs nothing, and which cover infinite
    // bounds too.
    const a = lower.kind === "finite" ? lower.value : lower.sign * Infinity;
    const b = upper.kind === "finite" ? upper.value : upper.sign * Infinity;
    if (
      interiorSingularity(
        (x) => evaluate(integrand, { [variable]: x }),
        Math.min(a, b),
        Math.max(a, b)
      )
    )
      return refuse(
        "There is a point inside the interval where the integrand has no value, so it was not integrated numerically."
      );
    let found;
    try {
      found = preciseIntegral(integrand, variable, lower, upper);
    } catch {
      found = undefined;
    }
    if (found === undefined || !found.value.isFinite())
      return refuse(
        "Integrating numerically did not settle: it may diverge, or oscillate out to infinity in a way this cannot follow."
      );
    const value = found.value.toNumber();
    const digits = Math.min(found.digits, 30);
    const recognized = recognizeDecimal(
      found.value.toSignificantDigits(digits).toFixed()
    );
    return {
      latex: recognized ? emit(recognized.node) : fmt(value),
      decimal: fmt(value),
      verdict: "Checked numerically, not proved",
      method: `${error instanceof NonElementaryError ? `No elementary antiderivative (${error.special}), so it` : "It"} was integrated numerically, to ${found.digits} digits.${recognized ? " The digits match the closed form shown." : ""}`,
      steps: [],
      notes: recognized
        ? [
            `Matches to ${recognized.digits} significant digits; a match is evidence, not a proof.`,
          ]
        : [],
      graph: [
        { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` },
      ],
    };
  }
}

function limitAnswer(
  body: Node,
  variable: string,
  pointLatex: string,
  side: "both" | "left" | "right"
): Answer {
  const at = readBound(pointLatex);
  if (!at)
    throw new Error(
      "The point has to be a number, an expression in numbers, or ∞."
    );
  const node = normsToAbs(implicitProducts(body, variable));
  const found = findLimit(node, variable, at, side);
  const a = found.answer;
  const base = { steps: [], notes: [] as string[], graph: [] };
  switch (a.kind) {
    case "value":
      return {
        ...base,
        latex: limitLatex(a.limit),
        decimal: limitDecimal(a.limit),
        verdict: "Proved",
        method: describeLimitMethod(a.method),
      };
    case "one-side-only":
      return {
        ...base,
        latex: limitLatex(a.limit),
        decimal: limitDecimal(a.limit),
        verdict: "Proved",
        method: `${describeLimitMethod(a.method)} Only the ${a.side > 0 ? "right" : "left"} side exists: ${a.missing}`,
      };
    case "sides-differ":
      return {
        ...base,
        latex: "\\text{does not exist}",
        verdict: "Proved",
        method: `The sides differ: from the left \\(${limitLatex(a.left)}\\), from the right \\(${limitLatex(a.right)}\\).`,
      };
    case "oscillates":
      return {
        ...base,
        latex: "\\text{does not exist}",
        verdict: "Proved",
        method: "It oscillates without settling.",
      };
    case "no-approach":
      return { ...base, latex: "", verdict: "Refused", method: a.reason };
    case "unknown": {
      const rewritten = rewrittenLimit(node, variable, at, side);
      if (rewritten !== undefined) return { ...base, ...rewritten };
      return {
        ...base,
        latex: "",
        verdict: "Not decided",
        method: "None of the methods could decide it.",
      };
    }
  }
}

/**
 * The two rewrites of limitRewrites.ts, tried once the engine cannot decide:
 * a parameter, by L'Hôpital's rule on the tree, and x only through ln x, by
 * t = ln x.
 */
function rewrittenLimit(
  node: Node,
  variable: string,
  at: Bound,
  side: "both" | "left" | "right"
):
  | Pick<Answer, "latex" | "decimal" | "verdict" | "method" | "notes">
  | undefined {
  const parametric = parametricLimit(node, variable, at, side);
  if (parametric !== undefined) {
    const names = parametric.parameters.map(latexOfName).join(", ");
    const checked = parametric.checkedAt
      .map((b) =>
        Object.entries(b)
          .map(([k, v]) => `${latexOfName(k)} = ${v}`)
          .join(", ")
      )
      .join("; ");
    return {
      latex: emit(parametric.value),
      verdict: "Proved",
      method: `L'Hôpital's rule ${parametric.applications === 1 ? "once" : `${parametric.applications} times`}, with ${names} left as ${parametric.parameters.length > 1 ? "letters" : "a letter"}: numerator and denominator are both 0 at the point whatever the value${parametric.parameters.length > 1 ? "s" : ""} of ${names}.`,
      notes: [
        parametric.condition === undefined
          ? `This holds for every value of ${names}.`
          : `This holds wherever \\(${emit(parametric.condition)}\\neq0\\).`,
        `Checked against the limit proved with numbers in place of the letters: ${checked}.`,
      ],
    };
  }
  const log = logSubstitution(node, variable, at, side);
  if (log !== undefined) {
    const found = findLimit(log.node, log.name, log.at, "both").answer;
    if (found.kind === "value")
      return {
        latex: limitLatex(found.limit),
        decimal: limitDecimal(found.limit),
        verdict: "Proved",
        method: `Substituting ${latexOfName(log.name)} = ln ${latexOfName(variable)}, which goes to ${log.at.kind === "infinite" && log.at.sign > 0 ? "∞" : "−∞"}; then ${describeLimitMethod(found.method)}`,
        notes: [`In ${latexOfName(log.name)}: \\(${emit(log.node)}\\).`],
      };
  }
  return undefined;
}

function odeAnswer(request: Parsed, variable: string): Answer {
  // The solvers are written for y and x. Any other names are renamed in and
  // out, which is all "no fixed variable names" needs from them.
  const dep = request.dependent ?? "y";
  const indep = latexOfName(variable);
  let rhs = request.bodyLatex;
  const ownNames = (latex: string) => {
    let out = latex;
    if (dep !== "y") out = renameIdentifier(out, dep, "y");
    if (indep !== "x") out = renameIdentifier(out, indep, "x");
    return out;
  };
  const theirNames = (latex: string) => {
    let out = latex;
    if (indep !== "x") out = renameIdentifier(out, "x", indep);
    if (dep !== "y") out = renameIdentifier(out, "y", dep);
    return out;
  };
  rhs = ownNames(rhs);
  const tree = parseLatex(cfg, request.order === 2 ? resolvePrimes(rhs) : rhs);
  const result =
    request.order === 2
      ? solveSecondOrder(cfg, tree)
      : solveFirstOrder(cfg, tree);
  if (!result.ok)
    return {
      latex: "",
      verdict: "Not decided",
      method: result.error || "No method here solves it.",
      steps: [],
      notes: [],
      graph: [],
    };
  const latex = theirNames(result.solution.latex);
  const sliders = ["C", "C_{1}", "C_{2}"].filter((c) => latex.includes(c));
  return {
    latex,
    verdict: "Proved",
    method: result.solution.method,
    steps: [],
    notes: [
      ...(result.solution.explicit
        ? []
        : ["An implicit solution: a relation, not an explicit formula."]),
      ...(indep === "x" && dep === "y"
        ? []
        : [
            `Graphed as y against x, since Desmos's axes are x and y: \\(${dep}\\) is drawn as y and \\(${indep}\\) as x.`,
          ]),
    ],
    graph: [
      // Desmos plots y against x, so the graphed copy keeps the solver's names.
      { latex: result.solution.latex },
      ...sliders.map((c) => ({ latex: "", slider: `${c}=1` })),
    ],
  };
}

// ---- sums and precise values ---------------------------------------------------

/** Wynn's ε algorithm on a sequence: the last good diagonal estimate. */
function wynn(s: number[]): number {
  let prev = new Array<number>(s.length + 1).fill(0);
  let cur = s.slice();
  let best = s[s.length - 1];
  for (let k = 1; cur.length > 1; k++) {
    const next: number[] = [];
    for (let i = 0; i + 1 < cur.length; i++) {
      const d = cur[i + 1] - cur[i];
      if (d === 0) return cur[i + 1];
      next.push(prev[i + 1] + 1 / d);
    }
    prev = cur;
    cur = next;
    if (k % 2 === 0 && cur.length > 0 && Number.isFinite(cur[cur.length - 1]))
      best = cur[cur.length - 1];
  }
  return best;
}

/** Richardson extrapolation of S(N), N doubling, assuming powers of 1/N. */
function richardson(values: number[]): number[] {
  let table = values.slice();
  const estimates = [table[table.length - 1]];
  for (let k = 1; table.length > 1; k++) {
    const factor = 2 ** k;
    table = table
      .slice(1)
      .map((v, i) => (factor * v - table[i]) / (factor - 1));
    estimates.push(table[table.length - 1]);
  }
  return estimates;
}

export interface PreciseResult {
  status: "empty" | "error" | "ok";
  error?: string;
  rows: { label: string; latex: string; note?: string }[];
  verdict: string;
  closedLatex?: string;
}

function digitsAgreeing(a: number, b: number) {
  if (a === b) return 15;
  const rel = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300);
  return Math.max(0, Math.min(15, Math.floor(-Math.log10(rel))));
}

function sumAnswer(body: Node, variable: string, request: Parsed): Answer {
  const r = preciseSum(
    body,
    variable,
    request.lowerLatex ?? "1",
    request.upperLatex ?? "\\infty"
  );
  if (r.status !== "ok") throw new Error(r.error);
  return {
    latex: r.closedLatex ?? r.rows[r.rows.length - 1]?.latex ?? "",
    verdict: r.closedLatex ? "Checked numerically, not proved" : "Not decided",
    method: r.verdict,
    steps: r.rows.map((row) => ({
      title: row.label,
      detail: row.note ?? "",
      latex: row.latex,
      depth: 0,
    })),
    notes: [],
    graph: [],
  };
}

function preciseSum(
  body: Node,
  variable: string,
  lowerLatex: string,
  upperLatex: string
): PreciseResult {
  const start = readBound(lowerLatex);
  if (!start || start.kind !== "finite" || !Number.isInteger(start.value))
    return {
      status: "error",
      error: "The sum has to start at a whole number.",
      rows: [],
      verdict: "",
    };
  const term = (n: number) => evaluate(body, { [variable]: n });
  const rows: PreciseResult["rows"] = [];

  // The nth-term test: proved divergence when the terms don't go to 0.
  try {
    const tail = findLimit(
      normsToAbs(body),
      variable,
      { kind: "infinite", sign: 1 },
      "both"
    );
    const a = tail.answer;
    if (
      (a.kind === "value" &&
        (a.limit.kind === "infinite" || exactToNumber(a.limit.value) !== 0)) ||
      a.kind === "oscillates"
    )
      return {
        status: "ok",
        rows: [
          {
            label: "Terms",
            latex: `\\lim_{${latexOfName(variable)}\\to\\infty}a_{${latexOfName(variable)}}${a.kind === "value" ? `=${limitLatex(a.limit)}` : "\\text{ does not exist}"}`,
          },
        ],
        verdict:
          "Diverges, proved: the terms do not go to 0 (the nth-term test).",
      };
  } catch {}

  const finite = readBound(upperLatex);
  if (finite && finite.kind === "finite") {
    let s = 0;
    for (let n = start.value; n <= finite.value && n - start.value < 1e7; n++)
      s += term(n);
    const recognized = recognizeDecimal(s.toPrecision(14));
    return {
      status: "ok",
      rows: [{ label: "Sum", latex: fmt(s) }],
      verdict: "A finite sum, added up.",
      closedLatex: recognized ? emit(recognized.node) : fmt(s),
    };
  }

  // Partial sums at doubling N, then accelerated.
  const partials: number[] = [];
  // Kahan-compensated: a plain running sum of 131 072 terms loses about two
  // digits to rounding, which is two digits the recogniser then lacks.
  let s = 0;
  let carry = 0;
  let n = start.value;
  for (let N = 64; N <= 2 ** 17; N *= 2) {
    for (; n < start.value + N; n++) {
      const y = term(n) - carry;
      const t = s + y;
      carry = t - s - y;
      s = t;
    }
    partials.push(s);
  }
  if (!partials.every(Number.isFinite))
    return {
      status: "error",
      error: "A term is undefined.",
      rows: [],
      verdict: "",
    };
  const raw = partials[partials.length - 1];
  const rich = richardson(partials);
  const eps = wynn(partials.slice(-9));
  // Whichever accelerator agrees with itself best; Richardson when the error
  // is a power series in 1/N, Wynn when it alternates or decays geometrically.
  const richBest = rich[Math.min(rich.length - 1, 6)];
  const richPrev = rich[Math.min(rich.length - 2, 5)];
  const richAgree = digitsAgreeing(richBest, richPrev);
  const epsPrev = wynn(partials.slice(-10, -1));
  const epsAgree = digitsAgreeing(eps, epsPrev);
  const [estimate, agree, how] =
    epsAgree >= richAgree
      ? [eps, epsAgree, "Wynn's ε algorithm"]
      : [richBest, richAgree, "Richardson extrapolation"];
  rows.push({
    label: `Partial sum, ${(2 ** 17).toLocaleString()} terms`,
    latex: fmt(raw),
    note: `Agrees with the estimate to ${digitsAgreeing(raw, estimate)} digits.`,
  });
  rows.push({
    label: "Accelerated estimate",
    latex: estimate.toPrecision(Math.max(4, agree)),
    note: `${how}; ${agree} digits stable between the last two estimates.`,
  });
  const recognized =
    // One digit fewer than looked stable, and never more than 12: an
    // accelerator's sense of its own error is optimistic, and double
    // precision runs out about there.
    agree >= 8
      ? recognizeDecimal(estimate.toPrecision(Math.min(agree - 1, 12)))
      : undefined;
  return {
    status: "ok",
    rows,
    verdict: recognized
      ? `Appears to converge to the constant below: the estimate matches it to ${recognized.digits} digits. Numerical evidence, not a proof of either convergence or the value.`
      : agree >= 6
        ? "Appears to converge, but the estimate matches no constant this search knows."
        : "The partial sums are not settling quickly enough to say.",
    closedLatex: recognized ? emit(recognized.node) : undefined,
  };
}

export function precise(
  latex: string,
  mode: "value" | "sum",
  defs: GraphDefs
): PreciseResult {
  if (latex.trim() === "") return { status: "empty", rows: [], verdict: "" };
  if (mode === "value") {
    let value: number;
    let text = latex.trim();
    try {
      value = evaluate(
        substitute(parseLatex(cfg, latex), new Map(), defs.functions),
        {}
      );
      if (!/^-?[\d.]+$/.test(text)) text = value.toPrecision(15);
    } catch {
      return {
        status: "error",
        error: "This doesn't read as a number.",
        rows: [],
        verdict: "",
      };
    }
    const recognized = recognizeDecimal(text);
    return {
      status: "ok",
      rows: [{ label: "Value", latex: text }],
      verdict: recognized
        ? `Matches the constant below to all ${recognized.digits} significant digits given (${recognized.spare} to spare beyond what the formula costs). That is evidence, not a proof: a lone decimal can't say what sequence it came from.`
        : "No constant this search knows matches all the digits given.",
      closedLatex: recognized ? emit(recognized.node) : undefined,
    };
  }
  const request = readRequest(latex);
  if (request.operation !== "sum")
    return {
      status: "error",
      error: "Write a sum: \\sum_{n=1}^{\\infty}…",
      rows: [],
      verdict: "",
    };
  let body: Node;
  try {
    body = substitute(
      parseLatex(cfg, request.bodyLatex),
      new Map(),
      defs.functions
    );
  } catch {
    return {
      status: "error",
      error: "The summand doesn't read as maths yet.",
      rows: [],
      verdict: "",
    };
  }
  const variable = canonical(request.binder ?? "n") ?? "n";
  return preciseSum(
    body,
    variable,
    request.lowerLatex ?? "1",
    request.upperLatex ?? "\\infty"
  );
}
