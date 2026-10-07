/**
 * Fields chosen because they are worth looking at.
 *
 * These live here, in the package neither plugin owns, because more than one
 * thing now wants them: Vector Tools offers them as saved fields, and Audio Lab
 * offers them as starting points for a field the music moves. What they are —
 * a name, a blurb, two components and the look that makes the picture — is not
 * specific to either, and a copy in each would be two lists to keep in step.
 *
 * What is *not* here is how a preset becomes a configuration. Each plugin's
 * configuration format is its own, so each does that mapping itself.
 *
 * ## A preset is a whole look, not two formulas
 *
 * Setting only P and Q and leaving everything else where it was produces a
 * black hole drawn as a grid of short blue arrows, which is nobody's idea of a
 * black hole. Each entry therefore carries its palette, its flow settings, the
 * domain it is framed in and whether arrows are drawn at all — because the
 * thing being chosen is the picture, and the formula is only how it is made.
 *
 * ## The maths is real
 *
 * None of these is a shape drawn to look like something. The galaxy's arms come
 * out of differential rotation — inner orbits going round faster than outer
 * ones, which is what winds a spiral out of a disc — and the black hole's
 * particles accelerate inward because the field really does go as a power of
 * 1/r. That matters here more than it would elsewhere: these plugins' whole
 * claim is that what you see is the field, so a preset that cheated would be
 * the one thing in them that lies.
 *
 * ## The LaTeX is Desmos's own
 *
 * Every component is written the way Desmos writes it: `\left(` and
 * `\right)` around a group, `\frac{a}{b}`, `x^{2}`, `\cdot` for an explicit
 * product. The compiler accepts the shorter spellings too, but these strings
 * are put in front of people and pasted into graphs, and one that came back
 * from Desmos looking different from the one that went in is a small lie about
 * where it came from.
 */
import type { PaletteID } from "./palettes";

/**
 * The drawing settings a gallery entry may carry.
 *
 * A subset, and deliberately a small one: every name here means the same thing
 * in both plugins' own settings, so each can spread it into its own without a
 * translation table. Anything that exists in only one of them is that plugin's
 * business and does not belong in a shared list of pictures.
 */
export interface GalleryLook {
  particleCount: number;
  speed: number;
  trailPersistence: number;
  dropRate: number;
  opacity: number;
  pointSize: number;
  glow: number;
  normalizeSpeed: boolean;
}

/**
 * The shelves the presets window groups them on: what kind of picture each
 * is, which is how someone browsing for one thinks of it.
 */
export type GalleryCategory = "space" | "fluids" | "chaos" | "fields";

export const GALLERY_CATEGORIES: readonly {
  id: GalleryCategory;
  label: string;
}[] = [
  { id: "space", label: "Space" },
  { id: "fluids", label: "Fluids" },
  { id: "chaos", label: "Chaos" },
  { id: "fields", label: "Fields" },
];

export interface GalleryPreset {
  id: string;
  name: string;
  category: GalleryCategory;
  /** What it is, in one line, under the name. */
  blurb: string;
  xLatex: string;
  yLatex: string;
  palette: PaletteID;
  /** Applied over whatever the caller's defaults are. */
  flow?: Partial<GalleryLook>;
  /** Half-width of the square the field is framed in. */
  extent?: number;
  /** How fast the clock runs, for the ones that move. */
  timeSpeed?: number;
  /** The dark it is drawn on. Defaults to a near-black blue. */
  backdrop?: string;
  /**
   * Where the 2D flow's particles are born, a chance from 0 to 1 over x and
   * y: the matter the field carries. Designed for Desmos's default view,
   * about ±10. Absent, they are born everywhere.
   */
  seedLatex?: string;
  /** A black hole at the origin, with this horizon radius. */
  lensHorizon?: number;
  /** The speed the 2D colour ramp spans, where Auto's would not suit. */
  colorScale?: number;
  /** One colour rather than a ramp, for the 2D flow. */
  fixedColor?: string;
  /**
   * The same picture on Desmos 3D: the field with a third component, and
   * what is different about it in a box. Every preset has one, so loading a
   * preset on /3d never gives a field that lies flat by accident.
   */
  space: {
    blurb: string;
    xLatex: string;
    yLatex: string;
    zLatex: string;
    /**
     * Where the flow's particles are born, a chance from 0 to 1: the matter
     * the field carries. A disk is a thin seed in a rotating field, not a
     * field that happens to look thin; absent, they are born everywhere.
     */
    seedLatex?: string;
    /** A black hole at the origin bending light, with this horizon radius. */
    lensHorizon?: number;
    /** How the 3D flow is drawn, over the caller's defaults. */
    look?: Partial<SpaceLook>;
  };
}

/**
 * The 3D flow's drawing settings a gallery entry may carry. Designed for
 * Desmos 3D's default box, ±5 on each axis, which is where a preset is
 * loaded unless the user has moved it.
 */
export interface SpaceLook {
  /** The 3D picture's own palette, where it differs from the 2D one. */
  palette: PaletteID;
  particles: number;
  /** Box half-widths per second. */
  speed: number;
  trail: number;
  lifetime: number;
  opacity: number;
  glow: number;
  normalizeSpeed: boolean;
  absorb: boolean;
  colorMode: "speed" | "fixed";
  fixedColor: string;
  backdrop: string;
  backdropOpacity: number;
}

const r2 = String.raw`\left(x^{2}+y^{2}\right)`;
const r3 = String.raw`\left(x^{2}+y^{2}+z^{2}\right)`;
const rho = String.raw`\sqrt{x^{2}+y^{2}}`;

/** The dark these are drawn on where a preset does not name its own. */
export const GALLERY_DEFAULT_BACKDROP = "#0d1020";

export const FIELD_GALLERY: readonly GalleryPreset[] = [
  {
    id: "black-hole",
    name: "Black hole",
    category: "space",
    blurb:
      "An accretion disk seen from above: gas on Keplerian orbits, faster and hotter inward, plunging into the horizon once inside the innermost stable orbit. The black disc is the hole's shadow, ringed by the light that went round it.",
    // Rotation plus a drift toward the centre. The 3/4 power makes the speed
    // go as r^-1/2, which is the Keplerian falloff a real disc has. The drift
    // is slow across the disk and fast close in, where nothing orbits stably
    // and gas plunges: e^(−r²/4) switches it on there.
    xLatex: String.raw`\frac{3\left(-y-x\left(0.05+0.9e^{-0.25\left(x^{2}+y^{2}\right)}\right)\right)}{\left(x^{2}+y^{2}+0.1\right)^{0.75}}`,
    yLatex: String.raw`\frac{3\left(x-y\left(0.05+0.9e^{-0.25\left(x^{2}+y^{2}\right)}\right)\right)}{\left(x^{2}+y^{2}+0.1\right)^{0.75}}`,
    // The disk from the innermost stable orbit outward, ringed, denser
    // inward; and a faint haze close in, gas being drawn down into the hole.
    seedLatex: String.raw`\frac{\left(0.65+0.35\sin\left(5.5\sqrt{x^{2}+y^{2}}\right)\right)\cdot\frac{3}{\sqrt{x^{2}+y^{2}}}}{\left(1+e^{-7\left(\sqrt{x^{2}+y^{2}}-2.8\right)}\right)\left(1+e^{2.5\left(\sqrt{x^{2}+y^{2}}-8\right)}\right)}+0.05e^{-0.3\left(x^{2}+y^{2}\right)}`,
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
        "A black hole's accretion disk: gas on Keplerian orbits, hotter and faster inward, drifting in to the horizon. The disk behind the hole is seen bent over and under it by its gravity, and the side coming towards you is brighter.",
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
      seedLatex: String.raw`e^{-\frac{z^{2}}{0.006}}\cdot\frac{1.6}{${rho}}\cdot\frac{0.65+0.35\sin\left(11${rho}\right)}{\left(1+e^{-14\left(${rho}-1.4\right)}\right)\left(1+e^{5\left(${rho}-4.5\right)}\right)}+0.005e^{-0.6\left(x^{2}+y^{2}+z^{2}\right)}`,
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
    id: "spiral-galaxy",
    name: "Spiral galaxy",
    category: "space",
    blurb:
      "Differential rotation: inner orbits come round faster than outer ones, which winds a spiral out of a disc.",
    xLatex: String.raw`\frac{-2y}{1.5+\sqrt{x^{2}+y^{2}}}`,
    yLatex: String.raw`\frac{2x}{1.5+\sqrt{x^{2}+y^{2}}}`,
    // Two logarithmic arms, a density wave the stars pass through, on an
    // exponential disk with an edge; a round bulge.
    seedLatex: String.raw`\left(0.02+\left(\frac{1+\frac{\left(x^{2}-y^{2}\right)\cos\left(1.6\ln\left(x^{2}+y^{2}+0.01\right)-0.15t\right)+2xy\sin\left(1.6\ln\left(x^{2}+y^{2}+0.01\right)-0.15t\right)}{x^{2}+y^{2}+0.01}}{2}\right)^{12}\right)\frac{e^{-0.12\sqrt{x^{2}+y^{2}}}}{1+e^{2\left(\sqrt{x^{2}+y^{2}}-9\right)}}+e^{-0.5\left(x^{2}+y^{2}\right)}`,
    colorScale: 1.5,
    palette: "starfield",
    backdrop: "#020206",
    flow: {
      particleCount: 45_000,
      glow: 0.4,
      opacity: 0.45,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 3,
      trailPersistence: 0.95,
      dropRate: 0.02,
    },
    extent: 10,
    space: {
      blurb:
        "A spiral galaxy: stars on a flat rotation curve in a thin disk, the arms a density wave they pass through — which is what real arms are — and a round bulge at the centre.",
      // Rotation rising from the centre and leveling off, the flat rotation
      // curve that first told astronomers about dark matter.
      xLatex: String.raw`\frac{-y}{0.6+${rho}}`,
      yLatex: String.raw`\frac{x}{0.6+${rho}}`,
      zLatex: String.raw`-0.5z`,
      // Two logarithmic arms, cos(2θ − 3.2 ln r), turning slowly; an
      // exponential disk; a bulge.
      seedLatex: String.raw`e^{-\frac{z^{2}}{0.03}}\left(0.06+\left(\frac{1+\frac{\left(x^{2}-y^{2}\right)\cos\left(1.6\ln\left(x^{2}+y^{2}\right)-0.15t\right)+2xy\sin\left(1.6\ln\left(x^{2}+y^{2}\right)-0.15t\right)}{x^{2}+y^{2}}}{2}\right)^{8}\right)\frac{e^{-0.25${rho}}}{1+e^{4\left(${rho}-4.4\right)}}+e^{-2\left(x^{2}+y^{2}+3z^{2}\right)}`,
      look: {
        particles: 70_000,
        speed: 0.3,
        trail: 48,
        lifetime: 1.5,
        opacity: 0.35,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#020206",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "binary",
    name: "Binary orbit",
    category: "fluids",
    blurb:
      "Two vortices circling their common centre. The clock moves them, so the whole pattern turns.",
    // The softening term keeps the centres finite. Without it the two points
    // are poles, and a pole swallows the colour range and the integrator both.
    xLatex: String.raw`\frac{-\left(y-3\sin t\right)}{\left(x-3\cos t\right)^{2}+\left(y-3\sin t\right)^{2}+0.6}+\frac{-\left(y+3\sin t\right)}{\left(x+3\cos t\right)^{2}+\left(y+3\sin t\right)^{2}+0.6}`,
    yLatex: String.raw`\frac{x-3\cos t}{\left(x-3\cos t\right)^{2}+\left(y-3\sin t\right)^{2}+0.6}+\frac{x+3\cos t}{\left(x+3\cos t\right)^{2}+\left(y+3\sin t\right)^{2}+0.6}`,
    // Smoke released round each core.
    seedLatex: String.raw`e^{-\frac{\left(x-3\cos t\right)^{2}+\left(y-3\sin t\right)^{2}}{3}}+e^{-\frac{\left(x+3\cos t\right)^{2}+\left(y+3\sin t\right)^{2}}{3}}`,
    colorScale: 0.4,
    palette: "starfield",
    backdrop: "#03050a",
    flow: {
      particleCount: 40_000,
      glow: 0.35,
      opacity: 0.45,
      pointSize: 1.4,
      normalizeSpeed: false,
      speed: 6,
      trailPersistence: 0.97,
      dropRate: 0.004,
    },
    extent: 10,
    timeSpeed: 0.45,
    space: {
      blurb:
        "Two vortex tubes circling their common axis, like the pair trailing an aircraft's wings: smoke drawn into each core spirals along it, rising and falling with the clock.",
      xLatex: String.raw`\frac{-\left(y-2.4\sin t\right)}{\left(x-2.4\cos t\right)^{2}+\left(y-2.4\sin t\right)^{2}+0.4}+\frac{-\left(y+2.4\sin t\right)}{\left(x+2.4\cos t\right)^{2}+\left(y+2.4\sin t\right)^{2}+0.4}`,
      yLatex: String.raw`\frac{x-2.4\cos t}{\left(x-2.4\cos t\right)^{2}+\left(y-2.4\sin t\right)^{2}+0.4}+\frac{x+2.4\cos t}{\left(x+2.4\cos t\right)^{2}+\left(y+2.4\sin t\right)^{2}+0.4}`,
      zLatex: String.raw`0.12\cos t`,
      // Smoke released round each core, as in a wind tunnel.
      seedLatex: String.raw`\left(e^{-\frac{\left(x-2.4\cos t\right)^{2}+\left(y-2.4\sin t\right)^{2}}{2}}+e^{-\frac{\left(x+2.4\cos t\right)^{2}+\left(y+2.4\sin t\right)^{2}}{2}}\right)e^{-\frac{z^{2}}{6}}`,
      look: {
        particles: 30_000,
        speed: 0.3,
        trail: 64,
        lifetime: 4,
        opacity: 0.22,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#03050a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    category: "space",
    blurb:
      "Curtains that drift and fold, because both components read the clock.",
    // Seen from the side: rays falling down the field lines to a sharp,
    // folding lower edge, slowing as they reach it, which piles light there.
    xLatex: String.raw`0.05`,
    yLatex: String.raw`-0.4\left(y-\left(-4+1.2\sin\left(0.35x+0.3t\right)\right)+0.3\right)`,
    seedLatex: String.raw`\frac{e^{-0.45\left(y-\left(-4+1.2\sin\left(0.35x+0.3t\right)\right)\right)}}{1+e^{-6\left(y-\left(-4+1.2\sin\left(0.35x+0.3t\right)\right)\right)}}\cdot\frac{0.6+0.4\sin\left(3x+0.5t\right)^{2}}{1+e^{1.5\left(\left|x\right|-8\right)}}`,
    fixedColor: "#5cffa8",
    palette: "aurora",
    backdrop: "#02060a",
    flow: {
      particleCount: 35_000,
      glow: 0.4,
      opacity: 0.35,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 3,
      trailPersistence: 0.95,
      dropRate: 0.008,
    },
    extent: 10,
    timeSpeed: 0.6,
    space: {
      blurb:
        "Aurora curtains: a folded sheet hanging along the magnetic field, its rays streaming down to a sharp, bright lower edge where they stop, the curtain drifting and folding with the clock.",
      // Down the field lines to the lower edge at z = −3, slowing as they
      // reach it, which is what piles light into a sharp bottom border; and a
      // drift along the fold.
      xLatex: String.raw`0.06`,
      yLatex: String.raw`0.05\cos\left(0.55x+0.35t\right)`,
      zLatex: String.raw`-0.35\left(z+3.2\right)`,
      // A thin folded sheet, starting sharply at the lower edge and fading
      // with height.
      seedLatex: String.raw`\frac{e^{-8\left(y-1.6\sin\left(0.55x+0.35t\right)\right)^{2}}e^{-0.3\left(z+3\right)}}{1+e^{-8\left(z+3\right)}}`,
      look: {
        particles: 60_000,
        speed: 0.25,
        trail: 40,
        lifetime: 3,
        opacity: 0.3,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "fixed",
        fixedColor: "#5cffa8",
        backdrop: "#02060a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "pulsar",
    name: "Pulsar",
    category: "space",
    blurb:
      "A radial field whose sign follows sin t, so the whole thing breathes in and out.",
    // A dipole spinning in the plane, m = (cos t, sin t):
    // B = (3(m·r)r − m r²) / r⁵, with particles streaming off its poles.
    xLatex: String.raw`\frac{3x\left(x\cos t+y\sin t\right)-\cos t\cdot\left(x^{2}+y^{2}\right)}{\left(x^{2}+y^{2}+0.05\right)^{2.5}}`,
    yLatex: String.raw`\frac{3y\left(x\cos t+y\sin t\right)-\sin t\cdot\left(x^{2}+y^{2}\right)}{\left(x^{2}+y^{2}+0.05\right)^{2.5}}`,
    seedLatex: String.raw`e^{-3\left(\sqrt{x^{2}+y^{2}}-1.3\right)^{2}}\left(\frac{\left(x\cos t+y\sin t\right)^{2}}{x^{2}+y^{2}+0.01}\right)^{3}`,
    colorScale: 0.08,
    palette: "starfield",
    backdrop: "#02030a",
    flow: {
      particleCount: 30_000,
      glow: 0.3,
      opacity: 0.3,
      pointSize: 1.3,
      normalizeSpeed: true,
      speed: 0.35,
      trailPersistence: 0.97,
      dropRate: 0.006,
    },
    extent: 10,
    timeSpeed: 0.15,
    space: {
      blurb:
        "A pulsar's magnetosphere: a neutron star whose magnetic axis is tilted from its spin axis, so the whole field turns with it. Charged particles stream off the magnetic poles along the field lines.",
      // A dipole whose moment m = (sin α cos t, sin α sin t, cos α), α = 0.5,
      // spins about z: B = (3(m·r)r − m r²) / r⁵.
      xLatex: String.raw`\frac{3x\left(0.48x\cos t+0.48y\sin t+0.88z\right)-0.48\cos t\cdot${r3}}{\left(x^{2}+y^{2}+z^{2}+0.05\right)^{2.5}}`,
      yLatex: String.raw`\frac{3y\left(0.48x\cos t+0.48y\sin t+0.88z\right)-0.48\sin t\cdot${r3}}{\left(x^{2}+y^{2}+z^{2}+0.05\right)^{2.5}}`,
      zLatex: String.raw`\frac{3z\left(0.48x\cos t+0.48y\sin t+0.88z\right)-0.88${r3}}{\left(x^{2}+y^{2}+z^{2}+0.05\right)^{2.5}}`,
      // From the polar caps of a star of radius 0.8.
      seedLatex: String.raw`e^{-12\left(\sqrt{${r3}}-0.9\right)^{2}}\left(\frac{\left(0.48x\cos t+0.48y\sin t+0.88z\right)^{2}}{${r3}}\right)^{3}`,
      look: {
        particles: 25_000,
        speed: 0.35,
        trail: 64,
        lifetime: 4,
        opacity: 0.22,
        glow: 0.1,
        normalizeSpeed: true,
        absorb: false,
        colorMode: "speed",
        backdrop: "#02030a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "star-cluster",
    name: "Star cluster",
    category: "space",
    blurb:
      "Three attractors. Particles fall into them and pile up, so the knots draw themselves.",
    xLatex: String.raw`\frac{-\left(x+4\right)}{\left(\left(x+4\right)^{2}+\left(y-2\right)^{2}+0.4\right)^{1.1}}+\frac{-\left(x-3\right)}{\left(\left(x-3\right)^{2}+\left(y-3\right)^{2}+0.4\right)^{1.1}}+\frac{-\left(x-1\right)}{\left(\left(x-1\right)^{2}+\left(y+4\right)^{2}+0.4\right)^{1.1}}`,
    yLatex: String.raw`\frac{-\left(y-2\right)}{\left(\left(x+4\right)^{2}+\left(y-2\right)^{2}+0.4\right)^{1.1}}+\frac{-\left(y-3\right)}{\left(\left(x-3\right)^{2}+\left(y-3\right)^{2}+0.4\right)^{1.1}}+\frac{-\left(y+4\right)}{\left(\left(x-1\right)^{2}+\left(y+4\right)^{2}+0.4\right)^{1.1}}`,
    colorScale: 0.3,
    palette: "nebula",
    backdrop: "#04030a",
    flow: {
      particleCount: 40_000,
      glow: 0.5,
      opacity: 0.35,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 6,
      trailPersistence: 0.96,
      dropRate: 0.01,
    },
    extent: 10,
    space: {
      blurb:
        "Three stars at different heights, each pulling in the gas around it: streams fall in from every side and gather into glowing knots.",
      xLatex: String.raw`\frac{-\left(x+2.4\right)}{\left(\left(x+2.4\right)^{2}+\left(y-1.2\right)^{2}+\left(z-0.6\right)^{2}+0.25\right)^{1.1}}+\frac{-\left(x-1.8\right)}{\left(\left(x-1.8\right)^{2}+\left(y-1.8\right)^{2}+\left(z+1.2\right)^{2}+0.25\right)^{1.1}}+\frac{-\left(x-0.6\right)}{\left(\left(x-0.6\right)^{2}+\left(y+2.4\right)^{2}+z^{2}+0.25\right)^{1.1}}`,
      yLatex: String.raw`\frac{-\left(y-1.2\right)}{\left(\left(x+2.4\right)^{2}+\left(y-1.2\right)^{2}+\left(z-0.6\right)^{2}+0.25\right)^{1.1}}+\frac{-\left(y-1.8\right)}{\left(\left(x-1.8\right)^{2}+\left(y-1.8\right)^{2}+\left(z+1.2\right)^{2}+0.25\right)^{1.1}}+\frac{-\left(y+2.4\right)}{\left(\left(x-0.6\right)^{2}+\left(y+2.4\right)^{2}+z^{2}+0.25\right)^{1.1}}`,
      zLatex: String.raw`\frac{-\left(z-0.6\right)}{\left(\left(x+2.4\right)^{2}+\left(y-1.2\right)^{2}+\left(z-0.6\right)^{2}+0.25\right)^{1.1}}+\frac{-\left(z+1.2\right)}{\left(\left(x-1.8\right)^{2}+\left(y-1.8\right)^{2}+\left(z+1.2\right)^{2}+0.25\right)^{1.1}}+\frac{-z}{\left(\left(x-0.6\right)^{2}+\left(y+2.4\right)^{2}+z^{2}+0.25\right)^{1.1}}`,
      look: {
        particles: 50_000,
        speed: 0.25,
        trail: 48,
        lifetime: 3,
        opacity: 0.35,
        glow: 0.3,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#04030a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "cellular",
    name: "Vortex lattice",
    category: "fluids",
    blurb:
      "Taylor–Green flow: an array of counter-rotating cells, each one shearing against its neighbours.",
    // Bracketed: Desmos refuses `\sin x\cos y` ("Use parentheses around the
    // argument of 'sin'"), and these are written into the expression list.
    xLatex: String.raw`\sin\left(x\right)\cos\left(y\right)`,
    yLatex: String.raw`-\cos\left(x\right)\sin\left(y\right)`,
    colorScale: 0.5,
    palette: "aurora",
    backdrop: "#02060a",
    flow: {
      particleCount: 40_000,
      glow: 0.3,
      opacity: 0.4,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 6,
      trailPersistence: 0.97,
      dropRate: 0.004,
    },
    extent: 10,
    space: {
      blurb:
        "The 3D Taylor–Green vortex, the standard start of a turbulence simulation: cells that turn one way above and the other way below.",
      xLatex: String.raw`\sin\left(x\right)\cos\left(y\right)\cos\left(z\right)`,
      yLatex: String.raw`-\cos\left(x\right)\sin\left(y\right)\cos\left(z\right)`,
      zLatex: String.raw`0`,
      look: {
        particles: 40_000,
        speed: 0.3,
        trail: 64,
        lifetime: 5,
        opacity: 0.4,
        glow: 0.15,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#02060a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "dipole",
    name: "Magnetic dipole",
    category: "fields",
    blurb:
      "The field of a bar magnet, and the one picture every physics textbook opens with.",
    xLatex: String.raw`\frac{3xy}{${r2}^{2.5}}`,
    yLatex: String.raw`\frac{2y^{2}-x^{2}}{${r2}^{2.5}}`,
    // Released round the magnet, as iron filings draw it.
    seedLatex: String.raw`e^{-3\left(\sqrt{x^{2}+y^{2}}-1.5\right)^{2}}`,
    colorScale: 0.08,
    palette: "starfield",
    backdrop: "#02030a",
    flow: {
      particleCount: 30_000,
      glow: 0.3,
      opacity: 0.3,
      pointSize: 1.3,
      // The field is enormous at the origin and tiny at the edge, so drawing
      // it at its own pace leaves everything but the centre standing still.
      normalizeSpeed: true,
      speed: 0.35,
      trailPersistence: 0.97,
      dropRate: 0.005,
    },
    extent: 6,
    space: {
      blurb:
        "A bar magnet along the z-axis: field lines leave the north pole, loop round in every direction, and come back in at the south — drawn, as iron filings draw them, from around the magnet outward.",
      xLatex: String.raw`\frac{3xz}{${r3}^{2.5}}`,
      yLatex: String.raw`\frac{3yz}{${r3}^{2.5}}`,
      zLatex: String.raw`\frac{2z^{2}-x^{2}-y^{2}}{${r3}^{2.5}}`,
      // Released round the magnet, a sphere of radius 1.
      seedLatex: String.raw`e^{-10\left(\sqrt{${r3}}-1.2\right)^{2}}`,
      look: {
        particles: 25_000,
        speed: 0.3,
        trail: 64,
        lifetime: 5,
        opacity: 0.2,
        glow: 0.08,
        normalizeSpeed: true,
        absorb: true,
        colorMode: "speed",
        backdrop: "#02030a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "lorenz",
    name: "Lorenz butterfly",
    category: "chaos",
    blurb:
      "Rayleigh–Bénard convection: a fluid heated from below rolls over in cells, warm rising, cool sinking. Lorenz cut these rolls down to three equations in 1963, and found chaos in them.",
    // Stream function ψ = 3 sin(0.4833x) cos(πy/8) in the layer |y| < 4, so
    // u = ∂ψ/∂y and v = −∂ψ/∂x: closed rolls between the plates.
    xLatex: String.raw`-1.178\sin\left(0.4833x\right)\sin\left(0.3927y\right)`,
    yLatex: String.raw`-1.45\cos\left(0.4833x\right)\cos\left(0.3927y\right)`,
    seedLatex: String.raw`\frac{1}{1+e^{20\left(\left|y\right|-3.8\right)}}`,
    colorScale: 1,
    backdrop: "#05030a",
    extent: 10,
    palette: "plasma",
    flow: {
      particleCount: 40_000,
      speed: 4,
      trailPersistence: 0.97,
      dropRate: 0.004,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "Lorenz's equations themselves, σ = 10, ρ = 28, β = 8/3: every particle falls onto the butterfly and circles one wing, then the other, never repeating — the strange attractor that named the butterfly effect.",
      // Lorenz's x, y, z scaled into the box: X = x/5.5, Y = y/5.5,
      // Z = (z − 25)/5.5, so ẋ = σ(y − x), ẏ = x(ρ − z) − y and
      // ż = xy − βz become these.
      xLatex: String.raw`10\left(y-x\right)`,
      yLatex: String.raw`x\left(3-5.5z\right)-y`,
      zLatex: String.raw`5.5xy-\frac{8}{3}z-12.12`,
      // Born round the two fixed points at the wings' centres, (±√72, ±√72,
      // 27) in Lorenz's units, from which every orbit spirals out onto them.
      seedLatex: String.raw`e^{-\frac{\left(x-1.543\right)^{2}+\left(y-1.543\right)^{2}+\left(z-0.364\right)^{2}}{2.5}}+e^{-\frac{\left(x+1.543\right)^{2}+\left(y+1.543\right)^{2}+\left(z-0.364\right)^{2}}{2.5}}`,
      look: {
        particles: 15_000,
        speed: 0.5,
        trail: 64,
        lifetime: 15,
        opacity: 0.4,
        glow: 0.2,
        normalizeSpeed: true,
        absorb: false,
        colorMode: "speed",
        backdrop: "#05030a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "thomas",
    name: "Thomas attractor",
    category: "chaos",
    blurb:
      "Thomas's cyclically symmetric system in two variables: ẋ = sin y − bx, ẏ = sin x − by. A plane flow cannot be chaotic (the Poincaré–Bendixson theorem), so here it settles into a lattice of spirals.",
    xLatex: String.raw`\sin\left(y\right)-0.208186x`,
    yLatex: String.raw`\sin\left(x\right)-0.208186y`,
    colorScale: 0.8,
    backdrop: "#05020c",
    extent: 10,
    palette: "neon",
    flow: {
      particleCount: 40_000,
      speed: 5,
      trailPersistence: 0.97,
      dropRate: 0.004,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "René Thomas's attractor, ẋ = sin y − bx and its two rotations, with b = 0.208186: the same rule in three variables is chaotic, and the particles thread a looping labyrinth that looks the same from all three axes.",
      xLatex: String.raw`\sin\left(y\right)-0.208186x`,
      yLatex: String.raw`\sin\left(z\right)-0.208186y`,
      zLatex: String.raw`\sin\left(x\right)-0.208186z`,
      look: {
        particles: 30_000,
        speed: 0.35,
        trail: 64,
        lifetime: 12,
        opacity: 0.4,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#05020c",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "tornado",
    name: "Tornado",
    category: "fluids",
    blurb:
      "A tornado seen from above: air drawn inward from every side, spinning faster as it closes on the core, the Burgers–Rott vortex, an exact solution of the Navier–Stokes equations.",
    // The Burgers–Rott vortex's horizontal flow: inflow −αr/2 and swirl
    // Γ/(2πr)·(1 − e^(−r²/r₀²)), here with r₀ = 2.
    xLatex: String.raw`-0.08x-y\frac{6\left(1-e^{-\frac{x^{2}+y^{2}}{4}}\right)}{x^{2}+y^{2}+0.001}`,
    yLatex: String.raw`-0.08y+x\frac{6\left(1-e^{-\frac{x^{2}+y^{2}}{4}}\right)}{x^{2}+y^{2}+0.001}`,
    colorScale: 1.2,
    backdrop: "#0a0605",
    extent: 10,
    palette: "sunset",
    flow: {
      particleCount: 35_000,
      speed: 3,
      trailPersistence: 0.97,
      dropRate: 0.006,
      opacity: 0.35,
      pointSize: 1.3,
      glow: 0.3,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "The Burgers–Rott vortex standing on the ground: dust swept in along the floor spirals into the core and is stretched up the funnel, swirling fastest just outside it.",
      // u_r = −αr/2, u_θ = Γ/(2πr)(1 − e^(−r²/r₀²)), w = α(z + 5) up from
      // the box's floor, with α = 0.3, Γ/2π = 3, r₀ = 1.
      xLatex: String.raw`-0.15x-y\frac{3\left(1-e^{-x^{2}-y^{2}}\right)}{x^{2}+y^{2}+0.001}`,
      yLatex: String.raw`-0.15y+x\frac{3\left(1-e^{-x^{2}-y^{2}}\right)}{x^{2}+y^{2}+0.001}`,
      zLatex: String.raw`0.3\left(z+5\right)`,
      seedLatex: String.raw`\frac{e^{-3\left(z+5\right)^{2}}}{1+e^{3\left(\sqrt{x^{2}+y^{2}}-4.3\right)}}+0.25e^{-2\left(x^{2}+y^{2}\right)}`,
      look: {
        particles: 40_000,
        speed: 0.3,
        trail: 64,
        lifetime: 8,
        opacity: 0.35,
        glow: 0.15,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#0a0605",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "smoke-ring",
    name: "Smoke ring",
    category: "fluids",
    blurb:
      "A smoke ring cut through its middle: Hill's spherical vortex, seen riding along with it. The smoke turns over and over inside the sphere while the air outside parts round it.",
    // Hill's spherical vortex (1894), radius 5, in the frame moving with it:
    // inside, uniform vorticity; outside, potential flow round a sphere.
    xLatex: String.raw`\left\{x^{2}+y^{2}<25:0.06xy,\frac{187.5xy}{\left(x^{2}+y^{2}\right)^{2.5}}\right\}`,
    yLatex: String.raw`\left\{x^{2}+y^{2}<25:1.5\left(1-\frac{2x^{2}+y^{2}}{25}\right),-\left(1-\frac{125}{\left(x^{2}+y^{2}\right)^{1.5}}\right)-\frac{187.5x^{2}}{\left(x^{2}+y^{2}\right)^{2.5}}\right\}`,
    seedLatex: String.raw`e^{-\frac{\left(\left|x\right|-3.536\right)^{2}+y^{2}}{2}}+0.03`,
    colorScale: 1,
    backdrop: "#040506",
    extent: 10,
    palette: "grayscale",
    flow: {
      particleCount: 35_000,
      speed: 4,
      trailPersistence: 0.97,
      dropRate: 0.004,
      opacity: 0.35,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "Hill's spherical vortex in 3D, an exact solution of Euler's equations and the classic model of a smoke ring: smoke circles the ring's core inside a sphere, and the air outside streams past it.",
      // Radius a = 3.5, speed U = 1: inside u = (3U/2a²)·(xz, yz) and
      // w = (3U/2)(1 − (2ρ² + z²)/a²); outside the flow past a sphere.
      xLatex: String.raw`\left\{x^{2}+y^{2}+z^{2}<12.25:0.1224xz,\frac{64.31xz}{\left(x^{2}+y^{2}+z^{2}\right)^{2.5}}\right\}`,
      yLatex: String.raw`\left\{x^{2}+y^{2}+z^{2}<12.25:0.1224yz,\frac{64.31yz}{\left(x^{2}+y^{2}+z^{2}\right)^{2.5}}\right\}`,
      zLatex: String.raw`\left\{x^{2}+y^{2}+z^{2}<12.25:1.5\left(1-\frac{2x^{2}+2y^{2}+z^{2}}{12.25}\right),-\left(1-\frac{42.875}{\left(x^{2}+y^{2}+z^{2}\right)^{1.5}}\right)-\frac{64.31\left(x^{2}+y^{2}\right)}{\left(x^{2}+y^{2}+z^{2}\right)^{2.5}}\right\}`,
      seedLatex: String.raw`e^{-\frac{\left(\sqrt{x^{2}+y^{2}}-2.475\right)^{2}+z^{2}}{0.2}}+0.002`,
      look: {
        particles: 40_000,
        speed: 0.3,
        trail: 64,
        lifetime: 8,
        opacity: 0.35,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#040506",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "karman",
    name: "Vortex street",
    category: "fluids",
    blurb:
      "The wake behind a cylinder: vortices shed alternately from each side, spinning opposite ways, drifting downstream slower than the stream. Von Kármán showed only rows 0.281 of a spacing apart are stable.",
    // Two infinite rows of point vortices, spacing a = 6, rows h = 0.281a apart,
    // in a stream U = 1; each row's velocity is the sum over its vortices,
    // (Γ/2a)·(sinh, sin)/(cosh − cos). The street drifts at 0.646U.
    xLatex: String.raw`1+\frac{0.5\sinh\left(1.0472\left(y-0.843\right)\right)}{\cosh\left(1.0472\left(y-0.843\right)\right)-\cos\left(1.0472\left(x-0.646t\right)\right)+0.02}-\frac{0.5\sinh\left(1.0472\left(y+0.843\right)\right)}{\cosh\left(1.0472\left(y+0.843\right)\right)-\cos\left(1.0472\left(x-0.646t\right)-3.1416\right)+0.02}`,
    yLatex: String.raw`-\frac{0.5\sin\left(1.0472\left(x-0.646t\right)\right)}{\cosh\left(1.0472\left(y-0.843\right)\right)-\cos\left(1.0472\left(x-0.646t\right)\right)+0.02}+\frac{0.5\sin\left(1.0472\left(x-0.646t\right)-3.1416\right)}{\cosh\left(1.0472\left(y+0.843\right)\right)-\cos\left(1.0472\left(x-0.646t\right)-3.1416\right)+0.02}`,
    seedLatex: String.raw`e^{-\frac{y^{2}}{1.2}}`,
    colorScale: 1,
    backdrop: "#02060a",
    extent: 10,
    palette: "ocean",
    flow: {
      particleCount: 40_000,
      speed: 5,
      trailPersistence: 0.96,
      dropRate: 0.006,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "The vortex street in 3D: the vortices are tubes along the cylinder's span, and they wave — the instability that makes real wakes three-dimensional.",
      // The same street, spacing 4, its tubes displaced 0.25 sin(1.5z)
      // along the stream.
      xLatex: String.raw`1+\frac{0.5\sinh\left(1.5708\left(y-0.562\right)\right)}{\cosh\left(1.5708\left(y-0.562\right)\right)-\cos\left(1.5708\left(x-0.646t+0.25\sin\left(1.5z\right)\right)\right)+0.02}-\frac{0.5\sinh\left(1.5708\left(y+0.562\right)\right)}{\cosh\left(1.5708\left(y+0.562\right)\right)-\cos\left(1.5708\left(x-0.646t+0.25\sin\left(1.5z\right)\right)-3.1416\right)+0.02}`,
      yLatex: String.raw`-\frac{0.5\sin\left(1.5708\left(x-0.646t+0.25\sin\left(1.5z\right)\right)\right)}{\cosh\left(1.5708\left(y-0.562\right)\right)-\cos\left(1.5708\left(x-0.646t+0.25\sin\left(1.5z\right)\right)\right)+0.02}+\frac{0.5\sin\left(1.5708\left(x-0.646t+0.25\sin\left(1.5z\right)\right)-3.1416\right)}{\cosh\left(1.5708\left(y+0.562\right)\right)-\cos\left(1.5708\left(x-0.646t+0.25\sin\left(1.5z\right)\right)-3.1416\right)+0.02}`,
      zLatex: String.raw`0`,
      seedLatex: String.raw`e^{-\frac{y^{2}}{0.6}}`,
      look: {
        particles: 40_000,
        speed: 0.3,
        trail: 48,
        lifetime: 5,
        opacity: 0.35,
        glow: 0.15,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#02060a",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "solar-wind",
    name: "Solar wind",
    category: "space",
    blurb:
      "The Sun's magnetic field carried out by the solar wind while the Sun turns, wound into Parker's spiral. Slow wind, about 400 km/s, marks the sector boundaries, where the spiral winds tighter; fast wind, about 750 km/s, is bright.",
    // Along B ∝ r̂ − (Ωr/v)φ̂, at the wind's speed v: 0.53 (slow) to 1 (fast),
    // slow at four sector boundaries that spiral out with the field and turn.
    xLatex: String.raw`\frac{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)\left(x+\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}y\right)}{\sqrt{x^{2}+y^{2}}\sqrt{1+\left(\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}\right)^{2}}}`,
    yLatex: String.raw`\frac{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)\left(y-\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}x\right)}{\sqrt{x^{2}+y^{2}}\sqrt{1+\left(\frac{0.15\sqrt{x^{2}+y^{2}}}{\left(1-0.467e^{-\frac{\sin\left(2\arctan\left(y,x\right)+0.6\sqrt{x^{2}+y^{2}}-0.3t\right)^{2}}{0.08}}\right)}\right)^{2}}}`,
    seedLatex: String.raw`e^{-3\left(\sqrt{x^{2}+y^{2}}-1.2\right)^{2}}`,
    colorScale: 0.6,
    backdrop: "#070305",
    extent: 10,
    palette: "sunset",
    flow: {
      particleCount: 40_000,
      speed: 6,
      trailPersistence: 0.97,
      dropRate: 0.004,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "Parker's spiral in 3D, with the heliospheric current sheet: the Sun's tilted magnetic equator, flung out and wound up into the wavy 'ballerina skirt'. Particles are born on the skirt; the slow wind rides it.",
      // B ∝ r̂ − (Ωρ/v)φ̂, which winds faster near the equator; the current
      // sheet at z = 0.35ρ sin(φ + Ωr/v − Ωt), slow wind within it.
      xLatex: String.raw`\frac{\frac{x}{\sqrt{x^{2}+y^{2}+z^{2}}}+\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}y}{\sqrt{1+\left(\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}\right)^{2}\left(x^{2}+y^{2}\right)}}\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)`,
      yLatex: String.raw`\frac{\frac{y}{\sqrt{x^{2}+y^{2}+z^{2}}}-\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}x}{\sqrt{1+\left(\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}\right)^{2}\left(x^{2}+y^{2}\right)}}\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)`,
      zLatex: String.raw`\frac{\frac{z}{\sqrt{x^{2}+y^{2}+z^{2}}}}{\sqrt{1+\left(\frac{0.3}{\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)}\right)^{2}\left(x^{2}+y^{2}\right)}}\left(1-0.467e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.25}}\right)`,
      seedLatex: String.raw`\frac{e^{-\frac{\left(z-0.35\sqrt{x^{2}+y^{2}}\sin\left(\arctan\left(y,x\right)+0.45\sqrt{x^{2}+y^{2}+z^{2}}-0.3t\right)\right)^{2}}{0.05}}}{1+e^{-4\left(\sqrt{x^{2}+y^{2}+z^{2}}-1.2\right)}}+0.5e^{-6\left(\sqrt{x^{2}+y^{2}+z^{2}}-1\right)^{2}}`,
      look: {
        particles: 40_000,
        speed: 0.3,
        trail: 64,
        lifetime: 6,
        opacity: 0.4,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: false,
        colorMode: "speed",
        backdrop: "#070305",
        backdropOpacity: 1,
      },
    },
  },
];

export function galleryPreset(id: string): GalleryPreset | undefined {
  return FIELD_GALLERY.find((preset) => preset.id === id);
}
