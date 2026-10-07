// The 3D black hole under the views a user moves to: the box shifted off the
// hole, zoomed, unequal axes, and the camera above, level and below. Run
// after `npm run build`:
//
//   node docs/mockups/vector-3d-arrows/black-hole-views.cjs
//
// Writes docs/assets/vector-3d/black-hole-views.png.
const puppeteer = require("puppeteer");
const { join } = require("node:path");

const root = join(__dirname, "..", "..", "..");
const VIEWS = [
  { name: "default", tilt: 0.15 },
  { name: "box shifted +3 in x", tilt: 0.15, box: [-2, 8, -5, 5, -5, 5] },
  { name: "box shifted down 3", tilt: 0.15, box: [-5, 5, -5, 5, -2, 8] },
  { name: "zoomed out ±10", tilt: 0.15, box: [-10, 10, -10, 10, -10, 10] },
  { name: "flat box, z ±2", tilt: 0.15, box: [-5, 5, -5, 5, -2, 2] },
  { name: "from above", tilt: 0.9 },
  { name: "from below", tilt: -0.4 },
  { name: "turned", tilt: 0.3, turn: 2.2 },
  { name: "hole outside the box", tilt: 0.15, box: [3, 13, -5, 5, -5, 5] },
  { name: "hole at the box's edge", tilt: 0.15, box: [0, 10, -5, 5, -5, 5] },
  { name: "orthographic", tilt: 0.15, perspective: 0 },
  { name: "strong perspective", tilt: 0.15, perspective: 3 },
];

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
  for (const view of VIEWS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 700 });
    await page.goto("https://www.desmos.com/3d");
    await page.waitForSelector(".dsm-pillbox-and-popover", { timeout: 60000 });
    if (view.perspective !== undefined) {
      await page.evaluate((d) => {
        const s = Calc.getState();
        s.graph.perspectiveDistortion = d;
        Calc.setState(s);
      }, view.perspective);
    }
    if (view.box !== undefined) {
      await page.evaluate((b) => {
        const s = Calc.getState();
        s.graph.viewport = {
          xmin: b[0],
          xmax: b[1],
          ymin: b[2],
          ymax: b[3],
          zmin: b[4],
          zmax: b[5],
        };
        // Desmos 3D keeps the bounds as LaTeX too, and reads those.
        s.graph.__v12ViewportLatexStash = Object.fromEntries(
          Object.entries(s.graph.viewport).map(([k, v]) => [k, String(v)])
        );
        Calc.setState(s);
      }, view.box);
      await page
        .waitForFunction(
          (b) =>
            Calc.controller.grapher3d.viewportController.getViewport().xmin ===
            b[0],
          { timeout: 10000 },
          view.box ?? [-5]
        )
        .catch(() => console.log("viewport not applied:", view.name));
    }
    await page.evaluate(() => DSM.enablePlugin("vector-tools"));
    await page.waitForFunction(
      () => DSM.enabledPlugins["vector-tools"] !== undefined
    );
    await page.evaluate(
      ({ tilt, turn }) => {
        const vt = DSM.enabledPlugins["vector-tools"];
        vt.applyGalleryPreset("black-hole", true);
        const g = Calc.controller.grapher3d;
        const [cz, sz, cx, sx] = [
          Math.cos(tilt),
          Math.sin(tilt),
          Math.cos(turn),
          Math.sin(turn),
        ];
        const m = g.controls.worldRotation3D
          .clone()
          .set(cz * sx, cz * cx, -sz, -cx, sx, 0, sz * sx, sz * cx, cz);
        g.controls.worldRotation3D = m;
        g.viewportController.animateToOrientation(m);
        g.transition.duration = 0;
      },
      { tilt: view.tilt, turn: view.turn ?? 0.6 }
    );
    await new Promise((r) => setTimeout(r, 1500));
    for (const [key, motion] of [
      ["Shift", view.shiftDrag],
      [undefined, view.drag],
    ]) {
      if (motion === undefined) continue;
      const r = await page.evaluate(() =>
        Calc.controller.grapher3d.webglCanvas.getBoundingClientRect().toJSON()
      );
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      if (key !== undefined) await page.keyboard.down(key);
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + motion[0], cy + motion[1], { steps: 20 });
      await page.mouse.up();
      if (key !== undefined) await page.keyboard.up(key);
    }
    await new Promise((r) => setTimeout(r, 3000));
    const vp = await page.evaluate(() =>
      JSON.stringify(Calc.controller.grapher3d.viewportController.getViewport())
    );
    console.log(view.name, vp);
    const rect = await page.evaluate(() =>
      Calc.controller.grapher3d.webglCanvas.getBoundingClientRect().toJSON()
    );
    const png = await page.screenshot({ encoding: "base64", clip: rect });
    const message = await page.evaluate(
      () => DSM.enabledPlugins["vector-tools"].flowMessage
    );
    shots.push({ png, caption: view.name + (message ? ` — ${message}` : "") });
    await page.close();
  }
  const sheet = await browser.newPage();
  await sheet.setViewport({ width: 4 * 330 + 40, height: 400 });
  await sheet.setContent(`<style>body{margin:0;padding:14px;font:13px Arial;background:#fff}
    .g{display:grid;grid-template-columns:repeat(4,320px);gap:10px}figure{margin:0}
    img{width:320px;display:block}figcaption{color:#5f6670;padding:3px 0}</style>
    <div class="g">${shots
      .map(
        (s) =>
          `<figure><img src="data:image/png;base64,${s.png}"><figcaption>${s.caption}</figcaption></figure>`
      )
      .join("")}</div>`);
  await sheet.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "black-hole-views.png"),
    fullPage: true,
  });
  await browser.close();
  console.log("ok");
})();
