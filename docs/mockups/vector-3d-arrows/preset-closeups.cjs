// Larger pictures of a few presets, at a few moments each, for tuning one
// by eye. Run after `npm run build`:
//
//   ONLY=pulsar,binary PRODUCT=2d node docs/mockups/vector-3d-arrows/preset-closeups.cjs
//
// PRODUCT is 2d (the calculator) or 3d; SHOTS is how many moments, two
// seconds apart. Writes docs/assets/vector-3d/preset-closeups.png.
const puppeteer = require("puppeteer");
const { join } = require("node:path");

const root = join(__dirname, "..", "..", "..");
const IDS = (process.env.ONLY ?? "pulsar").split(",");
const THREE = process.env.PRODUCT === "3d";
const SHOTS = Number(process.env.SHOTS ?? 2);

(async () => {
  const extension = join(root, "dist");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  const shots = [];
  for (const id of IDS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 760 });
    await page.goto(
      THREE ? "https://www.desmos.com/3d" : "https://www.desmos.com/calculator"
    );
    await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
    await page.evaluate(() => DSM.enablePlugin("vector-tools"));
    await page.waitForFunction(
      () => DSM.enabledPlugins["vector-tools"] !== undefined
    );
    await page.evaluate((id) => {
      const vt = DSM.enabledPlugins["vector-tools"];
      vt.applyGalleryPreset(id, true);
      if (!vt.isFlowRunning) vt.toggleFlow();
    }, id);
    // TILT, in 3D: radians from looking straight down.
    if (THREE && process.env.TILT !== undefined)
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
      }, Number(process.env.TILT));
    await new Promise((r) => setTimeout(r, 4000));
    for (let k = 0; k < SHOTS; k++) {
      const rect = await page.evaluate((three) => {
        const el = three
          ? Calc.controller.grapher3d.webglCanvas
          : document.querySelector(".dcg-grapher");
        const r = el.getBoundingClientRect();
        const side = Math.min(r.width, r.height) * (three ? 0.85 : 1);
        return {
          x: r.x + (r.width - side) / 2,
          y: r.y + (r.height - side) / 2,
          width: side,
          height: side,
        };
      }, THREE);
      const png = await page.screenshot({ encoding: "base64", clip: rect });
      shots.push({ png, caption: `${id}, ${4 + 2 * k} s` });
      await new Promise((r) => setTimeout(r, 2000));
    }
    await page.close();
  }
  const sheet = await browser.newPage();
  await sheet.setViewport({ width: SHOTS * 520 + 40, height: 400 });
  await sheet.setContent(
    `<style>body{margin:0;padding:14px;font:13px Arial}.g{display:grid;grid-template-columns:repeat(${SHOTS},510px);gap:10px}img{width:510px;display:block}figure{margin:0}</style><div class="g">${shots
      .map(
        (s) =>
          `<figure><img src="data:image/png;base64,${s.png}"><figcaption>${s.caption}</figcaption></figure>`
      )
      .join("")}</div>`
  );
  await sheet.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "preset-closeups.png"),
    fullPage: true,
  });
  await browser.close();
  console.log("ok");
})();
