// Dam break against Martin & Moyce (1952): a column a wide and 2a tall
// collapses; Z = front / a against T = t sqrt(2 g / a). Same data and front
// rule as ../liquid-validation/dam.cjs (the bottom tenth of a).
//   node dam.cjs [cellsAcross=25] ; env CFL, FLIP, PRESSURE, SEPARATE=0
const { FlipFluid } = require("./flip.js");
const cells = +(process.argv[2] || 25);
const a = 0.25;
const h = a / cells;
const g = 9.81;
const mm = [
  [0.41, 1.11],
  [0.84, 1.22],
  [1.19, 1.44],
  [1.43, 1.67],
  [1.63, 1.89],
  [1.83, 2.11],
  [1.98, 2.33],
  [2.2, 2.56],
  [2.32, 2.78],
  [2.51, 3],
  [2.65, 3.22],
  [2.83, 3.44],
  [2.97, 3.67],
  [3.11, 3.89],
  [3.33, 4.11],
];
const opts = {
  cfl: +(process.env.CFL || 1),
  flipRatio: +(process.env.FLIP || 0.9),
  pressureIters: +(process.env.PRESSURE || 50),
  separate: process.env.SEPARATE !== "0",
  driftK: +(process.env.DRIFTK || 0.5),
  solver: process.env.SOLVER || "pcg",
};
const f = new FlipFluid({
  width: 4.6 * a + 2 * h,
  height: 2.4 * a + h,
  h,
  maxParticles: 400000,
});
f.fill(h, h, h + a, h + 2 * a);
const v0 = f.volume();
const scale = Math.sqrt((2 * g) / a);
const band = h + Math.max(a / 10, h);
let i = 0,
  err = 0,
  steps = 0;
const xs = [];
const t0 = process.hrtime.bigint();
while (i < mm.length) {
  const target = mm[i][0] / scale;
  steps += f.advance(target - f.time, opts);
  const Z = (f.front(band) - h) / a;
  xs.push(Z);
  err += Math.abs(Z - mm[i][1]) / mm[i][1];
  i++;
}
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
const slope = (xs[14] - xs[6]) / (3.33 - 1.98);
console.log(
  `cells ${cells} particles ${f.numParticles} CFL ${opts.cfl} flip ${opts.flipRatio}: ` +
    `mean err ${((100 * err) / mm.length).toFixed(1)}%, late speed ${slope.toFixed(2)} sqrt(gH) (1.32 measured), ` +
    `volume drift ${((100 * (f.volume() - v0)) / v0).toFixed(2)}%, ${steps} steps, ${(ms / steps).toFixed(2)} ms/step, ` +
    `Z ${xs.map((z) => z.toFixed(2)).join(" ")}`
);
