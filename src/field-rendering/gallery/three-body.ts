/**
 * Three bodies under their mutual gravity, worked out once on the CPU, crashes
 * included, and handed to Desmos and the shader as the samples of a recording.
 *
 * Desmos cannot integrate an orbit at sixty frames a second, and the shader
 * cannot either (see orbits.ts for what writing the motion as a formula in t
 * cost). So the run is integrated here, sampled every `dt` of its own time,
 * and played back: Desmos reads the samples as lists, which it indexes for
 * nothing, and the field reads the same samples, interpolated, as clock
 * parameters.
 *
 * A crash is a perfectly inelastic merger. Two bodies whose spheres touch
 * become one, with their summed mass at their centre of mass, moving with
 * their total momentum: momentum is conserved exactly, and the kinetic energy
 * the merger loses is what a real collision turns into heat. The spheres are
 * of one density, so a body's radius goes as the cube root of its mass.
 */
import { num, toggle, variable } from "./kit";
import type { GalleryVariable, SceneItem } from "./types";

/** G = 1; masses, lengths and times in the units the presets choose. */
export interface ThreeBodyStart {
  masses: readonly number[];
  x: readonly number[];
  y: readonly number[];
  vx: readonly number[];
  vy: readonly number[];
  /** The radius of a body of mass 1. Zero for point masses, which never crash. */
  radius: number;
  /** How long to integrate, in the run's own time. */
  duration: number;
  /** Time between samples. */
  dt: number;
}

export interface Crash {
  /** The run's time at contact. */
  tau: number;
  /** The sample the merged body is first seen in. */
  sample: number;
  x: number;
  y: number;
  /** The body that carries on, and the one it swallowed. */
  into: number;
  absorbed: number;
}

export interface ThreeBodyRun {
  dt: number;
  /** Samples per body, the first at time 0 and the last at `duration`. */
  samples: number;
  x: Float64Array[];
  y: Float64Array[];
  vx: Float64Array[];
  vy: Float64Array[];
  /** Each body's mass at each sample: 0 once it has been swallowed. */
  mass: Float64Array[];
  crashes: Crash[];
}

/**
 * The run, by RK4 with a step chosen from the closest pair: a fiftieth of
 * that pair's free-fall time, r^1.5/√(G(m₁+m₂)), so a close pass is taken in
 * as many steps as a slow arc, and capped to land on every sample. A crash is
 * checked after every step, where the contact is found to within the step's
 * travel.
 */
export function integrateThreeBody(o: ThreeBodyStart): ThreeBodyRun {
  const n = o.masses.length;
  const m = [...o.masses];
  const s = [...o.x, ...o.y, ...o.vx, ...o.vy];
  const alive = m.map(() => true);
  const samples = Math.round(o.duration / o.dt) + 1;
  const track = () =>
    Array.from({ length: n }, () => new Float64Array(samples));
  const run: ThreeBodyRun = {
    dt: o.dt,
    samples,
    x: track(),
    y: track(),
    vx: track(),
    vy: track(),
    mass: track(),
    crashes: [],
  };
  const radius = (i: number) => o.radius * Math.cbrt(m[i]);
  const derivative = (q: readonly number[]) => {
    const d = new Array<number>(4 * n).fill(0);
    for (let i = 0; i < n; i++) {
      d[i] = q[2 * n + i];
      d[n + i] = q[3 * n + i];
      if (!alive[i]) continue;
      for (let j = 0; j < n; j++) {
        if (i === j || !alive[j]) continue;
        const dx = q[j] - q[i];
        const dy = q[n + j] - q[n + i];
        const r2 = dx * dx + dy * dy;
        const f = m[j] / (r2 * Math.sqrt(r2));
        d[2 * n + i] += f * dx;
        d[3 * n + i] += f * dy;
      }
    }
    return d;
  };
  const pairs = () => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (alive[i] && alive[j])
          out.push([i, j, Math.hypot(s[j] - s[i], s[n + j] - s[n + i])]);
    return out;
  };
  const record = (k: number) => {
    for (let i = 0; i < n; i++) {
      run.x[i][k] = s[i];
      run.y[i][k] = s[n + i];
      run.vx[i][k] = s[2 * n + i];
      run.vy[i][k] = s[3 * n + i];
      run.mass[i][k] = alive[i] ? m[i] : 0;
    }
  };
  let tau = 0;
  record(0);
  for (let k = 1; k < samples; k++) {
    const end = k * o.dt;
    while (end - tau > 1e-12) {
      let h = end - tau;
      for (const [i, j, r] of pairs())
        h = Math.min(h, (0.02 * r ** 1.5) / Math.sqrt(m[i] + m[j]));
      h = Math.max(h, 1e-7);
      const k1 = derivative(s);
      const k2 = derivative(s.map((v, i) => v + (h / 2) * k1[i]));
      const k3 = derivative(s.map((v, i) => v + (h / 2) * k2[i]));
      const k4 = derivative(s.map((v, i) => v + h * k3[i]));
      for (let i = 0; i < s.length; i++)
        s[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      tau += h;
      for (const [i, j, r] of pairs()) {
        if (o.radius === 0 || r > radius(i) + radius(j)) continue;
        // The heavier carries on, so a body's colour follows the most matter.
        const [a, b] = m[i] >= m[j] ? [i, j] : [j, i];
        const M = m[a] + m[b];
        for (const offset of [0, n, 2 * n, 3 * n])
          s[offset + a] = (m[a] * s[offset + a] + m[b] * s[offset + b]) / M;
        m[a] = M;
        alive[b] = false;
        run.crashes.push({
          tau,
          sample: k,
          x: s[a],
          y: s[n + a],
          into: a,
          absorbed: b,
        });
      }
      // A swallowed body rides inside the one that swallowed it, so its
      // trail runs into the merged body's instead of stopping in space.
      for (let i = 0; i < n; i++) {
        const host = survivor(run.crashes, i);
        if (host !== i)
          for (const offset of [0, n, 2 * n, 3 * n])
            s[offset + i] = s[offset + host];
      }
    }
    record(k);
  }
  return run;
}

/** The body that has ended up with body i's matter, through every crash. */
function survivor(crashes: readonly Crash[], i: number) {
  let host = i;
  for (const crash of crashes) if (crash.absorbed === host) host = crash.into;
  return host;
}

/**
 * A run recorded from a motion known in closed form, `state(τ)`, over one
 * `period`: the figure eight, which then plays back through the same scene.
 */
export function recordMotion(
  state: (tau: number) => {
    x: readonly number[];
    y: readonly number[];
    vx: readonly number[];
    vy: readonly number[];
  },
  period: number,
  intervals: number
): ThreeBodyRun {
  const n = state(0).x.length;
  const samples = intervals + 1;
  const track = () =>
    Array.from({ length: n }, () => new Float64Array(samples));
  const run: ThreeBodyRun = {
    dt: period / intervals,
    samples,
    x: track(),
    y: track(),
    vx: track(),
    vy: track(),
    mass: track(),
    crashes: [],
  };
  for (let k = 0; k < samples; k++) {
    const s = state(k * run.dt);
    for (let i = 0; i < n; i++) {
      run.x[i][k] = s.x[i];
      run.y[i][k] = s.y[i];
      run.vx[i][k] = s.vx[i];
      run.vy[i][k] = s.vy[i];
      run.mass[i][k] = 1;
    }
  }
  return run;
}

/** The run's total energy and momentum at a sample, for the tests. */
export function runInvariants(run: ThreeBodyRun, k: number) {
  const n = run.x.length;
  let kinetic = 0;
  let potential = 0;
  let px = 0;
  let py = 0;
  for (let i = 0; i < n; i++) {
    const m = run.mass[i][k];
    kinetic += (m * (run.vx[i][k] ** 2 + run.vy[i][k] ** 2)) / 2;
    px += m * run.vx[i][k];
    py += m * run.vy[i][k];
    for (let j = i + 1; j < n; j++) {
      const r = Math.hypot(
        run.x[j][k] - run.x[i][k],
        run.y[j][k] - run.y[i][k]
      );
      if (run.mass[j][k] > 0 && m > 0) potential -= (m * run.mass[j][k]) / r;
    }
  }
  return { energy: kinetic + potential, px, py };
}

/**
 * Where every body is at the run's time `tau`, between samples by cubic
 * Hermite from each sample's position and velocity, so the field's bodies
 * move as fast as their positions change. Past the end, the run starts over.
 */
export function stateAt(run: ThreeBodyRun, tau: number) {
  const length = (run.samples - 1) * run.dt;
  const f = ((((tau % length) + length) % length) / run.dt) % (run.samples - 1);
  const k0 = Math.floor(f);
  const k1 = k0 + 1;
  const a = f - k0;
  const h = run.dt;
  const hermite = (p: Float64Array, v: Float64Array) => {
    const [p0, p1, m0, m1] = [p[k0], p[k1], v[k0] * h, v[k1] * h];
    const a2 = a * a;
    const a3 = a2 * a;
    return {
      at:
        (2 * a3 - 3 * a2 + 1) * p0 +
        (a3 - 2 * a2 + a) * m0 +
        (-2 * a3 + 3 * a2) * p1 +
        (a3 - a2) * m1,
      rate:
        ((6 * a2 - 6 * a) * p0 +
          (3 * a2 - 4 * a + 1) * m0 +
          (-6 * a2 + 6 * a) * p1 +
          (3 * a2 - 2 * a) * m1) /
        h,
    };
  };
  const out = {
    x: [] as number[],
    y: [] as number[],
    vx: [] as number[],
    vy: [] as number[],
  };
  for (let i = 0; i < run.x.length; i++) {
    const x = hermite(run.x[i], run.vx[i]);
    const y = hermite(run.y[i], run.vy[i]);
    out.x.push(x.at);
    out.y.push(y.at);
    out.vx.push(x.rate);
    out.vy.push(y.rate);
  }
  return out;
}

/** A coordinate as the lists write it: to a thousandth, never `-0`. */
function d3(v: number) {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

export interface Playback {
  /** Graph units per unit of the run's length. */
  scale: number;
  /** The run's time per second of the clock. */
  rate: number;
  /** Each body's colour, and the colour of what a crash leaves. */
  colors: readonly string[];
  /** How much of the past a trail shows, in the run's time. */
  trail: number;
  /** Whether the whole of each path is drawn when the preset loads. */
  paths: 0 | 1;
}

/**
 * The run as Desmos objects: each body a point the size its mass gives it,
 * a trail behind it, its whole path (behind a switch), and a ring that
 * spreads from every crash. The samples are lists Desmos indexes at the
 * scene clock's sample, `i_{b}`, and interpolates between, `f_{b}`; nothing
 * is integrated in the graph, so nothing in it costs more as the run goes on.
 */
export function playbackScene(
  run: ThreeBodyRun,
  o: Playback
): { variables: GalleryVariable[]; scene: SceneItem[] } {
  const R = String.raw;
  const n = run.x.length;
  const length = num((run.samples - 1) * run.dt);
  const T = Math.round(o.trail / run.dt);
  const body = (i: number) => `b${i + 1}`;
  const X = (i: number) => `X_{${body(i)}}`;
  const Y = (i: number) => `Y_{${body(i)}}`;
  const list = (values: Float64Array) =>
    R`\left[${Array.from(values, (v) => d3(v * o.scale)).join(",")}\right]`;
  const helper = (key: string, latex: string): SceneItem => ({
    key,
    latex,
    hidden: true,
  });
  const at = (L: string, k: string) => R`${L}\left[${k}\right]`;
  const lerp = (L: string) =>
    R`${at(L, "i_{b}")}+f_{b}\left(${at(L, "i_{b}+1")}-${at(L, "i_{b}")}\right)`;
  const scene: SceneItem[] = [
    helper(
      "tau",
      R`\tau_{b}=\operatorname{mod}\left(${o.rate === 1 ? "" : num(o.rate)}T_{scene},${length}\right)`
    ),
    helper("k", R`k_{b}=\frac{\tau_{b}}{${num(run.dt)}}`),
    helper("i", R`i_{b}=\operatorname{floor}\left(k_{b}\right)+1`),
    helper("f", R`f_{b}=k_{b}-i_{b}+1`),
  ];
  const swallowed = (i: number) => run.crashes.find((c) => c.absorbed === i);
  for (let i = 0; i < n; i++) {
    scene.push(
      helper(`x${i + 1}`, R`${X(i)}=${list(run.x[i])}`),
      helper(`y${i + 1}`, R`${Y(i)}=${list(run.y[i])}`),
      helper(
        `p${i + 1}`,
        R`P_{${body(i)}}=\left(${lerp(X(i))},${lerp(Y(i))}\right)`
      )
    );
  }
  for (let i = 0; i < n; i++) {
    const end = swallowed(i)?.sample;
    const color = o.colors[i];
    // Its trail, ending where it was swallowed; a range a...b with a > b
    // counts down in Desmos, so the trail is cut once it has run past.
    const last = end === undefined ? "i_{b}" : R`\min\left(i_{b},${end}\right)`;
    const range = R`\left[\max\left(1,i_{b}-${T}\right)...${last}\right]`;
    scene.push({
      key: `trail${i + 1}`,
      latex:
        R`\left(${X(i)}${range},${Y(i)}${range}\right)\left\{s_{trail}=1\right\}` +
        (end === undefined ? "" : R`\left\{i_{b}-${T}<${end}\right\}`),
      color,
      lines: true,
      points: false,
      lineWidth: 2.5,
      lineOpacity: 0.8,
    });
    const whole = end === undefined ? "" : R`\left[1...${end}\right]`;
    scene.push({
      key: `path${i + 1}`,
      latex: R`\left(${X(i)}${whole},${Y(i)}${whole}\right)\left\{s_{path}=1\right\}`,
      color,
      lines: true,
      points: false,
      lineWidth: 1.5,
      lineOpacity: 0.35,
      explains: true,
    });
    // The body, once for each mass it has: a crash it survives makes it
    // bigger from the sample the merger is first seen in.
    const grows = run.crashes.filter((c) => c.into === i).map((c) => c.sample);
    const bounds = [0, ...grows, end ?? run.samples];
    for (let s = 0; s + 1 < bounds.length; s++) {
      const [from, to] = [bounds[s], bounds[s + 1]];
      const mass = run.mass[i][Math.min(from, run.samples - 1)];
      const when =
        from === 0 && to === run.samples
          ? ""
          : R`\left\{${from}<i_{b}\le${to}\right\}`;
      scene.push({
        key: `body${i + 1}${s === 0 ? "" : `m${s}`}`,
        latex: `P_{${body(i)}}${when}`,
        color,
        points: true,
        pointSize: Math.round(12 * Math.cbrt(mass)),
      });
    }
  }
  const plus = (c: string, term: string) => (c === "0" ? term : `${c}+${term}`);
  run.crashes.forEach((c, j) => {
    const since = R`\left(\tau_{b}-${num(c.tau)}\right)`;
    const [cx, cy] = [d3(c.x * o.scale), d3(c.y * o.scale)];
    const rho = R`\left(0.3+3${since}\right)`;
    scene.push(
      {
        key: `crash${j + 1}`,
        latex: R`\left(${plus(cx, R`${rho}\cos\left(t\right)`)},${plus(cy, R`${rho}\sin\left(t\right)`)}\right)\left\{0<${since}<1.2\right\}`,
        domain: ["0", R`2\pi`],
        color: o.colors[n],
        lineWidth: 3,
        lineOpacity: R`1-\frac{${since}}{1.2}`,
      },
      {
        key: `crashLabel${j + 1}`,
        latex: R`\left(${cx},${d3(c.y * o.scale + 0.7)}\right)\left\{0<${since}<1\right\}`,
        label: "Crash",
        points: true,
        pointSize: 1,
        color: o.colors[n],
        explains: true,
      }
    );
  });
  return {
    variables: [
      variable("T_{scene}", 0, 0, 1000, 0.01),
      toggle("s_{trail}", 1, "Trails"),
      toggle("s_{path}", o.paths, "Whole paths"),
    ],
    scene,
  };
}

/**
 * The crash a run's time is just past, for the field: where it was, and how
 * bright its flash still is, fading over half a unit of the run's time.
 */
export function flashAt(run: ThreeBodyRun, tau: number) {
  const length = (run.samples - 1) * run.dt;
  const now = ((tau % length) + length) % length;
  let flash = { x: 0, y: 0, brightness: 0 };
  for (const c of run.crashes)
    if (now >= c.tau)
      flash = { x: c.x, y: c.y, brightness: Math.exp(-(now - c.tau) / 0.5) };
  return flash;
}
