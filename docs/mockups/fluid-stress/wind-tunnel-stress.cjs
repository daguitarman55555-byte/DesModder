// The Wind tunnel pushed to its extremes, live, to measure where it stands
// before the air-flow work: frames a second, how far behind real time the
// simulation falls, the peak Mach number, and every restart Auto makes when
// the flow blows up. Run after `npm run build`:
//
//   node docs/mockups/fluid-stress/wind-tunnel-stress.cjs
//
// CASES (comma list of the names below) narrows a run; SECONDS sets how long
// each case runs (8 by default). Writes docs/assets/fluid-stress/results.json
// and one screenshot per case.
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const { mkdirSync, writeFileSync } = require("node:fs");
const root = join(__dirname, "..", "..", "..");
const out = join(root, "docs", "assets", "fluid-stress");
mkdirSync(out, { recursive: true });
const R = String.raw;
const disc = (x, y, r) =>
  R`\left(x-\left(${x}\right)\right)^{2}+\left(y-\left(${y}\right)\right)^{2}\le${r * r}`;

/** Each case: the solids, then settings over the tab's defaults. */
const CASES = {
  baseline: { solids: [disc(-6, 0, 1)], fluid: { reynolds: 100 } },
  "re-2000": { solids: [disc(-6, 0, 1)], fluid: { reynolds: 2000 } },
  "fast-inflow": {
    solids: [disc(-6, 0, 1)],
    fluid: { reynolds: 200, inflowSpeed: 40 },
  },
  "fine-grid": {
    solids: [disc(-6, 0, 1)],
    fluid: { reynolds: 200, cellsAcross: 1024 },
  },
  "eight-solids": {
    solids: [-6, -3, 0, 3].flatMap((x) => [
      disc(x, 2, 0.7),
      disc(x + 1.5, -2, 0.7),
    ]),
    fluid: { reynolds: 500 },
  },
  "nearly-blocked": {
    solids: [R`\left|x+4\right|\le0.3\left\{\left|y\right|\le5.5\right\}`],
    fluid: { reynolds: 300 },
  },
  "sharp-plate-at-inlet": {
    solids: [R`\left|x+8.5\right|\le0.1\left\{\left|y\right|\le3\right\}`],
    fluid: { reynolds: 1000 },
  },
  "dragged-fast": {
    solids: [disc("a", 0, 1)],
    sliders: { a: -6 },
    // a swept across 8 units a second, back and forth.
    drag: { name: "a", from: -7, to: 5, perSecond: 8 },
    fluid: { reynolds: 200 },
  },
};

const pick = (process.env.CASES ?? Object.keys(CASES).join(",")).split(",");
const seconds = Number(process.env.SECONDS ?? 8);

(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: process.env.HEADFUL === "1" ? false : "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const results = [];
  try {
    for (const name of pick) {
      const c = CASES[name];
      const page = await b.newPage();
      await page.setViewport({ width: 1300, height: 820 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("https://www.desmos.com/calculator");
      await page.waitForSelector(".dsm-pillbox-and-popover", {
        timeout: 60000,
      });
      await page.evaluate(() => DSM.enablePlugin("vector-tools"));
      await page.waitForFunction(
        () => DSM.enabledPlugins["vector-tools"] !== undefined
      );
      const report = await page.evaluate(
        async (c, seconds) => {
          const vt = DSM.enabledPlugins["vector-tools"];
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          // Settings outlive the page: without this, the fine grid's 1024
          // cells ran every case after it.
          vt.setFluid("mode", "off");
          vt.resetConfig();
          Calc.setExpressions([
            ...Object.entries(c.sliders ?? {}).map(([n, v]) => ({
              id: `slider_${n}`,
              latex: `${n}=${v}`,
            })),
            ...c.solids.map((latex, i) => ({ id: `solid${i}`, latex })),
          ]);
          Calc.updateSettings({ expressionsCollapsed: true });
          vt.setArrowMode("off");
          for (const [k, v] of Object.entries(c.fluid)) vt.setFluid(k, v);
          vt.setFluid("mode", "windTunnel");
          await wait(1500);
          // Frames, the slowest frame, and what the tab said, each frame.
          const frames = [];
          const notices = new Set();
          let peakMach = 0;
          let last = performance.now();
          const start = last;
          let running = true;
          const loop = (now) => {
            frames.push(now - last);
            last = now;
            if (c.drag !== undefined) {
              const { name, from, to, perSecond } = c.drag;
              const span = to - from;
              const s = (((now - start) / 1000) * perSecond) % (2 * span);
              const value = from + (s < span ? s : 2 * span - s);
              Calc.setExpression({
                id: `slider_${name}`,
                latex: `${name}=${value.toFixed(3)}`,
              });
            }
            const f = vt.fluid;
            peakMach = Math.max(peakMach, f.mach ?? 0);
            if (f.message) notices.add(f.message);
            if (running) requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
          await wait(seconds * 1000);
          running = false;
          const f = vt.fluid;
          const sorted = [...frames].sort((a, b) => a - b);
          const finite = (m) =>
            Object.values(m ?? {}).every(
              (v) => typeof v !== "number" || Number.isFinite(v)
            );
          return {
            fps: Math.round((frames.length / seconds) * 10) / 10,
            p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
            worstFrameMs: Math.round(sorted[sorted.length - 1]),
            realTimeFactor: Math.round(f.readout.realTimeFactor * 100) / 100,
            behind: f.readout.behind,
            simulating: f.isSimulating,
            peakMach: Math.round(peakMach * 1000) / 1000,
            latticeSpeed: f.currentLatticeSpeed,
            restarts: [...notices],
            measurementsFinite: f.measurements.every(finite),
            measurements: f.measurements.map((m) => ({
              drag: m.drag,
              lift: m.lift,
              strouhal: m.strouhal,
            })),
          };
        },
        c,
        seconds
      );
      await page.screenshot({ path: join(out, `${name}.png`) });
      results.push({ case: name, ...report, pageErrors: errors });
      console.log(
        name.padEnd(22),
        JSON.stringify({ ...report, measurements: undefined })
      );
      await page.close();
    }
  } finally {
    await b.close().catch(() => {});
    writeFileSync(
      join(out, "results.json"),
      JSON.stringify(
        { generatedAt: new Date().toISOString(), seconds, results },
        null,
        2
      )
    );
  }
})();
