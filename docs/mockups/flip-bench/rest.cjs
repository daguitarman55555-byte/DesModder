// Still water: 30 cm deep in a 1 m tank, nothing should move.
//   node rest.cjs ; env CELL, CFL, PRESSURE, FLIP, SEPARATE=0, DRIFT=0, MAXDT
const { FlipFluid } = require("./flip.js");
const h = +(process.env.CELL || 0.01);
const f = new FlipFluid({
  width: 1 + 2 * h,
  height: 0.6 + h,
  h,
  maxParticles: 60000,
});
f.fill(h, h, f.width - h, h + 0.3);
const o = {
  cfl: +(process.env.CFL || 1),
  flipRatio: +(process.env.FLIP || 0.9),
  pressureIters: +(process.env.PRESSURE || 50),
  separate: process.env.SEPARATE !== "0",
  compensateDrift: process.env.DRIFT !== "0",
  maxDt: +(process.env.MAXDT || 1 / 60),
  driftK: +(process.env.DRIFTK || 0.5),
  solver: process.env.SOLVER || "pcg",
};
const t0 = Date.now();
let steps = 0;
steps += f.advance(3, o);
const s = [];
for (let i = 0; i < f.numParticles; i++)
  s.push(Math.hypot(f.vel[2 * i], f.vel[2 * i + 1]));
s.sort((a, b) => a - b);
const pct = (q) => (100 * s[Math.floor(q * (s.length - 1))]).toFixed(2);
console.log(
  `${JSON.stringify(o)} after 3 s: median ${pct(0.5)} p99 ${pct(0.99)} max ${pct(1)} cm/s, ${steps} steps, ${((Date.now() - t0) / steps).toFixed(2)} ms/step`
);
