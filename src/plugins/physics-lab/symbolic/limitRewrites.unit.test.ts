import { logSubstitution, parametricLimit } from "./limitRewrites";
import { findLimit } from "./limit";
import { toLatex, type Node } from "../../../symbolic";
import { AugBuilders, buildConfig } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const cfg = buildConfig({ commandNames: "sin cos ln sqrt" });
const emit = (n: Node) => toLatex(cfg, n);
const x = id("x");
const mul = (a: Node, b: Node) => binop("Multiply", a, b);
const div = (a: Node, b: Node) => binop("Divide", a, b);
const sub = (a: Node, b: Node) => binop("Subtract", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const fn = (name: string, arg: Node) => functionCall(id(name), arg);
const zero = { kind: "finite" as const, node: number(0), value: 0 };

describe("a limit with a parameter, by L'Hôpital's rule on the tree", () => {
  test("sin(ax)/x → a, for every a", () => {
    const found = parametricLimit(
      div(fn("sin", mul(id("a"), x)), x),
      "x",
      zero,
      "both"
    );
    expect(found && emit(found.value)).toBe("a");
    expect(found?.condition).toBeUndefined();
    expect(found?.checkedAt.length).toBeGreaterThanOrEqual(2);
  });

  test("sin(ax)/sin(bx) → a/b, where b ≠ 0", () => {
    const found = parametricLimit(
      div(fn("sin", mul(id("a"), x)), fn("sin", mul(id("b"), x))),
      "x",
      zero,
      "both"
    );
    expect(found && emit(found.value)).toBe("\\frac{a}{b}");
    expect(found?.condition && emit(found.condition)).toBe("b");
  });

  test("(1 − cos kx)/x² → k²/2, twice", () => {
    const found = parametricLimit(
      div(sub(number(1), fn("cos", mul(id("k"), x))), pow(x, number(2))),
      "x",
      zero,
      "both"
    );
    expect(found?.applications).toBe(2);
    expect(found && emit(found.value)).toBe("\\frac{k^{2}}{2}");
  });

  test("no parameter, or not 0/0: left to the engine", () => {
    expect(
      parametricLimit(div(fn("sin", x), x), "x", zero, "both")
    ).toBeUndefined();
    expect(parametricLimit(div(id("a"), x), "x", zero, "both")).toBeUndefined();
  });
});

describe("x only through ln x, as t = ln x", () => {
  test("ln(ln x)/ln x at ∞ is ln t/t", () => {
    const lnx = fn("ln", x);
    const rewritten = logSubstitution(
      div(fn("ln", lnx), lnx),
      "x",
      { kind: "infinite", sign: 1 },
      "both"
    );
    expect(rewritten && emit(rewritten.node)).toBe(
      "\\frac{\\ln\\left(t\\right)}{t}"
    );
    const { answer } = findLimit(
      rewritten!.node,
      rewritten!.name,
      rewritten!.at,
      "both"
    );
    expect(answer.kind).toBe("value");
  });

  test("ln x/x is the engine's already, so nothing is rewritten", () => {
    expect(
      logSubstitution(
        div(fn("ln", x), x),
        "x",
        { kind: "infinite", sign: 1 },
        "both"
      )
    ).toBeUndefined();
  });
});
