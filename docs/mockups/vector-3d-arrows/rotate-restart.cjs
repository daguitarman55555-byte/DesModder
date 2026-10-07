// Turns the view through many angles with the 3D flow running and reports
// whether the flow ever started again (its step count falling back). Run
// after `npm run build`:
//
//   PRESET=black-hole node docs/mockups/vector-3d-arrows/rotate-restart.cjs
//
// With no PRESET, the default field with Auto particles.
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
  await page.setViewport({ width: 1000, height: 700 });
  await page.goto("https://www.desmos.com/3d");
  await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForFunction(
    () => DSM.enabledPlugins["vector-tools"] !== undefined
  );
  await page.evaluate((preset) => {
    const vt = DSM.enabledPlugins["vector-tools"];
    if (preset) vt.applyGalleryPreset(preset, true);
    if (!vt.isFlowRunning) vt.toggleFlow();
  }, process.env.PRESET ?? "");
  await new Promise((r) => setTimeout(r, 2000));
  let restarts = 0;
  let last = 0;
  const counts = new Set();
  for (let i = 0; i < 60; i++) {
    const f = await page.evaluate((i) => {
      const g = Calc.controller.grapher3d;
      const turn = i * 0.37;
      const tilt = 0.3 + 1.2 * Math.abs(Math.sin(i * 0.23));
      const cz = Math.cos(turn),
        sz = Math.sin(turn);
      const cx = Math.cos(tilt),
        sx = Math.sin(tilt);
      const m = g.controls.worldRotation3D
        .clone()
        .set(cz * sx, cz * cx, -sz, -cx, sx, 0, sz * sx, sz * cx, cz);
      g.controls.worldRotation3D = m;
      g.viewportController.animateToOrientation(m);
      g.transition.duration = 0;
      const vt = DSM.enabledPlugins["vector-tools"];
      return vt.flow3dFrame;
    }, i);
    await new Promise((r) => setTimeout(r, 150));
    const now = await page.evaluate(
      () => DSM.enabledPlugins["vector-tools"].flow3dFrame
    );
    if (now === undefined) continue;
    counts.add(now.particles);
    if (now.steps < last) restarts++;
    last = now.steps;
  }
  console.log(
    `restarts: ${restarts}; particle counts seen: ${[...counts].join(", ")}`
  );
  await b.close();
})();
