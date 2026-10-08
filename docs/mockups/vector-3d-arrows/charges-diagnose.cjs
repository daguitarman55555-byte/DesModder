// Why the charges preset's field might not follow its sliders, and where its
// frame time goes: the values the renderer receives before and after a
// charge changes, and frames per second with each kind of object on or off.
//
//   node docs/mockups/vector-3d-arrows/charges-diagnose.cjs [2d|3d]
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const root = join(__dirname, "..", "..", "..");
const dims = process.argv[2] ?? "2d";
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
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
  const out = await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fps = async (ms = 2500) => {
      let n = 0;
      const start = performance.now();
      await new Promise((done) => {
        const f = () => {
          n++;
          if (performance.now() - start < ms) requestAnimationFrame(f);
          else done();
        };
        requestAnimationFrame(f);
      });
      return Math.round((n * 1000) / (performance.now() - start));
    };
    vt.applyGalleryPreset("charges", true);
    await wait(5000);
    // Everything the renderers were last handed, and every value watched.
    const params = () => ({
      handed: Object.fromEntries(vt.parameterValues ?? new Map()),
      watched: Object.fromEntries(
        [...(vt.parameterHelpers ?? new Map())].map(([k, h]) => [
          k,
          h.numericValue,
        ])
      ),
    });
    const compiled = vt.is3d ? vt.field3dCompilation : vt.flowCompilation;
    const report = {
      compiledOk: compiled.ok,
      compiledParams: compiled.ok ? compiled.field.params : compiled,
      before: params(),
    };
    vt.setPresetVariable("vector_tools_variables_q1", 4);
    vt.setPresetVariable("vector_tools_variables_d", 8);
    await wait(1500);
    report.after = params();
    report.fpsDefault = await fps();
    const set = (name, value) =>
      vt.setPresetVariable(`vector_tools_variables_${name}`, value);
    set("slines", 0);
    await wait(1500);
    report.fpsNoLines = await fps();
    vt.toggleFlow();
    await wait(1500);
    report.fpsNoLinesNoFlow = await fps();
    set("slines", 1);
    await wait(1500);
    report.fpsLinesNoFlow = await fps();
    vt.toggleFlow();
    await wait(1500);
    // A drag, as the probe sliders see it: 30 changes, timed.
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) {
      set("px", -3 + i * 0.2);
      await new Promise((r) => requestAnimationFrame(r));
    }
    report.msPerDragFrame = Math.round((performance.now() - t0) / 30);
    return report;
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
