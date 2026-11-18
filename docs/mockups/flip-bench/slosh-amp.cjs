// Sloshing amplitude, one full period (0.8 s) at a time, for finding what
// damps it. node slosh-amp.cjs ; env CELL, DRIFTK, FLIP, SEPARATE=0, DRIFT=0
const { FlipFluid } = require("./flip.js");
const h = +(process.env.CELL || 0.01),
  L = 0.5,
  depth = 0.4;
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
  h + depth + 0.02 + h,
  (x, y) => y < h + depth + 0.02 * Math.cos((Math.PI * (x - h)) / L)
);
const o = {
  cfl: 1,
  driftK: +(process.env.DRIFTK || 0.5),
  flipRatio: +(process.env.FLIP || 0.9),
  separate: process.env.SEPARATE !== "0",
  compensateDrift: process.env.DRIFT !== "0",
};
const amps = [];
let level = 0;
for (let k = 0; k < 8; k++) {
  let lo = 1e9,
    hi = -1e9;
  const t1 = f.time + 0.805;
  while (f.time < t1) {
    f.advance(1 / 120, o);
    f.updateParticleDensity();
    const d = f.surfaceAt(h + 0.03) - f.surfaceAt(h + L - 0.03);
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  amps.push(((1000 * (hi - lo)) / 4).toFixed(1));
}
let s = 0,
  m = 0;
for (let x = h + 0.05; x < h + L - 0.05; x += h) {
  s += f.surfaceAt(x);
  m++;
}
const a0 = +amps[0],
  a1 = +amps[amps.length - 1];
console.log(
  `${JSON.stringify(o)}: amplitude (mm) by period ${amps.join(" ")}; delta ${(Math.log(a0 / a1) / (0.805 * (amps.length - 1))).toFixed(3)} /s; level ${(1000 * (s / m - h - depth)).toFixed(1)} mm`
);
