/** Self-contained AP teaching extensions. Nothing in this module mutates a graph.
 * Scene items are native Desmos expressions; GPU flow has separate formulas.
 * The Kepler reference body uses 6 Newton iterations on Kepler's equation;
 * at e<=0.6 its numerical residual is far below ordinary display accuracy.
 */
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";
const R = String.raw;
const v = (
  name: string,
  value: number,
  min: number,
  max: number,
  step = 0.1
): GalleryVariable => ({ name, value, min, max, step });
const sw = (name: string, text: string): GalleryVariable => ({
  ...v(name, 1, 0, 1, 1),
  toggle: text,
});
const obj = (
  key: string,
  latex: string,
  other: Partial<SceneItem> = {}
): SceneItem => ({ key, latex, color: "#46536a", ...other });
const line = (
  key: string,
  points: readonly string[],
  domain: readonly [string, string],
  other: Partial<SceneItem> = {}
) =>
  obj(key, R`\left(${points.join(",")}\right)`, {
    domain,
    lineWidth: 2.5,
    ...other,
  });
const surface = (
  key: string,
  coords: readonly string[],
  other: Partial<SceneItem> = {}
) =>
  obj(key, R`\left(${coords.join(",")}\right)`, {
    domainU: ["0", R`2\pi`],
    domainV: ["0", R`\pi`],
    fill: true,
    fillOpacity: 1,
    ...other,
  });
const ball = (
  key: string,
  coords: readonly string[],
  dim: 2 | 3,
  radius = "0.16",
  other: Partial<SceneItem> = {}
): SceneItem => {
  if (dim === 2)
    return obj(key, R`\left(${coords.join(",")}\right)`, {
      points: true,
      pointSize: 13,
      color: "#d18a43",
      ...other,
    });
  const xyz = [
    R`\left(${coords[0]}\right)+${radius}\cos(u)\sin(v)`,
    R`\left(${coords[1]}\right)+${radius}\sin(u)\sin(v)`,
    R`\left(${coords[2]}\right)+${radius}\cos(v)`,
  ];
  return surface(key, xyz, {
    color: "#d18a43",
    majesticColor: "#e7a85a",
    ...other,
  });
};
const standardFlow = (dim: 2 | 3, speed: number, density = 1) =>
  dim === 2
    ? {
        particleCount: Math.round(24000 * density),
        speed,
        trailPersistence: 0.84,
        dropRate: 0.03,
        opacity: 0.45,
        pointSize: 1.5,
        glow: 0,
        normalizeSpeed: false,
      }
    : undefined;
const look3D = (speed: number, density = 1) => ({
  particles: Math.round(30000 * density),
  speed: 0.6 * speed,
  trail: 16,
  lifetime: 1.2,
  opacity: 0.55,
  glow: 0,
  normalizeSpeed: false,
  absorb: false,
  palette: "charge" as const,
});

/**
 * The exact pendulum at amplitude θ₀, not its small-angle approximation:
 * θ = 2 arcsin(k sn(ω₀t + K, k)) with k = sin(θ₀/2), and θ' = 2kω₀ cn(…).
 * Desmos has no elliptic functions, so K and K' come from the
 * arithmetic–geometric mean (six steps, quadratic convergence) and sn and cn
 * from their nome series, 25 terms: at θ₀ = 3 (172°), the largest the slider
 * allows, the nome is about 0.3, and its 25th power is 1e-13. All of it
 * depends only on θ₀, so Desmos works it out once per slider change.
 *
 * (GPT's design moved the state along the separatrix itself, the one motion
 * that never repeats: the pendulum crept up to upside-down and stayed.)
 */
function pendulumHelpers(): SceneItem[] {
  const hidden = { hidden: true } as const;
  const items: SceneItem[] = [
    obj("pk", R`k_{p}=\sin\left(\frac{\theta_{0}}{2}\right)`, hidden),
  ];
  // AGM(1, √(1−k²)) gives K; AGM(1, k) gives K'.
  for (const [name, start] of [
    ["A", R`\sqrt{1-k_{p}^{2}}`],
    ["B", "k_{p}"],
  ] as const) {
    items.push(
      obj(`p${name}0`, R`${name}_{p0}=\left(1,${start}\right)`, hidden)
    );
    for (let i = 1; i <= 6; i++) {
      const prev = `${name}_{p${i - 1}}`;
      items.push(
        obj(
          `p${name}${i}`,
          R`${name}_{p${i}}=\left(\frac{${prev}.x+${prev}.y}{2},\sqrt{${prev}.x${prev}.y}\right)`,
          hidden
        )
      );
    }
  }
  items.push(
    obj("pK", R`K_{p}=\frac{\pi}{2A_{p6}.x}`, hidden),
    obj("pq", R`q_{p}=e^{-\frac{\pi^{2}}{2B_{p6}.x K_{p}}}`, hidden),
    // u = ω₀t + K starts the swing at its amplitude, released from rest.
    obj(
      "pu",
      R`u_{p}=\frac{\pi}{2K_{p}}\left(\sqrt{\frac{g}{L}}T_{scene}+K_{p}\right)`,
      hidden
    ),
    obj(
      "psn",
      R`S_{p}=\frac{2\pi}{k_{p}K_{p}}\sum_{n=0}^{24}\frac{q_{p}^{n+0.5}\sin\left(\left(2n+1\right)u_{p}\right)}{1-q_{p}^{2n+1}}`,
      hidden
    ),
    obj(
      "pcn",
      R`C_{p}=\frac{2\pi}{k_{p}K_{p}}\sum_{n=0}^{24}\frac{q_{p}^{n+0.5}\cos\left(\left(2n+1\right)u_{p}\right)}{1+q_{p}^{2n+1}}`,
      hidden
    )
  );
  return items;
}

function pendulumScene(dim: 2 | 3): SceneItem[] {
  const th = R`2\arcsin\left(\max\left(-1,\min\left(1,k_{p}S_{p}\right)\right)\right)`;
  const om = R`2k_{p}\sqrt{\frac{g}{L}}C_{p}`;
  const pos = [th, om, ...(dim === 3 ? ["0"] : [])];
  const xp = dim === 2 ? "5.6" : "3.9";
  const zp = dim === 2 ? "2.4" : "2";
  const bob = [
    R`${xp}+L\sin\left(${th}\right)`,
    dim === 2 ? R`${zp}-L\cos\left(${th}\right)` : "0",
    ...(dim === 3 ? [R`${zp}-L\cos\left(${th}\right)`] : []),
  ];
  const rod =
    dim === 2
      ? [R`${xp}+tL\sin\left(${th}\right)`, R`${zp}-tL\cos\left(${th}\right)`]
      : [
          R`${xp}+tL\sin\left(${th}\right)`,
          "0",
          R`${zp}-tL\cos\left(${th}\right)`,
        ];
  const sep = R`2\sqrt{\frac{g}{L}}\cos\left(\frac{t}{2}\right)`;
  const path = (sgn: string) => ["t", sgn + sep, ...(dim === 3 ? ["0"] : [])];
  return [
    ...pendulumHelpers(),
    line("separatrixUpper", path(""), [R`-\pi`, R`\pi`], {
      explains: true,
      color: "#ac4a38",
      lineWidth: 3,
    }),
    line("separatrixLower", path("-"), [R`-\pi`, R`\pi`], {
      explains: true,
      color: "#ac4a38",
      lineWidth: 3,
    }),
    ball("phaseState", pos, dim, "0.14"),
    line("pendulumRod", rod, ["0", "1"], {
      color: "#a2a6aa",
      majesticColor: "#c8d5dd",
      lineWidth: 3,
    }),
    ball("pendulumPivot", [xp, ...(dim === 2 ? [zp] : ["0", zp])], dim, "0.1", {
      color: "#718496",
      majesticColor: "#9baab8",
    }),
    ball("pendulumBob", bob, dim, "0.2"),
  ];
}
function pendulum(): GalleryPreset {
  const vars = [
    v("g", 2, 0.5, 4, 0.1),
    v("L", 1.3, 0.6, 2, 0.05),
    // Large by default: at 2.5 rad (143°) the period is 40% longer than
    // small-angle theory says, and the orbit is visibly not an ellipse.
    v("\\theta_{0}", 2.5, 0.2, 3, 0.05),
    v("T_{scene}", 0, 0, 1000, 0.01),
  ];
  const fy = R`-\frac{g}{L}\sin\left(x\right)`;
  const energy = R`\frac{L^{2}y^{2}}{2}+gL\left(1-\cos\left(x\right)\right)`;
  return {
    id: "ap-pendulum-phase",
    name: "Pendulum: nonlinear phase portrait",
    blurb:
      "Angle x and angular velocity y form the phase plane. The red separatrix (E = 2gL) divides swinging from going over the top. The marker and the pendulum beside it are the exact motion at amplitude θ₀: past about 30° it is no longer simple harmonic, the orbit is not an ellipse, and the period grows.",
    category: "ap1",
    apUnit: 7,
    sceneTime: "T_{scene}",
    onPaper: true,
    extent: 8.5,
    palette: "charge",
    majesticPalette: "charge-glow",
    meaning: {
      quantity: "Mechanical energy per unit mass L²ω²/2 + gL(1−cosθ)",
      low: "low-energy libration",
      high: "rotation",
      half: "upper",
    },
    xLatex: "y",
    yLatex: fy,
    tint: { latex: energy, latex3d: energy, scale: 3 },
    seedLatex: "1",
    variables: vars,
    scene: pendulumScene(2),
    flow: standardFlow(2, 0.23),
    space: {
      blurb:
        "The state flow is still planar (z=0). The real pendulum on the right uses z as its physical vertical axis.",
      xLatex: "y",
      yLatex: fy,
      zLatex: "0",
      seedLatex: R`e^{-15z^{2}}`,
      variables: vars,
      scene: pendulumScene(3),
      look: look3D(0.23),
    },
  };
}

/**
 * Kepler's equation M = E − e sin E, solved by six Newton steps as plain
 * numbers, each from the one before: at e ≤ 0.6 the sixth is exact to
 * rounding. Scalars, so Desmos solves each once per change.
 *
 * GPT wrote the steps as functions, K₆(q) calling K₅ three times and so on:
 * 3⁶ = 729 calls for one position, made at every vertex of every 3D surface
 * on every clock tick, which froze Desmos 3D. Nothing here solves inside a
 * curve or a surface: the orbit and the wedges are drawn in the eccentric
 * anomaly E itself, which needs no solving, between endpoints solved once.
 */
function keplerSolve(prefix: string, mean: string): SceneItem[] {
  const name = (i: number) => `E_{${prefix}${i}}`;
  const items: SceneItem[] = [
    obj(`${prefix}0`, R`${name(0)}=${mean}+e_{orb}\sin\left(${mean}\right)`, {
      hidden: true,
    }),
  ];
  for (let i = 1; i <= 6; i++) {
    const old = name(i - 1);
    items.push(
      obj(
        `${prefix}${i}`,
        R`${name(i)}=${old}-\frac{${old}-e_{orb}\sin\left(${old}\right)-\left(${mean}\right)}{1-e_{orb}\cos\left(${old}\right)}`,
        { hidden: true }
      )
    );
  }
  return items;
}
const meanMotion = R`\sqrt{\frac{M_{g}}{a_{orb}^{3}}}`;
/** The point at eccentric anomaly E, with the Sun's focus at the origin. */
const atAnomaly = (E: string) => [
  R`a_{orb}\left(\cos\left(${E}\right)-e_{orb}\right)`,
  R`a_{orb}\sqrt{1-e_{orb}^{2}}\sin\left(${E}\right)`,
];
/**
 * The two wedges, each a sixth of the period: from perihelion (M = 0, E = 0)
 * and from aphelion (M = π, E = π), each to where a sixth of the orbit's
 * time later puts it (M + π/3, E solved).
 */
const WEDGES = [
  { key: "wedgeA", from: "0", to: "E_{kA6}", color: "#5c9ba6" },
  { key: "wedgeB", from: R`\pi`, to: "E_{kB6}", color: "#c68e50" },
] as const;
function keplerScene(dim: 2 | 3): SceneItem[] {
  const flat = (xy: string[]) => (dim === 3 ? [...xy, "0"] : xy);
  const scene: SceneItem[] = [
    ...keplerSolve("kp", R`${meanMotion}T_{scene}`),
    ...keplerSolve("kA", R`\frac{\pi}{3}`),
    ...keplerSolve("kB", R`\frac{4\pi}{3}`),
    line("orbit", flat(atAnomaly("t")), ["0", R`2\pi`], {
      explains: true,
      color: "#436f9a",
    }),
    ball("focus", flat(["0", "0"]), dim, "0.22", {
      color: "#d79a4b",
      majesticColor: "#f1b569",
    }),
    ball("planet", flat(atAnomaly("E_{kp6}")), dim, "0.17"),
  ];
  for (const wedge of WEDGES) {
    const E = (s: string) =>
      R`\left(${wedge.from}\right)+${s}\left(${wedge.to}-\left(${wedge.from}\right)\right)`;
    if (dim === 2) {
      const points = ["(0,0)"];
      for (let j = 0; j <= 18; j++)
        points.push(
          R`\left(${atAnomaly(E(`\\frac{${j}}{18}`)).join(",")}\right)`
        );
      scene.push(
        obj(
          wedge.key,
          R`\operatorname{polygon}\left(${points.join(",")}\right)`,
          {
            color: wedge.color,
            fill: true,
            fillOpacity: 0.25,
            explains: true,
            lineOpacity: 0.4,
          }
        )
      );
    } else {
      const [X, Y] = atAnomaly(E("u"));
      scene.push(
        surface(
          wedge.key,
          [R`v\left(${X}\right)`, R`v\left(${Y}\right)`, "0"],
          {
            domainU: ["0", "1"],
            domainV: ["0", "1"],
            explains: true,
            color: wedge.color,
            fillOpacity: 0.25,
          }
        )
      );
    }
  }
  return scene;
}
function kepler(): GalleryPreset {
  const vars = [
    v("a_{orb}", 3, 1.7, 4.2, 0.1),
    v("e_{orb}", 0.4, 0, 0.6, 0.02),
    v("M_{g}", 3, 1, 6, 0.1),
    v("T_{scene}", 0, 0, 1000, 0.01),
  ];
  const r = R`\sqrt{x^{2}+y^{2}}`;
  // Every point lies on one ellipse of this eccentricity about the focus,
  // the one with semi-latus rectum p = r + ex = r(1 + e cos θ). On it,
  // v_r = (μ/h)e sin θ and v_θ = (μ/h)(1 + e cos θ), with μ/h = √(M/p): in x
  // and y, √(M/p)·(−sin θ, e + cos θ). So every particle is a true Kepler
  // orbit, at its true speed, and its areal velocity h/2 = √(Mp)/2 is
  // constant along it. (A single speed for all of them drew the right
  // ellipses at the wrong speeds, and a colour that was not h/2.)
  const p = R`\left(${r}+e_{orb}x\right)`;
  const speed = R`\sqrt{\frac{M_{g}}{${p}}}`;
  const vx = R`\left\{x^{2}+y^{2}>0.04:-${speed}\frac{y}{${r}},0\right\}`;
  const vy = R`\left\{x^{2}+y^{2}>0.04:${speed}\left(e_{orb}+\frac{x}{${r}}\right),0\right\}`;
  const areal = R`\frac{\sqrt{M_{g}${p}}}{2}`;
  const seed3 = R`e^{-12z^{2}}`;
  return {
    id: "ap-kepler-areas",
    name: "Kepler: equal areas",
    blurb:
      "Two different sixth-period arcs sweep equal areas, not equal angles or distances. The flow is a family of confocal ellipses of fixed eccentricity. Colour is local areal rate; each streamline has constant colour.",
    category: "ap1",
    apUnit: 2,
    sceneTime: "T_{scene}",
    onPaper: true,
    extent: 7,
    palette: "charge",
    majesticPalette: "charge-glow",
    meaning: {
      quantity: "Areal velocity (r × v)/2",
      low: "smaller orbit",
      high: "larger orbit",
      half: "upper",
    },
    xLatex: vx,
    yLatex: vy,
    tint: { latex: areal, latex3d: areal, scale: 3 },
    seedLatex: "1",
    variables: vars,
    scene: keplerScene(2),
    flow: standardFlow(2, 1.2),
    space: {
      blurb:
        "Planar Kepler orbits embedded in 3D, not a general 3D gravity field.",
      xLatex: vx,
      yLatex: vy,
      zLatex: "0",
      seedLatex: seed3,
      variables: vars,
      scene: keplerScene(3),
      look: look3D(0.5),
    },
  };
}

/**
 * Motion graphs: one object on a track at the top, and below it x(t), v(t)
 * and a(t) drawn as it moves, on one clock, with a line through all three at
 * the present instant. Six seconds, a second held, then again.
 *
 * Laid out in graph units, so the strips are a fixed size whatever the
 * sliders: time runs from MOTION.t0 at MOTION.perSecond units a second, and
 * each strip is its quantity scaled about its own zero line. In 3D the same
 * picture stands up in the xz-plane.
 */
const MOTION = {
  t0: -6,
  perSecond: 1.6,
  track: 4.4,
  strips: [
    { key: "x", base: 1.2, scale: 0.4, color: "#bf7031", majestic: "#f0a35a" },
    { key: "v", base: -1.8, scale: 0.6, color: "#3869aa", majestic: "#6fa8f0" },
    { key: "a", base: -4.4, scale: 0.8, color: "#477e58", majestic: "#78d095" },
  ],
} as const;

function motionScene(dim: 2 | 3): SceneItem[] {
  const x = (t: string) =>
    R`x_{ini}+v_{ini}\left(${t}\right)+\frac{a_{const}\left(${t}\right)^{2}}{2}`;
  const vel = (t: string) => R`v_{ini}+a_{const}\left(${t}\right)`;
  const value = { x, v: vel, a: () => "a_{const}" };
  // Six seconds of motion, a second held, then again: the flow loops too.
  const now = R`\min\left(\operatorname{mod}\left(T_{scene},7\right),6\right)`;
  const X = (t: string) => R`${MOTION.t0}+${MOTION.perSecond}\left(${t}\right)`;
  // A point in the picture's plane: (X, Y) in 2D, (X, 0, Y) in 3D.
  const at = (h: string, y: string) => (dim === 2 ? [h, y] : [h, "0", y]);
  const end = String(MOTION.t0 + 6 * MOTION.perSecond);
  const traces = R`\left\{s_{traces}=1\right\}`;
  const scene: SceneItem[] = [];
  for (const strip of MOTION.strips) {
    const Y = (t: string) =>
      R`${strip.base}+${strip.scale}\left(${value[strip.key](t)}\right)`;
    // Its zero line, the time axis this graph is drawn against.
    scene.push(
      line(
        `${strip.key}Axis`,
        at("t", String(strip.base)),
        [String(MOTION.t0), end],
        {
          explains: true,
          color: "#8a929c",
          lineWidth: 1.5,
          lineStyle: "DASHED",
        }
      )
    );
    const trace = line(strip.key + "Trace", at(X("t"), Y("t")), ["0", now], {
      color: strip.color,
      majesticColor: strip.majestic,
      lineWidth: 3.5,
    });
    scene.push({ ...trace, latex: trace.latex + traces });
    const head = ball(strip.key + "Head", at(X(now), Y(now)), dim, "0.12", {
      color: strip.color,
      majesticColor: strip.majestic,
    });
    scene.push({ ...head, latex: head.latex + traces });
  }
  // The present instant, through all three graphs.
  scene.push(
    line(
      "now",
      at(X(now), "t"),
      [
        String(MOTION.strips[2].base - 1.2),
        String(MOTION.strips[0].base + 2.4),
      ],
      { explains: true, color: "#6b7480", lineWidth: 1.5, lineStyle: "DOTTED" }
    )
  );
  // The track, and the object on it, at 0.8 units per unit of x.
  scene.push(
    line("track", at("t", String(MOTION.track)), ["-6.5", "6.5"], {
      color: "#7d8691",
      majesticColor: "#aab6c3",
      lineWidth: 2,
    }),
    ball(
      "movingObject",
      at(R`0.8\left(${x(now)}\right)`, String(MOTION.track)),
      dim,
      "0.22"
    )
  );
  return scene;
}

function motion(): GalleryPreset {
  const vars = [
    v("x_{ini}", 0, -3, 3, 0.1),
    v("v_{ini}", 2, -3, 3, 0.1),
    v("a_{const}", -0.5, -2, 2, 0.1),
    v("T_{scene}", 0, 0, 1000, 0.01),
    sw("s_{traces}", "Live x(t), v(t), a(t) graphs"),
  ];
  // The flow is the object's motion along its track: a current there moving
  // at its velocity (0.8 graph units per unit of x, as the object is drawn),
  // which slows, stops and turns round while a stays the same. Born only
  // along the track, so the graphs below stay clear. t is the flow's clock,
  // T_scene's twin.
  const tau = R`\min\left(\operatorname{mod}\left(t,7\right),6\right)`;
  const velocity = R`v_{ini}+a_{const}${tau}`;
  const along = R`0.8\left(${velocity}\right)`;
  const band = (c: string) => R`e^{-6\left(${c}-${MOTION.track}\right)^{2}}`;
  return {
    id: "ap-motion-graphs",
    name: "Motion graphs",
    blurb:
      "One object, three graphs on one clock: the slope of x(t) is v(t), and the slope of v(t) is a(t). The current along the track moves as the object does, so it slows, stops and turns round while a stays constant. Six seconds, then again.",
    category: "ap1",
    apUnit: 1,
    sceneTime: "T_{scene}",
    onPaper: true,
    extent: 7,
    palette: "charge",
    majesticPalette: "charge-glow",
    meaning: {
      quantity: "Velocity v",
      low: "moving left",
      zero: "at rest for an instant",
      high: "moving right",
    },
    xLatex: along,
    yLatex: "0",
    tint: { latex: velocity, latex3d: velocity, scale: 2 },
    seedLatex: band("y"),
    variables: vars,
    scene: motionScene(2),
    flow: standardFlow(2, 0.5, 0.35),
    space: {
      blurb:
        "The same picture standing in the xz-plane: the track at the top, the three graphs below it.",
      xLatex: along,
      yLatex: "0",
      zLatex: "0",
      seedLatex: R`${band("z")}e^{-6y^{2}}`,
      variables: vars,
      scene: motionScene(3),
      look: look3D(0.5, 0.35),
    },
  };
}

export const AP_EXTENSIONS: readonly GalleryPreset[] = [
  motion(),
  pendulum(),
  kepler(),
];
