/**
 * Definite integrals: exact values at the bounds, limits where a bound is an
 * infinity or a singularity, and the refusals that keep a wrong subtraction
 * off the screen.
 */
import { integrate } from "./integrate";
import { definiteIntegral, DefiniteError, type Bound } from "./definite";
import * as X from "./exact";
import type { Node } from "../../../symbolic";
import { AugBuilders } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const x = id("x");
const e = id("e");
const pi = id("pi");
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const div = (a: Node, b: Node) => binop("Divide", a, b);
const add = (a: Node, b: Node) => binop("Add", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const fn = (name: string, arg: Node) => functionCall(id(name), arg);
const neg = (a: Node): Node => ({ type: "Negative", arg: a });

const finite = (node: Node, value: number): Bound => ({
  kind: "finite",
  node,
  value,
});
const n = (value: number) => finite(number(value), value);
const infinity: Bound = { kind: "infinite", sign: 1 };

function definite(integrand: Node, lower: Bound, upper: Bound) {
  return definiteIntegral(
    integrand,
    integrate(integrand, "x"),
    "x",
    lower,
    upper
  );
}

function exactly(
  integrand: Node,
  lower: Bound,
  upper: Bound,
  expected: string
) {
  const result = definite(integrand, lower, upper);
  expect(result.exact).toBeDefined();
  expect(X.toLatex(result.exact!)).toBe(expected);
  return result;
}

describe("exact values at the bounds", () => {
  test("a rational", () => {
    exactly(pow(x, number(2)), n(0), n(1), "\\frac{1}{3}");
  });

  test("an odd integrand on a symmetric interval folds to 0", () => {
    // Its antiderivative is even, but in sin(−1) and cos(−1), which used to be
    // atoms of their own: the 0 printed as 3cos(−1) + −(3cos 1) + ….
    exactly(mul(pow(x, number(3)), fn("cos", x)), n(-1), n(1), "0");
  });

  test("sin(−2) is −sin 2, so the two bounds combine", () => {
    const result = definite(fn("cos", x), n(-2), n(2));
    const single = X.atomsOf(result.exact!);
    expect(single?.factors.size).toBe(1);
    expect(single?.coeff).toEqual({ n: 2n, d: 1n });
    expect(result.value).toBeCloseTo(2 * Math.sin(2), 12);
  });

  test("an arctangent at 1 is a quarter of pi", () => {
    exactly(
      div(number(1), add(pow(x, number(2)), number(1))),
      n(0),
      n(1),
      "\\frac{\\pi}{4}"
    );
  });

  test("a sine between multiples of pi", () => {
    exactly(fn("sin", x), n(0), finite(pi, Math.PI), "2");
  });

  test("a logarithm of a rational, as logarithms of primes", () => {
    exactly(
      div(x, add(pow(x, number(2)), number(1))),
      n(0),
      n(1),
      "\\frac{\\ln\\left(2\\right)}{2}"
    );
    exactly(div(number(1), x), n(1), finite(e, Math.E), "1");
  });

  test("a half-angle square, to a quarter of pi", () => {
    exactly(
      pow(fn("sin", x), number(2)),
      n(0),
      finite(div(pi, number(2)), Math.PI / 2),
      "\\frac{\\pi}{4}"
    );
  });

  test("reversed bounds change the sign", () => {
    exactly(pow(x, number(2)), n(1), n(0), "-\\frac{1}{3}");
  });
});

describe("improper integrals, as limits", () => {
  test("to infinity, through an exponential that vanishes", () => {
    const result = exactly(pow(e, neg(x)), n(0), infinity, "1");
    expect(result.improper).toBe(true);
    exactly(mul(x, pow(e, neg(x))), n(0), infinity, "1");
  });

  test("to infinity, through a power and an arctangent", () => {
    exactly(div(number(1), pow(x, number(2))), n(1), infinity, "1");
    exactly(
      div(number(1), add(pow(x, number(2)), number(1))),
      n(0),
      infinity,
      "\\frac{\\pi}{2}"
    );
  });

  test("at a singular endpoint", () => {
    const result = exactly(div(number(1), fn("sqrt", x)), n(0), n(1), "2");
    expect(result.improper).toBe(true);
    // x ln x - x at zero: a power beats a logarithm.
    exactly(fn("ln", x), n(0), n(1), "-1");
  });

  test("a divergent one says so", () => {
    expect(definite(div(number(1), x), n(1), infinity).diverges).toBe(1);
  });
});

describe("breaks inside the interval, located exactly", () => {
  test("a pole inside the interval makes the integral diverge", () => {
    // 1/x^2 across zero: the pieces either side each run to +infinity.
    expect(
      definite(div(number(1), pow(x, number(2))), n(-1), n(1)).diverges
    ).toBe(1);
    // 1/x across zero: -infinity on one side, +infinity on the other, so
    // there is no value and no sign.
    expect(definite(div(number(1), x), n(-1), n(1)).diverges).toBe(0);
  });

  test("an antiderivative that jumps is crossed, not subtracted", () => {
    // tan(x/2) leaps at pi; cutting there and taking one-sided limits gives
    // the true 2pi/sqrt 3, where F(2pi) - F(0) would give 0.
    exactly(
      div(number(1), add(number(2), fn("sin", x))),
      n(0),
      finite(mul(number(2), pi), 2 * Math.PI),
      "\\frac{2\\pi\\sqrt{3}}{3}"
    );
  });
});

describe("step functions and |sin|, whose antiderivatives count", () => {
  // Each antiderivative is continuous, so F(b) − F(a) is right as it stands;
  // the cells are cut at every step and corner only so that the quadrature
  // confirming each one integrates something smooth.
  test("floor and ceil", () => {
    exactly(fn("floor", x), n(0), n(5.5), "\\frac{25}{2}");
    exactly(fn("floor", x), n(0), n(3), "3");
    exactly(fn("ceil", mul(number(2), x)), n(-1), n(2.5), "7");
  });

  test("|sin| and |cos|, a hump of 2 every π", () => {
    const twoPi = finite(mul(number(2), pi), 2 * Math.PI);
    exactly(fn("abs", fn("cos", x)), n(0), twoPi, "4");
    exactly(
      fn("abs", fn("sin", mul(number(3), x))),
      n(0),
      finite(pi, Math.PI),
      "2"
    );
    // Not a whole number of humps: three, and part of a fourth.
    const result = definite(fn("abs", fn("sin", x)), n(0), n(10));
    expect(result.value).toBeCloseTo(7 - Math.cos(10 - 3 * Math.PI), 12);
  });
});

describe("what it refuses rather than getting wrong", () => {
  test("a symbolic parameter", () => {
    expect(() =>
      definite(
        div(number(1), add(pow(x, number(2)), pow(id("a"), number(2)))),
        n(0),
        n(1)
      )
    ).toThrow(DefiniteError);
  });
});
