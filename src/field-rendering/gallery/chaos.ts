/** Chaos: strange attractors and where they come from. */
import { carriedWorlds, separation } from "./latex";
import type { ClockParameters, GalleryPreset, SceneItem } from "./types";

/**
 * The Lorenz butterfly on the plane: the attractor itself, seen from the
 * side as it is usually drawn, x across and z up.
 *
 * Its 2D form was a strip of convection rolls, |y| < 4, across the middle of
 * the screen (Rafael, 2026-11-08: "not just a horizontal strip"). A plane
 * field cannot be chaotic, so the motion is worked out on the CPU, as the
 * three-body presets' is: a few states integrated by RK4 with σ = 10,
 * ρ = 28, β = 8/3, played back as clock parameters. Each is a comet that
 * carries glowing gas, and their trails draw the wings as they swing from
 * one to the other, never repeating. Behind them, faint, one long orbit as
 * Desmos's own curve.
 */
const LORENZ = { sigma: 10, rho: 28, beta: 8 / 3 };
/** Lorenz units per graph unit, and where its z = 25 sits on screen. */
const LORENZ_SCALE = 2.5;
const LORENZ_RATE = 0.25;
const LORENZ_DT = 0.01;
const LORENZ_DURATION = 60;
const LORENZ_COMETS = 5;

function lorenzDerivative([x, y, z]: readonly number[]) {
  const { sigma, rho, beta } = LORENZ;
  return [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
}

/** States every `LORENZ_DT`, from `start`, by RK4 at a fifth of that step. */
function lorenzRun(start: readonly number[], duration: number) {
  const h = LORENZ_DT / 5;
  let s = [...start];
  const out: number[][] = [];
  const steps = Math.round(duration / LORENZ_DT);
  for (let k = 0; k <= steps; k++) {
    out.push([...s, ...lorenzDerivative(s)]);
    for (let j = 0; j < 5; j++) {
      const a = lorenzDerivative(s);
      const b = lorenzDerivative(s.map((v, i) => v + (h / 2) * a[i]));
      const c = lorenzDerivative(s.map((v, i) => v + (h / 2) * b[i]));
      const d = lorenzDerivative(s.map((v, i) => v + h * c[i]));
      s = s.map((v, i) => v + (h / 6) * (a[i] + 2 * b[i] + 2 * c[i] + d[i]));
    }
  }
  return out;
}

/** Onto the attractor first, so no comet is seen arriving from nowhere. */
function settled(start: readonly number[]) {
  const run = lorenzRun(start, 20);
  return run[run.length - 1].slice(0, 3);
}

const lorenzPlane = (() => {
  const runs = Array.from({ length: LORENZ_COMETS }, (_, i) =>
    lorenzRun(
      settled([1 + 0.7 * i, 1 - 0.4 * i, 20 + 1.5 * i]),
      LORENZ_DURATION
    )
  );
  // Lorenz's (x, z) onto the screen: x across, z up about z = 25.
  const X = (x: number) => x / LORENZ_SCALE;
  const Y = (z: number) => (z - 25) / LORENZ_SCALE;
  const names = (letter: string) =>
    runs.flatMap((_, i) => [`${letter}_{x${i + 1}}`, `${letter}_{y${i + 1}}`]);
  const clock: ClockParameters = {
    names: [...names("S"), ...names("V")],
    at: (t) => {
      const span = LORENZ_DURATION / LORENZ_DT;
      const f = ((LORENZ_RATE * t) / LORENZ_DT) % span;
      const k = Math.floor(f);
      const a = f - k;
      const at = (run: number[][], c: number) =>
        run[k][c] + a * (run[k + 1][c] - run[k][c]);
      const pos = runs.flatMap((run) => [X(at(run, 0)), Y(at(run, 2))]);
      const vel = runs.flatMap((run) => [
        (LORENZ_RATE * at(run, 3)) / LORENZ_SCALE,
        (LORENZ_RATE * at(run, 5)) / LORENZ_SCALE,
      ]);
      return [...pos, ...vel];
    },
  };
  const bodies = runs.map((_, i) => ({
    position: { x: `S_{x${i + 1}}`, y: `S_{y${i + 1}}` },
    velocity: { x: `V_{x${i + 1}}`, y: `V_{y${i + 1}}` },
    reach: 0.55,
    swirl: 0.25,
  }));
  const field = carriedWorlds(bodies, ["x", "y"], [0, 0, 1]);
  const seed = bodies
    .map(
      (b) =>
        String.raw`e^{-\frac{${separation(b.position, ["x", "y"]).r2}}{0.06}}`
    )
    .join("+");
  // One long orbit, every other sample, as Desmos's own faint curve.
  const orbit = lorenzRun(settled([0.5, 0.5, 20]), 40).filter(
    (_, k) => k % 2 === 0
  );
  const list = (values: number[]) =>
    String.raw`\left[${values.map((v) => String(Math.round(v * 1000) / 1000)).join(",")}\right]`;
  const scene: SceneItem[] = [
    {
      key: "orbitx",
      latex: String.raw`L_{xvt}=${list(orbit.map((s) => X(s[0])))}`,
      hidden: true,
    },
    {
      key: "orbity",
      latex: String.raw`L_{yvt}=${list(orbit.map((s) => Y(s[2])))}`,
      hidden: true,
    },
    {
      key: "orbit",
      latex: String.raw`\left(L_{xvt},L_{yvt}\right)`,
      color: "#7a5cff",
      points: false,
      lines: true,
      lineWidth: 1,
      lineOpacity: 0.18,
      majesticColor: "#b8a4ff",
      explains: true,
    },
  ];
  return { x: field.x!, y: field.y!, seed, clock, scene };
})();

export const CHAOS: readonly GalleryPreset[] = [
  {
    id: "lorenz",
    name: "Lorenz butterfly",
    category: "chaos",
    blurb:
      "Lorenz's equations, σ = 10, ρ = 28, β = 8/3, seen from the side: five comets on the strange attractor, each swinging round one wing and then the other, never repeating, their gas drawing the butterfly. Two that start a hair apart are soon on different wings: sensitive dependence on initial conditions, the butterfly effect.",
    xLatex: lorenzPlane.x,
    yLatex: lorenzPlane.y,
    seedLatex: lorenzPlane.seed,
    clockParameters: lorenzPlane.clock,
    scene: lorenzPlane.scene,
    colorScale: 2.5,
    backdrop: "#05030a",
    extent: 10,
    palette: "plasma",
    flow: {
      particleCount: 30_000,
      speed: 1.67,
      trailPersistence: 0.993,
      dropRate: 0.003,
      opacity: 0.45,
      pointSize: 1.3,
      glow: 0.5,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "Lorenz's equations themselves, σ = 10, ρ = 28, β = 8/3: every particle falls onto the butterfly and circles one wing, then the other, never repeating — the strange attractor that named the butterfly effect. The heating, ρ, rises and falls between 25 and 31, and the butterfly breathes with it.",
      // Lorenz's x, y, z scaled into the box: X = x/5.5, Y = y/5.5,
      // Z = (z − 25)/5.5, so ẋ = σ(y − x), ẏ = x(ρ − z) − y and
      // ż = xy − βz become these.
      xLatex: String.raw`10\left(y-x\right)`,
      yLatex: String.raw`x\left(3+3\sin\left(0.15t\right)-5.5z\right)-y`,
      zLatex: String.raw`5.5xy-\frac{8}{3}z-12.12`,
      // Born round the two fixed points at the wings' centres, (±√72, ±√72,
      // 27) in Lorenz's units, from which every orbit spirals out onto them.
      seedLatex: String.raw`e^{-\frac{\left(x-1.543\right)^{2}+\left(y-1.543\right)^{2}+\left(z-0.364\right)^{2}}{2.5}}+e^{-\frac{\left(x+1.543\right)^{2}+\left(y+1.543\right)^{2}+\left(z-0.364\right)^{2}}{2.5}}`,
      look: {
        particles: 15_000,
        speed: 0.5,
        trail: 64,
        lifetime: 15,
        opacity: 0.4,
        glow: 0.2,
        normalizeSpeed: true,
        absorb: false,
        colorMode: "speed",
        backdrop: "#05030a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "thomas",
    name: "Thomas attractor",
    category: "chaos",
    blurb:
      "Thomas's cyclically symmetric system in two variables: ẋ = sin y − bx, ẏ = sin x − by. A plane flow cannot be chaotic (the Poincaré–Bendixson theorem), so here it settles into a lattice of spirals. The damping b drifts between 0.16 and 0.21, and the spirals tighten and loosen.",
    xLatex: String.raw`\sin\left(y\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)x`,
    yLatex: String.raw`\sin\left(x\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)y`,
    colorScale: 0.8,
    backdrop: "#05020c",
    extent: 10,
    palette: "neon",
    flow: {
      particleCount: 40_000,
      speed: 5,
      trailPersistence: 0.97,
      dropRate: 0.004,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "René Thomas's attractor, ẋ = sin y − bx and its two rotations, with b = 0.208186: the same rule in three variables is chaotic, and the particles thread a looping labyrinth that looks the same from all three axes. The damping b drifts between 0.16 and 0.21, from deep chaos to its edge and back.",
      xLatex: String.raw`\sin\left(y\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)x`,
      yLatex: String.raw`\sin\left(z\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)y`,
      zLatex: String.raw`\sin\left(x\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)z`,
      look: {
        particles: 30_000,
        speed: 0.35,
        trail: 64,
        lifetime: 12,
        opacity: 0.4,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#05020c",
        backdropOpacity: 1,
      },
    },
  },
];
