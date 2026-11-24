/**
 * Powers of one base cancelled across a fraction bar, roots included.
 *
 * The quotient and chain rules leave the same base on both sides of a bar in
 * different spellings. Differentiating `x/(1+x²)^{3/2}` gives
 *
 *     ((1+x²)^{3/2} − 3x²√(1+x²)) / ((1+x²)^{3/2})²
 *
 * which is right and which nobody writes: the answer is
 * `(1−2x²)/(1+x²)^{5/2}`. `fold` cannot get there. It sees `√u` and `u^{3/2}`
 * as two unrelated bases, and it never takes a common factor out of a sum,
 * because in general that is a matter of taste (`condense` does it, on
 * request). Here it is not: the factor taken out is a power of a base that is
 * a root somewhere, and taking it out is what lets it cancel.
 *
 * So, for every product or quotient:
 *
 * 1. Each factor is read as `base^r` for a rational `r`: `√u` is `u^{1/2}`,
 *    `(√u)³` is `u^{3/2}`, and a factor with no exponent has `r = 1`.
 * 2. A sum among the factors gives up the smallest power of any base that
 *    every one of its terms has, when one of those powers is not a whole
 *    number. What is left is multiplied out if it is a polynomial in the
 *    base's own terms: `(1+x²) − 3x²` becomes `1 − 2x²`.
 * 3. Powers of the same base add, below the bar counting as negative, and
 *    each base is written once: `u` for 1, `√u` for ½, `u^{r}` otherwise,
 *    above the bar or below it by sign.
 *
 * ## Where the rewrite is exact
 *
 * `u^a·u^b = u^{a+b}` holds wherever both sides are defined, which is all a
 * real-valued answer needs. Composing powers is not always safe, and is only
 * done where it is: `(u^a)^b = u^{ab}` when `b` is whole, or when `u^a` already
 * says `u ≥ 0` (an even root), or when `a` has an odd numerator so `u^a` has
 * the sign of `u`. `√(u²)` is `|u|`, not `u`, and is left alone. Cancelling a
 * base removes the point where it is zero, the convention `fold` already
 * follows, and every answer is checked numerically against the original.
 *
 * The rewrite is only kept when it merged a base or took a factor out of a
 * sum. Otherwise the input comes back as it was, so a tidy answer is never
 * reshuffled into a different tidy answer.
 */
import { expand, tidySums } from "./expand";
import { fold } from "./fold";
import {
  binop,
  call,
  constantValue,
  exceedsNodeCount,
  mapChildNodes,
  nodeCount,
  number,
  quotientFactors,
  rationalNode,
  rationalOf,
  rebuildSum,
  sameTree,
  topLevelTerms,
  type Node,
} from "./tree";

interface Rational {
  n: number;
  d: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
function q(n: number, d = 1): Rational {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return { n: (sign * n) / g, d: Math.abs(d) / g };
}
const qAdd = (a: Rational, b: Rational) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const qSub = (a: Rational, b: Rational) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const qMul = (a: Rational, b: Rational) => q(a.n * b.n, a.d * b.d);
const qLess = (a: Rational, b: Rational) => a.n * b.d < b.n * a.d;
const isWhole = (a: Rational) => a.d === 1;

interface Power {
  base: Node;
  exponent: Rational;
}

/** Past this an expression is left as it is: the pass is quadratic in it. */
const SIZE_LIMIT = 400;

export function cancelPowers(node: Node): Node {
  if (exceedsNodeCount(node, SIZE_LIMIT)) return node;
  return rewrite(node);
}

function rewrite(node: Node): Node {
  const inner = mapChildNodes(node, rewrite);
  if (
    inner.type === "BinaryOperator" &&
    (inner.name === "Multiply" || inner.name === "Divide")
  )
    return cancelInProduct(inner) ?? inner;
  if (
    inner.type === "BinaryOperator" &&
    (inner.name === "Add" || inner.name === "Subtract")
  ) {
    const pulled = pullOutOfSum(inner);
    if (pulled !== undefined)
      return cancelInProduct(pulled) ?? normalized(pulled);
  }
  return inner;
}

/** A product with each power on its side of the bar: u^{-1/2}v as v/√u. */
function normalized(node: Node): Node {
  const entries: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, entries);
  const { powers, constants } = collect(entries);
  return rebuild(powers, constants);
}

/** A factor as `base^r`, seeing through roots and rational powers. */
function asPower(node: Node): Power {
  if (
    node.type === "FunctionCall" &&
    node.callee.symbol === "sqrt" &&
    node.args.length === 1
  )
    return compose(asPower(node.args[0]), q(1, 2));
  if (node.type === "BinaryOperator" && node.name === "Exponent") {
    const r = rationalOf(node.right);
    if (r !== undefined && r.d !== 0 && constantValue(node.left) === undefined)
      return compose(asPower(node.left), q(r.n, r.d));
  }
  return { base: node, exponent: q(1) };
}

/** `(u^a)^b`, as `u^{ab}` only where that is the same function. */
function compose(inner: Power, b: Rational): Power {
  const a = inner.exponent;
  const safe = isWhole(b) || a.d % 2 === 0 || Math.abs(a.n) % 2 === 1;
  if (safe) return { base: inner.base, exponent: qMul(a, b) };
  return { base: written(inner), exponent: b };
}

/** A power written as Desmos writes it. */
function written({ base, exponent }: Power): Node {
  if (exponent.n === 0) return number(1);
  if (exponent.n === 1 && exponent.d === 1) return base;
  if (exponent.n === 1 && exponent.d === 2) return call("sqrt", base);
  return binop("Exponent", base, rationalNode(exponent));
}

interface Collected {
  powers: Power[];
  /** Constants, kept apart so fold can do the arithmetic. */
  constants: { node: Node; inNumerator: boolean }[];
  merged: boolean;
}

function collect(
  entries: readonly { node: Node; inNumerator: boolean }[]
): Collected {
  const powers: Power[] = [];
  const constants: { node: Node; inNumerator: boolean }[] = [];
  let merged = false;
  for (const { node, inNumerator } of entries) {
    if (constantValue(node) !== undefined) {
      constants.push({ node, inNumerator });
      continue;
    }
    const power = asPower(node);
    const exponent = inNumerator
      ? power.exponent
      : q(-power.exponent.n, power.exponent.d);
    const at = powers.findIndex((p) => sameTree(p.base, power.base));
    if (at >= 0) {
      powers[at] = {
        base: powers[at].base,
        exponent: qAdd(powers[at].exponent, exponent),
      };
      merged = true;
    } else powers.push({ base: power.base, exponent });
  }
  return { powers, constants, merged };
}

function cancelInProduct(node: Node): Node | undefined {
  const entries: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(node, true, entries);
  if (entries.length < 2) return undefined;
  // A sum among the factors may give up a power that then cancels.
  let pulled = false;
  const opened: { node: Node; inNumerator: boolean }[] = [];
  for (const entry of entries) {
    const out = isSum(entry.node) ? pullOutOfSum(entry.node) : undefined;
    if (out === undefined) {
      opened.push(entry);
      continue;
    }
    pulled = true;
    quotientFactors(out, entry.inNumerator, opened);
  }
  const { powers, constants, merged } = collect(opened);
  if (!merged && !pulled) return undefined;
  return rebuild(powers, constants);
}

function rebuild(
  powers: readonly Power[],
  constants: readonly { node: Node; inNumerator: boolean }[]
): Node {
  const top: Node[] = [];
  const bottom: Node[] = [];
  for (const { node, inNumerator } of constants)
    (inNumerator ? top : bottom).push(node);
  // A plain variable and its powers before anything compound, as written by
  // hand: 3x√(x²+1), not 3√(x²+1)x. Stable, so nothing else moves.
  const simple = (p: Power) => (p.base.type === "Identifier" ? 0 : 1);
  const ordered = [...powers].sort((a, b) => simple(a) - simple(b));
  for (const power of ordered) {
    if (power.exponent.n === 0) continue;
    if (power.exponent.n > 0) top.push(written(power));
    else
      bottom.push(
        written({
          base: power.base,
          exponent: q(-power.exponent.n, power.exponent.d),
        })
      );
  }
  const product = (factors: Node[]): Node =>
    factors.length === 0
      ? number(1)
      : factors.reduce((a, b) => binop("Multiply", a, b));
  const result =
    bottom.length === 0
      ? product(top)
      : binop("Divide", product(top), product(bottom));
  return fold(result);
}

const isSum = (node: Node) =>
  node.type === "BinaryOperator" &&
  (node.name === "Add" || node.name === "Subtract");

/**
 * A sum with a root-like base in every term, as that base's smallest power
 * times what is left: `u^{3/2} − 3x²√u` is `√u·(u − 3x²)`.
 */
function pullOutOfSum(sum: Node): Node | undefined {
  const terms = topLevelTerms(sum);
  if (terms.length < 2) return undefined;
  const read = terms.map(({ term, negated }) => {
    const entries: { node: Node; inNumerator: boolean }[] = [];
    quotientFactors(term, true, entries);
    return { ...collect(entries), negated };
  });
  for (const candidate of read[0].powers) {
    const exponents: Rational[] = [];
    for (const term of read) {
      const match = term.powers.find((p) => sameTree(p.base, candidate.base));
      if (match === undefined) break;
      exponents.push(match.exponent);
    }
    if (exponents.length !== read.length) continue;
    if (exponents.every(isWhole)) continue;
    const least = exponents.reduce((a, b) => (qLess(b, a) ? b : a));
    const rest = read.map((term, i) => ({
      value: rebuild(
        term.powers.map((p) =>
          sameTree(p.base, candidate.base)
            ? { base: p.base, exponent: qSub(exponents[i], least) }
            : p
        ),
        term.constants
      ),
      negated: term.negated,
    }));
    let left = fold(rebuildSum(rest));
    // Multiplied out and collected when that is shorter: (1+x²) − 3x² is
    // 1 − 2x², and (x²+1) − x² is 1.
    const flat = fold(tidySums(expand(left).node));
    if (nodeCount(flat) <= nodeCount(left)) left = flat;
    return binop(
      "Multiply",
      written({ base: candidate.base, exponent: least }),
      left
    );
  }
  return undefined;
}
