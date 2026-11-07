import { canonicalIdentifier } from "../identifiers";
import { compileExpression } from "../sim/strictEvaluate";
import { parseStrictExpression } from "../sim/strictParse";
import { electricField } from "./ap-next-physics";
import { galleryPreset } from "./index";
import { MAX_CHARGES } from "./point-charges";

/** A preset's 2D field and colour, with some of its sliders moved. */
function field(id: string, overrides: Record<string, number> = {}) {
  const p = galleryPreset(id)!;
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
  };
}

/**
 * Three charges, one moved up off the axis and one brought in by the count:
 * the drawn field must be Coulomb's for exactly those three, at k = 1 for
 * Electric charges and 1/4π for Gauss.
 */
const MOVED = {
  "N_{q}": 3,
  "q_{1}": 1.5,
  "X_{q1}": -2,
  "Y_{q1}": 1.5,
  "q_{2}": -1,
  "X_{q2}": 2.5,
  "Y_{q2}": -0.5,
  "q_{3}": 2,
  "X_{q3}": 0.5,
  "Y_{q3}": -3,
};
const THREE = [
  { charge: 1.5, position: [-2, 1.5, 0] as const },
  { charge: -1, position: [2.5, -0.5, 0] as const },
  { charge: 2, position: [0.5, -3, 0] as const },
];
const POINTS = [
  [0, 2],
  [-4, -1],
  [3, 3],
  [1, -1.2],
];

test.each([
  ["charges", 4 * Math.PI],
  ["ap-gauss-flux", 1],
])(
  "%s draws Coulomb's field of the charges in use, wherever they are",
  (id, scale) => {
    const f = field(id, MOVED);
    for (const [x, y] of POINTS) {
      const E = electricField([x, y, 0], THREE);
      expect(f.x(x, y)).toBeCloseTo(scale * E[0], 8);
      expect(f.y(x, y)).toBeCloseTo(scale * E[1], 8);
    }
  }
);

test.each(["charges", "ap-gauss-flux"])(
  "%s's field is minus the gradient of the potential it is coloured by",
  (id) => {
    const f = field(id, MOVED);
    const h = 1e-5;
    for (const [x, y] of POINTS) {
      const dVx = (f.potential(x + h, y) - f.potential(x - h, y)) / (2 * h);
      const dVy = (f.potential(x, y + h) - f.potential(x, y - h)) / (2 * h);
      expect(f.x(x, y)).toBeCloseTo(-dVx, 5);
      expect(f.y(x, y)).toBeCloseTo(-dVy, 5);
    }
  }
);

test("a charge the count leaves out adds nothing, wherever it was left", () => {
  const two = field("charges", { ...MOVED, "N_{q}": 2 });
  const E = electricField([0, 2, 0], THREE.slice(0, 2));
  expect(two.x(0, 2)).toBeCloseTo(4 * Math.PI * E[0], 8);
  // Inside an unused charge's ball the field is still drawn.
  expect(Number.isFinite(two.x(0.5, -3.1))).toBe(true);
});

test("all ten charges count, and each has its sliders shown only while in use", () => {
  const p = galleryPreset("charges")!;
  const count = p.variables!.find((v) => v.name === "N_{q}")!;
  expect(count.max).toBe(MAX_CHARGES);
  for (let i = 1; i <= MAX_CHARGES; i++)
    for (const name of [`q_{${i}}`, `X_{q${i}}`, `Y_{q${i}}`]) {
      const v = p.variables!.find((v) => v.name === name)!;
      expect(v.shownWhen).toEqual({ name: "N_{q}", atLeast: i });
    }
  // In 3D each also moves in z.
  expect(p.space.variables!.some((v) => v.name === "Z_{q10}")).toBe(true);
});
