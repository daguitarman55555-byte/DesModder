/**
 * Orbits worked out on the CPU, once a frame, for presets whose bodies move
 * with the clock: where each body is and how fast it is going, handed to the
 * shader as numbers (see `ClockParameters`).
 *
 * The field used to carry these as formulas in t — a Fourier series for the
 * figure eight, a series for Kepler's equation — and every particle
 * re-evaluated every body's position in every term of every component, four
 * times a step. The three-body field came to 7,500 characters of GLSL a
 * component; the driver took twelve seconds to compile it and then stalled
 * the GPU, which drew no frames at all. Here each body is worked out once a
 * frame, exactly, and the shader sees a field of a few moving points.
 */

const TAU = 2 * Math.PI;

/** Positions and velocities of bodies in the plane, at one instant. */
export interface PlanarState {
  x: number[];
  y: number[];
  vx: number[];
  vy: number[];
}

/**
 * The figure-eight orbit of three equal masses (Chenciner and Montgomery,
 * 2000), G = m = 1, from Simó's initial conditions, integrated once with
 * RK4 over one period and sampled; the orbit closes to about 1e−8. Every
 * body follows the same curve, a third of a period behind the next.
 */
const EIGHT_PERIOD = 6.32591398;
const EIGHT_SAMPLES = 4096;
let eightTable: Float64Array | undefined;

function eightOrbit() {
  if (eightTable !== undefined) return eightTable;
  // State: x1 y1 x2 y2 x3 y3, then their velocities.
  const s = [
    0.97000436, -0.24308753, -0.97000436, 0.24308753, 0, 0, 0.466203685,
    0.43236573, 0.466203685, 0.43236573, -0.93240737, -0.86473146,
  ];
  const deriv = (q: number[]) => {
    const d = new Array<number>(12).fill(0);
    for (let i = 0; i < 3; i++) {
      d[2 * i] = q[6 + 2 * i];
      d[2 * i + 1] = q[7 + 2 * i];
      for (let j = 0; j < 3; j++) {
        if (i === j) continue;
        const dx = q[2 * j] - q[2 * i];
        const dy = q[2 * j + 1] - q[2 * i + 1];
        const r3 = (dx * dx + dy * dy) ** 1.5;
        d[6 + 2 * i] += dx / r3;
        d[7 + 2 * i] += dy / r3;
      }
    }
    return d;
  };
  const sub = 8;
  const h = EIGHT_PERIOD / EIGHT_SAMPLES / sub;
  // Body 3's track over one period: the curve all three share.
  const table = new Float64Array(EIGHT_SAMPLES * 4);
  let q = s;
  for (let k = 0; k < EIGHT_SAMPLES; k++) {
    table.set([q[4], q[5], q[10], q[11]], k * 4);
    for (let m = 0; m < sub; m++) {
      const k1 = deriv(q);
      const k2 = deriv(q.map((v, i) => v + (h / 2) * k1[i]));
      const k3 = deriv(q.map((v, i) => v + (h / 2) * k2[i]));
      const k4 = deriv(q.map((v, i) => v + h * k3[i]));
      q = q.map(
        (v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
      );
    }
  }
  eightTable = table;
  return table;
}

/**
 * Where the three bodies of the figure eight are at time t, and how fast
 * they move: `w` orbits per unit of t × 2π (angular rate of the orbit's
 * phase), `size` the scale of the curve. Interpolated linearly between 4,096
 * samples; at the presets' sizes that is within a thousandth of a unit.
 */
export function figureEight(t: number, w: number, size: number): PlanarState {
  const table = eightOrbit();
  const out: PlanarState = { x: [], y: [], vx: [], vy: [] };
  // Time on the orbit, in its own units, where one period is EIGHT_PERIOD.
  const tau = ((w * t) / TAU) * EIGHT_PERIOD;
  // Velocities scale by the curve's size and how fast it is run.
  const speed = size * (w / TAU) * EIGHT_PERIOD;
  for (let i = 0; i < 3; i++) {
    const at = tau + (i * EIGHT_PERIOD) / 3;
    const f = ((((at / EIGHT_PERIOD) % 1) + 1) % 1) * EIGHT_SAMPLES;
    const k0 = Math.floor(f) % EIGHT_SAMPLES;
    const k1 = (k0 + 1) % EIGHT_SAMPLES;
    const a = f - Math.floor(f);
    const lerp = (j: number) =>
      table[k0 * 4 + j] * (1 - a) + table[k1 * 4 + j] * a;
    out.x.push(size * lerp(0));
    out.y.push(size * lerp(1));
    out.vx.push(speed * lerp(2));
    out.vy.push(speed * lerp(3));
  }
  return out;
}

/**
 * Two bodies on Kepler orbits about their common centre of mass, at time t:
 * the separation's semi-major axis `a`, eccentricity `e`, mean motion `n`
 * (radians per unit of t), the second body `ratio` times the first's mass.
 * Kepler's equation M = E − e sin E solved by Newton's method to 1e−12, so
 * positions are exact and velocities are their exact derivatives.
 */
export function keplerPair(
  t: number,
  o: { a: number; e: number; n: number; ratio: number }
): PlanarState {
  const { a, e, n } = o;
  const M = n * t;
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 30; k++) {
    const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  const b = Math.sqrt(1 - e * e);
  const rx = a * (Math.cos(E) - e);
  const ry = a * b * Math.sin(E);
  const Edot = n / (1 - e * Math.cos(E));
  const vx = -a * Math.sin(E) * Edot;
  const vy = a * b * Math.cos(E) * Edot;
  // Each body's share of the separation: the lighter one moves further.
  const shares = [-o.ratio / (1 + o.ratio), 1 / (1 + o.ratio)];
  return {
    x: shares.map((f) => f * rx),
    y: shares.map((f) => f * ry),
    vx: shares.map((f) => f * vx),
    vy: shares.map((f) => f * vy),
  };
}
