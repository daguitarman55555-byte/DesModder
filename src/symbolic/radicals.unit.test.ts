/**
 * Each case asserts the shape (the form a course writes) and the value (the
 * same function at a spread of points), as condense's tests do: a rewrite
 * that drops a factor reads just as well as one that does not.
 */
import { cancelPowers } from "./radicals";
import { agreesOnSamples, evaluate } from "./evaluate";
import { toLatex } from "./latex";
import { Aug, AugBuilders, buildConfig } from "../../text-mode-core";

const { binop, functionCall, id, number, negative } = AugBuilders;

type Node = Aug.Latex.AnyChild;

const cfg = buildConfig({ commandNames: "sqrt pi" });
const emit = (node: Node) => toLatex(cfg, node);

const x = id("x");
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const div = (a: Node, b: Node) => binop("Divide", a, b);
const add = (a: Node, b: Node) => binop("Add", a, b);
const sub = (a: Node, b: Node) => binop("Subtract", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const sqrt = (a: Node) => functionCall(id("sqrt"), a);
const half = (n: number) => div(number(n), number(2));
const onePlusX2 = add(number(1), pow(x, number(2)));
const x2Plus1 = add(pow(x, number(2)), number(1));

const samples = [0.3, 0.7, 1.4, 2.2, 3.1].map((v) => ({ x: v }));
const same = (a: Node, b: Node) =>
  agreesOnSamples(
    (s) => evaluate(a, s),
    (s) => evaluate(b, s),
    samples
  );

describe("cancelPowers", () => {
  test.each<[string, Node, string]>([
    [
      "the quotient rule on x/(1+x²)^{3/2}",
      div(
        sub(
          pow(onePlusX2, half(3)),
          mul(mul(number(3), pow(x, number(2))), sqrt(onePlusX2))
        ),
        pow(pow(onePlusX2, half(3)), number(2))
      ),
      // Highest degree first, as tidySums writes every collected sum.
      String.raw`\frac{-2x^{2}+1}{\left(1+x^{2}\right)^{\frac{5}{2}}}`,
    ],
    [
      "the chain rule on √(x²+1)³",
      div(mul(mul(number(3), x2Plus1), x), sqrt(x2Plus1)),
      String.raw`3x\sqrt{x^{2}+1}`,
    ],
    [
      "the quotient rule on x/√(x²+1)",
      div(
        sub(
          sqrt(x2Plus1),
          mul(pow(x, number(2)), pow(x2Plus1, negative(half(1))))
        ),
        x2Plus1
      ),
      String.raw`\frac{1}{\left(x^{2}+1\right)^{\frac{3}{2}}}`,
    ],
    [
      "the product rule on x√(1−x²), a sum on its own",
      sub(
        sqrt(sub(number(1), pow(x, number(2)))),
        mul(
          pow(x, number(2)),
          pow(sub(number(1), pow(x, number(2))), negative(half(1)))
        )
      ),
      String.raw`\frac{-2x^{2}+1}{\sqrt{1-x^{2}}}`,
    ],
    ["a root times itself", mul(sqrt(x), sqrt(x)), "x"],
    [
      "a cube root over its base",
      div(pow(x, div(number(1), number(3))), x),
      String.raw`\frac{1}{x^{\frac{2}{3}}}`,
    ],
  ])("%s", (_, input, expected) => {
    const output = cancelPowers(input);
    expect(emit(output)).toBe(expected);
    expect(same(input, output)).toBe(true);
  });

  test.each<[string, Node]>([
    // √(x²) is |x|: composing the powers would be wrong for x < 0.
    ["√(x²)/x", div(sqrt(pow(x, number(2))), x)],
    // Nothing shares a base.
    ["sin x/(x+1)", div(functionCall(id("sin"), x), add(x, number(1)))],
    ["x²+2x", add(pow(x, number(2)), mul(number(2), x))],
  ])("left alone: %s", (_, input) => {
    expect(emit(cancelPowers(input))).toBe(emit(input));
  });
});
