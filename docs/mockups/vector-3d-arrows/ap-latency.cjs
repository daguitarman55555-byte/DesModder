// How long Desmos takes to recompute after each AP preset's physics sliders
// move, against the 150 ms budget: every numeric slider (not the probe, the
// switches or the clock), moved three times, timed from the write until
// Desmos reports the new value, which it does only after recomputing the
// whole graph. Explanatory by default: it has every object Majestic has and
// more, so it is the worst case. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/ap-latency.cjs
//
// IDS, DIMS and MODES (comma lists) narrow or widen a run. Prints one line
// per preset and writes docs/assets/vector-3d/ap/latency.json, or OUTPUT,
// in the shape the CI's Pages report reads
// (docs/mockups/vector-3d-arrows/ap-pages-report.cjs).
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const { writeFileSync } = require("node:fs");
const root = join(__dirname, "..", "..", "..");
const list = (name, fallback) => (process.env[name] ?? fallback).split(",");
const ids = list(
  "IDS",
  "ap-projectile,ap-shm,ap-circular,ap-nozzle,ap-conductor,ap-induction,ap-motion-graphs,ap-pendulum-phase,ap-kepler-areas"
);
const dims = list("DIMS", "2d,3d");
const modes = list("MODES", "explanatory");
const output =
  process.env.OUTPUT ??
  join(root, "docs", "assets", "vector-3d", "ap", "latency.json");
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    // HEADFUL=1 for CI's virtual screen, as in ap-look.cjs.
    headless: process.env.HEADFUL === "1" ? false : "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const results = [];
  try {
    for (const dim of dims) {
      const page = await b.newPage();
      await page.setViewport({ width: 1300, height: 820 });
      await page.goto(
        `https://www.desmos.com/${dim === "3d" ? "3d" : "calculator"}`
      );
      await page.waitForSelector(".dsm-pillbox-and-popover", {
        timeout: 60000,
      });
      await page.evaluate(() => DSM.enablePlugin("vector-tools"));
      await page.waitForFunction(
        () => DSM.enabledPlugins["vector-tools"] !== undefined
      );
      for (const id of ids)
        for (const mode of modes) {
          const report = await page.evaluate(
            async (id, mode) => {
              const vt = DSM.enabledPlugins["vector-tools"];
              const wait = (ms) => new Promise((r) => setTimeout(r, ms));
              vt.setDemoMode(mode);
              vt.applyGalleryPreset(id, true);
              await wait(2500);
              vt.setTimePlaying(false);
              const sliders = vt.presetVariables.filter(
                (s) => !s.toggle && !/^(p_|s_|T_)/.test(s.name)
              );
              const out = [];
              for (const s of sliders) {
                const helper = Calc.HelperExpression({ latex: s.name });
                await wait(100);
                const ms = [];
                for (const fraction of [0.3, 0.7, 0.5]) {
                  const step = s.step || (s.max - s.min) / 100;
                  const value =
                    Math.round((s.min + (s.max - s.min) * fraction) / step) *
                    step;
                  const start = performance.now();
                  vt.setPresetVariable(s.id, value);
                  while (Math.abs(helper.numericValue - value) > 1e-6) {
                    if (performance.now() - start > 10000) break;
                    await wait(2);
                  }
                  ms.push(Math.round(performance.now() - start));
                  await wait(80);
                }
                vt.setPresetVariable(s.id, s.value);
                await wait(150);
                out.push({ name: s.name, ms });
              }
              return out;
            },
            id,
            mode
          );
          const all = report.flatMap((s) => s.ms).sort((a, b) => a - b);
          const worst = all[all.length - 1];
          results.push({
            dimension: dim,
            preset: id,
            mode,
            metric: "slider write until Desmos reports the new value",
            p50Ms: all[Math.floor(all.length / 2)],
            p95Ms:
              all[Math.min(all.length - 1, Math.ceil(0.95 * all.length) - 1)],
            worstMs: worst,
            error: null,
            sliders: report,
          });
          console.log(
            dim,
            id,
            mode,
            `worst ${worst} ms`,
            worst <= 150 ? "ok" : "OVER",
            report.map((s) => `${s.name}:${Math.max(...s.ms)}`).join(" ")
          );
        }
      await page.close();
    }
  } finally {
    await b.close();
    writeFileSync(
      output,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), results },
        null,
        2
      )
    );
  }
})();
