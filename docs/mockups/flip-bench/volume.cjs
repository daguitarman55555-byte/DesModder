// Does the water keep its volume? Still water 30 cm deep for 10 s, and a
// dam break for 6 s: level and drift. node volume.cjs '{"compensateDrift":false}'
const { FlipFluid } = require("./flip.js");
const extra = JSON.parse(process.argv[2] || "{}");
const h = +(process.env.CELL || 0.01);
const o = { cfl: 1, transfer: "apic", advect: "grid", ...extra };
const level = (f) => {
  f.updateParticleDensity();
  let s = 0,
    m = 0;
  for (let x = h + 0.05; x < f.width - 0.05; x += h) {
    s += f.surfaceAt(x);
    m++;
  }
  return s / m - h;
};
let f = new FlipFluid({
  width: 1 + 2 * h,
  height: 0.6 + h,
  h,
  maxParticles: 200000,
});
f.fill(h, h, f.width - h, h + 0.3);
const lv = [];
for (let t = 0; t < 10; t += 2) {
  f.advance(2, o);
  lv.push((1000 * (level(f) - 0.3)).toFixed(1));
}
const per = f.seedDx * f.seedDy;
f = new FlipFluid({
  width: 1.2 + 2 * h,
  height: 1.4 + h,
  h,
  maxParticles: 200000,
});
f.fill(h, h, h + 0.25, h + 0.5);
const v0 = f.volume() / (f.numParticles * per);
f.advance(6, o);
const t = Date.now();
const settledLevel = level(f),
  expect = (0.25 * 0.5) / 1.2;
console.log(
  `${h * 1000} mm ${JSON.stringify(extra)}: still level vs 30 cm at 2..10 s (mm): ${lv.join(" ")} | dam after 6 s: level ${(1000 * (settledLevel - expect)).toFixed(1)} mm from the column's volume spread flat, volume ${(100 * (f.volume() / (f.numParticles * per) / v0 - 1)).toFixed(2)}%`
);
