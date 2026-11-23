# Running the DesModder probes

The patch targets `feature/vector-tools-foundation` at `b7a48c6bf6e228b2dc037142a4f0edad505897ae`. Apply it from the repository root.

```sh
git apply --check /path/to/perf-probe.patch
git apply /path/to/perf-probe.patch
npm run build
```

Run `npm ci` first if dependencies are absent. Use headful Chrome with Iris Xe and record the browser, adapter and driver printed on the first line. If the adapter shows SwiftShader or a blocklisted feature, label that run separately. The probe uses normal browser restrictions unless `--ignore-gpu-blocklist` is explicitly passed. Repeat on a discrete GPU. Use `--dpr=2` for high-DPI comparisons.

```sh
node scripts/perf/probe.cjs idle pan-plain --no-ext --runs=5 --headful
node scripts/perf/probe.cjs idle pan-plain vector-arrows matrix-exact matrix-redraw slope --runs=5 --headful --shots=out/probe
node scripts/perf/probe.cjs vector-arrows generated-solid generated-rgb generated-segment --sizes=35 --work=pan --headful --runs=5
node scripts/perf/probe.cjs generated-solid generated-rgb generated-segment generated-3d --sizes=35,50,75,100,101 --headful --runs=1
node scripts/perf/probe.cjs matrix-exact matrix-redraw --matrix=c2 --work=pan --headful --runs=5 --profile
node scripts/perf/probe.cjs matrix-exact matrix-redraw --matrix=c2 --work=slider --headful --runs=5 --profile --dispatches
node scripts/perf/probe.cjs arrows-live flow-shared-fixture arrows-and-flow --work=idle --headful --gpu --runs=3
node scripts/perf/probe.cjs arrows-live flow-shared-fixture arrows-and-flow --work=pan --headful --trace=out/probe-trace --runs=3
node scripts/perf/probe.cjs fluid-air --cells=300 --work=idle --headful --runs=3 --gpu
node scripts/perf/probe.cjs fluid-air --cells=1024 --work=idle --headful --runs=3 --gpu
node scripts/perf/probe.cjs fluid-air --paused --work=pan --headful --runs=3 --shots=out/probe
node scripts/perf/probe.cjs slope phase audio-field --work=drag --headful --runs=3 --trace=out/probe-trace
node scripts/perf/probe.cjs plain-3d arrow-3d stream-3d cloud-3d particles-3d --work=drag --headful --caps --shots=out/probe --runs=3
```

- Matrix fixtures `c1`–`c4` isolate implicit, explicit, inequality and parametric. Leave the option off for a mixture. Only the explicit fixture has the API slider dependency. `--work=edit` changes a Vector Tools component when its canvas is active, otherwise it exercises a graph definition edit. Idle means no synthetic input. Running flow and fluid still animate.
- `vector-arrows` exercises the branch’s generator. `generated-solid` and `generated-rgb` use identical known positions, style and primitives with a solid color or an equivalent per-item color list. `generated-segment` checks support and prints analyzer diagnostics. `generated-3d` checks the same export in 3D. A sweep prints list length and analyzer status at each rung. The timing window covers the final rung if valid. Run single-size commands for per-rung timing. Exact color grouping and palette quantization are follow-on variants described in the report.
- Import a trace into Perfetto or Chrome’s Performance panel. Inspect the Renderer, Viz, GPU, compositor and available evaluator worker tracks. Compare presentation events against rAF callback counts. Run trace, CPU profile and GPU timer passes separately. Draw timers exclude clears, uploads, readbacks, and browser compositing. Unavailable timers should stay blank. The original load scenario measures repeated loads in the same launch; use a fresh profile for the cold replacement-cache comparison.
- For single-action latency, start a recording with screenshots and call `performance.mark("probe:single-change")` immediately before one edit, slider update, or pointer pan. Time to the evaluator revision and first paint with the new value, and presentation if available. Repeat with the graph settled between actions. Use color, endpoint or shape in the screenshot to confirm completion. Sustained throughput and single-action latency measure different behavior.
- For detailed pass attribution, add local marks or async elapsed queries around flow integrate/fade/deposit/blit/reproject, 3D depth/trace/foreground paint, and air mask/lattice/readback/display. Report simulated seconds/s and count at equal physical conditions. Separately serve the checked-in `docs/mockups/flip-bench/` from localhost for liquid comparisons. The mockup has its own controls and runtime. Run the existing CPU benchmarks for the 5 mm dam as follows.

```sh
node docs/mockups/flip-bench/profile.cjs 0.005 dam
node docs/mockups/flip-bench/dam.cjs 50
```

In the liquid bench page, compare `bench({scene: "dam", cell: 0.005, cfl: 1, seconds: 4})` with `benchWorker` under the same scene, cell size and browser settings. Record the actual CPU/GPU selector and outcome on the page.

## Chrome and Firefox capabilities

`--caps` checks the actual Chrome page’s isolation, minimal WASM compile, SIMD validation, shared-memory constructor and WebGPU adapter discovery. To test the shipping realms, copy `platform-probe.js` into an unpacked diagnostic build as an ordinary packaged script. Load it in the extension page or background page, the intended isolated content-script context, and via the permitted Desmos page entry point. Use the manifest/header configuration being evaluated. Browser devtools can have a different evaluation privilege.

Once the script has loaded in a test extension document, run the following from another packaged script.

```js
desmodderPlatformProbe({
  workerURL: new URL("platform-probe.js", location.href).href,
}).then((result) => console.log(JSON.stringify(result, null, 2)));
```

The worker may be unavailable in constrained realms. Confirm `sharedWorkerRoundTrip` and `webgpu.integerCompute` before enabling those capabilities. Chrome’s offscreen document provides an extension-worker route. The fork’s Firefox build declares an MV2 background page, so test its dedicated worker there. Test 2D and 3D, clean Chrome and Firefox profiles, and extension enabled/disabled. Measure the real CalcForge worker separately for cold package boot, warm-job latency, startup peak memory and memory after shutdown.
