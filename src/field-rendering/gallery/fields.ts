/** Fields: the textbook pictures. */
import { r2, r3 } from "./latex";
import type { GalleryPreset } from "./types";

export const FIELDS: readonly GalleryPreset[] = [
  {
    id: "dipole",
    name: "Magnetic dipole",
    category: "fields",
    blurb:
      "The field of a bar magnet, and the one picture every physics textbook opens with. On alternating current: the lines keep their shape, and the field fades, reverses and returns.",
    xLatex: String.raw`\frac{3xy\cos\left(0.4t\right)}{${r2}^{2.5}}`,
    yLatex: String.raw`\frac{\left(2y^{2}-x^{2}\right)\cos\left(0.4t\right)}{${r2}^{2.5}}`,
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
        "A bar magnet along the z-axis: field lines leave the north pole, loop round in every direction, and come back in at the south — drawn, as iron filings draw them, from around the magnet outward. On alternating current, so the field fades, reverses and returns.",
      xLatex: String.raw`\frac{3xz\cos\left(0.4t\right)}{${r3}^{2.5}}`,
      yLatex: String.raw`\frac{3yz\cos\left(0.4t\right)}{${r3}^{2.5}}`,
      zLatex: String.raw`\frac{\left(2z^{2}-x^{2}-y^{2}\right)\cos\left(0.4t\right)}{${r3}^{2.5}}`,
      // Released round the magnet, a sphere of radius 1.
      seedLatex: String.raw`e^{-10\left(\sqrt{${r3}}-1.2\right)^{2}}`,
      look: {
        particles: 18_000,
        speed: 0.3,
        trail: 64,
        lifetime: 5,
        opacity: 0.14,
        glow: 0.08,
        normalizeSpeed: true,
        absorb: true,
        colorMode: "speed",
        backdrop: "#02030a",
        backdropOpacity: 1,
      },
    },
  },
];
