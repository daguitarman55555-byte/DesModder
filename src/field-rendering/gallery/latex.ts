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

const TAU = 2 * Math.PI;

/** sin(k(wt + φ)), or cos, with its phase brought into [0, 2π). */
function sinTurn(k: number, w: number, phase: number, trig = "sin") {
  const p = (((k * phase) % TAU) + TAU) % TAU;
  return (
    `\\${trig}` +
    String.raw`\left(${sum([
      [k * w, "t"],
      [p, ""],
    ])}\right)`
  );
}

/** How fast body `i` moves along the figure eight: its position's derivative. */
export function figureEightVelocity(i: number, w: number, size: number) {
  const phase = (TAU * i) / 3;
  return {
    x: sum([
      [-1.1008 * size * w, sinTurn(1, w, phase, "cos")],
      [5 * 0.0254 * size * w, sinTurn(5, w, phase, "cos")],
    ]),
    y: sum([
      [-2 * 0.3388 * size * w, sinTurn(2, w, phase, "cos")],
      [-4 * 0.056 * size * w, sinTurn(4, w, phase, "cos")],
    ]),
  };
}

/**
 * Where body `i` of three is on the figure-eight orbit, at `w` radians of the
 * orbit per unit of t, scaled by `size`: Chenciner and Montgomery's stable
 * three-body orbit (2000), three equal masses chasing each other round one
 * figure eight, a third of a period apart.
 *
 * Its Fourier series, fitted to the orbit integrated from Simó's initial
 * conditions (it closes to 4×10⁻⁸ after one period): x is odd harmonics, y
 * even, and four terms put every body within 1% of the orbit's width of
 * where it really is.
 */
export function figureEightBody(i: number, w: number, size: number) {
  const phase = (TAU * i) / 3;
  return {
    x: sum([
      [-1.1008 * size, sinTurn(1, w, phase)],
      [0.0254 * size, sinTurn(5, w, phase)],
    ]),
    y: sum([
      [-0.3388 * size, sinTurn(2, w, phase)],
      [-0.056 * size, sinTurn(4, w, phase)],
    ]),
  };
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
 * Bodies pulling the gas round them, wherever their positions put them (the
 * positions may read t): each pulls as `−pull·d/(|d|² + soft)^1.1`, a
 * softened gravity a little steeper than 1/r so streams converge, and turns
 * it round `normal` (in the plane, anticlockwise) as `swirl·n×d/(|d|² +
 * soft)`, so it falls in on a spiral, as gas does onto a star.
 */
export function wells(
  centres: readonly Partial<Record<Axis, string>>[],
  axes: readonly Axis[],
  o: { soft: number; pull: number; swirl: number; normal?: Vec3 }
): Partial<Record<Axis, string>> {
  const normal = o.normal ?? [0, 0, 1];
  const out: Partial<Record<Axis, string>> = {};
  for (const axis of axes) {
    out[axis] = centres
      .map((c) => {
        const d = {
          x: offset("x", c.x),
          y: offset("y", c.y),
          z: offset("z", c.z),
        };
        const r2 = axes.map((a) => `${d[a]}^{2}`).join("+");
        const turn = cross(normal, d)[axis];
        const fall = String.raw`\frac{${sum([[-o.pull, d[axis]]])}}{\left(${r2}+${o.soft}\right)^{1.1}}`;
        return turn === "0" || o.swirl === 0
          ? fall
          : String.raw`${fall}+\frac{${num(o.swirl)}\left(${turn}\right)}{${r2}+${o.soft}}`;
      })
      .join("+")
      .replace(/\+-/g, "-");
  }
  return out;
}

/**
 * Two bodies on Kepler orbits round their common centre of mass: semi-major
 * axis `a` of their separation, eccentricity `e`, mean motion `n` radians
 * per unit of t, the second body `ratio` times the first's mass. The orbit
 * lies in the plane tilted `tilt` radians about the x-axis.
 *
 * Where a body is on an ellipse at a given time is Kepler's equation, which
 * has no closed form; the true anomaly's series in e to e⁴ (the equation of
 * the centre) is within 0.02 rad at e = 0.35. Velocities are the exact
 * ones at that anomaly, v = na/√(1 − e²)·(−sin θ, e + cos θ).
 */
export function keplerPair(o: {
  a: number;
  e: number;
  n: number;
  ratio: number;
  tilt: number;
}) {
  const { a, e, n } = o;
  const M = (k: number) => String.raw`\sin\left(${sum([[k * n, "t"]])}\right)`;
  const theta = sum([
    [n, "t"],
    [2 * e - e ** 3 / 4, M(1)],
    [(5 / 4) * e ** 2 - (11 / 24) * e ** 4, M(2)],
    [(13 / 12) * e ** 3, M(3)],
    [(103 / 96) * e ** 4, M(4)],
  ]);
  const cos = String.raw`\cos\left(${theta}\right)`;
  const sin = String.raw`\sin\left(${theta}\right)`;
  const p = a * (1 - e * e);
  const K = (n * a) / Math.sqrt(1 - e * e);
  const ci = Math.cos(o.tilt);
  const si = Math.sin(o.tilt);
  // Each body's share of the separation: the lighter one moves further.
  const shares = [-o.ratio / (1 + o.ratio), 1 / (1 + o.ratio)];
  return shares.map((f) => {
    const radial = (c: number, trig: string) =>
      String.raw`\frac{${sum([[c * f * p, trig]])}}{1+${num(e)}${cos}}`;
    return {
      position: {
        x: radial(1, cos),
        y: radial(ci, sin),
        z: radial(si, sin),
      },
      velocity: {
        x: sum([[-f * K, sin]]),
        y: sum([
          [f * K * ci * e, ""],
          [f * K * ci, cos],
        ]),
        z: sum([
          [f * K * si * e, ""],
          [f * K * si, cos],
        ]),
      },
    };
  });
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
