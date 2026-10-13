// The AP presets as they look, live: each in 2D and 3D, Explanatory and
// Majestic, after a few seconds of motion, with the expression list
// collapsed so the picture is the graph. Reports frames a second, what
// Desmos refused, and which objects show. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/ap-look.cjs
//
// IDS, DIMS and MODES (comma lists) narrow a run; OUT is where the
// screenshots go (docs/assets/vector-3d/ap by default).
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const { mkdirSync } = require("node:fs");
const root = join(__dirname, "..", "..", "..");
const out = process.env.OUT ?? join(root, "docs", "assets", "vector-3d", "ap");
mkdirSync(out, { recursive: true });
const list = (name, fallback) => (process.env[name] ?? fallback).split(",");
const ids = list(
  "IDS",
  "ap-projectile,ap-shm,ap-circular,ap-nozzle,ap-conductor,ap-induction"
);
const dims = list("DIMS", "2d,3d");
const modes = list("MODES", "explanatory,majestic");
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  try {
    for (const dim of dims) {
      const page = await b.newPage();
      await page.setViewport({ width: 1300, height: 820 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
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
            async (id, mode, dim) => {
              const vt = DSM.enabledPlugins["vector-tools"];
              const wait = (ms) => new Promise((r) => setTimeout(r, ms));
              vt.setDemoMode(mode);
              if (vt.activePresetId !== id) {
                vt.applyGalleryPreset(id, true);
                await wait(2500);
              }
              Calc.updateSettings({ expressionsCollapsed: true });
              vt.setTimePlaying(true);
              await wait(2500);
              const renderer =
                dim === "3d" ? vt.flow3d : vt.flowOverlay.renderer;
              const method = dim === "3d" ? "draw" : "frame";
              // Frames in which the flow drew, not draw calls: in 3D one
              // frame can draw more than once.
              const original = renderer[method];
              let drew = false;
              renderer[method] = function (...args) {
                drew = true;
                return original.apply(this, args);
              };
              let frames = 0;
              const start = performance.now();
              await new Promise((done) => {
                const tick = () => {
                  if (drew) frames++;
                  drew = false;
                  if (performance.now() - start < 3000)
                    requestAnimationFrame(tick);
                  else done();
                };
                requestAnimationFrame(tick);
              });
              renderer[method] = original;
              const fps = (frames * 1000) / (performance.now() - start);
              const analysis = Calc.expressionAnalysis;
              return {
                fps: Math.round(fps * 10) / 10,
                refused: Calc.getExpressions()
                  .filter((e) => analysis[e.id]?.isError)
                  .map((e) => `${e.id}: ${analysis[e.id].errorMessage}`),
                flowMessage: vt.flowMessage,
                legend: vt.colorLegend?.quantity,
                shown: Calc.getExpressions()
                  .filter(
                    (e) =>
                      e.id.includes("_object_") &&
                      e.type === "expression" &&
                      !e.hidden &&
                      !/(R|M|D|N)$/.test(e.id)
                  )
                  .map((e) => e.id.replace(/^.*_object_/, "")),
              };
            },
            id,
            mode,
            dim
          );
          console.log(dim, id, mode, JSON.stringify(report));
          await page.screenshot({
            path: join(out, `${id}-${dim}-${mode}.png`),
          });
        }
      if (errors.length > 0) console.log(dim, "page errors", errors);
      await page.close();
    }
  } finally {
    await b.close();
  }
})();
