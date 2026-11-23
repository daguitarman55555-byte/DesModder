/* eslint-disable no-console, @typescript-eslint/no-require-imports */
// Runs Physics Lab's integrator, through the Calculus tab mock-up's engine, on
// representative integrals from each family in GUIDE.md, and writes RESULTS.md.
//   node docs/mockups/calculus-tab/build.mjs
//   node docs/research/integral-families/bench.cjs
//
// Indefinite cases pass when the engine finds a closed form and its own check
// (differentiating back at sample points) agrees. Families the guide calls
// non-elementary expect a series answer. Definite cases pass when the value
// matches the expected one to 1e-6.
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const r = String.raw;
// [family, label, latex, expected]: expected is "closed", "series", or a number.
const CASES = [
  [
    "F01",
    "power sum",
    r`\int\left(3x^{2}-\frac{2}{x}+\sqrt{x}\right)dx`,
    "closed",
  ],
  ["F01", "binomial cube", r`\int\left(2x+1\right)^{3}dx`, "closed"],
  ["F01", "over a monomial", r`\int\frac{x^{3}+1}{x^{2}}dx`, "closed"],
  ["F02", "affine exponential", r`\int e^{3x+1}dx`, "closed"],
  ["F02", "base 2", r`\int2^{x}dx`, "closed"],
  ["F02", "secant", r`\int\sec\left(x\right)dx`, "closed"],
  ["F02", "cosecant", r`\int\csc\left(x\right)dx`, "closed"],
  ["F02", "tan of 2x", r`\int\tan\left(2x\right)dx`, "closed"],
  ["F03", "sin cos", r`\int\sin\left(x\right)\cos\left(x\right)dx`, "closed"],
  ["F03", "#31 |e^x-3|", r`\int\sqrt{e^{2x}-6e^{x}+9}dx`, "closed"],
  [
    "F03",
    "#52 root of a square",
    r`\int\sqrt{\left(e^{2x}+1\right)^{2}}dx`,
    "closed",
  ],
  [
    "F03",
    "four-factor square",
    r`\int\sqrt{x\left(x+1\right)\left(x+2\right)\left(x+3\right)+1}dx`,
    "closed",
  ],
  ["F04", "x e^{x^2}", r`\int xe^{x^{2}}dx`, "closed"],
  [
    "F04",
    "cot as a quotient",
    r`\int\frac{\cos\left(x\right)}{\sin\left(x\right)}dx`,
    "closed",
  ],
  ["F04", "e^{√x}/√x", r`\int\frac{e^{\sqrt{x}}}{\sqrt{x}}dx`, "closed"],
  ["F04", "ln x / x", r`\int\frac{\ln\left(x\right)}{x}dx`, "closed"],
  [
    "F04",
    "#386 chain-rule square",
    r`\int2\sin\left(2x\right)\left(1-\cos\left(2x\right)\right)dx`,
    "closed",
  ],
  ["F05", "x^5 √(x^3+1)", r`\int x^{5}\sqrt{x^{3}+1}dx`, "closed"],
  ["F05", "x^3 √(x^2+1)", r`\int x^{3}\sqrt{x^{2}+1}dx`, "closed"],
  ["F05", "x/√(2x+1)", r`\int\frac{x}{\sqrt{2x+1}}dx`, "closed"],
  ["F05", "#420 with n=3", r`\int\frac{x^{5}}{x^{3}+1}dx`, "closed"],
  ["F06", "D>0 arctan", r`\int\frac{1}{x^{2}+4x+13}dx`, "closed"],
  ["F06", "D<0 log", r`\int\frac{1}{x^{2}-5x+6}dx`, "closed"],
  ["F06", "linear over quadratic", r`\int\frac{3x+2}{x^{2}+2x+5}dx`, "closed"],
  ["F06", "D=0", r`\int\frac{1}{x^{2}+2x+1}dx`, "closed"],
  ["F07", "1/√(4-x^2)", r`\int\frac{1}{\sqrt{4-x^{2}}}dx`, "closed"],
  ["F07", "√(x^2+9)", r`\int\sqrt{x^{2}+9}dx`, "closed"],
  ["F07", "√(9-x^2)", r`\int\sqrt{9-x^{2}}dx`, "closed"],
  ["F07", "completed square", r`\int\frac{1}{\sqrt{x^{2}+2x+5}}dx`, "closed"],
  ["F07", "split numerator", r`\int\frac{x+1}{\sqrt{x^{2}+4}}dx`, "closed"],
  ["F08", "distinct roots", r`\int\frac{1}{x^{3}-x}dx`, "closed"],
  ["F08", "division first", r`\int\frac{x^{4}}{x^{2}-1}dx`, "closed"],
  [
    "F08",
    "repeated quadratic",
    r`\int\frac{1}{\left(x^{2}+1\right)^{2}}dx`,
    "closed",
  ],
  ["F08", "x^4+1", r`\int\frac{1}{x^{4}+1}dx`, "closed"],
  ["F08", "#405 x^5+1", r`\int\frac{1}{x^{5}+1}dx`, "closed"],
  [
    "F09",
    "#347 (x-1)^2(x+1)^5",
    r`\int\frac{1}{\left(x-1\right)^{2}\left(x+1\right)^{5}}dx`,
    "closed",
  ],
  ["F10", "x^3 e^{2x}", r`\int x^{3}e^{2x}dx`, "closed"],
  ["F10", "e^x cos 2x", r`\int e^{x}\cos\left(2x\right)dx`, "closed"],
  ["F10", "x^2 sin x", r`\int x^{2}\sin\left(x\right)dx`, "closed"],
  ["F10", "x e^x sin x", r`\int xe^{x}\sin\left(x\right)dx`, "closed"],
  ["F11", "x^2 ln x", r`\int x^{2}\ln\left(x\right)dx`, "closed"],
  ["F11", "(ln x)^2", r`\int\ln\left(x\right)^{2}dx`, "closed"],
  ["F11", "x ln(x^2+1)", r`\int x\ln\left(x^{2}+1\right)dx`, "closed"],
  ["F12", "arctan", r`\int\arctan\left(x\right)dx`, "closed"],
  ["F12", "x arctan", r`\int x\arctan\left(x\right)dx`, "closed"],
  ["F12", "arcsin", r`\int\arcsin\left(x\right)dx`, "closed"],
  [
    "F13",
    "sin^3 cos^2",
    r`\int\left(\sin\left(x\right)\right)^{3}\cos^{2}\left(x\right)dx`,
    "closed",
  ],
  [
    "F13",
    "sin^2 cos^2",
    r`\int\sin^{2}\left(x\right)\cos^{2}\left(x\right)dx`,
    "closed",
  ],
  ["F13", "cos^5", r`\int\left(\cos\left(x\right)\right)^{5}dx`, "closed"],
  ["F14", "tan^3", r`\int\left(\tan\left(x\right)\right)^{3}dx`, "closed"],
  ["F14", "sec^3", r`\int\left(\sec\left(x\right)\right)^{3}dx`, "closed"],
  [
    "F14",
    "sec^4 tan",
    r`\int\left(\sec\left(x\right)\right)^{4}\tan\left(x\right)dx`,
    "closed",
  ],
  ["F14", "√tan", r`\int\sqrt{\tan\left(x\right)}dx`, "closed"],
  [
    "F15",
    "sin 3x cos 5x",
    r`\int\sin\left(3x\right)\cos\left(5x\right)dx`,
    "closed",
  ],
  ["F15", "1/(2+cos)", r`\int\frac{1}{2+\cos\left(x\right)}dx`, "closed"],
  ["F15", "1/(1+sin)", r`\int\frac{1}{1+\sin\left(x\right)}dx`, "closed"],
  ["F16", "1/(x√(x^2-1))", r`\int\frac{1}{x\sqrt{x^{2}-1}}dx`, "closed"],
  ["F16", "conjugate", r`\int\frac{1}{\sqrt{x+1}+\sqrt{x}}dx`, "closed"],
  [
    "F16",
    "#242 reciprocal quartic",
    r`\int\frac{x^{2}-1}{\left(x^{2}+1\right)\sqrt{x^{4}+1}}dx`,
    "closed",
  ],
  [
    "F17",
    "|x^2-3x+2| on [0,3]",
    r`\int_{0}^{3}\left|x^{2}-3x+2\right|dx`,
    11 / 6,
  ],
  [
    "F17",
    "#258 ln(1+tan)",
    r`\int_{0}^{\frac{\pi}{4}}\ln\left(1+\tan\left(x\right)\right)dx`,
    (Math.PI * Math.LN2) / 8,
  ],
  ["F17", "odd x^3 cos x", r`\int_{-1}^{1}x^{3}\cos\left(x\right)dx`, 0],
  [
    "F17",
    "#409 odd radical",
    r`\int_{-1}^{1}x\sqrt{x^{2}+\cos\left(x\right)}dx`,
    0,
  ],
  [
    "F18",
    "#329 cos/(6^x+1)",
    r`\int_{-\frac{\pi}{4}}^{\frac{\pi}{4}}\frac{\cos\left(x\right)}{6^{x}+1}dx`,
    Math.SQRT1_2,
  ],
  [
    "F18",
    "sin^3/(sin^3+cos^3)",
    r`\int_{0}^{\frac{\pi}{2}}\frac{\left(\sin\left(x\right)\right)^{3}}{\left(\sin\left(x\right)\right)^{3}+\left(\cos\left(x\right)\right)^{3}}dx`,
    Math.PI / 4,
  ],
  [
    "F19",
    "Wallis sin^6",
    r`\int_{0}^{\frac{\pi}{2}}\left(\sin\left(x\right)\right)^{6}dx`,
    (5 * Math.PI) / 32,
  ],
  [
    "F19",
    "ln sin",
    r`\int_{0}^{\frac{\pi}{2}}\ln\left(\sin\left(x\right)\right)dx`,
    (-Math.PI * Math.LN2) / 2,
  ],
  [
    "F19",
    "#414 quadratic-trig",
    r`\int_{0}^{\frac{\pi}{2}}\frac{\cos^{2}\left(x\right)}{\cos^{2}\left(x\right)+4\sin^{2}\left(x\right)}dx`,
    Math.PI / 6,
  ],
  ["F20", "1/(e^x+1)", r`\int\frac{1}{e^{x}+1}dx`, "closed"],
  ["F20", "e^x/(e^{2x}+1)", r`\int\frac{e^{x}}{e^{2x}+1}dx`, "closed"],
  [
    "F20",
    "x sin^2(ln x)",
    r`\int_{0}^{1}x\sin^{2}\left(\ln\left(x\right)\right)dx`,
    0.125,
  ],
  [
    "F21",
    "e^x(sin+cos)",
    r`\int e^{x}\left(\sin\left(x\right)+\cos\left(x\right)\right)dx`,
    "closed",
  ],
  [
    "F21",
    "#393 e^x(1-sin)/(1-cos)",
    r`\int_{\frac{\pi}{2}}^{\pi}e^{x}\frac{1-\sin\left(x\right)}{1-\cos\left(x\right)}dx`,
    Math.exp(Math.PI / 2),
  ],
  [
    "F22",
    "#417 (x^2-x)/ln x",
    r`\int_{0}^{1}\frac{x^{2}-x}{\ln\left(x\right)}dx`,
    Math.log(1.5),
  ],
  [
    "F22",
    "#423 arctan difference",
    r`\int_{0}^{\infty}\frac{\arctan\left(2x\right)-\arctan\left(x\right)}{x}dx`,
    (Math.PI / 2) * Math.LN2,
  ],
  [
    "F22",
    "#424 ln x/(x^2+1)",
    r`\int_{0}^{\infty}\frac{\ln\left(x\right)}{x^{2}+1}dx`,
    0,
  ],
  [
    "F22",
    "#425 damped sine",
    r`\int_{0}^{\infty}e^{-x}\frac{\sin\left(x\right)}{x}dx`,
    Math.PI / 4,
  ],
  [
    "F22",
    "#426 ln(2+cos)",
    r`\int_{0}^{\pi}\ln\left(2+\cos\left(x\right)\right)dx`,
    Math.PI * Math.log((2 + Math.sqrt(3)) / 2),
  ],
  ["F23", "Si", r`\int\frac{\sin\left(x\right)}{x}dx`, "series"],
  [
    "F23",
    "#297 (cos x^3 - 4)/x^2",
    r`\int\frac{\cos\left(x^{3}\right)-4}{x^{2}}dx`,
    "series",
  ],
  [
    "F23",
    "(e^x-1)/x on [0,1]",
    r`\int_{0}^{1}\frac{e^{x}-1}{x}dx`,
    1.3179021514544038,
  ],
  ["F24", "ln(1+x)/x", r`\int\frac{\ln\left(1+x\right)}{x}dx`, "series"],
  [
    "F24",
    "ln(1+e^{-x}) on [0,∞)",
    r`\int_{0}^{\infty}\ln\left(1+e^{-x}\right)dx`,
    (Math.PI * Math.PI) / 12,
  ],
  [
    "F24",
    "arctan x / x on [0,1]",
    r`\int_{0}^{1}\frac{\arctan\left(x\right)}{x}dx`,
    0.915965594177219,
  ],
];

const html = `<div id=c style="width:600px;height:400px"></div><script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const engine = path.join(__dirname, "../../mockups/calculus-tab/engine.js");
  // A page per case: one case can loop forever, and a stuck page can't be
  // interrupted, only closed.
  let page;
  const freshPage = async () => {
    page = await browser.newPage();
    await page.setContent(html);
    await page.waitForFunction(() => window.Desmos);
    await page.addScriptTag({ path: engine });
    await page.evaluate(() => {
      const calc = Desmos.GraphingCalculator(document.getElementById("c"));
      CalcEngine.init(Desmos, calc);
    });
  };
  const LIMIT = 20000;
  const out = [];
  await freshPage();
  for (const [, label, latex] of CASES) {
    const run = page.evaluate((latex) => {
      const defs = CalcEngine.readGraph([]);
      const opts = { useSliderValues: false, depth: "simple", seriesTerms: 6 };
      const t = performance.now();
      try {
        const a = CalcEngine.analyze(latex, defs, opts);
        return {
          status: a.status,
          error: a.error,
          latex: a.answer?.latex,
          decimal: a.answer?.decimal,
          verdict: a.answer?.verdict,
          method: a.answer?.method,
          ms: performance.now() - t,
        };
      } catch (e) {
        return { status: "THROW", error: String(e), ms: performance.now() - t };
      }
    }, latex);
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve(undefined), LIMIT)
    );
    const o = await Promise.race([run, timeout]);
    if (o === undefined) {
      out.push({
        status: "timeout",
        error: `over ${LIMIT / 1000} s`,
        ms: LIMIT,
      });
      run.catch(() => {});
      await page.close().catch(() => {});
      await freshPage();
    } else out.push(o);
    console.log(
      label,
      out.at(-1).status,
      out.at(-1).verdict ?? out.at(-1).error
    );
  }
  await browser.close();

  const rows = CASES.map(([family, label, latex, expected], i) => {
    const o = out[i];
    let result;
    if (o.status === "timeout") result = "timeout";
    else if (o.status !== "ok") result = "error";
    else if (typeof expected === "number") {
      const v = Number(o.decimal ?? o.latex);
      result =
        o.verdict === "Not decided"
          ? "miss"
          : Number.isFinite(v) && Math.abs(v - expected) < 1e-6
            ? o.verdict === "Proved"
              ? "pass"
              : "numeric"
            : "WRONG";
    } else if (o.verdict === "Proved, checked by differentiating back")
      result = expected === "closed" ? "pass" : "pass (closed beats series)";
    else if (o.verdict === "Series answer")
      result = expected === "series" ? "pass" : "series only";
    else if (o.verdict === "Checked numerically, not proved")
      result = "CHECK FAILED";
    else result = "miss";
    return { family, label, latex, expected, result, ...o };
  });

  const tally = {};
  for (const row of rows) tally[row.result] = (tally[row.result] ?? 0) + 1;
  console.log(tally);
  const cell = (s) =>
    String(s ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  const md = [
    "# Integral families: what the current engine does",
    "",
    `Run ${new Date().toISOString().slice(0, 10)} by \`bench.cjs\` on Physics Lab's integrator (through the Calculus tab mock-up engine). ${rows.length} cases from the families in GUIDE.md.`,
    "",
    "Results: " +
      Object.entries(tally)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ") +
      ".",
    "",
    "- **pass**: closed form whose derivative matched, the expected series, or a proved definite value.",
    "- **numeric**: right definite value, but found by quadrature, not proved.",
    "- **series only**: an elementary antiderivative exists, but only a series came back.",
    "- **CHECK FAILED**: a formula came back whose derivative did not match at the sample points (wrong, or right only on part of the domain).",
    "- **WRONG**: a definite value that disagrees with the known one.",
    "- **miss**: nothing decided.",
    "",
    "| Family | Case | Result | Answer | ms |",
    "|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.family} | ${cell(row.label)} | ${row.result} | ${cell(
          row.status === "ok"
            ? row.latex
              ? `\`${row.latex.slice(0, 90)}\`${row.decimal ? ` ≈ ${row.decimal}` : ""}`
              : row.method
            : row.error
        )} | ${row.ms.toFixed(0)} |`
    ),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(__dirname, "RESULTS.md"), md);
})();
