/**
 * Special functions at their special values give the known constant, not a
 * decimal: Γ(1/2) = √π, ζ(2) = π²/6, ψ(1) = −γ, and the families.
 */
import { exactConstant } from "./definite";
import * as X from "./exact";
import { toLatex, type Node } from "../../../symbolic";
import { AugBuilders, buildConfig } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const cfg = buildConfig({ commandNames: "ln sqrt pi gamma zeta" });
const div = (a: Node, b: Node) => binop("Divide", a, b);
const call = (name: string, ...args: Node[]) => functionCall(id(name), ...args);
const neg = (a: Node): Node => ({ type: "Negative", arg: a });

/** The exact value: its LaTeX, and its float beside the expected one. */
function exact(node: Node, expected: number) {
  const value = exactConstant(node);
  expect(value).toBeDefined();
  expect(X.toNumber(value!)).toBeCloseTo(expected, 10);
  return toLatex(cfg, X.toNode(value!));
}

const { PI } = Math;
const GAMMA = 0.5772156649015329;

describe("Γ", () => {
  test("Γ(1/2) = √π", () => {
    expect(exact(call("Gamma", div(number(1), number(2))), Math.sqrt(PI))).toBe(
      "\\sqrt{\\pi}"
    );
  });
  test("Γ(5) = 24", () => {
    expect(exact(call("Gamma", number(5)), 24)).toBe("24");
  });
  test("Γ(7/2) = 15√π/8, the half-integer family upward", () => {
    exact(call("Gamma", div(number(7), number(2))), (15 * Math.sqrt(PI)) / 8);
  });
  test("Γ(−3/2) = 4√π/3, and downward", () => {
    exact(
      call("Gamma", neg(div(number(3), number(2)))),
      (4 * Math.sqrt(PI)) / 3
    );
  });
  test("B(1/2, 1/2) = π, through Γ", () => {
    const h = div(number(1), number(2));
    expect(exact(call("Beta", h, h), PI)).toBe("\\pi");
  });
});

describe("ζ", () => {
  test("ζ(2) = π²/6", () => {
    expect(exact(call("zeta", number(2)), (PI * PI) / 6)).toBe(
      "\\frac{\\pi^{2}}{6}"
    );
  });
  test("ζ(4) = π⁴/90 and ζ(6) = π⁶/945, the even family", () => {
    exact(call("zeta", number(4)), PI ** 4 / 90);
    exact(call("zeta", number(6)), PI ** 6 / 945);
  });
  test("ζ(0) = −1/2, ζ(−1) = −1/12, ζ(−2) = 0", () => {
    expect(exact(call("zeta", number(0)), -0.5)).toBe("-\\frac{1}{2}");
    expect(exact(call("zeta", neg(number(1))), -1 / 12)).toBe("-\\frac{1}{12}");
    expect(exact(call("zeta", neg(number(2))), 0)).toBe("0");
  });
  test("ζ(3) is Apéry's constant by name", () => {
    expect(exact(call("zeta", number(3)), 1.2020569031595942)).toContain(
      "zeta"
    );
  });
});

describe("ψ", () => {
  test("ψ(1) = −γ", () => {
    expect(exact(call("psi", number(1)), -GAMMA)).toBe("-\\gamma");
  });
  test("ψ(4) = −γ + 11/6, the whole-number family", () => {
    exact(call("psi", number(4)), -GAMMA + 11 / 6);
  });
  test("ψ(1/2) = −γ − 2 ln 2", () => {
    exact(call("psi", div(number(1), number(2))), -GAMMA - 2 * Math.LN2);
  });
});

describe("the rest", () => {
  test("Li₂(1) = π²/6, Li₂(−1) = −π²/12, Li₂(1/2)", () => {
    exact(call("Li_2", number(1)), (PI * PI) / 6);
    exact(call("Li_2", neg(number(1))), -(PI * PI) / 12);
    exact(
      call("Li_2", div(number(1), number(2))),
      (PI * PI) / 12 - Math.LN2 ** 2 / 2
    );
  });
  test("W₀(e) = 1, W₀(2e²) = 2, W₀(−1/e) = −1", () => {
    expect(exact(call("W_0", id("e")), 1)).toBe("1");
    expect(
      exact(
        call(
          "W_0",
          binop("Multiply", number(2), binop("Exponent", id("e"), number(2)))
        ),
        2
      )
    ).toBe("2");
    expect(exact(call("W_0", neg(div(number(1), id("e")))), -1)).toBe("-1");
  });
  test("K(0) = π/2, erf(0) = 0, erfc(0) = 1, J₀(0) = 1", () => {
    exact(call("EllipticK", number(0)), PI / 2);
    expect(exact(call("erf", number(0)), 0)).toBe("0");
    expect(exact(call("erfc", number(0)), 1)).toBe("1");
    expect(exact(call("BesselJ", number(0), number(0)), 1)).toBe("1");
  });
  test("E_{1,1}(2) = e²", () => {
    expect(
      exact(call("E_ML", number(1), number(1), number(2)), Math.E ** 2)
    ).toBe("e^{2}");
  });
  test("a point with no closed form stays itself, exactly", () => {
    // Γ(1/3) is a constant of its own: kept as Γ(1/3), not as a decimal.
    const value = exactConstant(call("Gamma", div(number(1), number(3))));
    expect(value).toBeDefined();
    expect(X.toNumber(value!)).toBeCloseTo(2.678938534707747, 10);
  });
});
