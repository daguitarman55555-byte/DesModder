# Verification ledger — do not conflate evidence levels

Base reference: `e388d5d417d29adcbd4ff4ac22cc139763b08fb7` (confirmed via GitHub branch API). GitHub repository was read via authenticated GitHub connection. **No push or remote write.**

## Category A — directly inspected source / public HTML text

- Read source survey, roadmap README, `GalleryPreset`/`SceneItem` types, `ap-teaching.ts`, gallery index, clock state and panel Time controls from exact GitHub branch.
- Read `ap-teaching.unit.test.ts`, `strictParse.ts`, `strictEvaluate.ts` API snippets and matched new test harness calls against the repository's established structure.
- PhET HTML5 text/index from `energy-skate-park`, `gas-properties`, `keplers-laws`, `faradays-law`, `circuit-construction-kit-dc`, `geometric-optics`. Read accessible descriptions of screens, controls, timing and scientific objectives. Other PhET topic pages and secondary descriptions used for missing details, with evidence distinctions in `answers.md`.
- Opened actual HTML5 page URLs for Pendulum Lab, Wave Interference, Bending Light, Charges and Fields and CCK; direct web reader returned zero extracted lines due script-hosted content. **No graphical clicking, dragging or reset actions were performed** and there is no claim otherwise.
- Consulted public College Board AP1/AP2/C E&M course information and current CED excerpts via web search, but the fall 2026 clarification text was **not separately validated** line by line. Physics C Gauss 8.6.A and Ampère 12.4.A were verified from readily available CED excerpts. Previous repo's curriculum alignment JSON supplied many AP1/AP2 LO IDs.

## Category B — analytic calculations performed here

- `analytic_checks.py`, output `analytic_checks.json`. Result: all Python assertions pass.
- Pendulum separatrix maximum |H−2gL| = 7.11e−15 for g/L grid; **not** a live native-Desmos evaluation.
- Kepler 6 Newton updates max |E−e sin E−M| = 4.44e−16 over sampled e≤0.6 and mean anomalies; exact swept areas differ by at most 3.55e−15 across sample cases, **not** native polygon raster area.
- Oscillator K+U=E, circular K consistency and projectile in-flight/post-impact K+U+D=E independently asserted for selected values.

## Category C — structural checks performed here

- Isolated copies `ap-extensions.ts` and `energy-bars.ts` passed `tsc --noEmit --target es2020 --skipLibCheck --strict` **with a local stub for GalleryPreset types**, not the actual repository TypeScript project or Desmos/GPU compilation. See `isolated_typecheck.log`.
- Unified diff from the requested base generated with matching original context, including three new files and four modifications. `git apply --check` succeeded in a **synthetic context fixture built from the exact targeted original source fragments**; cannot establish that full repository patch applies cleanly without obtaining a clone.
- New unit tests were authored in `ap-extensions.unit.test.ts` using `parseStrictExpression`/`compileExpression` API matching the existing test code; **these tests were not executed by Vitest/Jest**.
- Inspectable patch guards the 3D `u`/`v` slider collision: new sliders use `a_{orb}`, `e_{orb}`, `M_g`, `T_{scene}`, etc. Three 3D sets of bar surfaces are generated.

## Category D — not done / not claimed

| Requested action                       | Actual status        | Blocking issue / follow-up                                                                                         |
| -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Run `npm run test:unit`                | NOT RUN              | Complete repository checkout/dependencies unavailable in execution container; authenticated GitHub file reads only |
| Run `npx tsc --build`                  | NOT RUN              | Same; isolated two-file stub check is not a substitute                                                             |
| Build extension (`npm run build`)      | NOT RUN              | No full working tree or dependencies                                                                               |
| Run `ap-look.cjs` against live Desmos  | NOT RUN              | Puppeteer/compiled `dist` missing; no access to interactive extension runtime                                      |
| 24 screenshots reviewed                | NONE                 | No screenshot created or inspected; no files are represented as live evidence                                      |
| Refused-expression count, all views    | UNKNOWN              | Requires Desmos `Calc.expressionAnalysis`                                                                          |
| Frames per second, each view           | UNKNOWN              | Requires live flow renderer capture and machine specification                                                      |
| Slider recompute <150ms                | UNKNOWN              | Source harness currently does not measure slider latency; add separate measurement                                 |
| Layout never overlaps picture          | UNKNOWN / KNOWN RISK | Graph-coordinate bar anchors not responsive to pan/zoom                                                            |
| 3D explanatory labels for bars         | NOT IMPLEMENTED      | 3D surfaces exist, but `modeHints` legend remains a design only                                                    |
| Every PhET sim interactively opened    | NOT DONE             | Scripted HTML5 pages were not rendered/clicked; descriptions/accessible HTML checked where available               |
| All CED claims checked in current PDFs | PARTIAL              | Course/selected objective evidence checked; full correction-notice audit pending                                   |

## Live run command suggested

```bash
# In a clone of the requested branch, after applying patch
npm install
npm run test:unit
npx tsc --build
npm run build
IDS=ap-projectile,ap-shm,ap-circular,ap-motion-graphs,ap-pendulum-phase,ap-kepler-areas \
DIMS=2d,3d MODES=explanatory,majestic \
OUT=docs/assets/vector-3d/ap-new \
node docs/mockups/vector-3d-arrows/ap-look.cjs
```

The existing `ap-look.cjs` collects FPS/refused and saves screenshots but **does not measure slider recompute**. Add a supplemental Puppeteer script that changes one slider, waits for the renderer redraw, uses `performance.now()` around `calc.setExpression`→GPU draw, reports p50/p95 over ≥20 moves, and retains hardware/GPU/WebGL2 information.

## Release recommendation

**Do not merge** until full tests, Desmos live acceptance (24 combinations), 3D bar legend and viewport-safe layout pass. This bundle is an actionable source-level patch plus independently checked mathematics, **not a release-certified implementation**.
