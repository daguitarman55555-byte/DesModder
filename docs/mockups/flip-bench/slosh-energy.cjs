// Sloshing energy above rest, period by period: kinetic plus potential,
// against the same water lying flat. Tells real damping from a wave that has
// only changed shape. node slosh-energy.cjs ; env TRANSFER, ADVECT, CELL
const { FlipFluid } = require("./flip.js");
const h = +(process.env.CELL || 0.01),
  L = 0.5,
  depth = 0.4,
  g = 9.81;
const o = {
  cfl: 1,
  driftBand: +(process.env.BAND || 0),
  driftK: +(process.env.DRIFTK || 0.1),
  driftEvery: +(process.env.DRIFTEVERY || 4),
  compensateDrift: process.env.DRIFT !== "0",
  wallFriction: process.env.FRICTION !== "0",
  separate: process.env.SEPARATE !== "0",
  transfer: process.env.TRANSFER || "apic",
  advect: process.env.ADVECT || "grid",
};
const make = (amp) => {
  const f = new FlipFluid({
    width: L + 2 * h,
    height: 0.6 + h,
    h,
    maxParticles: 80000,
  });
  f.fill(
    h,
    h,
    h + L,
    h + depth + amp + h,
    (x, y) => y < h + depth + amp * Math.cos((Math.PI * (x - h)) / L)
  );
  return f;
};
const energy = (f) => {
  let k = 0,
    p = 0;
  for (let i = 0; i < f.numParticles; i++) {
    k += 0.5 * (f.vel[2 * i] ** 2 + f.vel[2 * i + 1] ** 2);
    p += g * f.pos[2 * i + 1];
  }
  return [k, p];
};
// A standing wave turns all its energy to motion twice a period, so the
// largest kinetic energy over a period is the wave's energy then.
const f = make(0.02);
const rows = [];
for (let k = 0; k < 8; k++) {
  let peak = 0;
  const t1 = f.time + 0.805;
  while (f.time < t1) {
    f.advance(1 / 120, o);
    peak = Math.max(peak, energy(f)[0]);
  }
  rows.push(peak / f.numParticles);
}
const delta =
  Math.log(rows[0] / rows[rows.length - 1]) / (2 * 0.805 * (rows.length - 1));
console.log(
  `${o.transfer} ${o.advect}: peak kinetic energy (mJ/kg) by period: ${rows.map((r) => (1000 * r).toFixed(3)).join(" ")}; amplitude damping ${delta.toFixed(3)} /s (0.065 measured)`
);
