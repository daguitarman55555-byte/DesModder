import { evaluate, gamma } from "./evaluate";
import { AugBuilders } from "../../text-mode-core";

const { number } = AugBuilders;

describe("the gamma function behind Desmos's factorial", () => {
  test.each([
    [5, 24],
    [0.5, Math.sqrt(Math.PI)],
    [1.5, Math.sqrt(Math.PI) / 2],
    // Values Desmos itself gave on 2026-10-14: (1.5)! and (−2.14159…)!.
    [2.5, 1.329340388179137],
    [-1.141592653589793, 6.83362231963],
  ])("Γ(%p)", (z, expected) => {
    expect(gamma(z)).toBeCloseTo(expected, 8);
  });

  test("the poles are undefined, as (−1)! is in Desmos", () => {
    expect(gamma(0)).toBeNaN();
    expect(gamma(-3)).toBeNaN();
  });

  test("a factorial evaluates at non-integers, and stays exact at integers", () => {
    expect(evaluate({ type: "Factorial", arg: number(1.5) }, {})).toBeCloseTo(
      1.329340388179137,
      12
    );
    expect(evaluate({ type: "Factorial", arg: number(18) }, {})).toBe(
      6402373705728000
    );
    expect(evaluate({ type: "Factorial", arg: number(-1) }, {})).toBeNaN();
  });
});
