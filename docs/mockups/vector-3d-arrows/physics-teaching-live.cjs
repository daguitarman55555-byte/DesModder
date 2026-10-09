// Explicitly requested live-extension workflow, derived from charges-live/cost.
const puppeteer = require("puppeteer");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../../..");
const out =
  process.env.PHYSICS_OUTPUT ||
  path.resolve(root, "../../outputs/physics-teaching");
fs.mkdirSync(out, { recursive: true });
const ids = (
  process.env.PHYSICS_IDS ||
  "wires,earth-moon,cylinder,capacitor,bar-magnet,dipole,shell-theorem,uniform-field"
).split(",");
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--disable-extensions-except=${root}/dist`,
      `--load-extension=${root}/dist`,
    ],
  });
  const results = [];
  try {
    for (const dim of (process.env.PHYSICS_DIMS || "2d,3d").split(",")) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });
      await page.goto(
        "https://www.desmos.com/" + (dim === "3d" ? "3d" : "calculator")
      );
      await page.waitForSelector(".dsm-pillbox-and-popover", {
        timeout: 60000,
      });
      await page.evaluate(() => DSM.enablePlugin("vector-tools"));
      await page.waitForFunction(() => DSM.enabledPlugins["vector-tools"]);
      for (const id of ids) {
        const result = await page.evaluate(async (id) => {
          const vt = DSM.enabledPlugins["vector-tools"];
          vt.setTimePlaying(false);
          Calc.setBlank();
          vt.applyGalleryPreset(id, true);
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          await wait(id === "bar-magnet" ? 6000 : 2500);
          vt.setTimePlaying(false);
          const errors = () =>
            Calc.getExpressions()
              .filter((e) => Calc.expressionAnalysis[e.id]?.isError)
              .map((e) => ({
                id: e.id,
                latex: e.latex,
                error: Calc.expressionAnalysis[e.id].errorMessage,
              }));
          const defaults = errors(),
            vars = vt.presetVariables;
          const input = vars.find(
            (v) =>
              !v.toggle &&
              !v.name.startsWith("p_") &&
              !v.name.startsWith("s_") &&
              !v.name.startsWith("T_")
          );
          const helper = Calc.HelperExpression({ latex: input.name });
          await wait(200);
          const measure = async (variable = input, h = helper) => {
            const ms = [];
            for (const delta of [0.1, -0.1, 0.2]) {
              const value = Math.min(
                variable.max,
                Math.max(variable.min, variable.value + delta)
              );
              const start = performance.now();
              vt.setPresetVariable(variable.id, value);
              await new Promise((resolve, reject) => {
                const check = () => {
                  if (Math.abs(h.numericValue - value) < 1e-8) resolve();
                  else if (performance.now() - start > 15000)
                    reject(Error("timing timeout " + variable.name));
                  else setTimeout(check, 2);
                };
                check();
              });
              ms.push(performance.now() - start);
              await wait(80);
            }
            return ms;
          };
          const timing = await measure();
          if (vt.isFlowRunning) vt.toggleFlow();
          await wait(300);
          const nativeTiming = await measure();
          vt.setPresetVariable(input.id, input.value);
          await wait(300);
          for (const v of vars) if (v.toggle) vt.setPresetVariable(v.id, 1);
          await wait(1200);
          const allErrors = errors(),
            allTiming = await measure();
          vt.setPresetVariable(input.id, input.value);
          for (const v of vars)
            if (v.toggle) vt.setPresetVariable(v.id, v.value);
          if (!vt.isFlowRunning) vt.toggleFlow();
          await wait(800);
          const additionalSliders = [];
          for (const v of vars.filter(
            (v) => v.id !== input.id && !v.toggle && !/^(p_|s_|T_)/.test(v.name)
          )) {
            const h = Calc.HelperExpression({ latex: v.name });
            await wait(100);
            additionalSliders.push({ name: v.name, ms: await measure(v, h) });
            vt.setPresetVariable(v.id, v.value);
            await wait(100);
          }
          let clock;
          if (id === "cylinder") {
            vt.resetClock();
            vt.setTimePlaying(true);
            await wait(700);
            const moving = vt.clockReadout;
            vt.setTimePlaying(false);
            const paused = vt.clockReadout;
            await wait(300);
            const still = vt.clockReadout;
            vt.resetClock();
            await wait(150);
            clock = {
              moving,
              paused,
              still,
              reset: vt.clockReadout,
              native: Calc.getExpressions().find(
                (e) => e.id === "vector_tools_variables_Tscene"
              )?.latex,
            };
          }
          return {
            id,
            defaults,
            allErrors,
            timing,
            nativeTiming,
            allTiming,
            additionalSliders,
            clock,
            slider: input.name,
            flow: vt.flowMessage,
            flow3d: vt.flow3dMessage,
            running: vt.isFlowRunning,
          };
        }, id);
        result.dimension = dim;
        await page.screenshot({ path: path.join(out, `${id}-${dim}.png`) });
        const rect = await page.evaluate(() => {
          const r = document
            .querySelector(".dcg-grapher")
            .getBoundingClientRect();
          const w = Math.min(r.width, r.height) * 0.85;
          return {
            x: r.x + (r.width - w) / 2,
            y: r.y + (r.height - w * 0.74) / 2,
            width: w,
            height: w * 0.74,
          };
        });
        const png = await page.screenshot({ encoding: "base64", clip: rect });
        result.thumbnail = await page.evaluate(async (png) => {
          const b = await (await fetch("data:image/png;base64," + png)).blob();
          const im = await createImageBitmap(b);
          const c = document.createElement("canvas");
          c.width = 92;
          c.height = 68;
          c.getContext("2d").drawImage(im, 0, 0, 92, 68);
          return c.toDataURL("image/webp", 0.82);
        }, png);
        results.push(result);
        fs.writeFileSync(
          path.join(out, "live-results.json"),
          JSON.stringify(results, null, 2)
        );
        console.log(
          JSON.stringify({
            ...result,
            thumbnail: undefined,
            defaults: result.defaults.map((e) => ({
              id: e.id,
              error: e.error,
            })),
            allErrors: result.allErrors.map((e) => ({
              id: e.id,
              error: e.error,
            })),
          })
        );
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
