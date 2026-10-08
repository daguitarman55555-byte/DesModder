/**
 * Physics: the fields of the problems a physics course sets, each written in
 * its own variables — charges, currents, masses, distances — which a preset
 * loads into the graph as sliders. Set them to a problem's numbers and the
 * field drawn is that problem's field.
 *
 * Constants are folded into the variables (k, μ₀/2π, G are 1): the shape of
 * a field does not depend on its units, and its strength is one slider.
 */
import { probeArrows2D, probeArrows3D } from "./probe";
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

/**
 * Two long straight wires along z, at x = ∓d/2, carrying I₁ and I₂ out of
 * the plane: Ampère's law, B = Σ I ẑ × (r − rᵢ)/|r − rᵢ|². The same in
 * every plane across them, so the box draws it as rings round the wires.
 */
function wires() {
  const at = [
    { x: shifted("x", String.raw`+\frac{d}{2}`), current: "I_{1}" },
    { x: shifted("x", String.raw`-\frac{d}{2}`), current: "I_{2}" },
  ];
  const r2 = (x: string) => String.raw`${x}^{2}+y^{2}+0.05`;
  return {
    x: at.map((w) => String.raw`\frac{-${w.current}y}{${r2(w.x)}}`).join("+"),
    y: at
      .map((w) => String.raw`\frac{${w.current}${w.x}}{${r2(w.x)}}`)
      .join("+"),
    z: "0",
  };
}

/**
 * Two masses a distance d apart, M₁ and M₂, each placed from their common
 * centre of mass as a real pair is: Newton's gravity, g = −Σ M(r − rᵢ)/
 * |r − rᵢ|³. Between them, where the two pulls cancel, is the neutral point
 * (near the Earth–Moon L1 point; in the rotating frame, L1 itself).
 */
function gravity(axes: readonly Axis[]) {
  return sources(
    [
      {
        offset: {
          x: shifted("x", String.raw`+\frac{dM_{2}}{M_{1}+M_{2}}`),
        },
        strength: "-M_{1}",
      },
      {
        offset: {
          x: shifted("x", String.raw`-\frac{dM_{1}}{M_{1}+M_{2}}`),
        },
        strength: "-M_{2}",
      },
    ],
    axes,
    3,
    0.1
  );
}

/**
 * Ideal flow past a cylinder of radius R in a stream of speed U, spinning
 * at w: the potential flow U(z + R²/z) with circulation Γ = 2πR²w. Spin
 * makes the flow faster on one side than the other, which is the Magnus
 * effect: the Kutta–Joukowski lift per unit length is ρUΓ. With w = 0, the
 * symmetric flow; at w = 2U/R the two stagnation points meet at the bottom.
 */
function cylinder() {
  const r2 = String.raw`x^{2}+y^{2}`;
  const outside = (body: string) =>
    String.raw`\left\{${r2}>R^{2}:${body},0\right\}`;
  return {
    x: outside(
      String.raw`U\left(1-\frac{R^{2}\left(x^{2}-y^{2}\right)}{\left(${r2}\right)^{2}}\right)-\frac{R^{2}wy}{${r2}}`
    ),
    y: outside(
      String.raw`-\frac{2UR^{2}xy}{\left(${r2}\right)^{2}}+\frac{R^{2}wx}{${r2}}`
    ),
    z: "0",
  };
}

/**
 * A parallel-plate capacitor with plates of half-width L at y = ±d/2,
 * charged ±s per unit length. Each plate's field in closed form — a charged
 * strip's, E = s(½ ln(r₁²/r₂²), θ₂ − θ₁) — so the fringing at the edges is
 * exact, not drawn: the uniform field between the plates, curving out round
 * their ends.
 */
function capacitor() {
  const strip = (h: string, sign: string) => {
    const Y = String.raw`\left(y${h}\right)`;
    const r = (x: string) => String.raw`${x}^{2}+${Y}^{2}+0.001`;
    return {
      x: String.raw`${sign}\frac{s}{2}\ln\left(\frac{${r(String.raw`\left(x+L\right)`)}}{${r(String.raw`\left(x-L\right)`)}}\right)`,
      y: String.raw`${sign}s\left(\arctan\left(y${h},x-L\right)-\arctan\left(y${h},x+L\right)\right)`,
    };
  };
  const top = strip(String.raw`-\frac{d}{2}`, "");
  const bottom = strip(String.raw`+\frac{d}{2}`, "-");
  return { x: `${top.x}${bottom.x}`, y: `${top.y}${bottom.y}`, z: "0" };
}

/**
 * A bar magnet of length L along the vertical axis, by the pole model: a
 * north pole of strength p at one end and a south pole at the other, H =
 * p(r − r_N)/|r − r_N|³ − p(r − r_S)/|r − r_S|³ outside. Inside the bar, B
 * runs from the south pole to the north, closing every loop, as it does in a
 * real magnet (where H, the pole model's field, would point the other way).
 * Far off, a dipole; close in, lines fanning out of the pole faces.
 */
function barMagnet(axes: readonly Axis[]) {
  const along: Axis = axes.length === 3 ? "z" : "y";
  const poles = sources(
    [
      {
        offset: { [along]: shifted(along, String.raw`-\frac{L}{2}`) },
        strength: "p",
      },
      {
        offset: { [along]: shifted(along, String.raw`+\frac{L}{2}`) },
        strength: "-p",
      },
    ],
    axes,
    3,
    0.02
  );
  const across = axes
    .filter((a) => a !== along)
    .map((a) => `${a}^{2}`)
    .join("+");
  // Inside: the bar's half-width 0.3, its half-length L/2.
  const inside = String.raw`\max\left(\frac{${across}}{0.09},\frac{4${along}^{2}}{L^{2}}\right)<1`;
  const out: Record<Axis, string> = { x: "0", y: "0", z: "0" };
  for (const a of axes) {
    out[a] =
      String.raw`\left\{${inside}:${a === along ? "4p" : "0"},${poles[a]}\right\}`;
  }
  return out;
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
function chargeProbe(at: string, outside: string) {
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
    ] satisfies SceneItem[],
    setup: {
      at,
      gain: "s_{arrow}",
      names: "s_{names}",
      valid: outside,
      arrows: [
        {
          key: "E",
          vector: String.raw`\left(E_{1vt}+E_{2vt}\right)`,
          toggle: "s_{net}",
          color: "#243b7a",
          name: String.raw`\vec{E}`,
        },
        {
          key: "Ea",
          vector: "E_{1vt}",
          toggle: "s_{parts}",
          colorLatex: "C_{1vt}",
          name: String.raw`\vec{E}_{1}`,
        },
        {
          key: "Eb",
          vector: "E_{2vt}",
          toggle: "s_{parts}",
          colorLatex: "C_{2vt}",
          name: String.raw`\vec{E}_{2}`,
        },
        {
          key: "F",
          vector: String.raw`q_{0}\left(E_{1vt}+E_{2vt}\right)`,
          toggle: "s_{force}",
          color: "#7547a8",
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
    outsideProbe
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
      key: "lines",
      latex: String.raw`\frac{q_{1}\left(x+\frac{d}{2}\right)}{${r("+")}}+\frac{q_{2}\left(x-\frac{d}{2}\right)}{${r("-")}}=0.25\cdot\left[-40...40\right]\left\{s_{lines}=1\right\}\left\{${outside}\right\}\left\{\left|y\right|>0.02\right\}`,
      color: "#718296",
      lineWidth: 1.5,
      lineOpacity: 0.7,
    },
    {
      // The axis through them, which every contour above meets edge-on.
      key: "axis",
      latex: String.raw`y=0\left\{s_{lines}=1\right\}\left\{${outside}\right\}`,
      color: "#718296",
      lineWidth: 1.5,
      lineOpacity: 0.7,
    },
    {
      key: "equipotentials",
      latex: String.raw`\frac{q_{1}}{${r("+")}}+\frac{q_{2}}{${r("-")}}=\left[-1,-0.5,-0.25,-0.1,0,0.1,0.25,0.5,1\right]\left\{s_{equi}=1\right\}\left\{${outside}\right\}`,
      color: "#888888",
      lineStyle: "DASHED",
      lineWidth: 1.5,
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
    outsideProbe
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
      pointSize: 5,
    },
    ...probeArrows3D(setup),
  ];
})();
const WIRES = wires();
const GRAVITY_2D = gravity(["x", "y"]);
const GRAVITY_3D = gravity(["x", "y", "z"]);
const CYLINDER = cylinder();
const CAPACITOR = capacitor();
const BAR_2D = barMagnet(["x", "y"]);
const BAR_3D = barMagnet(["x", "y", "z"]);

/**
 * The flow on paper, for a preset whose Desmos objects carry the picture: a
 * faint, even current of one dark colour, the field's direction everywhere
 * without competing with the arrows and lines that show its size.
 */
const CHARGE_FLOW_COLOR = "#29486b";
const CHARGE_FLOW = {
  particleCount: 16_000,
  speed: 0.35,
  trailPersistence: 0.85,
  dropRate: 0.03,
  opacity: 0.28,
  pointSize: 1.5,
  glow: 0,
  normalizeSpeed: true,
};

/** The look these share: the field's lines, drawn evenly at one pace. */
const LINES = {
  particleCount: 30_000,
  glow: 0.3,
  opacity: 0.3,
  pointSize: 1.3,
  // Fields that go as 1/r²: at their own pace, all but the sources would
  // stand still.
  normalizeSpeed: true,
  speed: 0.35,
  trailPersistence: 0.97,
  // Short lives: a field with a source and a sink carries every particle
  // from one to the other, and long-lived ones drained the source's side
  // dark and piled up at the sink.
  dropRate: 0.02,
};
const LINES_3D = {
  particles: 18_000,
  speed: 0.3,
  trail: 64,
  lifetime: 1.5,
  opacity: 0.16,
  glow: 0.08,
  normalizeSpeed: true,
  absorb: true,
  colorMode: "speed" as const,
  backdropOpacity: 1,
};

/**
 * For a field the same all along z — long wires, a long cylinder, long
 * plates — matter in one connected piece, along a length |z| < 2.5 with soft
 * ends, and only where the field's structure is: a tube of rings round each
 * wire, a sheet hugging the cylinder, the gap and the fringes of the plates.
 * So each reads as one long object. Three thin slices across it read as
 * three stacked copies; the whole box, as fog.
 */
const ALONG = String.raw`\frac{1}{1+e^{3\left(\left|z\right|-2.5\right)}}`;
/** Rings round each wire, a little way out from it. */
const WIRE_TUBES = String.raw`\left(e^{-4\left(\sqrt{\left(x+\frac{d}{2}\right)^{2}+y^{2}}-0.9\right)^{2}}+e^{-4\left(\sqrt{\left(x-\frac{d}{2}\right)^{2}+y^{2}}-0.9\right)^{2}}\right)${ALONG}`;
/** A sheet of the stream hugging the cylinder's surface. */
const CYLINDER_SHEET = String.raw`e^{-\frac{\left(\sqrt{x^{2}+y^{2}}-1.25R\right)^{2}}{0.08R^{2}}}${ALONG}`;
/** The gap between the plates and the fringes round their ends. */
const PLATE_GAP = String.raw`\frac{e^{-\frac{y^{2}}{d^{2}}}}{1+e^{3\left(\left|x\right|-L-1\right)}}${ALONG}`;

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

export const PHYSICS: readonly GalleryPreset[] = [
  {
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
    palette: "ember",
    fixedColor: CHARGE_FLOW_COLOR,
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
        particles: 20_000,
        speed: 0.18,
        trail: 16,
        lifetime: 3,
        opacity: 0.22,
        glow: 0,
        normalizeSpeed: true,
        absorb: true,
        colorMode: "fixed",
        fixedColor: CHARGE_FLOW_COLOR,
        palette: "ember",
      },
    },
  },
  {
    id: "wires",
    name: "Parallel wires",
    category: "fields",
    blurb:
      "Two long wires carrying currents I₁ and I₂ out of the page, a distance d apart: Ampère's law. Currents the same way, and the field wraps both, with a null between them; opposite, and it crowds between them. The currents and distance are sliders.",
    xLatex: WIRES.x,
    yLatex: WIRES.y,
    variables: [v("I_{1}", 1, -5, 5), v("I_{2}", 1, -5, 5), v("d", 5, 0.5, 12)],
    colorScale: 0.08,
    palette: "starfield",
    backdrop: "#02030a",
    flow: LINES,
    extent: 10,
    space: {
      blurb:
        "Two long wires along z carrying currents I₁ and I₂, a distance d apart: Ampère's law, the field circling each wire. The currents and distance are sliders.",
      xLatex: WIRES.x,
      yLatex: WIRES.y,
      zLatex: WIRES.z,
      seedLatex: WIRE_TUBES,
      variables: [
        v("I_{1}", 1, -5, 5),
        v("I_{2}", 1, -5, 5),
        v("d", 3, 0.5, 8),
      ],
      look: { ...LINES_3D, palette: "starfield", backdrop: "#02030a" },
    },
  },
  {
    id: "earth-moon",
    name: "Earth and Moon",
    category: "fields",
    blurb:
      "The gravity of two masses a distance d apart, the Earth 81 times the Moon: Newton's law. Between them, where the pulls cancel, is the neutral point, close to the Moon. The masses and their distance are sliders.",
    xLatex: GRAVITY_2D.x,
    yLatex: GRAVITY_2D.y,
    variables: [
      v("M_{1}", 81, 0.1, 100),
      v("M_{2}", 1, 0.1, 100),
      v("d", 6, 1, 16),
    ],
    colorScale: 0.08,
    palette: "galaxy",
    backdrop: "#02030a",
    flow: LINES,
    extent: 10,
    space: {
      blurb:
        "The gravity of the Earth and the Moon, 81 to 1, a distance d apart, placed round their common centre of mass: Newton's law. The masses and their distance are sliders.",
      xLatex: GRAVITY_3D.x,
      yLatex: GRAVITY_3D.y,
      zLatex: GRAVITY_3D.z,
      variables: [
        v("M_{1}", 81, 0.1, 100),
        v("M_{2}", 1, 0.1, 100),
        v("d", 4, 1, 9),
      ],
      look: { ...LINES_3D, palette: "galaxy", backdrop: "#02030a" },
    },
  },
  {
    id: "cylinder",
    name: "Spinning cylinder",
    category: "fields",
    blurb:
      "Air streaming at speed U past a cylinder of radius R spinning at w: ideal flow with circulation. The spin speeds the flow over one side and slows it on the other, and the pressure difference is a lift — the Magnus effect, which curves a spinning ball. The speed, radius and spin are sliders.",
    xLatex: CYLINDER.x,
    yLatex: CYLINDER.y,
    variables: [v("U", 1, 0, 3), v("R", 2.5, 0.5, 5), v("w", 0.4, -2, 2)],
    colorScale: 1.5,
    palette: "ocean",
    backdrop: "#020810",
    flow: {
      particleCount: 35_000,
      glow: 0.35,
      opacity: 0.4,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 4,
      trailPersistence: 0.97,
      dropRate: 0.004,
    },
    extent: 10,
    space: {
      blurb:
        "Air streaming at speed U past a long cylinder of radius R, along z, spinning at w: ideal flow with circulation, and the Magnus lift. The speed, radius and spin are sliders.",
      xLatex: CYLINDER.x,
      yLatex: CYLINDER.y,
      zLatex: CYLINDER.z,
      seedLatex: CYLINDER_SHEET,
      variables: [v("U", 1, 0, 3), v("R", 1.5, 0.3, 3), v("w", 0.4, -2, 2)],
      look: {
        palette: "ocean",
        particles: 30_000,
        speed: 0.3,
        trail: 48,
        lifetime: 5,
        opacity: 0.35,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#020810",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "capacitor",
    name: "Capacitor",
    category: "fields",
    blurb:
      "Two plates of half-width L, a distance d apart, charged +s and −s: a parallel-plate capacitor. Between them the field is nearly uniform; at the ends it bulges out — the fringing field, here exact. The charge, width and gap are sliders.",
    xLatex: CAPACITOR.x,
    yLatex: CAPACITOR.y,
    variables: [v("s", 1, -3, 3), v("L", 4, 0.5, 9), v("d", 3, 0.5, 10)],
    colorScale: 1.5,
    palette: "ember",
    backdrop: "#07030a",
    flow: LINES,
    extent: 10,
    space: {
      blurb:
        "Two long plates of half-width L, a distance d apart, charged +s and −s: a parallel-plate capacitor, with its fringing field exact. The charge, width and gap are sliders.",
      xLatex: CAPACITOR.x,
      yLatex: CAPACITOR.y,
      zLatex: CAPACITOR.z,
      seedLatex: PLATE_GAP,
      variables: [v("s", 1, -3, 3), v("L", 2.5, 0.5, 5), v("d", 2, 0.5, 6)],
      look: { ...LINES_3D, palette: "ember", backdrop: "#07030a" },
    },
  },
  {
    id: "bar-magnet",
    name: "Bar magnet",
    category: "fields",
    blurb:
      "A real bar magnet of length L, poles of strength p at its ends: lines fan out of the north pole's face, loop round, and return into the south, and run back through the magnet from south to north. Far off, it is a dipole. The length and strength are sliders.",
    xLatex: BAR_2D.x,
    yLatex: BAR_2D.y,
    variables: [v("p", 1, -3, 3), v("L", 3, 0.2, 10)],
    colorScale: 0.08,
    palette: "starfield",
    backdrop: "#02030a",
    flow: LINES,
    extent: 10,
    space: {
      blurb:
        "A real bar magnet of length L along z, poles of strength p at its ends: the field fans out of the north pole, loops round in every direction into the south, and runs back through the bar. The length and strength are sliders.",
      xLatex: BAR_3D.x,
      yLatex: BAR_3D.y,
      zLatex: BAR_3D.z,
      variables: [v("p", 1, -3, 3), v("L", 2, 0.2, 6)],
      look: { ...LINES_3D, palette: "starfield", backdrop: "#02030a" },
    },
  },
];
