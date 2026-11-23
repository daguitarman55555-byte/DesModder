/* eslint-disable no-console, @typescript-eslint/no-require-imports */
/**
 * Performance probe: loads the built extension (`dist/`) into a real Chrome
 * on desmos.com and measures what a user pays for it.
 *
 *   node scripts/perf/probe.cjs [scenario ...] [--runs=N] [--headful]
 *                               [--no-ext] [--profile]
 *
 * Scenarios (all by default): load, idle, pan-plain, vector-arrows,
 * vector-flow, matrix-exact, matrix-redraw, slope. Each prints main-thread
 * milliseconds per second of wall time (CDP `TaskDuration`), so "idle"
 * should be near zero and a running renderer's number is its share of a
 * core. Frame numbers come from a requestAnimationFrame sampler in the page
 * and are what the user sees.
 *
 * `--no-ext` runs plain Desmos (load, idle and pan-plain only), the baseline
 * the other numbers are an overhead on. `--profile` records a CPU profile of
 * each sample and prints the functions with the most self time, with the
 * script they live in — the extension is `script.js`, Desmos is
 * `calculator_desktop-*.js`.
 *
 * It is a probe, not a test: numbers move with the machine and the load on
 * it. Compare runs made back to back, never against a number in a commit.
 */
const path = require("path");
const puppeteer = require("puppeteer");

const args = process.argv.slice(2);
const runs = Number(args.find((a) => a.startsWith("--runs="))?.slice(7) ?? 3);
const headful = args.includes("--headful");
const noExt = args.includes("--no-ext");
const profile = args.includes("--profile");
const dispatches = args.includes("--dispatches");
const ALL = [
  "load",
  "idle",
  "pan-plain",
  "vector-arrows",
  "vector-flow",
  "matrix-exact",
  "matrix-redraw",
  "slope",
];
const chosen = args.filter((a) => !a.startsWith("--"));
const scenarios = chosen.length ? chosen : ALL;
const URL = process.env.DSM_TESTING_URL ?? "https://www.desmos.com/calculator";

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

async function metrics(client) {
  const { metrics } = await client.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

/** The top functions by self time in a CDP CPU profile. */
function printProfile({ nodes, samples, timeDeltas }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const self = new Map();
  for (let i = 0; i < samples.length; i++)
    self.set(samples[i], (self.get(samples[i]) ?? 0) + (timeDeltas[i] ?? 0));
  const byFn = new Map();
  const byFile = new Map();
  let total = 0;
  for (const [id, us] of self) {
    const { functionName, url, lineNumber, columnNumber } =
      byId.get(id).callFrame;
    if (functionName === "(idle)" || functionName === "(program)") continue;
    total += us;
    // Desmos's own code is eval'd by the preload, so it has no URL.
    const file = url.split("/").slice(-2).join("/") || "(eval'd or native)";
    const key = `${functionName || "(anonymous)"}  ${file}:${lineNumber + 1}:${columnNumber + 1}`;
    byFn.set(key, (byFn.get(key) ?? 0) + us);
    byFile.set(file, (byFile.get(file) ?? 0) + us);
  }
  const top = [...byFn]
    .sort((x, y) => y[1] - x[1])
    .filter(
      ([k], n) => n < 15 || (process.env.PROBE_OURS && /script.js/.test(k))
    )
    .slice(0, 40);
  console.log(`    profile: ${fmt(total / 1000)} ms of self time`);
  for (const [file, us] of [...byFile].sort((x, y) => y[1] - x[1]).slice(0, 6))
    console.log(`    ${fmt(us / 1000).padStart(8)} ms  in ${file}`);
  console.log("    --");
  for (const [key, us] of top)
    console.log(`    ${fmt(us / 1000).padStart(8)} ms  ${key}`);
}

/** Main-thread busy ms per wall second, and rAF frame stats, over `ms`. */
async function sample(page, client, ms) {
  await page.evaluate(() => {
    const w = window;
    w.__probeFrames = [];
    let last = performance.now();
    const tick = (t) => {
      w.__probeFrames.push(t - last);
      last = t;
      if (w.__probeFrames) w.__probeRaf = requestAnimationFrame(tick);
    };
    w.__probeRaf = requestAnimationFrame(tick);
  });
  if (profile) {
    await client.send("Profiler.enable");
    await client.send("Profiler.setSamplingInterval", { interval: 200 });
    await client.send("Profiler.start");
  }
  const a = await metrics(client);
  const t0 = Date.now();
  const counted = !dispatches
    ? undefined
    : page.evaluate(
        async (span) =>
          await new Promise((resolve) => {
            const counts = {};
            const stacks = new Map();
            const id = Calc.controller.dispatcher.register((e) => {
              counts[e.type] = (counts[e.type] ?? 0) + 1;
              // Who dispatched it: the first frames outside the dispatcher.
              if (!stacks.has(e.type))
                stacks.set(
                  e.type,
                  (new Error().stack ?? "")
                    .split("\n")
                    .slice(2, 12)
                    .map((line) => line.trim().slice(0, 110))
                    .join(" | ")
                );
            });
            setTimeout(() => {
              Calc.controller.dispatcher.unregister(id);
              if (window.__probeStacks) console.log(stacks);
              window.__probeLastStacks = Object.fromEntries(stacks);
              resolve(counts);
            }, span);
          }),
        ms - 200
      );
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (counted !== undefined) {
    const counts = Object.entries(await counted).sort((x, y) => y[1] - x[1]);
    console.log(
      `    dispatches: ${counts.map(([t, n]) => `${t} ${n}`).join(", ")}`
    );
    if (process.env.PROBE_STACKS)
      for (const [type, stack] of Object.entries(
        await page.evaluate(() => window.__probeLastStacks)
      ))
        console.log(`      ${type}: ${stack}`);
  }
  const b = await metrics(client);
  const wall = (Date.now() - t0) / 1000;
  if (profile) printProfile((await client.send("Profiler.stop")).profile);
  const frames = await page.evaluate(() => {
    const w = window;
    cancelAnimationFrame(w.__probeRaf);
    const f = w.__probeFrames.slice(2);
    delete w.__probeFrames;
    return f;
  });
  const sorted = [...frames].sort((x, y) => x - y);
  return {
    busyMsPerS: ((b.TaskDuration - a.TaskDuration) * 1000) / wall,
    scriptMsPerS: ((b.ScriptDuration - a.ScriptDuration) * 1000) / wall,
    fps: frames.length / wall,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? NaN,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? NaN,
    heapMB: b.JSHeapUsedSize / 2 ** 20,
  };
}

async function openPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const client = await page.createCDPSession();
  await client.send("Performance.enable");
  const profileLoad = profile && scenarios.includes("load");
  if (profileLoad) {
    await client.send("Profiler.enable");
    await client.send("Profiler.setSamplingInterval", { interval: 200 });
    await client.send("Profiler.start");
  }
  const t0 = Date.now();
  await page.goto(URL);
  await page.waitForSelector(
    noExt ? ".dcg-graph-outer" : ".dsm-pillbox-and-popover",
    { timeout: 60000 }
  );
  const loadMs = Date.now() - t0;
  if (profileLoad) printProfile((await client.send("Profiler.stop")).profile);
  await page.evaluate(() => Calc.setBlank());
  return { page, client, loadMs };
}

const VT_BUTTON = ".dsm-action-menu .dsm-icon-compass2";
const PL_BUTTON = ".dsm-action-menu .dcg-icon-scientific";

/** Pan the viewport a little every frame: what a user dragging the graph does. */
async function startPanning(page) {
  await page.evaluate(() => {
    const w = window;
    let k = 0;
    const pan = () => {
      k++;
      const d = Math.sin(k / 30) * 2;
      Calc.setMathBounds({ left: -10 + d, right: 10 + d, bottom: -6, top: 6 });
      w.__probePan = requestAnimationFrame(pan);
    };
    w.__probePan = requestAnimationFrame(pan);
  });
}

const settle = async (page) => {
  await page.evaluate(
    async () =>
      await new Promise((resolve) => {
        Calc.controller.evaluator.notifyWhenSynced?.(() => resolve());
        setTimeout(resolve, 3000);
      })
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
};

async function vectorField(page) {
  await page.evaluate(() => DSM.enablePlugin("vector-tools"));
  await page.waitForSelector(VT_BUTTON, { timeout: 20000 });
  await page.click(VT_BUTTON);
  await page.waitForSelector(".dsm-vector-tools-generate");
  await page.click(".dsm-vector-tools-generate");
  await settle(page);
}

async function matrix(page, route) {
  await page.evaluate(() => {
    Calc.setExpressions([
      { id: "c1", latex: "x^{2}+y^{2}=9" },
      { id: "c2", latex: String.raw`y=\sin x` },
      { id: "c3", latex: "y<x^{3}-2x" },
      { id: "c4", latex: String.raw`\left(3\cos t,\sin t\right)` },
    ]);
    DSM.enablePlugin("vector-tools");
  });
  await page.waitForSelector(VT_BUTTON, { timeout: 20000 });
  await page.evaluate(() =>
    DSM.enabledPlugins["vector-tools"].setArrowMode("off")
  );
  await page.click(VT_BUTTON);
  await page.click(
    ".dsm-vector-tools-tabs .dcg-segmented-control-btn:nth-child(5)"
  );
  await page.waitForSelector('[data-vector-tools="matrix"]');
  await page.evaluate((r) => {
    const m = DSM.enabledPlugins["vector-tools"].matrix;
    m.loadPreset("shear");
    m.setRoute(r);
  }, route);
  await page.click('#dsm-vector-tools-matrix-on [data-value="on"]');
  await settle(page);
  // Close the panel so the graph, not the panel, is what is drawn.
  await page.click(VT_BUTTON);
}

/** Each scenario sets a page up; the sample is taken of its steady state. */
const SETUPS = {
  async idle(page) {
    await page.evaluate(() =>
      Calc.setExpressions([
        { id: "a", latex: String.raw`y=\sin x` },
        { id: "b", latex: "x^{2}+y^{2}=4" },
      ])
    );
  },
  async "pan-plain"(page) {
    await SETUPS.idle(page);
    await startPanning(page);
  },
  async "vector-arrows"(page) {
    await vectorField(page);
    await page.click(VT_BUTTON);
    await startPanning(page);
  },
  async "vector-flow"(page) {
    await vectorField(page);
    // The Draw tab (second), with its folded sections open.
    await page.click(
      ".dsm-vector-tools-tabs .dcg-segmented-control-btn:nth-child(2)"
    );
    await page.evaluate(() =>
      document
        .querySelectorAll(".dsm-vector-tools-body details")
        .forEach((details) => (details.open = true))
    );
    await page.click(".dsm-vector-tools-visualize");
    await page.waitForSelector("#dsm-vector-tools-flow-canvas");
    await page.click(VT_BUTTON);
  },
  async "matrix-exact"(page) {
    await matrix(page, "exact");
    await startPanning(page);
  },
  async "matrix-redraw"(page) {
    await matrix(page, "redraw");
    await startPanning(page);
  },
  async slope(page) {
    await page.evaluate(() => DSM.enablePlugin("physics-lab"));
    await page.waitForSelector(PL_BUTTON, { timeout: 20000 });
    await page.click(PL_BUTTON);
    await page.waitForSelector(".dsm-physics-lab-draw");
    await page.click(".dsm-physics-lab-draw");
    await page.waitForSelector("#dsm-physics-lab-slope-canvas");
    await page.click(PL_BUTTON);
    await startPanning(page);
  },
};

/**
 * Puts the plugins' library settings back, the way the integration tests
 * do: the Matrix tab's map, for one, outlives the page, and left on it is
 * drawn under every later scenario.
 */
async function resetPlugins(page) {
  await page.evaluate(async () => {
    window.cancelAnimationFrame(window.__probePan);
    const vt = DSM.enabledPlugins["vector-tools"];
    if (vt !== undefined) {
      vt.matrix.reset();
      vt.matrix.syncNow();
      vt.resetConfig();
      vt.setPanelTab("field");
    }
    for (const id of ["vector-tools", "physics-lab"])
      if (DSM.enabledPlugins[id] !== undefined) DSM.disablePlugin(id);
    for (let i = 0; i < 100 && DSM.delaySetPluginSettings; i++)
      await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

async function main() {
  const ext = path.join(process.cwd(), "dist");
  const browser = await puppeteer.launch({
    headless: headful ? false : "new",
    args: [
      ...(noExt
        ? []
        : [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`]),
      "--enable-gpu",
      "--ignore-gpu-blocklist",
    ],
  });
  try {
    if (scenarios.includes("load")) {
      const loads = [];
      for (let i = 0; i < runs; i++) {
        const { page, loadMs } = await openPage(browser);
        loads.push(loadMs);
        await page.close();
      }
      console.log(
        `load        median ${median(loads)} ms to DesModder ready  (${loads.join(", ")})`
      );
    }
    for (const name of scenarios) {
      if (name === "load") continue;
      const results = [];
      let skipped;
      for (let i = 0; i < runs; i++) {
        const { page, client } = await openPage(browser);
        try {
          skipped = await SETUPS[name](page);
        } catch (e) {
          skipped = `failed to set up: ${String(e).split("\n")[0]}`;
        }
        if (skipped) {
          await page.close();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        results.push(await sample(page, client, 4000));
        await resetPlugins(page);
        await page.close();
      }
      if (skipped) {
        console.log(`${name.padEnd(12)}${skipped}`);
        continue;
      }
      const m = (k) => median(results.map((r) => r[k]));
      console.log(
        `${name.padEnd(12)}busy ${fmt(m("busyMsPerS"))} ms/s  script ${fmt(m("scriptMsPerS"))} ms/s  ` +
          `${fmt(m("fps"))} fps  frame p50 ${fmt(m("p50"))} p95 ${fmt(m("p95"))} ms  heap ${fmt(m("heapMB"))} MB`
      );
    }
  } finally {
    await browser.close();
  }
}

void main();
