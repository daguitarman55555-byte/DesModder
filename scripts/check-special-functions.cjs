/* eslint-disable no-console, @typescript-eslint/no-require-imports */
// Every special function's Desmos definition, evaluated by live Desmos at
// sample points and compared with the JavaScript value in src/symbolic/special.ts.
//   node scripts/check-special-functions.cjs
const path = require("path");
const os = require("os");
const fs = require("fs");
const esbuild = require("esbuild");
const puppeteer = require("puppeteer");

const SAMPLES = {
  Gamma: [[0.5], [3.7], [-1.5]],
  Gamma_r: [[0.5], [-2], [-1.5]],
  B: [
    [2, 3],
    [0.5, 0.5],
  ],
  psi: [[1], [0.3], [-0.5], [10]],
  zeta: [[2], [3], [0.5], [-1.5]],
  erf: [[0.7]],
  erfc: [[0.7]],
  erfi: [[0.7]],
  Si: [[2], [-5]],
  Ci: [[0.5], [7]],
  Shi: [[1.5]],
  Chi: [[1.5]],
  Ei: [[1], [-2], [3]],
  li: [[2], [10]],
  Li_2: [[0.5], [-1], [1], [-3]],
  S: [[1.2]],
  C: [[1.2]],
  J: [
    [0, 1],
    [2, 3.5],
  ],
  W: [[1], [-0.2], [10]],
  K: [[0.5], [0.9]],
  E: [
    [1, 1, 1.5],
    [2, 1, -4],
    [0.5, 1, -1],
  ],
};

void (async () => {
  const out = path.join(os.tmpdir(), "special-check.cjs");
  await esbuild.build({
    entryPoints: [path.join(__dirname, "../src/symbolic/special.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: out,
    logLevel: "silent",
  });
  const special = require(out);
  const fns = special.SPECIAL_FUNCTIONS;
  const definitions = special.desmosDefinitions(fns.map((f) => f.symbol));
  const probes = [];
  for (const f of fns)
    for (const args of SAMPLES[f.symbol] ?? []) {
      const call = f.notation
        .replace(/#(\d)/g, (_, i) => `${args[Number(i) - 1]}`)
        .replace(/^\\frac\{1\}\{\\Gamma(.*)\}$/, "\\Gamma_{r}$1");
      probes.push({
        symbol: f.symbol,
        args,
        call,
        expected: f.evaluate(...args),
      });
    }
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(
    `<div id=c style="width:600px;height:400px"></div><script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>`
  );
  await page.waitForFunction(() => window.Desmos);
  const results = await page.evaluate(
    async (definitions, probes) => {
      const calc = Desmos.GraphingCalculator(document.getElementById("c"));
      definitions.forEach((latex, i) =>
        calc.setExpression({ id: `d${i}`, latex })
      );
      probes.forEach((p, i) =>
        calc.setExpression({ id: `p${i}`, latex: p.call })
      );
      await new Promise((resolve) => setTimeout(resolve, 6000));
      const a = calc.expressionAnalysis;
      return {
        definitionErrors: definitions
          .map((latex, i) => [latex, a[`d${i}`]?.errorMessage])
          .filter(([, e]) => e),
        values: probes.map(
          (p, i) =>
            a[`p${i}`]?.evaluation?.value ?? a[`p${i}`]?.errorMessage ?? null
        ),
      };
    },
    definitions,
    probes
  );
  await browser.close();
  for (const [latex, error] of results.definitionErrors)
    console.log(`DEFINITION ERROR  ${latex}\n  ${error}`);
  let worst = 0;
  probes.forEach((p, i) => {
    const got = results.values[i];
    const error =
      typeof got === "number"
        ? Math.abs(got - p.expected) / Math.max(1, Math.abs(p.expected))
        : Infinity;
    worst = Math.max(worst, error === Infinity ? 0 : error);
    const flag = error > 1e-8 ? "  <-- " : "";
    console.log(
      `${p.symbol}(${p.args.join(", ")})  desmos ${got}  js ${p.expected}  rel ${error.toExponential(1)}${flag}`
    );
  });
  console.log(`worst relative error ${worst.toExponential(2)}`);
  fs.rmSync(out, { force: true });
})();
