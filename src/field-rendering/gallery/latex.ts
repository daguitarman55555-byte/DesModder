/**
 * Pieces of Desmos LaTeX the presets share, written once.
 *
 * Kept in Desmos's own spelling (see the gallery's index): these strings end
 * up in front of people and in the expression list.
 */

/** x² + y², bracketed. */
export const r2 = String.raw`\left(x^{2}+y^{2}\right)`;
/** x² + y² + z², bracketed. */
export const r3 = String.raw`\left(x^{2}+y^{2}+z^{2}\right)`;
/** The distance from the z-axis, √(x² + y²). */
export const rho = String.raw`\sqrt{x^{2}+y^{2}}`;

type Axis = "x" | "y" | "z";

/** A number as the presets write it: `z-0.6` or `z+1.2`, never `z--1.2`. */
function minus(v: string, c: number) {
  return c >= 0 ? `${v}-${c}` : `${v}+${-c}`;
}

/**
 * Stars pulling the gas round them, as `−(r − c)/(|r − c|² + soft)^1.1` per
 * star — a softened gravity, slightly steeper than 1/r so streams converge —
 * with the stars at `centres` circling the z-axis together at `w` radians per
 * unit of t. Returns the field's components on the axes asked for.
 */
export function orbitingWells(
  centres: readonly (readonly [number, number, number])[],
  w: number,
  axes: readonly Axis[],
  soft: number
): Partial<Record<Axis, string>> {
  const cos = String.raw`\cos\left(${w}t\right)`;
  const sin = String.raw`\sin\left(${w}t\right)`;
  const offsets = centres.map(([x0, y0, z0]) => ({
    x: String.raw`\left(x-\left(${x0}${cos}${y0 >= 0 ? "-" : "+"}${Math.abs(y0)}${sin}\right)\right)`,
    y: String.raw`\left(y-\left(${x0}${sin}${y0 >= 0 ? "+" : "-"}${Math.abs(y0)}${cos}\right)\right)`,
    z: z0 === 0 ? "z" : String.raw`\left(${minus("z", z0)}\right)`,
  }));
  const out: Partial<Record<Axis, string>> = {};
  for (const axis of axes) {
    out[axis] = offsets
      .map((d) => {
        const r2 = axes.map((a) => `${d[a]}^{2}`).join("+");
        return String.raw`\frac{-${d[axis]}}{\left(${r2}+${soft}\right)^{1.1}}`;
      })
      .join("+");
  }
  return out;
}

/**
 * Von Kármán's vortex street: two infinite rows of point vortices, spaced
 * 2π/k along the stream and `y0` either side of it, in a stream of 1, the
 * rows drifting at 0.646 (what they induce on each other at the stable
 * spacing ratio 0.281). Each row's velocity is the closed-form sum over its
 * vortices, `half·(sinh, sin)/(cosh − cos)` with half = Γ/2a. `shift` moves
 * the vortices along the stream, which in 3D makes the tubes wave.
 */
export function vortexStreet(k: number, y0: number, half: number, shift = "") {
  const a1 = String.raw`${k}\left(y-${y0}\right)`;
  const b1 = String.raw`${k}\left(x-0.646t${shift}\right)`;
  const a2 = String.raw`${k}\left(y+${y0}\right)`;
  const b2 = String.raw`${k}\left(x-0.646t${shift}\right)-3.1416`;
  const d1 = String.raw`\cosh\left(${a1}\right)-\cos\left(${b1}\right)+0.02`;
  const d2 = String.raw`\cosh\left(${a2}\right)-\cos\left(${b2}\right)+0.02`;
  return {
    x: String.raw`1+\frac{${half}\sinh\left(${a1}\right)}{${d1}}-\frac{${half}\sinh\left(${a2}\right)}{${d2}}`,
    y: String.raw`-\frac{${half}\sin\left(${b1}\right)}{${d1}}+\frac{${half}\sin\left(${b2}\right)}{${d2}}`,
  };
}

/**
 * A thin-cored vortex ring of radius `R` round the z-axis, in the frame
 * moving with it. Each meridional cross-section is a pair of Lamb–Oseen
 * vortices of core radius `a` at ρ = ±R — the thin-core approximation, whose
 * error is of order a/R — so the smoke swirls round a crisp core, and the
 * ambient air streams past at the ring's own speed, Kelvin's
 * U = Γ/(4πR)·(ln(8R/a) − 1/4), with k = Γ/2π. `pulse` multiplies the whole
 * flow. Returns the Cartesian components.
 */
export function thinVortexRing(R: number, a: number, k: number, pulse = "") {
  const rho = String.raw`\sqrt{x^{2}+y^{2}+0.0001}`;
  const d1 = String.raw`\left(\left(${rho}-${R}\right)^{2}+z^{2}\right)`;
  const d2 = String.raw`\left(\left(${rho}+${R}\right)^{2}+z^{2}\right)`;
  const core = (d: string) =>
    String.raw`\frac{1-e^{-\frac{${d}}{${a * a}}}}{${d}}`;
  const f1 = core(d1);
  const f2 = core(d2);
  const U =
    Math.round((k / (2 * R)) * (Math.log((8 * R) / a) - 0.25) * 1000) / 1000;
  const radial = (c: "x" | "y") =>
    String.raw`${pulse}\frac{${k}${c}z\left(${f1}-${f2}\right)}{${rho}}`;
  return {
    x: radial("x"),
    y: radial("y"),
    z: String.raw`${pulse}\left(-${k}\left(${rho}-${R}\right)${f1}+${k}\left(${rho}+${R}\right)${f2}-${U}\right)`,
  };
}

/**
 * A magnetic dipole of moment `m` (LaTeX for its components, which may read
 * t), B = (3(m·r)r − m r²)/r⁵, with the field zero inside the star or magnet
 * of radius `inside`, where field lines end. With `outflow`, particles move
 * along B away from the magnetic equator on both sides — B·tanh(3 m·r̂) — the
 * way a pulsar's wind leaves both poles along its open field lines and meets
 * at the current sheet, rather than in at one pole and out at the other.
 */
export function dipole(
  m: readonly string[],
  axes: readonly ("x" | "y" | "z")[],
  inside: number,
  outflow: boolean
) {
  const r2 = axes.map((a) => `${a}^{2}`).join("+");
  const dot = axes
    .map((a, i) => (m[i] === "0" ? "" : `${m[i]}${a}`))
    .filter((t) => t !== "")
    .join("+")
    .replace(/\+-/g, "-");
  const s = String.raw`\left(${dot}\right)`;
  const wind = outflow
    ? String.raw`\tanh\left(\frac{3${s}}{\sqrt{${r2}}}\right)`
    : "";
  const out: Partial<Record<"x" | "y" | "z", string>> = {};
  axes.forEach((a, i) => {
    const mi = m[i] === "0" ? "" : String.raw`-${m[i]}\left(${r2}\right)`;
    out[a] =
      String.raw`\left\{${r2}>${inside * inside}:\frac{\left(3${a}${s}${mi}\right)${wind}}{\left(${r2}\right)^{2.5}},0\right\}`.replace(
        /--/g,
        "+"
      );
  });
  return out;
}
