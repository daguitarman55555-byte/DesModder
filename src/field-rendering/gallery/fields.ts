/** Fields: the textbook pictures. */
import { dipole, planeDipole } from "./latex";
import type { GalleryPreset } from "./types";

/** The bar magnet on alternating current, along y in the plane and z in the box. */
const AC = String.raw`\cos\left(0.4t\right)`;
const MAGNET_2D = planeDipole(["0", AC], 0.8);
const MAGNET_3D = dipole(["0", "0", AC], ["x", "y", "z"], 0.6, false, "magnet");

export const FIELDS: readonly GalleryPreset[] = [
  {
    id: "dipole",
    name: "Magnetic dipole",
    category: "fields",
    blurb:
      "The field of a bar magnet, and the one picture every physics textbook opens with. On alternating current: the lines keep their shape, and the field fades, reverses and returns.",
    xLatex: MAGNET_2D.x,
    yLatex: MAGNET_2D.y,
    // Released everywhere, thinning outward: the small loops hugging the
    // magnet too, which a seed starting at 1.5 left as two black crescents.
    // Fewer close in, where particles moving along the lines at one pace
    // crowd anyway (their density goes as |B|), which washed the lines there
    // into a glow.
    seedLatex: String.raw`\frac{\left(x^{2}+y^{2}\right)e^{-0.03\left(x^{2}+y^{2}\right)}}{x^{2}+y^{2}+2}`,
    // By direction: the field falls as 1/r², so by strength every line but
    // the nearest was dark; by direction each loop is a rainbow, evenly lit,
    // and when the current reverses, every colour turns to its opposite.
    colorByDirection: true,
    colorScale: 0.25,
    palette: "neon",
    backdrop: "#02030a",
    flow: {
      // Sparse, long-trailed and thin, so each particle draws a line, as
      // iron filings do.
      particleCount: 16_000,
      glow: 0.15,
      opacity: 0.5,
      pointSize: 1.2,
      // The field is enormous at the origin and tiny at the edge, so drawing
      // it at its own pace leaves everything but the centre standing still.
      normalizeSpeed: true,
      speed: 0.35,
      trailPersistence: 0.985,
      dropRate: 0.005,
    },
    extent: 6,
    space: {
      blurb:
        "A bar magnet along the z-axis: field lines leave the north pole, loop round in every direction, and come back in at the south — drawn, as iron filings draw them, from around the magnet outward. On alternating current, so the field fades, reverses and returns.",
      xLatex: MAGNET_3D.x!,
      yLatex: MAGNET_3D.y!,
      zLatex: MAGNET_3D.z!,
      // Released everywhere, thinning outward, the loops hugging the magnet
      // included.
      seedLatex: String.raw`e^{-0.06\left(x^{2}+y^{2}+z^{2}\right)}`,
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
