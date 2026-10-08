import { figureEight, keplerPair } from "./orbits";

/** The derivative of f at t by a centred difference, for each body. */
function rate(f: (t: number) => number[], t: number, h = 1e-4) {
  const a = f(t - h);
  const b = f(t + h);
  return a.map((v, i) => (b[i] - v) / (2 * h));
}

describe("the figure eight, integrated", () => {
  const w = 0.6;
  const size = 6;
  const period = (2 * Math.PI) / w;

  test("comes back to where it started after one period", () => {
    const start = figureEight(0, w, size);
    const end = figureEight(period, w, size);
    for (let i = 0; i < 3; i++) {
      expect(end.x[i]).toBeCloseTo(start.x[i], 6);
      expect(end.y[i]).toBeCloseTo(start.y[i], 6);
    }
  });

  test("each body's velocity is its position's rate of change", () => {
    for (const t of [0.3, 2.1, 7.7]) {
      const s = figureEight(t, w, size);
      const vx = rate((u) => figureEight(u, w, size).x, t);
      const vy = rate((u) => figureEight(u, w, size).y, t);
      for (let i = 0; i < 3; i++) {
        // Linear interpolation of 4,096 samples: about 1e−2 of a speed of ~5.
        expect(Math.abs(vx[i] - s.vx[i])).toBeLessThan(0.05);
        expect(Math.abs(vy[i] - s.vy[i])).toBeLessThan(0.05);
      }
    }
  });

  test("keeps its centre of mass at the origin, equal masses", () => {
    // To the interpolation between samples, about 1e−6 at this size: each
    // body is read at a different point between two of them.
    const s = figureEight(4.2, w, size);
    expect(s.x.reduce((a, b) => a + b)).toBeCloseTo(0, 4);
    expect(s.y.reduce((a, b) => a + b)).toBeCloseTo(0, 4);
  });
});

describe("the Kepler pair", () => {
  const o = { a: 7.5, e: 0.35, n: 0.4, ratio: 0.45 };

  test("velocities are the exact derivatives of the positions", () => {
    for (const t of [0, 1.3, 5.9, 11]) {
      const s = keplerPair(t, o);
      const vx = rate((u) => keplerPair(u, o).x, t);
      const vy = rate((u) => keplerPair(u, o).y, t);
      for (let i = 0; i < 2; i++) {
        expect(vx[i]).toBeCloseTo(s.vx[i], 5);
        expect(vy[i]).toBeCloseTo(s.vy[i], 5);
      }
    }
  });

  test("the centre of mass stays put, and the separation runs a(1 ± e)", () => {
    let near = Infinity;
    let far = 0;
    for (let t = 0; t < (2 * Math.PI) / o.n; t += 0.01) {
      const s = keplerPair(t, o);
      expect(s.x[0] + o.ratio * s.x[1]).toBeCloseTo(0, 9);
      expect(s.y[0] + o.ratio * s.y[1]).toBeCloseTo(0, 9);
      const r = Math.hypot(s.x[1] - s.x[0], s.y[1] - s.y[0]);
      near = Math.min(near, r);
      far = Math.max(far, r);
    }
    expect(near).toBeCloseTo(o.a * (1 - o.e), 2);
    expect(far).toBeCloseTo(o.a * (1 + o.e), 2);
  });
});
