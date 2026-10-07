// GPU and CPU milliseconds per frame of every gallery preset, 2D and 3D, on
// the real Desmos pages through the built extension, measured with WebGL
// timer queries around the renderer's own frame. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/preset-gpu.cjs
//
// ONLY=black-hole,lorenz and PRODUCTS=3d narrow it down. Headless Chrome here
// draws on the machine's real GPU, so the numbers are real.
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
    await new Promise((r) => setTimeout(r, 2000));
    const result = await page.evaluate(
      (product) =>
        new Promise((resolve) => {
          const vt = DSM.enabledPlugins["vector-tools"];
          const renderer =
            product === "3d" ? vt.flow3d : vt.flowOverlay.renderer;
          const method = product === "3d" ? "draw" : "frame";
          const { gl } = renderer;
          const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
          const original = renderer[method];
          const pending = [];
          const gpu = [];
          const cpu = [];
          let readbacks = 0;
          const readPixels = gl.readPixels;
          gl.readPixels = function (...args) {
            readbacks++;
            return readPixels.apply(this, args);
          };
          renderer[method] = function (...args) {
            const q = gl.createQuery();
            gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
            const t0 = performance.now();
            const out = original.apply(this, args);
            cpu.push(performance.now() - t0);
            gl.endQuery(ext.TIME_ELAPSED_EXT);
            pending.push(q);
            return out;
          };
          const poll = () => {
            while (
              pending.length > 0 &&
              gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)
            ) {
              const q = pending.shift();
              if (!gl.getParameter(ext.GPU_DISJOINT_EXT))
                gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
              gl.deleteQuery(q);
            }
            if (gpu.length >= 120) {
              renderer[method] = original;
              gl.readPixels = readPixels;
              const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
              resolve({
                gpu: med(gpu),
                gpu95: [...gpu].sort((x, y) => x - y)[
                  Math.floor(gpu.length * 0.95)
                ],
                cpu: med(cpu),
                readbacksPerSecond: readbacks / (cpu.length / 60),
              });
            } else requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
        }),
      product
    );
    rows.push({ product, id, ...result });
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
  const products = (process.env.PRODUCTS ?? "calculator,3d").split(",");
  const rows = [];
  for (const product of products) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 760 });
    rows.push(...(await measure(page, product)));
    await page.close();
  }
  let total = { calculator: 0, "3d": 0 };
  for (const r of rows) {
    total[r.product] += r.gpu;
    console.log(
      `${r.product.padEnd(11)}${r.id.padEnd(15)} gpu ${r.gpu.toFixed(2).padStart(6)} ms (p95 ${r.gpu95.toFixed(2).padStart(6)})  cpu ${r.cpu.toFixed(2).padStart(5)} ms  readbacks ${r.readbacksPerSecond.toFixed(1)}/s`
    );
  }
  for (const [k, v] of Object.entries(total))
    if (v > 0) console.log(`total gpu ${k}: ${v.toFixed(1)} ms`);
  await browser.close();
})();
