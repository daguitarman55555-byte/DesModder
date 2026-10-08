// How long Desmos itself takes to redraw the charges preset's objects when
// the distance changes: from setting d to a watcher on d hearing it, which
// Desmos tells only once it has recomputed the whole graph. With the exact
// field lines and the equipotentials each on and off.
//
//   node docs/mockups/vector-3d-arrows/charges-desmos-cost.cjs
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
  const out = await page.evaluate(async () => {
    const vt = DSM.enabledPlugins["vector-tools"];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    vt.applyGalleryPreset("charges", true);
    await wait(5000);
    const helper = Calc.HelperExpression({ latex: "d" });
    const lag = async (value) => {
      const t0 = performance.now();
      await new Promise((done) => {
        const check = () => {
          if (helper.numericValue === value) done();
          else setTimeout(check, 2);
        };
        vt.setPresetVariable("vector_tools_variables_d", value);
        check();
      });
      return Math.round(performance.now() - t0);
    };
    const set = (n, v) =>
      vt.setPresetVariable(`vector_tools_variables_${n}`, v);
    const round = async () => [await lag(6), await lag(5), await lag(7)];
    const r = {};
    set("sequi", 1);
    await wait(2000);
    r.linesAndEquipotentials = await round();
    set("sequi", 0);
    await wait(2000);
    r.linesOnly = await round();
    set("slines", 0);
    await wait(2000);
    r.neither = await round();
    set("sequi", 1);
    await wait(2000);
    r.equipotentialsOnly = await round();
    return r;
  });
  console.log(JSON.stringify(out));
  await b.close();
})();
