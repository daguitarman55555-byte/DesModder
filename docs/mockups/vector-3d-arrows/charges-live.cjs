// Loads the Electric charges preset with the extension, on Desmos 2D and 3D,
// and reports any of its objects Desmos refuses; then turns every switch on.
// Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/charges-live.cjs [2d|3d]
//
// Writes docs/assets/vector-3d/charges-{2d,3d}{,-all}.png.
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const root = join(__dirname, "..", "..", "..");
const only = process.argv[2];
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  for (const dims of ["2d", "3d"]) {
    if (only !== undefined && only !== dims) continue;
    const page = await b.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(
      `https://www.desmos.com/${dims === "3d" ? "3d" : "calculator"}`
    );
    await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
    await page.evaluate(() => DSM.enablePlugin("vector-tools"));
    await page.waitForFunction(
      () => DSM.enabledPlugins["vector-tools"] !== undefined
    );
    const loaded = await page.evaluate(async () => {
      const vt = DSM.enabledPlugins["vector-tools"];
      vt.applyGalleryPreset("charges", true);
      await new Promise((r) => setTimeout(r, 4000));
      const analysis = Calc.expressionAnalysis;
      const errors = Calc.getExpressions()
        .filter((e) => analysis[e.id]?.isError)
        .map((e) => `${e.id}: ${analysis[e.id].errorMessage}`);
      return {
        count: Calc.getExpressions().length,
        errors,
        flow: vt.flowMessage ?? "",
        running: vt.isFlowRunning,
        switches: vt.presetVariables
          .filter((v) => v.toggle !== undefined)
          .map((v) => `${v.toggle}=${v.current}`),
      };
    });
    console.log(dims, JSON.stringify(loaded, null, 1));
    await new Promise((r) => setTimeout(r, 3000));
    await page.screenshot({
      path: join(root, "docs", "assets", "vector-3d", `charges-${dims}.png`),
    });
    const all = await page.evaluate(async () => {
      const vt = DSM.enabledPlugins["vector-tools"];
      for (const v of vt.presetVariables)
        if (v.toggle !== undefined) vt.setPresetVariable(v.id, 1);
      await new Promise((r) => setTimeout(r, 3000));
      const analysis = Calc.expressionAnalysis;
      return Calc.getExpressions()
        .filter((e) => analysis[e.id]?.isError)
        .map((e) => `${e.id}: ${analysis[e.id].errorMessage}`);
    });
    console.log(dims, "all switches on, errors:", JSON.stringify(all));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({
      path: join(
        root,
        "docs",
        "assets",
        "vector-3d",
        `charges-${dims}-all.png`
      ),
    });
    await page.close();
  }
  await b.close();
})();
