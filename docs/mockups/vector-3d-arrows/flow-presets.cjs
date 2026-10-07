// Pictures of the 3D flow on gallery presets, in the real Desmos 3D, through
// the built extension. Run after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/flow-presets.cjs
//
// Writes docs/assets/vector-3d/flow-presets.png, a contact sheet, and
// black-hole.png, the black hole nearly edge-on.
const puppeteer = require("puppeteer");
const { join } = require("node:path");

const root = join(__dirname, "..", "..", "..");
const PRESETS = [
  "black-hole",
  "spiral-galaxy",
  "binary",
  "aurora",
  "pulsar",
  "star-cluster",
  "cellular",
  "dipole",
  "lorenz",
  "thomas",
  "tornado",
  "smoke-ring",
  "karman",
  "solar-wind",
];
// Tilt for the black hole's own picture, radians from looking straight down:
// nearly edge-on, as the classic renderings are.
const HERO_TILT = Number(process.env.TILT ?? 1.4);

(async () => {
  const extension = join(root, "dist");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 760 });
  await page.goto("https://www.desmos.com/3d");
  await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForFunction(
    () => DSM.enabledPlugins["vector-tools"] !== undefined
  );
  const shots = [];
  for (const id of PRESETS) {
    await page.evaluate((id) => {
      const vt = DSM.enabledPlugins["vector-tools"];
      if (vt.isFlowRunning) vt.toggleFlow();
      vt.applyGalleryPreset(id, true);
      if (!vt.isFlowRunning) vt.toggleFlow();
    }, id);
    // Long enough for the trails to grow and the flow to settle.
    await new Promise((r) => setTimeout(r, 4000));
    const message = await page.evaluate(
      () => DSM.enabledPlugins["vector-tools"].flowMessage
    );
    if (message) console.log(id, message);
    const rect = await page.evaluate(() =>
      Calc.controller.grapher3d.webglCanvas.getBoundingClientRect().toJSON()
    );
    const png = await page.screenshot({ encoding: "base64", clip: rect });
    const name = await page.evaluate(
      () => DSM.enabledPlugins["vector-tools"].getConfig().name
    );
    shots.push({ png, caption: name });
  }
  // The black hole again, nearly edge-on.
  await page.evaluate(() => {
    const vt = DSM.enabledPlugins["vector-tools"];
    if (vt.isFlowRunning) vt.toggleFlow();
    vt.applyGalleryPreset("black-hole", true);
    if (!vt.isFlowRunning) vt.toggleFlow();
  });
  const box = await page.evaluate(() =>
    Calc.controller.grapher3d.webglCanvas.getBoundingClientRect().toJSON()
  );
  // Set outright, as camera3d.int.test.ts does: a drag carries momentum
  // and keeps turning after the mouse lets go.
  await page.evaluate((tilt) => {
    const g = Calc.controller.grapher3d;
    const [cz, sz, cx, sx] = [
      Math.cos(tilt),
      Math.sin(tilt),
      Math.cos(0.6),
      Math.sin(0.6),
    ];
    const m = g.controls.worldRotation3D
      .clone()
      .set(cz * sx, cz * cx, -sz, -cx, sx, 0, sz * sx, sz * cx, cz);
    g.controls.worldRotation3D = m;
    g.viewportController.animateToOrientation(m);
    g.transition.duration = 0;
  }, HERO_TILT);
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "black-hole.png"),
    clip: box,
  });
  const sheet = await browser.newPage();
  await sheet.setViewport({ width: 4 * 410 + 40, height: 400 });
  await sheet.setContent(`<style>body{margin:0;padding:14px;font:13px Arial;background:#fff}
    .g{display:grid;grid-template-columns:repeat(4,400px);gap:10px}figure{margin:0}
    img{width:400px;display:block}figcaption{color:#5f6670;padding:3px 0}</style>
    <div class="g">${shots
      .map(
        (s) =>
          `<figure><img src="data:image/png;base64,${s.png}"><figcaption>${s.caption}</figcaption></figure>`
      )
      .join("")}</div>`);
  await sheet.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "flow-presets.png"),
    fullPage: true,
  });
  await browser.close();
  console.log("ok");
})();
