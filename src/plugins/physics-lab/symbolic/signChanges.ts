/**
 * Where an expression changes sign, exactly, and when a root is of a square.
 *
 * Both questions come from bars. `∫|g|` needs every point where `g` changes
 * sign, written exactly, to join the pieces of its antiderivative; and
 * `√(g²)` is `|g|`, never `g`, which is the trap a printed answer key fell
 * into on `√(e^{2x} − 6eˣ + 9) = |eˣ − 3|`.
 *
 * Two shapes are read exactly: a polynomial with rational coefficients in the
 * variable, and a polynomial in one exponential `u = e^{cx}` (c rational).
 * Roots come from factoring over Q: rationals from linear factors and
 * `(−b ± √D)/2` from quadratic ones. A root of a cubic or higher factor is
 * not written down, and everything that needs it is refused.
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
  type Node,
} from "../../../symbolic";
import * as Q from "./rational";
import { asQPoly } from "./expRational";
import { factorOverQ, squarefree, type QPoly } from "./factor";
import { exactSquareRoot, rationalNode } from "./field";

/** A polynomial in `base`, where `base` is the variable or `e^{cx}`. */
export interface BasePolynomial {
  poly: QPoly;
  /** The variable itself, or `e^{cx}`. */
  base: Node;
  /** For an exponential base, c; undefined for the variable. */
  rate?: Q.Rational;
}

const PLACEHOLDER = "u_{sgn}";

function rateOf(node: Node, variable: string): Q.Rational | undefined {
  // k·x, x·k, x, or k·x/d: a rational multiple of the variable and nothing else.
  const at1 = evaluate(node, { [variable]: 1 });
  const at0 = evaluate(node, { [variable]: 0 });
  const at2 = evaluate(node, { [variable]: 2 });
  if (!Number.isFinite(at1) || at0 !== 0 || Math.abs(at2 - 2 * at1) > 1e-12)
    return undefined;
  return Q.fromNumber(at1);
}

function exponentials(
  node: Node,
  variable: string,
  out: { node: Node; rate: Q.Rational }[]
): boolean {
  if (
    node.type === "BinaryOperator" &&
    node.name === "Exponent" &&
    node.left.type === "Identifier" &&
    node.left.symbol === "e" &&
    dependsOn(node.right, variable)
  ) {
    const rate = rateOf(node.right, variable);
    if (rate === undefined || Q.isZero(rate)) return false;
    out.push({ node, rate });
    return true;
  }
  if (
    node.type === "FunctionCall" &&
    node.callee.symbol === "exp" &&
    node.args.length === 1
  ) {
    const rate = rateOf(node.args[0], variable);
    if (rate === undefined || Q.isZero(rate)) return false;
    out.push({ node, rate });
    return true;
  }
  switch (node.type) {
    case "BinaryOperator":
      return (
        exponentials(node.left, variable, out) &&
        exponentials(node.right, variable, out)
      );
    case "Negative":
      return exponentials(node.arg, variable, out);
    case "FunctionCall":
      return node.args.every((arg) => exponentials(arg, variable, out));
    default:
      return true;
  }
}

function rationalGcd(a: Q.Rational, b: Q.Rational): Q.Rational {
  const g = (x: bigint, y: bigint): bigint => {
    x = x < 0n ? -x : x;
    y = y < 0n ? -y : y;
    while (y !== 0n) [x, y] = [y, x % y];
    return x;
  };
  // gcd(p/q, r/s) = gcd(ps, rq)/(qs)
  return Q.rational(g(a.n * b.d, b.n * a.d), a.d * b.d);
}

/** Every node in `swaps` replaced, by identity, in one pass. */
function rewrite(node: Node, swaps: Map<Node, Node>): Node {
  const swapped = swaps.get(node);
  if (swapped !== undefined) return swapped;
  switch (node.type) {
    case "BinaryOperator":
      return {
        ...node,
        left: rewrite(node.left, swaps),
        right: rewrite(node.right, swaps),
      };
    case "Negative":
      return { ...node, arg: rewrite(node.arg, swaps) };
    case "FunctionCall":
      return { ...node, args: node.args.map((arg) => rewrite(arg, swaps)) };
    default:
      return node;
  }
}

/** `node` as a polynomial in the variable or in one exponential, or undefined. */
export function basePolynomial(
  node: Node,
  variable: string
): BasePolynomial | undefined {
  const plain = asQPoly(node, variable);
  if (plain !== undefined) return { poly: plain, base: id(variable) };
  const found: { node: Node; rate: Q.Rational }[] = [];
  if (!exponentials(node, variable, found) || found.length === 0)
    return undefined;
  // Negative rates are allowed only when every rate is negative, so that the
  // powers of u stay whole and non-negative: e^{−x} + e^{−2x} is u + u² in
  // u = e^{−x}.
  const negativeRates = found.filter((f) => Q.isNegative(f.rate)).length;
  if (negativeRates !== 0 && negativeRates !== found.length) return undefined;
  let [{ rate }] = found;
  for (const f of found.slice(1)) rate = rationalGcd(rate, f.rate);
  if (negativeRates > 0) rate = Q.negate(rate);
  const swaps = new Map<Node, Node>();
  for (const f of found) {
    const k = Q.divide(f.rate, rate);
    if (!Q.isInteger(k)) return undefined;
    swaps.set(f.node, power(id(PLACEHOLDER), number(Number(k.n))));
  }
  const rewritten = rewrite(node, swaps);
  if (dependsOn(rewritten, variable)) return undefined;
  const poly = asQPoly(fold(rewritten), PLACEHOLDER);
  if (poly === undefined) return undefined;
  const base = Q.isOne(rate)
    ? power(id("e"), id(variable))
    : power(id("e"), fold(multiply(rationalNode(rate), id(variable))));
  return { poly, base, rate };
}

/** `Σ cᵢ baseⁱ`, as a tree. */
export function polynomialNode(poly: QPoly, base: Node): Node {
  let out: Node = number(0);
  poly.forEach((c, i) => {
    if (Q.isZero(c)) return;
    const term =
      i === 0
        ? rationalNode(c)
        : multiply(rationalNode(c), i === 1 ? base : power(base, number(i)));
    out = add(out, term);
  });
  return fold(out);
}

/** The real roots of an irreducible monic factor, as exact trees. */
export function factorRoots(factor: QPoly): Node[] | undefined {
  if (factor.length === 2) return [rationalNode(Q.negate(factor[0]))];
  if (factor.length !== 3) return undefined;
  const [c, b] = factor;
  const D = Q.subtract(Q.multiply(b, b), Q.multiply(Q.rational(4n), c));
  if (!(D.n > 0n)) return [];
  const half = Q.rational(1n, 2n);
  const centre = rationalNode(Q.multiply(Q.negate(b), half));
  const spread = divide(power(rationalNode(D), rationalNode(half)), number(2));
  return [fold(add(centre, negative(spread))), fold(add(centre, spread))];
}

export interface SignChange {
  /** Where, exactly. */
  node: Node;
  value: number;
}

/**
 * Every point where `g` changes sign, exactly and in increasing order;
 * undefined when `g` is not a shape read here or a root cannot be written.
 * A root of even multiplicity is a touch, not a change, and is left out.
 */
export function exactSignChanges(
  g: Node,
  variable: string
): SignChange[] | undefined {
  const read = basePolynomial(g, variable);
  if (read === undefined || read.poly.length < 2) return undefined;
  const out: SignChange[] = [];
  for (const [layer, multiplicity] of squarefree(read.poly)) {
    if (multiplicity % 2 === 0) continue;
    const factors = factorOverQ(layer);
    if (factors === undefined) return undefined;
    for (const factor of factors) {
      const roots = factorRoots(factor);
      if (roots === undefined) return undefined;
      for (const root of roots) {
        let node = root;
        if (read.rate !== undefined) {
          // u = e^{cx} > 0, so only a positive u is a point on the real line.
          if (!(evaluate(root, {}) > 0)) continue;
          node = fold(divide(call("ln", root), rationalNode(read.rate)));
        }
        out.push({ node, value: evaluate(node, {}) });
      }
    }
  }
  return out.sort((a, b) => a.value - b.value);
}

/** `g` with `g² = radicand` exactly, or undefined. */
export function exactSquareRootOf(
  radicand: Node,
  variable: string
): Node | undefined {
  const read = basePolynomial(radicand, variable);
  if (read === undefined || read.poly.length < 3) return undefined;
  const layers = squarefree(read.poly);
  if (layers.some(([, m]) => m % 2 !== 0)) return undefined;
  let root: QPoly = [Q.ONE];
  for (const [layer, m] of layers)
    for (let i = 0; i < m / 2; i += 1) root = multiplyPoly(root, layer);
  // The leading coefficient: each layer is monic, so it is the polynomial's.
  const lead = read.poly[read.poly.length - 1];
  const scale = exactSquareRoot(lead);
  if (scale === undefined) return undefined;
  return polynomialNode(
    root.map((c) => Q.multiply(c, scale)),
    read.base
  );
}

function multiplyPoly(a: QPoly, b: QPoly): QPoly {
  const out = new Array<Q.Rational>(a.length + b.length - 1).fill(Q.ZERO);
  for (let i = 0; i < a.length; i += 1)
    for (let j = 0; j < b.length; j += 1)
      out[i + j] = Q.add(out[i + j], Q.multiply(a[i], b[j]));
  return out;
}

/**
 * Every `√(g²)` in the tree written `|g|`; the same tree when there is none.
 */
export function rootsOfSquares(node: Node, variable: string): Node {
  let changed = false;
  const visit = (child: Node): Node => {
    if (
      child.type === "FunctionCall" &&
      child.callee.symbol === "sqrt" &&
      child.args.length === 1 &&
      dependsOn(child.args[0], variable)
    ) {
      const g = exactSquareRootOf(child.args[0], variable);
      if (g !== undefined) {
        changed = true;
        return call("abs", g);
      }
    }
    switch (child.type) {
      case "BinaryOperator":
        return { ...child, left: visit(child.left), right: visit(child.right) };
      case "Negative":
        return { ...child, arg: visit(child.arg) };
      case "FunctionCall":
        return { ...child, args: child.args.map(visit) };
      default:
        return child;
    }
  };
  const out = visit(node);
  return changed ? out : node;
}
