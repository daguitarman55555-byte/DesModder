// The 3D charges' names after the view is turned: they have to stay on their
// arrows' tips. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/charges-3d-rotate.cjs
//
// Writes docs/assets/vector-3d/charges-3d-rotated.png.
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
  await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.applyGalleryPreset("charges", true);
    await new Promise((r) => setTimeout(r, 2000));
    for (const v of vt.presetVariables)
      if (v.toggle !== undefined) vt.setPresetVariable(v.id, 1);
    await new Promise((r) => setTimeout(r, 4000));
  });
  const before = await page.evaluate(() =>
    [...document.querySelectorAll(".dsm-vector-tools-scene3d > span")].map(
      (s) => s.style.transform
    )
  );
  // Turn the view 70 degrees about z, through the graph's own rotation:
  // a mouse drag in headless Chrome does not turn Desmos 3D.
  await page.evaluate(async () => {
    const s = Calc.getState();
    const a = (70 * Math.PI) / 180;
    const r = s.graph.worldRotation3D ?? [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const c = Math.cos(a);
    const n = Math.sin(a);
    // Row-major 3x3, the turn applied after the current rotation.
    const turn = [c, -n, 0, n, c, 0, 0, 0, 1];
    const m = [];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        m.push(
          r[i * 3] * turn[j] +
            r[i * 3 + 1] * turn[3 + j] +
            r[i * 3 + 2] * turn[6 + j]
        );
    s.graph.worldRotation3D = m;
    Calc.setState(s);
    await new Promise((r) => setTimeout(r, 4000));
  });
  console.log("names before turning:", JSON.stringify(before));
  const names = await page.evaluate(() =>
    [...document.querySelectorAll(".dsm-vector-tools-scene3d > span")].map(
      (s) =>
        `${s.textContent} ${s.style.display === "none" ? "hidden" : s.style.transform}`
    )
  );
  console.log("names after turning:", JSON.stringify(names));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "charges-3d-rotated.png"),
  });
  await b.close();
})();
