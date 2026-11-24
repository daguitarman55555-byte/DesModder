/**
 * A trigonometric quotient that divides exactly, divided before anything
 * cleverer is tried.
 *
 * `cos 2x/(sin x + cos x)` is `cos x − sin x`, because
 * `cos 2x = cos²x − sin²x = (cos x − sin x)(cos x + sin x)`. Without this the
 * integrator reached it by the tangent half-angle substitution and answered
 * `2/(tan²(x/2)+1) + 2tan(x/2)/(tan²(x/2)+1)`: right, checked, and a page
 * long for what is `sin x + cos x` (UPGRADE_ROADMAP, integrals still refused).
 *
 * Numerator and denominator are read as polynomials in s = sin u and
 * c = cos u for one angle u, with sin 2u = 2sc and cos 2u = c² − s², and the
 * denominator is divided into the numerator exactly, with no use of
 * s² + c² = 1. A remainder means it does not divide, and nothing is done.
 */
import {
  add,
  call,
  constantValue,
  fold,
  multiply,
  number,
  power,
  quotientFactors,
  rationalNode,
  sameTree,
  visit,
  type Node,
} from "../../../symbolic";

/** Coefficients keyed by `${power of c},${power of s}`. */
type Poly = Map<string, number>;

const key = (c: number, s: number) => `${c},${s}`;
const parse = (k: string) => k.split(",").map(Number) as [number, number];

function plus(a: Poly, b: Poly, sign = 1): Poly {
  const out = new Map(a);
  for (const [k, v] of b) {
    const next = (out.get(k) ?? 0) + sign * v;
    if (Math.abs(next) < 1e-12) out.delete(k);
    else out.set(k, next);
  }
  return out;
}

function times(a: Poly, b: Poly): Poly {
  let out: Poly = new Map();
  for (const [ka, va] of a)
    for (const [kb, vb] of b) {
      const [ca, sa] = parse(ka);
      const [cb, sb] = parse(kb);
      out = plus(out, new Map([[key(ca + cb, sa + sb), va * vb]]));
    }
  return out;
}

const constantPoly = (v: number): Poly =>
  v === 0 ? new Map() : new Map([[key(0, 0), v]]);

/** Highest power of c first, then of s. */
function leading(p: Poly): [number, number, number] | undefined {
  let best: [number, number, number] | undefined;
  for (const [k, v] of p) {
    const [c, s] = parse(k);
    if (best === undefined || c > best[0] || (c === best[0] && s > best[1]))
      best = [c, s, v];
  }
  return best;
}

function divideExactly(n: Poly, d: Poly): Poly | undefined {
  const lead = leading(d);
  if (lead === undefined) return undefined;
  let rest = n;
  let quotient: Poly = new Map();
  for (let guard = 0; guard < 64 && rest.size > 0; guard++) {
    const top = leading(rest)!;
    const c = top[0] - lead[0];
    const s = top[1] - lead[1];
    if (c < 0 || s < 0) return undefined;
    const term: Poly = new Map([[key(c, s), top[2] / lead[2]]]);
    quotient = plus(quotient, term);
    rest = plus(rest, times(term, d), -1);
  }
  return rest.size === 0 ? quotient : undefined;
}

/** The node as a polynomial in sin u and cos u, or undefined. */
function toPoly(node: Node, u: Node): Poly | undefined {
  const value = constantValue(node);
  if (value !== undefined) return constantPoly(value);
  switch (node.type) {
    case "Negative": {
      const inner = toPoly(node.arg, u);
      return inner && plus(new Map(), inner, -1);
    }
    case "FunctionCall": {
      if (node.args.length !== 1) return undefined;
      const name = node.callee.symbol;
      if (name !== "sin" && name !== "cos") return undefined;
      const [arg] = node.args;
      const s: Poly = new Map([[key(0, 1), 1]]);
      const c: Poly = new Map([[key(1, 0), 1]]);
      if (sameTree(fold(arg), u)) return name === "sin" ? s : c;
      if (sameTree(fold(arg), fold(multiply(number(2), u))))
        return name === "sin"
          ? times(constantPoly(2), times(s, c))
          : plus(times(c, c), times(s, s), -1);
      return undefined;
    }
    case "BinaryOperator": {
      if (node.name === "Exponent") {
        const n = constantValue(node.right);
        if (n === undefined || !Number.isInteger(n) || n < 0 || n > 8)
          return undefined;
        const base = toPoly(node.left, u);
        if (base === undefined) return undefined;
        let out = constantPoly(1);
        for (let i = 0; i < n; i++) out = times(out, base);
        return out;
      }
      const left = toPoly(node.left, u);
      const right = toPoly(node.right, u);
      if (left === undefined || right === undefined) return undefined;
      if (node.name === "Add") return plus(left, right);
      if (node.name === "Subtract") return plus(left, right, -1);
      if (node.name === "Multiply" || node.name === "CrossMultiply")
        return times(left, right);
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * A coefficient as an exact fraction. Division by a leading coefficient of 2
 * gives 0.5, and an answer must never carry a decimal; every coefficient
 * here is a ratio of the small integers the input was written with.
 */
function exactCoefficient(v: number): Node | undefined {
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-12 * Math.max(1, Math.abs(v)))
      return rationalNode({ n, d });
  }
  return undefined;
}

function fromPoly(p: Poly, u: Node): Node | undefined {
  let out: Node = number(0);
  for (const [k, v] of p) {
    const [c, s] = parse(k);
    const coefficient = exactCoefficient(v);
    if (coefficient === undefined) return undefined;
    let term: Node = coefficient;
    if (c > 0)
      term = multiply(
        term,
        c === 1 ? call("cos", u) : power(call("cos", u), number(c))
      );
    if (s > 0)
      term = multiply(
        term,
        s === 1 ? call("sin", u) : power(call("sin", u), number(s))
      );
    out = add(out, term);
  }
  return fold(out);
}

/** The quotient divided out, or undefined if it does not divide exactly. */
export function cancelTrigQuotient(node: Node): Node | undefined {
  const factors: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(fold(node), true, factors);
  const below = factors.filter((f) => !f.inNumerator);
  if (below.length === 0) return undefined;
  // Every sine and cosine argument is a candidate for the base angle.
  const angles: Node[] = [];
  visit(node, (child) => {
    if (
      child.type === "FunctionCall" &&
      (child.callee.symbol === "sin" || child.callee.symbol === "cos") &&
      child.args.length === 1 &&
      !angles.some((a) => sameTree(a, fold(child.args[0])))
    )
      angles.push(fold(child.args[0]));
  });
  const product = (list: typeof factors) =>
    list.reduce<Node>((a, f) => multiply(a, f.node), number(1));
  for (const u of angles) {
    const n = toPoly(product(factors.filter((f) => f.inNumerator)), u);
    const d = toPoly(product(below), u);
    if (n === undefined || d === undefined) continue;
    // A constant denominator is not a quotient worth dividing.
    if (d.size === 1 && d.has(key(0, 0))) return undefined;
    const q = divideExactly(n, d);
    if (q !== undefined) return fromPoly(q, u);
  }
  return undefined;
}
