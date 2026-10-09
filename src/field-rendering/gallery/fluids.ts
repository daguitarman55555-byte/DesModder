import { thinVortexRing, vortexStreet } from "./latex";
/** Fluids: vortices, wakes and storms. */
import type { GalleryPreset } from "./types";

/** The vortex street: spacing 6 on the plane, 4 in the box, rows 0.281 of it apart. */
const STREET_2D = vortexStreet(1.0472, 0.843, 0.5);
const STREET_3D = vortexStreet(
  1.5708,
  0.562,
  0.5,
  String.raw`+0.25\sin\left(1.5z\right)`
);

/**
 * The smoke ring in the box: radius 2.5, core 0.4, k = Γ/2π = 2, its puff
 * pulsing.
 */
const RING = thinVortexRing(
  2.5,
  0.4,
  2,
  String.raw`\left(1+0.35\sin\left(0.6t\right)\right)`
);

/**
 * A tornado standing on the ground, z = −5, under its cloud base at z = 4.
 *
 * Its core radius grows with height, r_c = 0.3 + 0.0015h³ for h = z + 5:
 * a rope at the ground flaring into the cloud, the condensation funnel's
 * shape. Round it, the Burgers–Rott swirl Γ(1 − e^(−r²/r_c²))/r, fastest
 * just outside the core and near the ground, where it is narrowest. The air
 * comes in along the ground, where friction has slowed its spin and the
 * pressure drop draws it inward (the boundary layer that feeds a real
 * tornado), rises fast in the core, and spreads out under the cloud. The
 * funnel leans and sways, rooted where it touches down.
 */
const TORNADO = (() => {
  const h = String.raw`\left(z+5\right)`;
  const dx = String.raw`\left(x-0.06${h}\cos\left(0.35t\right)\right)`;
  const dy = String.raw`\left(y-0.06${h}\sin\left(0.35t\right)\right)`;
  const r2 = String.raw`${dx}^{2}+${dy}^{2}`;
  const rc = String.raw`\left(0.3+0.0015${h}^{3}\right)`;
  const swirl = String.raw`\frac{2.2\left(1-e^{-\frac{${r2}}{${rc}^{2}}}\right)}{${r2}+0.0001}`;
  const radial = String.raw`\left(\frac{0.3}{1+e^{-3\left(z-3.5\right)}}-0.6e^{-${h}}\right)`;
  return {
    x: String.raw`${radial}${dx}-${dy}${swirl}`,
    y: String.raw`${radial}${dy}+${dx}${swirl}`,
    z: String.raw`0.12+2.2e^{-\frac{${r2}}{1.5${rc}^{2}}}`,
    // Debris swept along the ground; the funnel, a thin shell at the core's
    // edge, where the pressure drop condenses the air; and the wall cloud.
    seed: String.raw`\frac{e^{-2${h}}}{1+e^{2\left(\sqrt{${r2}}-3.5\right)}}+\frac{0.8e^{-\frac{\left(\sqrt{${r2}}-${rc}\right)^{2}}{0.06${rc}^{2}}}}{1+e^{-4\left(z+4.5\right)}}+\frac{0.5e^{-4\left(z-4.4\right)^{2}}}{1+e^{2\left(\sqrt{x^{2}+y^{2}}-4.5\right)}}`,
  };
})();

/**
 * The tornado from above: the core wandering, air spiralling into it, and
 * the debris and rain it draws in falling into spiral bands.
 */
const TORNADO_TOP = (() => {
  const X = String.raw`\left(x-1.5\sin\left(0.21t\right)\right)`;
  const Y = String.raw`\left(y-1.5\sin\left(0.33t\right)\right)`;
  const r2 = String.raw`${X}^{2}+${Y}^{2}`;
  const swirl = String.raw`\frac{6\left(1-e^{-\frac{${r2}}{4}}\right)}{${r2}+0.001}`;
  return {
    x: String.raw`-0.08${X}-${Y}${swirl}`,
    y: String.raw`-0.08${Y}+${X}${swirl}`,
    seed: String.raw`0.15+0.85\left(\frac{1+\sin\left(2\arctan\left(${Y},${X}\right)+2\ln\left(${r2}+1\right)-0.6t\right)}{2}\right)^{4}+e^{-\frac{\left(\sqrt{${r2}}-2\right)^{2}}{0.5}}`,
  };
})();

export const FLUIDS: readonly GalleryPreset[] = [
  {
    id: "cellular",
    name: "Vortex lattice",
    category: "fluids",
    blurb:
      "Taylor–Green flow: an array of counter-rotating cells, each one shearing against its neighbours. Here it rides a steady current, so the cells sweep past: still an exact solution, since the equations do not change for a moving observer.",
    // Bracketed: Desmos refuses `\sin x\cos y` ("Use parentheses around the
    // argument of 'sin'"), and these are written into the expression list.
    xLatex: String.raw`0.5+\sin\left(x-0.5t\right)\cos\left(y\right)`,
    yLatex: String.raw`-\cos\left(x-0.5t\right)\sin\left(y\right)`,
    colorScale: 0.5,
    // Coloured by which way the fluid spins where it is: its vorticity,
    // ∂v/∂x − ∂u/∂y, which for these cells is exactly 2 sin(x − 0.5t) sin y.
    // Red turns counter-clockwise and blue clockwise, so the alternating
    // cells read as alternating at a glance; speed would colour them alike.
    palette: "charge-glow",
    tint: {
      latex: String.raw`2\sin\left(x-0.5t\right)\sin\left(y\right)`,
      latex3d: String.raw`2\sin\left(x-0.5t\right)\sin\left(y\right)`,
      scale: 1,
    },
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
        "The Taylor–Green cells drawn in depth: each vortex a tube running straight through, the same flat flow at every height. It rides a steady current, so the cells sweep past.",
      // The same in every plane across z: each vortex a tube through the
      // box. A factor cos z made the flow strong in three layers and dead
      // between them, which drew as three stacked copies of the lattice.
      xLatex: String.raw`0.5+\sin\left(x-0.5t\right)\cos\left(y\right)`,
      yLatex: String.raw`-\cos\left(x-0.5t\right)\sin\left(y\right)`,
      zLatex: String.raw`0`,
      // One sheet of the lattice: the cells are the same at every depth, so
      // one layer shows them, where filling the box hid them in each other.
      seedLatex: String.raw`e^{-\frac{z^{2}}{0.1}}`,
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
    id: "tornado",
    name: "Tornado",
    category: "fluids",
    blurb:
      "A tornado seen from above: air drawn inward from every side, spinning faster as it closes on the core — the Burgers–Rott vortex, an exact solution of the Navier–Stokes equations — with the debris and rain it draws in falling into spiral bands. Its core wanders, as a real one does.",
    xLatex: TORNADO_TOP.x,
    yLatex: TORNADO_TOP.y,
    seedLatex: TORNADO_TOP.seed,
    colorScale: 1.2,
    backdrop: "#0a0907",
    extent: 10,
    palette: "storm",
    flow: {
      particleCount: 40_000,
      speed: 3,
      trailPersistence: 0.97,
      dropRate: 0.008,
      opacity: 0.4,
      pointSize: 1.3,
      glow: 0.35,
      normalizeSpeed: false,
    },
    space: {
      blurb:
        "A tornado standing on the ground: a narrow rope at the ground flaring into the cloud base, the condensation funnel's shape, swirling fastest just outside its core and near the ground. Air and debris sweep in along the ground, rise fast up the core, and spread out under the wall cloud. The funnel leans and sways, rooted where it touches down.",
      xLatex: TORNADO.x,
      yLatex: TORNADO.y,
      zLatex: TORNADO.z,
      seedLatex: TORNADO.seed,
      look: {
        palette: "storm",
        particles: 45_000,
        speed: 0.3,
        trail: 48,
        lifetime: 4,
        // Everything rises through the core, so it piles up there: at more
        // than this the funnel was a white bar.
        opacity: 0.22,
        glow: 0.2,
        normalizeSpeed: false,
        absorb: true,
        colorMode: "speed",
        backdrop: "#0a0907",
        backdropOpacity: 1,
      },
    },
  },
  {
    id: "smoke-ring",
    name: "Smoke ring",
    category: "fluids",
    blurb:
      "A smoke ring cut through its middle: Hill's spherical vortex, seen riding along with it. The smoke turns over and over inside the sphere while the air outside parts round it. The puff driving it pulses, so the smoke turns faster and slower.",
    // Hill's spherical vortex (1894), radius 5, in the frame moving with it:
    // inside, uniform vorticity; outside, potential flow round a sphere.
    xLatex: String.raw`\left(1+0.35\sin\left(0.6t\right)\right)\left\{x^{2}+y^{2}<25:0.06xy,\frac{187.5xy}{\left(x^{2}+y^{2}\right)^{2.5}}\right\}`,
    yLatex: String.raw`\left(1+0.35\sin\left(0.6t\right)\right)\left\{x^{2}+y^{2}<25:1.5\left(1-\frac{2x^{2}+y^{2}}{25}\right),-\left(1-\frac{125}{\left(x^{2}+y^{2}\right)^{1.5}}\right)-\frac{187.5x^{2}}{\left(x^{2}+y^{2}\right)^{2.5}}\right\}`,
    seedLatex: String.raw`e^{-\frac{\left(\left|x\right|-3.536\right)^{2}+y^{2}}{2}}+0.03`,
    colorScale: 1,
    backdrop: "#040506",
    extent: 10,
    palette: "ocean",
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
        "A smoke ring in 3D: smoke spinning round a thin core bent into a circle, as a real ring's is, in the frame moving with it, so the air streams past. Each cross-section is a pair of Lamb–Oseen vortices, the thin-core approximation. The puff driving it pulses.",
      xLatex: RING.x,
      yLatex: RING.y,
      zLatex: RING.z,
      seedLatex: String.raw`e^{-\frac{\left(\sqrt{x^{2}+y^{2}}-2.5\right)^{2}+z^{2}}{0.12}}+0.004`,
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
    xLatex: STREET_2D.x,
    yLatex: STREET_2D.y,
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
      xLatex: STREET_3D.x,
      yLatex: STREET_3D.y,
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
];
