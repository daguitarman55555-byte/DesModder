/** Chaos: strange attractors and where they come from. */
import type { GalleryPreset } from "./types";

export const CHAOS: readonly GalleryPreset[] = [
  {
    id: "lorenz",
    name: "Lorenz butterfly",
    category: "chaos",
    blurb:
      "Rayleigh–Bénard convection: a fluid heated from below rolls over in cells, warm rising, cool sinking. Lorenz cut these rolls down to three equations in 1963, and found chaos in them. Here the rolls travel sideways, as they do in a mixture of two fluids.",
    // Stream function ψ = 3 sin(0.4833x) cos(πy/8) in the layer |y| < 4, so
    // u = ∂ψ/∂y and v = −∂ψ/∂x: closed rolls between the plates.
    xLatex: String.raw`-1.178\sin\left(0.4833\left(x-0.4t\right)\right)\sin\left(0.3927y\right)`,
    yLatex: String.raw`-1.45\cos\left(0.4833\left(x-0.4t\right)\right)\cos\left(0.3927y\right)`,
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
        "Lorenz's equations themselves, σ = 10, ρ = 28, β = 8/3: every particle falls onto the butterfly and circles one wing, then the other, never repeating — the strange attractor that named the butterfly effect. The heating, ρ, rises and falls between 25 and 31, and the butterfly breathes with it.",
      // Lorenz's x, y, z scaled into the box: X = x/5.5, Y = y/5.5,
      // Z = (z − 25)/5.5, so ẋ = σ(y − x), ẏ = x(ρ − z) − y and
      // ż = xy − βz become these.
      xLatex: String.raw`10\left(y-x\right)`,
      yLatex: String.raw`x\left(3+3\sin\left(0.15t\right)-5.5z\right)-y`,
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
      "Thomas's cyclically symmetric system in two variables: ẋ = sin y − bx, ẏ = sin x − by. A plane flow cannot be chaotic (the Poincaré–Bendixson theorem), so here it settles into a lattice of spirals. The damping b drifts between 0.16 and 0.21, and the spirals tighten and loosen.",
    xLatex: String.raw`\sin\left(y\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)x`,
    yLatex: String.raw`\sin\left(x\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)y`,
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
        "René Thomas's attractor, ẋ = sin y − bx and its two rotations, with b = 0.208186: the same rule in three variables is chaotic, and the particles thread a looping labyrinth that looks the same from all three axes. The damping b drifts between 0.16 and 0.21, from deep chaos to its edge and back.",
      xLatex: String.raw`\sin\left(y\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)x`,
      yLatex: String.raw`\sin\left(z\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)y`,
      zLatex: String.raw`\sin\left(x\right)-\left(0.185+0.025\sin\left(0.12t\right)\right)z`,
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
];
