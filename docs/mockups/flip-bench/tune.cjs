// Speed against quality for solver settings: still water, level, dam break,
// sloshing. node tune.cjs '{"pcgTol":1e-4}'
const { FlipFluid } = require("./flip.js");
const extra = JSON.parse(process.argv[2] || "{}");
const h = 0.01;
const o = { cfl: 1, ...extra };
let f = new FlipFluid({
  width: 1 + 2 * h,
  height: 0.6 + h,
  h,
  maxParticles: 80000,
});
f.fill(h, h, f.width - h, h + 0.3);
let t0 = Date.now(),
  s = f.advance(3, o);
const stillMs = (Date.now() - t0) / s;
const sp = [];
for (let i = 0; i < f.numParticles; i++)
  sp.push(Math.hypot(f.vel[2 * i], f.vel[2 * i + 1]));
sp.sort((a, b) => a - b);
f.updateParticleDensity();
let lv = 0,
  m = 0;
for (let x = h + 0.05; x < f.width - 0.05; x += h) {
  lv += f.surfaceAt(x);
  m++;
}
f = new FlipFluid({
  width: 1.2 + 2 * h,
  height: 1.4 + h,
  h,
  maxParticles: 80000,
});
f.fill(h, h, h + 0.25, h + 0.5);
t0 = Date.now();
s = f.advance(1.5, o);
const damMs = (Date.now() - t0) / s;
// sloshing: amplitude after 3 periods
const L = 0.5,
  depth = 0.4;
f = new FlipFluid({
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
f.advance(3 * 0.805, o);
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
console.log(
  `${JSON.stringify(extra).padEnd(34)} still ${stillMs.toFixed(2)} ms p99 ${(100 * sp[Math.floor(0.99 * sp.length)]).toFixed(2)} cm/s level ${(1000 * (lv / m - h - 0.3)).toFixed(1)} mm | dam ${damMs.toFixed(2)} ms | slosh after 3 periods ${((1000 * (hi - lo)) / 4).toFixed(1)} mm`
);
