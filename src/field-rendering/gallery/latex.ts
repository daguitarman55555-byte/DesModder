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
