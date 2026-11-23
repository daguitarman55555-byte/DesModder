/**
 * Definite integrals with an exact value and no antiderivative to evaluate.
 *
 * `∫₀^∞ (arctan 2x − arctan x)/x dx` has no elementary antiderivative, and is
 * exactly (π/2) ln 2. What finds that value is a theorem about the whole
 * interval, not a primitive. This module tries those theorems, each with its
 * hypotheses checked, from the families in
 * `docs/research/integral-families/GUIDE.md`:
 *
 * - **Symmetry** (F17, F18). An odd integrand on [−L, L] is 0. More
 *   generally, ∫_a^b f = ½∫_a^b (f(x) + f(a+b−x)), and that sum is often far
 *   simpler: a constant (King's rule: ln(1 + tan x) on [0, π/4]), or the
 *   numerator of f when f = N/(1 + k) and k(x)k(a+b−x) = 1 (cos x/(6ˣ + 1)).
 * - **Named results** (F19, F22, F24): ∫₀¹ (x^α − x^β)/ln x, Frullani,
 *   ∫₀^∞ ln(kx)/(x² + a²), the damped sine, ∫₀^π ln(A + B cos x),
 *   ∫₀^∞ ln(1 ± e^{−kx}), and ln sin and ln cos on [0, π/2].
 *
 * Every value is checked against a numerical integration before it is
 * returned. A named result whose hypotheses are checked exactly is reported
 * as proved. A symmetry whose identity could only be checked at sample points
 * says so.
 */
import {
  add,
  call,
  dependsOn,
  divide,
  evaluate,
  fold,
  id,
  multiply,
  negative,
  number,
  power,
  quotientFactors,
  replaceIdentifier,
  sameTree,
  subtract,
  topLevelTerms,
  type Node,
} from "../../../symbolic";
import * as X from "./exact";
import * as Q from "./rational";
import {
  definiteIntegral,
  exactConstant,
  quadrature,
  type Bound,
} from "./definite";
import { integrate, IntegrationError } from "./integrate";
import { asQPoly } from "./expRational";

export interface TheoremResult {
  exact: X.ExactValue;
  value: number;
  /** The theorem, in the words the panel shows. */
  method: string;
  /** False when an identity it rests on was checked only at sample points. */
  proved: boolean;
}

const SAMPLES = 24;

const at = (b: Bound) => (b.kind === "finite" ? b.value : b.sign * Infinity);

/** `c` when the node is `c·x` for a rational `c`, else undefined. */
function rateIn(node: Node, variable: string): number | undefined {
  const at0 = evaluate(node, { [variable]: 0 });
  const at1 = evaluate(node, { [variable]: 1 });
  const at3 = evaluate(node, { [variable]: 3 });
  if (at0 !== 0 || !Number.isFinite(at1) || Math.abs(at3 - 3 * at1) > 1e-12)
    return undefined;
  return Q.fromNumber(at1) === undefined ? undefined : at1;
}

function rationalNodeOf(value: number): Node | undefined {
  const q = Q.fromNumber(value);
  if (q === undefined) return undefined;
  const magnitude = number(Math.abs(Number(q.n)));
  const body = q.d === 1n ? magnitude : divide(magnitude, number(Number(q.d)));
  return q.n < 0n ? negative(body) : body;
}

function factorList(node: Node) {
  const out: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, out);
  return out;
}

const isCall = (node: Node, name: string) =>
  node.type === "FunctionCall" &&
  node.callee.symbol === name &&
  node.args.length === 1;

const isVariable = (node: Node, variable: string) =>
  node.type === "Identifier" && node.symbol === variable;

/** e^{(something)}: the exponent, or undefined. */
function exponentOf(node: Node): Node | undefined {
  if (
    node.type === "BinaryOperator" &&
    node.name === "Exponent" &&
    node.left.type === "Identifier" &&
    node.left.symbol === "e"
  )
    return node.right;
  if (isCall(node, "exp") && node.type === "FunctionCall") return node.args[0];
  return undefined;
}

function exactOf(node: Node): X.ExactValue | undefined {
  return exactConstant(fold(node));
}

// ---- named results -----------------------------------------------------------

type Named = (
  f: Node,
  variable: string,
  lower: Bound,
  upper: Bound
) => { node: Node; method: string } | undefined;

const isZeroBound = (b: Bound) => b.kind === "finite" && b.value === 0;
const isOneBound = (b: Bound) => b.kind === "finite" && b.value === 1;
const isPlusInfinity = (b: Bound) => b.kind === "infinite" && b.sign === 1;
const isMultipleOfPi = (b: Bound, k: number) =>
  b.kind === "finite" && Math.abs(b.value - k * Math.PI) < 1e-14;

/** ∫₀¹ Σcᵢx^{pᵢ}/ln x = Σcᵢ ln(pᵢ + 1) when Σcᵢ = 0 (F22, #417). */
const powerOverLog: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower) || !isOneBound(upper)) return undefined;
  if (f.type !== "BinaryOperator" || f.name !== "Divide") return undefined;
  if (!isCall(f.right, "ln") || f.right.type !== "FunctionCall")
    return undefined;
  if (!isVariable(f.right.args[0], variable)) return undefined;
  const poly = asQPoly(f.left, variable);
  if (poly === undefined) return undefined;
  let total = Q.ZERO;
  for (const c of poly) total = Q.add(total, c);
  if (!Q.isZero(total)) return undefined;
  let value: Node = number(0);
  poly.forEach((c, p) => {
    if (Q.isZero(c) || p === 0) return;
    value = add(
      value,
      multiply(rationalNodeOf(Q.toNumber(c))!, call("ln", number(p + 1)))
    );
  });
  return {
    node: value,
    method:
      "∫₀¹ (x^p − 1)/ln x dx = ln(p + 1), by differentiating under the integral sign in p; the numerator is a combination of these because its coefficients add up to 0.",
  };
};

/** Frullani: ∫₀^∞ (g(ax) − g(bx))/x = (g(0) − g(∞)) ln(b/a). */
const FRULLANI_TABLE: Record<
  string,
  { atZero: Node; atInfinity: Node } | undefined
> = {
  arctan: { atZero: number(0), atInfinity: divide(id("pi"), number(2)) },
  tanh: { atZero: number(0), atInfinity: number(1) },
};
const frullani: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower) || !isPlusInfinity(upper)) return undefined;
  if (f.type !== "BinaryOperator" || f.name !== "Divide") return undefined;
  if (!isVariable(f.right, variable)) return undefined;
  const terms = topLevelTerms(f.left);
  if (terms.length !== 2 || terms[0].negated === terms[1].negated)
    return undefined;
  const [plus, minus] = terms[0].negated ? [terms[1], terms[0]] : terms;
  const read = (term: Node) => {
    // g(kx) for a tabulated g, or e^{−kx}.
    if (term.type === "FunctionCall" && term.args.length === 1) {
      const entry = FRULLANI_TABLE[term.callee.symbol];
      const rate = rateIn(term.args[0], variable);
      if (entry !== undefined && rate !== undefined && rate > 0)
        return { key: term.callee.symbol, rate, ...entry };
    }
    const exponent = exponentOf(term);
    if (exponent !== undefined) {
      const rate = rateIn(exponent, variable);
      if (rate !== undefined && rate < 0)
        return {
          key: "exp",
          rate: -rate,
          atZero: number(1),
          atInfinity: number(0),
        };
    }
    return undefined;
  };
  const p = read(plus.term);
  const m = read(minus.term);
  if (p === undefined || m === undefined || p.key !== m.key) return undefined;
  return {
    node: multiply(
      subtract(p.atZero, p.atInfinity),
      call("ln", divide(rationalNodeOf(m.rate)!, rationalNodeOf(p.rate)!))
    ),
    method:
      "Frullani's theorem: ∫₀^∞ (g(ax) − g(bx))/x dx = (g(0) − g(∞)) ln(b/a), for a, b > 0 and g with limits at 0 and ∞.",
  };
};

/** ∫₀^∞ ln(kx)/(x² + a²) dx = π ln(ka)/(2a) (F22, #424). */
const logOverSquare: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower) || !isPlusInfinity(upper)) return undefined;
  if (f.type !== "BinaryOperator" || f.name !== "Divide") return undefined;
  if (!isCall(f.left, "ln") || f.left.type !== "FunctionCall") return undefined;
  const k = rateIn(f.left.args[0], variable);
  const q = asQPoly(f.right, variable);
  if (k === undefined || !(k > 0) || q === undefined) return undefined;
  if (q.length !== 3 || !Q.isZero(q[1]) || !Q.isOne(q[2])) return undefined;
  if (!(q[0].n > 0n)) return undefined;
  const a = power(
    rationalNodeOf(Q.toNumber(q[0]))!,
    divide(number(1), number(2))
  );
  return {
    node: divide(
      multiply(id("pi"), call("ln", multiply(rationalNodeOf(k)!, a))),
      multiply(number(2), a)
    ),
    method:
      "∫₀^∞ ln(kx)/(x² + a²) dx = π ln(ka)/(2a): substituting x = a²/t sends the integral of ln(x/a) to minus itself, so that part is 0.",
  };
};

/** ∫₀^∞ e^{−sx} sin(bx)/x dx = arctan(b/s), s > 0 (F22, #425). */
const dampedSine: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower) || !isPlusInfinity(upper)) return undefined;
  const factors = factorList(f);
  if (factors.length !== 3) return undefined;
  let s: number | undefined;
  let b: number | undefined;
  let overX = false;
  let scale = 1;
  for (const factor of factors) {
    const exponent = exponentOf(factor.node);
    if (factor.inNumerator && exponent !== undefined) {
      const rate = rateIn(exponent, variable);
      if (rate !== undefined && rate < 0) s = -rate;
    } else if (
      factor.inNumerator &&
      factor.node.type === "FunctionCall" &&
      factor.node.callee.symbol === "sin"
    )
      b = rateIn(factor.node.args[0], variable);
    else if (!factor.inNumerator && isVariable(factor.node, variable))
      overX = true;
    else if (!dependsOn(factor.node, variable)) {
      const v = evaluate(factor.node, {});
      scale = factor.inNumerator ? scale * v : scale / v;
    }
  }
  if (s === undefined || b === undefined || !overX || scale !== 1)
    return undefined;
  return {
    node: call("arctan", divide(rationalNodeOf(b)!, rationalNodeOf(s)!)),
    method:
      "∫₀^∞ e^{−sx} sin(bx)/x dx = arctan(b/s), for s > 0: its derivative in s is −b/(s² + b²), and it tends to 0 as s → ∞.",
  };
};

/** ∫₀^π ln(A + B cos x) dx = π ln((A + √(A² − B²))/2), A > |B| (F22, #426). */
const logAffineCosine: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower) || !isMultipleOfPi(upper, 1)) return undefined;
  if (!isCall(f, "ln") || f.type !== "FunctionCall") return undefined;
  const [inside] = f.args;
  // A + B cos x, read at three points.
  const cosAt = (x: number) => evaluate(inside, { [variable]: x });
  const A = cosAt(Math.PI / 2);
  const B = cosAt(0) - A;
  for (const x of [0.3, 1.1, 2.4])
    if (Math.abs(cosAt(x) - (A + B * Math.cos(x))) > 1e-12) return undefined;
  const qa = Q.fromNumber(A);
  const qb = Q.fromNumber(B);
  if (qa === undefined || qb === undefined || !(A > Math.abs(B)))
    return undefined;
  const root = power(
    rationalNodeOf(A * A - B * B)!,
    divide(number(1), number(2))
  );
  return {
    node: multiply(
      id("pi"),
      call("ln", divide(add(rationalNodeOf(A)!, root), number(2)))
    ),
    method:
      "∫₀^π ln(A + B cos x) dx = π ln((A + √(A² − B²))/2), for A > |B|, by differentiating under the integral sign in A.",
  };
};

/** ∫₀^∞ ln(1 ± e^{−kx}) dx = π²/(12k) or −π²/(6k) (F24). */
const logOneExp: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower) || !isPlusInfinity(upper)) return undefined;
  if (!isCall(f, "ln") || f.type !== "FunctionCall") return undefined;
  const terms = topLevelTerms(f.args[0]);
  if (terms.length !== 2) return undefined;
  const one = terms.find(
    (t) =>
      !dependsOn(t.term, variable) && evaluate(t.term, {}) === 1 && !t.negated
  );
  const other = terms.find((t) => t !== one);
  if (one === undefined || other === undefined) return undefined;
  const exponent = exponentOf(other.term);
  if (exponent === undefined) return undefined;
  const rate = rateIn(exponent, variable);
  if (rate === undefined || !(rate < 0)) return undefined;
  const k = rationalNodeOf(-rate)!;
  const piSquared = power(id("pi"), number(2));
  return {
    node: other.negated
      ? negative(divide(piSquared, multiply(number(6), k)))
      : divide(piSquared, multiply(number(12), k)),
    method: other.negated
      ? "∫₀^∞ ln(1 − e^{−kx}) dx = −Li₂(1)/k = −π²/(6k): expand the logarithm as a series in e^{−kx} and integrate term by term."
      : "∫₀^∞ ln(1 + e^{−kx}) dx = −Li₂(−1)/k = π²/(12k): expand the logarithm as a series in e^{−kx} and integrate term by term.",
  };
};

/** ∫₀^{π/2} ln sin = ∫₀^{π/2} ln cos = −(π/2) ln 2 (F19). */
const logSine: Named = (f, variable, lower, upper) => {
  if (!isZeroBound(lower)) return undefined;
  if (!isCall(f, "ln") || f.type !== "FunctionCall") return undefined;
  const [inside] = f.args;
  const trig =
    inside.type === "FunctionCall" &&
    (inside.callee.symbol === "sin" || inside.callee.symbol === "cos") &&
    isVariable(inside.args[0], variable)
      ? inside.callee.symbol
      : undefined;
  if (trig === undefined) return undefined;
  const half = isMultipleOfPi(upper, 0.5);
  const whole = isMultipleOfPi(upper, 1) && trig === "sin";
  if (!half && !whole) return undefined;
  return {
    node: negative(
      multiply(divide(id("pi"), number(half ? 2 : 1)), call("ln", number(2)))
    ),
    method:
      "∫₀^{π/2} ln sin x dx = ∫₀^{π/2} ln cos x dx = −(π/2) ln 2: adding the two gives the integral of ln(sin 2x / 2), which is the same integral again minus (π/2) ln 2.",
  };
};

const NAMED: Named[] = [
  powerOverLog,
  frullani,
  logOverSquare,
  dampedSine,
  logAffineCosine,
  logOneExp,
  logSine,
];

// ---- symmetry ----------------------------------------------------------------

function samplesIn(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= SAMPLES; i += 1) {
    // Irregular, so a period of the integrand cannot hide between them.
    const t = (i - 0.5 + 0.37 * Math.sin(i * 7.1)) / SAMPLES;
    out.push(a + (b - a) * Math.min(0.999, Math.max(0.001, t)));
  }
  return out;
}

function agreeAt(
  left: (x: number) => number,
  right: (x: number) => number,
  points: number[]
): boolean {
  let checked = 0;
  for (const x of points) {
    const l = left(x);
    const r = right(x);
    if (!Number.isFinite(l) || !Number.isFinite(r)) continue;
    if (Math.abs(l - r) > 1e-9 * Math.max(1, Math.abs(l), Math.abs(r)))
      return false;
    checked += 1;
  }
  return checked >= SAMPLES / 2;
}

/** ∫ of `g` over the bounds exactly, through an antiderivative. */
function exactly(
  g: Node,
  variable: string,
  lower: Bound,
  upper: Bound
): X.ExactValue | undefined {
  try {
    const result = definiteIntegral(
      g,
      integrate(g, variable),
      variable,
      lower,
      upper
    );
    return result.exact;
  } catch (error) {
    // No antiderivative, or a definite value refused: either way, not this.
    if (error instanceof IntegrationError || error instanceof Error)
      return undefined;
    throw error;
  }
}

function bySymmetry(
  f: Node,
  variable: string,
  lower: Bound,
  upper: Bound
): Omit<TheoremResult, "value"> | undefined {
  if (lower.kind !== "finite" || upper.kind !== "finite") return undefined;
  const a = lower.value;
  const b = upper.value;
  const reflected = fold(
    replaceIdentifier(
      f,
      variable,
      subtract(add(lower.node, upper.node), id(variable))
    )
  );
  const fx = (x: number) => evaluate(f, { [variable]: x });
  const fr = (x: number) => evaluate(reflected, { [variable]: x });
  const points = samplesIn(a, b);

  // Odd about the midpoint: f(a+b−x) = −f(x), so the integral is 0.
  if (agreeAt(fr, (x) => -fx(x), points)) {
    const symbolic = sameTree(reflected, fold(negative(f)));
    return {
      exact: X.ZERO,
      method: `The integrand is odd about the middle of the interval, f(${a + b === 0 ? "−x" : "a + b − x"}) = −f(x), so the two halves cancel.${symbolic ? "" : " The symmetry was checked at sample points, not proved."}`,
      proved: symbolic,
    };
  }

  const sum = fold(add(f, reflected));
  const h = (x: number) => fx(x) + fr(x);
  const half = (v: X.ExactValue) =>
    X.multiply(v, X.fromRational(Q.rational(1n, 2n)));

  // King's rule: f(x) + f(a+b−x) is a constant K, so the integral is K(b−a)/2.
  const values = points.map(h).filter(Number.isFinite);
  if (
    values.length >= SAMPLES / 2 &&
    values.every(
      (v) => Math.abs(v - values[0]) < 1e-9 * Math.max(1, Math.abs(v))
    )
  ) {
    for (const point of [
      lower.node,
      upper.node,
      divide(add(lower.node, upper.node), number(2)),
    ]) {
      const K = exactOf(replaceIdentifier(sum, variable, point));
      if (K === undefined || Math.abs(X.toNumber(K) - values[0]) > 1e-9)
        continue;
      const width = exactOf(subtract(upper.node, lower.node));
      if (width === undefined) break;
      return {
        exact: half(X.multiply(K, width)),
        method:
          "King's rule: f(x) + f(a + b − x) is the same constant K everywhere on the interval, and ∫ₐᵇ f = ½∫ₐᵇ (f(x) + f(a + b − x)) dx = K(b − a)/2. The sum was checked to be constant at sample points, not proved.",
        proved: false,
      };
    }
  }

  // f(x) + f(a+b−x) is something that integrates: the sum as folded, or the
  // numerator of f when f = N/(1 + k) with k(x)k(a+b−x) = 1.
  const candidates: Node[] = [];
  if (f.type === "BinaryOperator" && f.name === "Divide")
    candidates.push(f.left);
  candidates.push(sum);
  for (const candidate of candidates) {
    if (!agreeAt(h, (x) => evaluate(candidate, { [variable]: x }), points))
      continue;
    const whole = exactly(candidate, variable, lower, upper);
    if (whole === undefined) continue;
    const symbolic = sameTree(fold(candidate), sum);
    return {
      exact: half(whole),
      method: `Reflection: ∫ₐᵇ f(x) dx = ½∫ₐᵇ (f(x) + f(a + b − x)) dx, and that sum is a function with an antiderivative.${symbolic ? "" : " The sum was matched to it at sample points, not proved."}`,
      proved: symbolic,
    };
  }
  return undefined;
}

// ---- the whole thing ---------------------------------------------------------

/**
 * An exact value for `∫_lower^upper f` from a theorem about the interval, or
 * undefined. Checked numerically before it is returned.
 */
export function theoremDefinite(
  f: Node,
  variable: string,
  lower: Bound,
  upper: Bound
): TheoremResult | undefined {
  const integrand = fold(f);
  let found: Omit<TheoremResult, "value"> | undefined;
  for (const named of NAMED) {
    const hit = named(integrand, variable, lower, upper);
    if (hit === undefined) continue;
    const exact = exactOf(hit.node);
    if (exact === undefined) continue;
    found = { exact, method: hit.method, proved: true };
    break;
  }
  found ??= bySymmetry(integrand, variable, lower, upper);
  if (found === undefined) return undefined;
  const value = X.toNumber(found.exact);
  const a = at(lower);
  const b = at(upper);
  const numeric = quadrature(
    (x) => evaluate(integrand, { [variable]: x }),
    Math.min(a, b),
    Math.max(a, b)
  );
  if (numeric !== undefined) {
    const signed = a <= b ? numeric : -numeric;
    if (Math.abs(signed - value) > 1e-6 * Math.max(1, Math.abs(value)))
      return undefined;
  } else if (!found.proved) return undefined;
  return { ...found, value };
}
