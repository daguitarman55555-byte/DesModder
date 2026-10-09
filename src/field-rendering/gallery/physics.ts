/**
 * Physics: the fields of the problems a physics course sets, each written in
 * its own variables — charges, currents, masses, distances — which a preset
 * loads into the graph as sliders. Set them to a problem's numbers and the
 * field drawn is that problem's field.
 *
 * Constants are folded into the variables (k, μ₀/2π, G are 1): the shape of
 * a field does not depend on its units, and its strength is one slider.
 */
import { TEACHING_PHYSICS } from "./physics-teaching";
import { probeArrows2D, probeArrows3D, type ProbeSetup } from "./probe";
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";

type Axis = "x" | "y" | "z";

/** Point sources: s·(r − p)/(|r − p|² + soft)^(power/2), summed. */
function sources(
  list: readonly { offset: Partial<Record<Axis, string>>; strength: string }[],
  axes: readonly Axis[],
  power: number,
  soft = 0.05
): Record<Axis, string> {
  const out: Record<Axis, string> = { x: "0", y: "0", z: "0" };
  for (const axis of axes) {
    out[axis] = list
      .map(({ offset, strength }) => {
        const d = (a: Axis) => offset[a] ?? a;
        const r2 = axes.map((a) => `${d(a)}^{2}`).join("+");
        return String.raw`\frac{${strength}${d(axis)}}{\left(${r2}+${soft}\right)^{${power / 2}}}`;
      })
      .join("+");
  }
  return out;
}

/** x shifted by c, bracketed: `\left(x+\frac{d}{2}\right)`. */
const shifted = (a: Axis, by: string) => String.raw`\left(${a}${by}\right)`;

/**
 * Two point charges, q₁ at x = −d/2 and q₂ at x = d/2: Coulomb's law,
 * E = Σ q(r − rᵢ)/|r − rᵢ|³, exactly, outside two small balls of radius
 * `radius` that Desmos draws as the charges; inside them, nothing. In the
 * plane, the slice through them of the charges' own field, so the lines
 * bend as they do in the textbook figure.
 *
 * Unsoftened: the softening a field without solid sources needs, to keep a
 * pole finite, bends every line near a charge. Here the ball covers the
 * pole, and the field is exact everywhere it is drawn.
 */
function charges(axes: readonly Axis[], radius: string) {
  const field = sources(
    [
      {
        offset: { x: shifted("x", String.raw`+\frac{d}{2}`) },
        strength: "q_{1}",
      },
      {
        offset: { x: shifted("x", String.raw`-\frac{d}{2}`) },
        strength: "q_{2}",
      },
    ],
    axes,
    3,
    0
  );
  const outside = chargesOutside(axes, radius);
  const out: Record<Axis, string> = { x: "0", y: "0", z: "0" };
  for (const a of axes)
    out[a] = String.raw`\left\{${outside}:${field[a]},0\right\}`;
  return { ...out, seed: String.raw`\left\{${outside}:1,0\right\}` };
}

/** Outside both charges' balls: Desmos LaTeX, true or false. */
function chargesOutside(axes: readonly Axis[], radius: string) {
  const rest = axes
    .filter((a) => a !== "x")
    .map((a) => `+${a}^{2}`)
    .join("");
  const d2 = (by: string) =>
    String.raw`\left(x${by}\frac{d}{2}\right)^{2}${rest}`;
  return String.raw`\min\left(${d2("+")},${d2("-")}\right)>${radius}^{2}`;
}

/** The charges' radius, in the 2D view (about ±10) and the 3D box (±5). */
const CHARGE_RADIUS_2D = "0.4";
const CHARGE_RADIUS_3D = "0.3";
const CHARGES_2D = charges(["x", "y"], CHARGE_RADIUS_2D);
const CHARGES_3D = charges(["x", "y", "z"], CHARGE_RADIUS_3D);

/**
 * Red for positive, blue for negative, grey for none, as textbooks colour
 * them: a named colour per charge, so its ball and its arrow follow its sign
 * as the slider crosses zero.
 */
const signColor = (q: string) =>
  String.raw`\left\{${q}>0:\operatorname{rgb}\left(189,75,50\right),${q}<0:\operatorname{rgb}\left(36,106,163\right),\operatorname{rgb}\left(119,119,119\right)\right\}`;

/** The two charges' colours and the probe's arrows, the same in 2D and 3D. */
function chargeProbe(
  at: string,
  outside: string,
  dimensions: 2 | 3,
  reach: number
): { colors: SceneItem[]; setup: ProbeSetup } {
  const r = (by: string) =>
    String.raw`\left(\left(p_{x}${by}\frac{d}{2}\right)^{2}+p_{y}^{2}${at.includes("p_{z}") ? "+p_{z}^{2}" : ""}\right)^{1.5}`;
  const rest = at.includes("p_{z}") ? ",p_{y},p_{z}" : ",p_{y}";
  const part = (i: 1 | 2, by: string) =>
    String.raw`\frac{q_{${i}}}{${r(by)}}\left(p_{x}${by}\frac{d}{2}${rest}\right)`;
  return {
    colors: [
      {
        key: "C1",
        latex: String.raw`C_{1vt}=${signColor("q_{1}")}`,
        hidden: true,
      },
      {
        key: "C2",
        latex: String.raw`C_{2vt}=${signColor("q_{2}")}`,
        hidden: true,
      },
      { key: "E1", latex: String.raw`E_{1vt}=${part(1, "+")}`, hidden: true },
      { key: "E2", latex: String.raw`E_{2vt}=${part(2, "-")}`, hidden: true },
    ],
    setup: {
      at,
      gain: "s_{arrow}",
      names: "s_{names}",
      damp: "s_{damp}",
      reach,
      dimensions,
      valid: outside,
      arrows: [
        {
          key: "E",
          vector: String.raw`\left(E_{1vt}+E_{2vt}\right)`,
          toggle: "s_{net}",
          color: "#243b7a",
          nameColor: "#243b7a",
          name: String.raw`\vec{E}`,
        },
        {
          key: "Ea",
          vector: "E_{1vt}",
          toggle: "s_{parts}",
          colorLatex: "C_{1vt}",
          nameColor: "#9a3a24",
          name: String.raw`\vec{E}_{1}`,
        },
        {
          key: "Eb",
          vector: "E_{2vt}",
          toggle: "s_{parts}",
          colorLatex: "C_{2vt}",
          nameColor: "#1d5687",
          name: String.raw`\vec{E}_{2}`,
        },
        {
          key: "F",
          vector: String.raw`q_{0}\left(E_{1vt}+E_{2vt}\right)`,
          toggle: "s_{force}",
          color: "#7547a8",
          nameColor: "#7547a8",
          name: String.raw`\vec{F}`,
        },
      ],
    },
  };
}

/** What a probe needs, as variables: where it is, its gain, its switches. */
const probeSwitches = (gain: number, max: number): GalleryVariable[] => [
  v("q_{0}", -1, -3, 3, 0.1),
  v("s_{arrow}", gain, 0, max),
  t("s_{net}", 1, "Field arrow"),
  t("s_{parts}", 0, "Each charge's arrow"),
  t("s_{force}", 0, "Force on a test charge"),
  t("s_{names}", 0, "Names"),
  t("s_{damp}", 1, "Damped lengths"),
];

/**
 * The charges in the plane, as a textbook draws them: two discs, red with a
 * plus and blue with a minus; a probe point to drag, with its field arrow;
 * and, switchable, the exact field lines and equipotentials.
 *
 * The field lines are the contours of the flux function of two point charges
 * on an axis, S = q₁cos θ₁ + q₂cos θ₂: each is exactly a line of the charges'
 * field, in a plane through them, and between any two neighbours the same
 * flux, so their spacing is the textbook's, denser where the field is
 * stronger. Each charge sends out 2|q|/0.25 of them.
 */
const CHARGES_SCENE_2D: SceneItem[] = (() => {
  const outsideProbe = String.raw`\min\left(\left(p_{x}+\frac{d}{2}\right)^{2}+p_{y}^{2},\left(p_{x}-\frac{d}{2}\right)^{2}+p_{y}^{2}\right)>${CHARGE_RADIUS_2D}^{2}`;
  const { colors, setup } = chargeProbe(
    String.raw`\left(p_{x},p_{y}\right)`,
    outsideProbe,
    2,
    // At home view, ±10: a long arrow reaches a quarter of the way across.
    5
  );
  const R = CHARGE_RADIUS_2D;
  const r = (by: string) =>
    String.raw`\sqrt{\left(x${by}\frac{d}{2}\right)^{2}+y^{2}}`;
  const outside = chargesOutside(["x", "y"], R);
  const charge = (i: 1 | 2, by: string, cx: string): SceneItem[] => [
    {
      key: `ball${i}`,
      latex: String.raw`${r(by)}\le${R}`,
      colorLatex: `C_{${i}vt}`,
      fill: true,
      fillOpacity: 1,
      lineWidth: 1.5,
    },
    {
      // A plus or a minus on it, in white: the sign without a word.
      key: `minus${i}`,
      latex: String.raw`\left(${cx}+0.55\cdot${R}t,0\right)\left\{\left|q_{${i}}\right|>0\right\}`,
      domain: ["-1", "1"],
      color: "#ffffff",
      lineWidth: 3,
    },
    {
      key: `plus${i}`,
      latex: String.raw`\left(${cx},0.55\cdot${R}t\right)\left\{q_{${i}}>0\right\}`,
      domain: ["-1", "1"],
      color: "#ffffff",
      lineWidth: 3,
    },
  ];
  return [
    ...colors,
    ...charge(1, "+", String.raw`-\frac{d}{2}`),
    ...charge(2, "-", String.raw`\frac{d}{2}`),
    {
      // Every line at once, where sin(4πS) is zero, at S = k/4: one implicit
      // curve for Desmos to trace rather than a list of them, each traced over
      // the whole graph. On a change of a charge or the distance that took
      // 400 ms as a list of 81 levels and 320 as the 17 that exist; this, 100.
      key: "lines",
      latex: String.raw`\sin\left(4\pi\left(\frac{q_{1}\left(x+\frac{d}{2}\right)}{${r("+")}}+\frac{q_{2}\left(x-\frac{d}{2}\right)}{${r("-")}}\right)\right)=0\left\{s_{lines}=1\right\}\left\{${outside}\right\}\left\{\left|y\right|>0.02\right\}`,
      color: "#2c3646",
      lineWidth: 2,
      lineOpacity: 0.85,
    },
    {
      // The axis through them, which every contour above meets edge-on.
      key: "axis",
      latex: String.raw`y=0\left\{s_{lines}=1\right\}\left\{${outside}\right\}`,
      color: "#2c3646",
      lineWidth: 2,
      lineOpacity: 0.85,
    },
    {
      key: "equipotentials",
      latex: String.raw`\frac{q_{1}}{${r("+")}}+\frac{q_{2}}{${r("-")}}=\left[-1,-0.5,-0.25,-0.1,0,0.1,0.25,0.5,1\right]\left\{s_{equi}=1\right\}\left\{${outside}\right\}`,
      color: "#303030",
      lineStyle: "DASHED",
      lineWidth: 2,
    },
    {
      key: "probe",
      latex: String.raw`\left(p_{x},p_{y}\right)`,
      color: "#222222",
      points: true,
      pointSize: 12,
    },
    ...probeArrows2D(setup),
  ];
})();

/**
 * The charges in space: two shaded balls, coloured by sign, drawn as
 * surfaces in u and v so the particles behind them are hidden behind them
 * (the depth pass redraws surfaces of that kind, not implicit ones); a probe
 * point, with Desmos's own 3D vectors.
 */
const CHARGES_SCENE_3D: SceneItem[] = (() => {
  const outsideProbe = String.raw`\min\left(\left(p_{x}+\frac{d}{2}\right)^{2}+p_{y}^{2}+p_{z}^{2},\left(p_{x}-\frac{d}{2}\right)^{2}+p_{y}^{2}+p_{z}^{2}\right)>${CHARGE_RADIUS_3D}^{2}`;
  const { colors, setup } = chargeProbe(
    String.raw`\left(p_{x},p_{y},p_{z}\right)`,
    outsideProbe,
    3,
    2.5
  );
  const R = CHARGE_RADIUS_3D;
  const ball = (i: 1 | 2, cx: string): SceneItem => ({
    key: `ball${i}`,
    latex: String.raw`\left(${cx}+${R}\cos\left(u\right)\sin\left(v\right),${R}\sin\left(u\right)\sin\left(v\right),${R}\cos\left(v\right)\right)`,
    colorLatex: `C_{${i}vt}`,
    domainU: ["0", String.raw`2\pi`],
    domainV: ["0", String.raw`\pi`],
  });
  return [
    ...colors,
    ball(1, String.raw`-\frac{d}{2}`),
    ball(2, String.raw`\frac{d}{2}`),
    {
      key: "probe",
      latex: String.raw`\left(p_{x},p_{y},p_{z}\right)`,
      color: "#222222",
      points: true,
      // In 3D a point is a ball, and 12 hid the arrows' tails inside it.
      pointSize: 4,
      drag3d: ["p_{x}", "p_{y}", "p_{z}"],
    },
    ...probeArrows3D(setup),
  ];
})();
/**
 * The charges' particles coloured by the electric potential where they are,
 * V = q₁/r₁ + q₂/r₂ (k = 1): red where it is positive, near a positive
 * charge; blue where negative; slate where it is zero, which between equal
 * and opposite charges is the plane half-way. So the colours mean something
 * a class learns, and they cross over exactly where the equipotential V = 0
 * is drawn.
 */
const CHARGE_TINT = {
  latex: String.raw`\frac{q_{1}}{\sqrt{\left(x+\frac{d}{2}\right)^{2}+y^{2}}}+\frac{q_{2}}{\sqrt{\left(x-\frac{d}{2}\right)^{2}+y^{2}}}`,
  latex3d: String.raw`\frac{q_{1}}{\sqrt{\left(x+\frac{d}{2}\right)^{2}+y^{2}+z^{2}}}+\frac{q_{2}}{\sqrt{\left(x-\frac{d}{2}\right)^{2}+y^{2}+z^{2}}}`,
  // A unit charge's potential 1 from it is 1: three quarters red at 0.3,
  // so the colour reaches well out from each charge before it fades.
  scale: 0.3,
};
/**
 * The flow on paper, for a preset whose Desmos objects carry the picture: a
 * faint, even current of one dark colour, the field's direction everywhere
 * without competing with the arrows and lines that show its size.
 */
const CHARGE_FLOW = {
  // Dense and dark enough to read as the field's grain on white: half this
  // many at 0.28 was a faint wash Rafael found too light.
  particleCount: 32_000,
  speed: 0.35,
  trailPersistence: 0.88,
  dropRate: 0.03,
  opacity: 0.5,
  pointSize: 1.5,
  glow: 0,
  normalizeSpeed: true,
};

const v = (
  name: string,
  value: number,
  min: number,
  max: number,
  step?: number
): GalleryVariable => ({ name, value, min, max, step });
/** A switch for what the objects show, 0 or 1, with its checkbox's label. */
const t = (name: string, value: 0 | 1, label: string): GalleryVariable => ({
  name,
  value,
  min: 0,
  max: 1,
  step: 1,
  toggle: label,
});

/** The charges: the preset the others were built after. */
const CHARGES_PRESET: GalleryPreset = {
  id: "charges",
  name: "Electric charges",
  category: "fields",
  blurb:
    "Two point charges, q₁ and q₂, a distance d apart: Coulomb's law. Opposite charges, and lines run from one to the other; like charges, and they push apart, with a neutral point between. Drag the probe to see the field there, each charge's part of it, and the force on a test charge q₀.",
  xLatex: CHARGES_2D.x,
  yLatex: CHARGES_2D.y,
  seedLatex: CHARGES_2D.seed,
  variables: [
    v("q_{1}", 1, -5, 5, 0.1),
    v("q_{2}", -1, -5, 5, 0.1),
    v("d", 5, 1, 12, 0.1),
    v("p_{x}", 0, -9, 9, 0.05),
    v("p_{y}", 3, -9, 9, 0.05),
    ...probeSwitches(30, 100),
    t("s_{lines}", 1, "Field lines"),
    t("s_{equi}", 0, "Equipotentials"),
  ],
  scene: CHARGES_SCENE_2D,
  onPaper: true,
  palette: "charge",
  tint: CHARGE_TINT,
  flow: CHARGE_FLOW,
  extent: 10,
  space: {
    blurb:
      "Two point charges on the x-axis, q₁ and q₂, a distance d apart: Coulomb's law in space. Move the probe to see the field there, each charge's part of it, and the force on a test charge q₀.",
    xLatex: CHARGES_3D.x,
    yLatex: CHARGES_3D.y,
    zLatex: CHARGES_3D.z,
    seedLatex: CHARGES_3D.seed,
    variables: [
      v("q_{1}", 1, -5, 5, 0.1),
      v("q_{2}", -1, -5, 5, 0.1),
      v("d", 3, 1, 8, 0.1),
      v("p_{x}", 0, -5, 5, 0.05),
      v("p_{y}", 1.5, -5, 5, 0.05),
      v("p_{z}", 1, -5, 5, 0.05),
      ...probeSwitches(10, 40),
    ],
    scene: CHARGES_SCENE_3D,
    look: {
      particles: 36_000,
      speed: 0.18,
      trail: 16,
      // Short: they stream from + to − and piled up at the sink, leaving the
      // positive side sparse; reborn sooner, they stay spread out.
      lifetime: 1.2,
      opacity: 0.6,
      glow: 0,
      normalizeSpeed: true,
      absorb: true,
      palette: "charge",
    },
  },
};

export const PHYSICS: readonly GalleryPreset[] = [
  CHARGES_PRESET,
  ...TEACHING_PHYSICS,
];
