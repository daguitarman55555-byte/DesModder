// Surge run-up on a wall against Liu, Nistor, Mohammadian & Azimi (2022),
// Fluids 7(8) 258 and Liu's uOttawa thesis: reservoir 0.25 m long, depth H,
// right wall 0.85 m past the gate. Measured peak run-up h/H: 2.03 (H 0.20),
// 2.09 (0.25), 2.35 (0.30); run-up lasted 0.60, 0.68, 0.80 s. Height is the
// highest half-full cell beside the wall, as the sensor above it would see.
//   node runup.cjs [H=0.25] ; env CELL, FLIP, FRICTION=0, SMAG
const { FlipFluid } = require("./flip.js");
const H = +(process.argv[2] || 0.25),
  h = +(process.env.CELL || 0.01);
const measured = { 0.2: [2.03, 0.6], 0.25: [2.09, 0.68], 0.3: [2.35, 0.8] }[H];
const f = new FlipFluid({
  width: 1.1 + 2 * h,
  height: 1.2 + h,
  h,
  maxParticles: 80000,
});
f.fill(h, h, h + 0.25, h + H);
const o = {
  transfer: process.env.TRANSFER || "apic",
  advect: process.env.ADVECT || "grid",
  cfl: +(process.env.CFL || 1),
  flipRatio: +(process.env.FLIP || 0.9),
  wallFriction: process.env.FRICTION !== "0",
  smagorinsky: +(process.env.SMAG || 0),
};
let peak = 0,
  tPeak = 0,
  wet = [];
const n = f.fNumY,
  col = f.fNumX - 2;
const t0 = Date.now();
let steps = 0;
while (f.time < 3) {
  steps += f.advance(1 / 200, o);
  f.updateParticleDensity();
  let top = 0;
  for (let j = f.fNumY - 2; j >= 1; j--)
    if (f.particleDensity[col * n + j] >= 0.5 * f.restDensity) {
      top = (j + 1) * h - h;
      break;
    }
  if (top > peak) {
    peak = top;
    tPeak = f.time;
  }
  wet.push([f.time, top]);
}
// Run-up duration: from the surge passing H on the way up to falling back below H.
const up = wet.find(([, y]) => y > H),
  down = wet.find(([t, y]) => t > tPeak && y < H);
console.log(
  `H ${H} cell ${h * 1000} mm ${JSON.stringify(o)}: peak ${(peak / H).toFixed(2)} H at ${tPeak.toFixed(2)} s, above H for ${up && down ? (down[0] - up[0]).toFixed(2) : "?"} s` +
    (measured ? `; measured ${measured[0]} H, run-up ${measured[1]} s` : "") +
    `; ${((Date.now() - t0) / steps).toFixed(1)} ms/step`
);
