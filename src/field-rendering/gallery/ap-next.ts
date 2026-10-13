/** AP demonstrations: electromagnetic integral laws and force resolution.
 * Every GPU vector is a physical field, not a proxy for an unrelated graph.
 * Numerical Desmos sums are quadratures; exact enclosed-source sums are separate.
 */
import { probeArrows2D, probeArrows3D } from "./probe";
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";
const R = String.raw;
const variable = (
  name: string,
  value: number,
  min: number,
  max: number,
  step = 0.1
): GalleryVariable => ({ name, value, min, max, step });
const toggle = (name: string, text: string): GalleryVariable => ({
  ...variable(name, 1, 0, 1, 1),
  toggle: text,
});
const obj = (
  key: string,
  latex: string,
  other: Partial<SceneItem> = {}
): SceneItem => ({ key, latex, color: "#4b6276", ...other });
const point = (...coords: string[]) => R`\left(${coords.join(",")}\right)`;
const curve = (
  key: string,
  coordinates: string[],
  domain: readonly [string, string],
  other: Partial<SceneItem> = {}
) => obj(key, point(...coordinates), { domain, lineWidth: 2.5, ...other });
const surf = (
  key: string,
  coordinates: string[],
  u: readonly [string, string],
  v: readonly [string, string],
  other: Partial<SceneItem> = {}
) =>
  obj(key, point(...coordinates), {
    domainU: u,
    domainV: v,
    fill: true,
    fillOpacity: 1,
    ...other,
  });
const sphere = (
  key: string,
  coords: string[],
  dim: 2 | 3,
  radius = "0.19",
  other: Partial<SceneItem> = {}
): SceneItem =>
  dim === 2
    ? obj(key, point(coords[0], coords[1]), {
        points: true,
        pointSize: 13,
        color: "#c58143",
        ...other,
      })
    : surf(
        key,
        [
          R`\left(${coords[0]}\right)+${radius}\cos(u)\sin(v)`,
          R`\left(${coords[1]}\right)+${radius}\sin(u)\sin(v)`,
          R`\left(${coords[2]}\right)+${radius}\cos(v)`,
        ],
        ["0", R`2\pi`],
        ["0", R`\pi`],
        { color: "#c58143", majesticColor: "#e9a95d", ...other }
      );
const on = (test: string) => R`\left\{${test}\right\}`;
const norm2 = (a: string[]) => a.map((v) => R`\left(${v}\right)^{2}`).join("+");
/**
 * `normalize` draws direction only, at one speed: for a point source's
 * field, whose strength spans orders of magnitude, every particle away from
 * the sources otherwise stood still as a dot (the colour carries strength).
 */
const universalFlow = (speed: number, density = 1, normalize = false) => ({
  particleCount: Math.round(24000 * density),
  speed,
  trailPersistence: 0.84,
  dropRate: 0.03,
  opacity: 0.47,
  pointSize: 1.5,
  glow: 0,
  normalizeSpeed: normalize,
});
const flow3D = (speed: number, density = 1, normalize = false) => ({
  particles: Math.round(30000 * density),
  speed: speed * 0.6,
  trail: 16,
  lifetime: 1.2,
  opacity: 0.55,
  glow: 0,
  normalizeSpeed: normalize,
  absorb: false,
  palette: "charge" as const,
});

/** Point-charge field, in normalized units epsilon_0=1, k_e=1/(4 pi).
 * The 2D view is a section of the full 3D Coulomb field, not 2D electrostatics.
 */
function gauss(): GalleryPreset {
  const qids = [1, 2] as const;
  const chargeAt = (j: number): string[] => [
    `X_{q${j}}`,
    `Y_{q${j}}`,
    `Z_{q${j}}`,
  ];
  const es = (axis: number, coords: string[]): string =>
    qids
      .map((j) => {
        const d = coords.map((c, i) => R`\left(${c}-${chargeAt(j)[i]}\right)`);
        return R`\frac{q_{${j}}${d[axis]}}{4\pi\left(${norm2(d)}\right)^{1.5}}`;
      })
      .join("+");
  const values = [
    variable("q_{1}", 2, -3, 3, 0.25),
    variable("q_{2}", -1, -3, 3, 0.25),
    variable("X_{q1}", -0.7, -4, 4, 0.1),
    variable("Y_{q1}", 0, -4, 4, 0.1),
    variable("Z_{q1}", 0, -4, 4, 0.1),
    variable("X_{q2}", 2.5, -4, 4, 0.1),
    variable("Y_{q2}", 0, -4, 4, 0.1),
    variable("Z_{q2}", 0, -4, 4, 0.1),
    variable("C_{gx}", 0, -3, 3, 0.1),
    variable("C_{gy}", 0, -3, 3, 0.1),
    variable("C_{gz}", 0, -3, 3, 0.1),
    variable("R_{g}", 1.7, 0.5, 4, 0.1),
    variable("N_{g}", 80, 40, 200, 20),
    variable(R`\alpha_{g}`, 1.0, 0, 6.28, 0.05),
    variable(R`\beta_{g}`, 1.2, 0.05, 3.09, 0.05),
    toggle("s_{gauss}", "Gaussian surface and sample"),
  ];
  const C = ["C_{gx}", "C_{gy}", "C_{gz}"];
  const qdist = (j: number) =>
    norm2(chargeAt(j).map((s, i) => R`${s}-${C[i]}`));
  const helpers: SceneItem[] = [
    // Equal-area Fibonacci quadrature, avoiding polar pole overweighting.
    obj("gheight", R`H_{g}(n)=1-\frac{2\left(n+0.5\right)}{N_{g}}`, {
      hidden: true,
    }),
    obj(
      "gphase",
      R`A_{g}(n)=\operatorname{mod}\left(2.399963229728653n,2\pi\right)`,
      { hidden: true }
    ),
    obj(
      "gpx",
      R`P_{gx}(n)=C_{gx}+R_{g}\sqrt{1-H_{g}(n)^{2}}\cos\left(A_{g}(n)\right)`,
      { hidden: true }
    ),
    obj(
      "gpy",
      R`P_{gy}(n)=C_{gy}+R_{g}\sqrt{1-H_{g}(n)^{2}}\sin\left(A_{g}(n)\right)`,
      { hidden: true }
    ),
    obj("gpz", R`P_{gz}(n)=C_{gz}+R_{g}H_{g}(n)`, { hidden: true }),
  ];
  const P = ["P_{gx}(n)", "P_{gy}(n)", "P_{gz}(n)"];
  const dot = qids
    .map((j) => {
      const d = P.map((s, k) => R`\left(${s}-${chargeAt(j)[k]}\right)`);
      const radial = P.map((s, k) => R`\left(${s}-${C[k]}\right)`);
      return R`\frac{q_{${j}}\left(${d.map((s, k) => `${s}${radial[k]}`).join("+")}\right)}{4\pi R_{g}\left(${norm2(d)}\right)^{1.5}}`;
    })
    .join("+");
  helpers.push(obj("gsample", R`J_{g}(n)=${dot}`, { hidden: true }));
  helpers.push(
    obj(
      "gflux",
      R`\Phi_{g}=\frac{4\pi R_{g}^{2}}{N_{g}}\sum_{n=0}^{N_{g}-1}J_{g}(n)`,
      { color: "#245c8e" }
    )
  );
  helpers.push(
    obj(
      "genclosed",
      R`Q_{g}=\left\{${qdist(1)}<R_{g}^{2}:q_{1},0\right\}+\left\{${qdist(2)}<R_{g}^{2}:q_{2},0\right\}`,
      { color: "#a14a29" }
    )
  );
  helpers.push(obj("gresidual", R`D_{g}=\Phi_{g}-Q_{g}`, { color: "#6f547e" }));
  const sample = [
    R`C_{gx}+R_{g}\sin\left(\beta_{g}\right)\cos\left(\alpha_{g}\right)`,
    R`C_{gy}+R_{g}\sin\left(\beta_{g}\right)\sin\left(\alpha_{g}\right)`,
    R`C_{gz}+R_{g}\cos\left(\beta_{g}\right)`,
  ];
  // Parenthesized sum prevents a precedence error in E dot n.
  const localDotExact = [0, 1, 2]
    .map(
      (k) => R`\left(${es(k, sample)}\right)\frac{${sample[k]}-${C[k]}}{R_{g}}`
    )
    .join("+");
  helpers.push(obj("gdot", R`E_{gn}=${localDotExact}`, { color: "#47678c" }));
  helpers.push(
    obj(
      "gprobeColor",
      R`C_{gprobe}=\left\{E_{gn}\ge0:\operatorname{rgb}(235,150,89),\operatorname{rgb}(85,132,221)\right\}`,
      { hidden: true }
    )
  );
  const fields2 = [es(0, ["x", "y", "0"]), es(1, ["x", "y", "0"])];
  const fields3 = [0, 1, 2].map((k) => es(k, ["x", "y", "z"]));
  /** V = Σ q/(4π|r − rⱼ|), ε₀ = 1. */
  function potential(coords: string[]) {
    return qids
      .map((j) => {
        const d = coords.map((c, i) => R`\left(${c}-${chargeAt(j)[i]}\right)`);
        return R`\frac{q_{${j}}}{4\pi\sqrt{${norm2(d)}}}`;
      })
      .join("+");
  }
  const circle = (dim: 2 | 3): SceneItem[] =>
    dim === 2
      ? [
          curve(
            "gaussianRim",
            [R`C_{gx}+R_{g}\cos(t)`, R`C_{gy}+R_{g}\sin(t)`],
            ["0", R`2\pi`],
            {
              color: "#b28a52",
              explains: true,
              lineStyle: "DASHED",
              lineWidth: 3,
              latex:
                point(R`C_{gx}+R_{g}\cos(t)`, R`C_{gy}+R_{g}\sin(t)`) +
                on("s_{gauss}=1"),
            }
          ),
          // The law, read off the graph: the flux summed beside the charge
          // inside, which agree wherever the sphere is.
          obj(
            "gaussReadout",
            point("C_{gx}", R`C_{gy}+R_{g}+0.6`) + on("s_{gauss}=1"),
            {
              explains: true,
              points: true,
              pointSize: 0,
              color: "#245c8e",
              label: R`Φ = ${"$"}{\Phi_{g}}     Q_enc/ε₀ = ${"$"}{Q_{g}}`,
              labelSize: 1.2,
            }
          ),
        ]
      : // A wireframe, five latitudes and six meridians: a filled sphere
        // drew solid over the flow, hiding the charge inside it, and a
        // Gaussian surface is not a material shell anyway.
        [
          curve(
            "gaussianLatitudes",
            [
              R`C_{gx}+R_{g}\cos(t)\sin(L)`,
              R`C_{gy}+R_{g}\sin(t)\sin(L)`,
              R`C_{gz}+R_{g}\cos(L)`,
            ],
            ["0", R`2\pi`],
            {
              color: "#b28a52",
              majesticColor: "#e2c08a",
              explains: true,
              lineWidth: 1,
              latex:
                point(
                  R`C_{gx}+R_{g}\cos(t)\sin(L)`,
                  R`C_{gy}+R_{g}\sin(t)\sin(L)`,
                  R`C_{gz}+R_{g}\cos(L)`
                ).replace(
                  /L/g,
                  R`\left[\frac{\pi}{6},\frac{\pi}{3},\frac{\pi}{2},\frac{2\pi}{3},\frac{5\pi}{6}\right]`
                ) + on("s_{gauss}=1"),
            }
          ),
          curve(
            "gaussianMeridians",
            [
              R`C_{gx}+R_{g}\cos(M)\sin(t)`,
              R`C_{gy}+R_{g}\sin(M)\sin(t)`,
              R`C_{gz}+R_{g}\cos(t)`,
            ],
            ["0", R`2\pi`],
            {
              color: "#b28a52",
              majesticColor: "#e2c08a",
              explains: true,
              lineWidth: 1,
              latex:
                point(
                  R`C_{gx}+R_{g}\cos(M)\sin(t)`,
                  R`C_{gy}+R_{g}\sin(M)\sin(t)`,
                  R`C_{gz}+R_{g}\cos(t)`
                ).replace(
                  /M/g,
                  R`\left[0,\frac{\pi}{6},\frac{\pi}{3},\frac{\pi}{2},\frac{2\pi}{3},\frac{5\pi}{6}\right]`
                ) + on("s_{gauss}=1"),
            }
          ),
        ];
  const scene = (dim: 2 | 3): SceneItem[] => [
    ...helpers,
    ...qids.map((j) =>
      sphere(
        `charge${j}`,
        dim === 2 ? chargeAt(j).slice(0, 2) : chargeAt(j),
        dim,
        "0.2",
        {
          color: j === 1 ? "#b95b42" : "#4f79b4",
          majesticColor: j === 1 ? "#ee8763" : "#8db8f0",
        }
      )
    ),
    ...(dim === 3
      ? qids.map((j) =>
          obj(`dragCharge${j}`, point(...chargeAt(j)), {
            explains: true,
            points: true,
            pointSize: 9,
            // The charge's own colour: the default slate drew both charges
            // blue-grey, the handle sitting over the sphere.
            color: j === 1 ? "#b95b42" : "#4f79b4",
            drag3d: chargeAt(j) as [string, string, string],
            name3d: { label: `q${j}`, color: j === 1 ? "#b95b42" : "#4f79b4" },
          })
        )
      : []),
    ...circle(dim),
    sphere(
      "normalProbe",
      dim === 2 ? sample.slice(0, 2) : sample,
      dim,
      "0.075",
      {
        explains: true,
        color: "#d49b4a",
        colorLatex: dim === 3 ? "C_{gprobe}" : undefined,
      }
    ),
    sphere("center", dim === 2 ? C.slice(0, 2) : C, dim, "0.05", {
      explains: true,
      color: "#8e8992",
    }),
    ...(dim === 3
      ? [
          obj("dragCenter", point(...C), {
            explains: true,
            points: true,
            pointSize: 10,
            drag3d: C as [string, string, string],
            name3d: { label: "center", color: "#8e8992" },
          }),
        ]
      : []),
  ];
  return {
    id: "ap-gauss-flux",
    name: "Gauss's law: flux and enclosed charge",
    category: "ap2",
    apUnit: 10,
    blurb:
      "A 3D Gaussian surface is mathematical, not a material shell. The native Fibonacci sum approximates its electric flux; Q_g is the exact enclosed charge in ε₀=1 units. Avoid placing charges on the surface. In 2D this is a slice, not a 2D flux integral.",
    // Potential, as on the charges: E·n̂ measured from the sphere's centre
    // meant something only on the surface, and coloured the rest grey.
    meaning: {
      quantity: "Electric potential V",
      low: "negative, near −",
      zero: "V = 0",
      high: "positive, near +",
    },
    palette: "charge",
    majesticPalette: "charge-glow",
    onPaper: true,
    extent: 5,
    xLatex: fields2[0],
    yLatex: fields2[1],
    tint: {
      latex: potential(["x", "y", "0"]),
      latex3d: potential(["x", "y", "z"]),
      scale: 0.3,
    },
    variables: values,
    scene: scene(2),
    flow: universalFlow(0.35, 0.7, true),
    space: {
      blurb:
        "3D Coulomb field and movable Gaussian sphere. Φ_g is a finite quadrature, Q_g is exact. Sphere neutral; a selected point's E·n is in the expression list; continuous surface colouring is NOT claimed.",
      xLatex: fields3[0],
      yLatex: fields3[1],
      zLatex: fields3[2],
      variables: values,
      scene: scene(3),
      look: flow3D(0.35, 0.8, true),
    },
  };
}

/** Long, parallel currents in the +z direction. Unit system mu_0=1. */
function ampere(): GalleryPreset {
  const values = [
    variable("I_{a1}", 1, -3, 3, 0.1),
    variable("I_{a2}", -0.6, -3, 3, 0.1),
    variable("X_{a1}", -1.7, -3, 3, 0.1),
    variable("X_{a2}", 1.7, -3, 3, 0.1),
    variable("C_{ax}", -1.7, -3, 3, 0.1),
    variable("C_{ay}", 0, -2.5, 2.5, 0.1),
    variable("C_{az}", 0, -2, 2, 0.1),
    variable("R_{a}", 1, 0.5, 3, 0.05),
    variable(R`\alpha_{a}`, 0.3, 0, 1.15, 0.05),
    variable("N_{a}", 80, 40, 160, 20),
    toggle("s_{amp}", "Circulation loop and sample"),
  ];
  const bx = (x: string, y: string) =>
    [1, 2]
      .map(
        (j) =>
          R`-\frac{I_{a${j}}${y}}{2\pi\left(\left(${x}-X_{a${j}}\right)^{2}+\left(${y}\right)^{2}\right)}`
      )
      .join("");
  const by = (x: string, y: string) =>
    [1, 2]
      .map(
        (j) =>
          R`\frac{I_{a${j}}\left(${x}-X_{a${j}}\right)}{2\pi\left(\left(${x}-X_{a${j}}\right)^{2}+\left(${y}\right)^{2}\right)}`
      )
      .join("+");
  const xy = [
    R`C_{ax}+R_{a}\cos(t)`,
    R`C_{ay}+R_{a}\cos\left(\alpha_{a}\right)\sin(t)`,
  ];
  const samples: SceneItem[] = [
    obj("axisx", R`X_{a}(t)=${xy[0]}`, { hidden: true }),
    obj("axisy", R`Y_{a}(t)=${xy[1]}`, { hidden: true }),
    obj(
      "integrand",
      R`J_{a}(t)=\left(${bx("X_{a}(t)", "Y_{a}(t)")}\right)\left(-R_{a}\sin(t)\right)+\left(${by("X_{a}(t)", "Y_{a}(t)")}\right)R_{a}\cos\left(\alpha_{a}\right)\cos(t)`,
      { hidden: true }
    ),
    obj(
      "circulation",
      R`C_{a}=\frac{2\pi}{N_{a}}\sum_{n=0}^{N_{a}-1}J_{a}\left(\frac{2\pi\left(n+0.5\right)}{N_{a}}\right)`,
      { color: "#245c8e" }
    ),
    obj(
      "enclosed",
      R`I_{enc}=\left\{\frac{\left(X_{a1}-C_{ax}\right)^{2}}{R_{a}^{2}}+\frac{C_{ay}^{2}}{R_{a}^{2}\cos\left(\alpha_{a}\right)^{2}}<1:I_{a1},0\right\}+\left\{\frac{\left(X_{a2}-C_{ax}\right)^{2}}{R_{a}^{2}}+\frac{C_{ay}^{2}}{R_{a}^{2}\cos\left(\alpha_{a}\right)^{2}}<1:I_{a2},0\right\}`,
      { color: "#a14a29" }
    ),
    obj("residual", R`D_{a}=C_{a}-I_{enc}`, { color: "#765d8e" }),
  ];
  const loop = (dim: 2 | 3): SceneItem[] => [
    curve(
      "ampereLoop",
      dim === 2
        ? xy
        : [...xy, R`C_{az}+R_{a}\sin\left(\alpha_{a}\right)\sin(t)`],
      ["0", R`2\pi`],
      {
        explains: true,
        color: "#d59f50",
        lineWidth: 3,
        latex:
          point(
            ...(dim === 2
              ? xy
              : [...xy, R`C_{az}+R_{a}\sin\left(\alpha_{a}\right)\sin(t)`])
          ) + on("s_{amp}=1"),
      }
    ),
    // The law, read off the graph in 2D (3D draws no labels).
    ...(dim === 2
      ? [
          obj(
            "ampereReadout",
            point("C_{ax}", "C_{ay}+R_{a}+0.6") + on("s_{amp}=1"),
            {
              explains: true,
              points: true,
              pointSize: 0,
              color: "#245c8e",
              label: `∮B·dl = \${C_{a}}     μ₀I_enc = \${I_{enc}}`,
              labelSize: 1.2,
            }
          ),
        ]
      : []),
  ];
  const conductor = (j: number, dim: 2 | 3): SceneItem =>
    dim === 2
      ? obj(`wire${j}`, R`\left(x-X_{a${j}}\right)^{2}+y^{2}\le0.045`, {
          fill: true,
          color: "#66717d",
          majesticColor: "#b2bac7",
        })
      : surf(
          `wire${j}`,
          [R`X_{a${j}}+0.21\cos(u)`, R`0.21\sin(u)`, "v"],
          ["0", R`2\pi`],
          ["-3", "3"],
          { color: "#72808b", majesticColor: "#adb8c5" }
        );
  const scene = (dim: 2 | 3): SceneItem[] => [
    ...samples,
    conductor(1, dim),
    conductor(2, dim),
    ...loop(dim),
    ...(dim === 3
      ? [
          sphere("loopCenter", ["C_{ax}", "C_{ay}", "C_{az}"], 3, "0.07", {
            explains: true,
            drag3d: ["C_{ax}", "C_{ay}", "C_{az}"],
          }),
        ]
      : []),
  ];
  const fieldx = bx("x", "y");
  const fieldy = by("x", "y");
  const strength = R`\sqrt{\left(${fieldx}\right)^{2}+\left(${fieldy}\right)^{2}}`;
  return {
    id: "ap-ampere-loop",
    name: "Ampère's law: loop and circulation",
    category: "ap2",
    apUnit: 12,
    blurb:
      "Two infinite, stationary z-directed wires. A tilted loop has native midpoint circulation C_a; I_enc is the exact algebraic enclosed current in μ₀=1 units. Do not touch the wire with the path. The current field is magnetostatic: no displacement current.",
    meaning: {
      quantity: "Magnetic field magnitude |B| (μ₀=1)",
      low: "weak",
      high: "near conducting wires",
      half: "upper",
    },
    palette: "charge",
    majesticPalette: "charge-glow",
    onPaper: true,
    extent: 5,
    xLatex: fieldx,
    yLatex: fieldy,
    // |B| is a few tenths near the wires at these currents: at 0.6 the
    // field was all the dark end of the palette in Majestic.
    tint: { latex: strength, latex3d: strength, scale: 0.15 },
    variables: values,
    scene: scene(2),
    flow: universalFlow(0.35, 0.85, true),
    space: {
      blurb:
        "Loop is a plane ellipse in xy projection and a circle in 3D; B remains horizontal. A tilted loop changes the sampled circulation but not its exact topological count.",
      xLatex: fieldx,
      yLatex: fieldy,
      zLatex: "0",
      variables: values,
      scene: scene(3),
      look: flow3D(0.35, 0.8, true),
    },
  };
}

function incline(): GalleryPreset {
  const vars = [
    variable(R`\theta_{r}`, 0.43, 0.05, 1.12, 0.01),
    variable(R`\mu_{s}`, 0.55, 0, 1.2, 0.05),
    variable(R`\mu_{k}`, 0.3, 0, 1.2, 0.05),
    variable("m_{r}", 2, 0.5, 4, 0.1),
    variable("g", 2, 0.5, 4, 0.1),
    toggle("s_{forces}", "Show four forces"),
    toggle("s_{names}", "Force names"),
  ];
  // Static friction is whatever cancels m g sin theta up to its bound, NOT mu_s N.
  const sin = R`\sin\left(\theta_{r}\right)`;
  const cos = R`\cos\left(\theta_{r}\right)`;
  const normal = R`m_{r}g${cos}`;
  const along = R`m_{r}g${sin}`;
  const fs = R`\left\{${sin}\le\mu_{s}${cos}:${along},\mu_{k}${normal}\right\}`;
  const net = R`${along}-F_{fr}`;
  const helpers = [
    obj("fric", R`F_{fr}=${fs}`, { color: "#805a3c" }),
    obj("norm", R`F_{N}=${normal}`, { color: "#6a7391" }),
    obj("along", R`F_{slope}=${along}`, { color: "#bd7346" }),
    obj("net", R`F_{net}=${net}`, { color: "#94678c" }),
    obj("break", R`\theta_{break}=\arctan\left(\mu_{s}\right)`, {
      color: "#ad5e40",
    }),
  ];
  const c2 = [
    R`-0.2-0.4${sin}`,
    R`-3+3.8\tan\left(\theta_{r}\right)+0.4${cos}`,
  ];
  const c3 = [c2[0], "0", c2[1]];
  /**
   * The four forces on the block, drawn by the probe's arrows: Desmos 2D has
   * no vector(), and these also name themselves. Undamped, one gain, so the
   * lengths are in proportion: friction visibly matches the downslope pull
   * until it can't.
   */
  const forces = (
    dim: 2 | 3,
    list: { key: string; vector: string[]; name: string; color: string }[]
  ): SceneItem[] =>
    (dim === 2 ? probeArrows2D : probeArrows3D)({
      at: point(...(dim === 2 ? c2 : c3)),
      gain: "0.22",
      names: "s_{names}",
      damp: "0",
      reach: 3,
      valid: "1>0",
      dimensions: dim,
      arrows: list.map((f) => ({
        key: f.key,
        vector: point(...f.vector),
        toggle: "s_{forces}",
        name: f.name,
        color: f.color,
        nameColor: f.color,
      })),
    }).map((item) => ({ ...item, explains: true }));
  const scene = (dim: 2 | 3): SceneItem[] => {
    const weight = dim === 2 ? ["0", "-m_{r}g"] : ["0", "0", "-m_{r}g"];
    const norm =
      dim === 2
        ? [R`-F_{N}${sin}`, R`F_{N}${cos}`]
        : [R`-F_{N}${sin}`, "0", R`F_{N}${cos}`];
    const fric =
      dim === 2
        ? [R`F_{fr}${cos}`, R`F_{fr}${sin}`]
        : [R`F_{fr}${cos}`, "0", R`F_{fr}${sin}`];
    const total =
      dim === 2
        ? [R`-F_{net}${cos}`, R`-F_{net}${sin}`]
        : [R`-F_{net}${cos}`, "0", R`-F_{net}${sin}`];
    return [
      ...helpers,
      dim === 2
        ? obj(
            "ramp",
            R`\operatorname{polygon}\left(${[point("-4", "-3"), point("3", R`-3+7\tan\left(\theta_{r}\right)`), point("3", R`-3+7\tan\left(\theta_{r}\right)-0.2`), point("-4", "-3.2")].join(",")}\right)`,
            { fill: true, color: "#596d78", majesticColor: "#8b9dad" }
          )
        : surf(
            "ramp",
            [R`-4+7u`, "-1+2v", R`-3+7u\tan\left(\theta_{r}\right)`],
            ["0", "1"],
            ["0", "1"],
            { color: "#596d78", majesticColor: "#90a2b2" }
          ),
      sphere("block", dim === 2 ? c2 : c3, dim, "0.29", {
        color: "#c57b40",
        majesticColor: "#f2ad64",
      }),
      ...forces(dim, [
        {
          key: "gravity",
          vector: weight,
          name: String.raw`\vec{F}_{g}`,
          color: "#9a4550",
        },
        {
          key: "normalForce",
          vector: norm,
          name: String.raw`\vec{N}`,
          color: "#4b6b9c",
        },
        {
          key: "friction",
          vector: fric,
          name: String.raw`\vec{f}`,
          color: "#6d8740",
        },
        {
          key: "netForce",
          vector: total,
          name: String.raw`\vec{F}_{net}`,
          color: "#9b62ac",
        },
      ]),
    ];
  };
  return {
    id: "ap-incline-forces",
    name: "Incline: static to kinetic friction",
    category: "ap1",
    apUnit: 2,
    blurb:
      "Quasistatic threshold: if tan θ ≤ μs the block rests and friction matches the downslope gravity component; otherwise sliding is assumed and friction magnitude is μkN. The drawn g field shows gravity, not the block's actual velocity.",
    meaning: {
      quantity: "Gravitational potential per mass g × elevation",
      low: "lower height",
      high: "higher height",
      half: "upper",
    },
    palette: "charge",
    majesticPalette: "charge-glow",
    onPaper: true,
    extent: 6,
    xLatex: "0",
    yLatex: "-g",
    tint: {
      latex: R`g\left(y+3\right)`,
      latex3d: R`g\left(z+3\right)`,
      scale: 5,
    },
    variables: vars,
    scene: scene(2),
    flow: universalFlow(0.24, 0.58),
    space: {
      blurb:
        "Z is up. A uniform gravitational field is shown by the particle stream; the body need not follow that stream because the normal and friction act on it.",
      xLatex: "0",
      yLatex: "0",
      zLatex: "-g",
      variables: vars,
      scene: scene(3),
      look: flow3D(0.24, 0.5),
    },
  };
}

export const AP_NEXT: readonly GalleryPreset[] = [gauss(), ampere(), incline()];
