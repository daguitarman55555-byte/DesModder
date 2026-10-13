/** Reference analytic / independent quadrature oracles for AP integral demos.
 * SI constants normalized to epsilon0 = mu0 = 1 to keep expressions legible.
 * These are NOT used as a replacement for the native Desmos summations.
 */
export type Vector3 = readonly [number, number, number];
export interface Charge {
  charge: number;
  position: Vector3;
}
export interface Current {
  current: number;
  x: number;
}
const pi = Math.PI;

export function electricField(
  point: Vector3,
  charges: readonly Charge[]
): Vector3 {
  const f = [0, 0, 0];
  for (const q of charges) {
    const d = point.map((x, i) => x - q.position[i]);
    const r2 = d.reduce((sum, x) => sum + x * x, 0);
    if (!(r2 > 0))
      throw new RangeError("Point charge coincides with the probe");
    const k = q.charge / (4 * pi * r2 ** 1.5);
    for (let i = 0; i < 3; i++) f[i] += k * d[i];
  }
  return f as unknown as Vector3;
}
export function chargeInside(
  center: Vector3,
  radius: number,
  charges: readonly Charge[]
): number {
  if (!(radius > 0)) throw new RangeError("Gaussian radius must be positive");
  return charges.reduce((sum, q) => {
    const dist2 = q.position.reduce((n, p, i) => n + (p - center[i]) ** 2, 0);
    return sum + (dist2 < radius * radius ? q.charge : 0);
  }, 0);
}
/** Fibonacci sphere: equal area weights, deterministic, approximate. */
export function gaussFlux(
  center: Vector3,
  radius: number,
  charges: readonly Charge[],
  samples: number
): number {
  if (!(radius > 0 && Number.isInteger(samples) && samples >= 4))
    throw new RangeError("Invalid sphere quadrature");
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const nz = 1 - (2 * (i + 0.5)) / samples;
    const angle = (((2.399963229728653 * i) % (2 * pi)) + 2 * pi) % (2 * pi);
    const radial = Math.sqrt(1 - nz * nz);
    const normal: Vector3 = [
      radial * Math.cos(angle),
      radial * Math.sin(angle),
      nz,
    ];
    const x: Vector3 = [
      center[0] + radius * normal[0],
      center[1] + radius * normal[1],
      center[2] + radius * normal[2],
    ];
    const E = electricField(x, charges);
    sum += E[0] * normal[0] + E[1] * normal[1] + E[2] * normal[2];
  }
  return (4 * pi * radius * radius * sum) / samples;
}
export function magneticField(
  point: Vector3,
  currents: readonly Current[]
): Vector3 {
  const B = [0, 0, 0];
  for (const wire of currents) {
    const dx = point[0] - wire.x;
    const [, dy] = point;
    const r2 = dx * dx + dy * dy;
    if (!(r2 > 0)) throw new RangeError("Path crosses a wire");
    B[0] -= (wire.current * dy) / (2 * pi * r2);
    B[1] += (wire.current * dx) / (2 * pi * r2);
  }
  return B as unknown as Vector3;
}
/** The path is a tilted circle; its projection is an ellipse in the xy plane. */
export function ampereCirculation(
  center: Vector3,
  radius: number,
  tilt: number,
  currents: readonly Current[],
  samples: number
): number {
  if (!(radius > 0 && samples >= 8 && Number.isInteger(samples)))
    throw new RangeError("Invalid loop quadrature");
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const t = (2 * pi * (i + 0.5)) / samples;
    const p: Vector3 = [
      center[0] + radius * Math.cos(t),
      center[1] + radius * Math.cos(tilt) * Math.sin(t),
      center[2] + radius * Math.sin(tilt) * Math.sin(t),
    ];
    const dp: Vector3 = [
      -radius * Math.sin(t),
      radius * Math.cos(tilt) * Math.cos(t),
      radius * Math.sin(tilt) * Math.cos(t),
    ];
    const B = magneticField(p, currents);
    sum += B[0] * dp[0] + B[1] * dp[1] + B[2] * dp[2];
  }
  return (sum * 2 * pi) / samples;
}
export function enclosedCurrent(
  center: Vector3,
  radius: number,
  tilt: number,
  currents: readonly Current[]
): number {
  const projectedY = radius * Math.cos(tilt);
  if (!(radius > 0 && projectedY > 0))
    throw new RangeError("Loop must not be edge-on");
  return currents.reduce(
    (sum, wire) =>
      sum +
      ((wire.x - center[0]) ** 2 / radius ** 2 +
        center[1] ** 2 / projectedY ** 2 <
      1
        ? wire.current
        : 0),
    0
  );
}
export interface InclineForces {
  static: boolean;
  weight: number;
  normal: number;
  friction: number;
  netDownhill: number;
  acceleration: number;
  threshold: number;
}
/** Released from rest; no rolling resistance, no air drag. Sliding branch assumes kinetic friction opposes downhill motion. */
export function inclineForces(
  theta: number,
  muStatic: number,
  muKinetic: number,
  mass: number,
  g: number
): InclineForces {
  if (
    !(
      theta >= 0 &&
      theta < pi / 2 &&
      muStatic >= 0 &&
      muKinetic >= 0 &&
      mass > 0 &&
      g > 0
    )
  )
    throw new RangeError("Invalid incline parameters");
  const normal = mass * g * Math.cos(theta);
  const staticBranch = Math.tan(theta) <= muStatic;
  const friction = staticBranch
    ? mass * g * Math.sin(theta)
    : muKinetic * normal;
  const net = mass * g * Math.sin(theta) - friction;
  return {
    static: staticBranch,
    weight: mass * g,
    normal,
    friction,
    netDownhill: net,
    acceleration: net / mass,
    threshold: Math.atan(muStatic),
  };
}
