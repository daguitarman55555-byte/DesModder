// The Electric charges preset on Desmos 3D as a teacher uses it: names on,
// every arrow on, and the probe dragged with the mouse, which Desmos 3D does
// not do itself. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/charges-3d-drag.cjs
//
// Writes docs/assets/vector-3d/charges-3d-names.png and charges-3d-dragged.png.
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const root = join(__dirname, "..", "..", "..");
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto("https://www.desmos.com/3d");
  await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForFunction(
    () => DSM.enabledPlugins["vector-tools"] !== undefined
  );
  const errors = await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.applyGalleryPreset("charges", true);
    await new Promise((r) => setTimeout(r, 2000));
    for (const v of vt.presetVariables)
      if (v.toggle !== undefined) vt.setPresetVariable(v.id, 1);
    await new Promise((r) => setTimeout(r, 5000));
    const analysis = Calc.expressionAnalysis;
    return Calc.getExpressions()
      .filter((e) => analysis[e.id]?.isError)
      .map((e) => `${e.id}: ${analysis[e.id].errorMessage}`);
  });
  console.log("errors:", JSON.stringify(errors));
  const names = await page.evaluate(() =>
    [...document.querySelectorAll(".dsm-vector-tools-scene3d > span")].map(
      (s) =>
        `${s.textContent} ${s.style.display === "none" ? "hidden" : s.style.transform}`
    )
  );
  console.log("names:", JSON.stringify(names));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "charges-3d-names.png"),
  });
  // Where the probe is on screen, from the same camera the layer uses.
  const from = await page.evaluate(() => {
    const canvas = document.querySelector("canvas.dcg-webgl-canvas");
    const r = canvas.getBoundingClientRect();
    const vt = DSM.enabledPlugins["vector-tools"];
    const layer = vt.scene3d;
    const camera = layer.currentCamera();
    const at = layer.probe.at();
    // projectToScreen, inline: the plugin's module is not on window.
    const m = (a, b) => {
      const o = new Array(16).fill(0);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          for (let k = 0; k < 4; k++)
            o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
      return o;
    };
    const c = m(camera.projection, m(camera.view, camera.world));
    const [x, y, z] = at;
    const cx = c[0] * x + c[4] * y + c[8] * z + c[12];
    const cy = c[1] * x + c[5] * y + c[9] * z + c[13];
    const cw = c[3] * x + c[7] * y + c[11] * z + c[15];
    return {
      x: r.left + ((cx / cw + 1) * camera.width) / 2,
      y: r.top + ((1 - cy / cw) * camera.height) / 2,
      at,
    };
  });
  console.log("probe on screen:", JSON.stringify(from));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++)
    await page.mouse.move(from.x - 6 * i, from.y + 5 * i);
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 2500));
  const after = await page.evaluate(() =>
    DSM.enabledPlugins["vector-tools"].presetVariables
      .filter((v) => v.name.startsWith("p_"))
      .map((v) => `${v.name}=${v.current}`)
  );
  console.log("probe after the drag:", JSON.stringify(after));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "charges-3d-dragged.png"),
  });
  await b.close();
})();
