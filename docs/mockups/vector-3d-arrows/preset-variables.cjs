// Loads a physics preset and checks its variables: sliders in the graph, a
// row each in the presets window, and setting one there moving the graph's.
// Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/preset-variables.cjs
//
// Writes docs/assets/vector-3d/preset-variables.png.
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
  const before = await page.evaluate(() => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.applyGalleryPreset("charges", true);
    if (!vt.presetWindow.open) vt.togglePresetWindow();
    return {
      graph: Calc.getExpressions().map(
        (e) => e.latex ?? `[${e.type}] ${e.title ?? ""}`
      ),
      variables: vt.presetVariables.map((v) => `${v.name}=${v.current}`),
      flow: vt.flowMessage ?? "",
      running: vt.isFlowRunning,
    };
  });
  console.log("loaded:", JSON.stringify(before, null, 1));
  await new Promise((r) => setTimeout(r, 3000));
  const after = await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.setPresetVariable("vector_tools_variables_q2", 1);
    await new Promise((r) => setTimeout(r, 500));
    return {
      variables: vt.presetVariables.map((v) => `${v.name}=${v.current}`),
      rows: document.querySelectorAll(".dsm-preset-window-variable").length,
    };
  });
  console.log("after setting q2 = 1:", JSON.stringify(after));
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "preset-variables.png"),
  });
  // Another preset replaces the folder; one with none removes it.
  const swapped = await page.evaluate(() => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.applyGalleryPreset("wires", true);
    const wires = Calc.getExpressions().filter((e) =>
      e.id.startsWith("vector_tools_variables")
    ).length;
    vt.applyGalleryPreset("lorenz", true);
    const none = Calc.getExpressions().filter((e) =>
      e.id.startsWith("vector_tools_variables")
    ).length;
    return { wires, none };
  });
  console.log("folder items, wires then lorenz:", JSON.stringify(swapped));
  await b.close();
})();
