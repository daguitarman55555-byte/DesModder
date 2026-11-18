// Time each phase of a step: node profile.cjs [cell=0.01] [scene=rest|dam]
const { FlipFluid } = require("./flip.js");
const h = +(process.argv[2] || 0.01),
  sceneName = process.argv[3] || "rest";
const f = new FlipFluid({
  width: 1 + 2 * h,
  height: 0.6 + h,
  h,
  maxParticles: 80000,
});
if (sceneName === "dam") f.fill(h, h, h + 0.25, h + 0.5);
else f.fill(h, h, f.width - h, h + 0.3);
const o = { cfl: 1 };
f.advance(0.3, o);
const names = [
  "updateSolids",
  "integrateParticles",
  "pushParticlesApart",
  "handleParticleCollisions",
  "transferVelocities",
  "updateParticleDensity",
  "solveIncompressibility",
  "correctDrift",
];
const t = Object.fromEntries(names.map((k) => [k, 0]));
const iters = [];
for (const k of names) {
  const orig = f[k].bind(f);
  f[k] = (...a) => {
    const s = process.hrtime.bigint();
    const r = orig(...a);
    t[k] += Number(process.hrtime.bigint() - s) / 1e6;
    if (k === "solveIncompressibility") iters.push(f.lastPcgIters);
    return r;
  };
}
const steps = f.advance(0.5, o);
console.log(
  `${sceneName} ${h * 1000} mm, ${f.numParticles} particles, ${f.fNumX}x${f.fNumY}, ${steps} steps, pressure CG iterations median ${iters.sort((a, b) => a - b)[iters.length >> 1]}`
);
let total = 0;
for (const k of names) total += t[k];
for (const k of names)
  console.log(
    `  ${k.padEnd(26)} ${(t[k] / steps).toFixed(2)} ms/step  ${((100 * t[k]) / total).toFixed(0)}%`
  );
console.log(`  total ${(total / steps).toFixed(2)} ms/step`);
