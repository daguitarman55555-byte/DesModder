/** Space: black holes, galaxies, stars and the solar wind. */
import { dipole, orbitingWells, r3, rho } from "./latex";
import type { GalleryPreset } from "./types";

/** The star cluster's three stars, circling their common centre. */
const CLUSTER_2D = orbitingWells(
  [
    [-4, 2, 0],
    [3, 3, 0],
    [1, -4, 0],
  ],
  0.15,
  ["x", "y"],
  0.4
);
const CLUSTER_3D = orbitingWells(
  [
    [-2.4, 1.2, 0.6],
    [1.8, 1.8, -1.2],
    [0.6, -2.4, 0],
  ],
  0.2,
  ["x", "y", "z"],
  0.25
);

/**
 * The pulsar's spinning, tilted dipole: in the plane, m = (cos t, sin t); in
 * the box, tilted 0.5 rad from its spin axis, m = (0.48 cos t, 0.48 sin t,
 * 0.88). The wind leaves both poles.
 */
const PULSAR_2D = dipole(
  [String.raw`\cos\left(t\right)`, String.raw`\sin\left(t\right)`],
  ["x", "y"],
  0.8,
  true
);
const PULSAR_3D = dipole(
  [
    String.raw`0.48\cos\left(t\right)`,
    String.raw`0.48\sin\left(t\right)`,
    "0.88",
  ],
  ["x", "y", "z"],
  0.7,
  true
);

export const SPACE: readonly GalleryPreset[] = [
  {
    id: "black-hole",
    name: "Black hole",
    category: "space",
    blurb:
      "An accretion disk seen from above: gas on Keplerian orbits, faster and hotter inward, plunging into the horizon once inside the innermost stable orbit. The black disc is the hole's shadow, ringed by the light that went round it. A spiral density wave turns through the disk.",
    // Rotation plus a drift toward the centre. The 3/4 power makes the speed
    // go as r^-1/2, which is the Keplerian falloff a real disc has. The drift
    // is slow across the disk and fast close in, where nothing orbits stably
    // and gas plunges: e^(−r²/4) switches it on there.
    xLatex: String.raw`\frac{3\left(-y-x\left(0.05+0.9e^{-0.25\left(x^{2}+y^{2}\right)}\right)\right)}{\left(x^{2}+y^{2}+0.1\right)^{0.75}}`,
    yLatex: String.raw`\frac{3\left(x-y\left(0.05+0.9e^{-0.25\left(x^{2}+y^{2}\right)}\right)\right)}{\left(x^{2}+y^{2}+0.1\right)^{0.75}}`,
    // The disk from the innermost stable orbit outward, ringed, denser
    // inward; and a faint haze close in, gas being drawn down into the hole.
    seedLatex: String.raw`\frac{\left(0.3+0.7\sin\left(2.75\sqrt{x^{2}+y^{2}}+\arctan\left(y,x\right)-0.8t\right)^{2}\right)\cdot\frac{3}{\sqrt{x^{2}+y^{2}}}}{\left(1+e^{-7\left(\sqrt{x^{2}+y^{2}}-2.8\right)}\right)\left(1+e^{2.5\left(\sqrt{x^{2}+y^{2}}-8\right)}\right)}+0.05e^{-0.3\left(x^{2}+y^{2}\right)}`,
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
        "A black hole's accretion disk: gas on Keplerian orbits, hotter and faster inward, drifting in to the horizon. The disk behind the hole is seen bent over and under it by its gravity, and the side coming towards you is brighter. A spiral density wave turns through it.",
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
      seedLatex: String.raw`e^{-\frac{z^{2}}{0.006}}\cdot\frac{1.6}{${rho}}\cdot\frac{0.65+0.35\sin\left(11${rho}+\arctan\left(y,x\right)-0.8t\right)}{\left(1+e^{-14\left(${rho}-1.4\right)}\right)\left(1+e^{5\left(${rho}-4.5\right)}\right)}+0.005e^{-0.6\left(x^{2}+y^{2}+z^{2}\right)}`,
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
    seedLatex: String.raw`\left(0.01+\left(\frac{1+\frac{\left(x^{2}-y^{2}\right)\cos\left(1.6\ln\left(x^{2}+y^{2}+0.01\right)-0.15t\right)+2xy\sin\left(1.6\ln\left(x^{2}+y^{2}+0.01\right)-0.15t\right)}{x^{2}+y^{2}+0.01}}{2}\right)^{16}\right)\frac{e^{-0.12\sqrt{x^{2}+y^{2}}}}{1+e^{2\left(\sqrt{x^{2}+y^{2}}-9\right)}}+e^{-0.5\left(x^{2}+y^{2}\right)}`,
    colorScale: 1.5,
    palette: "galaxy",
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
    colorScale: 2,
    palette: "auroral",
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
        colorMode: "speed",
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
      "A pulsar: a neutron star whose magnetic field turns with it. Charged particles stream out of both magnetic poles along the field lines and meet at the magnetic equator, where the field reverses — the current sheet.",
    // A dipole spinning in the plane, m = (cos t, sin t):
    // B = (3(m·r)r − m r²) / r⁵, with particles streaming off its poles.
    xLatex: PULSAR_2D.x!,
    yLatex: PULSAR_2D.y!,
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
    timeSpeed: 0.1,
    space: {
      blurb:
        "A pulsar's magnetosphere: a neutron star whose magnetic axis is tilted from its spin axis, so the whole field turns with it. The wind streams out of both magnetic poles along the field lines and meets at the magnetic equator, where the field reverses.",
      // A dipole whose moment m = (sin α cos t, sin α sin t, cos α), α = 0.5,
      // spins about z: B = (3(m·r)r − m r²) / r⁵.
      xLatex: PULSAR_3D.x!,
      yLatex: PULSAR_3D.y!,
      zLatex: PULSAR_3D.z!,
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
      "Three attractors. Particles fall into them and pile up, so the knots draw themselves. The stars circle their common centre, dragging their streams round.",
    xLatex: CLUSTER_2D.x!,
    yLatex: CLUSTER_2D.y!,
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
        "Three stars at different heights, each pulling in the gas around it: streams fall in from every side and gather into glowing knots. The stars circle their common centre, dragging their streams round.",
      xLatex: CLUSTER_3D.x!,
      yLatex: CLUSTER_3D.y!,
      zLatex: CLUSTER_3D.z!,
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
