/* eslint-disable no-console, @typescript-eslint/no-require-imports */
// Drives the mock-up through its main paths and saves the pictures.
//   python -m http.server 8765 --directory docs/mockups   (in another shell)
//   node docs/mockups/calculus-tab/shots.cjs
const puppeteer = require("puppeteer");
const path = require("path");

const URL = "http://localhost:8765/calculus-tab/";
const OUT = path.join(__dirname, "../../assets");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(URL);
  await page.waitForFunction(
    () => document.querySelector("#calculus-body .answer") !== null,
    { timeout: 30000 }
  );
  const shot = async (name) => {
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, `calculus-tab-${name}.png`) });
    const text = await page.$eval("#panel", (p) => p.innerText.slice(0, 900));
    console.log(`\n=== ${name}\n${text.replace(/\n+/g, " | ")}`);
  };
  const type = async (latex) => {
    await page.evaluate((l) => {
      // The mock-up's own field, as a click on an example sets it.
      const field = document.querySelector("#calculus-body .field");
      const mq = Desmos.MathQuill.getInterface
        ? Desmos.MathQuill.getInterface(2)
        : Desmos.MathQuill;
      mq(field).latex(l);
    }, latex);
    await new Promise((r) => setTimeout(r, 400));
  };
  const clickText = async (scope, text) => {
    const ok = await page.evaluate(
      (scope, text) => {
        const b = [...document.querySelectorAll(`${scope} button`)].find(
          (x) => x.textContent.trim() === text
        );
        b?.click();
        return !!b;
      },
      scope,
      text
    );
    if (!ok) throw new Error(`No button "${text}" in ${scope}`);
    await new Promise((r) => setTimeout(r, 400));
  };

  await shot("derivative");

  await clickText("#calculus-body", "Every step");
  await shot("derivative-every-step");

  // A bare expression with two letters: nothing is guessed.
  await type(String.raw`r^{3}\cos\left(\theta\right)`);
  await shot("choose-variable");
  await page.evaluate(() =>
    [...document.querySelectorAll("#calculus-body .readback button")]
      .find((b) => b.textContent.includes("θ"))
      ?.click()
  );
  await new Promise((r) => setTimeout(r, 300));
  await clickText("#calculus-body .readback", "Integrate");
  await shot("integrate-theta");

  await type(String.raw`\int e^{-u^{2}}du`);
  await shot("series-fallback");

  await type(
    String.raw`\lim_{h\to0}\frac{f\left(1+h\right)-f\left(1\right)}{h}`
  );
  await shot("limit-graph-function");

  await type(String.raw`\frac{dp}{dt}=kp`);
  await clickText("#calculus-body", "Add to graph");
  await shot("ode-added");

  // Every definition of D^π, and the comparison of their values.
  await type(
    String.raw`\frac{d^{\pi}}{dx^{\pi}}\left(\cos\left(x\right)+x+e^{x}+\ln\left(x\right)\right)`
  );
  await new Promise((r) => setTimeout(r, 1200));
  await shot("fractional");
  await page.evaluate(() =>
    document.querySelectorAll("#calculus-body .answer")[3]?.scrollIntoView()
  );
  await shot("fractional-cards");

  // A special-function antiderivative, graphed with its definition.
  await type(String.raw`\int\frac{e^{x}}{x}dx`);
  await clickText("#calculus-body", "Add to graph");
  await shot("special-function");

  await page.click('#tabs [data-tab="precise"]');
  await clickText("#precise-body", "A sum or series");
  await page.evaluate(() => {
    const mq = Desmos.MathQuill.getInterface
      ? Desmos.MathQuill.getInterface(2)
      : Desmos.MathQuill;
    mq(document.querySelector("#precise-body .field")).latex(
      String.raw`\sum_{n=1}^{\infty}\frac{\left(-1\right)^{n+1}}{n}`
    );
  });
  await new Promise((r) => setTimeout(r, 1500));
  await shot("precise-sum");

  for (const icon of ["integral", "area", "tangent"]) {
    await page.click(`#mock [data-icon="${icon}"]`);
    await new Promise((r) => setTimeout(r, 150));
    await page.screenshot({
      path: path.join(OUT, `calculus-tab-icon-${icon}.png`),
      clip: { x: 1300, y: 140, width: 100, height: 60 },
    });
  }

  await page.setViewport({ width: 520, height: 820 });
  await page.click('#tabs [data-tab="calculus"]');
  await type(String.raw`\int_{0}^{1}\frac{\ln\left(1+x\right)}{x}dx`);
  await shot("narrow");

  console.log(
    errors.length ? `\nPAGE ERRORS: ${errors.join(" / ")}` : "\nno page errors"
  );
  await browser.close();
})();
