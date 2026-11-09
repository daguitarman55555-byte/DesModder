/** Space: a black hole, a pulsar, crashing stars and a double planet. */
import { carriedWorlds, num, rho, separation } from "./latex";
import { keplerPair, type PlanarState } from "./orbits";
import {
  flashAt,
  integrateThreeBody,
  playbackScene,
  stateAt,
  type ThreeBodyRun,
  type ThreeBodyStart,
} from "./three-body";
import type {
  ClockParameters,
  GalleryPreset,
  SceneItem,
  SpaceLook,
} from "./types";

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

/** The stars' colours, and the white a crash flashes and leaves. */
const STARS = ["#ffd27a", "#8ec9ff", "#ff9a7a", "#ffffff"] as const;

/**
 * A three-body run that crashes, as a field and its clock: each star
 * carries its gas as in the eight, and a crash is a flash of gas born where
 * it happened (`F_{c}` at `C`), which the merged star then carries off.
 * The run is scaled into the picture by `scale` and played at `rate` of its
 * time a second; in the box, its plane is tilted `tilt`.
 */
function crashing(
  axes: readonly Axis[],
  run: ThreeBodyRun,
  o: { scale: number; rate: number; tilt: number }
) {
  const three = axes.length === 3;
  const tilt = three ? o.tilt : 0;
  const [k, v] = [o.scale, o.scale * o.rate];
  const moving = movingBodies(
    3,
    axes,
    { position: "S", velocity: "V" },
    tilt,
    (t) => {
      const s = stateAt(run, o.rate * t);
      return {
        x: s.x.map((a) => a * k),
        y: s.y.map((a) => a * k),
        vx: s.vx.map((a) => a * v),
        vy: s.vy.map((a) => a * v),
      };
    }
  );
  const field = carriedWorlds(
    moving.bodies.map((b) => ({ ...b, reach: k * 0.2, swirl: k * 0.5 })),
    axes,
    moving.normal,
    1
  );
  const centre = Object.fromEntries(axes.map((a) => [a, `C_{${a}}`]));
  const [c, s] = [Math.cos(tilt), Math.sin(tilt)];
  const clock: ClockParameters = {
    names: [...moving.clock.names, "F_{c}", ...axes.map((a) => `C_{${a}}`)],
    at: (t) => {
      const f = flashAt(run, o.rate * t);
      const at = three
        ? [f.x * k, c * f.y * k, s * f.y * k]
        : [f.x * k, f.y * k];
      return [...moving.clock.at(t), f.brightness, ...at];
    },
  };
  const width = num((k * (three ? 0.1 : 0.07)) ** 2);
  const seed = [
    ...moving.bodies.map(
      (b) =>
        String.raw`e^{-\frac{${separation(b.position, axes).r2}}{${width}}}`
    ),
    String.raw`4F_{c}e^{-\frac{${separation(centre, axes).r2}}{${num((k * 0.3) ** 2)}}}`,
  ].join("+");
  return { ...field, seed, clock };
}

/**
 * Lagrange's equilateral triangle, three equal stars turning about their
 * centre, with one star 12% faster: equal masses make the triangle unstable,
 * so it turns twice, breaks up, passes close and crashes, and what the crash
 * leaves orbits the third star. Each star's radius is 0.05 of the triangle's.
 */
function lagrangeRun() {
  const turn = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  // Equal masses 1 at radius 1, sides √3: ω² = 3/√3³.
  const w = Math.sqrt(3 / Math.sqrt(3) ** 3);
  const kick = [1.12, 1, 1];
  const vx = turn.map((q, i) => -w * Math.sin(q) * kick[i]);
  const vy = turn.map((q, i) => w * Math.cos(q) * kick[i]);
  // The kick's momentum taken out, so the centre of mass stays put.
  const [px, py] = [vx, vy].map((u) => u.reduce((a, b) => a + b, 0) / 3);
  return integrateThreeBody({
    masses: [1, 1, 1],
    x: turn.map(Math.cos),
    y: turn.map(Math.sin),
    vx: vx.map((u) => u - px),
    vy: vy.map((u) => u - py),
    radius: 0.05,
    duration: 25.4,
    dt: 0.02,
  });
}
/**
 * Starts that end in a crash, found by searching random ones offline: three
 * stars of masses between 0.6 and 1.6, let go near one another with a little
 * spin, their centre of mass at rest at the origin, kept when two crash
 * between 3 and 22 units in and nobody has left the picture by then: 29
 * of them, and Lagrange's triangle makes 30 (Rafael asked for 20 to 30).
 * Searching takes seconds, which is why the finds are written down here
 * rather than made when the preset is chosen (Rafael, 2026-11-08: "randomly
 * cycles through a library"). Each runs seven units past its first crash.
 */
const CRASH_STARTS: readonly ThreeBodyStart[] = [
  {
    masses: [1.4, 1.1, 0.9],
    x: [-0.81, -0.21, 1.517],
    y: [-0.682, 1.059, -0.234],
    vx: [-0.097, 0.242, -0.145],
    vy: [0.259, 0.058, -0.473],
    radius: 0.05,
    duration: 10.4,
    dt: 0.02,
  },
  {
    masses: [1.3, 1, 0.7],
    x: [-0.392, -0.111, 0.888],
    y: [0.753, -1.317, 0.484],
    vx: [0.362, -0.447, -0.034],
    vy: [0.192, 0.059, -0.441],
    radius: 0.05,
    duration: 12.1,
    dt: 0.02,
  },
  {
    masses: [1.1, 0.8, 0.7],
    x: [-0.412, -0.237, 0.918],
    y: [1.294, -1.253, -0.602],
    vx: [-0.486, 0.485, 0.209],
    vy: [-0.17, -0.087, 0.368],
    radius: 0.05,
    duration: 22.6,
    dt: 0.02,
  },
  {
    masses: [1.4, 1.2, 0.8],
    x: [1.125, -0.581, -1.098],
    y: [-0.389, 0.956, -0.753],
    vx: [0.155, -0.309, 0.193],
    vy: [0.555, -0.26, -0.58],
    radius: 0.05,
    duration: 11.9,
    dt: 0.02,
  },
  {
    masses: [0.6, 1, 1.4],
    x: [-1.084, -0.677, 0.948],
    y: [1.133, -1.193, 0.366],
    vx: [0.017, -0.26, 0.178],
    vy: [-0.047, 0.069, -0.029],
    radius: 0.05,
    duration: 21,
    dt: 0.02,
  },
  {
    masses: [1.5, 0.7, 0.9],
    x: [1.129, -1.259, -0.902],
    y: [-0.178, 0.817, -0.338],
    vx: [0.041, -0.339, 0.196],
    vy: [0.42, -0.442, -0.357],
    radius: 0.05,
    duration: 13.9,
    dt: 0.02,
  },
  {
    masses: [1.2, 0.8, 1],
    x: [-0.471, 0.677, 0.023],
    y: [0.841, 0.311, -1.258],
    vx: [-0.284, -0.205, 0.505],
    vy: [-0.259, 0.439, -0.041],
    radius: 0.05,
    duration: 10.3,
    dt: 0.02,
  },
  {
    masses: [0.8, 0.9, 1.5],
    x: [0.214, -1.677, 0.892],
    y: [-0.675, 0.07, 0.318],
    vx: [-0.382, 0.001, 0.203],
    vy: [-0.251, 0.692, -0.281],
    radius: 0.05,
    duration: 10.6,
    dt: 0.02,
  },
  {
    masses: [1.5, 1, 0.8],
    x: [-0.193, 0.66, -0.462],
    y: [1.145, -0.615, -1.378],
    vx: [0.424, -0.1, -0.671],
    vy: [0.212, -0.372, 0.068],
    radius: 0.05,
    duration: 13.6,
    dt: 0.02,
  },
  {
    masses: [0.8, 1.1, 1.4],
    x: [-1.2, 0.233, 0.502],
    y: [-0.294, -0.848, 0.834],
    vx: [-0.003, 0.451, -0.353],
    vy: [-0.673, 0.253, 0.186],
    radius: 0.05,
    duration: 22.4,
    dt: 0.02,
  },
  {
    masses: [0.8, 1.4, 1.6],
    x: [-1.017, 0.496, 0.074],
    y: [-1.024, -0.719, 1.141],
    vx: [0.291, 0.383, -0.481],
    vy: [-0.309, 0.098, 0.068],
    radius: 0.05,
    duration: 13.9,
    dt: 0.02,
  },
  {
    masses: [1.3, 1.5, 0.8],
    x: [-0.601, 1.035, -0.964],
    y: [0.893, -0.073, -1.314],
    vx: [0.316, 0.061, -0.629],
    vy: [0.25, -0.313, 0.182],
    radius: 0.05,
    duration: 12.2,
    dt: 0.02,
  },
  {
    masses: [1.1, 1.1, 1.2],
    x: [0.044, 1.084, -1.034],
    y: [-0.547, 0.72, -0.158],
    vx: [0.343, -0.455, 0.103],
    vy: [0.109, 0.543, -0.598],
    radius: 0.05,
    duration: 10.9,
    dt: 0.02,
  },
  {
    masses: [0.7, 1, 0.7],
    x: [-0.428, -0.569, 1.241],
    y: [0.944, -0.933, 0.389],
    vx: [-0.36, 0.342, -0.129],
    vy: [-0.209, -0.191, 0.481],
    radius: 0.05,
    duration: 23.6,
    dt: 0.02,
  },
  {
    masses: [1.4, 0.9, 0.7],
    x: [-0.762, 0.801, 0.495],
    y: [-0.649, -0.267, 1.642],
    vx: [-0.135, -0.164, 0.482],
    vy: [0.324, -0.275, -0.295],
    radius: 0.05,
    duration: 10,
    dt: 0.02,
  },
  {
    masses: [0.7, 0.7, 0.6],
    x: [0.975, -1.22, 0.286],
    y: [0.104, -0.728, 0.727],
    vx: [0.053, 0.377, -0.503],
    vy: [0.361, -0.438, 0.09],
    radius: 0.05,
    duration: 10.7,
    dt: 0.02,
  },
  {
    masses: [0.7, 0.9, 1.5],
    x: [0.636, 0.728, -0.733],
    y: [-0.663, 1.124, -0.365],
    vx: [-0.228, 0.491, -0.188],
    vy: [-0.314, -0.343, 0.352],
    radius: 0.05,
    duration: 14.2,
    dt: 0.02,
  },
  {
    masses: [1.5, 0.7, 0.7],
    x: [0.928, -1.019, -0.97],
    y: [0.046, 0.616, -0.715],
    vx: [-0.015, -0.222, 0.255],
    vy: [0.352, -0.424, -0.329],
    radius: 0.05,
    duration: 10.1,
    dt: 0.02,
  },
  {
    masses: [1.2, 1.5, 0.8],
    x: [-0.309, -0.49, 1.383],
    y: [1.026, -0.949, 0.241],
    vx: [-0.332, 0.351, -0.16],
    vy: [-0.234, -0.136, 0.606],
    radius: 0.05,
    duration: 12.1,
    dt: 0.02,
  },
  {
    masses: [1.3, 1.3, 1],
    x: [-0.301, 0.612, -0.403],
    y: [0.43, 0.836, -1.645],
    vx: [-0.096, -0.433, 0.688],
    vy: [-0.331, 0.383, -0.067],
    radius: 0.05,
    duration: 13.3,
    dt: 0.02,
  },
  {
    masses: [1, 0.9, 0.7],
    x: [0.334, -0.619, 0.32],
    y: [-1.091, 0.76, 0.581],
    vx: [-0.48, 0.353, 0.231],
    vy: [-0.065, 0.253, -0.233],
    radius: 0.05,
    duration: 11.5,
    dt: 0.02,
  },
  {
    masses: [1.5, 1.2, 1.3],
    x: [0.966, -0.136, -0.989],
    y: [-0.503, 1.077, -0.414],
    vx: [0.096, -0.303, 0.169],
    vy: [-0.017, 0.085, -0.059],
    radius: 0.05,
    duration: 10.9,
    dt: 0.02,
  },
  {
    masses: [0.7, 1, 0.9],
    x: [-0.497, -0.724, 1.192],
    y: [1.153, -0.924, 0.13],
    vx: [0.191, -0.281, 0.163],
    vy: [0.045, 0.411, -0.492],
    radius: 0.05,
    duration: 10.4,
    dt: 0.02,
  },
  {
    masses: [1, 1.1, 0.8],
    x: [0.6, 0.403, -1.303],
    y: [-0.75, 0.877, -0.268],
    vx: [0.236, -0.353, 0.191],
    vy: [0.304, 0.131, -0.56],
    radius: 0.05,
    duration: 13.5,
    dt: 0.02,
  },
  {
    masses: [0.7, 0.6, 0.8],
    x: [0.963, -0.044, -0.81],
    y: [-1.221, 1.114, 0.233],
    vx: [-0.487, 0.531, 0.028],
    vy: [-0.305, -0.089, 0.333],
    radius: 0.05,
    duration: 15,
    dt: 0.02,
  },
  {
    masses: [1, 0.8, 1.6],
    x: [-0.949, 0.093, 0.547],
    y: [0.287, -1.522, 0.582],
    vx: [0.054, -0.51, 0.221],
    vy: [0.432, 0.028, -0.284],
    radius: 0.05,
    duration: 13.1,
    dt: 0.02,
  },
  {
    masses: [1.1, 1.5, 0.9],
    x: [-1.445, 0.751, 0.515],
    y: [0.129, -0.614, 0.866],
    vx: [0.033, -0.282, 0.43],
    vy: [0.555, -0.337, -0.118],
    radius: 0.05,
    duration: 14.6,
    dt: 0.02,
  },
  {
    masses: [0.7, 1.1, 0.6],
    x: [-0.587, 0.11, 0.484],
    y: [-0.279, 0.844, -1.221],
    vx: [0.027, -0.305, 0.527],
    vy: [-0.234, 0.009, 0.257],
    radius: 0.05,
    duration: 13.7,
    dt: 0.02,
  },
  {
    masses: [0.8, 1, 0.8],
    x: [-0.656, 0.275, 0.312],
    y: [0.517, -1.264, 1.064],
    vx: [-0.159, 0.455, -0.41],
    vy: [-0.254, 0.073, 0.163],
    radius: 0.05,
    duration: 13.3,
    dt: 0.02,
  },
  {
    masses: [0.7, 0.7, 1.3],
    x: [1.28, 0.276, -0.838],
    y: [-0.237, -0.991, 0.661],
    vx: [-0.211, -0.435, 0.348],
    vy: [-0.383, -0.101, 0.261],
    radius: 0.05,
    duration: 16.3,
    dt: 0.02,
  },
];

/** How far from the centre any star still shining gets in a run. */
function reachOf(run: ThreeBodyRun) {
  let far = 0;
  for (let i = 0; i < run.x.length; i++)
    for (let k = 0; k < run.samples; k++)
      if (run.mass[i][k] > 0)
        far = Math.max(far, Math.hypot(run.x[i][k], run.y[i][k]));
  return far;
}

/**
 * Version `index` of the crash: 0 is Lagrange's triangle, the preset as it
 * was; the rest are the library's. Scaled so the run fills the picture.
 */
function crashVersion(
  index: number
): Pick<GalleryPreset, "blurb" | "xLatex" | "yLatex" | "space"> &
  Partial<GalleryPreset> {
  const lagrange = index === 0;
  const start = lagrange ? undefined : CRASH_STARTS[index - 1];
  const run = start === undefined ? lagrangeRun() : integrateThreeBody(start);
  const scale = lagrange ? 1.9 : Math.min(3, 6.5 / Math.max(1, reachOf(run)));
  const plane = crashing(["x", "y"], run, { scale, rate: 1, tilt: 0 });
  const box = crashing(["x", "y", "z"], run, {
    scale: scale * 0.6,
    rate: 1,
    tilt: 0.5,
  });
  const scene = playbackScene(run, {
    scale,
    rate: 1,
    colors: STARS,
    trail: 2.5,
    paths: 0,
  });
  const masses = (start?.masses ?? [1, 1, 1]).join(", ");
  const crashes =
    run.crashes.length === 1 ? "a crash" : `${run.crashes.length} crashes`;
  const blurb = lagrange
    ? "Three equal stars in Lagrange's triangle, one nudged 12% faster. Equal masses make the triangle unstable: it turns twice, breaks up, two stars pass close and crash, merging into one twice as heavy that then orbits the third. Momentum is conserved through the crash; the energy it loses becomes heat. Choose the preset again for another crash."
    : `Three stars of masses ${masses}, let go near one another with a little spin, their centre of mass at rest. Their gravity pulls them into ${crashes}: the two that touch merge into one, with their summed mass and momentum, and the energy lost becomes heat. One of ${CRASH_STARTS.length + 1} crashes; choose the preset again for another.`;
  return {
    blurb,
    xLatex: plane.x!,
    yLatex: plane.y!,
    seedLatex: plane.seed,
    clockParameters: plane.clock,
    sceneTime: "T_{scene}",
    variables: scene.variables,
    scene: scene.scene,
    space: {
      blurb,
      xLatex: box.x!,
      yLatex: box.y!,
      zLatex: box.z!,
      seedLatex: box.seed,
      clockParameters: box.clock,
      variables: [],
      look: CRASH_LOOK,
    },
  };
}

/** How a crashing run's gas is drawn: as the eight's, long-lived and glowing. */
const CRASH_FLOW = {
  particleCount: 20_000,
  glow: 0.6,
  opacity: 0.5,
  pointSize: 1.4,
  normalizeSpeed: false,
  speed: 1.67,
  trailPersistence: 0.99,
  dropRate: 0.004,
};
const CRASH_LOOK: Partial<SpaceLook> = {
  palette: "blackbody",
  particles: 20_000,
  speed: 0.3,
  scale: 1.5,
  trail: 48,
  lifetime: 6,
  opacity: 0.5,
  glow: 0.35,
  normalizeSpeed: false,
  absorb: false,
  colorMode: "speed",
  backdrop: "#05030c",
  backdropOpacity: 1,
};

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
    /** The ellipses' long axis, from x, in the plane (radians). */
    turn?: number;
    /** The pair's pull on gas outside their plateaus, and a haze of it. */
    gravity?: number;
  }
) {
  const [c, s] = [Math.cos(o.turn ?? 0), Math.sin(o.turn ?? 0)];
  const turned = (st: PlanarState): PlanarState => ({
    x: st.x.map((x, i) => c * x - s * st.y[i]),
    y: st.x.map((x, i) => s * x + c * st.y[i]),
    vx: st.vx.map((x, i) => c * x - s * st.vy[i]),
    vy: st.vx.map((x, i) => s * x + c * st.vy[i]),
  });
  const moving = movingBodies(
    2,
    axes,
    { position: "P", velocity: "W" },
    o.tilt,
    (t) => turned(keplerPair(t, { a: o.a, e: o.e, n: 0.4, ratio: 0.45 }))
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
    moving.normal,
    o.gravity ?? 0
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
  // With gravity, a faint haze of gas everywhere, so the pair's pull is
  // seen across the whole picture, not only in the material they carry.
  const haze = o.gravity === undefined ? "" : "+0.04";
  // Each world's orbit about the centre of mass, one period sampled, for
  // the picture to draw: Kepler's ellipses, the barycentre at a focus of
  // both.
  const orbits = [0, 1].map((i) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k <= 240; k++) {
      const st = turned(
        keplerPair((k / 240) * ((2 * Math.PI) / 0.4), {
          a: o.a,
          e: o.e,
          n: 0.4,
          ratio: 0.45,
        })
      );
      xs.push(Math.round(st.x[i] * 1000) / 1000);
      ys.push(Math.round(st.y[i] * 1000) / 1000);
    }
    return { xs, ys };
  });
  return {
    ...field,
    seed: seeds.join("+") + haze,
    clock: moving.clock,
    orbits,
  };
}

/**
 * The double planet's Desmos objects: each world's orbit, faint, and a
 * small cross at the centre of mass they both go round.
 */
function planetScene(
  orbits: readonly { xs: number[]; ys: number[] }[]
): SceneItem[] {
  const list = (v: number[]) => String.raw`\left[${v.join(",")}\right]`;
  const colors = ["#f2c46b", "#7fc8ff"];
  return [
    ...orbits.flatMap((o, i): SceneItem[] => [
      {
        key: `orbitx${i + 1}`,
        latex: String.raw`O_{x${i + 1}vt}=${list(o.xs)}`,
        hidden: true,
      },
      {
        key: `orbity${i + 1}`,
        latex: String.raw`O_{y${i + 1}vt}=${list(o.ys)}`,
        hidden: true,
      },
      {
        key: `orbit${i + 1}`,
        latex: String.raw`\left(O_{x${i + 1}vt},O_{y${i + 1}vt}\right)`,
        color: colors[i],
        points: false,
        lines: true,
        lineWidth: 1.5,
        lineOpacity: 0.3,
        lineStyle: "DASHED" as const,
        explains: true,
      },
    ]),
    {
      key: "barycentre",
      latex: String.raw`\left(0,0\right)`,
      color: "#cfd6e6",
      points: true,
      pointSize: 6,
      label: "centre of mass",
      labelSize: 0.7,
      explains: true,
    },
  ];
}

// Less eccentric and turned a third of the way up, so the pair sweeps the
// whole picture rather than sliding along the middle of it (Rafael,
// 2026-11-08: "not just a horizontal strip").
const PLANETS_2D = doublePlanet(["x", "y"], {
  a: 8.5,
  e: 0.28,
  tilt: 0,
  reach: [2.4, 1.3],
  ball: [0.7, 0.55],
  ring: 2,
  swirl: [2.5, 2],
  turn: 0.5,
  gravity: 0.6,
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
    id: "three-body-crash",
    name: "Three-body crash",
    category: "space",
    ...crashVersion(0),
    colorScale: 4,
    palette: "blackbody",
    backdrop: "#05030c",
    flow: CRASH_FLOW,
    extent: 10,
    variants: { count: CRASH_STARTS.length + 1, build: crashVersion },
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
    scene: planetScene(PLANETS_2D.orbits),
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
];
