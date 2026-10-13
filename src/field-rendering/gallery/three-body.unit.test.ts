import { galleryPreset } from "./index";
import {
  flashAt,
  integrateThreeBody,
  playbackScene,
  runInvariants,
  stateAt,
} from "./three-body";

/** Lagrange's triangle with one star kicked, as the preset starts it. */
function lagrange(radius: number, duration: number) {
  const turn = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  const w = Math.sqrt(3 / Math.sqrt(3) ** 3);
  const kick = [1.12, 1, 1];
  const vx = turn.map((q, i) => -w * Math.sin(q) * kick[i]);
  const vy = turn.map((q, i) => w * Math.cos(q) * kick[i]);
  const [px, py] = [vx, vy].map((u) => u.reduce((a, b) => a + b, 0) / 3);
  return integrateThreeBody({
    masses: [1, 1, 1],
    x: turn.map(Math.cos),
    y: turn.map(Math.sin),
    vx: vx.map((u) => u - px),
    vy: vy.map((u) => u - py),
    radius,
    duration,
    dt: 0.02,
  });
}

describe("the three-body integrator", () => {
  test("point masses keep their energy and momentum through close passes", () => {
    // Twelve units take the triangle through its break-up and close passes.
    const run = lagrange(0, 12);
    const start = runInvariants(run, 0);
    for (let k = 0; k < run.samples; k += 50) {
      const now = runInvariants(run, k);
      expect(Math.abs(now.energy / start.energy - 1)).toBeLessThan(1e-6);
      expect(Math.abs(now.px)).toBeLessThan(1e-12);
      expect(Math.abs(now.py)).toBeLessThan(1e-12);
    }
  });

  test("a crash conserves mass and momentum, and leaves a bound pair", () => {
    const run = lagrange(0.05, 25.4);
    expect(run.crashes).toHaveLength(1);
    const [crash] = run.crashes;
    expect(crash.tau).toBeGreaterThan(15);
    expect(crash.tau).toBeLessThan(20);
    const after = runInvariants(run, crash.sample);
    const end = runInvariants(run, run.samples - 1);
    const mass = (k: number) => run.mass.reduce((a, m) => a + m[k], 0);
    expect(mass(run.samples - 1)).toBeCloseTo(3, 12);
    expect(Math.abs(end.px)).toBeLessThan(1e-12);
    expect(Math.abs(end.py)).toBeLessThan(1e-12);
    // The merged star's own binding energy, and the kinetic energy the
    // inelastic merger turned to heat, leave the orbit's books; what is left
    // keeps its energy, and that energy is negative: the pair is bound.
    expect(Math.abs(end.energy / after.energy - 1)).toBeLessThan(1e-6);
    expect(end.energy).toBeLessThan(0);
    // What is left is bound: the merged star and the third stay in view.
    for (let k = crash.sample; k < run.samples; k++)
      for (let i = 0; i < 3; i++)
        expect(Math.hypot(run.x[i][k], run.y[i][k])).toBeLessThan(4);
  });

  test("Burrau's 3-4-5 crashes the 4 into the 5, then into the 3", () => {
    const run = integrateThreeBody({
      masses: [3, 4, 5],
      x: [1, -2, 1],
      y: [3, -1, -1],
      vx: [0, 0, 0],
      vy: [0, 0, 0],
      radius: 0.1,
      duration: 5.4,
      dt: 0.01,
    });
    expect(run.crashes.map((c) => [c.absorbed, c.into])).toEqual([
      [1, 2],
      [0, 2],
    ]);
    expect(run.crashes[0].tau).toBeCloseTo(1.85, 1);
    // Let go from rest about the origin: all of it ends there, at rest.
    const end = run.samples - 1;
    expect(run.mass[2][end]).toBe(12);
    expect(Math.hypot(run.x[2][end], run.y[2][end])).toBeLessThan(1e-9);
    expect(Math.hypot(run.vx[2][end], run.vy[2][end])).toBeLessThan(1e-9);
  });

  test("playback passes through the samples, at their own speed", () => {
    const run = lagrange(0.05, 25.4);
    const at = stateAt(run, 100 * run.dt);
    expect(at.x[0]).toBeCloseTo(run.x[0][100], 12);
    const h = 1e-5;
    const t = 3.217;
    const rate =
      (stateAt(run, t + h).x[1] - stateAt(run, t - h).x[1]) / (2 * h);
    expect(stateAt(run, t).vx[1]).toBeCloseTo(rate, 5);
    // And starts over at the end.
    const length = (run.samples - 1) * run.dt;
    expect(stateAt(run, length + 0.5).y[2]).toBeCloseTo(
      stateAt(run, 0.5).y[2],
      9
    );
  });

  test("a crash flashes where it happened and fades", () => {
    const run = lagrange(0.05, 25.4);
    const [crash] = run.crashes;
    expect(flashAt(run, crash.tau - 0.1).brightness).toBe(0);
    const flash = flashAt(run, crash.tau + 0.01);
    expect(flash.brightness).toBeGreaterThan(0.9);
    expect([flash.x, flash.y]).toEqual([crash.x, crash.y]);
    expect(flashAt(run, crash.tau + 3).brightness).toBeLessThan(0.01);
  });
});

describe("the three-body scenes", () => {
  test("every body has its samples, a trail and a point in Desmos", () => {
    const run = lagrange(0.05, 25.4);
    const { scene, variables } = playbackScene(run, {
      scale: 2,
      rate: 1,
      colors: ["#a", "#b", "#c", "#d"],
      trail: 2,
      paths: 0,
    });
    const keys = scene.map((s) => s.key);
    for (const i of [1, 2, 3])
      expect(keys).toEqual(
        expect.arrayContaining([`x${i}`, `y${i}`, `trail${i}`, `path${i}`])
      );
    const x1 = scene.find((s) => s.key === "x1")!.latex;
    expect(x1.split(",")).toHaveLength(run.samples);
    expect(variables.map((v) => v.name)).toEqual([
      "T_{scene}",
      "s_{trail}",
      "s_{path}",
    ]);
  });

  test.each(["star-cluster", "three-body-crash", "pythagorean"])(
    "%s keeps its LaTeX small enough for Desmos to load at once",
    (id) => {
      const preset = galleryPreset(id)!;
      const chars = preset.scene!.reduce((a, s) => a + s.latex.length, 0);
      expect(chars).toBeLessThan(60_000);
      expect(preset.sceneTime).toBe("T_{scene}");
    }
  );
});
