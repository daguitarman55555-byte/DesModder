const puppeteer = require("puppeteer");
const { join } = require("node:path");
const root = join(__dirname, "..", "..", "..");
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const shots = [];
  for (const id of ["black-hole", "spiral-galaxy", "lorenz"])
    for (const redraw of ["always", "auto"]) {
      const page = await b.newPage();
      await page.setViewport({ width: 900, height: 700 });
      await page.goto("https://www.desmos.com/3d");
      await page.waitForSelector(".dsm-pillbox-and-popover", {
        timeout: 60000,
      });
      await page.evaluate(() => DSM.enablePlugin("vector-tools"));
      await page.waitForFunction(
        () => DSM.enabledPlugins["vector-tools"] !== undefined
      );
      await page.evaluate(
        ({ id, redraw }) => {
          const vt = DSM.enabledPlugins["vector-tools"];
          vt.applyGalleryPreset(id, true);
          vt.setSpace3D("particleRedraw", redraw);
          if (!vt.isFlowRunning) vt.toggleFlow();
        },
        { id, redraw }
      );
      await new Promise((r) => setTimeout(r, 4000));
      const r = await page.evaluate(() =>
        Calc.controller.grapher3d.webglCanvas.getBoundingClientRect().toJSON()
      );
      const clip = {
        x: r.x + r.width * 0.2,
        y: r.y + r.height * 0.25,
        width: r.width * 0.6,
        height: r.height * 0.5,
      };
      const png = await page.screenshot({ encoding: "base64", clip });
      const mean = await page.evaluate(async (png) => {
        const img = await createImageBitmap(
          await (await fetch("data:image/png;base64," + png)).blob()
        );
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, img.width, img.height).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4)
          s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        return s / (d.length / 4);
      }, png);
      shots.push({
        png,
        caption: `${id} — ${redraw}: mean ${mean.toFixed(1)}`,
      });
      await page.close();
    }
  const sheet = await b.newPage();
  await sheet.setViewport({ width: 2 * 410 + 40, height: 400 });
  await sheet.setContent(
    `<style>body{margin:0;padding:14px;font:13px Arial}.g{display:grid;grid-template-columns:repeat(2,400px);gap:10px}img{width:400px;display:block}</style><div class="g">${shots.map((s) => `<figure style="margin:0"><img src="data:image/png;base64,${s.png}"><figcaption>${s.caption}</figcaption></figure>`).join("")}</div>`
  );
  await sheet.screenshot({
    path: join(root, "docs", "assets", "vector-3d", "kept-trails-compare.png"),
    fullPage: true,
  });
  await b.close();
  console.log(shots.map((s) => s.caption).join("\n"));
})();
