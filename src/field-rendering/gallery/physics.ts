/**
 * Physics: the fields of the problems a physics course sets, each written in
 * its own variables — charges, currents, masses, distances — which a preset
 * loads into the graph as sliders. Set them to a problem's numbers and the
 * field drawn is that problem's field.
 *
 * Constants are folded into the variables (k, μ₀/2π, G are 1): the shape of
 * a field does not depend on its units, and its strength is one slider.
 */
import { toggle } from "./kit";
import { TEACHING_PHYSICS } from "./physics-teaching";
import {
  chargeScene,
  chargeVariables,
  colorName,
  fieldComponent,
  listField,
  listOutside,
  listPotential,
  LISTS,
  MAX_CHARGES,
  outsideAll,
  potential,
  ringLayout,
  COUNT,
} from "./point-charges";
import { probeArrows2D, probeArrows3D, type ProbeSetup } from "./probe";
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";

const R = String.raw;

/** The charges' radius, in the 2D view (about ±10) and the 3D box (±5). */
const CHARGE_RADIUS_2D = "0.4";
const CHARGE_RADIUS_3D = "0.3";

/**
 * Where the ten charges start: the textbook pair, +1 and −1 five apart on
 * the x-axis, then the rest round a ring to be brought in with the count.
 */
const LAYOUT_2D = ringLayout(
  [
    { q: 1, at: [-2.5, 0, 0] },
    { q: -1, at: [2.5, 0, 0] },
  ],
  6,
  "1",
  9
);
const LAYOUT_3D = ringLayout(
  [
    { q: 1, at: [-1.5, 0, 0] },
    { q: -1, at: [1.5, 0, 0] },
  ],
  3.2,
  "1",
  5
);

/**
 * The field, exactly, outside the balls Desmos draws as the charges, and
 * nothing inside them: E = Σ q(r − rᵢ)/|r − rᵢ|³, unsoftened, since the
 * ball covers each pole. In the plane, the slice z = 0 of the charges' own
 * 3D field, so the lines bend as they do in the textbook figure.
 */
function gpuField(coords: readonly string[], radius: string, dim: 2 | 3) {
  const layout = dim === 2 ? LAYOUT_2D : LAYOUT_3D;
  // In the plane the charges lie in it: no Z sliders there.
  const outside = outsideAll(coords, radius);
  const guard = (s: string) => R`\left\{${outside}:${s},0\right\}`;
  return {
    field: [0, 1, 2].map((a) =>
      a < dim ? guard(fieldComponent(layout, a, coords)) : "0"
    ),
    seed: guard("1"),
    tint: potential(layout, coords),
  };
}
const GPU_2D = gpuField(["x", "y"], CHARGE_RADIUS_2D, 2);
const GPU_3D = gpuField(["x", "y", "z"], CHARGE_RADIUS_3D, 3);

/**
 * The probe's arrows: the field, each charge's part of it while there is
 * that charge, and the force on a test charge q₀.
 */
function chargeProbe(dim: 2 | 3, reach: number) {
  const probe = ["p_{x}", "p_{y}", "p_{z}"].slice(0, dim);
  const at = R`\left(${probe.join(",")}\right)`;
  const radius = dim === 2 ? CHARGE_RADIUS_2D : CHARGE_RADIUS_3D;
  const helpers: SceneItem[] = [
    { key: "Enet", latex: R`E_{qvt}=${listField("1", probe)}`, hidden: true },
  ];
  const parts = Array.from({ length: MAX_CHARGES }, (_, n) => n + 1);
  for (const i of parts) {
    const d = probe.map(
      (p, a) => R`\left(${p}-${["X", "Y", "Z"][a]}_{q${i}}\right)`
    );
    const r3 = R`\left(${d.map((s) => `${s}^{2}`).join("+")}\right)^{1.5}`;
    // Undefined while the count leaves the charge out, so its arrow draws
    // nothing; switched by s_{parts} itself, so the presets window's "Show"
    // list knows that switch already governs it and adds no row per charge.
    helpers.push({
      key: `Epart${i}`,
      latex: R`E_{q${i}vt}=\left\{${COUNT}\ge${i}:\left(${d.map((s) => R`\frac{q_{${i}}${s}}{${r3}}`).join(",")}\right)\right\}`,
      hidden: true,
    });
  }
  const setup: ProbeSetup = {
    at,
    gain: "s_{arrow}",
    names: "s_{names}",
    damp: "s_{damp}",
    reach,
    dimensions: dim,
    valid: listOutside(probe, radius),
    arrows: [
      {
        key: "E",
        vector: "E_{qvt}",
        toggle: "s_{net}",
        color: "#243b7a",
        nameColor: "#243b7a",
        name: R`\vec{E}`,
      },
      ...parts.map((i) => ({
        key: `E${i}`,
        vector: `E_{q${i}vt}`,
        toggle: "s_{parts}",
        colorLatex: colorName(i),
        nameColor: "#555555",
        name: R`\vec{E}_{${i}}`,
      })),
      {
        key: "F",
        vector: R`q_{0}E_{qvt}`,
        toggle: "s_{force}",
        color: "#7547a8",
        nameColor: "#7547a8",
        name: R`\vec{F}`,
      },
    ],
  };
  const arrows = dim === 2 ? probeArrows2D(setup) : probeArrows3D(setup);
  return { helpers, at, arrows };
}

/** What a probe needs, as variables: where it is, its gain, its switches. */
const probeSwitches = (gain: number, max: number): GalleryVariable[] => [
  v("q_{0}", -1, -3, 3, 0.1),
  v("s_{arrow}", gain, 0, max),
  toggle("s_{net}", 1, "Field arrow"),
  toggle("s_{parts}", 0, "Each charge's arrow"),
  toggle("s_{force}", 0, "Force on a test charge"),
  toggle("s_{names}", 0, "Names"),
  toggle("s_{damp}", 1, "Damped lengths"),
];

/**
 * The charges in the plane, as a textbook draws them: discs, red with a
 * plus and blue with a minus, each with a handle to drag anywhere; a probe
 * point with its field arrow; and, switchable, exact field lines and
 * equipotentials.
 *
 * The field lines are traced, for any arrangement of the charges (see
 * `charge-lines.ts`): the plugin writes them into two lists as the charges
 * move, and one connected list of points draws them. Until 2026-11-08 they
 * were contours of the flux function S = Σ qᵢ cos θᵢ, which exists only
 * while the charges share a line, so with a third charge off that line
 * there were none.
 *
 * Equipotentials are contours of V, drawn by Desmos for any arrangement.
 */
const CHARGES_SCENE_2D: SceneItem[] = (() => {
  const { helpers, at, arrows } = chargeProbe(2, 5);
  const radius = CHARGE_RADIUS_2D;
  const outside = listOutside(["x", "y"], radius);
  return [
    ...chargeScene(2, radius),
    ...helpers,
    // Filled in by the plugin; empty until it has traced them.
    { key: "linesx", latex: R`L_{xvt}=\left[\right]`, hidden: true },
    { key: "linesy", latex: R`L_{yvt}=\left[\right]`, hidden: true },
    {
      key: "lines",
      explains: true,
      latex: R`\left(L_{xvt},L_{yvt}\right)\left\{s_{lines}=1\right\}`,
      color: "#2c3646",
      points: false,
      lines: true,
      lineWidth: 2,
      lineOpacity: 0.85,
    },
    {
      key: "equipotentials",
      explains: true,
      latex: R`${listPotential("", ["x", "y"])}=\left[-1,-0.5,-0.25,-0.1,0,0.1,0.25,0.5,1\right]\left\{s_{equi}=1\right\}\left\{${outside}\right\}`,
      color: "#303030",
      lineStyle: "DASHED",
      lineWidth: 2,
    },
    {
      key: "probe",
      explains: true,
      latex: at,
      color: "#222222",
      points: true,
      pointSize: 12,
    },
    ...arrows,
  ];
})();

/**
 * The charges in space: shaded balls coloured by sign, drawn as surfaces in
 * u and v so the particles behind them are hidden (the depth pass redraws
 * surfaces of that kind, not implicit ones), each with the plugin's own
 * handle to drag in three dimensions; a probe point with Desmos's own 3D
 * vectors.
 */
const CHARGES_SCENE_3D: SceneItem[] = (() => {
  const { helpers, at, arrows } = chargeProbe(3, 2.5);
  return [
    ...chargeScene(3, CHARGE_RADIUS_3D),
    ...helpers,
    {
      key: "probe",
      explains: true,
      latex: at,
      color: "#222222",
      points: true,
      // In 3D a point is a ball, and 12 hid the arrows' tails inside it.
      pointSize: 4,
      drag3d: ["p_{x}", "p_{y}", "p_{z}"],
    },
    ...arrows,
  ];
})();

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

/** A slider, at Desmos's own step unless given one. */
function v(
  name: string,
  value: number,
  min: number,
  max: number,
  step?: number
): GalleryVariable {
  return { name, value, min, max, step };
}

/** The charges: the preset the others were built after. */
const CHARGES_PRESET: GalleryPreset = {
  id: "charges",
  name: "Electric charges",
  category: "ap2",
  apUnit: 10,
  blurb:
    "Up to ten point charges, anywhere: drag each by its handle, set how many with N_q. Coulomb's law and superposition. Field lines and equipotentials follow any arrangement. Drag the probe to see the field there, each charge's part of it, and the force on a test charge q₀.",
  xLatex: GPU_2D.field[0],
  yLatex: GPU_2D.field[1],
  seedLatex: GPU_2D.seed,
  variables: [
    ...chargeVariables(LAYOUT_2D, 2, [-5, 5, 0.1]),
    v("p_{x}", 0, -9, 9, 0.05),
    v("p_{y}", 3, -9, 9, 0.05),
    ...probeSwitches(30, 100),
    toggle("s_{lines}", 1, "Field lines"),
    toggle("s_{equi}", 0, "Equipotentials"),
  ],
  scene: CHARGES_SCENE_2D,
  chargeLines: { radius: Number(CHARGE_RADIUS_2D), extent: 10 },
  onPaper: true,
  palette: "charge",
  // The particles coloured by the potential where they are, V = Σ q/r
  // (k = 1): red near positive charge, blue near negative, slate where it
  // is zero, so they cross over where the equipotential V = 0 is drawn.
  tint: {
    latex: GPU_2D.tint,
    latex3d: GPU_3D.tint,
    // A unit charge's potential 1 from it is 1: three quarters red at 0.3,
    // so the colour reaches well out from each charge before it fades.
    scale: 0.3,
  },
  flow: CHARGE_FLOW,
  extent: 10,
  space: {
    blurb:
      "Up to ten point charges in space: drag each by its handle, set how many with N_q. Coulomb's law in 3D. Move the probe to see the field there, each charge's part of it, and the force on a test charge q₀.",
    xLatex: GPU_3D.field[0],
    yLatex: GPU_3D.field[1],
    zLatex: GPU_3D.field[2],
    seedLatex: GPU_3D.seed,
    variables: [
      ...chargeVariables(LAYOUT_3D, 3, [-5, 5, 0.1]),
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
