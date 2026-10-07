// Frames per second of every gallery preset, 2D and 3D, on the real Desmos
// pages through the built extension. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/preset-fps.cjs
//
// Headless Chrome here draws on the machine's real GPU, so these are real
// frame rates for a 1100×760 window (rAF caps them at the display's 60).
// ONLY=black-hole,lorenz and PRODUCTS=3d narrow it down.
const puppeteer = require("puppeteer");
const { join } = require("node:path");

const root = join(__dirname, "..", "..", "..");

async function measure(page, product) {
  await page.goto(`https://www.desmos.com/${product}`);
  await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForFunction(
    () => DSM.enabledPlugins["vector-tools"] !== undefined
  );
  const only = process.env.ONLY?.split(",");
  const ids = (
    await page.evaluate(() =>
      DSM.enabledPlugins["vector-tools"].gallery.map((p) => p.id)
    )
  ).filter((id) => only === undefined || only.includes(id));
  const rows = [];
  for (const id of ids) {
    await page.evaluate((id) => {
      const vt = DSM.enabledPlugins["vector-tools"];
      if (vt.isFlowRunning) vt.toggleFlow();
      vt.applyGalleryPreset(id, true);
      if (!vt.isFlowRunning) vt.toggleFlow();
    }, id);
    await new Promise((r) => setTimeout(r, 1500));
    const fps = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const times = [];
          const tick = (t) => {
            times.push(t);
            if (times.length < 121) requestAnimationFrame(tick);
            else {
              const gaps = times.slice(1).map((t, i) => t - times[i]);
              gaps.sort((a, b) => a - b);
              resolve({
                fps: 1000 / (gaps.reduce((a, b) => a + b) / gaps.length),
                p95: gaps[Math.floor(gaps.length * 0.95)],
              });
            }
          };
          requestAnimationFrame(tick);
        })
    );
    rows.push({ product, id, ...fps });
  }
  return rows;
}

(async () => {
  const extension = join(root, "dist");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 760 });
  const products = (process.env.PRODUCTS ?? "calculator,3d").split(",");
  const rows = [];
  for (const product of products) rows.push(...(await measure(page, product)));
  for (const r of rows)
    console.log(
      `${r.product.padEnd(11)}${r.id.padEnd(15)}${r.fps.toFixed(1).padStart(6)} fps   p95 ${r.p95.toFixed(1)} ms`
    );
  await browser.close();
})();
