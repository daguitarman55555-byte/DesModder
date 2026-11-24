/**
 * Three integrand shapes that no general rule reaches, each with the one move
 * that clears it. All three hand back an antiderivative that the integrator's
 * callers then check by differentiating back, as they check every answer.
 *
 * - A root in a two-term denominator, multiplied by its conjugate:
 *   1/(√(x+1) + √x) is √(x+1) − √x.
 * - The reciprocal quartic, (x² − c)/((x² + c)√(x⁴ + bx² + c²)), for which
 *   u = √(x⁴ + bx² + c²)/x turns the whole into du/(u² + 2c − b).
 * - A product rule run backwards, e^{ax}(aH + H′) = (e^{ax}H)′, with H one of
 *   the terms of what multiplies the exponential.
 */
import {
  add,
  agreesOnSamples,
  call,
  collectLikeTerms,
  dependsOn,
  differentiate,
  divide,
  evaluate,
  expand,
  fold,
  id,
  multiply,
  negative,
  number,
  power,
  quotientFactors,
  subtract,
  topLevelTerms,
  visit,
  type Node,
} from "../../../symbolic";
import * as Q from "./rational";
import { asQPoly } from "./expRational";
import { rationalNode } from "./field";

const SAMPLES = [0.37, 0.81, 1.23, 1.94, 2.71, -0.58, -1.37];

function hasRoot(node: Node, variable: string): boolean {
  let found = false;
  visit(node, (child) => {
    if (
      child.type === "FunctionCall" &&
      child.callee.symbol === "sqrt" &&
      dependsOn(child, variable)
    )
      found = true;
  });
  return found;
}

/**
 * `N/(A ± B)` with a root in it, as `N(A ∓ B)/(A² − B²)` when that clears
 * every root from the denominator; undefined otherwise.
 */
export function byConjugate(node: Node, variable: string): Node | undefined {
  if (node.type !== "BinaryOperator" || node.name !== "Divide")
    return undefined;
  const terms = topLevelTerms(node.right);
  if (terms.length !== 2 || !hasRoot(node.right, variable)) return undefined;
  const [first, second] = terms.map(({ term, negated }) =>
    negated ? negative(term) : term
  );
  const square = fold(
    collectLikeTerms(
      expand(subtract(power(first, number(2)), power(second, number(2)))).node
    )
  );
  if (hasRoot(square, variable)) return undefined;
  const value = evaluate(square, { [variable]: SAMPLES[0] });
  if (!Number.isFinite(value) || value === 0) return undefined;
  return fold(divide(multiply(node.left, subtract(first, second)), square));
}

/**
 * `k/(x√(ax² + bx))`, a root of a quadratic with no constant term over x:
 * `−2k√(ax² + bx)/(bx)`. Differentiating `√Q/x` gives
 * `(xQ′ − 2Q)/(2x²√Q) = −b/(2x√Q)`, which is the whole proof. Without it
 * `1/(x√(x²+2x))` came back through completing the square and a half-angle
 * substitution as `−1/tan(arccos(1/(x+1))/2)`: right, and not `−√(x²+2x)/x`
 * (UPGRADE_ROADMAP, integrals still refused).
 */
export function reciprocalXRoot(
  node: Node,
  variable: string
): Node | undefined {
  const factors: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, factors);
  const top = factors.filter((f) => f.inNumerator);
  const bottom = factors.filter((f) => !f.inNumerator);
  if (bottom.length !== 2) return undefined;
  if (top.some((f) => dependsOn(f.node, variable))) return undefined;
  const root = bottom.find(
    (f) =>
      f.node.type === "FunctionCall" &&
      f.node.callee.symbol === "sqrt" &&
      f.node.args.length === 1
  );
  const other = bottom.find((f) => f !== root);
  if (root === undefined || other === undefined) return undefined;
  if (root.node.type !== "FunctionCall") return undefined;
  if (other.node.type !== "Identifier" || other.node.symbol !== variable)
    return undefined;
  const quadratic = asQPoly(root.node.args[0], variable);
  if (
    quadratic === undefined ||
    quadratic.length !== 3 ||
    !Q.isZero(quadratic[0]) ||
    Q.isZero(quadratic[1])
  )
    return undefined;
  const k = top.reduce<Node>((a, f) => multiply(a, f.node), number(1));
  // −2/b as one exact fraction, so the sign lands on the coefficient.
  const coefficient = rationalNode(Q.divide(Q.rational(-2n), quadratic[1]));
  return fold(
    divide(multiply(multiply(coefficient, k), root.node), id(variable))
  );
}

/**
 * `(x² − c)/((x² + c)√(x⁴ + bx² + c²))` integrated through
 * `u = √(x⁴ + bx² + c²)/x`, for rational `b` and `c > 0`; undefined for any
 * other shape. Valid on each side of 0, where u has its pole.
 */
export function reciprocalQuartic(
  node: Node,
  variable: string
): Node | undefined {
  const factors: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, factors);
  const top = factors.filter((f) => f.inNumerator);
  const bottom = factors.filter((f) => !f.inNumerator);
  if (top.length !== 1 || bottom.length !== 2) return undefined;
  const root = bottom.find(
    (f) => f.node.type === "FunctionCall" && f.node.callee.symbol === "sqrt"
  );
  const other = bottom.find((f) => f !== root);
  if (root === undefined || other === undefined) return undefined;
  if (root.node.type !== "FunctionCall") return undefined;
  const numerator = asQPoly(top[0].node, variable);
  const plus = asQPoly(other.node, variable);
  const quartic = asQPoly(root.node.args[0], variable);
  if (numerator === undefined || plus === undefined || quartic === undefined)
    return undefined;
  // x² − c over x² + c: degree 2, no x term, monic, opposite constants.
  const shape = (p: Q.Rational[]) =>
    p.length === 3 && Q.isZero(p[1]) && Q.isOne(p[2]);
  if (!shape(numerator) || !shape(plus)) return undefined;
  const [c] = plus;
  if (!Q.equals(numerator[0], Q.negate(c)) || !(c.n > 0n)) return undefined;
  // x⁴ + bx² + c²
  if (
    quartic.length !== 5 ||
    !Q.isZero(quartic[1]) ||
    !Q.isZero(quartic[3]) ||
    !Q.isOne(quartic[4]) ||
    !Q.equals(quartic[0], Q.multiply(c, c))
  )
    return undefined;
  const [, , b] = quartic;
  const k = Q.subtract(Q.multiply(Q.rational(2n), c), b);
  const u = divide(root.node, id(variable));
  const half = rationalNode(Q.rational(1n, 2n));
  if (Q.isZero(k)) return fold(negative(divide(number(1), u)));
  const m = power(rationalNode(Q.isNegative(k) ? Q.negate(k) : k), half);
  if (!Q.isNegative(k))
    // ∫du/(u² + m²) = arctan(u/m)/m
    return fold(divide(call("arctan", divide(u, m)), m));
  // ∫du/(u² − m²) = ln|(u − m)/(u + m)|/(2m)
  return fold(
    divide(
      call("ln", call("abs", divide(subtract(u, m), add(u, m)))),
      multiply(number(2), m)
    )
  );
}

/** `e^{ax}` among the factors, with `a`, and what multiplies it. */
function exponentialFactor(
  node: Node,
  variable: string
): { rate: number; rateNode: Node; rest: Node } | undefined {
  const factors: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, factors);
  const index = factors.findIndex(
    (f) =>
      f.inNumerator &&
      f.node.type === "BinaryOperator" &&
      f.node.name === "Exponent" &&
      f.node.left.type === "Identifier" &&
      f.node.left.symbol === "e" &&
      dependsOn(f.node.right, variable)
  );
  if (index < 0) return undefined;
  const exponent = factors[index].node;
  if (exponent.type !== "BinaryOperator") return undefined;
  const rate = evaluate(exponent.right, { [variable]: 1 });
  const at0 = evaluate(exponent.right, { [variable]: 0 });
  if (!Number.isFinite(rate) || at0 !== 0 || rate === 0) return undefined;
  const q = Q.fromNumber(rate);
  if (q === undefined) return undefined;
  let top: Node = number(1);
  let below: Node = number(1);
  factors.forEach((f, i) => {
    if (i === index) return;
    if (f.inNumerator) top = multiply(top, f.node);
    else below = multiply(below, f.node);
  });
  return { rate, rateNode: rationalNode(q), rest: fold(divide(top, below)) };
}

/**
 * `e^{ax}·g` with `g = aH + H′` for `H` a term of `g` divided by `a`; the
 * antiderivative is `e^{ax}H`. Undefined when no term works.
 */
export function reversedProductRule(
  node: Node,
  variable: string
): Node | undefined {
  const found = exponentialFactor(node, variable);
  if (found === undefined) return undefined;
  const { rate, rateNode, rest } = found;
  // The terms of g, or of its numerator over a shared denominator.
  const candidates: Node[] = [];
  const pushTerms = (sum: Node, over?: Node) => {
    for (const { term, negated } of topLevelTerms(sum)) {
      const signed = negated ? negative(term) : term;
      candidates.push(over === undefined ? signed : divide(signed, over));
    }
  };
  pushTerms(rest);
  if (rest.type === "BinaryOperator" && rest.name === "Divide")
    pushTerms(expand(rest.left).node, rest.right);
  const bindings = SAMPLES.map((x) => ({ [variable]: x }));
  for (const term of candidates) {
    if (!dependsOn(term, variable)) continue;
    const H = fold(divide(term, rateNode));
    let dH: Node;
    try {
      dH = differentiate(H, variable);
    } catch {
      continue;
    }
    const works = agreesOnSamples(
      (b) => rate * evaluate(H, b) + evaluate(dH, b),
      (b) => evaluate(rest, b),
      bindings,
      1e-9
    );
    if (works) {
      const exponential = factorsExponential(node, variable);
      if (exponential !== undefined) return fold(multiply(exponential, H));
    }
  }
  return undefined;
}

function factorsExponential(node: Node, variable: string): Node | undefined {
  const factors: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, factors);
  return factors.find(
    (f) =>
      f.inNumerator &&
      f.node.type === "BinaryOperator" &&
      f.node.name === "Exponent" &&
      f.node.left.type === "Identifier" &&
      f.node.left.symbol === "e" &&
      dependsOn(f.node.right, variable)
  )?.node;
}
