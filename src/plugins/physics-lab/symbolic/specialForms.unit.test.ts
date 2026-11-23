/**
 * The conjugate, the reciprocal quartic (#242) and the product rule run
 * backwards (#393), each checked by differentiating the answer back.
 */
import { integrate } from "./integrate";
import {
  agreesOnSamples,
  evaluate,
  numericDerivative,
  type Node,
} from "../../../symbolic";
import { AugBuilders } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const x = id("x");
const add = (a: Node, b: Node) => binop("Add", a, b);
const sub = (a: Node, b: Node) => binop("Subtract", a, b);
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const div = (a: Node, b: Node) => binop("Divide", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const fn = (name: string, arg: Node) => functionCall(id(name), arg);

function differentiatesBack(integrand: Node, samples: number[]) {
  const F = integrate(integrand, "x");
  expect(
    agreesOnSamples(
      (b) => numericDerivative(F, "x", b),
      (b) => evaluate(integrand, b),
      samples.map((s) => ({ x: s }))
    )
  ).toBe(true);
  return F;
}

describe("shapes with one move each", () => {
  test("1/(√(x+1) + √x), by the conjugate", () => {
    differentiatesBack(
      div(number(1), add(fn("sqrt", add(x, number(1))), fn("sqrt", x))),
      [0.3, 1, 2.5, 4]
    );
  });

  test("#242: (x² − 1)/((x² + 1)√(x⁴ + 1))", () => {
    const integrand = div(
      sub(pow(x, number(2)), number(1)),
      mul(
        add(pow(x, number(2)), number(1)),
        fn("sqrt", add(pow(x, number(4)), number(1)))
      )
    );
    differentiatesBack(integrand, [0.3, 0.9, 1.7, 3, -0.5, -2]);
  });

  test("#393: eˣ(1 − sin x)/(1 − cos x) is (−eˣ cot(x/2))′", () => {
    const integrand = mul(
      pow(id("e"), x),
      div(sub(number(1), fn("sin", x)), sub(number(1), fn("cos", x)))
    );
    differentiatesBack(integrand, [0.5, 1.2, 2, 2.9, 4, 5.5]);
  });
});
