import { FIELD_GALLERY } from "./index";
import { inked, mul, num, point, toggle } from "./kit";
import { tidy } from "./latex";

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

test("every preset says what to take away from it", () => {
  // A demo nobody can learn anything from is decoration.
  const missing = FIELD_GALLERY.filter(
    (preset) => (preset.takeaway ?? "").length < 60
  ).map((preset) => preset.id);
  expect(missing).toEqual([]);
});

describe("tidy", () => {
  test.each([
    ["a+-b", "a-b"],
    [String.raw`\left(0+-1c\right)`, String.raw`\left(-c\right)`],
    [String.raw`\left(x+0\right)`, String.raw`\left(x\right)`],
    [String.raw`\left(-1\cdot 0.65L\right)`, String.raw`\left(-0.65L\right)`],
    [
      String.raw`\left(\left(x-a\right)\right)^{2}`,
      String.raw`\left(x-a\right)^{2}`,
    ],
    [String.raw`x^{2}+\left(0\right)^{2}`, "x^{2}"],
  ])("%s is %s", (from, to) => expect(tidy(from)).toBe(to));

  test.each([
    String.raw`C_{1vt}+x_{0}`,
    "0.5+10",
    "x+0.25",
    String.raw`\frac{1}{x}`,
    String.raw`e^{10x}`,
  ])("leaves %s alone", (latex) => expect(tidy(latex)).toBe(latex));
});

test("no preset's LaTeX reads as if a program wrote it", () => {
  const slips = [/\+-/, /--/, /\+0(?![\d.])/, /(?<![\d.])[01]\cdot/, /\w\/\d/];
  const found: string[] = [];
  const walk = (value: unknown, key: string, where: string) => {
    if (typeof value === "string") {
      if (!/latex|Latex|domain|lineOpacity/i.test(key)) return;
      for (const slip of slips)
        if (slip.test(value)) found.push(`${where}.${key}: ${slip.source}`);
    } else if (Array.isArray(value)) value.forEach((v) => walk(v, key, where));
    else if (value !== null && typeof value === "object")
      for (const [k, v] of Object.entries(value)) walk(v, k, where);
  };
  for (const preset of FIELD_GALLERY) walk(preset, "", preset.id);
  expect(found).toEqual([]);
});
