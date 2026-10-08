/** Fields: the textbook pictures. */
import type { GalleryPreset } from "./types";

/** The bar magnet on alternating current, along y in the plane and z in the box. */
const AC = String.raw`\cos\left(0.4t\right)`;
/**
 * In the plane, the slice through a point dipole's field, B = (3(m·r)r −
 * m r²)/r⁵, with nothing cut out of it: its loops go on shrinking into the
 * centre however far in you zoom, as a dipole's do. Any core — a disc of
 * uniform field, even one of radius 0.25 — drew as a ball sitting on the
 * lines, which no dipole has. At the origin itself the field is undefined,
 * and draws nothing.
 */
const MAGNET_2D = {
  x: String.raw`\frac{3x\cdot${AC}y}{\left(x^{2}+y^{2}\right)^{2.5}}`,
  y: String.raw`\frac{3y\cdot${AC}y-${AC}\left(x^{2}+y^{2}\right)}{\left(x^{2}+y^{2}\right)^{2.5}}`,
};
/**
 * The same point dipole in the box, along z, with nothing cut out of it
 * either: it had a uniformly magnetised core of radius 0.6, which drew as a
 * ball where the 2D one already went on shrinking into the centre.
 */
const R3 = String.raw`\left(x^{2}+y^{2}+z^{2}\right)`;
const MAGNET_3D = {
  x: String.raw`\frac{3x\cdot${AC}z}{${R3}^{2.5}}`,
  y: String.raw`\frac{3y\cdot${AC}z}{${R3}^{2.5}}`,
  z: String.raw`\frac{3z\cdot${AC}z-${AC}${R3}}{${R3}^{2.5}}`,
};

export const FIELDS: readonly GalleryPreset[] = [
  {
    id: "dipole",
    name: "Magnetic dipole",
    category: "fields",
    blurb:
      "The field of a bar magnet, and the one picture every physics textbook opens with. On alternating current: the lines keep their shape, and the field fades, reverses and returns.",
    xLatex: MAGNET_2D.x,
    yLatex: MAGNET_2D.y,
    // Released everywhere, the loops hugging the magnet too: a seed that
    // started at 1.5 left two black crescents beside it.
    seedLatex: String.raw`e^{-0.04\left(x^{2}+y^{2}\right)}`,
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
      xLatex: MAGNET_3D.x,
      yLatex: MAGNET_3D.y,
      zLatex: MAGNET_3D.z,
      // Released everywhere, thinning outward, so the loops close to the
      // centre are drawn too.
      seedLatex: String.raw`e^{-0.1${R3}}`,
      look: {
        particles: 18_000,
        speed: 0.3,
        trail: 64,
        lifetime: 5,
        opacity: 0.14,
        glow: 0.08,
        normalizeSpeed: true,
        // Not a sink: absorbing where the field is strong cut a hole round
        // the centre, where a dipole's loops are smallest.
        absorb: false,
        colorMode: "speed",
        backdrop: "#02030a",
        backdropOpacity: 1,
      },
    },
  },
];
