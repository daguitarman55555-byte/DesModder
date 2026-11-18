// Which particles run away, and where: the fastest few with their cell and
// its neighbours (F liquid, . air, # solid). node who.cjs [scene] [cell] [s]
const fs = require("fs");
const vm = require("vm");
const path = require("path");
for (const f of ["flip.js", "scenes.js", "engine.js"])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, f), "utf8"), {
    filename: f,
  });
const [scene = "paddle", cell = "0.005", seconds = "3.6"] =
  process.argv.slice(2);
const e = new LiquidEngine();
e.restart(scene, +cell);
const f = e.fluid;
for (let k = 0; k < +seconds * 60; k++) e.simulateExact(1 / 60);
const speed = (i) => Math.hypot(f.vel[2 * i], f.vel[2 * i + 1]);
const idx = [...Array(f.numParticles).keys()].sort(
  (a, b) => speed(b) - speed(a)
);
const T = ["F", ".", "#"];
const n = f.fNumY;
const o = f.obstacle;
for (const i of idx.slice(0, 8)) {
  const x = f.pos[2 * i];
  const y = f.pos[2 * i + 1];
  const ci = Math.floor(x / f.h);
  const cj = Math.floor(y / f.h);
  let around = "";
  for (let dj = 1; dj >= -1; dj--) {
    for (let di = -1; di <= 1; di++)
      around += T[f.cellType[(ci + di) * n + cj + dj]] ?? "?";
    around += "/";
  }
  console.log(
    `v (${f.vel[2 * i].toFixed(2)}, ${f.vel[2 * i + 1].toFixed(2)}) at (${x.toFixed(3)}, ${y.toFixed(3)}) cell ${ci},${cj} ` +
      `around ${around} disc gap ${(Math.hypot(x - o.x, y - o.y) - o.r).toFixed(3)} aff ${[
        ...f.aff.slice(4 * i, 4 * i + 4),
      ]
        .map((a) => a.toFixed(1))
        .join(",")}`
  );
}
let fast = 0;
for (let i = 0; i < f.numParticles; i++) if (speed(i) > 3) fast++;
console.log(
  `${fast} of ${f.numParticles} particles over 3 m/s; disc at (${o.x.toFixed(3)}, ${o.y}) r ${o.r}, grid ${f.fNumX}x${f.fNumY}`
);
