// One scene second by second: cost, steps, the fastest particle, pressure
// iterations and the obstacle. For finding a spike that longrun.cjs averages
// away. node trace.cjs [scene=paddle] [cell=0.005] [seconds=12]
const fs = require("fs");
const vm = require("vm");
const path = require("path");
for (const f of ["flip.js", "scenes.js", "engine.js"])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, f), "utf8"), {
    filename: f,
  });
const [scene = "paddle", cell = "0.005", seconds = "12"] =
  process.argv.slice(2);
const e = new LiquidEngine();
e.restart(scene, +cell);
const f = e.fluid;
const it = [];
const orig = f.solveIncompressibility.bind(f);
f.solveIncompressibility = (...a) => {
  orig(...a);
  it.push(f.lastPcgIters);
};
for (let s = 1; s <= +seconds; s++) {
  let ms = 0,
    steps = 0,
    peak = 0;
  it.length = 0;
  for (let k = 0; k < 60; k++) {
    const r = e.simulateExact(1 / 60);
    ms += r.ms;
    steps += r.steps;
    peak = Math.max(peak, f.maxSpeed);
  }
  const sorted = [...it].sort((a, b) => a - b);
  console.log(
    `${s} s: ${(ms / steps).toFixed(1)} ms/step, ${(steps / 60).toFixed(1)} steps/frame, peak ${peak.toFixed(2)} m/s, ` +
      `CG median ${sorted[sorted.length >> 1]} max ${sorted[sorted.length - 1]}, obstacle x ${f.obstacle.x.toFixed(3)} vx ${f.obstacle.vx.toFixed(2)}`
  );
}
