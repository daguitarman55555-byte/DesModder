const puppeteer = require("puppeteer"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, "../../.."),
    out = path.resolve(root, "../../outputs/physics-teaching"),
    b = await puppeteer.launch({
      headless: true,
      args: [
        `--disable-extensions-except=${root}/dist`,
        `--load-extension=${root}/dist`,
      ],
    });
  try {
    const p = await b.newPage();
    await p.setViewport({ width: 1200, height: 800 });
    await p.goto("https://www.desmos.com/3d");
    await p.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
    await p.evaluate(() => DSM.enablePlugin("vector-tools"));
    const result = [];
    for (const id of ["wires", "cylinder"]) {
      result.push(
        await p.evaluate(async (id) => {
          const v = DSM.enabledPlugins["vector-tools"],
            wait = (n) => new Promise((r) => setTimeout(r, n));
          Calc.setBlank();
          v.applyGalleryPreset(id, true);
          await wait(2000);
          v.setTimePlaying(false);
          for (const s of v.presetVariables.filter((s) => s.toggle))
            v.setPresetVariable(s.id, 1);
          await wait(700);
          let clock;
          if (id === "cylinder") {
            v.resetClock();
            v.setTimePlaying(true);
            await wait(600);
            v.setTimePlaying(false);
            clock = {
              seconds: v.clockReadout,
              native: Calc.getExpressions().find(
                (e) => e.id === "vector_tools_variables_Tscene"
              )?.latex,
            };
          }
          return {
            id,
            clock,
            errors: Calc.getExpressions()
              .filter((e) => Calc.expressionAnalysis[e.id]?.isError)
              .map((e) => ({
                id: e.id,
                error: Calc.expressionAnalysis[e.id].errorMessage,
              })),
          };
        }, id)
      );
      await p.screenshot({ path: path.join(out, `${id}-3d-names.png`) });
    }
    fs.writeFileSync(
      path.join(out, "options-live.json"),
      JSON.stringify(result, null, 2)
    );
    console.log(result);
  } finally {
    await b.close();
  }
})();
