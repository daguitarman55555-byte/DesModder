/**
 * Exact definite integrals from theorems about the interval: the book of
 * integrals' F17–F24 exercises that have no antiderivative to evaluate.
 */
import { theoremDefinite } from "./definiteTheorems";
import type { Bound } from "./definite";
import { evaluate, type Node } from "../../../symbolic";
import { AugBuilders } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const x = id("x");
const pi = id("pi");
const add = (a: Node, b: Node) => binop("Add", a, b);
const sub = (a: Node, b: Node) => binop("Subtract", a, b);
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const div = (a: Node, b: Node) => binop("Divide", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const fn = (name: string, arg: Node) => functionCall(id(name), arg);
const neg = (a: Node): Node => ({ type: "Negative", arg: a });

const bound = (node: Node): Bound => ({
  kind: "finite",
  node,
  value: evaluate(node, {}),
});
const n = (v: number) => bound(number(v));
const INF: Bound = { kind: "infinite", sign: 1 };

function expectValue(
  f: Node,
  lower: Bound,
  upper: Bound,
  expected: number,
  proved?: boolean
) {
  const result = theoremDefinite(f, "x", lower, upper);
  expect(result).toBeDefined();
  expect(result!.value).toBeCloseTo(expected, 10);
  if (proved !== undefined) expect(result!.proved).toBe(proved);
  return result!;
}

describe("named results", () => {
  test("#417: (x² − x)/ln x on [0, 1] is ln(3/2)", () => {
    expectValue(
      div(sub(pow(x, number(2)), x), fn("ln", x)),
      n(0),
      n(1),
      Math.log(1.5),
      true
    );
  });

  test("#423: Frullani, (arctan 2x − arctan x)/x on [0, ∞) is (π/2) ln 2", () => {
    expectValue(
      div(sub(fn("arctan", mul(number(2), x)), fn("arctan", x)), x),
      n(0),
      INF,
      (Math.PI / 2) * Math.LN2,
      true
    );
  });

  test("#424: ln x/(x² + 1) on [0, ∞) is 0", () => {
    expectValue(
      div(fn("ln", x), add(pow(x, number(2)), number(1))),
      n(0),
      INF,
      0,
      true
    );
  });

  test("#425: e^{−x} sin x / x on [0, ∞) is π/4", () => {
    expectValue(
      mul(pow(id("e"), neg(x)), div(fn("sin", x), x)),
      n(0),
      INF,
      Math.PI / 4,
      true
    );
  });

  test("#426: ln(2 + cos x) on [0, π]", () => {
    expectValue(
      fn("ln", add(number(2), fn("cos", x))),
      n(0),
      bound(pi),
      Math.PI * Math.log((2 + Math.sqrt(3)) / 2),
      true
    );
  });

  test("ln(1 + e^{−x}) on [0, ∞) is π²/12", () => {
    expectValue(
      fn("ln", add(number(1), pow(id("e"), neg(x)))),
      n(0),
      INF,
      (Math.PI * Math.PI) / 12,
      true
    );
  });

  test("ln sin x on [0, π/2] is −(π/2) ln 2", () => {
    expectValue(
      fn("ln", fn("sin", x)),
      n(0),
      bound(div(pi, number(2))),
      (-Math.PI / 2) * Math.LN2,
      true
    );
  });
});

describe("symmetry", () => {
  test("#409: x√(x² + cos x) on [−1, 1] is odd, so 0", () => {
    expectValue(
      mul(x, fn("sqrt", add(pow(x, number(2)), fn("cos", x)))),
      n(-1),
      n(1),
      0,
      // Proved: x → −x folds to exactly −f, since (−x)² folds to x².
      true
    );
  });

  test("#258: King's rule, ln(1 + tan x) on [0, π/4] is (π/8) ln 2", () => {
    expectValue(
      fn("ln", add(number(1), fn("tan", x))),
      n(0),
      bound(div(pi, number(4))),
      (Math.PI / 8) * Math.LN2,
      false
    );
  });

  test("#329: cos x/(6ˣ + 1) on [−π/4, π/4] is √2/2", () => {
    expectValue(
      div(fn("cos", x), add(pow(number(6), x), number(1))),
      bound(neg(div(pi, number(4)))),
      bound(div(pi, number(4))),
      Math.SQRT1_2
    );
  });

  test("sin³/(sin³ + cos³) on [0, π/2] is π/4", () => {
    const s3 = pow(fn("sin", x), number(3));
    const c3 = pow(fn("cos", x), number(3));
    expectValue(
      div(s3, add(s3, c3)),
      n(0),
      bound(div(pi, number(2))),
      Math.PI / 4
    );
  });

  test("an integrand with no symmetry is left alone", () => {
    expect(
      theoremDefinite(pow(id("e"), pow(x, number(2))), "x", n(0), n(1))
    ).toBeUndefined();
  });
});
