/**
 * `|g|` in a definite integral, taken apart where `g` changes sign.
 *
 * `|x² − 3x + 2|` has no antiderivative the integrator writes down, because
 * the sign inside changes. But between 1 and 2 it is `−(x² − 3x + 2)`, and
 * outside them it is `x² − 3x + 2`, and each of those is a polynomial. So
 * `∫₀³` is cut at 1 and 2 and each piece integrated exactly.
 *
 * Only an inside that is a polynomial with rational coefficients is cut: its
 * roots are found exactly, by factoring over Q, as rationals or as
 * `(−b ± √D)/2` from a quadratic factor. A cut at a root known only as a
 * decimal would turn an exact answer into a guess, so anything else is
 * refused and left to numerical integration.
 */
import {
  add,
  call,
  dependsOn,
  divide,
  evaluate,
  fold,
  negative,
  number,
  power,
  replaceSubtree,
  visit,
  type Node,
} from "../../../symbolic";
import * as Q from "./rational";
import {
  definiteIntegral,
  quadrature,
  type Bound,
  type DefiniteResult,
} from "./definite";
import * as X from "./exact";
import { integrate } from "./integrate";
import { asQPoly } from "./expRational";
import { factorOverQ, type QPoly } from "./factor";
import { rationalNode } from "./field";

export interface AbsolutePiece {
  lower: Bound;
  upper: Bound;
  /** The integrand on this piece, with every `|g|` replaced by `±g`. */
  integrand: Node;
}

/** The real roots of one irreducible monic factor, as exact nodes. */
function rootsOf(factor: QPoly): Node[] | undefined {
  if (factor.length === 2) return [rationalNode(Q.negate(factor[0]))];
  if (factor.length !== 3) return undefined;
  // x² + bx + c, monic, irreducible over Q: roots (−b ± √D)/2 when D > 0.
  const [c, b] = factor;
  const D = Q.subtract(Q.multiply(b, b), Q.multiply(Q.rational(4n), c));
  if (!(D.n > 0n)) return [];
  const half = Q.rational(1n, 2n);
  const centre = rationalNode(Q.multiply(Q.negate(b), half));
  const spread = divide(power(rationalNode(D), rationalNode(half)), number(2));
  return [fold(add(centre, negative(spread))), fold(add(centre, spread))];
}

/**
 * The interval cut where each `|g|` changes sign, with `|g|` written as `g` or
 * `−g` on each piece; undefined when there is no `|g|` or one cannot be cut
 * exactly.
 */
export function splitAbsolute(
  integrand: Node,
  variable: string,
  lower: Bound,
  upper: Bound
): AbsolutePiece[] | undefined {
  const insides: Node[] = [];
  visit(integrand, (child) => {
    if (
      child.type === "FunctionCall" &&
      child.callee.symbol === "abs" &&
      child.args.length === 1 &&
      dependsOn(child.args[0], variable)
    )
      insides.push(child.args[0]);
  });
  if (insides.length === 0) return undefined;
  const a = lower.kind === "finite" ? lower.value : lower.sign * Infinity;
  const b = upper.kind === "finite" ? upper.value : upper.sign * Infinity;
  const [lo, hi] = a <= b ? [a, b] : [b, a];

  const cuts: { node: Node; value: number }[] = [];
  for (const inside of insides) {
    const poly = asQPoly(inside, variable);
    if (poly === undefined || poly.length < 2) return undefined;
    const factors = factorOverQ(poly);
    if (factors === undefined) return undefined;
    for (const factor of factors) {
      const roots = rootsOf(factor);
      if (roots === undefined) {
        // A cubic or higher factor with a root inside cannot be cut exactly.
        // One with no sign change inside does not need cutting at all.
        const f = (x: number) =>
          factor.reduce((s, q, i) => s + Q.toNumber(q) * x ** i, 0);
        const ends = [lo, hi].map((x) => (Number.isFinite(x) ? x : 1e6 * x));
        for (let i = 0; i < 400; i += 1) {
          const x = ends[0] + ((ends[1] - ends[0]) * i) / 400;
          const y = ends[0] + ((ends[1] - ends[0]) * (i + 1)) / 400;
          if (f(x) * f(y) <= 0) return undefined;
        }
        continue;
      }
      for (const node of roots) {
        const value = evaluate(node, {});
        if (!(value > lo && value < hi)) continue;
        if (cuts.some((cut) => Math.abs(cut.value - value) < 1e-12)) continue;
        cuts.push({ node, value });
      }
    }
  }
  cuts.sort((p, q) => p.value - q.value);

  const low = a <= b ? lower : upper;
  const high = a <= b ? upper : lower;
  const points: Bound[] = [
    low,
    ...cuts.map((cut): Bound => ({ kind: "finite", ...cut })),
    high,
  ];
  const at = (bound: Bound) =>
    bound.kind === "finite" ? bound.value : bound.sign * Infinity;
  const pieces: AbsolutePiece[] = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const p = at(points[i]);
    const q = at(points[i + 1]);
    const middle =
      Number.isFinite(p) && Number.isFinite(q)
        ? (p + q) / 2
        : Number.isFinite(p)
          ? p + 1
          : Number.isFinite(q)
            ? q - 1
            : 0;
    let body = integrand;
    for (const inside of insides) {
      const sign = evaluate(inside, { [variable]: middle });
      const replaced = sign >= 0 ? inside : negative(inside);
      body = replaceSubtree(body, call("abs", inside), replaced);
    }
    pieces.push({
      lower: a <= b ? points[i] : points[i + 1],
      upper: a <= b ? points[i + 1] : points[i],
      integrand: body,
    });
  }
  return a <= b ? pieces : pieces.reverse();
}

/**
 * `∫_lower^upper` of an integrand with `|g|` in it, exactly, piece by piece;
 * undefined when it cannot be cut or a piece cannot be integrated exactly.
 *
 * The sum is checked against a numerical integration of the original
 * integrand before it is believed, as every exact definite value is.
 */
export function absoluteDefinite(
  integrand: Node,
  variable: string,
  lower: Bound,
  upper: Bound
): DefiniteResult | undefined {
  const pieces = splitAbsolute(integrand, variable, lower, upper);
  if (pieces === undefined) return undefined;
  let exact = X.ZERO;
  let improper = false;
  try {
    for (const piece of pieces) {
      const result = definiteIntegral(
        piece.integrand,
        integrate(piece.integrand, variable),
        variable,
        piece.lower,
        piece.upper
      );
      if (result.exact === undefined) return undefined;
      exact = X.add(exact, result.exact);
      improper ||= result.improper;
    }
  } catch {
    return undefined;
  }
  const value = X.toNumber(exact);
  const f = (x: number) => evaluate(integrand, { [variable]: x });
  // Checked on each piece, where the integrand is smooth: across a kink the
  // tanh-sinh rule converges too slowly to settle.
  let check = 0;
  for (const piece of pieces) {
    const p =
      piece.lower.kind === "finite"
        ? piece.lower.value
        : piece.lower.sign * Infinity;
    const q =
      piece.upper.kind === "finite"
        ? piece.upper.value
        : piece.upper.sign * Infinity;
    const part = p <= q ? quadrature(f, p, q) : quadrature(f, q, p);
    if (part === undefined) return undefined;
    check += p <= q ? part : -part;
  }
  if (Math.abs(check - value) > 1e-6 * Math.max(1, Math.abs(value)))
    return undefined;
  return { exact, value, improper };
}
