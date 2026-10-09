/** Exact exterior teaching models. Native solids cover the excluded domains;
 * particle density is illustrative, while tint and probes have stated units. */
import { renameIdentifier } from "../identifiers";
import { probeArrows2D, probeArrows3D, type ProbeArrow } from "./probe";
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";

const { raw } = String;
const par = (x: string) => raw`\left(${x}\right)`;
const sq = (x: string) => `${par(x)}^{2}`;
const root = (x: string) => raw`\sqrt{${x}}`;
const abs = (x: string) => raw`\left|${x}\right|`;
const frac = (x: string, y: string) => raw`\frac{${x}}{${y}}`;
const mul = (...x: string[]) => x.map(par).join(raw`\cdot`);
const sin = (x: string) => raw`\sin${par(x)}`;
const cos = (x: string) => raw`\cos${par(x)}`;
const log = (x: string) => raw`\ln${par(x)}`;
const atan = (x: string) => raw`\arctan${par(x)}`;
const point = (...x: string[]) => par(x.join(","));
const guard = (test: string, x: string) => raw`\left\{${test}:${x},0\right\}`;
const only = (test: string) => raw`\left\{${test}\right\}`;
const varr = (
  name: string,
  value: number,
  min: number,
  max: number,
  step = 0.1
): GalleryVariable => ({ name, value, min, max, step });
const toggle = (
  name: string,
  value: number,
  label: string
): GalleryVariable => ({ ...varr(name, value, 0, 1, 1), toggle: label });
const ink = "#2c3646";
const item = (
  key: string,
  latex: string,
  extra: Partial<SceneItem> = {}
): SceneItem => ({ key, latex, color: ink, ...extra });
const curve = (
  key: string,
  latex: string,
  domain: readonly [string, string],
  extra: Partial<SceneItem> = {}
) => item(key, latex, { domain, lineWidth: 2, ...extra });
const surface = (
  key: string,
  xyz: string[],
  u: readonly [string, string],
  v: readonly [string, string],
  extra: Partial<SceneItem> = {}
) =>
  item(key, point(...xyz), {
    domainU: u,
    domainV: v,
    fill: true,
    fillOpacity: 1,
    ...extra,
  });
const ALONG = frac("1", `1+e^{3${par(`${abs("z")}-2.5`)}}`);

function ball(
  key: string,
  cx: string,
  R: string,
  dim: number,
  color: string,
  colorLatex?: string
): SceneItem {
  return dim === 2
    ? item(key, `${sq(`x-${par(cx)}`)}+y^{2}\\le ${sq(R)}`, {
        fill: true,
        fillOpacity: 1,
        color,
        colorLatex,
      })
    : surface(
        key,
        [
          `${cx}+${mul(R, cos("u"), sin("v"))}`,
          mul(R, sin("u"), sin("v")),
          mul(R, cos("v")),
        ],
        ["0", raw`2\pi`],
        ["0", raw`\pi`],
        { color, colorLatex }
      );
}
function rod(key: string, cx: string, R: string, dim: number): SceneItem[] {
  if (dim === 2) return [ball(key, cx, R, 2, "#59666f")];
  return [
    surface(
      key,
      [`${cx}+${mul(R, cos("u"))}`, mul(R, sin("u")), "v"],
      ["0", raw`2\pi`],
      ["-2.5", "2.5"],
      { color: "#59666f" }
    ),
    ...[-2.5, 2.5].map((z, i) =>
      surface(
        key + "cap" + i,
        [`${cx}+${mul("v", cos("u"))}`, mul("v", sin("u")), String(z)],
        ["0", raw`2\pi`],
        ["0", R],
        { color: "#59666f" }
      )
    ),
  ];
}
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
      item(
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
  parts?: string[][];
  label: string;
  tintScale: number;
  gain: number;
  extras?: ProbeArrow[];
}

function model(id: string, dim: 2 | 3): Model {
  const z = dim === 3 ? "z" : "0";
  const r2 = `x^{2}+y^{2}+${sq(z)}`;
  const r = root(r2);
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
  if (id === "wires" || id === "earth-moon") {
    const grav = id === "earth-moon";
    m.vars = grav
      ? [
          varr("M_{1}", 81, 1, 100, 1),
          varr("M_{2}", 1, 0.1, 20),
          varr("d", dim === 2 ? 6 : 3, 2, dim === 2 ? 12 : 7),
        ]
      : [
          varr("I_{1}", 1, -3, 3),
          varr("I_{2}", 1, -3, 3),
          varr("d", dim === 2 ? 5 : 3, 1, 8),
        ];
    const centers = grav
      ? [`-${frac("dM_{2}", "M_{1}+M_{2}")}`, frac("dM_{1}", "M_{1}+M_{2}")]
      : ["-d/2", "d/2"];
    const radii = grav ? ["0.75", "0.20475"] : ["0.22", "0.22"];
    const ds = centers.map((c) => `x-${par(c)}`);
    const rs = ds.map((dx) => `${sq(dx)}+y^{2}${grav ? `+${sq(z)}` : ""}`);
    m.valid = raw`\min${par(rs.map((s, i) => frac(s, sq(radii[i]))).join(","))}>1`;
    m.parts = rs.map((s, i) =>
      grav
        ? [ds[i], "y", z].map(
            (c) => `-${frac(mul(`M_{${i + 1}}`, c), `${par(s)}^{1.5}`)}`
          )
        : [frac(`-I_{${i + 1}}y`, s), frac(mul(`I_{${i + 1}}`, ds[i]), s), "0"]
    );
    m.field = [0, 1, 2].map((a) => m.parts!.map((p) => p[a]).join("+"));
    m.potential = rs
      .map((s, i) =>
        grav
          ? `-${frac(`M_{${i + 1}}`, root(s))}`
          : `-${mul(`I_{${i + 1}}/2`, log(s))}`
      )
      .join("+");
    m.stream = grav
      ? ds
          .map((dx, i) => `-${frac(mul(`M_{${i + 1}}`, dx), root(rs[i]))}`)
          .join("+")
      : m.potential;
    m.label = grav ? "g" : "B";
    if (!grav) m.potential = root(m.field.map(sq).join("+"));
    m.tintScale = grav ? 15 : 0.5;
    m.gain = grav ? 0.4 : 5;
    m.seed = grav
      ? "1"
      : mul(
          par(rs.map((s) => `e^{-4${sq(`${root(s)}-0.9`)}}`).join("+")),
          dim === 3 ? ALONG : "1"
        );
    centers.forEach((cx, i) => {
      if (!grav) {
        m.scene.push(...rod(`wire${i}`, cx, radii[i], dim));
        if (dim === 2) {
          m.scene.push(
            item(`dot${i}`, point(cx, "0") + only(`I_{${i + 1}}>0`), {
              points: true,
              pointSize: 5,
              color: "#ffffff",
            })
          );
          for (const sign of [1, -1])
            m.scene.push(
              curve(
                `cross${i}${sign === 1 ? "a" : "b"}`,
                point(`${cx}+0.12t`, `${sign * 0.12}t`) +
                  only(`I_{${i + 1}}<0`),
                ["-1", "1"],
                { color: "#ffffff", lineWidth: 3 }
              )
            );
        } else
          m.scene.push(
            item(
              `current${i}`,
              raw`\operatorname{vector}${par(point(`${cx}+0.4`, "0", "0") + "," + point(`${cx}+0.4`, "0", raw`\left\{I_{${i + 1}}>0:1,I_{${i + 1}}<0:-1,0\right\}`))}`,
              { color: "#a23c26", lineWidth: 1.5 }
            )
          );
      } else {
        const X = frac(`x-${par(cx)}`, radii[i]);
        const Y = frac("y", radii[i]);
        const Z = frac("z", radii[i]);
        const light = `0.4+0.6\\max${par(`0,0.6${par(X)}+0.3${par(Y)}+0.74161985${par(Z)}`)}`;
        const terrain = `${sin(`4${par(X)}+2${par(Y)}`)}+0.5${sin(`7${par(Y)}-3${par(Z)}`)}`;
        const channels =
          i === 0
            ? [
                [205, 75, 25],
                [215, 95, 65],
                [220, 58, 100],
              ].map((c) =>
                mul(
                  light,
                  raw`\left\{${abs(Y)}>0.88:${c[0]},${terrain}>0.6:${c[1]},${c[2]}\right\}`
                )
              )
            : [0, 1, 2].map(() =>
                mul(
                  light,
                  `150-38e^{-80${sq(`1-${par(X)}`)}}+20e^{-500${sq(`0.88-${par(X)}`)}}`
                )
              );
        if (dim === 3)
          m.scene.push(
            item(
              `color${i}`,
              `C_{planet${i}vt}=\\operatorname{rgb}${par(channels.join(","))}`,
              { hidden: true }
            )
          );
        m.scene.push(
          ball(
            `planet${i}`,
            cx,
            radii[i],
            dim,
            i === 0 ? "#246aa3" : "#999999",
            dim === 3 ? `C_{planet${i}vt}` : undefined
          )
        );
        if (dim === 2 && i === 0) {
          const disk = only(`${sq(`x-${par(cx)}`)}+y^{2}<${sq(radii[i])}`);
          m.scene.push(
            item(
              "land",
              `${sin(`4${par(X)}+2${par(Y)}`)}+0.5${sin(`7${par(Y)}`)}>0.6${disk}`,
              { fill: true, fillOpacity: 1, color: "#4b733a", lineOpacity: 0 }
            ),
            item("ice", `${abs(Y)}>0.88${disk}`, {
              fill: true,
              fillOpacity: 1,
              color: "#dce4e4",
              lineOpacity: 0,
            })
          );
        }
        if (dim === 2 && i === 1)
          m.scene.push(ball("crater", `${cx}-0.06`, "0.065", 2, "#707070"));
      }
    });
    if (!grav) {
      m.vars.push(toggle("s_{force}", 0, "Force per length on right wire"));
      m.extras = [
        {
          key: "wireForce",
          vector: point(
            frac("-I_{1}I_{2}", "d"),
            "0",
            ...(dim === 3 ? ["0"] : [])
          ),
          toggle: "s_{force}",
          name: raw`\vec{f}_{L}`,
          color: "#7547a8",
          nameColor: "#7547a8",
        },
      ];
    }
  } else if (id === "cylinder") {
    m.vars = [
      varr("U", 1, 0.2, 3),
      varr("R", dim === 2 ? 2 : 1.2, 0.4, dim === 2 ? 3 : 2),
      varr("w", 0.4, -2, 2),
      varr("T_{scene}", 0, 0, 1000, 0.01),
      toggle("s_{force}", 0, "Pressure traction at rim"),
    ];
    const rho = "x^{2}+y^{2}";
    m.valid = `${rho}>R^{2}`;
    m.field = [
      `U${par(`1-${frac(mul("R^{2}", "x^{2}-y^{2}"), sq(rho))}`)}-${frac("R^{2}wy", rho)}`,
      `-${frac("2UR^{2}xy", sq(rho))}+${frac("R^{2}wx", rho)}`,
      "0",
    ];
    m.potential = frac(`U^{2}-${sq(m.field[0])}-${sq(m.field[1])}`, "2");
    m.stream = `Uy${par(`1-${frac("R^{2}", rho)}`)}-${mul("R^{2}w/2", log(frac(rho, "R^{2}")))}`;
    m.seed = mul(
      `e^{-${frac(sq(`${root(rho)}-1.25R`), "0.08R^{2}")}}`,
      dim === 3 ? ALONG : "1"
    );
    m.label = "v";
    m.gain = 1;
    m.tintScale = 2;
    m.scene.push(...rod("cylinder", "0", "R", dim));
    const theta = "wT_{scene}";
    m.scene.push(
      curve(
        "spin",
        point(
          mul("1.005R", cos(theta)),
          mul("1.005R", sin(theta)),
          ...(dim === 3 ? ["t"] : [])
        ),
        dim === 3 ? ["-2.5", "2.5"] : ["0", "1"],
        { color: "#ffffff", lineWidth: 4, points: dim === 2, pointSize: 8 }
      )
    );
    // Gauge-pressure traction at the upper rim: -Δp n, density normalized to one.
    const pressure = frac(`U^{2}-${sq("-2U+Rw")}`, "2");
    m.extras = [
      {
        key: "pressure",
        vector: point("0", `-${par(pressure)}`, ...(dim === 3 ? ["0"] : [])),
        toggle: "s_{force}",
        name: raw`\vec{f}_{p}`,
        color: "#7547a8",
        nameColor: "#7547a8",
      },
    ];
  } else if (id === "capacitor") {
    m.vars = [
      varr("s", 1, -2, 2),
      varr("L", dim === 2 ? 4 : 2.5, 1, 5),
      varr("d", dim === 2 ? 3 : 1.5, 0.5, 4),
    ];
    const b = ["y-d/2", "y+d/2"];
    const A = (b: string) =>
      mul("0.5", log(frac(`${sq("x+L")}+${sq(b)}`, `${sq("x-L")}+${sq(b)}`)));
    const C = (b: string) =>
      raw`\left\{${b}=0:0,${atan(frac("x+L", b))}-${atan(frac("x-L", b))}\right\}`;
    // Integral of log(distance), using |b| to preserve the physical potential across strips.
    const H = (u: string, b: string) =>
      par(
        `${mul(u, log(`${sq(u)}+${sq(b)}`))}-2${par(u)}+${mul("2", abs(b), atan(frac(u, abs(b))))}`
      );
    const V = (b: string) =>
      `-${mul("0.5", par(`${H("x+L", b)}-${H("x-L", b)}`))}`;
    m.valid = raw`\max${par(`${abs("x")}-L,\\min${par(`${abs(b[0])},${abs(b[1])}`)}-0.04`)}>0`;
    m.field = [
      mul("s", `${A(b[0])}-${A(b[1])}`),
      mul("s", `${C(b[0])}-${C(b[1])}`),
      "0",
    ];
    // b=0 outside the plate: limiting primitive u log(u²)-2u.
    const J = (bb: string) =>
      raw`\left\{${bb}=0:-0.5${par(`${mul("x+L", log(sq("x+L")))}-2${par("x+L")}-${mul("x-L", log(sq("x-L")))}+2${par("x-L")}`)},${V(bb)}\right\}`;
    m.potential = mul("s", `${J(b[0])}-${J(b[1])}`);
    // Stream function branch constants are kept separate by restrictions in the scene.
    const K = (u: string, bb: string) =>
      `${mul(u, atan(frac(u, bb)))}-${mul(frac(bb, "2"), log(`${sq(u)}+${sq(bb)}`))}`;
    const S = (bb: string) => par(`-${par(K("x+L", bb))}+${par(K("x-L", bb))}`);
    // Charge changes direction and strength, not the geometric family of lines.
    m.stream = par(`${S(b[0])}-${S(b[1])}`);
    m.tintScale = 3;
    m.gain = 0.5;
    m.seed = mul(
      frac(
        `e^{-${frac("y^{2}", "d^{2}")}}`,
        `1+e^{3${par(`${abs("x")}-L-1`)}}`
      ),
      dim === 3 ? ALONG : "1"
    );
    for (let i = 0; i < 2; i++) {
      const cy = i === 0 ? "d/2" : "-d/2";
      const q = i === 0 ? "s" : "-s";
      const cl = `C_{plate${i}vt}`;
      m.scene.push(
        item(`color${i}`, `${cl}=${signColor(q)}`, { hidden: true }),
        ...box(
          `plate${i}`,
          ["-L", `${cy}-0.04`, "-2.5"],
          ["L", `${cy}+0.04`, "2.5"],
          dim,
          "#999999",
          cl
        )
      );
      for (let j = 0; j < 3; j++) {
        const xx = `${j - 1}\\cdot 0.65L`;
        m.scene.push(
          curve(
            `minus${i}${j}`,
            point(`${xx}+0.13t`, cy, ...(dim === 3 ? ["2.52"] : [])) +
              only(`${abs("s")}>0`),
            ["-1", "1"],
            { color: "#ffffff", lineWidth: 3 }
          ),
          curve(
            `plus${i}${j}`,
            point(xx, `${cy}+0.13t`, ...(dim === 3 ? ["2.53"] : [])) +
              only(`${q}>0`),
            ["-1", "1"],
            { color: "#ffffff", lineWidth: 3 }
          )
        );
      }
    }
  } else if (id === "bar-magnet") {
    m.vars = [
      varr("a", 1.5, 0.5, 3),
      varr("b", 0.4, 0.2, 0.8),
      varr("c", 0.4, 0.2, 0.8),
      varr("p", 1, -2, 2),
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
                : log(`${axis === 1 ? Z : Y}+${rr}`);
            return mul(String((axis === 0 ? 1 : -1) * j * k), val);
          })
        )
        .join("+");
    // On the extension of an x face the normal face integral tends to zero outside its rectangle.
    const logPair = (h: string, lo: string, hi: string) =>
      raw`\left\{${h}=0:\operatorname{sign}${par(hi)}${log(abs(frac(hi, lo)))},${log(`${hi}+${root(`${h}+${sq(hi)}`)}`)}-${log(`${lo}+${root(`${h}+${sq(lo)}`)}`)}\right\}`;
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
        item(`color${i}`, `${cl}=${signColor(i === 0 ? "-p" : "p")}`, {
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
    m.vars = [varr("m", 1, -3, 3)];
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
  } else if (id === "shell-theorem") {
    m.vars = [
      varr("M", 8, 1, 20),
      varr("R", dim === 2 ? 2.5 : 1.5, 0.5, 3),
      toggle("s_{cut}", 1, "Cutaway view (field unchanged)"),
    ];
    m.field = ["x", "y", z].map((a) =>
      guard(`${r}>R`, `-${frac(mul("M", a), `${par(r2)}^{1.5}`)}`)
    );
    m.potential = `-${frac("M", raw`\max${par(`${r},R`)}`)}`;
    m.label = "g";
    m.gain = 2;
    m.tintScale = 3;
    if (dim === 2)
      m.scene.push(
        curve(
          "shell",
          point(mul("R", cos("t")), mul("R", sin("t"))),
          ["0", raw`2\pi`],
          { color: "#8e7856", lineWidth: 5 }
        )
      );
    else
      m.scene.push(
        surface(
          "shell",
          [
            mul("R", cos("u"), sin("v")),
            mul("R", sin("u"), sin("v")),
            mul("R", cos("v")),
          ],
          ["0", raw`\pi\left(2-s_{cut}\right)`],
          ["0", raw`\pi`],
          { color: "#8e7856" }
        )
      );
    m.stream = frac("y", r);
  } else if (id === "uniform-field") {
    m.vars = [
      varr("E_{0}", 1, -3, 3),
      varr("q_{0}", -1, -3, 3),
      toggle("s_{force}", 0, "Force on test charge"),
    ];
    m.valid = `${abs("x")}<3`;
    m.field = ["E_{0}", "0", "0"];
    m.potential = "-E_{0}x";
    m.stream = "y";
    m.gain = 1;
    m.tintScale = 2;
    for (let i = 0; i < 2; i++) {
      const cl = `C_{uniform${i}vt}`;
      m.scene.push(
        item(`color${i}`, `${cl}=${signColor(i === 0 ? "E_{0}" : "-E_{0}")}`, {
          hidden: true,
        }),
        ...box(
          `plate${i}`,
          [i === 0 ? "-3.08" : "3", "-5", "-3"],
          [i === 0 ? "-3" : "3.08", "5", "3"],
          dim,
          "#999999",
          cl
        )
      );
    }
    m.extras = [
      {
        key: "uniformForce",
        vector: point("q_{0}E_{0}", "0", ...(dim === 3 ? ["0"] : [])),
        toggle: "s_{force}",
        name: raw`\vec{F}`,
        color: "#7547a8",
        nameColor: "#7547a8",
      },
    ];
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
      varr("p_{x}", id === "bar-magnet" ? 2.5 : 0, -9, 9, 0.05),
      varr(
        "p_{y}",
        id === "cylinder" ? 3.2 : id === "capacitor" ? 0 : 1.5,
        -9,
        9,
        0.05
      ),
      ...(dim === 3 ? [varr("p_{z}", 0.6, -5, 5, 0.05)] : []),
      varr("s_{arrow}", m.gain, 0, 20),
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
    if (m.parts) {
      vars.push(toggle("s_{parts}", 0, "Each source's field"));
      m.parts.forEach((part, i) =>
        arrows.push({
          key: `part${i}${id.replace(/-/g, "")}`,
          vector: point(...part.slice(0, dim).map(atProbe)),
          toggle: "s_{parts}",
          name: raw`\vec{${m.label}}_{${i + 1}}`,
          color: i === 0 ? "#a4472f" : "#2474a0",
          nameColor: i === 0 ? "#a4472f" : "#2474a0",
        })
      );
    }
    const scene = [
      ...m.scene,
      item("probe", probe, {
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
    if (m.extras) {
      vars.push(varr("s_{forcegain}", 1, 0, 10));
      const extra = {
        ...setup,
        gain: "s_{forcegain}",
        valid: id === "uniform-field" ? setup.valid : "1>0",
        at:
          id === "wires"
            ? point("d/2", "0", ...(dim === 3 ? ["0"] : []))
            : id === "cylinder"
              ? point("0", "R", ...(dim === 3 ? ["0"] : []))
              : probe,
        arrows: m.extras,
      };
      scene.push(...(dim === 2 ? probeArrows2D(extra) : probeArrows3D(extra)));
    }
    if (dim === 2 && m.stream) {
      vars.push(toggle("s_{lines}", 1, "Exact field lines"));
      const mask =
        id === "shell-theorem" ? `${root("x^{2}+y^{2}")}>R` : m.valid;
      const extraMask = ["earth-moon", "dipole"].includes(id)
        ? only(`${abs(id === "earth-moon" ? "y" : "x")}>0.02`)
        : "";
      const nonzero =
        id === "wires"
          ? `${abs("I_{1}")}+${abs("I_{2}")}>0`
          : id === "dipole"
            ? `${abs("m")}>0`
            : "1>0";
      scene.push(
        item(
          "fieldlines",
          `${sin(mul(id === "earth-moon" ? "0.15" : id === "dipole" ? "3" : id === "capacitor" ? "0.25" : "1", raw`\pi`, m.stream))}=0${only("s_{lines}=1")}${only(mask)}${only(nonzero)}${extraMask}${id === "capacitor" ? only(`${abs("y-d/2")}>0.04`) + only(`${abs("y+d/2")}>0.04`) : ""}`,
          {
            explains: true,
            lineWidth: 1.5,
            lineOpacity:
              id === "capacitor"
                ? raw`\left\{\left|s\right|>0:0.8,0\right\}`
                : 0.8,
          }
        )
      );
    }
    if (
      dim === 2 &&
      ["earth-moon", "capacitor", "uniform-field", "shell-theorem"].includes(id)
    ) {
      vars.push(toggle("s_{equi}", 0, "Equipotentials"));
      scene.push(
        item(
          "equi",
          `${sin(mul(raw`\pi`, frac(m.potential, String(m.tintScale * (id === "capacitor" ? 2 : 1)))))}=0${only("s_{equi}=1")}${only(id === "shell-theorem" ? `${root("x^{2}+y^{2}")}>R` : m.valid)}`,
          {
            explains: true,
            lineStyle: "DASHED",
            color: "#303030",
            lineWidth: 1,
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
    category: "fields",
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
    ...(id === "cylinder" ? { sceneTime: "T_{scene}" } : {}),
    flow: {
      // Near the charges' density: at 6,000 the flow was too sparse to read
      // as a field on paper.
      particleCount: 24_000,
      speed: 0.35,
      trailPersistence: 0.84,
      dropRate: 0.03,
      opacity: 0.45,
      pointSize: 1.5,
      glow: 0,
      normalizeSpeed: true,
    },
    space: {
      blurb,
      xLatex: b.field[0],
      yLatex: b.field[1],
      zLatex: b.field[2],
      variables: b.vars,
      scene: b.scene,
      seedLatex: b.seed,
      look: {
        particles: id === "bar-magnet" ? 12000 : 30000,
        speed: 0.18,
        trail: 16,
        lifetime: 1.2,
        opacity: 0.55,
        glow: 0,
        normalizeSpeed: true,
        absorb: false,
        palette: "charge",
      },
    },
  };
}

export const TEACHING_PHYSICS: readonly GalleryPreset[] = [
  teaching(
    "wires",
    "Parallel wires",
    "Exact exterior magnetic field of two infinite wires. Color is magnetic field magnitude; dark curves are contours of Az and exact field lines. Wire ends are display cuts; purple arrow is force per length with a separate physical unit."
  ),
  teaching(
    "earth-moon",
    "Earth and Moon",
    "Exact exterior gravity of spherical masses. Blue tint is negative gravitational potential. Radii ratio 1:0.273; separation compressed for teaching, not a common astronomical scale. Static field, not orbital trajectories or L1."
  ),
  teaching(
    "cylinder",
    "Spinning cylinder",
    "Exact ideal incompressible flow with clockwise-negative circulation. Tint is gauge pressure from Bernoulli at density one; positive spin is CCW, lift downward. Purple rim arrow is pressure traction relative to ambient; not a calibrated no-slip rotating body."
  ),
  teaching(
    "capacitor",
    "Capacitor",
    "Exact field of prescribed uniformly charged infinite-depth strips, not finite equipotential conductors. Tint is electric potential, zero at the midplane. Visible ends are display cuts; signs reverse with charge."
  ),
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
  teaching(
    "shell-theorem",
    "Shell theorem",
    "Exact gravity of a thin uniform spherical shell: zero inside, inverse-square outside. Color is gravitational potential, constant inside. The cutaway changes only the drawing, not the complete physical shell."
  ),
  teaching(
    "uniform-field",
    "Uniform electric field",
    "Ideal infinite parallel plates at x=±3. E is uniform between them and zero outside. Tint is potential relative to the midplane. Optional test-charge force shares normalized reference units; displayed plate ends are cuts, not edges with omitted fringes."
  ),
];
