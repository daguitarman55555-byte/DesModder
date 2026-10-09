// The demo mode switch, live: a preset in Explanatory, a slider set, then
// Majestic and back, checking the slider kept its value, nothing Desmos
// refuses, and which of the preset's objects show. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/demo-mode.cjs
//
// Writes docs/assets/vector-3d/demo-mode/<preset>-<2d|3d>-<mode>.png.
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const { mkdirSync } = require("node:fs");
const root = join(__dirname, "..", "..", "..");
const out = join(root, "docs", "assets", "vector-3d", "demo-mode");
mkdirSync(out, { recursive: true });
const cases = [
  ["calculator", "charges", "vector_tools_variables_q1", 2],
  ["calculator", "cellular", undefined, 0],
  ["3d", "capacitor", "vector_tools_variables_s", -1],
];
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  for (const [product, id, slider, value] of cases) {
    const dims = product === "3d" ? "3d" : "2d";
    const page = await b.newPage();
    await page.setViewport({ width: 1300, height: 820 });
    await page.goto(`https://www.desmos.com/${product}`);
    await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
    await page.evaluate(() => DSM.enablePlugin("vector-tools"));
    await page.waitForFunction(
      () => DSM.enabledPlugins["vector-tools"] !== undefined
    );
    for (const mode of ["explanatory", "majestic", "explanatory"]) {
      const report = await page.evaluate(
        async (id, slider, value, mode) => {
          const vt = DSM.enabledPlugins["vector-tools"];
          if (vt.activePresetId !== id) {
            vt.setDemoMode("explanatory");
            vt.applyGalleryPreset(id, true);
            if (!vt.presetWindow.open) vt.togglePresetWindow();
            await new Promise((r) => setTimeout(r, 2500));
            if (slider !== undefined) vt.setPresetVariable(slider, value);
          }
          vt.setDemoMode(mode);
          await new Promise((r) => setTimeout(r, 4000));
          const analysis = Calc.expressionAnalysis;
          const shown = Calc.getState()
            .expressions.list.filter(
              (e) =>
                e.id.includes("_object_") &&
                e.type === "expression" &&
                !e.hidden
            )
            .map((e) => e.id.replace(/^.*_object_/, ""));
          return {
            mode: vt.demoMode,
            errors: Calc.getExpressions()
              .filter((e) => analysis[e.id]?.isError)
              .map((e) => e.id),
            slider:
              slider === undefined
                ? null
                : vt.presetVariables.find((v) => v.id === slider)?.current,
            backdrop: vt.getConfig().flow.backdropEnabled,
            palette: vt.getConfig().flow.palette,
            legend: vt.colorLegend?.quantity,
            shown,
          };
        },
        id,
        slider,
        value,
        mode
      );
      console.log(dims, id, JSON.stringify(report));
      await page.screenshot({ path: join(out, `${id}-${dims}-${mode}.png`) });
    }
    await page.close();
  }
  await b.close();
})();
