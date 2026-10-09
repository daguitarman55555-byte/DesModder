// Frames per second of each physics preset, Moving, on 2D and 3D: the
// spinning cylinder writes its scene clock into the graph thirty times a
// second, and every write is a Desmos recompute, so it is the one to watch.
// Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/physics-fps.cjs [ids…]
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const root = join(__dirname, "..", "..", "..");
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "charges",
      "wires",
      "earth-moon",
      "cylinder",
      "capacitor",
      "bar-magnet",
      "dipole",
      "shell-theorem",
      "uniform-field",
    ];
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  for (const product of ["calculator", "3d"]) {
    const page = await b.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(`https://www.desmos.com/${product}`);
    await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
    await page.evaluate(() => DSM.enablePlugin("vector-tools"));
    await page.waitForFunction(
      () => DSM.enabledPlugins["vector-tools"] !== undefined
    );
    for (const id of ids) {
      const fps = await page.evaluate(async (id) => {
        const vt = DSM.enabledPlugins["vector-tools"];
        vt.applyGalleryPreset(id, true);
        vt.setPresetsStill(false);
        await new Promise((r) => setTimeout(r, 4000));
        let n = 0;
        const start = performance.now();
        await new Promise((done) => {
          const f = () => {
            n++;
            if (performance.now() - start < 3000) requestAnimationFrame(f);
            else done();
          };
          requestAnimationFrame(f);
        });
        return Math.round((n * 1000) / (performance.now() - start));
      }, id);
      console.log(`${product === "3d" ? "3d" : "2d"} ${id}: ${fps} fps`);
    }
    await page.close();
  }
  await b.close();
})();
