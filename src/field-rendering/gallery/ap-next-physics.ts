/** Reference analytic / independent quadrature oracles for the Gauss demo.
 * SI constants normalized to epsilon0 = mu0 = 1 to keep expressions legible.
 * These are NOT used as a replacement for the native Desmos summations.
 */
export type Vector3 = readonly [number, number, number];
export interface Charge {
  charge: number;
  position: Vector3;
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
