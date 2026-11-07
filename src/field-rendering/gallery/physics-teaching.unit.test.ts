import { canonicalIdentifier, renameIdentifier } from "../identifiers";
import { compileExpression } from "../sim/strictEvaluate";
import { parseStrictExpression } from "../sim/strictParse";
import { TEACHING_PHYSICS } from "./physics-teaching";

function field(id: string, overrides: Record<string, number> = {}) {
  const p = TEACHING_PHYSICS.find((p) => p.id === id)!;
  const params = new Map(
    (p.variables ?? []).map((v) => [
      canonicalIdentifier(v.name),
      overrides[v.name] ?? v.value,
    ])
  );
  const env = { functions: new Map(), scalars: new Set(params.keys()) };
  const compile = (latex: string) => {
    const parsed = parseStrictExpression(latex, env);
    if (!parsed.ok) throw new Error(parsed.error + ": " + latex);
    const f = compileExpression(parsed.expr, parsed.program, {
      degreeMode: false,
    });
    return (x: number, y: number) => f({ x, y, time: 0, params }, []);
  };
  return {
    x: compile(p.xLatex),
    y: compile(p.yLatex),
    potential: compile(p.tint!.latex),
    compile,
    p,
  };
}
const dx = (f: (x: number, y: number) => number, x: number, y: number) =>
  (f(x + 1e-5, y) - f(x - 1e-5, y)) / 2e-5;
const dy = (f: (x: number, y: number) => number, x: number, y: number) =>
  (f(x, y + 1e-5) - f(x, y - 1e-5)) / 2e-5;

test.each(["capacitor", "dipole"])(
  "%s field is minus the gradient of its stated potential",
  (id) => {
    const f = field(id);
    for (const [x, y] of [
      [2, 2],
      [1, -2.5],
      [-2, 3],
    ]) {
      expect(f.x(x, y)).toBeCloseTo(-dx(f.potential, x, y), 5);
      expect(f.y(x, y)).toBeCloseTo(-dy(f.potential, x, y), 5);
    }
  }
);
test("prism exterior field agrees with independent face quadrature, including face-plane extensions", () => {
  const f = field("bar-magnet");
  for (const [x, y] of [
    [2.5, 0.3],
    [1.5, 1.2],
    [1.5, 0.4],
  ]) {
    // Integrate each charged rectangle directly, away from its physical edges.
    // Last point is on the edge, covered by the guard and deliberately omitted.
    if (y === 0.4) {
      expect(f.x(x, y)).toBe(0);
      continue;
    }
    const out = [0, 0];
    const n = 100;
    const step = 0.8 / n;
    for (const sign of [-1, 1])
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const d = [
            x - sign * 1.5,
            y - (-0.4 + (j + 0.5) * step),
            -(-0.4 + (k + 0.5) * step),
          ];
          const r = Math.hypot(...d);
          for (let a = 0; a < 2; a++)
            out[a] += ((sign * d[a]) / (r * r * r)) * step * step;
        }
    expect(f.x(x, y)).toBeCloseTo(out[0], 4);
    expect(f.y(x, y)).toBeCloseTo(out[1], 4);
  }
  // 3D continuation along the extension of a face edge must remain finite.
  for (const component of [
    f.p.space.xLatex,
    f.p.space.yLatex,
    f.p.space.zLatex,
  ]) {
    const g = f.compile(renameIdentifier(component, "z", "2"));
    expect(Number.isFinite(g(1.5, 0.4))).toBe(true);
  }
});

test.each(["capacitor", "dipole"])(
  "%s implicit lines are tangent to the field",
  (id) => {
    const f = field(id);
    const line = f.p.scene!.find((s) => s.key === "fieldlines")!.latex;
    const start =
      line.indexOf(
        String.raw`\cdot\left(`,
        line.indexOf(String.raw`\cdot\left(`) + 1
      ) + String.raw`\cdot\left(`.length;
    const end = line.indexOf(String.raw`\right)\right)=0`);
    const s = f.compile(line.slice(start, end));
    for (const [x, y] of [
      [2, 2],
      [1, -2.5],
      [-2, 3],
    ])
      expect(dx(s, x, y) * f.x(x, y) + dy(s, x, y) * f.y(x, y)).toBeCloseTo(
        0,
        5
      );
  }
);
