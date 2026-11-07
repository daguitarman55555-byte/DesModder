import { FIELD_GALLERY } from "./index";
import { AP_STREAMS, AP_TEACHING } from "./ap-teaching";
import { canonicalIdentifier } from "../identifiers";
import { parseStrictExpression } from "../sim/strictParse";
import { compileExpression } from "../sim/strictEvaluate";

/** A preset's field, tint and any formula in its variables, evaluable. */
function demo(id: string, dim: 2 | 3 = 2) {
  const p = AP_TEACHING.find((p) => p.id === id)!;
  const params = new Map(
    (dim === 3 ? p.space.variables : p.variables)!.map((v) => [
      canonicalIdentifier(v.name),
      v.value,
    ])
  );
  const compile = (latex: string) => {
    const parsed = parseStrictExpression(latex, {
      functions: new Map(),
      scalars: new Set(params.keys()),
    });
    if (!parsed.ok) throw Error(parsed.error);
    const f = compileExpression(parsed.expr, parsed.program, {
      degreeMode: false,
    });
    return (x: number, y: number, time = 0) => f({ x, y, time, params }, []);
  };
  return {
    p,
    params,
    compile,
    x: compile(p.xLatex),
    y: compile(p.yLatex),
    V: compile(p.tint!.latex),
  };
}

type F = (x: number, y: number) => number;
const dx = (f: F, x: number, y: number) =>
  (f(x + 1e-5, y) - f(x - 1e-5, y)) / 2e-5;
const dy = (f: F, x: number, y: number) =>
  (f(x, y + 1e-5) - f(x, y - 1e-5)) / 2e-5;

test("conductor E is minus grad V, and tangential surface E vanishes", () => {
  const f = demo("ap-conductor");
  for (const [x, y] of [
    [2, 1],
    [-2, 2],
    [0, 3],
  ]) {
    expect(f.x(x, y)).toBeCloseTo(-dx(f.V, x, y), 5);
    expect(f.y(x, y)).toBeCloseTo(-dy(f.V, x, y), 5);
  }
  for (const theta of [0.3, 1, 2]) {
    const x = 1.300001 * Math.cos(theta);
    const y = 1.300001 * Math.sin(theta);
    expect(
      -Math.sin(theta) * f.x(x, y) + Math.cos(theta) * f.y(x, y)
    ).toBeCloseTo(0, 5);
  }
  expect(f.x(0, 0)).toBe(0);
});

test("the induced field satisfies Faraday's law inside and outside the solenoid", () => {
  const f = demo("ap-induction");
  for (const r of [1, 3])
    for (const t of [0, 1, 4]) {
      const circulation = 2 * Math.PI * r * f.y(r, 0, t);
      // 2πr·E_φ = −dΦ/dt, Φ = πmin(r², R²)·B sin ωt, B = 2, ω = 1, R = 2.
      expect(circulation).toBeCloseTo(
        -Math.PI * Math.min(r * r, 4) * 2 * Math.cos(t),
        9
      );
    }
});

test.each(AP_TEACHING.map((p) => [p.id, p] as const))(
  "%s has something to hide in Majestic, and a colour that means something",
  (_, p) => {
    expect(p.scene?.some((s) => s.explains)).toBe(true);
    expect(p.space.scene?.some((s) => s.explains)).toBe(true);
    expect(p.meaning?.quantity).toBeTruthy();
    expect(p.category).toBe("ap2");
    expect(p.apUnit).toBeDefined();
  }
);

test.each(Object.keys(AP_STREAMS))(
  "%s's drawn curves run along its field",
  (id) => {
    const f = demo(id);
    const s = f.compile(AP_STREAMS[id]);
    for (const [x, y] of [
      [2, 1],
      [1, 1],
      [-2, 0.5],
    ])
      expect(dx(s, x, y) * f.x(x, y) + dy(s, x, y) * f.y(x, y)).toBeCloseTo(
        0,
        5
      );
  }
);

test("every 2D preset draws its curves", () => {
  expect(Object.keys(AP_STREAMS).sort()).toEqual(
    AP_TEACHING.map((p) => p.id).sort()
  );
});

test("no 3D preset names a variable u or v, Desmos's surface parameters", () => {
  // A slider u turned (u, v, −3), a ground surface, into a point.
  for (const p of FIELD_GALLERY)
    for (const v of p.space.variables ?? [])
      expect(["u", "v"]).not.toContain(v.name);
});
