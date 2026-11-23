/**
 * Fractional derivatives and integrals, under every definition that gives a
 * different answer.
 *
 * `D^π (cos x + x + eˣ + ln x)` has no single value: Riemann–Liouville,
 * Caputo, Grünwald–Letnikov, conformable, Caputo–Hadamard and Weyl are
 * different operators, and on this function they disagree. So instead of
 * choosing one, every definition is answered side by side, each in the
 * strongest form it has:
 *
 * - a closed form, in Γ, the Mittag-Leffler function E_{a,b} and the digamma
 *   function ψ, where each term of f has one;
 * - an exact integral representation with the function's own derivatives
 *   written in, where it has none;
 * - "not defined", with the reason, where the definition does not apply
 *   (Caputo from 0 on ln x, Weyl on anything that does not decay at −∞);
 * - and always, a value at a chosen point.
 *
 * Every answer also comes as Desmos LaTeX that can be graphed: Γ(z) as
 * (z − 1)!, which Desmos evaluates for any real z, Mittag-Leffler functions
 * as finite sums, and integral representations as Desmos integrals.
 *
 * The order is any real α. For α < 0 the operators are fractional integrals
 * (Riemann–Liouville and Caputo coincide). For a whole α every definition is
 * the ordinary derivative, and is answered as one.
 */
import {
  collectLikeTerms,
  condense,
  differentiate,
  evaluate,
  fold,
  id,
  multiply,
  quotientFactors,
  replaceIdentifier,
  topLevelTerms,
  dependsOn,
  type Node,
} from "../../../symbolic";
import * as Q from "./rational";
import { quadrature } from "./definite";
import {
  desmosDefinitions,
  digamma,
  gamma,
  mittagLeffler,
  reciprocalGamma,
  specialFunctionsIn,
} from "../../../symbolic";

// Γ, 1/Γ, ψ and E_{a,b} come from the shared library (src/symbolic/special.ts),
// which also holds their Desmos definitions.
export { gamma, digamma, mittagLeffler, reciprocalGamma };

const EULER_GAMMA = 0.5772156649015329;

// ---- the request and the answers ------------------------------------------------

export type DefinitionKey =
  | "riemannLiouville"
  | "caputo"
  | "grunwaldLetnikov"
  | "conformable"
  | "caputoHadamard"
  | "weyl";

export type AnswerKind =
  | "closed"
  | "integral"
  | "limit"
  | "partial"
  | "undefined";

export interface DefinitionAnswer {
  key: DefinitionKey;
  name: string;
  /** What the definition is, in a line. */
  definitionLatex: string;
  kind: AnswerKind;
  /** The answer to read, with Γ, E and ψ. Empty when there is none. */
  latex: string;
  /** The same answer as Desmos can graph it. Empty when there is none. */
  graphLatex: string;
  /** Desmos definitions of the special functions `graphLatex` calls. */
  definitions: string[];
  /** At the chosen point, or undefined with `valueNote` saying why. */
  value?: number;
  notes: string[];
}

export interface FractionalRequest {
  f: Node;
  variable: string;
  /** The variable as LaTeX: x, t, \theta. */
  variableLatex: string;
  order: number;
  /** The order as typed: \pi, \frac{1}{2}, 0.5. */
  orderLatex: string;
  /** The lower limit for Riemann–Liouville, Caputo and Grünwald–Letnikov. */
  lower: number;
  lowerLatex: string;
  /** Where each answer is evaluated. */
  point: number;
  /** Emits a tree as Desmos LaTeX. */
  emit: (node: Node) => string;
}

export interface FractionalResult {
  /** "derivative", "integral", or "ordinary" for a whole order. */
  kind: "derivative" | "integral" | "ordinary";
  /** n = ⌈α⌉ for a derivative, 0 for an integral. */
  n: number;
  answers: DefinitionAnswer[];
  /** How the term-by-term reading went: the terms not read are generic. */
  notes: string[];
}

// ---- LaTeX helpers -------------------------------------------------------------

/** `offset − α` as LaTeX, exact when α is rational. */
function shiftLatex(offset: number, req: FractionalRequest): string {
  const q = Q.fromNumber(req.order);
  const p = Q.fromNumber(offset);
  if (
    q !== undefined &&
    p !== undefined &&
    /^[-\d.\\{}frac\s]*$/.test(req.orderLatex)
  )
    return Q.toLatex(Q.subtract(p, q));
  const a = req.orderLatex.trim();
  const negated = a.startsWith("-") ? a.slice(1) : undefined;
  const head = offset === 0 ? "" : formatNumber(offset);
  if (negated !== undefined)
    return offset === 0 ? negated : `${head}+${negated}`;
  return `${head}-${a}`;
}

/** `(k + offset − α)` with k symbolic, for Desmos sums. */
function kShift(offset: number, req: FractionalRequest, k = "k"): string {
  const a = req.orderLatex.trim();
  const o =
    offset === 0
      ? ""
      : offset > 0
        ? `+${formatNumber(offset)}`
        : formatNumber(offset);
  return `${k}${o}-\\left(${a}\\right)`;
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  const q = Q.fromNumber(v);
  return q !== undefined ? Q.toLatex(q) : String(v);
}

/** A coefficient in front of a term: "" for 1, "-" for −1. */
function coefficientLatex(c: number, cLatex: string): string {
  if (c === 1) return "";
  if (c === -1) return "-";
  return /^[-\d.]+$/.test(cLatex) || cLatex.startsWith("\\frac")
    ? cLatex
    : `\\left(${cLatex}\\right)`;
}

function joinTerms(parts: string[]): string {
  const kept = parts.filter((p) => p !== "" && p !== "0");
  if (kept.length === 0) return "0";
  return kept
    .map((p, i) => (i === 0 || p.startsWith("-") ? p : `+${p}`))
    .join("");
}

// ---- reading f term by term ----------------------------------------------------

type Shape =
  | { kind: "constant" }
  | { kind: "power"; p: number }
  | { kind: "exp"; b: number }
  | { kind: "sin"; b: number }
  | { kind: "cos"; b: number }
  | { kind: "ln" }
  | { kind: "generic"; node: Node };

interface Term {
  c: number;
  cLatex: string;
  shape: Shape;
  /** The term itself, for numerical routes. */
  node: Node;
}

function rateOf(node: Node, variable: string): number | undefined {
  const at0 = evaluate(node, { [variable]: 0 });
  const at1 = evaluate(node, { [variable]: 1 });
  const at3 = evaluate(node, { [variable]: 3 });
  if (at0 !== 0 || !Number.isFinite(at1) || Math.abs(at3 - 3 * at1) > 1e-12)
    return undefined;
  return at1;
}

function shapeOf(
  node: Node,
  variable: string,
  inNumerator: boolean
): Shape | undefined {
  const sign = inNumerator ? 1 : -1;
  if (node.type === "Identifier" && node.symbol === variable)
    return { kind: "power", p: sign };
  if (node.type === "BinaryOperator" && node.name === "Exponent") {
    if (
      node.left.type === "Identifier" &&
      node.left.symbol === variable &&
      !dependsOn(node.right, variable)
    )
      return { kind: "power", p: sign * evaluate(node.right, {}) };
    if (node.left.type === "Identifier" && node.left.symbol === "e") {
      const b = rateOf(node.right, variable);
      if (b !== undefined) return { kind: "exp", b: sign * b };
    }
  }
  if (node.type === "FunctionCall" && node.args.length === 1) {
    const [arg] = node.args;
    const name = node.callee.symbol;
    if (name === "sqrt" && arg.type === "Identifier" && arg.symbol === variable)
      return { kind: "power", p: sign * 0.5 };
    if (!inNumerator) return undefined;
    if (name === "exp") {
      const b = rateOf(arg, variable);
      if (b !== undefined) return { kind: "exp", b };
    }
    if (name === "sin" || name === "cos") {
      const b = rateOf(arg, variable);
      if (b !== undefined && b !== 0) return { kind: name, b };
    }
    if (name === "ln" && arg.type === "Identifier" && arg.symbol === variable)
      return { kind: "ln" };
  }
  return undefined;
}

function readTerms(f: Node, req: FractionalRequest): Term[] {
  const out: Term[] = [];
  for (const { term, negated } of topLevelTerms(fold(f))) {
    const factors: { node: Node; inNumerator: boolean }[] = [];
    quotientFactors(term, true, factors);
    let c = negated ? -1 : 1;
    const varying = factors.filter((x) => dependsOn(x.node, req.variable));
    for (const x of factors) {
      if (dependsOn(x.node, req.variable)) continue;
      const v = evaluate(x.node, {});
      c = x.inNumerator ? c * v : c / v;
    }
    const cNode = fold(
      factors
        .filter((x) => !dependsOn(x.node, req.variable))
        .reduce<Node>(
          (acc, x) =>
            x.inNumerator
              ? multiply(acc, x.node)
              : {
                  type: "BinaryOperator",
                  name: "Divide",
                  left: acc,
                  right: x.node,
                },
          { type: "Constant", value: negated ? -1 : 1 }
        )
    );
    const cLatex = req.emit(cNode);
    const whole: Node = negated ? { type: "Negative", arg: term } : term;
    if (varying.length === 0) {
      out.push({ c, cLatex, shape: { kind: "constant" }, node: whole });
      continue;
    }
    const shape =
      varying.length === 1
        ? shapeOf(varying[0].node, req.variable, varying[0].inNumerator)
        : undefined;
    out.push({
      c,
      cLatex,
      shape: shape ?? { kind: "generic", node: whole },
      node: whole,
    });
  }
  return out;
}

// ---- numerical routes, for any term ---------------------------------------------

const derivativeCache = new WeakMap<Node, Node[]>();
function derivatives(f: Node, variable: string, upTo: number): Node[] {
  const cached = derivativeCache.get(f);
  if (cached !== undefined && cached.length > upTo) return cached;
  const out = [fold(f)];
  for (let k = 1; k <= upTo; k += 1)
    out.push(fold(differentiate(out[k - 1], variable)));
  derivativeCache.set(f, out);
  return out;
}

/**
 * Caputo from `a`: (1/Γ(n − α)) ∫ₐˣ f⁽ⁿ⁾(t)(x − t)^{n−α−1} dt. With n = 0 it is
 * the Riemann–Liouville integral of order −α.
 */
function caputoNumeric(f: Node, req: FractionalRequest, n: number, x: number) {
  const dn = derivatives(f, req.variable, n)[n];
  // With s = x − t and then s = w^{1/β} (β = n − α), the kernel s^{β−1} ds
  // becomes dw/β: no singularity left for the quadrature to miss.
  const beta = n - req.order;
  const g = (w: number) =>
    evaluate(dn, { [req.variable]: x - w ** (1 / beta) }) / beta;
  const integral = quadrature(g, 0, (x - req.lower) ** beta);
  return integral === undefined ? undefined : integral / gamma(n - req.order);
}

/** RL from `a` = Caputo + Σ_{k<n} f⁽ᵏ⁾(a)(x − a)^{k−α}/Γ(k + 1 − α). */
function riemannNumeric(f: Node, req: FractionalRequest, n: number, x: number) {
  const caputo = caputoNumeric(f, req, n, x);
  if (caputo === undefined) return undefined;
  const ds = derivatives(f, req.variable, n);
  let total = caputo;
  for (let k = 0; k < n; k += 1) {
    const at = evaluate(ds[k], { [req.variable]: req.lower });
    if (!Number.isFinite(at)) return undefined;
    total +=
      at *
      (x - req.lower) ** (k - req.order) *
      reciprocalGamma(k + 1 - req.order);
  }
  return total;
}

/**
 * The Grünwald–Letnikov sum, at steps (x − a)/N for N = 40 … 640, with the
 * error's powers of h removed one at a time (Richardson). Fine steps alone
 * would not do: the sum is h^α times smaller than its terms, so at α = π and
 * h = 10⁻⁴ every digit cancels.
 */
function grunwaldNumeric(f: Node, req: FractionalRequest, x: number) {
  const sum = (N: number) => {
    const h = (x - req.lower) / N;
    let w = 1;
    let total = 0;
    for (let k = 0; k <= N; k += 1) {
      if (k > 0) w *= 1 - (req.order + 1) / k;
      const y = evaluate(f, { [req.variable]: x - k * h });
      if (Number.isFinite(y)) total += w * y;
    }
    return total / h ** req.order;
  };
  let row = [40, 80, 160, 320, 640].map(sum);
  for (let power = 1; row.length > 1; power += 1) {
    const factor = 2 ** power;
    row = row
      .slice(1)
      .map((fine, i) => (factor * fine - row[i]) / (factor - 1));
  }
  const [value] = row;
  return Number.isFinite(value) ? value : undefined;
}

/** Caputo–Hadamard from `a > 0`, with δ = x d/dx. */
function hadamardOperator(f: Node, variable: string, n: number): Node {
  let g = fold(f);
  for (let k = 0; k < n; k += 1)
    g = fold(multiply(id(variable), differentiate(g, variable)));
  return g;
}

// ---- the definitions -------------------------------------------------------------

interface Piece {
  latex: string;
  graph: string;
  value: (x: number) => number;
}

/** Riemann–Liouville from 0, one term; undefined if the term has no closed form. */
function riemannTerm(
  t: Term,
  req: FractionalRequest
): Piece | "undefined" | undefined {
  const v = req.variableLatex;
  const a = req.order;
  const A = `\\left(${req.orderLatex}\\right)`;
  const cl = coefficientLatex(t.c, t.cLatex);
  const s = t.shape;
  switch (s.kind) {
    case "constant":
      return {
        latex: `\\frac{${t.cLatex}${v}^{${shiftLatex(0, req)}}}{\\Gamma\\left(${shiftLatex(1, req)}\\right)}`,
        graph: `\\frac{${t.cLatex}${v}^{-${A}}}{\\left(-${A}\\right)!}`,
        value: (x) => t.c * x ** -a * reciprocalGamma(1 - a),
      };
    case "power": {
      if (!(s.p > -1)) return "undefined";
      return {
        latex: `${cl}\\frac{\\Gamma\\left(${formatNumber(s.p + 1)}\\right)}{\\Gamma\\left(${shiftLatex(s.p + 1, req)}\\right)}${v}^{${shiftLatex(s.p, req)}}`,
        graph: `${cl}\\frac{${formatNumber(s.p)}!}{\\left(${formatNumber(s.p)}-${A}\\right)!}${v}^{${formatNumber(s.p)}-${A}}`,
        value: (x) =>
          t.c * gamma(s.p + 1) * reciprocalGamma(s.p + 1 - a) * x ** (s.p - a),
      };
    }
    case "exp":
      return {
        latex: `${cl}${v}^{${shiftLatex(0, req)}}E_{1,${shiftLatex(1, req)}}\\left(${scaled(s.b, v)}\\right)`,
        graph: `${cl}\\sum_{k=0}^{80}\\frac{\\left(${formatNumber(s.b)}\\right)^{k}${v}^{${kShift(0, req)}}}{\\left(${kShift(0, req)}\\right)!}`,
        value: (x) => t.c * x ** -a * mittagLeffler(1, 1 - a, s.b * x),
      };
    case "cos":
      return {
        latex: `${cl}${v}^{${shiftLatex(0, req)}}E_{2,${shiftLatex(1, req)}}\\left(-${scaled(s.b * s.b, `${v}^{2}`)}\\right)`,
        graph: `${cl}\\sum_{k=0}^{60}\\frac{\\left(-1\\right)^{k}\\left(${formatNumber(s.b)}\\right)^{2k}${v}^{${kShift(0, req, "2k")}}}{\\left(${kShift(0, req, "2k")}\\right)!}`,
        value: (x) =>
          t.c * x ** -a * mittagLeffler(2, 1 - a, -s.b * s.b * x * x),
      };
    case "sin":
      return {
        latex: `${coefficientLatex(t.c * s.b, formatNumber(t.c * s.b))}${v}^{${shiftLatex(1, req)}}E_{2,${shiftLatex(2, req)}}\\left(-${scaled(s.b * s.b, `${v}^{2}`)}\\right)`,
        graph: `${cl}\\sum_{k=0}^{60}\\frac{\\left(-1\\right)^{k}\\left(${formatNumber(s.b)}\\right)^{2k+1}${v}^{${kShift(1, req, "2k")}}}{\\left(${kShift(1, req, "2k")}\\right)!}`,
        value: (x) =>
          t.c *
          s.b *
          x ** (1 - a) *
          mittagLeffler(2, 2 - a, -s.b * s.b * x * x),
      };
    case "ln": {
      const psi = digamma(1 - a);
      return {
        latex: `\\frac{${t.cLatex}${v}^{${shiftLatex(0, req)}}}{\\Gamma\\left(${shiftLatex(1, req)}\\right)}\\left(\\ln ${v}+\\psi\\left(1\\right)-\\psi\\left(${shiftLatex(1, req)}\\right)\\right)`,
        graph: `\\frac{${t.cLatex}${v}^{-${A}}}{\\left(-${A}\\right)!}\\left(\\ln\\left(${v}\\right)-${EULER_GAMMA}-\\left(${psi}\\right)\\right)`,
        value: (x) =>
          t.c *
          x ** -a *
          reciprocalGamma(1 - a) *
          (Math.log(x) - EULER_GAMMA - psi),
      };
    }
    default:
      return undefined;
  }
}

/** Caputo from 0, one term. */
function caputoTerm(
  t: Term,
  req: FractionalRequest,
  n: number
): Piece | "undefined" | undefined {
  const v = req.variableLatex;
  const a = req.order;
  const A = `\\left(${req.orderLatex}\\right)`;
  const cl = coefficientLatex(t.c, t.cLatex);
  const s = t.shape;
  // For an integral (n = 0), Caputo and Riemann–Liouville coincide.
  if (n === 0) return riemannTerm(t, req);
  switch (s.kind) {
    case "constant":
      return { latex: "0", graph: "0", value: () => 0 };
    case "power":
      if (Number.isInteger(s.p) && s.p >= 0 && s.p < n)
        return { latex: "0", graph: "0", value: () => 0 };
      if (!(s.p > n - 1)) return "undefined";
      return riemannTerm(t, req);
    case "exp":
      return {
        latex: `${coefficientLatex(t.c * s.b ** n, formatNumber(t.c * s.b ** n))}${v}^{${shiftLatex(n, req)}}E_{1,${shiftLatex(n + 1, req)}}\\left(${scaled(s.b, v)}\\right)`,
        graph: `${cl}\\sum_{k=${n}}^{80}\\frac{\\left(${formatNumber(s.b)}\\right)^{k}${v}^{${kShift(0, req)}}}{\\left(${kShift(0, req)}\\right)!}`,
        value: (x) =>
          t.c * s.b ** n * x ** (n - a) * mittagLeffler(1, n + 1 - a, s.b * x),
      };
    case "cos":
    case "sin": {
      const odd = s.kind === "sin" ? 1 : 0;
      const start = Math.ceil((n - odd) / 2);
      const series = (x: number) => {
        let total = 0;
        for (let k = start; k < start + 200; k += 1) {
          const term =
            (-1) ** k *
            s.b ** (2 * k + odd) *
            x ** (2 * k + odd - a) *
            reciprocalGamma(2 * k + odd + 1 - a);
          total += term;
          if (
            Math.abs(term) < 1e-18 * Math.max(1, Math.abs(total)) &&
            k > start + Math.abs(s.b * x)
          )
            break;
        }
        return total;
      };
      const power = odd ? "2k+1" : "2k";
      return {
        latex: `${cl}\\sum_{k=${start}}^{\\infty}\\frac{\\left(-1\\right)^{k}${s.b === 1 ? "" : `${formatNumber(s.b)}^{${power}}`}${v}^{${power}-${A}}}{\\Gamma\\left(${power}+1-${A}\\right)}`,
        graph: `${cl}\\sum_{k=${start}}^{60}\\frac{\\left(-1\\right)^{k}\\left(${formatNumber(s.b)}\\right)^{${power}}${v}^{${kShift(odd, req, "2k")}}}{\\left(${kShift(odd, req, "2k")}\\right)!}`,
        value: (x) => t.c * series(x),
      };
    }
    case "ln":
      return "undefined";
    default:
      return undefined;
  }
}

/** Weyl (Liouville from −∞), one term. */
function weylTerm(t: Term, req: FractionalRequest): Piece | string {
  const v = req.variableLatex;
  const A = `\\left(${req.orderLatex}\\right)`;
  const a = req.order;
  const s = t.shape;
  const cl = coefficientLatex(t.c, t.cLatex);
  switch (s.kind) {
    case "exp":
      if (!(s.b > 0)) return "it does not decay as the variable goes to −∞";
      return {
        latex: `${cl}${s.b === 1 ? "" : `${formatNumber(s.b)}^{${req.orderLatex}}`}e^{${s.b === 1 ? "" : formatNumber(s.b)}${v}}`,
        graph: `${cl}\\left(${formatNumber(s.b)}\\right)^{${A}}e^{${formatNumber(s.b)}${v}}`,
        value: (x) => t.c * s.b ** a * Math.exp(s.b * x),
      };
    case "sin":
    case "cos": {
      const b = Math.abs(s.b);
      const c = s.kind === "sin" && s.b < 0 ? -t.c : t.c;
      const cL = coefficientLatex(c, formatNumber(c));
      const phase = halfPiTimesOrder(req);
      return {
        latex: `${cL}${b === 1 ? "" : `${formatNumber(b)}^{${req.orderLatex}}`}\\${s.kind}\\left(${b === 1 ? "" : formatNumber(b)}${v}+${phase}\\right)`,
        graph: `${cL}\\left(${formatNumber(b)}\\right)^{${A}}\\${s.kind}\\left(${formatNumber(b)}${v}+\\frac{${A}\\pi}{2}\\right)`,
        value: (x) =>
          c *
          b ** a *
          (s.kind === "sin" ? Math.sin : Math.cos)(b * x + (a * Math.PI) / 2),
      };
    }
    case "constant":
      return a > 0 && Number.isInteger(a)
        ? { latex: "0", graph: "0", value: () => 0 }
        : "a constant does not decay at −∞, so its Weyl integral diverges";
    case "power":
      return "a power of the variable does not decay at −∞";
    case "ln":
      return "ln is not defined for negative values";
    default:
      return "this term has no Weyl derivative this can find";
  }
}

// ---- the whole thing -------------------------------------------------------------

/** Every definition's answer for `D^α f`. */
export function fractionalDerivatives(
  req: FractionalRequest
): FractionalResult {
  const a = req.order;
  const v = req.variableLatex;
  const x0 = req.point;
  const A = req.orderLatex;
  const answers: DefinitionAnswer[] = [];
  // Trees as the panel shows them: condensed, so the fourth derivative of
  // ln x reads −6/x⁴ and not a quotient of quotients.
  const show = (node: Node) =>
    req.emit(condense(fold(collectLikeTerms(fold(node)))).node);
  // A tree inside prose, as inline maths.
  const inline = (node: Node) => `\\(${show(node)}\\)`;

  if (Number.isInteger(a) && a >= 0) {
    const d = derivatives(req.f, req.variable, a)[a];
    const latex = show(d);
    return {
      kind: "ordinary",
      n: a,
      answers: [
        {
          key: "riemannLiouville",
          definitions: [],
          name: "Every definition",
          definitionLatex: `\\frac{d^{${a}}}{d${v}^{${a}}}`,
          kind: "closed",
          latex,
          graphLatex: latex,
          value: evaluate(d, { [req.variable]: x0 }),
          notes: [
            "For a whole order, Riemann–Liouville, Caputo, Grünwald–Letnikov, conformable and Weyl all give the ordinary derivative.",
          ],
        },
      ],
      notes: [],
    };
  }

  const n = a > 0 ? Math.ceil(a) : 0;
  const integral = a < 0;
  const dummy = req.variable === "t" ? "s" : "t";
  const terms = readTerms(req.f, req);
  const notes: string[] = [];
  const generic = terms.filter((t) => t.shape.kind === "generic").length;
  if (generic > 0)
    notes.push(
      `${generic} term${generic === 1 ? " has" : "s have"} no closed form here; ${generic === 1 ? "it is" : "they are"} answered through the integral representations.`
    );
  const fAt = (node: Node) =>
    show(fold(replaceIdentifier(node, req.variable, id(dummy))));
  const ds = derivatives(req.f, req.variable, Math.max(n, 1));
  const kernelPower = shiftLatex(n - 1, req);
  const gammaFront = `\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}`;
  const integrandLatex = `${n === 0 ? `\\left(${fAt(req.f)}\\right)` : `\\left(${fAt(ds[n])}\\right)`}\\left(${v}-${dummy}\\right)^{${kernelPower}}`;
  const integralRep = (lower: string) =>
    `${gammaFront}\\int_{${lower}}^{${v}}${integrandLatex}d${dummy}`;
  const integralGraph = (lower: string) =>
    `\\frac{1}{\\left(${n - 1}-\\left(${A}\\right)\\right)!}\\int_{${lower}}^{${v}}\\left(${n === 0 ? fAt(req.f) : fAt(ds[n])}\\right)\\left(${v}-${dummy}\\right)^{${n - 1}-\\left(${A}\\right)}d${dummy}`;

  // Closed forms from 0, term by term.
  const closed = (
    piece: (t: Term) => Piece | "undefined" | undefined
  ): { pieces: Piece[]; undefinedTerm?: Term; missing: boolean } => {
    const pieces: Piece[] = [];
    let missing = false;
    for (const t of terms) {
      const p = piece(t);
      if (p === "undefined") return { pieces, undefinedTerm: t, missing };
      if (p === undefined) missing = true;
      else pieces.push(p);
    }
    return { pieces, missing };
  };
  const fromZero = req.lower === 0;

  // Riemann–Liouville.
  {
    const name = integral ? "Riemann–Liouville integral" : "Riemann–Liouville";
    const definitionLatex = integral
      ? `{}_{${req.lowerLatex}}I_{${v}}^{${shiftLatex(0, req)}}f=\\frac{1}{\\Gamma\\left(${shiftLatex(0, req)}\\right)}\\int_{${req.lowerLatex}}^{${v}}f\\left(${dummy}\\right)\\left(${v}-${dummy}\\right)^{${shiftLatex(-1, req)}}d${dummy}`
      : `{}_{${req.lowerLatex}}D_{${v}}^{${A}}f=\\frac{d^{${n}}}{d${v}^{${n}}}\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}\\int_{${req.lowerLatex}}^{${v}}f\\left(${dummy}\\right)\\left(${v}-${dummy}\\right)^{${kernelPower}}d${dummy}`;
    const c = fromZero ? closed((t) => riemannTerm(t, req)) : undefined;
    if (c !== undefined && c.undefinedTerm === undefined && !c.missing) {
      const value = c.pieces.reduce((s, p) => s + p.value(x0), 0);
      answers.push({
        definitions: [],
        key: "riemannLiouville",
        name,
        definitionLatex,
        kind: "closed",
        latex: joinTerms(c.pieces.map((p) => p.latex)),
        graphLatex: joinTerms(c.pieces.map((p) => p.graph)),
        value,
        notes: [
          "Term by term: Γ(p + 1)/Γ(p + 1 − α)·x^{p−α} for a power, and the Mittag-Leffler function E_{a,b}(z) = Σ zᵏ/Γ(ak + b) for exponentials, sines and cosines.",
        ],
      });
    } else if (c?.undefinedTerm !== undefined) {
      answers.push({
        definitions: [],
        key: "riemannLiouville",
        name,
        definitionLatex,
        kind: "undefined",
        latex: "",
        graphLatex: "",
        notes: [
          `Not defined from ${req.lowerLatex}: the term ${inline(c.undefinedTerm.node)} is not integrable there. Choose a lower limit above 0.`,
        ],
      });
    } else {
      const value = riemannNumeric(req.f, req, n, x0);
      const boundary = Array.from({ length: n }, (_, k) => {
        const at = req.emit(
          fold(
            replaceIdentifier(ds[k], req.variable, {
              type: "Constant",
              value: req.lower,
            })
          )
        );
        return `\\frac{${at}\\left(${v}-${req.lowerLatex}\\right)^{${shiftLatex(k, req)}}}{\\Gamma\\left(${shiftLatex(k + 1, req)}\\right)}`;
      });
      answers.push({
        definitions: [],
        key: "riemannLiouville",
        name,
        definitionLatex,
        kind: "integral",
        latex: joinTerms([...boundary, integralRep(req.lowerLatex)]),
        graphLatex: joinTerms([
          ...Array.from({ length: n }, (_, k) => {
            const at = req.emit(
              fold(
                replaceIdentifier(ds[k], req.variable, {
                  type: "Constant",
                  value: req.lower,
                })
              )
            );
            return `\\frac{\\left(${at}\\right)\\left(${v}-${req.lowerLatex}\\right)^{${k}-\\left(${A}\\right)}}{\\left(${k}-\\left(${A}\\right)\\right)!}`;
          }),
          integralGraph(req.lowerLatex),
        ]),
        value,
        notes: [
          "Written as the Caputo integral plus the boundary terms f⁽ᵏ⁾(a)(x − a)^{k−α}/Γ(k + 1 − α), which is the same operator and needs no derivative of an integral.",
        ],
      });
    }
  }

  // Caputo.
  if (!integral) {
    const definitionLatex = `{}^{C}_{${req.lowerLatex}}D_{${v}}^{${A}}f=\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}\\int_{${req.lowerLatex}}^{${v}}f^{\\left(${n}\\right)}\\left(${dummy}\\right)\\left(${v}-${dummy}\\right)^{${kernelPower}}d${dummy}`;
    const c = fromZero ? closed((t) => caputoTerm(t, req, n)) : undefined;
    if (c !== undefined && c.undefinedTerm === undefined && !c.missing) {
      answers.push({
        definitions: [],
        key: "caputo",
        name: "Caputo",
        definitionLatex,
        kind: "closed",
        latex: joinTerms(c.pieces.map((p) => p.latex)),
        graphLatex: joinTerms(c.pieces.map((p) => p.graph)),
        value: c.pieces.reduce((s, p) => s + p.value(x0), 0),
        notes: [
          `The ordinary ${n}th derivative first, then a fractional integral: whole powers below ${n} and constants give 0.`,
        ],
      });
    } else {
      const bad = c?.undefinedTerm;
      const representation = integralRep(
        bad !== undefined ? "a" : req.lowerLatex
      );
      const value =
        bad === undefined ? caputoNumeric(req.f, req, n, x0) : undefined;
      answers.push({
        definitions: [],
        key: "caputo",
        name: "Caputo",
        definitionLatex,
        kind: bad !== undefined ? "partial" : "integral",
        latex: representation,
        graphLatex: bad === undefined ? integralGraph(req.lowerLatex) : "",
        value,
        notes:
          bad !== undefined
            ? [
                `From ${req.lowerLatex} it does not exist: the ${n}th derivative of ${inline(bad.node)} is too singular there to integrate. From any a > 0 it is the integral shown; set a lower limit above 0 to evaluate it.`,
              ]
            : [
                "An exact integral representation, with the function's own derivative written in.",
              ],
      });
    }
  }

  // Grünwald–Letnikov.
  {
    const definitionLatex = `{}^{GL}_{${req.lowerLatex}}D_{${v}}^{${A}}f=\\lim_{h\\to0^{+}}\\frac{1}{h^{${A}}}\\sum_{k=0}^{\\frac{${v}-${req.lowerLatex}}{h}}\\left(-1\\right)^{k}\\frac{\\Gamma\\left(${A}+1\\right)}{k!\\Gamma\\left(${A}-k+1\\right)}f\\left(${v}-kh\\right)`;
    const value = grunwaldNumeric(req.f, req, x0);
    const riemann = answers.find((x) => x.key === "riemannLiouville");
    const agrees =
      value !== undefined &&
      riemann?.value !== undefined &&
      Math.abs(value - riemann.value) < 1e-4 * Math.max(1, Math.abs(value));
    answers.push({
      definitions: [],
      key: "grunwaldLetnikov",
      name: "Grünwald–Letnikov",
      definitionLatex,
      kind: "limit",
      latex: `\\lim_{h\\to0^{+}}\\frac{1}{h^{${A}}}\\sum_{k=0}^{\\frac{${v}-${req.lowerLatex}}{h}}\\left(-1\\right)^{k}\\frac{\\Gamma\\left(${A}+1\\right)}{k!\\Gamma\\left(${A}-k+1\\right)}\\left(${req.emit(fold(replaceIdentifier(req.f, req.variable, { type: "BinaryOperator", name: "Subtract", left: id(req.variable), right: multiply(id("k"), id("h")) })))}\\right)`,
      graphLatex: "",
      value,
      notes: [
        agrees
          ? `Its value at ${v} = ${x0}, computed from the finite differences with h → 0, matches Riemann–Liouville from the same lower limit, as the theorem says it must for this function.`
          : "A limit of finite differences; for a function this smooth it equals Riemann–Liouville from the same lower limit.",
      ],
    });
  }

  // Conformable.
  if (!integral) {
    const d = ds[n];
    const body = fold(
      multiply(
        {
          type: "BinaryOperator",
          name: "Exponent",
          left: id(req.variable),
          right: { type: "Constant", value: n - a },
        },
        d
      )
    );
    const value = evaluate(body, { [req.variable]: x0 });
    answers.push({
      definitions: [],
      key: "conformable",
      name: "Conformable",
      definitionLatex: `T_{${A}}f\\left(${v}\\right)=${v}^{${shiftLatex(n, req)}}f^{\\left(${n}\\right)}\\left(${v}\\right)`,
      kind: "closed",
      latex: `${v}^{${shiftLatex(n, req)}}\\left(${show(d)}\\right)`,
      graphLatex: `${v}^{${n}-\\left(${A}\\right)}\\left(${show(d)}\\right)`,
      value: Number.isFinite(value) ? value : undefined,
      notes: [
        "Always elementary, because it is local: the ordinary derivative times a power. It is a different operator from the classical, nonlocal ones above.",
      ],
    });
  }

  // Caputo–Hadamard, from 1 (or the lower limit if it is above 0).
  {
    const lower = req.lower > 0 ? req.lower : 1;
    const lowerLatex = req.lower > 0 ? req.lowerLatex : "1";
    const G = hadamardOperator(req.f, req.variable, n);
    const Gt = fAt(G);
    const kernel = integral ? shiftLatex(-1, req) : kernelPower;
    const definitionLatex = `{}^{CH}_{${lowerLatex}}D_{${v}}^{${A}}f=\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}\\int_{${lowerLatex}}^{${v}}\\left(\\ln\\frac{${v}}{${dummy}}\\right)^{${kernel}}\\delta^{${n}}f\\left(${dummy}\\right)\\frac{d${dummy}}{${dummy}}`;
    // u = ln(x/t) (so dt/t = −du), then u = w^{1/β}: the kernel u^{β−1} du
    // becomes dw/β, and the integrand is smooth.
    const beta = n - a;
    const g = (w: number) =>
      evaluate(G, { [req.variable]: x0 * Math.exp(-(w ** (1 / beta))) }) / beta;
    const integralValue =
      x0 > lower ? quadrature(g, 0, Math.log(x0 / lower) ** beta) : undefined;
    answers.push({
      definitions: [],
      key: "caputoHadamard",
      name: integral ? "Hadamard integral" : "Caputo–Hadamard",
      definitionLatex,
      kind: "integral",
      latex: `${gammaFront}\\int_{${lowerLatex}}^{${v}}\\left(\\ln\\frac{${v}}{${dummy}}\\right)^{${kernel}}\\frac{${Gt}}{${dummy}}d${dummy}`,
      graphLatex: `\\frac{1}{\\left(${n - 1}-\\left(${A}\\right)\\right)!}\\int_{${lowerLatex}}^{${v}}\\left(\\ln\\left(\\frac{${v}}{${dummy}}\\right)\\right)^{${n - 1}-\\left(${A}\\right)}\\frac{${Gt}}{${dummy}}d${dummy}`,
      value:
        integralValue === undefined ? undefined : integralValue / gamma(n - a),
      notes: [
        `The kernel uses logarithmic distance, and the derivative is δ = ${v}·d/d${v}, applied ${n} time${n === 1 ? "" : "s"}: δ${n === 1 ? "" : `^${n}`}f = ${inline(G)}.`,
        ...(x0 > lower
          ? []
          : [`Evaluated only for ${v} above the lower limit ${lowerLatex}.`]),
      ],
    });
  }

  // Weyl, from −∞.
  {
    const pieces = terms.map((t) => ({ t, w: weylTerm(t, req) }));
    const missing = pieces.filter((p) => typeof p.w === "string");
    const found = pieces
      .filter((p) => typeof p.w !== "string")
      .map((p) => p.w as Piece);
    const definitionLatex = `{}_{-\\infty}D_{${v}}^{${A}}f:\\ \\mathcal{F}\\left[D^{${A}}f\\right]\\left(\\omega\\right)=\\left(i\\omega\\right)^{${A}}\\hat{f}\\left(\\omega\\right)`;
    answers.push({
      definitions: [],
      key: "weyl",
      name: "Weyl (from −∞)",
      definitionLatex,
      kind:
        missing.length === 0
          ? "closed"
          : found.length > 0
            ? "partial"
            : "undefined",
      latex:
        missing.length === 0
          ? joinTerms(found.map((p) => p.latex))
          : found.length > 0
            ? joinTerms(found.map((p) => p.latex))
            : "",
      graphLatex:
        missing.length === 0 ? joinTerms(found.map((p) => p.graph)) : "",
      value:
        missing.length === 0
          ? found.reduce((s, p) => s + p.value(x0), 0)
          : undefined,
      notes:
        missing.length === 0
          ? [
              "Exponentials scale by bᵅ and sines and cosines shift phase by απ/2.",
            ]
          : [
              `Not defined for the whole function: ${missing.map((p) => `${inline(p.t.node)} (${p.w as string})`).join("; ")}.${found.length > 0 ? " Shown: the terms that have one." : ""}`,
            ],
    });
  }

  // What is read is also what is graphed: Γ, ψ and the rest are defined in
  // Desmos (special.ts), and only E_{a,b}(z), whose subscript Desmos cannot
  // hold, is rewritten as E(a, b, z).
  for (const answer of answers) {
    if (
      answer.latex === "" ||
      answer.kind === "limit" ||
      answer.kind === "undefined" ||
      (answer.kind === "partial" && answer.key === "caputo")
    )
      continue;
    answer.graphLatex = desmosForm(answer.latex);
    answer.definitions = desmosDefinitions(
      specialFunctionsIn(answer.graphLatex)
    );
  }
  return { kind: integral ? "integral" : "derivative", n, answers, notes };
}

/** The readable answer as Desmos LaTeX: E_{a,b}(z) becomes E(a, b, z). */
export function desmosForm(latex: string): string {
  // Desmos sums need finite bounds; these series stop changing in double
  // precision well before 60 terms for the arguments a graph shows.
  let out = latex.split("}^{\\infty}").join("}^{60}");
  for (let guard = 0; guard < 50; guard += 1) {
    const at = out.indexOf("E_{");
    if (at < 0) break;
    let depth = 0;
    let end = at + 2;
    for (; end < out.length; end += 1) {
      if (out[end] === "{") depth += 1;
      else if (out[end] === "}" && --depth === 0) break;
    }
    const subscript = out.slice(at + 3, end);
    const comma = topLevelComma(subscript);
    const rest = out.slice(end + 1);
    const open = "\\left(";
    if (comma < 0 || !rest.startsWith(open)) break;
    out = `${out.slice(0, at)}E_{ML}${open}${subscript.slice(0, comma)},${subscript.slice(comma + 1)},${rest.slice(open.length)}`;
  }
  return out;
}

function topLevelComma(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "{" || s[i] === "(") depth += 1;
    else if (s[i] === "}" || s[i] === ")") depth -= 1;
    else if (s[i] === "," && depth === 0) return i;
  }
  return -1;
}

/** απ/2 as LaTeX: π²/2 for α = π, a rational multiple of π for a rational α. */
function halfPiTimesOrder(req: FractionalRequest): string {
  const a = req.orderLatex.trim();
  if (a === "\\pi") return "\\frac{\\pi^{2}}{2}";
  const q = Q.fromNumber(req.order);
  if (q !== undefined && /^[-\d.\\{}frac\s]*$/.test(a)) {
    const h = Q.multiply(q, Q.rational(1n, 2n));
    if (Q.isOne(h)) return "\\pi";
    const top = h.n === 1n ? "" : h.n === -1n ? "-" : String(h.n);
    return h.d === 1n ? `${top}\\pi` : `\\frac{${top}\\pi}{${h.d}}`;
  }
  return `\\frac{${a}\\pi}{2}`;
}

/** `b·v` without a leading 1. */
function scaled(b: number, v: string): string {
  return b === 1 ? v : `${formatNumber(b)}${v}`;
}
