// Each 3D preset three ways, side by side: as drawn now; with every speed
// saving off (smooth lines, full trail detail, trails redrawn each frame);
// and without the presets' vivid colour push. For telling which change a
// difference in the picture comes from. Run after `npm run build`:
//
//   ONLY=binary,pulsar node docs/mockups/vector-3d-arrows/look-compare.cjs
//
// Writes docs/assets/vector-3d/look-compare.png.
const puppeteer = require("puppeteer");
const { join } = require("node:path");
const root = join(__dirname, "..", "..", "..");
const ALL = [
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
const IDS = process.env.ONLY ? process.env.ONLY.split(",") : ALL;
const WAYS = (process.env.WAYS ?? "now,full,plain").split(",");
(async () => {
  const ext = join(root, "dist");
  const b = await puppeteer.launch({
    headless: "new",
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const shots = [];
  for (const id of IDS)
    for (const way of WAYS) {
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
        ({ id, way }) => {
          const vt = DSM.enabledPlugins["vector-tools"];
          vt.applyGalleryPreset(id, true);
          if (way === "full") {
            vt.setSpace3D("particleSmooth", "on");
            vt.setSpace3D("particleDetail", "full");
            vt.setSpace3D("particleRedraw", "always");
          }
          if (way === "smooth") vt.setSpace3D("particleSmooth", "on");
          if (way === "detail") vt.setSpace3D("particleDetail", "full");
          if (way === "redraw") vt.setSpace3D("particleRedraw", "always");
          if (way === "plain")
            vt.updateConfig((c) => {
              c.flow.saturation = 1;
              c.flow.contrast = 1;
            });
          if (!vt.isFlowRunning) vt.toggleFlow();
        },
        { id, way }
      );
      await new Promise((r) => setTimeout(r, Number(process.env.WAIT ?? 4000)));
      const r = await page.evaluate(() =>
        Calc.controller.grapher3d.webglCanvas.getBoundingClientRect().toJSON()
      );
      const png = await page.screenshot({
        encoding: "base64",
        clip: {
          x: r.x + r.width * 0.15,
          y: r.y + r.height * 0.1,
          width: r.width * 0.7,
          height: r.height * 0.8,
        },
      });
      // Mean brightness, and mean colourfulness (max − min channel) of the
      // lit pixels: what "duller" and "greyer" mean, as numbers.
      const m = await page.evaluate(async (png) => {
        const img = await createImageBitmap(
          await (await fetch("data:image/png;base64," + png)).blob()
        );
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, img.width, img.height).data;
        let l = 0,
          ch = 0,
          lit = 0;
        for (let i = 0; i < d.length; i += 4) {
          const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          l += y;
          if (y > 40) {
            lit++;
            ch +=
              Math.max(d[i], d[i + 1], d[i + 2]) -
              Math.min(d[i], d[i + 1], d[i + 2]);
          }
        }
        return {
          luma: l / (d.length / 4),
          chroma: ch / Math.max(lit, 1),
          lit: lit / (d.length / 4),
        };
      }, png);
      shots.push({
        png,
        caption: `${id} — ${way}: luma ${m.luma.toFixed(1)}, colour ${m.chroma.toFixed(1)}, lit ${(100 * m.lit).toFixed(0)}%`,
      });
      console.log(shots[shots.length - 1].caption);
      await page.close();
    }
  const sheet = await b.newPage();
  const n = WAYS.length;
  await sheet.setViewport({ width: n * 330 + 40, height: 400 });
  await sheet.setContent(
    `<style>body{margin:0;padding:14px;font:12px Arial}.g{display:grid;grid-template-columns:repeat(${n},320px);gap:8px}img{width:320px;display:block}figure{margin:0}</style><div class="g">${shots.map((s) => `<figure><img src="data:image/png;base64,${s.png}"><figcaption>${s.caption}</figcaption></figure>`).join("")}</div>`
  );
  await sheet.screenshot({
    path: join(
      root,
      "docs",
      "assets",
      "vector-3d",
      process.env.OUT ?? "look-compare.png"
    ),
    fullPage: true,
  });
  await b.close();
  console.log("ok");
})();
