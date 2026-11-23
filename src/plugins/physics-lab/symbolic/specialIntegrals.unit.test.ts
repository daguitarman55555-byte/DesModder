/**
 * Antiderivatives in special functions, each checked by differentiating it
 * back, which works because `evaluate` knows every special function.
 */
import { specialAntiderivative } from "./specialIntegrals";
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
const neg = (a: Node): Node => ({ type: "Negative", arg: a });

const elementary = (term: Node) => {
  try {
    return integrate(term, "x");
  } catch {
    return undefined;
  }
};

function check(integrand: Node, uses: string, samples = [0.4, 0.9, 1.6, 2.7]) {
  const found = specialAntiderivative(integrand, "x", elementary);
  expect(found).toBeDefined();
  expect(found!.uses).toContain(uses);
  expect(
    agreesOnSamples(
      (b) => numericDerivative(found!.value, "x", b),
      (b) => evaluate(integrand, b),
      samples.map((s) => ({ x: s })),
      1e-6
    )
  ).toBe(true);
}

describe("special-function antiderivatives", () => {
  test("eˣ/x = Ei(x)", () => check(div(pow(id("e"), x), x), "Ei"));
  test("e^{2x+1}/(3x − 1) through Ei", () =>
    check(
      div(
        pow(id("e"), add(mul(number(2), x), number(1))),
        sub(mul(number(3), x), number(1))
      ),
      "Ei",
      [0.6, 1, 2]
    ));
  test("sin(3x)/x = Si(3x)", () =>
    check(div(fn("sin", mul(number(3), x)), x), "Si"));
  test("cos x / x = Ci(x)", () => check(div(fn("cos", x), x), "Ci"));
  test("1/ln x = li(x)", () =>
    check(div(number(1), fn("ln", x)), "li", [1.5, 2, 3]));
  test("e^{−x²} through erf", () =>
    check(pow(id("e"), neg(pow(x, number(2)))), "erf"));
  test("e^{x²} through erfi", () =>
    check(pow(id("e"), pow(x, number(2))), "erfi"));
  test("sin(x²) through the Fresnel S", () =>
    check(fn("sin", pow(x, number(2))), "S"));
  test("ln(1 + x)/x = −Li₂(−x)", () =>
    check(div(fn("ln", add(number(1), x)), x), "Li_2"));
  test("(eˣ − 1)/x: Ei(x) − ln|x|, a special term and an elementary one", () => {
    // Split as eˣ/x − 1/x.
    check(sub(div(pow(id("e"), x), x), div(number(1), x)), "Ei");
  });
});
