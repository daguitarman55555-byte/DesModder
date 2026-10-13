import { AP_EXTENSIONS } from "./ap-extensions";
import { energyBars } from "./energy-bars";
import { parseStrictExpression } from "../sim/strictParse";
import { compileExpression } from "../sim/strictEvaluate";
import { canonicalIdentifier } from "../identifiers";

function field(id: string) {
  const p = AP_EXTENSIONS.find((v) => v.id === id)!;
  const params = new Map(
    p.variables!.map((v) => [canonicalIdentifier(v.name), v.value])
  );
  const comp = (latex: string) => {
    const parsed = parseStrictExpression(latex, {
      functions: new Map(),
      scalars: new Set(params.keys()),
    });
    if (!parsed.ok) throw new Error(parsed.error);
    const func = compileExpression(parsed.expr, parsed.program, {
      degreeMode: false,
    });
    return (x: number, y: number, time = 0) => func({ x, y, time, params }, []);
  };
  return {
    p,
    params,
    x: comp(p.xLatex),
    y: comp(p.yLatex),
    E: comp(p.tint!.latex),
  };
}

it("pendulum vector field is the exact nonlinear state dynamics", () => {
  const f = field("ap-pendulum-phase");
  const g = f.params.get("g")!;
  const L = f.params.get("L")!;
  for (const th of [-2.6, -1.7, 0, 0.8, 2.2]) {
    for (const w of [-1.5, 0, 1.2]) {
      expect(f.x(th, w)).toBeCloseTo(w, 10);
      expect(f.y(th, w)).toBeCloseTo((-g / L) * Math.sin(th), 10);
      // Numerical directional derivative of energy along the flow.
      const h = 1e-5;
      const dHth = (f.E(th + h, w) - f.E(th - h, w)) / (2 * h);
      const dHw = (f.E(th, w + h) - f.E(th, w - h)) / (2 * h);
      expect(dHth * f.x(th, w) + dHw * f.y(th, w)).toBeCloseTo(0, 6);
    }
  }
  for (const th of [-2.5, -1, 0, 1, 2.5]) {
    const w = 2 * Math.sqrt(g / L) * Math.cos(th / 2);
    expect(f.E(th, w)).toBeCloseTo(2 * g * L, 8);
  }
});

it("Kepler reference velocity is radial plus transverse and conserves areal velocity", () => {
  const f = field("ap-kepler-areas");
  const mu = f.params.get("M_g")!;
  const a = f.params.get("a_orb")!;
  const e = f.params.get("e_orb")!;
  const c = Math.sqrt(mu / (a * (1 - e * e)));
  const p = a * (1 - e * e);
  for (const th of [0, 0.4, 1.3, 2.4, 3.4, 5.2]) {
    const r = p / (1 + e * Math.cos(th));
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    const vr = Math.cos(th) * f.x(x, y) + Math.sin(th) * f.y(x, y);
    const vt = -Math.sin(th) * f.x(x, y) + Math.cos(th) * f.y(x, y);
    expect(vr).toBeCloseTo(c * e * Math.sin(th), 9);
    expect(vt).toBeCloseTo(c * (1 + e * Math.cos(th)), 9);
    expect(f.E(x, y)).toBeCloseTo(Math.sqrt(mu * p) / 2, 9);
  }
  expect(f.x(0, 0)).toBe(0);
  expect(f.y(0, 0)).toBe(0);
});

it("the motion flow moves as the object does, looping every 7 s", () => {
  const f = field("ap-motion-graphs");
  const v0 = f.params.get("v_ini")!;
  const a = f.params.get("a_const")!;
  for (const t of [0, 1, 2, 3, 5]) {
    // In track units: the object is drawn at 0.8 graph units per unit of x.
    expect(f.x(0.3, -1, t)).toBeCloseTo(0.8 * (v0 + a * t), 10);
    expect(f.y(0.3, -1, t)).toBe(0);
    expect(f.E(0.3, -1, t)).toBeCloseTo(v0 + a * t, 10);
  }
  // Held at six seconds, then round again.
  expect(f.x(0, 0, 6.5)).toBeCloseTo(0.8 * (v0 + a * 6), 10);
  expect(f.x(0, 0, 8)).toBeCloseTo(0.8 * (v0 + a * 1), 10);
});

it("every Kepler particle is a true orbit: on any ellipse, speed and h/2 are right", () => {
  const f = field("ap-kepler-areas");
  const mu = f.params.get("M_g")!;
  const e = f.params.get("e_orb")!;
  // Ellipses of the same eccentricity but other sizes than the reference.
  for (const p of [0.8, 2.5, 4.4])
    for (const th of [0, 0.9, 2.2, 4.0]) {
      const r = p / (1 + e * Math.cos(th));
      const [x, y] = [r * Math.cos(th), r * Math.sin(th)];
      const c = Math.sqrt(mu / p);
      const vr = Math.cos(th) * f.x(x, y) + Math.sin(th) * f.y(x, y);
      const vt = -Math.sin(th) * f.x(x, y) + Math.cos(th) * f.y(x, y);
      expect(vr).toBeCloseTo(c * e * Math.sin(th), 9);
      expect(vt).toBeCloseTo(c * (1 + e * Math.cos(th)), 9);
      // r × v / 2 = h/2, the same all round the orbit.
      expect(f.E(x, y)).toBeCloseTo(Math.sqrt(mu * p) / 2, 9);
      expect((r * vt) / 2).toBeCloseTo(Math.sqrt(mu * p) / 2, 9);
    }
});

it("the pendulum's AGM and nome series give the exact large-angle motion", () => {
  // The same formulas as the preset's hidden helpers, in plain numbers.
  const g = 2;
  const L = 1.3;
  const w0 = Math.sqrt(g / L);
  for (const theta0 of [0.3, 1.5, 2.5, 3]) {
    const k = Math.sin(theta0 / 2);
    const agm = (a: number, b: number) => {
      for (let i = 0; i < 6; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
      return a;
    };
    const K = Math.PI / (2 * agm(1, Math.sqrt(1 - k * k)));
    const q = Math.exp(-(Math.PI ** 2) / (2 * agm(1, k) * K));
    const series = (t: number, cos: boolean) => {
      const u = (Math.PI / (2 * K)) * (w0 * t + K);
      let sum = 0;
      for (let n = 0; n <= 24; n++) {
        const qn = q ** (n + 0.5);
        sum += cos
          ? (qn * Math.cos((2 * n + 1) * u)) / (1 + q ** (2 * n + 1))
          : (qn * Math.sin((2 * n + 1) * u)) / (1 - q ** (2 * n + 1));
      }
      return ((2 * Math.PI) / (k * K)) * sum;
    };
    const theta = (t: number) =>
      2 * Math.asin(Math.max(-1, Math.min(1, k * series(t, false))));
    const omega = (t: number) => 2 * k * w0 * series(t, true);
    // Released from rest at the amplitude.
    expect(theta(0)).toBeCloseTo(theta0, 6);
    expect(omega(0)).toBeCloseTo(0, 6);
    // Energy per mass, L²ω²/2 + gL(1 − cos θ), holds all the way round.
    const E0 = g * L * (1 - Math.cos(theta0));
    for (const t of [0.4, 1.1, 2.7, 5.3]) {
      const E = (L * L * omega(t) ** 2) / 2 + g * L * (1 - Math.cos(theta(t)));
      expect(E).toBeCloseTo(E0, 5);
      // ω is θ's rate of change.
      const h = 1e-5;
      expect((theta(t + h) - theta(t - h)) / (2 * h)).toBeCloseTo(omega(t), 4);
    }
    // Back at the amplitude after one period, 4K/ω₀.
    expect(theta((4 * K) / w0)).toBeCloseTo(theta0, 5);
  }
});

it("energy bars appear only in the appropriate 2D presets and are explanatory", () => {
  for (const id of ["ap-projectile", "ap-shm", "ap-circular"]) {
    const two = energyBars(id, 2);
    expect(two.scene.length).toBeGreaterThanOrEqual(6);
    expect(two.variables[0].name).toBe("s_{energy}");
    expect(two.scene.every((v) => v.explains)).toBe(true);
    expect(energyBars(id, 3).scene.length).toBeGreaterThanOrEqual(3);
    expect(
      energyBars(id, 3).scene.every((s) => s.explains && s.domainU && s.domainV)
    ).toBe(true);
  }
});

it("all extension presets avoid 3D surface parameter sliders u and v", () => {
  for (const p of AP_EXTENSIONS) {
    expect(p.scene?.some((s) => s.explains)).toBe(true);
    expect(p.space.scene?.some((s) => s.explains)).toBe(true);
    expect(
      p.space.variables?.every((v) => v.name !== "u" && v.name !== "v")
    ).toBe(true);
    expect(p.meaning?.quantity).toBeTruthy();
  }
});
