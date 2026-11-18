// Energy budget of the dam break: with no forcing, kinetic + potential energy
// can only fall. Prints E/E0, kinetic share, and how high water climbs the
// right wall.  node energy.cjs ; env CELL, FLIP, DRIFT=0, SEPARATE=0, SOLVER
const { FlipFluid } = require("./flip.js");
const h = +(process.env.CELL || 0.01),
  A = 0.25,
  g = 9.81;
const top = +(process.env.TOP || 0.65);
const f = new FlipFluid({
  width: 1.2 + 2 * h,
  height: top + h,
  h,
  maxParticles: 80000,
});
f.fill(h, h, h + A, h + 2 * A);
const o = {
  cfl: 1,
  flipRatio: +(process.env.FLIP || 0.9),
  compensateDrift: process.env.DRIFT !== "0",
  separate: process.env.SEPARATE !== "0",
  solver: process.env.SOLVER || "pcg",
  wallFriction: process.env.FRICTION !== "0",
};
const energy = () => {
  let k = 0,
    p = 0;
  for (let i = 0; i < f.numParticles; i++) {
    k += 0.5 * (f.vel[2 * i] ** 2 + f.vel[2 * i + 1] ** 2);
    p += g * (f.pos[2 * i + 1] - h);
  }
  return [k, p];
};
const [k0, p0] = energy(),
  E0 = k0 + p0;
let out = [],
  maxE = 0,
  runup = 0,
  solid = 0;
for (let t = 0.1; t <= 3.01; t += 0.1) {
  f.advance(t - f.time, o);
  const [k, p] = energy();
  maxE = Math.max(maxE, (k + p) / E0);
  let top = 0;
  for (let i = 0; i < f.numParticles; i++)
    if (f.pos[2 * i] > f.width - 3 * h)
      top = Math.max(top, f.pos[2 * i + 1] - h);
  runup = Math.max(runup, top);
  // Water, not spray: the highest cell by the wall at least half full.
  f.updateParticleDensity();
  const n = f.fNumY,
    i = f.fNumX - 2;
  for (let j = f.fNumY - 2; j >= 1; j--)
    if (f.particleDensity[i * n + j] >= 0.5 * f.restDensity) {
      solid = Math.max(solid, j * h);
      break;
    }
  if (
    Math.abs(t * 10 - Math.round(t * 10)) < 1e-6 &&
    Math.round(t * 10) % 3 === 0
  )
    out.push(
      `${t.toFixed(1)}s E ${((k + p) / E0).toFixed(3)} KE ${(k / E0).toFixed(2)} wall ${(100 * top).toFixed(0)}cm`
    );
}
console.log(
  `${JSON.stringify(o)}\n  max E/E0 ${maxE.toFixed(3)}, highest particle on right wall ${(100 * runup).toFixed(0)} cm, highest half-full water ${(100 * solid).toFixed(0)} cm = ${(solid / 0.5).toFixed(2)} H (column 50 cm, tank top ${(100 * top).toFixed(0)} cm)\n  ${out.join(" | ")}`
);
