/* eslint-disable no-console, @typescript-eslint/no-require-imports */
// Puts each answer the mock-up graphs into a fresh Desmos page, with the
// special-function definitions it brings, and compares Desmos's value at a
// point with the panel's.
//   node docs/mockups/calculus-tab/build.mjs
//   node docs/mockups/calculus-tab/graph-check.cjs
const puppeteer = require("puppeteer");
const path = require("path");

const CASES = [
  String.raw`\frac{d^{\pi}}{dx^{\pi}}\left(\cos\left(x\right)+x+e^{x}+\ln\left(x\right)\right)`,
  String.raw`\frac{d^{\frac{1}{2}}}{dt^{\frac{1}{2}}}\left(t^{2}+\sin\left(t\right)\right)`,
  String.raw`\frac{d^{-\frac{1}{2}}}{dx^{-\frac{1}{2}}}\left(e^{2x}\right)`,
];
const INTEGRALS = [
  String.raw`\int\frac{e^{x}}{x}dx`,
  String.raw`\int\frac{\ln\left(1+x\right)}{x}dx`,
  String.raw`\int\frac{\sin\left(3x\right)}{x}dx`,
  String.raw`\int e^{-x^{2}}dx`,
  String.raw`\int\cos\left(x^{2}\right)dx`,
  String.raw`\int\frac{1}{\ln\left(x\right)}dx`,
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(
    `<div id=c style="width:600px;height:400px"></div><script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>`
  );
  await page.waitForFunction(() => window.Desmos);
  await page.addScriptTag({ path: path.join(__dirname, "engine.js") });
  const rows = await page.evaluate(
    async (cases, integrals) => {
      const calc = Desmos.GraphingCalculator(document.getElementById("c"));
      CalcEngine.init(Desmos, calc);
      const defs = CalcEngine.readGraph([]);
      const opts = { useSliderValues: false, depth: "simple", seriesTerms: 6 };
      const jobs = [];
      for (const latex of cases) {
        const a = CalcEngine.analyze(latex, defs, opts);
        for (const d of a.fractional?.answers ?? [])
          if (d.graphLatex)
            jobs.push({
              label: `${latex.slice(0, 40)} | ${d.name}`,
              definitions: d.definitions,
              body: d.graphLatex,
              variable: a.variableLatex,
              expected: d.value,
            });
      }
      for (const latex of integrals) {
        const a = CalcEngine.analyze(latex, defs, opts);
        const graph = a.answer?.graph ?? [];
        const answer = graph.find((g) => g.latex.startsWith("y="));
        if (answer === undefined) continue;
        jobs.push({
          label: `${latex} | ${a.answer.verdict}`,
          definitions: graph.filter((g) => g !== answer).map((g) => g.latex),
          body: answer.latex.slice(2).replace(/\+C$/, ""),
          variable: "x",
          expected: undefined,
          derivativeOf: latex,
        });
      }
      const defined = new Set();
      let n = 0;
      for (const job of jobs) {
        for (const d of job.definitions)
          if (!defined.has(d)) {
            defined.add(d);
            calc.setExpression({ id: `d${n++}`, latex: d });
          }
      }
      jobs.forEach((job, i) => {
        const v = job.variable;
        calc.setExpression({
          id: `f${i}`,
          latex: `g_{${i}}\\left(${v}\\right)=${job.body}`,
        });
        calc.setExpression({ id: `v${i}`, latex: `g_{${i}}\\left(2\\right)` });
        // For an antiderivative: its derivative at 2, which Desmos computes.
        calc.setExpression({
          id: `w${i}`,
          latex: `\\frac{d}{d${v}}g_{${i}}\\left(${v}\\right)`,
          hidden: true,
        });
        calc.setExpression({
          id: `q${i}`,
          latex: `h_{${i}}\\left(${v}\\right)=\\frac{d}{d${v}}g_{${i}}\\left(${v}\\right)`,
        });
        calc.setExpression({ id: `r${i}`, latex: `h_{${i}}\\left(2\\right)` });
      });
      await new Promise((r) => setTimeout(r, 15000));
      const an = calc.expressionAnalysis;
      return jobs.map((job, i) => ({
        label: job.label,
        expected: job.expected,
        desmos: an[`v${i}`]?.evaluation?.value ?? an[`v${i}`]?.errorMessage,
        derivative: an[`r${i}`]?.evaluation?.value,
        error: an[`f${i}`]?.errorMessage,
      }));
    },
    CASES,
    INTEGRALS
  );
  await browser.close();
  for (const r of rows) {
    const ok =
      r.expected === undefined
        ? ""
        : typeof r.desmos === "number" &&
            Math.abs(r.desmos - r.expected) <=
              1e-6 * Math.max(1, Math.abs(r.expected))
          ? "  agrees"
          : "  <-- DIFFERS";
    console.log(
      `${r.label}\n   desmos ${r.desmos}  panel ${r.expected ?? "-"}${ok}${r.expected === undefined ? `  derivative at 2: ${r.derivative}` : ""}${r.error ? `  ERROR ${r.error}` : ""}`
    );
  }
})();
