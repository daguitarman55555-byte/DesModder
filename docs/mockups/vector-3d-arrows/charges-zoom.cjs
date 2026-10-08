// Close-up of the charges preset in 2D: the flow under the objects, and the
// arrow names. Run after `npm run build`.
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
  await page.goto("https://www.desmos.com/calculator");
  await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForFunction(
    () => DSM.enabledPlugins["vector-tools"] !== undefined
  );
  const info = await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.applyGalleryPreset("charges", true);
    await new Promise((r) => setTimeout(r, 1000));
    vt.setPresetVariable("vector_tools_variables_snames", 1);
    vt.setPresetVariable("vector_tools_variables_sparts", 1);
    await new Promise((r) => setTimeout(r, 6000));
    const name = Calc.getState().expressions.list.find((e) =>
      e.id.endsWith("object_Ename")
    );
    const a = Calc.expressionAnalysis[name.id];
    return {
      name,
      analysis: a,
      config: {
        layer: vt.overlayLayer,
        flow: vt.getConfig().flow.backdropEnabled,
        color: vt.getConfig().color,
        mode: vt.getConfig().flow.colorMode,
      },
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "charges-2d-zoom.png"),
    clip: { x: 560, y: 180, width: 480, height: 360 },
  });
  await b.close();
})();
