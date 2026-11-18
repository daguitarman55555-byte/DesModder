/*
 * The bench's scenes, shared by the page and the solver's worker: setup,
 * per-step hooks and measurements run where the solver runs; readout and
 * chart run on the page, from the scene data the worker sends back.
 */
"use strict";
const G = 9.81;

const A = 0.25; // dam column width
const MM = [
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
const SLOSH = { L: 0.5, depth: 0.4, amp: 0.02, period: (2 * Math.PI) / 7.8 };

function interp(series, x) {
  for (let i = 1; i < series.length; i++)
    if (series[i][0] >= x) {
      const [x0, y0] = series[i - 1],
        [x1, y1] = series[i];
      return y0 + ((y1 - y0) * (x - x0)) / Math.max(x1 - x0, 1e-12);
    }
  return null;
}
const fmt = (x, d = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(d));

const RUNUP_H = 0.3;
const SCENES = {
  dam: {
    label: "Dam break",
    W: 1.2,
    // Headroom: the jet climbs the far wall to about 2.6 times the column.
    // A 65 cm tank capped it, and the open top acted as a lid.
    H: 1.4,
    about:
      "A column of water 25 cm wide and 50 cm tall collapses along a dry floor and climbs the far wall.",
    ref: "Martin & Moyce (1952), Phil. Trans. R. Soc. A 244: front Z = x/a against T = t√(2g/a), red dots. The experiment's gate took time to lift, so simulations usually run a little ahead early on.",
    setup(f) {
      f.fill(f.h, f.h, f.h + A, f.h + 2 * A);
      return { series: [] };
    },
    measure(f, d) {
      const T = f.time * Math.sqrt((2 * G) / A);
      if (T <= 3.6)
        d.series.push([T, (f.front(f.h + Math.max(A / 10, f.h)) - f.h) / A]);
    },
    readout(f, d) {
      let err = 0,
        n = 0;
      for (const [T, Z] of MM) {
        const z = interp(d.series, T);
        if (z != null) {
          err += Math.abs(z - Z) / Z;
          n++;
        }
      }
      const z1 = interp(d.series, 1.98),
        z2 = interp(d.series, 3.33);
      const slope = z1 != null && z2 != null ? (z2 - z1) / (3.33 - 1.98) : null;
      const e = n ? (100 * err) / n : null;
      return [
        ["T now", fmt(f.time * Math.sqrt((2 * G) / A))],
        [
          "Mean error vs data",
          e == null ? "–" : e.toFixed(1) + "%",
          e == null ? "" : e < 10 ? "good" : e < 15 ? "warn" : "bad",
        ],
        [
          "Late front speed",
          slope == null ? "–" : slope.toFixed(2) + " √(gH), 1.32 measured",
        ],
      ];
    },
    chart(ctx, w, h, d) {
      plot(
        ctx,
        w,
        h,
        { x: [0, 3.5], y: [1, 4.6], xl: "T", yl: "Z" },
        MM.map(([x, y]) => ({ x, y })),
        d.series.map(([x, y]) => ({ x, y }))
      );
    },
  },
  runup: {
    label: "Wall run-up",
    W: 1.1,
    H: 1.0,
    about:
      "A reservoir 25 cm long and 30 cm deep is released; the surge runs 85 cm and climbs the end wall.",
    ref: "Liu, Nistor, Mohammadian & Azimi (2022), Fluids 7(8) 258, the same tank: the surge peaked at 2.35 H by an ultrasonic sensor above the wall and stayed above H for 0.8 s. At 1 cm cells the thin jet is under-resolved and peaks low (2.13 H); at 5 mm it peaks at 2.53 H, 8% high, and stays above H for 0.62 s.",
    setup(f) {
      f.fill(f.h, f.h, f.h + 0.25, f.h + RUNUP_H);
      return { peak: 0, tPeak: 0, up: null, down: null };
    },
    // The highest cell beside the wall at least half full, as the sensor sees it.
    measure(f, d) {
      f.updateParticleDensity();
      const n = f.fNumY,
        col = f.fNumX - 2;
      let top = 0;
      for (let j = f.fNumY - 2; j >= 1; j--)
        if (f.particleDensity[col * n + j] >= 0.5 * f.restDensity) {
          top = j * f.h;
          break;
        }
      if (top > d.peak) {
        d.peak = top;
        d.tPeak = f.time;
      }
      if (d.up == null && top > RUNUP_H) d.up = f.time;
      if (d.up != null && d.down == null && f.time > d.tPeak && top < RUNUP_H)
        d.down = f.time;
    },
    readout(f, d) {
      const r = d.peak / RUNUP_H;
      return [
        [
          "Peak run-up",
          d.peak ? r.toFixed(2) + " H, 2.35 measured" : "–",
          d.peak
            ? Math.abs(r - 2.35) < 0.2
              ? "good"
              : Math.abs(r - 2.35) < 0.45
                ? "warn"
                : "bad"
            : "",
        ],
        [
          "Above H for",
          d.down ? (d.down - d.up).toFixed(2) + " s, 0.80 measured" : "–",
        ],
      ];
    },
  },
  slosh: {
    label: "Sloshing",
    W: SLOSH.L,
    H: 0.6,
    about:
      "A 50 cm tank, 40 cm deep, starts with a 2 cm tilt of its first mode and rings down.",
    ref: "Linear theory in 2D: ω = 7.80 rad/s. Bäuerlein & Avila (2021), J. Fluid Mech. 925: ω = 7.86 ± 0.10 rad/s, damping δ = 0.065 ± 0.015 /s in a tank 5 cm deep, whose side walls add friction a 2D model has not got. So δ here should come out lower, not higher.",
    setup(f) {
      const { L, depth, amp } = SLOSH,
        h = f.h;
      f.fill(
        h,
        h,
        h + L,
        h + depth + amp + h,
        (x, y) => y < h + depth + amp * Math.cos((Math.PI * (x - h)) / L)
      );
      return {
        series: [],
        amps: [],
        lo: Infinity,
        hi: -Infinity,
        next: SLOSH.period,
      };
    },
    // Half the left-right height difference, its range over each full
    // period, as slosh-amp.cjs measures it.
    measure(f, d) {
      const { L } = SLOSH,
        h = f.h;
      const eta = (f.surfaceAt(h + 0.03) - f.surfaceAt(h + L - 0.03)) / 2;
      d.series.push([f.time, eta]);
      // Keep the 10 s the chart shows: the worker sends this every frame,
      // and over a long run an unbounded history grew the copy without end.
      if (d.series.length > 700 && d.series[0][0] < f.time - 10)
        d.series.splice(
          0,
          d.series.findIndex(([t]) => t >= f.time - 10)
        );
      d.lo = Math.min(d.lo, eta);
      d.hi = Math.max(d.hi, eta);
      if (f.time >= d.next) {
        d.amps.push((d.hi - d.lo) / 2);
        d.lo = Infinity;
        d.hi = -Infinity;
        d.next += SLOSH.period;
      }
    },
    readout(f, d) {
      const a = d.amps,
        n = a.length;
      const delta =
        n >= 2 && a[n - 1] > 0
          ? Math.log(a[0] / a[n - 1]) / (SLOSH.period * (n - 1))
          : null;
      return [
        ["Periods measured", String(n)],
        [
          "Amplitude now",
          n ? (1000 * a[n - 1]).toFixed(1) + " mm, from 20" : "–",
        ],
        [
          "Damping δ",
          delta == null ? "–" : delta.toFixed(3) + " /s, 0.065 measured",
          delta == null
            ? ""
            : delta <= 0.1
              ? "good"
              : delta < 0.3
                ? "warn"
                : "bad",
        ],
      ];
    },
    chart(ctx, w, h, d) {
      const t1 = Math.max(
        4,
        d.series.length ? d.series[d.series.length - 1][0] : 4
      );
      plot(
        ctx,
        w,
        h,
        {
          x: [Math.max(0, t1 - 8), t1],
          y: [-0.025, 0.025],
          xl: "t (s)",
          yl: "η (m)",
        },
        [],
        d.series.map(([x, y]) => ({ x, y }))
      );
    },
  },
  rest: {
    label: "Still water",
    W: 1,
    H: 0.6,
    about:
      "A tank 30 cm deep with nothing moving. Real water stays flat and still.",
    ref: "Any motion here comes from the solver, not physics. The particles start packed slightly unevenly, so the first half second settles.",
    setup(f) {
      f.fill(f.h, f.h, f.width - f.h, f.h + 0.3);
      return {};
    },
    measure(f, d) {
      if (f.time < 1) return;
      let max2 = 0;
      for (let i = 0; i < f.numParticles; i++)
        max2 = Math.max(max2, f.vel[2 * i] ** 2 + f.vel[2 * i + 1] ** 2);
      let sum = 0,
        sum2 = 0,
        n = 0;
      for (let x = 0.1; x <= f.width - 0.1; x += f.h) {
        const y = f.surfaceAt(x);
        sum += y;
        sum2 += y * y;
        n++;
      }
      d.maxSpeed = Math.sqrt(max2);
      d.rough = Math.sqrt(Math.max(sum2 / n - (sum / n) ** 2, 0));
    },
    readout(f, d) {
      return [
        [
          "Fastest particle",
          d.maxSpeed == null
            ? "settling…"
            : (100 * d.maxSpeed).toFixed(1) + " cm/s",
          d.maxSpeed == null
            ? ""
            : d.maxSpeed < 0.02
              ? "good"
              : d.maxSpeed < 0.1
                ? "warn"
                : "bad",
        ],
        [
          "Surface roughness",
          d.rough == null ? "–" : (1000 * d.rough).toFixed(1) + " mm",
        ],
      ];
    },
  },
  drop: {
    label: "Drop",
    W: 1,
    H: 0.8,
    about:
      "A 16 cm blob falls 30 cm into a pool 15 cm deep: splash, crown and merging.",
    ref: "Judge by eye against slow-motion footage; the volume drift is the number to watch.",
    setup(f) {
      f.fill(f.h, f.h, f.width - f.h, f.h + 0.15);
      f.fill(
        0.42,
        0.47,
        0.58,
        0.63,
        (x, y) => (x - 0.5) ** 2 + (y - 0.55) ** 2 < 0.08 ** 2
      );
      return {};
    },
  },
  pour: {
    label: "Pour",
    W: 1,
    H: 0.8,
    about:
      "A tap 2 cm wide pours at 1 m/s from 60 cm into a shallow pool, until the pool is 30 cm deep.",
    ref: "The stream should fall like a jet, break into drops only where it thins, and merge without a gap. The first tap was a 4 cm sheet at 1.5 m/s, three times this flow, and its waves were too strong.",
    setup(f) {
      f.fill(f.h, f.h, f.width - f.h, f.h + 0.05);
      const full = Math.floor(
        (0.3 * (f.width - 2 * f.h)) / (f.seedDx * f.seedDy)
      );
      return { acc: 0, full };
    },
    beforeStep(f, dt, d) {
      if (f.numParticles >= d.full) return;
      const speed = 1.0,
        x0 = 0.2,
        x1 = 0.22,
        y = 0.6;
      d.acc += speed * dt;
      while (d.acc >= f.seedDy) {
        d.acc -= f.seedDy;
        for (let x = x0 + f.r; x <= x1 - f.r; x += f.seedDx)
          f.addParticle(x, y - d.acc, 0, -speed);
      }
    },
  },
  paddle: {
    label: "Paddle",
    W: 1,
    H: 0.6,
    about:
      "A 12 cm disc sweeps back and forth through 30 cm of water, up to 0.75 m/s.",
    ref: "No particle may end a step inside the disc; that would be water tunnelling through a solid.",
    setup(f) {
      f.fill(f.h, f.h, f.width - f.h, f.h + 0.3);
      return { inside: 0 };
    },
    beforeStep(f, dt, d) {
      if (f.dragging) return;
      const o = f.obstacle,
        t = f.time + dt;
      const x = 0.5 + 0.24 * Math.sin((2 * Math.PI * t) / 2);
      o.vx = (x - (o.active ? o.x : x)) / dt;
      o.vy = 0;
      Object.assign(o, { active: true, x, y: 0.2, r: 0.06 });
    },
    // Once a frame, not a step: on the GPU each look at the particles is a
    // read back from the graphics card.
    measure(f, d) {
      const o = f.obstacle;
      if (!o.active) return;
      let n = 0;
      for (let i = 0; i < f.numParticles; i++)
        if (
          (f.pos[2 * i] - o.x) ** 2 + (f.pos[2 * i + 1] - o.y) ** 2 <
          (o.r * 0.999) ** 2
        )
          n++;
      d.inside = Math.max(d.inside, n);
    },
    readout(f, d) {
      return [
        [
          "Most particles inside the disc",
          String(d.inside),
          d.inside === 0 ? "good" : "bad",
        ],
      ];
    },
  },
};
