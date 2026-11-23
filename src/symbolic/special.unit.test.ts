/**
 * The special functions against values known to many digits, and the
 * catalogue's Desmos plumbing. scripts/check-special-functions.cjs checks the
 * same functions' Desmos definitions against these, in live Desmos.
 */
import {
  SPECIAL_FUNCTIONS,
  besselJ,
  beta,
  Ci,
  desmosDefinitions,
  digamma,
  dilog,
  Ei,
  ellipticK,
  erf,
  fresnelS,
  lambertW,
  li,
  mittagLeffler,
  Si,
  specialFunctionsIn,
  zeta,
} from "./special";
import { evaluate } from "./evaluate";
import { AugBuilders } from "../../text-mode-core";

const { functionCall, id, number } = AugBuilders;

describe("values known to many digits", () => {
  test.each([
    ["ζ(2) = π²/6", () => zeta(2), (Math.PI * Math.PI) / 6],
    ["ζ(3), Apéry", () => zeta(3), 1.2020569031595942],
    ["ψ(1) = −γ", () => digamma(1), -0.5772156649015329],
    ["B(½, ½) = π", () => beta(0.5, 0.5), Math.PI],
    ["erf(1)", () => erf(1), 0.8427007929497149],
    ["Si(π)", () => Si(Math.PI), 1.851937051982466],
    ["Ci(1)", () => Ci(1), 0.3374039229009681],
    ["Ei(1)", () => Ei(1), 1.8951178163559368],
    ["li(10)", () => li(10), 6.165599504787298],
    ["Li₂(1) = π²/6", () => dilog(1), (Math.PI * Math.PI) / 6],
    [
      "Li₂(½) = π²/12 − ln²2/2",
      () => dilog(0.5),
      Math.PI ** 2 / 12 - Math.LN2 ** 2 / 2,
    ],
    ["Li₂(−1) = −π²/12", () => dilog(-1), -(Math.PI * Math.PI) / 12],
    ["S(1), Fresnel", () => fresnelS(1), 0.4382591473903548],
    ["J₀(1)", () => besselJ(0, 1), 0.7651976865579666],
    [
      "J_{1/2}(1) = √(2/π) sin 1",
      () => besselJ(0.5, 1),
      Math.sqrt(2 / Math.PI) * Math.sin(1),
    ],
    ["W(1), the omega constant", () => lambertW(1), 0.5671432904097838],
    ["W(e) = 1", () => lambertW(Math.E), 1],
    ["K(1/√2)", () => ellipticK(Math.SQRT1_2), 1.8540746773013719],
    ["E_{1,1}(1) = e", () => mittagLeffler(1, 1, 1), Math.E],
    ["E_{2,1}(−π²) = cos π", () => mittagLeffler(2, 1, -Math.PI * Math.PI), -1],
  ])("%s", (_, f, expected) => {
    expect(f()).toBeCloseTo(expected, 10);
  });
});

describe("the catalogue", () => {
  test("evaluate knows every special function", () => {
    for (const f of SPECIAL_FUNCTIONS) {
      const args = Array.from({ length: f.arity }, (_, i) => number(0.4 + i));
      const tree = functionCall(id(f.symbol), ...args);
      const value = evaluate(tree, {});
      expect([f.symbol, Number.isFinite(value)]).toEqual([f.symbol, true]);
    }
  });

  test("definitions come with what they depend on, first and once", () => {
    const defs = desmosDefinitions(["B", "psi", "E"]);
    const gammaAt = defs.findIndex((d) =>
      d.startsWith(String.raw`\Gamma\left(`)
    );
    const betaAt = defs.findIndex((d) => d.startsWith(String.raw`B\left(`));
    expect(gammaAt).toBeGreaterThanOrEqual(0);
    expect(gammaAt).toBeLessThan(betaAt);
    expect(
      defs.filter((d) => d.startsWith(String.raw`\Gamma\left(`))
    ).toHaveLength(1);
    expect(defs.some((d) => d.startsWith(String.raw`\Gamma_{r}`))).toBe(true);
  });

  test("calls are found in an answer, and not inside other names", () => {
    expect(
      specialFunctionsIn(
        String.raw`x^{-\pi}E\left(1,1-\pi,x\right)+\operatorname{Ei}\left(x\right)`
      ).sort()
    ).toEqual(["E", "Ei"]);
    expect(specialFunctionsIn(String.raw`\Gamma_{r}\left(x\right)`)).toEqual([
      "Gamma_r",
    ]);
    expect(
      specialFunctionsIn(String.raw`\operatorname{Li}_{2}\left(-x\right)`)
    ).toEqual(["Li_2"]);
  });
});
