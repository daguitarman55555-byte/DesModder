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
 * t), B = (3(m·r)r − m r²)/r⁵ outside radius `inside`. Within it, `interior`
 * says what the body is: "empty" — a star the field lines end on, nothing
 * drawn inside — or "magnet", a uniformly magnetised sphere, whose field
 * inside is the uniform 2m/R³ that meets the outside one at its poles, so
 * the lines run straight through it from south to north. With `outflow`,
 * particles move along B away from the magnetic equator on both sides —
 * B·tanh(3 m·r̂) — the way a pulsar's wind leaves both poles along its open
 * field lines and meets at the current sheet.
 */
export function dipole(
  m: readonly string[],
  axes: readonly ("x" | "y" | "z")[],
  inside: number,
  outflow: boolean,
  interior: "empty" | "magnet" = "empty"
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
  const R3 = Math.round(inside ** 3 * 1e4) / 1e4;
  axes.forEach((a, i) => {
    const mi = m[i] === "0" ? "" : String.raw`-${m[i]}\left(${r2}\right)`;
    const within =
      interior === "magnet" && m[i] !== "0"
        ? String.raw`\frac{2${m[i]}}{${R3}}`
        : "0";
    out[a] =
      String.raw`\left\{${r2}>${inside * inside}:\frac{\left(3${a}${s}${mi}\right)${wind}}{\left(${r2}\right)^{2.5}},${within}\right\}`.replace(
        /--/g,
        "+"
      );
  });
  return out;
}

/** A number as the presets write it: at most four decimals. */
export function num(v: number) {
  const r = Math.round(v * 1e4) / 1e4;
  return Object.is(r, -0) ? "0" : String(r);
}

/**
 * A sum of terms, each a coefficient and a LaTeX factor, written with its
 * signs: `[[2, "x"], [-1, "y"]]` is `2x-y`. Terms that round to nothing are
 * left out; nothing at all is `0`.
 */
export function sum(terms: readonly (readonly [number, string])[]) {
  let out = "";
  for (const [c, factor] of terms) {
    const r = Math.round(c * 1e4) / 1e4;
    if (r === 0) continue;
    const size = Math.abs(r) === 1 && factor !== "" ? "" : num(Math.abs(r));
    out += (r < 0 ? "-" : out === "" ? "" : "+") + size + factor;
  }
  return out === "" ? "0" : out;
}

type Vec3 = readonly [number, number, number];

/** a − (c), bracketed; just a where c is nothing. */
function offset(a: Axis, c: string | undefined) {
  return c === undefined || c === "0"
    ? a
    : String.raw`\left(${a}-\left(${c}\right)\right)`;
}

/**
 * The offset from a point that may move, per axis, and its squared length
 * over `axes`: what a seed round a moving body is written in.
 */
export function separation(
  c: Partial<Record<Axis, string>>,
  axes: readonly Axis[]
) {
  const d = { x: offset("x", c.x), y: offset("y", c.y), z: offset("z", c.z) };
  return { d, r2: axes.map((a) => `${d[a]}^{2}`).join("+") };
}

/** n × d, by components, for d given as LaTeX per axis. */
function cross(n: Vec3, d: Record<Axis, string>): Record<Axis, string> {
  return {
    x: sum([
      [n[1], d.z],
      [-n[2], d.y],
    ]),
    y: sum([
      [n[2], d.x],
      [-n[0], d.z],
    ]),
    z: sum([
      [n[0], d.y],
      [-n[1], d.x],
    ]),
  };
}

/**
 * Worlds carried along by their orbits: round each, within a plateau of
 * radius `reach`, the flow is the body's own velocity, plus material
 * circling it at Kepler's speed, ∝ 1/√d, about the orbit's normal, and a
 * slight pull that keeps it bound. Outside every plateau, each body's
 * gravity, `gravity`/d^2.2 towards it (softened, as in `wells`), so with
 * matter everywhere the gas round the bodies is seen falling in.
 */
export function carriedWorlds(
  bodies: readonly {
    position: Partial<Record<Axis, string>>;
    velocity: Partial<Record<Axis, string>>;
    reach: number;
    swirl: number;
  }[],
  axes: readonly Axis[],
  normal: Vec3,
  gravity = 0
): Partial<Record<Axis, string>> {
  const out: Partial<Record<Axis, string>> = {};
  for (const axis of axes) {
    out[axis] = bodies
      .map((b) => {
        const d = {
          x: offset("x", b.position.x),
          y: offset("y", b.position.y),
          z: offset("z", b.position.z),
        };
        const r2 = axes.map((ax) => `${d[ax]}^{2}`).join("+");
        const turn =
          axes.length === 2
            ? { x: sum([[-1, d.y]]), y: d.x, z: "0" }[axis]
            : cross(normal, d)[axis];
        const c = 1 / b.reach ** 6;
        const plateau = num(c);
        // Gravity outside the plateau: weighted by 1 − 1/(1 + c r⁶).
        const fall =
          gravity === 0
            ? ""
            : String.raw`-\frac{${num(gravity * c)}\left(${r2}\right)^{3}${d[axis]}}{\left(1+${plateau}\left(${r2}\right)^{3}\right)\left(${r2}+0.3\right)^{1.1}}`;
        const carried = String.raw`\frac{${b.velocity[axis] ?? "0"}+\frac{${num(b.swirl)}\left(${turn}\right)}{\left(${r2}+0.05\right)^{0.75}}-0.15${d[axis]}}{1+${plateau}\left(${r2}\right)^{3}}`;
        return fall === "" ? carried : `${carried}${fall}`;
      })
      .join("+")
      .replace(/\+-/g, "-");
  }
  return out;
}
