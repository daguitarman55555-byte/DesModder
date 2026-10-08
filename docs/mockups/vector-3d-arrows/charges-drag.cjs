// The Electric charges preset as a teacher uses it in 2D: the presets window
// open on its switches, and the probe dragged across the graph with the
// mouse, its arrows following. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/charges-drag.cjs
//
// Writes docs/assets/vector-3d/charges-window.png and charges-dragged.png.
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
  await page.setViewport({ width: 1300, height: 850 });
  await page.goto("https://www.desmos.com/calculator");
  await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForFunction(
    () => DSM.enabledPlugins["vector-tools"] !== undefined
  );
  await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.applyGalleryPreset("charges", true);
    if (!vt.presetWindow.open) vt.togglePresetWindow();
    await new Promise((r) => setTimeout(r, 5000));
  });
  // Tick "Each charge's arrow" in the window, as a teacher would.
  const ticked = await page.evaluate(() => {
    const labels = [...document.querySelectorAll(".dsm-preset-window-switch")];
    const row = labels.find((l) => l.textContent.includes("Each charge"));
    row?.querySelector("input")?.click();
    return labels.map((l) => l.textContent.trim());
  });
  console.log("switches in the window:", JSON.stringify(ticked));
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "charges-window.png"),
  });
  // Drag the probe from (0, 3) to (-2, -3).
  const [from, to] = await page.evaluate(() => {
    const px = (x, y) => {
      // From the graph paper's corner, and the paper runs under the
      // expression list, so only the header above it is added.
      const p = Calc.mathToPixels({ x, y });
      const top = document
        .querySelector(".dcg-graph-outer")
        .getBoundingClientRect().top;
      return { x: p.x, y: top + p.y };
    };
    return [px(0, 3), px(-2, -3)];
  });
  console.log("drag from", JSON.stringify(from), "to", JSON.stringify(to));
  console.log(
    "drag mode",
    await page.evaluate(() =>
      JSON.stringify(
        Calc.expressionAnalysis["vector_tools_variables_object_probe"]
      )
    )
  );
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++)
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / 20,
      from.y + ((to.y - from.y) * i) / 20
    );
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 2500));
  const after = await page.evaluate(() =>
    DSM.enabledPlugins["vector-tools"].presetVariables
      .filter((v) => v.name.startsWith("p_"))
      .map((v) => `${v.name}=${v.current}`)
  );
  console.log("probe after the drag:", JSON.stringify(after));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "charges-dragged.png"),
  });
  await b.close();
})();
