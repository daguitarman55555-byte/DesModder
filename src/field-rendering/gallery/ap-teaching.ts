/**
 * Two demonstrations for AP Physics 2, each aimed at one reasoning error
 * students make: a conductor in a field, and an induced electric field.
 * (The AP Physics 1 demonstrations that once lived here were removed on
 * 2026-11-07: they were not as good as they should be.)
 *
 * Researched by GPT against the College Board CEDs
 * (docs/VECTOR_TOOLS_AP_CURRICULUM_RESEARCH.md and its answer in
 * docs/research/vector-tools-ap-roadmap/), then reworked here so each is a
 * picture worth looking at as well as a correct one: dense, glowing flows in
 * Majestic, solids that stay visible on the dark, and colour that always
 * names a quantity.
 *
 * Every model is exact for what it claims, and the unit tests check the
 * physics at points: the conductor's E is -grad V and normal to its surface,
 * and the induced field satisfies Faraday's law.
 */
import { renameIdentifier } from "../identifiers";
import {
  cos,
  flow2D,
  flow3D,
  frac,
  guard,
  inked,
  mul,
  only,
  par,
  point,
  sin,
  sq,
  toggle,
  variable,
} from "./kit";
import { probeArrows2D, probeArrows3D } from "./probe";
import type {
  ColorMeaning,
  GalleryPreset,
  GalleryVariable,
  SceneItem,
} from "./types";

const { raw } = String;

/** Ink for paper, and the lighter one the same object needs on the dark. */
const INK = "#394555";
const ARROW = "#244779";

const { obj, path, surface } = inked(INK);
const atProbe = (s: string) =>
  ["x", "y", "z"].reduce((v, a) => renameIdentifier(v, a, `p_{${a}}`), s);

/** Circles of radius 2, 4, 6 and 8, evenly spaced: parametric, not implicit. */

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
    /**
     * The same curves written explicitly, if they can be: an implicit curve
     * over the whole plane cost the projectile 200 ms a slider move.
     */
    explicit?: string;
    /** Its range of t, when `explicit` is a parametric curve in t. */
    domain?: readonly [string, string];
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
        path(
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
              point(
                ...[
                  mul("R", cos(`t+${side}${shift}`)),
                  mul("R", sin(`t+${side}${shift}`)),
                ]
              ) + only("E^{2}>0"),
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

const MODELS: Record<string, (m: Demo, dim: 2 | 3) => void> = {
  "ap-conductor": conductor,
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
    unit: number;
  }
> = {
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
    unit: 10,
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
    const probe = point(...coords.map((s) => `p_{${s}}`));
    const arrows = dim === 2 ? probeArrows2D : probeArrows3D;
    const reach = dim === 2 ? 4 : 2.5;
    m.scene.push(
      obj("probe", probe, {
        explains: true,
        points: true,
        pointSize: dim === 2 ? 10 : 4,
        ...(dim === 3 ? { drag3d: ["p_{x}", "p_{y}", "p_{z}"] as const } : {}),
      }),
      ...arrows({
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
            vector: point(...m.field.slice(0, dim).map(atProbe)),
            toggle: "s_{net}",
            name: raw`\vec{${m.label}}`,
            color: ARROW,
            nameColor: ARROW,
          },
        ],
      })
    );
    if (dim === 2 && m.stream !== undefined) {
      AP_STREAMS[id] = m.stream.latex;
      vars.push(toggle("s_{lines}", 1, m.stream.label));
      m.scene.push(
        obj(
          "lines",
          `${m.stream.explicit ?? `${sin(mul(m.stream.perUnit, raw`\pi`, m.stream.latex))}=0${m.stream.mask ?? only(m.valid)}`}${only("s_{lines}=1")}${id === "ap-conductor" ? only(raw`\left|y\right|>0.025`) + only("E^{2}>0") : ""}`,
          {
            explains: true,
            lineOpacity: 0.7,
            lineWidth: 1.5,
            color: "#303030",
            ...(m.stream.domain === undefined
              ? {}
              : { domain: m.stream.domain }),
          }
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
  const { name, blurb, meaning, unit } = DESCRIPTIONS[id];
  return {
    id,
    name,
    blurb,
    meaning,
    category: "ap2",
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
    flow: flow2D({ speed: a.m.speed, density: a.m.density }),
    space: {
      blurb,
      xLatex: b.field[0],
      yLatex: b.field[1],
      zLatex: b.field[2],
      seedLatex: b.seed,
      variables: b.vars,
      scene: b.m.scene,
      look: flow3D({ speed: b.m.speed * 0.6, density: b.m.density }),
    },
  };
}

export const AP_TEACHING: readonly GalleryPreset[] =
  Object.keys(DESCRIPTIONS).map(preset);
