// A minute of each scene through the page's own engine and scenes, as smooth
// playback runs it (frames of 1/60 s, no time budget). Every 10 s: cost per
// step, volume drift, energy, particles outside the tank or not finite, and
// the fastest particle. Accurate and efficient for long runs means none of
// these creep. node longrun.cjs [seconds=60] [cell=0.01] [scene...]
const fs = require("fs");
const vm = require("vm");
const path = require("path");
for (const f of ["flip.js", "scenes.js", "engine.js"])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, f), "utf8"), {
    filename: f,
  });

const seconds = +(process.argv[2] || 60);
const cell = +(process.argv[3] || 0.01);
const only = process.argv.slice(4);
const g = 9.81;
for (const key of Object.keys(SCENES)) {
  if (only.length && !only.includes(key)) continue;
  const e = new LiquidEngine();
  e.restart(key, cell);
  const f = e.fluid;
  e.measureVolume();
  const energy = () => {
    let k = 0,
      p = 0;
    for (let i = 0; i < f.numParticles; i++) {
      k += 0.5 * (f.vel[2 * i] ** 2 + f.vel[2 * i + 1] ** 2);
      p += g * f.pos[2 * i + 1];
    }
    return (k + p) / Math.max(f.numParticles, 1);
  };
  const rows = [];
  let ms = 0,
    steps = 0;
  for (let frame = 1; frame <= seconds * 60; frame++) {
    const r = e.simulateExact(1 / 60);
    ms += r.ms;
    steps += r.steps;
    if (frame % 600 === 0) {
      let bad = 0,
        fastest = 0;
      for (let i = 0; i < f.numParticles; i++) {
        const x = f.pos[2 * i],
          y = f.pos[2 * i + 1];
        const v = Math.hypot(f.vel[2 * i], f.vel[2 * i + 1]);
        if (
          !isFinite(x + y + v) ||
          x < 0 ||
          x > f.width ||
          y < 0 ||
          y > f.height
        )
          bad++;
        else fastest = Math.max(fastest, v);
      }
      rows.push(
        `${(frame / 60).toFixed(0).padStart(3)} s: ${(ms / steps).toFixed(2)} ms/step, ${(steps / 600).toFixed(1)} steps/frame, ` +
          `${f.numParticles} particles, drift ${(100 * e.measureVolume()).toFixed(2)}%, E ${energy().toFixed(4)} J/kg, ` +
          `fastest ${fastest.toFixed(2)} m/s, outside ${bad}, data ${JSON.stringify(e.data).length} bytes`
      );
      ms = 0;
      steps = 0;
    }
  }
  console.log(`${key} at ${cell * 1000} mm\n  ${rows.join("\n  ")}`);
}
