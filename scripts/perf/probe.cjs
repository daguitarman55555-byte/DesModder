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
const fs = require("node:fs/promises");
const puppeteer = require("puppeteer");

const args = process.argv.slice(2);
const runs = Number(args.find((a) => a.startsWith("--runs="))?.slice(7) ?? 3);
const headful = args.includes("--headful");
const noExt = args.includes("--no-ext");
const profile = args.includes("--profile");
const dispatches = args.includes("--dispatches");
const flag = (name) =>
  args
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const workload = flag("work");
const shots = flag("shots");
const traces = flag("trace");
const gpu = args.includes("--gpu");
const capabilities = args.includes("--caps");
const artifactName = (name, run) =>
  `${name}-${workload ?? "default"}-${run + 1}`;
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
const scenarios = chosen.length ? chosen : noExt ? ALL.slice(0, 3) : ALL;
const tests3D = new Set([
  "plain-3d",
  "arrow-3d",
  "stream-3d",
  "particles-3d",
  "cloud-3d",
  "generated-3d",
]);
const capSizes = flag("sizes")?.split(",").map(Number) ?? [
  35, 50, 75, 100, 101,
];
if (!Number.isInteger(runs) || runs < 1)
  throw new Error("--runs must be a positive integer.");
if (
  workload &&
  !["idle", "pan", "zoom", "slider", "edit", "drag"].includes(workload)
)
  throw new Error(
    "Unknown --work. Use idle, pan, zoom, slider, edit, or drag."
  );
if (
  !capSizes.every((size) => Number.isInteger(size) && size > 0 && size <= 200)
)
  throw new Error(
    "--sizes takes positive grid sides up to 200 for this fixture."
  );
if (gpu && (profile || traces))
  throw new Error("Run GPU query, CPU profile, and trace samples separately.");
if (profile && traces)
  throw new Error("Run CPU profile and trace samples separately.");
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
  const targets = [
    { label: "page main thread", client },
    ...page
      .workers()
      .filter((worker) => worker.client)
      .map((worker) => ({
        label: `dedicated worker ${worker.url().slice(0, 120)}`,
        client: worker.client,
      })),
  ];
  const started = profile
    ? await Promise.allSettled(
        targets.map(async (target) => {
          await target.client.send("Profiler.enable");
          await target.client.send("Profiler.setSamplingInterval", {
            interval: 200,
          });
          await target.client.send("Profiler.start");
          return target;
        })
      )
    : [];
  const a = await metrics(client);
  const t0 = Date.now();
  const counted =
    !dispatches || noExt
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
  if (profile) {
    const profiles = await Promise.allSettled(
      started.map((target) =>
        target.status === "fulfilled"
          ? target.value.client.send("Profiler.stop")
          : Promise.reject(
              target.reason instanceof Error
                ? target.reason
                : new Error(String(target.reason))
            )
      )
    );
    for (const [i, result] of profiles.entries()) {
      console.log("   ", targets[i].label);
      if (result.status === "fulfilled") printProfile(result.value.profile);
      else console.log("    profiler unavailable:", String(result.reason));
    }
  }
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

async function openPage(browser, name) {
  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 800,
    deviceScaleFactor: Number(flag("dpr") ?? 1),
  });
  if (gpu) await page.evaluateOnNewDocument(installGpuProbe);
  const client = await page.createCDPSession();
  await client.send("Performance.enable");
  const profileLoad = profile && scenarios.includes("load");
  if (profileLoad) {
    await client.send("Profiler.enable");
    await client.send("Profiler.setSamplingInterval", { interval: 200 });
    await client.send("Profiler.start");
  }
  const t0 = Date.now();
  await page.goto(tests3D.has(name) ? "https://www.desmos.com/3d" : URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
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
  if (workload) return;
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

async function vectorField(page, keepLive = false) {
  await page.evaluate((live) => {
    DSM.enablePlugin("vector-tools");
    if (!live) DSM.enabledPlugins["vector-tools"].setArrowMode("off");
  }, keepLive);
  await page.waitForSelector(VT_BUTTON, { timeout: 20000 });
  await page.click(VT_BUTTON);
  await page.waitForSelector(".dsm-vector-tools-generate");
  await page.click(".dsm-vector-tools-generate");
  await settle(page);
}

async function matrix(page, route) {
  await page.evaluate((fixture) => {
    const expressions = [
      { id: "c1", latex: "x^{2}+y^{2}=9" },
      { id: "c2", latex: String.raw`y=a_{probe}\sin x` },
      { id: "c3", latex: "y<x^{3}-2x" },
      { id: "c4", latex: String.raw`\left(3\cos t,\sin t\right)` },
    ];
    if (fixture && !expressions.some((row) => row.id === fixture))
      throw new Error(
        "Use --matrix=c1 (implicit), c2 (explicit), c3 (region), or c4 (parametric)."
      );
    Calc.setExpressions(
      fixture ? expressions.filter((row) => row.id === fixture) : expressions
    );
    Calc.setExpression({
      id: "probe-slider",
      latex: "a_{probe}=1",
      hidden: true,
    });
    DSM.enablePlugin("vector-tools");
  }, flag("matrix"));
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
        { id: "a", latex: String.raw`y=a_{probe}\sin x` },
        { id: "b", latex: "x^{2}+y^{2}=4" },
        { id: "probe-slider", latex: "a_{probe}=1", hidden: true },
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
    await vectorField(page, true);
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
    await page.evaluate(() =>
      DSM.enabledPlugins["vector-tools"].setArrowMode("off")
    );
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

/** Install before the page starts. Use isolated passes for timings and tracing. */
function installGpuProbe() {
  const counters = new Map();
  const contexts = new WeakMap();
  const pending = [];
  const glProto = WebGL2RenderingContext.prototype;
  let frame = 0;
  let active = false;
  const tick = () => {
    if (!active) return;
    frame++;
    for (let i = pending.length - 1; i >= 0; i--) {
      const { gl, ext, query, stats } = pending[i];
      if (gl.isContextLost() || gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        for (let j = pending.length - 1; j >= 0; j--) {
          const entry = pending[j];
          if (entry.gl !== gl) continue;
          entry.stats.disjoint++;
          gl.deleteQuery(entry.query);
          pending.splice(j, 1);
        }
        i = pending.length;
      } else if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        stats.ms.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(query);
        pending.splice(i, 1);
      }
    }
    requestAnimationFrame(tick);
  };
  for (const method of [
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced",
  ]) {
    const original = glProto[method];
    glProto[method] = function (...values) {
      const { id } = this.canvas;
      if (!active || !id?.startsWith("dsm-"))
        return original.apply(this, values);
      if (!contexts.has(this))
        contexts.set(
          this,
          this.getExtension("EXT_disjoint_timer_query_webgl2")
        );
      const ext = contexts.get(this);
      const key = `${id}/${method}`;
      let stats = counters.get(key);
      if (!stats) {
        stats = { calls: 0, missed: 0, disjoint: 0, supported: !!ext, ms: [] };
        counters.set(key, stats);
      }
      stats.calls++;
      if (
        !ext ||
        frame % 6 !== 0 ||
        pending.length >= 256 ||
        this.isContextLost()
      )
        return original.apply(this, values);
      if (this.getQuery(ext.TIME_ELAPSED_EXT, this.CURRENT_QUERY)) {
        stats.missed++;
        return original.apply(this, values);
      }
      const query = this.createQuery();
      if (!query) return original.apply(this, values);
      this.beginQuery(ext.TIME_ELAPSED_EXT, query);
      try {
        return original.apply(this, values);
      } finally {
        this.endQuery(ext.TIME_ELAPSED_EXT);
        pending.push({ gl: this, ext, query, stats });
      }
    };
  }
  window.__probeGpu = {
    start() {
      active = true;
      requestAnimationFrame(tick);
    },
    stop() {
      active = false;
      for (const { gl, query } of pending) gl.deleteQuery(query);
      const results = Object.fromEntries(counters);
      return { unresolved: pending.splice(0).length, draws: results };
    },
  };
}

async function browserCapabilities(page) {
  return page.evaluate(async () => {
    const empty = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0);
    // Module exporting no functions with one no-op SIMD instruction.
    const simd = Uint8Array.of(
      ...empty,
      1,
      4,
      1,
      96,
      0,
      0,
      3,
      2,
      1,
      0,
      10,
      9,
      1,
      7,
      0,
      65,
      0,
      253,
      15,
      26,
      11
    );
    let wasm;
    let sharedMemory;
    let adapter;
    try {
      await WebAssembly.compile(empty);
      wasm = true;
    } catch (error) {
      wasm = String(error);
    }
    try {
      sharedMemory =
        new WebAssembly.Memory({ shared: true, initial: 1, maximum: 1 })
          .buffer instanceof SharedArrayBuffer;
    } catch (error) {
      sharedMemory = String(error);
    }
    try {
      const device = await navigator.gpu?.requestAdapter();
      adapter = device && {
        info: device.info,
        maxStorageBufferBindingSize: device.limits.maxStorageBufferBindingSize,
        timestampQuery: device.features.has("timestamp-query"),
      };
    } catch (error) {
      adapter = String(error);
    }
    return {
      origin: location.origin,
      userAgent: navigator.userAgent,
      isolated: crossOriginIsolated,
      sab: typeof SharedArrayBuffer,
      wasm,
      simd: WebAssembly.validate(simd),
      sharedMemory,
      adapter: adapter ?? null,
    };
  });
}

async function enableVector(page) {
  await page.evaluate(() => {
    DSM.enablePlugin("vector-tools");
    DSM.enabledPlugins["vector-tools"].resetConfig();
  });
  await settle(page);
}

async function fieldFixture(page, scenario) {
  await enableVector(page);
  await page.evaluate(() =>
    Calc.setExpression({
      id: "probe-slider",
      latex: "a_{probe}=1",
      hidden: true,
    })
  );
  // The slider has to be analysed, and Vector Tools' environment refreshed
  // (it coalesces over 80 ms), before a field that uses it compiles; started
  // in the same tick, the flow refuses a_probe as undefined.
  await settle(page);
  await page.evaluate((kind) => {
    const vt = DSM.enabledPlugins["vector-tools"];
    vt.setVector(
      kind.endsWith("3d") ? ["-a_{probe}y", "x", "0.25"] : ["-a_{probe}y", "x"]
    );
    if (kind === "flow-shared-fixture" || kind === "arrows-and-flow") {
      vt.setFlow("particleCount", 16000);
      vt.setDrawAs(kind === "arrows-and-flow" ? "both" : "flow");
    } else if (kind === "stream-3d" || kind === "particles-3d") {
      vt.setSpace3D("flowLook", kind === "stream-3d" ? "traced" : "particles");
      vt.setSpace3D("animate", false);
      vt.setDrawAs("flow");
    } else {
      if (kind === "cloud-3d") vt.setSpace3D("look", "cloud");
      vt.setArrowMode("live");
    }
  }, scenario);
}

async function activateWork(page, name) {
  if (!workload || workload === "idle") return async () => {};
  if (workload === "drag") {
    const bounds = await page.evaluate((is3d) => {
      const canvas = is3d
        ? Calc.controller.grapher3d?.webglCanvas
        : document.querySelector("canvas.dcg-graph-inner");
      if (!canvas) throw new Error("Graph canvas unavailable for drag.");
      const { x, y, width, height } = canvas.getBoundingClientRect();
      return { x: x + width * 0.7, y: y + height * 0.5 };
    }, tests3D.has(name));
    await page.mouse.move(bounds.x, bounds.y);
    await page.mouse.down();
    let running = true;
    const movement = (async () => {
      let index = 0;
      // `running` is cleared by the stop function returned below.
      // eslint-disable-next-line no-unmodified-loop-condition
      while (running) {
        const phase = index++ / 26;
        await page.mouse.move(
          bounds.x + 90 * Math.sin(phase),
          bounds.y + (tests3D.has(name) ? 40 * Math.sin(phase * 2) : 0)
        );
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    })();
    return async () => {
      running = false;
      await movement;
      await page.mouse.up();
    };
  }
  if (tests3D.has(name) && ["pan", "zoom"].includes(workload))
    throw new Error("Use --work=drag for the 3D camera.");
  await page.evaluate((kind) => {
    let index = 0;
    const timeZero = performance.now();
    performance.mark(`probe:${kind}:start`);
    let lastEdit = -1;
    const loop = (now) => {
      const phase = (now - timeZero) / 600;
      if (kind === "pan" || kind === "zoom") {
        const d = kind === "pan" ? 2 * Math.sin(phase) : 0;
        const scale = kind === "zoom" ? 1 + 0.3 * Math.sin(phase) : 1;
        Calc.setMathBounds({
          left: -10 * scale + d,
          right: 10 * scale + d,
          bottom: -6 * scale,
          top: 6 * scale,
        });
        index++;
      } else if (kind === "slider") {
        Calc.setExpression({
          id: "probe-slider",
          latex: `a_{probe}=${(1 + 0.2 * Math.sin(phase)).toFixed(6)}`,
          hidden: true,
        });
        index++;
      } else if (Math.floor((now - timeZero) / 450) !== lastEdit) {
        lastEdit = Math.floor((now - timeZero) / 450);
        const vt = window.DSM?.enabledPlugins["vector-tools"];
        if (
          vt &&
          document.querySelector('[id^="dsm-vector-tools"][id$="canvas"]')
        )
          vt.setSlot("p", lastEdit % 2 ? "-a_{probe}y" : "-a_{probe}y+x/20");
        else
          Calc.setExpression({
            id: "probe-edit",
            latex: lastEdit % 2 ? "z_{probe}(x)=x" : "z_{probe}(x)=x^{2}",
            hidden: true,
          });
        index++;
      }
      window.__probeInputs = index;
      window.__probePan = requestAnimationFrame(loop);
    };
    window.__probeInputs = 0;
    window.__probePan = requestAnimationFrame(loop);
  }, workload);
  return async () =>
    await page.evaluate(() => cancelAnimationFrame(window.__probePan));
}

async function generatedFixture(page, form) {
  const results = [];
  for (const side of capSizes) {
    await page.evaluate(
      ({ form, side }) => {
        Calc.setBlank();
        const grid = `[${Array.from({ length: side }, (_, i) => ((i / side) * 12 - 6).toFixed(6)).join(",")}]`;
        const polygon = (points) =>
          String.raw`\operatorname{polygon}\left(${points}\right)`;
        const { raw } = String;
        Calc.setExpressions([
          { id: "grid", latex: `G_{p}=${grid}`, hidden: true },
          {
            id: "base",
            latex: raw`A_{p}=\left(u,v\right)\operatorname{for}u=G_{p},v=G_{p}`,
            hidden: true,
          },
          {
            id: "tip",
            latex: raw`B_{p}=A_{p}+\left(0.1a_{probe},0.025\right)`,
            hidden: true,
          },
          { id: "probe-slider", latex: "a_{probe}=1", hidden: true },
        ]);
        const state = Calc.getState();
        const points = form === "generated-3d" ? "A_{p},B_{p}" : undefined;
        const row = (id, latex, colorLatex) => ({
          type: "expression",
          id,
          latex,
          color: "#2d70b3",
          ...(colorLatex ? { colorLatex } : {}),
        });
        const tip = "B_{p}";
        const wing = (sign) => raw`${tip}+\left(-0.03,${sign}0.025\right)`;
        const rgb =
          form === "generated-rgb"
            ? raw`\operatorname{rgb}\left(45+0A_{p}.x,112+0A_{p}.x,179+0A_{p}.x\right)`
            : undefined;
        const shaft =
          form === "generated-segment"
            ? raw`\operatorname{segment}\left(A_{p},B_{p}\right)`
            : polygon(points ?? "A_{p},B_{p}");
        state.expressions.list.push(row("probe-shafts", shaft, rgb));
        state.expressions.list.push(
          row("probe-heads", polygon(`${tip},${wing("")},${wing("-")}`), rgb)
        );
        Calc.setState(state);
      },
      { form, side }
    );
    await settle(page);
    const analysis = await page.evaluate(async () => {
      const a = Calc.HelperExpression({
        latex: String.raw`\operatorname{length}\left(A_{p}\right)`,
      });
      return await new Promise((resolve) => {
        const read = () => ({
          list: Number.isFinite(a.numericValue) ? a.numericValue : null,
          shafts: Calc.expressionAnalysis["probe-shafts"],
          heads: Calc.expressionAnalysis["probe-heads"],
        });
        // Wall-clock fallback also reports calculator errors without waiting indefinitely.
        const timer = setTimeout(() => {
          a.unobserve("numericValue", listener);
          resolve(read());
        }, 350);
        function listener() {
          if (!Number.isFinite(a.numericValue)) return;
          clearTimeout(timer);
          a.unobserve("numericValue", listener);
          resolve(read());
        }
        a.observe("numericValue", listener);
        listener();
      });
    });
    results.push({ side, requested: side ** 2, ...analysis });
  }
  console.log("    graph support:", JSON.stringify(results));
  const final = results.at(-1);
  if (!final.shafts?.isGraphable || !final.heads?.isGraphable)
    return "final fixture did not graph; support results above";
}

Object.assign(SETUPS, {
  "plain-3d": async (page) =>
    page.evaluate(() => {
      Calc.setExpressions([
        { id: "surface", latex: "z=a_{probe}(x^{2}-y^{2})/4" },
        { id: "probe-slider", latex: "a_{probe}=1", hidden: true },
      ]);
    }),
  "arrows-live": async (page) => {
    await fieldFixture(page, "arrows-live");
    await page.waitForSelector("#dsm-vector-tools-arrow-canvas", {
      timeout: 5000,
    });
  },
  "flow-shared-fixture": async (page) => {
    await fieldFixture(page, "flow-shared-fixture");
    await page.waitForSelector("#dsm-vector-tools-flow-canvas", {
      timeout: 5000,
    });
  },
  "arrows-and-flow": async (page) => {
    await fieldFixture(page, "arrows-and-flow");
    await page.waitForSelector("#dsm-vector-tools-arrow-canvas", {
      timeout: 5000,
    });
    await page.waitForSelector("#dsm-vector-tools-flow-canvas", {
      timeout: 5000,
    });
  },
  "arrow-3d": async (page) => {
    await SETUPS["plain-3d"](page);
    await fieldFixture(page, "arrow-3d");
    await page.waitForSelector("#dsm-vector-tools-3d-canvas", {
      timeout: 5000,
    });
  },
  "stream-3d": async (page) => {
    await SETUPS["plain-3d"](page);
    await fieldFixture(page, "stream-3d");
    await page.waitForSelector("#dsm-vector-tools-3d-flow-canvas", {
      timeout: 5000,
    });
  },
  "particles-3d": async (page) => {
    await SETUPS["plain-3d"](page);
    await fieldFixture(page, "particles-3d");
    await page.waitForSelector("#dsm-vector-tools-3d-flow-canvas", {
      timeout: 5000,
    });
  },
  "cloud-3d": async (page) => {
    await SETUPS["plain-3d"](page);
    await fieldFixture(page, "cloud-3d");
    await page.waitForSelector("#dsm-vector-tools-3d-canvas", {
      timeout: 5000,
    });
  },
  async phase(page) {
    await page.evaluate(() => {
      DSM.enablePlugin("physics-lab");
      DSM.enabledPlugins["physics-lab"].session.togglePhasePlane();
    });
    await page.waitForSelector("#dsm-physics-lab-slope-canvas", {
      timeout: 5000,
    });
  },
  async "audio-field"(page) {
    await page.evaluate(() => {
      DSM.enablePlugin("audio-lab");
      DSM.enabledPlugins["audio-lab"].session.toggleField();
    });
    await page.waitForSelector("#dsm-audio-lab-field-canvas", {
      timeout: 5000,
    });
  },
  async "fluid-air"(page) {
    await enableVector(page);
    await page.evaluate(
      ({ cells, pause }) => {
        Calc.setExpressions([
          { id: "probe-slider", latex: "a_{probe}=1", hidden: true },
          {
            id: "obstacle",
            latex: String.raw`\left(x+5\right)^{2}+y^{2}\le a_{probe}^{2}`,
          },
        ]);
        const vt = DSM.enabledPlugins["vector-tools"];
        vt.setArrowMode("off");
        vt.setFluid("mode", "windTunnel");
        vt.setFluid("cellsAcross", cells);
        vt.setFluid("playing", !pause);
        if (pause) vt.fluid.drawOnce();
      },
      { cells: Number(flag("cells") ?? 300), pause: args.includes("--paused") }
    );
    await page.waitForSelector("#dsm-vector-tools-fluid-canvas", {
      timeout: 5000,
    });
  },
});
for (const form of [
  "generated-solid",
  "generated-rgb",
  "generated-segment",
  "generated-3d",
])
  SETUPS[form] = async (page) => await generatedFixture(page, form);

/**
 * Puts the plugins' library settings back, the way the integration tests
 * do: the Matrix tab's map, for one, outlives the page, and left on it is
 * drawn under every later scenario.
 */
async function resetPlugins(page) {
  await page.evaluate(async () => {
    window.cancelAnimationFrame(window.__probePan);
    if (!window.DSM) return;
    const vt = DSM.enabledPlugins["vector-tools"];
    if (vt !== undefined) {
      vt.matrix.reset();
      vt.matrix.syncNow();
      vt.resetConfig();
      vt.setPanelTab("field");
    }
    for (const id of ["vector-tools", "physics-lab", "audio-lab"])
      if (DSM.enabledPlugins[id] !== undefined) DSM.disablePlugin(id);
    for (let i = 0; i < 100 && DSM.delaySetPluginSettings; i++)
      await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

async function main() {
  const ext = path.join(process.cwd(), "dist");
  for (const dir of [shots, traces].filter(Boolean))
    await fs.mkdir(dir, { recursive: true });
  for (const name of scenarios)
    if (name !== "load" && !Object.hasOwn(SETUPS, name))
      throw new Error(`Unknown scenario: ${name}`);
  const browser = await puppeteer.launch({
    headless: headful ? false : "new",
    args: [
      ...(noExt
        ? []
        : [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`]),
      "--enable-gpu",
      ...(args.includes("--ignore-gpu-blocklist")
        ? ["--ignore-gpu-blocklist"]
        : []),
      ...(args.includes("--no-sandbox") ? ["--no-sandbox"] : []),
    ],
  });
  try {
    const browserSession = await browser.target().createCDPSession();
    const system = await browserSession.send("SystemInfo.getInfo");
    console.log(
      "Browser:",
      await browser.version(),
      "GPU:",
      JSON.stringify({
        devices: system.gpu.devices,
        featureStatus: system.gpu.featureStatus,
        renderer: system.gpu.auxAttributes?.glRenderer,
        driver: system.gpu.auxAttributes?.driverVersion,
      })
    );
    if (scenarios.includes("load")) {
      const loads = [];
      for (let i = 0; i < runs; i++) {
        const { page, loadMs } = await openPage(browser, "load");
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
        const { page, client } = await openPage(browser, name);
        const artifact = artifactName(name, i);
        try {
          if (capabilities)
            console.log(
              "    page capabilities:",
              JSON.stringify(await browserCapabilities(page))
            );
          skipped = await SETUPS[name](page);
          if (skipped) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (shots)
            await page.screenshot({
              path: path.join(shots, artifact + "-before.png"),
            });
          if (gpu) await page.evaluate(() => window.__probeGpu.start());
          if (traces)
            await page.tracing.start({
              path: path.join(traces, artifact + ".json"),
              categories: [
                "devtools.timeline",
                "blink.user_timing",
                "toplevel",
                "cc",
                "viz",
                "gpu",
                "disabled-by-default-devtools.timeline.frame",
                "disabled-by-default-devtools.timeline.layers",
              ],
            });
          const stopWork = await activateWork(page, name);
          try {
            results.push(await sample(page, client, 4000));
          } finally {
            await stopWork();
            if (traces) await page.tracing.stop();
          }
          if (gpu)
            console.log(
              "    GPU draw samples:",
              JSON.stringify(
                await page.evaluate(() => window.__probeGpu.stop())
              )
            );
          if (workload)
            console.log(
              "    inputs:",
              (await page.evaluate(() => window.__probeInputs)) ?? "see trace"
            );
          if (shots)
            await page.screenshot({
              path: path.join(shots, artifact + "-after.png"),
            });
        } catch (error) {
          skipped = `probe failed: ${String(error).split("\n")[0]}`;
        } finally {
          await resetPlugins(page);
          await page.close();
        }
        if (skipped) break;
      }
      if (skipped) {
        console.log(`${name.padEnd(12)} ${skipped}`);
        if (!skipped.includes("did not graph")) process.exitCode = 1;
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
