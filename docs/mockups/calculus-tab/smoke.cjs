/* eslint-disable no-console, @typescript-eslint/no-require-imports */
// Runs the mock-up's engine on its example requests in a real Desmos API page.
//   node docs/mockups/calculus-tab/smoke.cjs
const puppeteer = require("puppeteer");
const path = require("path");

const CASES = [
  String.raw`\frac{d}{dt}\left(t^{2}\sin\left(at\right)\right)`,
  String.raw`\int e^{-u^{2}}du`,
  String.raw`\int x\cos\left(x\right)dx`,
  String.raw`\int_{0}^{\pi}\sin\left(x\right)dx`,
  String.raw`\int_{0}^{1}\frac{\ln\left(1+x\right)}{x}dx`,
  String.raw`\lim_{h\to0}\frac{f\left(1+h\right)-f\left(1\right)}{h}`,
  String.raw`\lim_{x\to\infty}\left(1+\frac{1}{x}\right)^{x}`,
  String.raw`\lim_{x\to0^{+}}\frac{\left|x\right|}{x}`,
  String.raw`\frac{dp}{dt}=kp`,
  String.raw`y''=-4y`,
  String.raw`\sum_{n=1}^{\infty}\frac{1}{n^{2}}`,
  String.raw`\sum_{n=1}^{\infty}\frac{\left(-1\right)^{n+1}}{n}`,
  String.raw`x^{2}y`,
  String.raw`s^{3}`,
];
const PRECISE = [
  ["1.6449340668482264", "value"],
  ["0.9159655941772190", "value"],
  ["0.6931471805599453", "value"],
  ["0.693147180560", "value"],
  ["1.386294361120", "value"],
  [String.raw`\sum_{n=0}^{\infty}\frac{1}{2^{n}}`, "sum"],
  [String.raw`\sum_{n=1}^{\infty}\frac{1}{n^{2}}`, "sum"],
  [String.raw`\sum_{n=1}^{\infty}\frac{n}{n+1}`, "sum"],
];
const GRAPH = [
  "a=2",
  "k=0.5",
  String.raw`f\left(x\right)=\sin\left(x\right)e^{-\frac{x}{4}}`,
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  await page.setContent(
    `<div id=c style="width:600px;height:400px"></div><script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>`
  );
  await page.waitForFunction(() => window.Desmos);
  await page.addScriptTag({ path: path.join(__dirname, "engine.js") });
  const out = await page.evaluate(
    (cases, precise, graph) => {
      const calc = Desmos.GraphingCalculator(document.getElementById("c"));
      CalcEngine.init(Desmos, calc);
      const defs = CalcEngine.readGraph(graph);
      const opts = {
        useSliderValues: false,
        depth: "standard",
        seriesTerms: 6,
      };
      const run = (f) => {
        try {
          return f();
        } catch (e) {
          return { status: "THROW", error: String(e) };
        }
      };
      return {
        calculus: cases.map((c) => {
          const a = run(() => CalcEngine.analyze(c, defs, opts));
          return [c, a.status, a.summary, a.error, a.answer];
        }),
        precise: precise.map(([c, mode]) => {
          const r = run(() => CalcEngine.precise(c, mode, defs));
          return [c, r.status, r.closedLatex, r.verdict, r.error, r.rows];
        }),
      };
    },
    CASES,
    PRECISE,
    GRAPH
  );
  for (const [input, status, summary, error, answer] of out.calculus) {
    console.log(`\n${input}\n  ${status}  ${summary ?? ""} ${error ?? ""}`);
    if (answer)
      console.log(
        `  = ${answer.latex}  ${answer.decimal ?? ""}\n  [${answer.verdict}] ${answer.method}  steps:${answer.steps.length} ${answer.notes.join(" | ")}`
      );
  }
  for (const [input, status, closed, verdict, error, rows] of out.precise)
    console.log(
      `\nPRECISE ${input}\n  ${status} ${closed ?? ""} ${error ?? ""}\n  ${verdict}\n  ${JSON.stringify(rows)}`
    );
  await browser.close();
})();
