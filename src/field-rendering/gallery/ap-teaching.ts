/**
 * Six demonstrations for AP Physics 1 and 2, each aimed at one reasoning
 * error students make: a projectile's velocity against its acceleration, an
 * oscillator's state, circular motion's two vectors, continuity and
 * Bernoulli, a conductor in a field, and an induced electric field.
 *
 * Researched by GPT against the College Board CEDs
 * (docs/VECTOR_TOOLS_AP_CURRICULUM_RESEARCH.md and its answer in
 * docs/research/vector-tools-ap-roadmap/), then reworked here so each is a
 * picture worth looking at as well as a correct one: dense, glowing flows in
 * Majestic, solids that stay visible on the dark, and colour that always
 * names a quantity.
 *
 * Every model is exact for what it claims, and the unit tests check the
 * physics at points: the projectile's particles each obey a = g, the
 * oscillator's flow keeps energy, the streamtube is incompressible and
 * Bernoulli holds along it, the conductor's E is −∇V and normal to its
 * surface, and the induced field satisfies Faraday's law.
 */
import { renameIdentifier } from "../identifiers";
import { probeArrows2D, probeArrows3D, type ProbeArrow } from "./probe";
import type {
  ColorMeaning,
  GalleryPreset,
  GalleryVariable,
  SceneItem,
} from "./types";

const { raw } = String;
const par = (s: string) => raw`\left(${s}\right)`;
const mul = (...s: string[]) => s.map(par).join(raw`\cdot`);
const sq = (s: string) => `${par(s)}^{2}`;
const frac = (a: string, b: string) => raw`\frac{${a}}{${b}}`;
const sin = (s: string) => raw`\sin${par(s)}`;
const cos = (s: string) => raw`\cos${par(s)}`;
const point = (s: readonly string[]) => par(s.join(","));
const only = (s: string) => raw`\left\{${s}\right\}`;
const guard = (s: string, f: string) => raw`\left\{${s}:${f},0\right\}`;
const mod = (a: string, b: string) =>
  raw`\operatorname{mod}${par(`${a},${b}`)}`;

const variable = (
  name: string,
  value: number,
  min: number,
  max: number,
  step = 0.1
): GalleryVariable => ({ name, value, min, max, step });
const toggle = (
  name: string,
  value: 0 | 1,
  label: string
): GalleryVariable => ({ ...variable(name, value, 0, 1, 1), toggle: label });

/** Ink for paper, and the lighter one the same object needs on the dark. */
const INK = "#394555";
const BODY = "#c37229";
const ARROW = "#244779";
const SECOND_ARROW = "#a55222";

const obj = (
  key: string,
  latex: string,
  extra: Partial<SceneItem> = {}
): SceneItem => ({ key, latex, color: INK, ...extra });
const curve = (
  key: string,
  xyz: readonly string[],
  domain: readonly [string, string],
  extra: Partial<SceneItem> = {}
) => obj(key, point(xyz), { domain, lineWidth: 2, ...extra });
const surface = (
  key: string,
  xyz: readonly string[],
  u: readonly [string, string],
  v: readonly [string, string],
  extra: Partial<SceneItem> = {}
) =>
  obj(key, point(xyz), {
    domainU: u,
    domainV: v,
    fill: true,
    fillOpacity: 1,
    ...extra,
  });
/**
 * A moving body: a point in 2D, a small sphere in 3D. A Desmos 3D point is
 * covered by Majestic's dark, which is cut away only where a surface is, so
 * there the body would vanish; a sphere also reads as a solid. Its centre is
 * written out in each coordinate, as the depth pass compiles the surface's
 * own LaTeX and cannot follow a named point.
 */
const body = (key: string, at: readonly string[], dim: 2 | 3) =>
  dim === 2
    ? obj(key, point(at), { points: true, pointSize: 16, color: BODY })
    : surface(
        key,
        [
          `${par(at[0])}+${mul("0.3", cos("u"), sin("v"))}`,
          `${par(at[1])}+${mul("0.3", sin("u"), sin("v"))}`,
          `${par(at[2])}+${mul("0.3", cos("v"))}`,
        ],
        ["0", raw`2\pi`],
        ["0", raw`\pi`],
        { color: BODY }
      );
const atProbe = (s: string) =>
  ["x", "y", "z"].reduce((v, a) => renameIdentifier(v, a, `p_{${a}}`), s);

/** One preset in one dimension, before it is assembled. */
interface Demo {
  /** The field, in x, y (and z), the preset's variables and T_{scene}. */
  field: string[];
  tint: string;
  scale: number;
  vars: GalleryVariable[];
  scene: SceneItem[];
  /** The probe arrow's name: what the field is. */
  label: string;
  /** Where the field is drawn: outside a solid, inside a tube. */
  valid: string;
  seed: string;
  clock?: boolean;
  /** Arrows drawn on the moving body rather than at the probe. */
  body?: { at: string; valid: string; arrows: ProbeArrow[]; label: string };
  /** 2D only: a function constant along the field, drawn as its curves. */
  stream?: {
    latex: string;
    /** How many curves a unit of it: they are drawn at its multiples. */
    perUnit: string;
    label: string;
    /**
     * Where they are drawn, if not where the field is: Desmos's implicit
     * plotter draws nothing under some restrictions the GPU takes happily.
     */
    mask?: string;
  };
  /**
   * The flow's display speed, per unit of the field's speed: a slow field
   * (an induced E of a few tenths) needs more to draw streaks, not dots.
   */
  speed: number;
  /**
   * The share of the usual particle count: a flow confined to a narrow tube
   * at the full count is so dense its streamlines are lost in it.
   */
  density: number;
  probe: readonly number[];
  extent: number;
}

/**
 * The projectile. Gravity alone is a uniform rain that says nothing, so the
 * flow is a family of projectiles instead: v = (u, v − g(x + 6)/u) is the
 * velocity of every projectile thrown from x = −6 with the body's launch
 * velocity, at any height. Each particle then really moves as a projectile
 * (dv_y/dt = −(g/u)·u = −g), the body rides one of the arcs, and the colour
 * is v_y: rising, zero at the top while a is still g, then falling.
 */
function projectile(m: Demo, dim: 2 | 3) {
  // Not u and v for the launch velocity: those are Desmos 3D's surface
  // parameters, and as sliders they turned the ground into a point.
  const ground = "-3";
  const up = dim === 2 ? "y" : "z";
  m.vars = [
    variable("g", 2, 0.5, 4),
    variable("v_{0x}", 3, 1, 5),
    variable("v_{0y}", 4, 1, 6),
    variable("h", 0, 0, 3),
    ...(dim === 3 ? [variable("w", 0.5, -1, 1)] : []),
    toggle("s_{body}", 1, "Projectile's v and g"),
  ];
  const vy = raw`v_{0y}-\frac{g\left(x+6\right)}{v_{0x}}`;
  m.field = dim === 2 ? ["v_{0x}", vy, "0"] : ["v_{0x}", "w", vy];
  m.tint = vy;
  m.scale = 3;
  m.speed = 0.12;
  m.label = "v";
  m.valid = `${up}>${ground}`;
  m.clock = true;
  m.extent = 7;
  m.probe = dim === 2 ? [-3, 0] : [-3, 0, 0];
  // Lands, rests a second, and is thrown again.
  const flight = frac(raw`v_{0y}+\sqrt{v_{0y}^{2}+2gh}`, "g");
  const phase = mod("T_{scene}", `${flight}+1`);
  const time = raw`\min${par(`${phase},${flight}`)}`;
  const height = (t: string) =>
    `${ground}+h+${mul("v_{0y}", t)}-${mul("g/2", sq(t))}`;
  const position = (t: string) =>
    dim === 2
      ? [`-6+${mul("v_{0x}", t)}`, height(t)]
      : [`-6+${mul("v_{0x}", t)}`, mul("w", t), height(t)];
  m.scene.push(
    curve("trajectory", position("t"), ["0", flight], {
      explains: true,
      lineStyle: "DASHED",
    }),
    body("projectile", position(time), dim)
  );
  if (dim === 2)
    m.scene.push(
      obj("ground", `y\\le${ground}`, {
        color: "#6b5d4a",
        majesticColor: "#4a5568",
        fill: true,
        fillOpacity: 0.3,
        lineWidth: 3,
      })
    );
  else
    m.scene.push(
      // A ball's radius below where its centre lands, so it rests on it.
      surface("ground", ["u", "v", "-3.3"], ["-7", "7"], ["-4", "4"], {
        color: "#8a8f86",
        majesticColor: "#3a4658",
      })
    );
  const g3 = dim === 2 ? ["0", "-g"] : ["0", "0", "-g"];
  m.body = {
    at: point(position(time)),
    valid: `${phase}<${flight}`,
    label: "Projectile's v and g",
    arrows: [
      {
        key: "bodyv",
        vector: point(
          dim === 2
            ? ["v_{0x}", `v_{0y}-${mul("g", time)}`]
            : ["v_{0x}", "w", `v_{0y}-${mul("g", time)}`]
        ),
        toggle: "s_{body}",
        name: raw`\vec{v}`,
        color: ARROW,
        nameColor: ARROW,
      },
      {
        key: "bodyg",
        vector: point(g3),
        toggle: "s_{body}",
        name: raw`\vec{g}`,
        color: SECOND_ARROW,
        nameColor: SECOND_ARROW,
      },
    ],
  };
  // Constant along every arc: the height it peaks at, (gy + v_y²/2)/g.
  m.stream = {
    latex: `y+${frac(sq(vy), "2g")}`,
    perUnit: "1",
    label: "Trajectories",
  };
}

function oscillator(m: Demo, dim: 2 | 3) {
  m.vars = [
    variable("k", 1, 0.25, 3),
    variable("m", 1, 0.5, 3),
    variable("A", 2, 0.5, 3),
  ];
  m.clock = true;
  m.extent = 6;
  m.probe = dim === 2 ? [1, 1] : [1, 1, 0];
  const omega = raw`\sqrt{\frac{k}{m}}`;
  m.scene.push(
    body(
      "oscillator",
      [
        mul("A", cos(mul(omega, "T_{scene}"))),
        mul("-A", omega, sin(mul(omega, "T_{scene}"))),
        ...(dim === 3 ? ["0"] : []),
      ],
      dim
    )
  );
  // x is displacement and y velocity. In 3D the same plane is drawn at
  // z = 0: z is a display thickness, not a third physical state.
  m.field = ["y", "-kx/m", "0"];
  m.tint = "my^{2}/2+kx^{2}/2";
  m.scale = 4;
  m.seed = dim === 3 ? "e^{-30z^{2}}" : "1";
  // Contours of energy, drawn at whole amplitudes, √(2E/k) = 1, 2, 3…:
  // at whole energies they crowd together going out.
  m.stream = {
    latex: raw`\sqrt{\frac{2}{k}${par(m.tint)}}`,
    perUnit: "1",
    label: "Energy contours",
  };
  // No surface for the phase plane in 3D: a translucent one drew as an
  // opaque slab over the flow, and Desmos's own grid already marks z = 0.
  m.label = "s";
}

function circular(m: Demo, dim: 2 | 3) {
  m.vars = [
    variable("w", 0.7, -1.5, 1.5),
    variable("R", 2.5, 1, 4),
    toggle("s_{body}", 1, "Body's v and a"),
  ];
  const rho = "x^{2}+y^{2}";
  m.field = ["-wy", "wx", "0"];
  m.tint = `w^{2}${par(rho)}/2`;
  m.scale = 3;
  m.clock = true;
  m.extent = 6;
  m.probe = dim === 2 ? [1.5, 0] : [1.5, 0, 0];
  m.seed = mul(
    `e^{-0.4${sq(raw`\sqrt{${rho}}-R`)}}`,
    dim === 3 ? "e^{-6z^{2}}" : "1"
  );
  // Circles of radius 1, 2, 3…: evenly spaced, unlike circles of ρ.
  m.stream = { latex: raw`\sqrt{${rho}}`, perUnit: "1", label: "Circles" };
  const flat = (s: string[]) => (dim === 3 ? [...s, "0"] : s);
  const angle = mul("w", "T_{scene}");
  m.scene.push(
    curve(
      "orbit",
      flat([mul("R", cos("t")), mul("R", sin("t"))]),
      ["0", raw`2\pi`],
      { explains: true }
    ),
    body("marker", flat([mul("R", cos(angle)), mul("R", sin(angle))]), dim)
  );
  m.body = {
    at: point(flat([mul("R", cos(angle)), mul("R", sin(angle))])),
    valid: "1>0",
    label: "Body's v and a",
    arrows: [
      {
        key: "bodyv",
        vector: point(flat([mul("-wR", sin(angle)), mul("wR", cos(angle))])),
        toggle: "s_{body}",
        name: raw`\vec{v}`,
        color: ARROW,
        nameColor: ARROW,
      },
      {
        key: "bodya",
        vector: point(
          flat([mul("-w^{2}R", cos(angle)), mul("-w^{2}R", sin(angle))])
        ),
        toggle: "s_{body}",
        name: raw`\vec{a}`,
        color: SECOND_ARROW,
        nameColor: SECOND_ARROW,
      },
    ],
  };
}

function streamtube(m: Demo, dim: 2 | 3) {
  m.vars = [
    variable("U", 1, 0.3, 2),
    variable("a", 0.12, 0.03, 0.2, 0.01),
    variable("H", dim === 2 ? 1.7 : 1.4, 1, 2),
    variable("d", 1, 0.5, 2),
  ];
  m.extent = 5;
  m.probe = dim === 2 ? [1, 0.3] : [1, 0.3, 0.3];
  const z = dim === 3 ? "z" : "0";
  const f = "1+ax";
  const den = dim === 2 ? "1" : "2";
  m.field = [mul("U", f), `-${frac("Uay", den)}`, dim === 3 ? "-Uaz/2" : "0"];
  const width = dim === 2 ? frac("H", f) : frac("H", raw`\sqrt{${f}}`);
  m.valid = raw`\max${par(`\\left|x\\right|/4,${frac(raw`\sqrt{y^{2}+${sq(z)}}`, width)}`)}<1`;
  // Pressure against the pressure where the speed is U: higher where the
  // tube is wide and the flow slow, lower where it narrows and speeds up.
  m.tint = mul("d/2", `U^{2}-${par(m.field.map(sq).join("+"))}`);
  m.scale = 0.5;
  m.speed = 0.4;
  m.density = 0.4;
  m.stream = {
    latex: mul("U", f, "y"),
    perUnit: "4",
    label: "Streamlines",
    mask: only(raw`\left|x\right|<4`) + only(raw`\left|y\right|<${width}`),
  };
  const wall = "#6a7980";
  const majesticWall = "#9fb0bd";
  if (dim === 2)
    for (const s of [-1, 1])
      m.scene.push(
        curve(
          "wall" + (s > 0 ? "p" : "m"),
          ["t", mul(String(s), frac("H", "1+at"))],
          ["-4", "4"],
          { lineWidth: 5, color: wall, majesticColor: majesticWall }
        )
      );
  else
    m.scene.push(
      surface(
        "wall",
        [
          "u",
          mul(frac("H", raw`\sqrt{1+au}`), cos("v")),
          mul(frac("H", raw`\sqrt{1+au}`), sin("v")),
        ],
        ["-4", "4"],
        [raw`\pi`, raw`2\pi`],
        { color: wall, majesticColor: majesticWall }
      )
    );
}

function conductor(m: Demo, dim: 2 | 3) {
  m.vars = [variable("E", 1, -2, 2), variable("R", 1.3, 0.6, 2)];
  m.extent = 5;
  m.probe = dim === 2 ? [2.4, 1] : [2.4, 1, 0.3];
  const z = dim === 3 ? "z" : "0";
  const r2 = `x^{2}+y^{2}+${sq(z)}`;
  m.valid = `${r2}>R^{2}`;
  m.label = "E";
  m.field = [
    mul(
      "E",
      `1-${frac("R^{3}", `${par(r2)}^{1.5}`)}+${frac("3R^{3}x^{2}", `${par(r2)}^{2.5}`)}`
    ),
    frac("3ER^{3}xy", `${par(r2)}^{2.5}`),
    frac(mul("3ER^{3}x", z), `${par(r2)}^{2.5}`),
  ];
  m.tint = mul("-Ex", `1-${frac("R^{3}", `${par(r2)}^{1.5}`)}`);
  m.scale = 3;
  m.speed = 0.6;
  // The flux function y²(1 + 2R³/r³)/2, as its square root: far away that
  // is |y|, so the lines arrive evenly spaced, as a uniform field's do.
  m.stream = {
    latex: raw`\sqrt{${mul("y^{2}", `1+${frac("2R^{3}", `${par("x^{2}+y^{2}")}^{1.5}`)}`)}}`,
    perUnit: "1.25",
    label: "Exact field lines",
  };
  // The induced charge, σ ∝ E cos θ: positive on the side E points to,
  // negative on the other, swapping when E reverses, none when E = 0.
  const side = raw`\left\{E<0:\pi,0\right\}`;
  const red = "#c0503a";
  const blue = "#3a6fc0";
  if (dim === 2) {
    m.scene.push(
      obj("sphere", raw`x^{2}+y^{2}\le R^{2}`, {
        fill: true,
        fillOpacity: 1,
        lines: false,
        color: "#7c8b94",
        majesticColor: "#8d9ba6",
      })
    );
    for (const [key, color, shift] of [
      ["plus", red, ""],
      ["minus", blue, raw`+\pi`],
    ] as const)
      m.scene.push(
        curve(
          key,
          [
            mul("R", cos(`t+${side}${shift}`)),
            mul("R", sin(`t+${side}${shift}`)),
          ],
          [raw`-\frac{\pi}{2}`, raw`\frac{\pi}{2}`],
          {
            color,
            lineWidth: 6,
            latex:
              point([
                mul("R", cos(`t+${side}${shift}`)),
                mul("R", sin(`t+${side}${shift}`)),
              ]) + only("E^{2}>0"),
          }
        )
      );
  } else
    for (const [key, color, shift] of [
      ["plus", "#b8796c", ""],
      ["minus", "#6f8bb8", raw`+\pi`],
    ] as const)
      m.scene.push(
        surface(
          key,
          [
            mul("R", cos(`u+${side}${shift}`), sin("v")),
            mul("R", sin(`u+${side}${shift}`), sin("v")),
            mul("R", cos("v")),
          ],
          [raw`-\frac{\pi}{2}`, raw`\frac{\pi}{2}`],
          ["0", raw`\pi`],
          { color }
        )
      );
}

function induction(m: Demo, dim: 2 | 3) {
  m.vars = [
    // Strong enough at the defaults to flow, peaking at ½BωR = 2: at B = 1
    // and ω = 0.6 the induced field crawled and its colour barely showed.
    variable("B", 2, 0.5, 4),
    variable("w", 1, 0.3, 2),
    variable("R", 2, 1, 3),
  ];
  m.clock = true;
  m.label = "E";
  m.scale = 1;
  m.extent = 6;
  m.probe = dim === 2 ? [3, 0] : [3, 0, 0];
  const rho = "x^{2}+y^{2}";
  const derivative = mul("Bw", cos("wT_{scene}"));
  const factor = raw`\left\{${rho}<R^{2}:1,${frac("R^{2}", rho)}\right\}`;
  m.field = [
    mul(".5", derivative, factor, "y"),
    mul("-.5", derivative, factor, "x"),
    "0",
  ];
  m.valid = `${rho}>0`;
  m.tint = mul("-.5", derivative, factor, raw`\sqrt{${rho}}`);
  m.stream = { latex: raw`\sqrt{${rho}}`, perUnit: "1", label: "Circles" };
  m.speed = 0.5;
  // Born mostly near the solenoid, where the field is: it falls off as 1/r
  // outside, and particles spread evenly were faint there for nothing.
  m.seed = mul(
    "e^{-0.03\\left(x^{2}+y^{2}\\right)}",
    dim === 3 ? "e^{-0.3z^{2}}" : "1"
  );
  const rim = { color: "#8b7a58", majesticColor: "#e0c27a", lineWidth: 4 };
  // In 3D, three turns of the coil, so it reads as a solenoid.
  const levels = dim === 3 ? ["-1.5", "0", "1.5"] : ["0"];
  for (const [i, level] of levels.entries())
    m.scene.push(
      curve(
        `flux${i}`,
        [mul("R", cos("t")), mul("R", sin("t")), ...(dim === 3 ? [level] : [])],
        ["0", raw`2\pi`],
        rim
      )
    );
  const B = mul("B", sin("wT_{scene}"));
  if (dim === 3)
    m.scene.push(
      obj(
        "Bvector",
        raw`\operatorname{vector}${par(point(["0", "0", "0"]) + "," + point(["0", "0", B]))}`,
        { explains: true, color: SECOND_ARROW }
      )
    );
  else {
    // B out of the page as a dot, into it as a cross, sized by |B|.
    m.scene.push(
      obj("Bdot", point(["0", "0"]) + only(`${B}>0`), {
        explains: true,
        points: true,
        pointSize: 9,
        color: SECOND_ARROW,
      })
    );
    for (const s of [-1, 1])
      m.scene.push(
        curve(
          "Bcross" + (s > 0 ? "p" : "m"),
          [".2t", mul(String(s * 0.2), "t")],
          ["-1", "1"],
          {
            explains: true,
            color: SECOND_ARROW,
            lineWidth: 3,
            latex: point([".2t", mul(String(s * 0.2), "t")]) + only(`${B}<0`),
          }
        )
      );
  }
}

const MODELS: Record<string, (m: Demo, dim: 2 | 3) => void> = {
  "ap-projectile": projectile,
  "ap-shm": oscillator,
  "ap-circular": circular,
  "ap-nozzle": streamtube,
  "ap-conductor": conductor,
  "ap-induction": induction,
};

function model(id: string, dim: 2 | 3): Demo {
  const m: Demo = {
    field: ["0", "0", "0"],
    tint: "0",
    scale: 3,
    vars: [],
    scene: [],
    label: "v",
    valid: "1>0",
    seed: "1",
    probe: dim === 2 ? [1, 1] : [1, 1, 0.3],
    extent: 6,
    speed: 0.25,
    density: 1,
  };
  MODELS[id](m, dim);
  return m;
}

const DESCRIPTIONS: Record<
  string,
  {
    name: string;
    blurb: string;
    meaning: ColorMeaning;
    course: 1 | 2;
    unit: number;
  }
> = {
  "ap-projectile": {
    name: "Projectile",
    blurb:
      "Every particle is a projectile thrown from the same place with the body's velocity, so each moves on a parabola with a = g. Colour is vertical velocity: zero at the top, where acceleration is still g. Reset or wait to throw again.",
    meaning: {
      quantity: "Vertical velocity vᵧ",
      low: "falling",
      zero: "top of the arc",
      high: "rising",
    },
    course: 1,
    unit: 1,
  },
  "ap-shm": {
    name: "Oscillator phase portrait",
    blurb:
      "x is displacement, y is velocity: the flow is the state's rate of change (v, −kx/m), not motion in space. The marker is the exact oscillator; colour is its energy. In 3D the same plane sits at z = 0.",
    meaning: {
      quantity: "Energy (mv² + kx²)/2",
      low: "at rest",
      high: "more energy",
      half: "upper",
    },
    course: 1,
    unit: 7,
  },
  "ap-circular": {
    name: "Circular motion",
    blurb:
      "Rigid rotation: velocity is tangent, acceleration points inward, even at constant speed. Colour is kinetic energy per mass, which grows with radius. Negative ω turns it the other way; a still points inward.",
    meaning: {
      quantity: "Kinetic energy per mass ω²r²/2",
      low: "at the axis",
      high: "farther out",
      half: "upper",
    },
    course: 1,
    unit: 2,
  },
  "ap-nozzle": {
    name: "Continuity and Bernoulli",
    blurb:
      "Exact ideal incompressible flow in a narrowing tube: where it narrows it speeds up and the pressure drops. Colour is pressure. The 3D wall is a cutaway. Inviscid, not the Fluid tab's viscous flow.",
    meaning: {
      quantity: "Pressure (Bernoulli)",
      low: "lower: fast",
      zero: "where speed is U",
      high: "higher: slow",
    },
    course: 1,
    unit: 8,
  },
  "ap-conductor": {
    name: "Conductor in a field",
    blurb:
      "Exact field outside a neutral conducting sphere in uniform E: zero inside, meeting the surface at right angles. Red and blue are the induced charge. Colour is potential. 2D is a section of the sphere.",
    meaning: {
      quantity: "Electric potential V",
      low: "negative",
      zero: "the conductor's potential",
      high: "positive",
    },
    course: 2,
    unit: 10,
  },
  "ap-induction": {
    name: "Changing flux",
    blurb:
      "B = B sin(ωt) inside a long solenoid of radius R, zero outside. The flow is the induced electric field: it circulates, strongest when B changes fastest, not when B is largest. Quasistatic, not radiation.",
    meaning: {
      quantity: "Induced E, around the axis",
      low: "clockwise",
      zero: "none",
      high: "counterclockwise",
    },
    course: 2,
    unit: 12,
  },
};

/** For the tests: each 2D preset's function constant along its field. */
export const AP_STREAMS: Record<string, string> = {};

function preset(id: string): GalleryPreset {
  const create = (dim: 2 | 3) => {
    const m = model(id, dim);
    const coords = dim === 2 ? ["x", "y"] : ["x", "y", "z"];
    const vars = [
      ...m.vars,
      ...(m.clock ? [variable("T_{scene}", 0, 0, 1000, 0.01)] : []),
      ...coords.map((c, i) => variable(`p_{${c}}`, m.probe[i], -6, 6, 0.05)),
      variable("s_{gain}", 1, 0, 5),
      toggle("s_{net}", 1, "Field arrow at the probe"),
      toggle("s_{names}", 0, "Vector names"),
      toggle("s_{damp}", 1, "Damped arrow lengths"),
    ];
    const probe = point(coords.map((s) => `p_{${s}}`));
    const arrows = dim === 2 ? probeArrows2D : probeArrows3D;
    const reach = dim === 2 ? 4 : 2.5;
    const explaining = (items: SceneItem[]) =>
      items.map((s) => ({ ...s, explains: true }));
    m.scene.push(
      obj("probe", probe, {
        explains: true,
        points: true,
        pointSize: dim === 2 ? 10 : 4,
        ...(dim === 3 ? { drag3d: ["p_{x}", "p_{y}", "p_{z}"] as const } : {}),
      }),
      ...explaining(
        arrows({
          at: probe,
          gain: "s_{gain}",
          names: "s_{names}",
          damp: "s_{damp}",
          reach,
          valid: atProbe(m.valid),
          dimensions: dim,
          arrows: [
            {
              key: id.replace(/-/g, "") + "net",
              vector: point(m.field.slice(0, dim).map(atProbe)),
              toggle: "s_{net}",
              name: raw`\vec{${m.label}}`,
              color: ARROW,
              nameColor: ARROW,
            },
          ],
        })
      )
    );
    if (m.body !== undefined)
      m.scene.push(
        ...explaining(
          arrows({
            at: m.body.at,
            gain: "s_{gain}",
            names: "s_{names}",
            damp: "s_{damp}",
            reach,
            valid: m.body.valid,
            dimensions: dim,
            arrows: m.body.arrows,
          })
        )
      );
    if (dim === 2 && m.stream !== undefined) {
      AP_STREAMS[id] = m.stream.latex;
      vars.push(toggle("s_{lines}", 1, m.stream.label));
      m.scene.push(
        obj(
          "lines",
          `${sin(mul(m.stream.perUnit, raw`\pi`, m.stream.latex))}=0${m.stream.mask ?? only(m.valid)}${only("s_{lines}=1")}${id === "ap-conductor" ? only(raw`\left|y\right|>0.025`) + only("E^{2}>0") : ""}`,
          { explains: true, lineOpacity: 0.7, lineWidth: 1.5, color: "#303030" }
        )
      );
    }
    const gpu = (s: string) => renameIdentifier(s, "T_{scene}", "t");
    return {
      m,
      vars,
      field: m.field.map((f) => gpu(guard(m.valid, f))),
      tint: gpu(guard(m.valid, m.tint)),
      seed: guard(m.valid, m.seed),
    };
  };
  const a = create(2);
  const b = create(3);
  const { name, blurb, meaning, course, unit } = DESCRIPTIONS[id];
  return {
    id,
    name,
    blurb,
    meaning,
    category: course === 1 ? "ap1" : "ap2",
    apUnit: unit,
    onPaper: true,
    palette: "charge",
    majesticPalette: "charge-glow",
    extent: a.m.extent,
    xLatex: a.field[0],
    yLatex: a.field[1],
    seedLatex: a.seed,
    variables: a.vars,
    scene: a.m.scene,
    tint: { latex: a.tint, latex3d: b.tint, scale: a.m.scale },
    ...(a.m.clock ? { sceneTime: "T_{scene}" } : {}),
    flow: {
      // The charges' density: at 6,000 the flow was too sparse to read as a
      // field on paper, and barely there on the dark.
      particleCount: Math.round(24_000 * a.m.density),
      speed: a.m.speed,
      trailPersistence: 0.84,
      dropRate: 0.03,
      opacity: 0.45,
      pointSize: 1.5,
      glow: 0,
      normalizeSpeed: false,
    },
    space: {
      blurb,
      xLatex: b.field[0],
      yLatex: b.field[1],
      zLatex: b.field[2],
      seedLatex: b.seed,
      variables: b.vars,
      scene: b.m.scene,
      look: {
        particles: Math.round(30_000 * b.m.density),
        speed: b.m.speed * 0.6,
        trail: 16,
        lifetime: 1.2,
        opacity: 0.55,
        glow: 0,
        normalizeSpeed: false,
        absorb: false,
        palette: "charge",
      },
    },
  };
}

export const AP_TEACHING: readonly GalleryPreset[] =
  Object.keys(DESCRIPTIONS).map(preset);
