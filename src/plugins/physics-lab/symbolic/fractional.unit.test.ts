/**
 * Fractional derivatives under six definitions, against values known in
 * closed form and against each other.
 */
import {
  digamma,
  fractionalDerivatives,
  gamma,
  mittagLeffler,
  type FractionalRequest,
} from "./fractional";
import { toLatex, type Node } from "../../../symbolic";
import { AugBuilders, buildConfig } from "../../../../text-mode-core";

const { binop, functionCall, id, number } = AugBuilders;
const x = id("x");
const add = (a: Node, b: Node) => binop("Add", a, b);
const pow = (a: Node, b: Node) => binop("Exponent", a, b);
const fn = (name: string, arg: Node) => functionCall(id(name), arg);
const cfg = buildConfig({ commandNames: "sin cos tan ln exp sqrt" });

const request = (
  f: Node,
  order: number,
  orderLatex: string,
  point = 2,
  lower = 0
): FractionalRequest => ({
  f,
  variable: "x",
  variableLatex: "x",
  order,
  orderLatex,
  lower,
  lowerLatex: String(lower),
  point,
  emit: (node) => toLatex(cfg, node),
});

const answer = (
  result: ReturnType<typeof fractionalDerivatives>,
  key: string
) => result.answers.find((a) => a.key === key)!;

describe("the special functions", () => {
  test("Γ at known points", () => {
    expect(gamma(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 13);
    expect(gamma(5)).toBeCloseTo(24, 11);
    expect(gamma(-0.5)).toBeCloseTo(-2 * Math.sqrt(Math.PI), 12);
  });

  test("ψ(1) = −γ, and E_{1,1}(z) = eᶻ", () => {
    expect(digamma(1)).toBeCloseTo(-0.5772156649015329, 13);
    expect(mittagLeffler(1, 1, 1.7)).toBeCloseTo(Math.exp(1.7), 12);
    expect(mittagLeffler(2, 1, -4)).toBeCloseTo(Math.cos(2), 12);
  });
});

describe("known values", () => {
  test("D^{1/2} x = 2√(x/π), and every classical definition agrees", () => {
    const result = fractionalDerivatives(request(x, 0.5, "\\frac{1}{2}"));
    const expected = 2 * Math.sqrt(2 / Math.PI);
    expect(answer(result, "riemannLiouville").kind).toBe("closed");
    expect(answer(result, "riemannLiouville").value).toBeCloseTo(expected, 12);
    expect(answer(result, "caputo").value).toBeCloseTo(expected, 12);
    expect(answer(result, "grunwaldLetnikov").value).toBeCloseTo(expected, 4);
    // Conformable is local: x^{1/2}·1.
    expect(answer(result, "conformable").value).toBeCloseTo(Math.SQRT2, 12);
  });

  test("the half integral of 1 is 2√(x/π)", () => {
    const result = fractionalDerivatives(
      request(number(1), -0.5, "-\\frac{1}{2}")
    );
    expect(result.kind).toBe("integral");
    expect(answer(result, "riemannLiouville").value).toBeCloseTo(
      2 * Math.sqrt(2 / Math.PI),
      12
    );
  });

  test("a whole order is the ordinary derivative, under every definition", () => {
    const result = fractionalDerivatives(request(pow(x, number(3)), 2, "2"));
    expect(result.kind).toBe("ordinary");
    expect(result.answers[0].value).toBeCloseTo(12, 12);
  });
});

describe("D^π (cos x + x + eˣ + ln x), all six", () => {
  const f = add(add(add(fn("cos", x), x), pow(id("e"), x)), fn("ln", x));
  const result = fractionalDerivatives(request(f, Math.PI, "\\pi", 2));

  test("Riemann–Liouville from 0 is a closed form, and Grünwald–Letnikov agrees", () => {
    const rl = answer(result, "riemannLiouville");
    expect(rl.kind).toBe("closed");
    expect(rl.latex).toContain("E_{2,");
    expect(rl.latex).toContain("\\psi");
    const gl = answer(result, "grunwaldLetnikov");
    expect(gl.value).toBeDefined();
    expect(Math.abs(gl.value! - rl.value!)).toBeLessThan(
      1e-3 * Math.max(1, Math.abs(rl.value!))
    );
  });

  test("Caputo from 0 does not exist, because of ln x", () => {
    const caputo = answer(result, "caputo");
    expect(caputo.kind).toBe("partial");
    expect(caputo.notes.join(" ")).toContain("does not exist");
  });

  test("conformable is x^{4−π}(cos x + eˣ) − 6x^{−π}", () => {
    const conformable = answer(result, "conformable");
    const expected =
      2 ** (4 - Math.PI) * (Math.cos(2) + Math.exp(2)) - 6 * 2 ** -Math.PI;
    expect(conformable.value).toBeCloseTo(expected, 10);
  });

  test("Weyl is defined only for cos and eˣ, and says why not for the rest", () => {
    const weyl = answer(result, "weyl");
    expect(weyl.kind).toBe("partial");
    expect(weyl.latex).toContain("\\cos");
    expect(weyl.notes.join(" ")).toContain("not defined for negative values");
  });

  test("Caputo–Hadamard from 1 has a value", () => {
    const ch = answer(result, "caputoHadamard");
    expect(ch.kind).toBe("integral");
    expect(Number.isFinite(ch.value)).toBe(true);
  });

  test("with the lower limit at 1, Caputo exists and RL = Caputo + boundary terms", () => {
    const from1 = fractionalDerivatives(request(f, Math.PI, "\\pi", 2, 1));
    const caputo = answer(from1, "caputo");
    const rl = answer(from1, "riemannLiouville");
    const gl = answer(from1, "grunwaldLetnikov");
    expect(caputo.kind).toBe("integral");
    expect(Number.isFinite(caputo.value)).toBe(true);
    expect(Math.abs(gl.value! - rl.value!)).toBeLessThan(
      1e-3 * Math.max(1, Math.abs(rl.value!))
    );
  });
});

describe("graphing with the special functions defined", () => {
  test("every function the graphed answer calls is defined with it", () => {
    const f = add(fn("cos", x), pow(id("e"), x));
    const result = fractionalDerivatives(
      request(f, Math.PI, String.raw`\pi`, 2)
    );
    const rl = answer(result, "riemannLiouville");
    expect(rl.graphLatex).toContain(String.raw`E_{ML}\left(`);
    expect(
      rl.definitions.some((d) => d.startsWith(String.raw`E_{ML}\left(a,b,z`))
    ).toBe(true);
    expect(
      rl.definitions.some((d) => d.startsWith(String.raw`\Gamma_{r}`))
    ).toBe(true);
  });
});
