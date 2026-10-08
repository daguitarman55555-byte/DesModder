/** Space: black holes, galaxies, stars and the solar wind. */
import { carriedWorlds, num, rho, separation } from "./latex";
import { figureEight, keplerPair, type PlanarState } from "./orbits";
import type { ClockParameters, GalleryPreset } from "./types";

type Axis = "x" | "y" | "z";

/**
 * Bodies whose motion the CPU works out each frame (see orbits.ts), as the
 * names the field reads them by: `${p}_{x1}` is body 1's x, `${v}_{x1}` its
 * velocity's. In the box, the orbit's plane is tilted `tilt` about the
 * x-axis. Returns each body's position and velocity as LaTeX names, and the
 * clock parameters that fill them in.
 */
function movingBodies(
  count: number,
  axes: readonly Axis[],
  letters: { position: string; velocity: string },
  tilt: number,
  state: (t: number) => PlanarState
) {
  const name = (letter: string, axis: Axis, i: number) =>
    `${letter}_{${axis}${i + 1}}`;
  const bodies = Array.from({ length: count }, (_, i) => ({
    position: Object.fromEntries(
      axes.map((a) => [a, name(letters.position, a, i)])
    ) as Partial<Record<Axis, string>>,
    velocity: Object.fromEntries(
      axes.map((a) => [a, name(letters.velocity, a, i)])
    ) as Partial<Record<Axis, string>>,
  }));
  const names = [letters.position, letters.velocity].flatMap((letter) =>
    Array.from({ length: count }, (_, i) =>
      axes.map((a) => name(letter, a, i))
    ).flat()
  );
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  // The plane's (x, y) laid into the box: y along (0, cos, sin).
  const place = (x: number, y: number) =>
    axes.length === 3 ? [x, c * y, s * y] : [x, y];
  const clock: ClockParameters = {
    names,
    at: (t) => {
      const st = state(t);
      const out: number[] = [];
      for (let i = 0; i < count; i++) out.push(...place(st.x[i], st.y[i]));
      for (let i = 0; i < count; i++) out.push(...place(st.vx[i], st.vy[i]));
      return out;
    },
  };
  return { bodies, clock, normal: [0, -s, c] as const };
}

/**
 * Three stars on the figure-eight orbit, each carrying a cluster of glowing
 * gas round with it, so their trails draw the eight as the well-known
 * animations of it do. Outside the clusters, the stars' gravity: with matter
 * everywhere, gas is seen falling in towards them. In the box the orbit's
 * plane is tilted half a radian, so the eight reads as an eight from
 * Desmos's default view.
 */
const EIGHT_TILT = 0.5;
const EIGHT_W = 0.6;
function eight(axes: readonly Axis[], size: number) {
  const three = axes.length === 3;
  const moving = movingBodies(
    3,
    axes,
    { position: "S", velocity: "V" },
    three ? EIGHT_TILT : 0,
    (t) => figureEight(t, EIGHT_W, size)
  );
  const field = carriedWorlds(
    moving.bodies.map((b) => ({ ...b, reach: size * 0.2, swirl: size * 0.5 })),
    axes,
    moving.normal,
    1
  );
  // Each star's cluster, bright and tight. Nothing else: with the seed on,
  // the picture is the orbit, as the animations of it show it; switched off,
  // the gravity drawing in the gas round it is the rest of the field.
  const seed = moving.bodies
    .map(
      (b) =>
        String.raw`e^{-\frac{${separation(b.position, axes).r2}}{${num((size * (three ? 0.1 : 0.07)) ** 2)}}}`
    )
    .join("+");
  return { ...field, seed, clock: moving.clock };
}
const CLUSTER_2D = eight(["x", "y"], 6);
const CLUSTER_3D = eight(["x", "y", "z"], 3.6);

/**
 * A double planet: a world and a moon of nearly half its mass, like Pluto
 * and Charon, on Kepler ellipses round their common centre of mass, each
 * carrying its own circling material; the larger one has a ring.
 */
function doublePlanet(
  axes: readonly Axis[],
  o: {
    a: number;
    e: number;
    tilt: number;
    reach: readonly [number, number];
    ball: readonly [number, number];
    ring: number;
    swirl: readonly [number, number];
  }
) {
  const moving = movingBodies(
    2,
    axes,
    { position: "P", velocity: "W" },
    o.tilt,
    (t) => keplerPair(t, { a: o.a, e: o.e, n: 0.4, ratio: 0.45 })
  );
  const field = carriedWorlds(
    moving.bodies.map((b, i) => ({
      ...b,
      reach: o.reach[i],
      // Faster round each world than the world moves, so no side of its
      // material stands still in the frame it is drawn in, which drew dark.
      swirl: o.swirl[i],
    })),
    axes,
    moving.normal
  );
  const { normal } = moving;
  // Each world a ball of its material; round the larger, a thin ring in the
  // orbit's plane, as Saturn's lies in its equator.
  const seeds = moving.bodies.map((b, i) => {
    const { d, r2 } = separation(b.position, axes);
    const ball = String.raw`e^{-\frac{${r2}}{${num(o.ball[i] ** 2)}}}`;
    if (i !== 0) return ball;
    const height =
      axes.length === 2
        ? "0"
        : String.raw`\left(${num(normal[1])}${d.y}+${num(normal[2])}${d.z}\right)`.replace(
            /\+-/g,
            "-"
          );
    const across = axes.length === 2 ? r2 : String.raw`${r2}-${height}^{2}`;
    const flat =
      axes.length === 2 ? "" : String.raw`e^{-\frac{${height}^{2}}{0.004}}`;
    return String.raw`${ball}+0.6${flat}e^{-\frac{\left(\sqrt{${across}}-${num(o.ring)}\right)^{2}}{${num((0.12 * o.ring) ** 2)}}}`;
  });
  return { ...field, seed: seeds.join("+"), clock: moving.clock };
}

const PLANETS_2D = doublePlanet(["x", "y"], {
  a: 7.5,
  e: 0.35,
  tilt: 0,
  reach: [2.6, 1.3],
  ball: [0.7, 0.55],
  ring: 2,
  swirl: [2.5, 2],
});
const PLANETS_3D = doublePlanet(["x", "y", "z"], {
  a: 4.2,
  e: 0.3,
  tilt: 0.35,
  reach: [1.5, 0.8],
  ball: [0.35, 0.28],
  ring: 1.05,
  swirl: [1.4, 1],
});

/**
 * A pulsar: a magnetised neutron star spinning about z, its magnetic axis m
 * tilted α from the spin, m = (sin α cos t, sin α sin t, cos α). Within a
 * couple of radii, the closed loops of its dipole field, (3(m·r)r − m r²)/r²
 * (the dipole's direction, at a strength that does not blow up at the
 * star); further out, the wind streaming radially away, fastest along the
 * magnetic axis, wound slightly by the spin. Where the plasma is born is what
 * draws it as a lighthouse: two narrow beams along ±m, sweeping round with
 * the star, a torus of wind in the spin equator, and the loops.
 */
function pulsar(axes: readonly ("x" | "y" | "z")[]) {
  const three = axes.length === 3;
  const a = three ? 0.6 : Math.PI / 2;
  const m = [
    String.raw`${num(Math.sin(a))}\cos\left(t\right)`.replace(/^1\\/, "\\"),
    String.raw`${num(Math.sin(a))}\sin\left(t\right)`.replace(/^1\\/, "\\"),
    num(Math.cos(a)),
  ];
  const r2 = axes.map((ax) => `${ax}^{2}`).join("+");
  const mr = axes.map((ax, i) => `${m[i]}${ax}`).join("+");
  // In the plane the dipole is the plane's own, 2(m·r)r − m r², which keeps
  // particles spread: it is divergence-free in the plane, where a slice of
  // the 3D one is not.
  const k = three ? 3 : 2;
  const loops = three ? "0.2" : "0.03";
  const g = String.raw`e^{-${loops}\left(${r2}\right)^{2}}`;
  const beam = String.raw`\left(\frac{\left(${mr}\right)^{2}}{${r2}}\right)^{20}`;
  const spin = { x: "-0.3y", y: "+0.3x", z: "" };
  const out: Partial<Record<"x" | "y" | "z", string>> = {};
  axes.forEach((ax, i) => {
    const dip = String.raw`\frac{${k}${ax}\left(${mr}\right)-${m[i]}\left(${r2}\right)}{${r2}}`;
    const wind = String.raw`\frac{\left(0.35+2.2${beam}\right)${ax}${spin[ax]}}{\sqrt{${r2}}}`;
    out[ax] = String.raw`0.9${g}${dip}+\left(1-${g}\right)${wind}`;
  });
  const star = three ? 0.8 : 1.6;
  const beams = String.raw`\frac{\left(\frac{\left(${mr}\right)^{2}}{${r2}}\right)^{40}}{1+e^{-8\left(\sqrt{${r2}}-${num(star + 0.1)}\right)}}`;
  const shell = String.raw`\frac{0.15}{\left(1+e^{8\left(\sqrt{${r2}}-${num(star * 2)}\right)}\right)\left(1+e^{-12\left(\sqrt{${r2}}-${num(star)}\right)}\right)}`;
  const torus = three
    ? String.raw`+0.3e^{-12z^{2}}e^{-\left(${rho}-2.4\right)^{2}}`
    : "";
  // The star itself, glowing: its own field inside it keeps its matter
  // turning over within.
  const body = String.raw`2e^{-\frac{${r2}}{${num(0.5 * star * star)}}}`;
  return { ...out, seed: `${beams}+${shell}+${body}${torus}` };
}

/**
 * A galaxy's matter: two logarithmic arms, cos(2θ − 4.5 ln r) — a pitch of
 * about 24°, a typical Sb spiral's — turning slowly as a density wave does,
 * raised to a high power so the arms are narrow; beaded with star-forming
 * clumps; on an exponential disk with an edge; and a round bulge.
 */
function galaxySeed(o: {
  power: number;
  scale: number;
  disk: number;
  edge: number;
  bulge: string;
  thin: string;
}) {
  const r2 = String.raw`x^{2}+y^{2}`;
  const phase = String.raw`2.25\ln\left(${r2}+0.01\right)-0.15t`;
  const arm = String.raw`\left(\frac{1+\frac{\left(x^{2}-y^{2}\right)\cos\left(${phase}\right)+2xy\sin\left(${phase}\right)}{${r2}+0.01}}{2}\right)^{${o.power}}`;
  const knots = String.raw`\left(0.45+0.55\sin\left(${num(9 / o.scale)}\sqrt{${r2}}+3\arctan\left(y,x\right)\right)^{2}\right)`;
  const disk = String.raw`\frac{e^{-${num(o.disk)}\sqrt{${r2}}}}{1+e^{${num(4 / o.scale)}\left(\sqrt{${r2}}-${num(o.edge)}\right)}}`;
  return String.raw`${o.thin}\left(0.03+${arm}${knots}\right)${disk}+${o.bulge}`;
}

const GALAXY_2D_SEED = galaxySeed({
  power: 36,
  scale: 2,
  disk: 0.12,
  edge: 9,
  bulge: String.raw`e^{-0.6\left(x^{2}+y^{2}\right)}`,
  thin: "",
});
const GALAXY_3D_SEED = galaxySeed({
  power: 24,
  scale: 1,
  disk: 0.3,
  edge: 4.6,
  bulge: String.raw`0.5e^{-2.5\left(x^{2}+y^{2}+4z^{2}\right)}`,
  thin: String.raw`e^{-\frac{z^{2}}{0.02}}`,
});

const PULSAR_2D = pulsar(["x", "y"]);
const PULSAR_3D = pulsar(["x", "y", "z"]);

export const SPACE: readonly GalleryPreset[] = [
  {
    id: "black-hole",
    name: "Black hole",
    category: "space",
    blurb:
      "An accretion disk seen from above: gas on Keplerian orbits, faster and hotter inward, plunging into the horizon once inside the innermost stable orbit. The black disc is the hole's shadow, ringed by the light that went round it. A spiral density wave turns through the disk.",
    // Rotation plus a drift toward the centre. The 3/4 power makes the speed
    // go as r^-1/2, which is the Keplerian falloff a real disc has. The drift
    // is slow across the disk and fast close in, where nothing orbits stably
    // and gas plunges: e^(−r²/4) switches it on there.
    xLatex: String.raw`\frac{3\left(-y-x\left(0.05+0.9e^{-0.25\left(x^{2}+y^{2}\right)}\right)\right)}{\left(x^{2}+y^{2}+0.1\right)^{0.75}}`,
    yLatex: String.raw`\frac{3\left(x-y\left(0.05+0.9e^{-0.25\left(x^{2}+y^{2}\right)}\right)\right)}{\left(x^{2}+y^{2}+0.1\right)^{0.75}}`,
    // The disk from the innermost stable orbit outward, ringed, denser
    // inward; and a faint haze close in, gas being drawn down into the hole.
    seedLatex: String.raw`\frac{\left(0.3+0.7\sin\left(2.75\sqrt{x^{2}+y^{2}}+\arctan\left(y,x\right)-0.8t\right)^{2}\right)\cdot\frac{3}{\sqrt{x^{2}+y^{2}}}}{\left(1+e^{-7\left(\sqrt{x^{2}+y^{2}}-2.8\right)}\right)\left(1+e^{2.5\left(\sqrt{x^{2}+y^{2}}-8\right)}\right)}+0.05e^{-0.3\left(x^{2}+y^{2}\right)}`,
    lensHorizon: 0.6,
    colorScale: 1,
    palette: "blackbody",
    backdrop: "#000000",
    flow: {
      particleCount: 22_000,
      glow: 0.3,
      opacity: 0.25,
      pointSize: 1.4,
      normalizeSpeed: false,
      speed: 3,
      trailPersistence: 0.97,
      dropRate: 0.003,
    },
    extent: 10,
    space: {
      blurb:
        "A black hole's accretion disk: gas on Keplerian orbits, hotter and faster inward, drifting in to the horizon. The disk behind the hole is seen bent over and under it by its gravity, and the side coming towards you is brighter. A spiral density wave turns through it.",
      // Kepler's v ∝ 1/√r, an inward drift that is slow across the disk and
      // fast close in, where gas plunges, and a pull to the plane that keeps
      // the disk thin. Softened at the centre, where the horizon takes what
      // arrives.
      xLatex: String.raw`\frac{-y-x\left(0.06+0.9e^{-x^{2}-y^{2}-z^{2}}\right)}{\left(x^{2}+y^{2}+0.05\right)^{0.75}}`,
      yLatex: String.raw`\frac{x-y\left(0.06+0.9e^{-x^{2}-y^{2}-z^{2}}\right)}{\left(x^{2}+y^{2}+0.05\right)^{0.75}}`,
      zLatex: String.raw`\frac{-2z}{\left(x^{2}+y^{2}+0.05\right)^{0.75}}`,
      // A thin disk from the innermost stable orbit, three horizon radii, out
      // to the edge of the box; denser inward, as a disk's light is; with the
      // faint ringed banding a real one shows. And a faint haze round the
      // hole, above and below the disk too: gas being drawn in.
      seedLatex: String.raw`e^{-\frac{z^{2}}{0.006}}\cdot\frac{1.6}{${rho}}\cdot\frac{0.65+0.35\sin\left(11${rho}+\arctan\left(y,x\right)-0.8t\right)}{\left(1+e^{-14\left(${rho}-1.4\right)}\right)\left(1+e^{5\left(${rho}-4.5\right)}\right)}+0.005e^{-0.6\left(x^{2}+y^{2}+z^{2}\right)}`,
      lensHorizon: 0.45,
      look: {
        particles: 36_000,
        speed: 0.3,
        trail: 64,
        lifetime: 6,
        opacity: 0.5,
        glow: 0.12,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#000000",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "spiral-galaxy",
    name: "Spiral galaxy",
    category: "space",
    blurb:
      "A spiral galaxy face-on: stars on a flat rotation curve round a golden bulge of old stars, and two arms where the young blue ones are. The arms are a density wave the stars pass through, lit by stars too short-lived to leave it.",
    xLatex: String.raw`\frac{-2y}{1.5+\sqrt{x^{2}+y^{2}}}`,
    yLatex: String.raw`\frac{2x}{1.5+\sqrt{x^{2}+y^{2}}}`,
    seedLatex: GALAXY_2D_SEED,
    colorScale: 1.4,
    palette: "galaxy",
    backdrop: "#020206",
    flow: {
      particleCount: 50_000,
      glow: 0.5,
      opacity: 0.5,
      pointSize: 1.4,
      normalizeSpeed: false,
      speed: 2,
      trailPersistence: 0.93,
      // Short lives, as the young blue stars that light real arms have.
      dropRate: 0.08,
    },
    extent: 10,
    space: {
      blurb:
        "A spiral galaxy: a thin disk of stars on a flat rotation curve — the curve that first told astronomers about dark matter — round a golden bulge of old stars. Its two arms are a density wave the stars pass through, beaded with clusters and lit by young blue stars too short-lived to leave it.",
      xLatex: String.raw`\frac{-y}{0.6+${rho}}`,
      yLatex: String.raw`\frac{x}{0.6+${rho}}`,
      // A gentle pull to the plane: a stronger one put speeds off the disk
      // into Auto's colour scale, and the disk came out cream, not blue.
      zLatex: String.raw`-0.15z`,
      seedLatex: GALAXY_3D_SEED,
      look: {
        particles: 90_000,
        speed: 0.12,
        trail: 16,
        // About the time a star takes to cross an arm: any longer and it carries
        // the arm's light round into a ring.
        lifetime: 0.35,
        // The flat part of the rotation curve, |F| ≈ 0.85, well into the
        // blue; the bulge's slow centre in the gold.
        scale: 0.6,
        // Ninety thousand stars in a disk this thin add up to white at any
        // more: their colour is in the faint ones.
        opacity: 0.3,
        glow: 0.25,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#020206",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    category: "space",
    blurb:
      "Curtains that drift and fold, because both components read the clock.",
    // Seen from the side: rays falling down the field lines to a sharp,
    // folding lower edge, slowing as they reach it, which piles light there.
    xLatex: String.raw`0.05`,
    yLatex: String.raw`-0.4\left(y-\left(-4+1.2\sin\left(0.35x+0.3t\right)\right)+0.3\right)`,
    seedLatex: String.raw`\frac{e^{-0.45\left(y-\left(-4+1.2\sin\left(0.35x+0.3t\right)\right)\right)}}{1+e^{-6\left(y-\left(-4+1.2\sin\left(0.35x+0.3t\right)\right)\right)}}\cdot\frac{0.6+0.4\sin\left(3x+0.5t\right)^{2}}{1+e^{1.5\left(\left|x\right|-8\right)}}`,
    colorScale: 2,
    palette: "auroral",
    backdrop: "#02060a",
    flow: {
      particleCount: 35_000,
      glow: 0.4,
      opacity: 0.35,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 3,
      trailPersistence: 0.95,
      dropRate: 0.008,
    },
    extent: 10,
    timeSpeed: 0.6,
    space: {
      blurb:
        "Aurora curtains: a folded sheet hanging along the magnetic field, its rays streaming down to a sharp, bright lower edge where they stop, the curtain drifting and folding with the clock.",
      // Down the field lines to the lower edge at z = −3, slowing as they
      // reach it, which is what piles light into a sharp bottom border; and a
      // drift along the fold.
      xLatex: String.raw`0.06`,
      yLatex: String.raw`0.05\cos\left(0.55x+0.35t\right)`,
      zLatex: String.raw`-0.35\left(z+3.2\right)`,
      // A thin folded sheet, starting sharply at the lower edge and fading
      // with height.
      seedLatex: String.raw`\frac{e^{-8\left(y-1.6\sin\left(0.55x+0.35t\right)\right)^{2}}e^{-0.3\left(z+3\right)}}{1+e^{-8\left(z+3\right)}}`,
      look: {
        particles: 60_000,
        speed: 0.25,
        trail: 40,
        lifetime: 3,
        opacity: 0.3,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#02060a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "pulsar",
    name: "Pulsar",
    category: "space",
    blurb:
      "A pulsar seen down its spin axis: a neutron star whose magnetic field is locked to it, closed loops near the star, and two beams of radiation from its magnetic poles sweeping round like a lighthouse's. Each sweep across the Earth is one pulse.",
    xLatex: PULSAR_2D.x!,
    yLatex: PULSAR_2D.y!,
    seedLatex: PULSAR_2D.seed,
    colorScale: 2.5,
    palette: "magnetar",
    backdrop: "#03020c",
    flow: {
      particleCount: 35_000,
      glow: 0.45,
      opacity: 0.45,
      pointSize: 1.4,
      normalizeSpeed: false,
      speed: 4,
      trailPersistence: 0.9,
      dropRate: 0.04,
    },
    extent: 10,
    timeSpeed: 0.35,
    space: {
      blurb:
        "A pulsar: a spinning neutron star whose magnetic axis is tilted from its spin axis. Near the star, the closed loops of its field; from its magnetic poles, two narrow beams sweeping round with every turn, like a lighthouse's; and round its equator, a torus of wind, as the Crab pulsar's is.",
      xLatex: PULSAR_3D.x!,
      yLatex: PULSAR_3D.y!,
      zLatex: PULSAR_3D.z!,
      seedLatex: PULSAR_3D.seed,
      look: {
        palette: "magnetar",
        particles: 32_000,
        speed: 0.35,
        trail: 24,
        lifetime: 1.2,
        opacity: 0.5,
        glow: 0.3,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#03020c",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "star-cluster",
    name: "Three-body eight",
    category: "space",
    blurb:
      "Three equal stars on the figure-eight orbit, the well-known choreography in which three equal masses share a single path (Chenciner and Montgomery, 2000), each a third of an orbit behind the next. Each carries a cluster of glowing gas, and their trails draw the eight.",
    xLatex: CLUSTER_2D.x!,
    yLatex: CLUSTER_2D.y!,
    seedLatex: CLUSTER_2D.seed,
    clockParameters: CLUSTER_2D.clock,
    colorScale: 4,
    palette: "blackbody",
    backdrop: "#05030c",
    flow: {
      particleCount: 20_000,
      glow: 0.6,
      opacity: 0.5,
      pointSize: 1.4,
      normalizeSpeed: false,
      // On the clock's time (see the double planet), and long-lived with
      // long trails, so the trails are the orbit.
      speed: 1.67,
      trailPersistence: 0.995,
      dropRate: 0.002,
    },
    extent: 10,
    space: {
      blurb:
        "Three equal stars on the figure-eight orbit, the stable three-body orbit Chenciner and Montgomery proved exists, in a plane tilted to the view. Each carries a cluster of glowing gas, so three comets chase each other round the eight, their trails drawing it; outside the clusters, their gravity draws in the gas.",
      xLatex: CLUSTER_3D.x!,
      yLatex: CLUSTER_3D.y!,
      zLatex: CLUSTER_3D.z!,
      seedLatex: CLUSTER_3D.seed,
      clockParameters: CLUSTER_3D.clock,
      look: {
        palette: "blackbody",
        particles: 20_000,
        speed: 0.3,
        // Half-width 5 × speed 0.3: the gas on the clock's time.
        scale: 1.5,
        trail: 64,
        lifetime: 10,
        opacity: 0.5,
        glow: 0.35,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#05030c",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "binary",
    name: "Double planet",
    category: "space",
    blurb:
      "Two worlds orbiting each other, like Pluto and Charon: the smaller has nearly half the larger's mass, so both swing round their common centre on Kepler ellipses, fastest when closest. Each carries its circling material with it, and the larger a ring.",
    xLatex: PLANETS_2D.x!,
    yLatex: PLANETS_2D.y!,
    seedLatex: PLANETS_2D.seed,
    clockParameters: PLANETS_2D.clock,
    colorScale: 1.6,
    palette: "worlds",
    backdrop: "#02040c",
    flow: {
      particleCount: 30_000,
      glow: 0.45,
      opacity: 0.45,
      pointSize: 1.4,
      normalizeSpeed: false,
      // A step is 0.01 × speed units of t, and there are about sixty a
      // second: at 1.67 the material keeps time with the worlds carrying it.
      speed: 1.67,
      trailPersistence: 0.97,
      dropRate: 0.006,
    },
    extent: 10,
    space: {
      blurb:
        "Two worlds orbiting each other on Kepler ellipses round their common centre of mass, in a plane tilted to the view, like Pluto and Charon. Each carries the material circling it; the larger has a ring in its orbit's plane. Their trails draw the ellipses.",
      xLatex: PLANETS_3D.x!,
      yLatex: PLANETS_3D.y!,
      zLatex: PLANETS_3D.z!,
      seedLatex: PLANETS_3D.seed,
      clockParameters: PLANETS_3D.clock,
      look: {
        palette: "worlds",
        particles: 30_000,
        speed: 0.3,
        // Half-width 5 × speed 0.3: the material on the clock's time.
        scale: 1.5,
        trail: 64,
        lifetime: 5,
        opacity: 0.3,
        glow: 0.3,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#02040c",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "solar-wind",
    name: "Solar wind",
    category: "space",
    blurb:
      "The Sun's magnetic field carried out by the solar wind while the Sun turns, wound into Parker's spiral. Slow wind, about 400 km/s, marks the sector boundaries, where the spiral winds tighter; fast wind, about 750 km/s, is bright.",
    // Along B ∝ r̂ − (Ωr/v)φ̂, at the wind's speed v: 0.53 (slow) to 1 (fast),
    // slow at four sector boundaries that spiral out with the field and turn.
    xLatex: String.raw`\frac{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)\left(x+\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}y\right)}{\sqrt{x^{2}+y^{2}}\sqrt{1+\left(\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}\right)^{2}}}`,
    yLatex: String.raw`\frac{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)\left(y-\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}x\right)}{\sqrt{x^{2}+y^{2}}\sqrt{1+\left(\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}\right)^{2}}}`,
    seedLatex: String.raw`e^{-3\left(\sqrt{x^{2}+y^{2}}-1.2\right)^{2}}`,
    colorScale: 0.6,
    backdrop: "#070305",
    extent: 10,
    palette: "sunset",
    flow: {
      particleCount: 40_000,
      speed: 6,
      trailPersistence: 0.97,
      dropRate: 0.004,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "Parker's spiral in 3D, with the heliospheric current sheet: the Sun's tilted magnetic equator, flung out and wound up into the wavy 'ballerina skirt'. Particles are born on the skirt; the slow wind rides it.",
      // B ∝ r̂ − (Ωρ/v)φ̂, which winds faster near the equator; the current
      // sheet at z = 0.35ρ sin(φ + Ωr/v − Ωt), slow wind within it.
      xLatex: String.raw`\frac{\frac{x}{\sqrt{x^{2}+y^{2}+z^{2}}}+\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}y}{\sqrt{1+\left(\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}\right)^{2}\left(x^{2}+y^{2}\right)}}\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)`,
      yLatex: String.raw`\frac{\frac{y}{\sqrt{x^{2}+y^{2}+z^{2}}}-\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}x}{\sqrt{1+\left(\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}\right)^{2}\left(x^{2}+y^{2}\right)}}\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)`,
      zLatex: String.raw`\frac{\frac{z}{\sqrt{x^{2}+y^{2}+z^{2}}}}{\sqrt{1+\left(\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}\right)^{2}\left(x^{2}+y^{2}\right)}}\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)`,
      seedLatex: String.raw`\frac{e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.05}}}{1+e^{-4\left(\sqrt{x^{2}+y^{2}+z^{2}}-1.2\right)}}+0.5e^{-6\left(\sqrt{x^{2}+y^{2}+z^{2}}-1\right)^{2}}`,
      look: {
        particles: 40_000,
        speed: 0.3,
        trail: 64,
        lifetime: 6,
        opacity: 0.4,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#070305",
        backdropOpacity: 1,
      },
    },
  },
];
