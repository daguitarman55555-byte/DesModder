import { FIELD_GALLERY } from "./index";
import { inked, mul, num, point, toggle } from "./kit";

describe("the presets' kit", () => {
  test("writes Desmos's canonical LaTeX", () => {
    expect(point("a", "b")).toBe(String.raw`\left(a,b\right)`);
    expect(mul("2", "x")).toBe(String.raw`\left(2\right)\cdot\left(x\right)`);
  });

  test("a switch is a 0-or-1 slider with a label", () => {
    expect(toggle("s_{a}", 1, "A")).toEqual({
      name: "s_{a}",
      value: 1,
      min: 0,
      max: 1,
      step: 1,
      toggle: "A",
    });
  });

  test("a body is a point in 2D and a sphere in u and v in 3D", () => {
    const { ball } = inked("#000000");
    expect(ball("b", ["1", "2"], 2).points).toBe(true);
    const sphere = ball("b", ["1", "2", "3"], 3);
    expect(sphere.domainU).toEqual(["0", String.raw`2\pi`]);
    expect(sphere.latex).toContain(String.raw`\cos\left(u\right)`);
  });

  test("num rounds away floating-point noise", () => {
    expect(num(3.6 - 0.3)).toBe("3.3");
    expect(num(-0)).toBe("0");
  });
});

test("no preset shows floating-point noise in its LaTeX", () => {
  // 3.3000000000000003 in the expression list, from 3.6 − 0.3: numbers
  // computed in TypeScript go through num().
  const noisy = /\d+\.\d*?(?:0{7}\d+|9{7}\d+)/;
  const found: string[] = [];
  const walk = (value: unknown, where: string) => {
    if (typeof value === "string") {
      if (noisy.test(value)) found.push(`${where}: ${noisy.exec(value)![0]}`);
    } else if (Array.isArray(value)) value.forEach((v) => walk(v, where));
    else if (value !== null && typeof value === "object")
      for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`);
  };
  for (const preset of FIELD_GALLERY) walk(preset, preset.id);
  expect(found).toEqual([]);
});
