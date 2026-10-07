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

export const FLUIDS: readonly GalleryPreset[] = [
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
      seedLatex: String.raw`e^{-\frac{\left(\sqrt{\left(x-2.4\cos t\right)^{2}+\left(y-2.4\sin t\right)^{2}}-0.8\right)^{2}}{0.08}}+e^{-\frac{\left(\sqrt{\left(x+2.4\cos t\right)^{2}+\left(y+2.4\sin t\right)^{2}}-0.8\right)^{2}}{0.08}}`,
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
        "The 3D Taylor–Green vortex, the standard start of a turbulence simulation: cells that turn one way above and the other way below. It rides a steady current, so the cells sweep past.",
      xLatex: String.raw`0.5+\sin\left(x-0.5t\right)\cos\left(y\right)\cos\left(z\right)`,
      yLatex: String.raw`-\cos\left(x-0.5t\right)\sin\left(y\right)\cos\left(z\right)`,
      zLatex: String.raw`0`,
      // Three thin layers, at z = 0 and ±π, where the flow is strongest
      // and turns opposite ways; w = 0 keeps each particle in its layer.
      seedLatex: String.raw`e^{-\frac{z^{2}}{0.08}}+e^{-\frac{\left(z-3.1416\right)^{2}}{0.08}}+e^{-\frac{\left(z+3.1416\right)^{2}}{0.08}}`,
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
      "A tornado seen from above: air drawn inward from every side, spinning faster as it closes on the core, the Burgers–Rott vortex, an exact solution of the Navier–Stokes equations. Its core wanders, as a real one does.",
    // The Burgers–Rott vortex's horizontal flow: inflow −αr/2 and swirl
    // Γ/(2πr)·(1 − e^(−r²/r₀²)), here with r₀ = 2.
    xLatex: String.raw`-0.08\left(x-1.5\sin\left(0.21t\right)\right)-\left(y-1.5\sin\left(0.33t\right)\right)\frac{6\left(1-e^{-\frac{\left(x-1.5\sin\left(0.21t\right)\right)^{2}+\left(y-1.5\sin\left(0.33t\right)\right)^{2}}{4}}\right)}{\left(x-1.5\sin\left(0.21t\right)\right)^{2}+\left(y-1.5\sin\left(0.33t\right)\right)^{2}+0.001}`,
    yLatex: String.raw`-0.08\left(y-1.5\sin\left(0.33t\right)\right)+\left(x-1.5\sin\left(0.21t\right)\right)\frac{6\left(1-e^{-\frac{\left(x-1.5\sin\left(0.21t\right)\right)^{2}+\left(y-1.5\sin\left(0.33t\right)\right)^{2}}{4}}\right)}{\left(x-1.5\sin\left(0.21t\right)\right)^{2}+\left(y-1.5\sin\left(0.33t\right)\right)^{2}+0.001}`,
    colorScale: 1.2,
    backdrop: "#0a0605",
    extent: 10,
    palette: "grayscale",
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
        "The Burgers–Rott vortex standing on the ground: dust swept in along the floor spirals into the core and is stretched up the funnel, swirling fastest just outside it. The funnel leans and swings round, rooted where it touches the ground.",
      // u_r = −αr/2, u_θ = Γ/(2πr)(1 − e^(−r²/r₀²)), w = α(z + 5) up from
      // the box's floor, with α = 0.3, Γ/2π = 3, r₀ = 1.
      xLatex: String.raw`-0.15\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)-\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)\frac{3\left(1-e^{-\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)^{2}-\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)^{2}}\right)}{\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)^{2}+\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)^{2}+0.001}`,
      yLatex: String.raw`-0.15\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)+\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)\frac{3\left(1-e^{-\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)^{2}-\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)^{2}}\right)}{\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)^{2}+\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)^{2}+0.001}`,
      zLatex: String.raw`0.3\left(z+5\right)`,
      seedLatex: String.raw`\frac{e^{-3\left(z+5\right)^{2}}}{1+e^{3\left(\sqrt{x^{2}+y^{2}}-4.3\right)}}+0.25e^{-2\left(\left(x-0.1\left(z+5\right)\cos\left(0.4t\right)\right)^{2}+\left(y-0.1\left(z+5\right)\sin\left(0.4t\right)\right)^{2}\right)}`,
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
      "A smoke ring cut through its middle: Hill's spherical vortex, seen riding along with it. The smoke turns over and over inside the sphere while the air outside parts round it. The puff driving it pulses, so the smoke turns faster and slower.",
    // Hill's spherical vortex (1894), radius 5, in the frame moving with it:
    // inside, uniform vorticity; outside, potential flow round a sphere.
    xLatex: String.raw`\left(1+0.35\sin\left(0.6t\right)\right)\left\{x^{2}+y^{2}<25:0.06xy,\frac{187.5xy}{\left(x^{2}+y^{2}\right)^{2.5}}\right\}`,
    yLatex: String.raw`\left(1+0.35\sin\left(0.6t\right)\right)\left\{x^{2}+y^{2}<25:1.5\left(1-\frac{2x^{2}+y^{2}}{25}\right),-\left(1-\frac{125}{\left(x^{2}+y^{2}\right)^{1.5}}\right)-\frac{187.5x^{2}}{\left(x^{2}+y^{2}\right)^{2.5}}\right\}`,
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
