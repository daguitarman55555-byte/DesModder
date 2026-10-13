import { AP_NEXT } from "./ap-next";
import {
  ampereCirculation,
  chargeInside,
  enclosedCurrent,
  electricField,
  gaussFlux,
  inclineForces,
  magneticField,
} from "./ap-next-physics";
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

test("Ampere midpoint circulation obeys the algebraic enclosed current for tilted and translated loops", () => {
  const wires = [
    { current: 1, x: -1.7 },
    { current: -0.6, x: 1.7 },
  ];
  for (const angle of [0, 0.3, 0.9]) {
    for (const center of [
      [-1.7, 0, 0] as const,
      [1.7, 0, 0] as const,
      [0, 0, 0] as const,
    ]) {
      const target = enclosedCurrent(center, 1, angle, wires);
      const value = ampereCirculation(center, 1, angle, wires, 160);
      expect(value).toBeCloseTo(target, 3);
    }
  }
  expect(enclosedCurrent([0, 0, 0], 2.5, 0.3, wires)).toBeCloseTo(0.4, 10);
});

test("Ampere preset evaluates the exact long-wire B field", () => {
  const f = compile("ap-ampere-loop");
  for (const [x, y] of [
    [0, 1],
    [-2.4, 1],
    [3, -1],
  ]) {
    const B = magneticField(
      [x, y, 0],
      [
        { current: 1, x: -1.7 },
        { current: -0.6, x: 1.7 },
      ]
    );
    expect(f.x(x, y)).toBeCloseTo(B[0], 8);
    expect(f.y(x, y)).toBeCloseTo(B[1], 8);
    expect(f.tint(x, y)).toBeCloseTo(Math.hypot(B[0], B[1]), 8);
  }
});

test("Incline friction balances only what is needed until breakaway, then equals kinetic friction", () => {
  for (const theta of [0.1, 0.3, 0.49]) {
    const q = inclineForces(theta, 0.55, 0.3, 2, 2);
    expect(q.static).toBe(true);
    expect(q.netDownhill).toBeCloseTo(0, 10);
    expect(q.friction).toBeCloseTo(4 * Math.sin(theta), 10);
  }
  for (const theta of [0.6, 0.8]) {
    const q = inclineForces(theta, 0.55, 0.3, 2, 2);
    expect(q.static).toBe(false);
    expect(q.friction).toBeCloseTo(0.3 * 4 * Math.cos(theta), 10);
    expect(q.acceleration).toBeCloseTo(
      2 * (Math.sin(theta) - 0.3 * Math.cos(theta)),
      10
    );
  }
  expect(inclineForces(Math.atan(0.55), 0.55, 0.3, 2, 2).static).toBe(true);
  expect(inclineForces(0.6, 0.55, 0.3, 2, 2).threshold).toBeCloseTo(
    Math.atan(0.55),
    9
  );
});

test("new AP presets provide 2D and 3D scenes, correct shelf and hidden explanatory apparatus", () => {
  for (const p of AP_NEXT) {
    expect(p.variables?.every((v) => v.name !== "u" && v.name !== "v")).toBe(
      true
    );
    expect(
      p.space.variables?.every((v) => v.name !== "u" && v.name !== "v")
    ).toBe(true);
    expect(p.category === "ap1" || p.category === "ap2").toBe(true);
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
