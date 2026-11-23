# GPT research package: what the browser runs showed

GPT's package (`REPORT.md`, `RUN_PROBES.md`, `calculus-corpus.json`,
`platform-probe.js`, and a patch to `scripts/perf/probe.cjs`) answered
`docs/GPT_EFFICIENCY_AND_GENERAL_CAS_BRIEF.md`. Its environment could not
start Chromium, so none of its browser probes had run. They were run here on
2026-11-22: Rafael's laptop, Chrome for Testing 131 headless (new headless
mode, real GPU), Intel Iris Xe through ANGLE/D3D11, driver 32.0.101.7088,
1280×800 at DPR 1. Headful runs at DPR 2 and on a discrete GPU are still
open. Numbers move ±30 % with machine load; compare within a table only.

## Answers to the report's first-week list

### 1. The generated field: colour is not the cost

| Fixture (35×35 = 1 225 arrows, panning) | Main thread | fps                                                                 |
| --------------------------------------- | ----------- | ------------------------------------------------------------------- |
| The branch's own generator              | ~1 000 ms/s | 26.7                                                                |
| Same geometry, one solid colour         | ~1 000 ms/s | 25.2                                                                |
| Same geometry, per-arrow `rgb` list     | ~1 000 ms/s | 25.2                                                                |
| Shafts as `\operatorname{segment}`      | —           | refused: "This calculator does not support the 'segment' function." |

The per-item colour list costs nothing measurable, so the report's exact
colour grouping would not help. `segment` is still refused, as the
2026-11-07 note in `generator.ts` records. The cost is Desmos drawing ~2 450
separate polygons. Only fewer primitives would help (no heads below a pixel
size, a coarser grid), and those change the picture, so they are a decision
for Rafael, as labelled export options if at all. Live arrows remain the
fast route for the same field (below).

### 2. Matrix: what is left is Desmos's, not ours

Panning, by fixture (plain Desmos ran 59 fps, ~490 ms/s in the same
session):

| Fixture              | Exact route      | Redraw route     |
| -------------------- | ---------------- | ---------------- |
| c1 implicit curve    | 56 fps, 570 ms/s | 56 fps, 530 ms/s |
| c2 explicit curve    | 58 fps, 568 ms/s | 56 fps, 541 ms/s |
| c3 shaded inequality | 45 fps, 707 ms/s | 39 fps, 505 ms/s |
| c4 parametric        | 51 fps, 776 ms/s | 49 fps, 800 ms/s |

A CPU profile of the slowest exact case (c4) puts this extension's code at
about 10 % of the main thread, and reconciliation itself (`desired`,
`syncNow`) under 1 %. The rest is Desmos re-plotting. The report's second
proposal, skipping reconciliation when a pan leaves the parameter interval
unchanged, would save almost nothing and is not worth its risk. If
inequalities matter, the redraw route's fill (39 fps at only 505 ms/s of
main thread, so the time is in rasterising) is where to look next.

### 4. Live overlays: no case yet for a shared WebGL context

| Scenario                          | Main thread | fps | GPU                                                |
| --------------------------------- | ----------- | --- | -------------------------------------------------- |
| Live arrows, still                | 24 ms/s     | 59  | zero draws once settled                            |
| Live arrows, panning              | 380 ms/s    | 60  | —                                                  |
| Flow, 16 000 particles, still     | 65 ms/s     | 59  | ~1.0 ms per frame (five passes, 0.09–0.37 ms each) |
| Flow, panning                     | 383 ms/s    | 59  | —                                                  |
| Arrows and flow together, panning | 479 ms/s    | 59  | —                                                  |

The static overlay already costs nothing when still, which was the report's
acceptance test, and two overlays together hold 59 fps. Merging contexts
has no measured upside on this machine. The heaviest flow found is the black
hole gallery preset, about 10 ms of GPU per frame against Lorenz's 3; that
preset, not the context count, is where a flow optimisation would pay.

### Fluid (air)

300 cells across: 59 fps, 123 ms/s. 1 024 cells: 29 fps, 360 ms/s. Same as
the airflow plan's numbers.

## Platform capabilities (Part 1, question 9)

In the desmos.com page itself, where this extension's code runs, Chrome 131
reported: `crossOriginIsolated` true, `SharedArrayBuffer` available,
WebAssembly compiles, SIMD validates, shared memory constructs, and WebGPU
returns an adapter with timestamp queries. So a WebAssembly kernel can run in
the page on Chrome without an offscreen document. Not yet checked: an actual
worker round trip with Atomics, Firefox, and extension pages (run
`platform-probe.js` as `RUN_PROBES.md` describes).

## Checked and not done

- **Fieldplay's RK4 duplication** (the other chat found RK4 run once per
  coordinate there): not present here. `FlowRenderer.ts` steps both
  coordinates in one pass with one RK4.
- **The flow's birth search** runs for every particle every step, though only
  respawning particles use it. Moving it into the respawn branch gives the
  same output but measured no difference on Lorenz or the black hole (within
  ±2 %), so it was left as it is.

## Fixes to GPT's probe patch

Applied to `scripts/perf/probe.cjs`. The flow fixtures created their slider
and started the flow in the same tick, before Vector Tools' environment
(which coalesces over 80 ms) knew the slider, so the flow refused `a_probe`
as undefined. They now let the slider settle first. Four lint errors were
fixed as well.

## Still to run

Headful at DPR 2; a discrete GPU; traces (`--trace`) for compositor and
presentation; the 3D scenarios; the generated-field size sweep (50, 75, 100,
101); slider-driven Matrix (`--work=slider`); and the liquid bench in its
mockup. The calculus corpus (314 cases, 44 families) is a reference bank:
no engine has been run against it yet.
