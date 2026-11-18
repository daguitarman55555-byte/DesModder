// Free sloshing against Bauerlein & Avila (JFM 2021): L 0.5 m, depth 0.4 m,
// first mode, 2 cm. 2D linear theory: omega = 7.80 rad/s. Measured in their
// 5 cm-deep tank: omega 7.86 +/- 0.10, delta 0.065 +/- 0.015 /s, the side
// walls adding friction a 2D model lacks. Period from upward zero crossings
// of the surface at the left wall, damping from the peak of each cycle.
//   node slosh.cjs ; env CELL, CFL, FLIP, SECONDS, SOLVER
const { FlipFluid } = require("./flip.js");
const h = +(process.env.CELL || 0.01),
  L = 0.5,
  depth = 0.4,
  amp = 0.02;
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
  h + depth + amp + h,
  (x, y) => y < h + depth + amp * Math.cos((Math.PI * (x - h)) / L)
);
const o = {
  cfl: +(process.env.CFL || 1),
  flipRatio: +(process.env.FLIP || 0.9),
  solver: process.env.SOLVER || "pcg",
};
const seconds = +(process.env.SECONDS || 8);
const t0 = Date.now();
const { omega, delta, cycles, steps, peaks } = measureSlosh(
  f,
  o,
  seconds,
  1 / 240
);
console.log(
  `cell ${h * 1000} mm flip ${o.flipRatio}: omega ${omega.toFixed(2)} rad/s (7.80 theory, 7.86 measured), delta ${delta.toFixed(3)} /s (0.065 measured) over ${cycles} cycles, peaks ${peaks.map((p) => (1000 * p).toFixed(1)).join(" ")} mm, ${((Date.now() - t0) / steps).toFixed(2)} ms/step`
);

function measureSlosh(f, o, seconds, sample) {
  // The half-density surface sits a little off the fill height, so measure
  // the surface from its own mean over the run.
  const probe = f.h + 0.03,
    series = [];
  let steps = 0;
  while (f.time < seconds) {
    steps += f.advance(sample, o);
    f.updateParticleDensity();
    series.push([f.time, f.surfaceAt(probe)]);
  }
  const mean = series.reduce((a, [, y]) => a + y, 0) / series.length;
  let prev = null,
    crossings = [],
    peak = 0,
    peaks = [];
  for (const [t, y] of series) {
    const eta = y - mean;
    if (prev != null && prev < 0 && eta >= 0) {
      if (crossings.length) peaks.push(peak);
      crossings.push(t - (sample * eta) / (eta - prev));
      peak = 0;
    }
    if (crossings.length) peak = Math.max(peak, eta);
    prev = eta;
  }
  const n = crossings.length - 1;
  const T = (crossings[n] - crossings[0]) / n;
  const delta =
    Math.log(peaks[0] / peaks[peaks.length - 1]) / ((peaks.length - 1) * T);
  return {
    omega: (2 * Math.PI) / T,
    delta,
    cycles: n,
    steps,
    offset: mean - (f.h + depth),
    peaks,
  };
}
