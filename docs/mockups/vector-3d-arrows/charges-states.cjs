// Loads GPT's standalone charges graphs (docs/research/physics-fields-gpt/
// follow-up/charges-{2d,3d}.state.json) into plain Desmos, with no extension,
// and reports every expression Desmos refuses. GPT checked them only
// structurally; this is the live check.
//
//   node docs/mockups/vector-3d-arrows/charges-states.cjs [state.json ...]
//
// Writes docs/assets/vector-3d/<name>-native.png for each.
const puppeteer = require("puppeteer");
const { join, basename } = require("node:path");
const { readFileSync } = require("node:fs");
const root = join(__dirname, "..", "..", "..");
const dir = join(root, "docs", "research", "physics-fields-gpt", "follow-up");
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [join(dir, "charges-2d.state.json"), join(dir, "charges-3d.state.json")];
(async () => {
  const b = await puppeteer.launch({ headless: "new" });
  for (const file of files) {
    const state = JSON.parse(readFileSync(file, "utf8"));
    const is3d = file.includes("-3d");
    const page = await b.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(`https://www.desmos.com/${is3d ? "3d" : "calculator"}`);
    await page.waitForFunction(() => window.Calc !== undefined, {
      timeout: 60000,
    });
    const report = await page.evaluate(async (s) => {
      // The fixtures carry a "format" note and maybe other keys Desmos
      // doesn't know; it takes version, graph, expressions.
      const clean = {
        version: s.version,
        graph: s.graph,
        expressions: s.expressions,
      };
      if (s.randomSeed) clean.randomSeed = s.randomSeed;
      try {
        Calc.setState(clean);
      } catch (e) {
        return { setState: String(e) };
      }
      await new Promise((r) => setTimeout(r, 4000));
      const errors = [];
      const analysis = Calc.expressionAnalysis;
      for (const e of Calc.getExpressions()) {
        const a = analysis[e.id];
        if (a?.isError) errors.push(`${e.id}: ${a.errorMessage}`);
      }
      return {
        count: Calc.getExpressions().length,
        errors,
      };
    }, state);
    console.log(basename(file), JSON.stringify(report, null, 1));
    const name = basename(file).replace(".state.json", "");
    await page.screenshot({
      path: join(root, "docs", "assets", "vector-3d", `${name}-native.png`),
    });
    await page.close();
  }
  await b.close();
})();
