/** Exact exterior teaching models. Native solids cover the excluded domains;
 * particle density is illustrative, while tint and probes have stated units. */
import { renameIdentifier } from "../identifiers";
import {
  abs,
  atan,
  flow2D,
  flow3D,
  frac,
  guard,
  inked,
  ln,
  mul,
  only,
  par,
  point,
  root,
  sin,
  sq,
  toggle,
  variable,
} from "./kit";
import { probeArrows2D, probeArrows3D, type ProbeArrow } from "./probe";
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";

const { raw } = String;
const { obj, surface } = inked("#2c3646");

function box(
  key: string,
  lo: string[],
  hi: string[],
  dim: number,
  color: string,
  colorLatex?: string
): SceneItem[] {
  if (dim === 2)
    return [
      obj(
        key,
        raw`\operatorname{polygon}${par([point(lo[0], lo[1]), point(hi[0], lo[1]), point(hi[0], hi[1]), point(lo[0], hi[1])].join(","))}`,
        { color, colorLatex, fill: true, fillOpacity: 1 }
      ),
    ];
  return [0, 1, 2].flatMap((a) =>
    [0, 1].map((side) => {
      const other = [0, 1, 2].filter((j) => j !== a);
      const p = ["", "", ""];
      p[a] = (side ? hi : lo)[a];
      p[other[0]] = "u";
      p[other[1]] = "v";
      return surface(
        key + a + side,
        p,
        [lo[other[0]], hi[other[0]]],
        [lo[other[1]], hi[other[1]]],
        { color, colorLatex }
      );
    })
  );
}
const signColor = (q: string) =>
  raw`\left\{${q}>0:\operatorname{rgb}(189,75,50),${q}<0:\operatorname{rgb}(36,106,163),\operatorname{rgb}(119,119,119)\right\}`;
const atProbe = (s: string) =>
  ["x", "y", "z"].reduce((s, a) => renameIdentifier(s, a, `p_{${a}}`), s);
interface Model {
  field: string[];
  valid: string;
  potential: string;
  seed: string;
  scene: SceneItem[];
  vars: GalleryVariable[];
  stream?: string;
  label: string;
  tintScale: number;
  gain: number;
}

function model(id: string, dim: 2 | 3): Model {
  const z = dim === 3 ? "z" : "0";
  const r2 = `x^{2}+y^{2}+${sq(z)}`;
  const m: Model = {
    field: ["0", "0", "0"],
    valid: "1>0",
    potential: "0",
    seed: "1",
    scene: [],
    vars: [],
    label: "E",
    tintScale: 1,
    gain: 1,
  };
  if (id === "bar-magnet") {
    m.vars = [
      variable("a", 1.5, 0.5, 3),
      variable("b", 0.4, 0.2, 0.8),
      variable("c", 0.4, 0.2, 0.8),
      variable("p", 1, -2, 2),
    ];
    // Integrated charged-face exterior field of a uniformly magnetized rectangular prism.
    const face = (X: string, axis: number) =>
      [1, -1]
        .flatMap((j) =>
          [1, -1].map((k) => {
            const Y = `y+${j}b`;
            const Z = `${z}+${k}c`;
            const rr = root(`${sq(X)}+${sq(Y)}+${sq(Z)}`);
            const val =
              axis === 0
                ? atan(frac(mul(Y, Z), mul(X, rr)))
                : ln(`${axis === 1 ? Z : Y}+${rr}`);
            return mul(String((axis === 0 ? 1 : -1) * j * k), val);
          })
        )
        .join("+");
    // On the extension of an x face the normal face integral tends to zero outside its rectangle.
    const logPair = (h: string, lo: string, hi: string) =>
      raw`\left\{${h}=0:\operatorname{sign}${par(hi)}${ln(abs(frac(hi, lo)))},${ln(`${hi}+${root(`${h}+${sq(hi)}`)}`)}-${ln(`${lo}+${root(`${h}+${sq(lo)}`)}`)}\right\}`;
    const F = (X: string, axis: number) =>
      axis === 0
        ? raw`\left\{${X}=0:0,${face(X, axis)}\right\}`
        : [1, -1]
            .map((j) =>
              mul(
                String(-j),
                axis === 1
                  ? logPair(`${sq(X)}+${sq(`y+${j}b`)}`, `${z}-c`, `${z}+c`)
                  : logPair(`${sq(X)}+${sq(`${z}+${j}c`)}`, "y-b", "y+b")
              )
            )
            .join("+");
    m.field = [0, 1, 2].map((a) =>
      mul("p", `${F("x-a", a)}-${par(F("x+a", a))}`)
    );
    m.valid = raw`\max${par(`${frac(abs("x"), "a")},${frac(abs("y"), "b")},${frac(abs(z), "c")}`)}>1`;
    m.potential = root(m.field.map(sq).join("+"));
    m.tintScale = 2;
    m.label = "B";
    m.gain = 1;
    for (let i = 0; i < 2; i++) {
      const cl = `C_{bar${i}vt}`;
      m.scene.push(
        obj(`color${i}`, `${cl}=${signColor(i === 0 ? "-p" : "p")}`, {
          hidden: true,
        }),
        ...box(
          `bar${i}`,
          [i === 0 ? "-a" : "0", "-b", "-c"],
          [i === 0 ? "0" : "a", "b", "c"],
          dim,
          "#999999",
          cl
        )
      );
    }
  } else if (id === "dipole") {
    m.vars = [variable("m", 1, -3, 3)];
    m.valid = `${r2}>0`;
    m.field = [
      frac("3mxy", `${par(r2)}^{2.5}`),
      frac(`m${par(`3y^{2}-${par(r2)}`)}`, `${par(r2)}^{2.5}`),
      frac(`3my${z}`, `${par(r2)}^{2.5}`),
    ];
    m.potential = frac("my", `${par(r2)}^{1.5}`);
    m.tintScale = 0.3;
    m.label = "B";
    m.gain = 3;
    // Axisymmetric flux; in the meridional plane the contours are the exact dipole lines.
    m.stream = frac("mx^{2}", `${par("x^{2}+y^{2}")}^{1.5}`);
    m.seed = `e^{-0.1${par(r2)}}`;
  }
  return m;
}

function teaching(id: string, name: string, blurb: string): GalleryPreset {
  const create = (dim: 2 | 3) => {
    const m = model(id, dim);
    const args = dim === 3 ? ["x", "y", "z"] : ["x", "y"];
    const probe = point(...args.map((a) => `p_{${a}}`));
    const vars = [
      ...m.vars,
      variable("p_{x}", id === "bar-magnet" ? 2.5 : 0, -9, 9, 0.05),
      variable("p_{y}", 1.5, -9, 9, 0.05),
      ...(dim === 3 ? [variable("p_{z}", 0.6, -5, 5, 0.05)] : []),
      variable("s_{arrow}", m.gain, 0, 20),
      toggle("s_{net}", 1, "Field arrow"),
      toggle("s_{names}", 0, "Names"),
      toggle("s_{damp}", 1, "Damped lengths"),
    ];
    const arrows: ProbeArrow[] = [
      {
        key: `${id.replace(/-/g, "")}net`,
        vector: point(...m.field.slice(0, dim).map(atProbe)),
        toggle: "s_{net}",
        name: raw`\vec{${m.label}}`,
        color: "#243b7a",
        nameColor: "#243b7a",
      },
    ];
    const scene = [
      ...m.scene,
      obj("probe", probe, {
        points: true,
        pointSize: dim === 2 ? 12 : 4,
        color: "#222222",
        ...(dim === 3 ? { drag3d: ["p_{x}", "p_{y}", "p_{z}"] as const } : {}),
        explains: true,
      }),
    ];
    const setup = {
      at: probe,
      gain: "s_{arrow}",
      names: "s_{names}",
      damp: "s_{damp}",
      reach: dim === 2 ? 5 : 2.5,
      valid: atProbe(m.valid),
      dimensions: dim,
      arrows,
    };
    scene.push(...(dim === 2 ? probeArrows2D(setup) : probeArrows3D(setup)));
    if (dim === 2 && m.stream) {
      vars.push(toggle("s_{lines}", 1, "Exact field lines"));
      const mask = m.valid;
      const extraMask = id === "dipole" ? only(`${abs("x")}>0.02`) : "";
      const nonzero = id === "dipole" ? `${abs("m")}>0` : "1>0";
      scene.push(
        obj(
          "fieldlines",
          `${sin(mul(id === "dipole" ? "3" : "1", raw`\pi`, m.stream))}=0${only("s_{lines}=1")}${only(mask)}${only(nonzero)}${extraMask}`,
          {
            explains: true,
            lineWidth: 1.5,
            lineOpacity: 0.8,
          }
        )
      );
    }
    return {
      m,
      vars,
      scene,
      field: m.field.map((f) => guard(m.valid, f)),
      seed: guard(m.valid, raw`\min${par(`1,${m.seed}`)}`),
    };
  };
  const a = create(2);
  const b = create(3);
  return {
    id,
    name,
    ...AP_PLACE[id],
    blurb,
    xLatex: a.field[0],
    yLatex: a.field[1],
    variables: a.vars,
    scene: a.scene,
    seedLatex: a.seed,
    onPaper: true,
    palette: "charge",
    extent: id === "dipole" ? 6 : 10,
    tint: {
      latex: guard(a.m.valid, a.m.potential),
      latex3d: guard(b.m.valid, b.m.potential),
      scale: a.m.tintScale,
    },
    flow: flow2D({ speed: 0.35, normalize: true }),
    space: {
      blurb,
      xLatex: b.field[0],
      yLatex: b.field[1],
      zLatex: b.field[2],
      variables: b.vars,
      scene: b.scene,
      seedLatex: b.seed,
      look: flow3D({
        speed: 0.18,
        density: id === "bar-magnet" ? 0.4 : 1,
        normalize: true,
      }),
    },
  };
}

/**
 * Each preset's AP course and unit (2024 CEDs, current for the 2026 and 2027
 * exams): fields of charges are AP Physics 2's unit 10 and magnetism its
 * unit 12.
 */
const AP_PLACE: Record<string, Pick<GalleryPreset, "category" | "apUnit">> = {
  "bar-magnet": { category: "ap2", apUnit: 12 },
  dipole: { category: "ap2", apUnit: 12 },
};

export const TEACHING_PHYSICS: readonly GalleryPreset[] = [
  teaching(
    "bar-magnet",
    "Bar magnet",
    "Exact exterior field of a uniformly magnetized rectangular prism, along x. Red is north, blue south, reversed by magnetization. Tint is field magnitude, not pole charge. Interior hidden and excluded, not replaced by an arbitrary field."
  ),
  teaching(
    "dipole",
    "Magnetic dipole",
    "Ideal static point dipole along y in both dimensions; no finite core. Tint is exterior magnetic scalar potential m y/r cubed. Radially weighted particle births show direction, not quantitative field density. Origin excluded only."
  ),
];
