/**
 * √(g²) = |g|, and |g| integrated across every point where g changes sign,
 * from the book of integrals' traps (#31, #52, #380).
 */
import { exactSignChanges, exactSquareRootOf } from "./signChanges";
import { integrate } from "./integrate";
import { evaluate, numericDerivative, type Node } from "../../../symbolic";
import { AugBuilders } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const x = id("x");
const e = id("e");
const add = (a: Node, b: Node) => binop("Add", a, b);
const sub = (a: Node, b: Node) => binop("Subtract", a, b);
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const fn = (name: string, arg: Node) => functionCall(id(name), arg);
const ex = (k: number) => pow(e, k === 1 ? x : mul(number(k), x));

/**
 * The derivative matches the integrand away from the corners, and the
 * antiderivative has no jump at any of them.
 */
function isContinuousAntiderivative(
  integrand: Node,
  corners: number[],
  samples: number[]
) {
  const F = integrate(integrand, "x");
  for (const s of samples) {
    const d = numericDerivative(F, "x", { x: s });
    const f = evaluate(integrand, { x: s });
    expect(Math.abs(d - f)).toBeLessThan(1e-5 * Math.max(1, Math.abs(f)));
  }
  for (const c of corners) {
    const left = evaluate(F, { x: c - 1e-7 });
    const right = evaluate(F, { x: c + 1e-7 });
    expect(Math.abs(left - right)).toBeLessThan(1e-5);
  }
  return F;
}

describe("where a sign changes, exactly", () => {
  test("a quadratic with rational roots", () => {
    const g = add(sub(pow(x, number(2)), mul(number(3), x)), number(2));
    expect(exactSignChanges(g, "x")?.map((c) => c.value)).toEqual([1, 2]);
  });

  test("a polynomial in eˣ: eˣ − 3 changes sign at ln 3", () => {
    const changes = exactSignChanges(sub(ex(1), number(3)), "x");
    expect(changes).toHaveLength(1);
    expect(changes![0].value).toBeCloseTo(Math.log(3), 14);
  });

  test("a double root touches without changing sign", () => {
    expect(exactSignChanges(pow(sub(x, number(1)), number(2)), "x")).toEqual(
      []
    );
  });
});

describe("√(g²) is |g|", () => {
  test("e^{2x} − 6eˣ + 9 is (eˣ − 3)²", () => {
    const radicand = add(sub(ex(2), mul(number(6), ex(1))), number(9));
    const g = exactSquareRootOf(radicand, "x")!;
    for (const s of [-1, 0.5, 2])
      expect(Math.abs(evaluate(g, { x: s }))).toBeCloseTo(
        Math.abs(Math.exp(s) - 3),
        12
      );
  });

  test("x(x+1)(x+2)(x+3) + 1 is (x² + 3x + 1)²", () => {
    const product = mul(
      mul(x, add(x, number(1))),
      mul(add(x, number(2)), add(x, number(3)))
    );
    const g = exactSquareRootOf(add(product, number(1)), "x")!;
    expect(Math.abs(evaluate(g, { x: 0.7 }))).toBeCloseTo(0.49 + 2.1 + 1, 12);
  });

  test("a radicand that is not a square is left alone", () => {
    expect(
      exactSquareRootOf(add(pow(x, number(2)), number(1)), "x")
    ).toBeUndefined();
  });
});

describe("integrating across the sign changes", () => {
  test("#31: √(e^{2x} − 6eˣ + 9), continuous at ln 3", () => {
    const radicand = add(sub(ex(2), mul(number(6), ex(1))), number(9));
    isContinuousAntiderivative(
      fn("sqrt", radicand),
      [Math.log(3)],
      [-2, 0, 0.5, 1.5, 2.5]
    );
  });

  test("#52: √((e^{2x} + 1)²) is e^{2x} + 1 everywhere", () => {
    isContinuousAntiderivative(
      fn("sqrt", pow(add(ex(2), number(1)), number(2))),
      [],
      [-1, 0, 1]
    );
  });

  test("the four-factor square, with two irrational corners", () => {
    const product = mul(
      mul(x, add(x, number(1))),
      mul(add(x, number(2)), add(x, number(3)))
    );
    const r = Math.sqrt(5);
    isContinuousAntiderivative(
      fn("sqrt", add(product, number(1))),
      [(-3 - r) / 2, (-3 + r) / 2],
      [-4, -2, -1.5, 0, 1]
    );
  });

  test("|x² − 3x + 2|, two rational corners", () => {
    const g = add(sub(pow(x, number(2)), mul(number(3), x)), number(2));
    isContinuousAntiderivative(fn("abs", g), [1, 2], [0, 1.5, 3]);
  });
});
