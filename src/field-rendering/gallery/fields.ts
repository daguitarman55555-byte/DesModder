/** Fields: the textbook pictures. */
import { dipole, r2, r3 } from "./latex";
import type { GalleryPreset } from "./types";

/** The bar magnet on alternating current, along y in the plane and z in the box. */
const AC = String.raw`\cos\left(0.4t\right)`;
const MAGNET_2D = dipole(["0", AC], ["x", "y"], 0.8, false);
const MAGNET_3D = dipole(["0", "0", AC], ["x", "y", "z"], 0.6, false);

export const FIELDS: readonly GalleryPreset[] = [
  {
    id: "dipole",
    name: "Magnetic dipole",
    category: "fields",
    blurb:
      "The field of a bar magnet, and the one picture every physics textbook opens with. On alternating current: the lines keep their shape, and the field fades, reverses and returns.",
    xLatex: MAGNET_2D.x!,
    yLatex: MAGNET_2D.y!,
    // Released round the magnet, as iron filings draw it.
    seedLatex: String.raw`\frac{e^{-0.04\left(x^{2}+y^{2}\right)}}{1+e^{-4\left(\sqrt{x^{2}+y^{2}}-1.5\right)}}`,
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
      xLatex: MAGNET_3D.x!,
      yLatex: MAGNET_3D.y!,
      zLatex: MAGNET_3D.z!,
      // Released round the magnet, a sphere of radius 1.
      seedLatex: String.raw`\frac{e^{-0.1\left(x^{2}+y^{2}+z^{2}\right)}}{1+e^{-4\left(\sqrt{x^{2}+y^{2}+z^{2}}-1.3\right)}}`,
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
