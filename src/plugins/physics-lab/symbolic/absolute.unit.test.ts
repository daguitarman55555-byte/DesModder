/**
 * |g| in a definite integral, cut exactly where g changes sign.
 */
import { absoluteDefinite, splitAbsolute } from "./absolute";
import { integrate } from "./integrate";
import { definiteIntegral, type Bound } from "./definite";
import * as X from "./exact";
import type { Node } from "../../../symbolic";
import { AugBuilders } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const x = id("x");
const add = (a: Node, b: Node) => binop("Add", a, b);
const sub = (a: Node, b: Node) => binop("Subtract", a, b);
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const abs = (a: Node) => functionCall(id("abs"), a);
const n = (value: number): Bound => ({
  kind: "finite",
  node: number(value),
  value,
});

/** The pieces integrated exactly and added up. */
function total(integrand: Node, lower: Bound, upper: Bound) {
  const pieces = splitAbsolute(integrand, "x", lower, upper);
  expect(pieces).toBeDefined();
  let sum = X.ZERO;
  for (const piece of pieces!) {
    const F = integrate(piece.integrand, "x");
    const result = definiteIntegral(
      piece.integrand,
      F,
      "x",
      piece.lower,
      piece.upper
    );
    sum = X.add(sum, result.exact!);
  }
  return { pieces: pieces!, sum };
}

const quadratic = add(sub(pow(x, number(2)), mul(number(3), x)), number(2));

describe("cutting |g| where g changes sign", () => {
  test("|x² − 3x + 2| on [0, 3] is 11/6, in three pieces", () => {
    const { pieces, sum } = total(abs(quadratic), n(0), n(3));
    expect(pieces).toHaveLength(3);
    expect(X.toLatex(sum)).toBe("\\frac{11}{6}");
  });

  test("bounds the other way round give the negative", () => {
    const { sum } = total(abs(quadratic), n(3), n(0));
    expect(X.toLatex(sum)).toBe("-\\frac{11}{6}");
  });

  test("an interval with no root inside is one piece", () => {
    const { pieces, sum } = total(abs(quadratic), n(3), n(4));
    expect(pieces).toHaveLength(1);
    expect(X.toNumber(sum)).toBeCloseTo(64 / 3 - 24 + 8 - (9 - 13.5 + 6), 12);
  });

  test("an irrational root, from a quadratic factor", () => {
    // x² − 2 changes sign at √2.
    const { pieces, sum } = total(
      abs(sub(pow(x, number(2)), number(2))),
      n(0),
      n(2)
    );
    expect(pieces).toHaveLength(2);
    // ∫₀^√2 (2 − x²) + ∫_√2^2 (x² − 2) = (8√2 − 4)/3
    expect(X.toNumber(sum)).toBeCloseTo((8 * Math.SQRT2 - 4) / 3, 12);
  });

  test("an inside that is not a polynomial is not cut", () => {
    const inside = sub(functionCall(id("sin"), x), number(0.5));
    expect(splitAbsolute(abs(inside), "x", n(0), n(3))).toBeUndefined();
  });

  test("no |g| at all is not this module's business", () => {
    expect(splitAbsolute(quadratic, "x", n(0), n(3))).toBeUndefined();
  });
});

describe("the checked exact value", () => {
  test("|x² − 3x + 2| on [0, 3]", () => {
    const result = absoluteDefinite(abs(quadratic), "x", n(0), n(3));
    expect(X.toLatex(result!.exact!)).toBe("\\frac{11}{6}");
  });
});
