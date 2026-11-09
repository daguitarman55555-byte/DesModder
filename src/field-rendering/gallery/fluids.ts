/** Fluids: vortices, wakes and storms. */
import type { GalleryPreset } from "./types";

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

/**
 * A rotating superfluid's vortex lattice, on the plane: what "vortex
 * lattice" means in a spun Bose–Einstein condensate or superfluid helium.
 * The fluid cannot rotate as a whole, so it threads itself with identical
 * quantised vortices that pack into a triangular (Abrikosov) lattice, and the
 * lattice turns rigidly, carrying the fluid round as if it were solid. Seen
 * in rotating condensates by Abo-Shaeer, Raman, Vogels and Ketterle (2001).
 *
 * Here 37 vortices, rings 0 to 3 of a triangular lattice of spacing 2.2,
 * each a Lamb–Oseen vortex (circulation 2π·0.8, core radius 0.35), the
 * lattice turning at Ω = 0.08 rad/s. Rafael found the Taylor–Green cells
 * it replaces a flat checkerboard (2026-11-08: "cooler, more realistic").
 */
const LATTICE_SPACING = 2.2;
const LATTICE_OMEGA = 0.08;
const LATTICE_SITES = (() => {
  const sites: [number, number][] = [];
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      const k = -i - j;
      if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) > 3) continue;
      sites.push([
        LATTICE_SPACING * (i + j / 2),
        LATTICE_SPACING * ((Math.sqrt(3) / 2) * j),
      ]);
    }
  return sites;
})();

function latticeFlow() {
  const R = String.raw;
  const cos = R`\cos\left(${LATTICE_OMEGA}t\right)`;
  const sin = R`\sin\left(${LATTICE_OMEGA}t\right)`;
  const n = (v: number) => String(Math.round(v * 1000) / 1000);
  // a·c + b·s, as Desmos would write it: no zero terms, no "+-".
  const combine = (terms: [number, string][]) => {
    const kept = terms.filter(([k]) => Math.abs(k) > 1e-9);
    if (kept.length === 0) return "";
    return kept
      .map(
        ([k, f], i) =>
          `${k < 0 ? "-" : i === 0 ? "" : "+"}${n(Math.abs(k))}${f}`
      )
      .join("");
  };
  // Each vortex's offset from (x, y), its site turned by Ωt.
  const offsets = LATTICE_SITES.map(([a, b]) => {
    const px = combine([
      [a, cos],
      [-b, sin],
    ]);
    const py = combine([
      [a, sin],
      [b, cos],
    ]);
    const minus = (axis: string, p: string) =>
      p === "" ? axis : R`\left(${axis}-\left(${p}\right)\right)`;
    return [minus("x", px), minus("y", py)];
  });
  const r2 = (d: string[]) => R`${d[0]}^{2}+${d[1]}^{2}`;
  // Lamb–Oseen: Γ/2π · (1 − e^(−r²/rc²))/r² times the perpendicular.
  const term = (d: string[], along: string) =>
    R`\frac{0.8${along}\left(1-e^{-\frac{${r2(d)}}{0.1225}}\right)}{${r2(d)}+0.0001}`;
  const x = offsets.map((d) => term(d, R`\left(-${d[1]}\right)`)).join("+");
  const y = offsets.map((d) => term(d, d[0])).join("+");
  // Each core glowing: the vorticity, which a Lamb–Oseen vortex keeps in a
  // Gaussian, less a constant so the space between reads as the ramp's
  // other end.
  const tint =
    offsets.map((d) => R`e^{-\frac{${r2(d)}}{0.1225}}`).join("+") + "-0.15";
  return { x, y, tint };
}
const LATTICE = latticeFlow();

export const FLUIDS: readonly GalleryPreset[] = [
  {
    id: "cellular",
    name: "Vortex lattice",
    category: "fluids",
    blurb:
      "A rotating superfluid's vortex lattice: spun, a superfluid cannot turn as a whole, so it fills with identical quantised vortices that pack into a triangular lattice, which turns rigidly and carries the fluid round with it. Seen in rotating Bose–Einstein condensates (Ketterle's group, 2001). Each glowing core is one vortex.",
    xLatex: LATTICE.x,
    yLatex: LATTICE.y,
    colorScale: 0.8,
    // Coloured by vorticity: bright in each vortex's core, where a
    // Lamb–Oseen vortex keeps it, dark in the fluid between, which flows
    // without spinning.
    palette: "charge-glow",
    tint: {
      latex: LATTICE.tint,
      // The box keeps the Taylor–Green cells: tubes through the depth.
      latex3d: String.raw`2\sin\left(x-0.5t\right)\sin\left(y\right)`,
      scale: 0.5,
    },
    backdrop: "#02060a",
    flow: {
      particleCount: 45_000,
      glow: 0.45,
      opacity: 0.4,
      pointSize: 1.3,
      normalizeSpeed: false,
      speed: 2,
      trailPersistence: 0.975,
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
];
