/* eslint-disable no-console, @typescript-eslint/no-require-imports */
// Runs the Calculus engine (engine.js, Physics Lab's real engines) on any
// inputs, in a real Desmos API page, and prints each answer with its verdict,
// method and time. For checking a batch of problems:
//   node docs/mockups/calculus-tab/probe.cjs "\int x e^{x}dx" "\frac{d}{dx}\sqrt{x}"
//   node docs/mockups/calculus-tab/probe.cjs --file problems.txt
// A file holds one input per line; blank lines and # comments are skipped.
// Rebuild engine.js first (build.mjs) after changing the engines.
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const fileAt = args.indexOf("--file");
const inputs =
  fileAt >= 0
    ? fs
        .readFileSync(args[fileAt + 1], "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#"))
    : args;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  await page.setContent(
    `<div id=c style="width:600px;height:400px"></div><script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>`
  );
  await page.waitForFunction(() => window.Desmos);
  await page.addScriptTag({ path: path.join(__dirname, "engine.js") });
  const out = await page.evaluate((cases) => {
    const calc = Desmos.GraphingCalculator(document.getElementById("c"));
    CalcEngine.init(Desmos, calc);
    const defs = CalcEngine.readGraph([]);
    const opts = { useSliderValues: false, depth: "standard", seriesTerms: 6 };
    return cases.map((c) => {
      const started = performance.now();
      try {
        const a = CalcEngine.analyze(c, defs, opts);
        return {
          c,
          ms: Math.round(performance.now() - started),
          status: a.status,
          error: a.error,
          answer: a.answer && {
            latex: a.answer.latex,
            verdict: a.answer.verdict,
            method: a.answer.method,
            notes: a.answer.notes,
          },
        };
      } catch (e) {
        return { c, status: "THROW", error: String(e) };
      }
    });
  }, inputs);
  for (const { c, ms, status, error, answer } of out) {
    console.log(`\n${c}`);
    if (answer)
      console.log(
        `  = ${answer.latex}\n  [${answer.verdict}] ${answer.method} (${ms} ms)${answer.notes.length ? `\n  notes: ${answer.notes.join(" | ")}` : ""}`
      );
    else console.log(`  ${status}: ${error ?? ""}`);
  }
  await browser.close();
})();
