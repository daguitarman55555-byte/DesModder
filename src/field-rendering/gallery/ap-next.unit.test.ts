import { AP_NEXT } from "./ap-next";
import { chargeInside, electricField, gaussFlux } from "./ap-next-physics";
import { canonicalIdentifier } from "../identifiers";
import { parseStrictExpression } from "../sim/strictParse";
import { compileExpression } from "../sim/strictEvaluate";

function compile(id: string, dim: 2 | 3 = 2) {
  const preset = AP_NEXT.find((p) => p.id === id)!;
  const params = new Map(
    (dim === 3 ? preset.space.variables : preset.variables)!.map((v) => [
      canonicalIdentifier(v.name),
      v.value,
    ])
  );
  const expr = (latex: string) => {
    const parsed = parseStrictExpression(latex, {
      functions: new Map(),
      scalars: new Set(params.keys()),
    });
    if (!parsed.ok) throw new Error(parsed.error);
    const calc = compileExpression(parsed.expr, parsed.program, {
      degreeMode: false,
    });
    return (x: number, y: number, time = 0) => calc({ x, y, time, params }, []);
  };
  return {
    preset,
    params,
    x: expr(preset.xLatex),
    y: expr(preset.yLatex),
    tint: expr(preset.tint!.latex),
  };
}

test("Gauss quadrature converges toward net enclosed charge for off-surface sources", () => {
  const charges = [
    { charge: 2, position: [-0.7, 0, 0] as const },
    { charge: -1, position: [2.5, 0, 0] as const },
  ];
  const center = [0, 0, 0] as const;
  expect(chargeInside(center, 1.7, charges)).toBe(2);
  expect(Math.abs(gaussFlux(center, 1.7, charges, 2000) - 2)).toBeLessThan(
    0.01
  );
  expect(Math.abs(gaussFlux(center, 1.7, charges, 80) - 2)).toBeLessThan(0.2);
  expect(chargeInside(center, 3, charges)).toBe(1);
  expect(Math.abs(gaussFlux(center, 3, charges, 2000) - 1)).toBeLessThan(0.015);
  // Outside charge changes the local field but not the enclosed charge.
  expect(chargeInside([0, 0, 0], 1.7, [charges[1]])).toBe(0);
});

test("Gauss preset vector is the correct 3D Coulomb field section", () => {
  const f = compile("ap-gauss-flux");
  const q = [
    { charge: 2, position: [-0.7, 0, 0] as const },
    { charge: -1, position: [2.5, 0, 0] as const },
  ];
  for (const [x, y] of [
    [0, 2],
    [-2, 1],
    [3, 2],
  ]) {
    const field = electricField([x, y, 0], q);
    expect(f.x(x, y)).toBeCloseTo(field[0], 8);
    expect(f.y(x, y)).toBeCloseTo(field[1], 8);
  }
});

test("new AP presets provide 2D and 3D scenes, correct shelf and hidden explanatory apparatus", () => {
  for (const p of AP_NEXT) {
    expect(p.variables?.every((v) => v.name !== "u" && v.name !== "v")).toBe(
      true
    );
    expect(
      p.space.variables?.every((v) => v.name !== "u" && v.name !== "v")
    ).toBe(true);
    expect(p.category).toBe("ap2");
    expect(p.apUnit).toBeDefined();
    expect(p.meaning?.quantity).toBeTruthy();
    expect(p.scene?.some((s) => s.explains)).toBe(true);
    expect(p.space.scene?.some((s) => s.explains)).toBe(true);
    expect(p.space.scene?.some((s) => s.majesticColor)).toBe(true);
  }
});

test("Gauss is coloured by the potential whose gradient is the drawn field", () => {
  const f = compile("ap-gauss-flux");
  const h = 1e-5;
  for (const [x, y] of [
    [0, 2],
    [-2, 1],
    [3, 2],
  ]) {
    const dVx = (f.tint(x + h, y) - f.tint(x - h, y)) / (2 * h);
    const dVy = (f.tint(x, y + h) - f.tint(x, y - h)) / (2 * h);
    expect(f.x(x, y)).toBeCloseTo(-dVx, 6);
    expect(f.y(x, y)).toBeCloseTo(-dVy, 6);
  }
});
