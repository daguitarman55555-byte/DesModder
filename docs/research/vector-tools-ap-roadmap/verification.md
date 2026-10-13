# Verification ledger

Base: d2217295628de72c412a3b0a9fe1013492a821c7. Local implementation only; no push.

## Live observations

24 final cases: six presets × two Desmos products × two modes. All default and all-switches-on expression checks returned zero refusals. All flow status messages were empty and renderers reported running. The screenshots show both the graph and the native expression panel; no-writing applies to the graph, not the application controls. All 24 were reviewed as a contact sheet, with representative full-size inspection during development. Final views confirm dark axes-free Majestic, explanatory scenes, the exposed nozzle cutaway and the oscillator marker. Screenshots are still samples, not proof of every moment in an animation.

The maximum sampled native-slider round-trip was **94.99 ms**, below 150 ms. This measures a slider write through native Desmos evaluation until its HelperExpression reports the new value, polling every 2 ms. It does **not** time completion of every implicit-curve pixel or GPU frame. There are three nearby changes per physical slider, not a full-range benchmark. Raw samples and exact capture times are in live-results.json; the reproducible harness is included in source/. No stronger claim of a worst-case render deadline is made.

FPS below is actual renderer simulation updates per second over a two-second window. Raw draw calls and requestAnimationFrame rates are also recorded. The circular 3D explanatory view measured about 45 updates/s despite about 60 display callbacks/s; it is usable but is not a demonstrated 60-FPS scene on this machine. Slightly above-60 values reflect the short counting interval. This is not a sustained thermal benchmark.

Machine: Windows 11 Pro, Intel i7-1185G7 (4 cores/8 threads), about 15.4 GiB RAM, Intel Iris Xe driver 32.0.101.7088. Puppeteer Chrome 131.0.6778.264, headless, 1200×800, actual ANGLE Intel Iris Xe D3D11 renderer; no forced software renderer. Full machine details: machine.json.

| Preset        | Product | Mode        | Worst sampled ms | Simulation FPS | Refused |
| ------------- | ------- | ----------- | ---------------: | -------------: | ------: |
| ap-projectile | 2d      | explanatory |            24.63 |           60.3 |       0 |
| ap-projectile | 2d      | majestic    |            24.88 |           60.4 |       0 |
| ap-shm        | 2d      | explanatory |            79.50 |           60.3 |       0 |
| ap-shm        | 2d      | majestic    |            22.62 |           60.4 |       0 |
| ap-circular   | 2d      | explanatory |            26.57 |           60.4 |       0 |
| ap-circular   | 2d      | majestic    |            14.80 |           60.4 |       0 |
| ap-nozzle     | 2d      | explanatory |            31.89 |           60.5 |       0 |
| ap-nozzle     | 2d      | majestic    |            28.22 |           60.4 |       0 |
| ap-conductor  | 2d      | explanatory |            94.99 |           60.5 |       0 |
| ap-conductor  | 2d      | majestic    |            32.60 |           60.5 |       0 |
| ap-induction  | 2d      | explanatory |            31.61 |           60.1 |       0 |
| ap-induction  | 2d      | majestic    |            31.91 |           60.3 |       0 |
| ap-projectile | 3d      | explanatory |            29.35 |           59.8 |       0 |
| ap-projectile | 3d      | majestic    |            32.82 |           59.6 |       0 |
| ap-shm        | 3d      | explanatory |            24.39 |           59.8 |       0 |
| ap-shm        | 3d      | majestic    |            23.25 |           59.6 |       0 |
| ap-circular   | 3d      | explanatory |            17.88 |           44.6 |       0 |
| ap-circular   | 3d      | majestic    |            23.40 |           59.1 |       0 |
| ap-nozzle     | 3d      | explanatory |            40.01 |           60.5 |       0 |
| ap-nozzle     | 3d      | majestic    |            44.54 |           60.4 |       0 |
| ap-conductor  | 3d      | explanatory |            69.58 |           60.5 |       0 |
| ap-conductor  | 3d      | majestic    |            57.60 |           60.5 |       0 |
| ap-induction  | 3d      | explanatory |            23.31 |           59.6 |       0 |
| ap-induction  | 3d      | majestic    |            33.71 |           59.1 |       0 |

Mode smoke tests passed in both products: Majestic hides axes; Explanatory restores custom axis/grid flags; the changed angular-speed slider remains 1.1; disabling the plugin restores saved axes. See mode-smoke.json. This checks actual evaluated slider values, not preset default metadata.

Browser logs contain the Desmos intentional ERR_BLOCKED_BY_CLIENT message (with its own explanatory warning) and a Canvas2D readback performance advisory. No page exceptions were recorded. Do not interpret that as literally no console messages.

## Analytic and automated checks

17 new tests check conductor E=-grad(V), tangential surface field zero and interior zero; oscillator energy conservation; circular tangency and convective acceleration; nozzle divergence, wall tangency and Bernoulli; Faraday circulation inside/outside the flux cylinder; gravitational potential gradient; mode metadata; and tangency of all five contour families to their actual fields. These tests caught and corrected the conductor contour formula before delivery. They test representative points, not a symbolic proof over every parameter.

TypeScript checking and extension build passed. Full unit suite:

```
Test Suites: 78 passed, 78 total
Tests:       3118 passed, 3118 total
Snapshots:   0 total
Time:        103.791 s
```

Raw logs: unit-tests.txt, targeted-tests.txt, typecheck.txt, build.txt. Gallery tests also compile emitted 3D formulas and check thumbnail coverage. The 12 new thumbnails come from live explanatory views.

## Structural checks and limits

All 65 unique alignment references were matched to the official CED topic/LO pages, covering all 15 units. Classroom value is editorial judgment, not a teacher survey. Curriculum alignment is not College Board endorsement.

The compiled preset JSON documents every variable, scene and formula; future capability contracts are designs only. Native exact-marker formulas were inspected; no long-duration clock-drift or complete slider-range experiment was performed. Existing GPU probe/name helpers are reused; all switches were enabled for refusal checks, but every possible drag position and name-occlusion case was not visually audited.

No mobile, cross-browser, accessibility or graph-reload-during-Majestic stress test was run. Snapshot axis restoration is scoped to these AP scenes; switching graph documents while Majestic is active deserves a future lifecycle test. The 3D phase plane is not a physical 3D oscillator. Particle advection is not a second-order dynamics solver. See designs.md for calibrated marker motion, normalization and each model's physical limits.

## Reproduction

Apply implementation.patch to the stated base in a clean checkout, install dependencies, build the Chrome extension, run npm run test:unit -- --runInBand, then node docs/mockups/vector-3d-arrows/ap-teaching-live.cjs. The harness needs installed Puppeteer Chrome and network access to Desmos. AP_IDS, AP_DIMS and AP_OUTPUT can restrict a run. The included mode-smoke.cjs is an auxiliary local validation script; run it with the repository as the current directory; its output path is relative to that directory.
