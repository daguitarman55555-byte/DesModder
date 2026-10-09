# Verification ledger

Base: e25aa05a8544e976f2ff5340f80d605aebeae8d7. Windows, Node 24.19, Puppeteer Chrome 131, 1200×800 viewport; built extension loaded from dist into real Desmos calculator and 3D pages. GPU backend left at Chromium's default (not forced software rendering). No unit-test load ran during the final timing pass.

## Results

- Build passed; see build.txt.
- TypeScript check passed; see typecheck.txt.
- Full unit suite: **75 suites, 2,995 tests passed**, 94.547 seconds; see unit-tests.txt.
- **Zero refused expressions** in all 16 default scenes and all 16 all-switches-on scenes. Flow running, no flow error message in each final result.
- All 16 default screenshots were captured and visually inspected. Separate names-on screenshots exercise native arrows plus the plugin's 3D vector labels.
- All final sampled recomputations were below 150 ms. This is evidence for the tested machine, viewport, values, and options; it is not a guarantee over every slider combination or a slower classroom computer.

## Timings (milliseconds)

Each row reports the **maximum**, not the average. Primary slider: three changes around the default, with flow on; native: same with flow off; all switches: primary slider with every checkbox on and flow off. Additional physical sliders: three changes each with defaults restored and flow on. Raw values and exact slider names are in live-results.json.

The timer starts before setPresetVariable and ends when the Desmos numeric helper reports the new value, following the supplied charges-cost pattern. This measures a native worker update round trip, not a GPU frame-completion fence. Full-range sweeps, warm/cold distribution studies and sustained frame-rate benchmarks were not performed.

| Preset        | Dimension | Flow on | Native only | All switches | Other physical sliders |
| ------------- | --------- | ------: | ----------: | -----------: | ---------------------: |
| wires         | 2d        |    86.5 |        51.0 |         61.9 |                   52.3 |
| earth-moon    | 2d        |   134.8 |       115.6 |        132.7 |                  133.1 |
| cylinder      | 2d        |    73.1 |        69.6 |         70.5 |                   99.4 |
| capacitor     | 2d        |    75.0 |        81.8 |         97.3 |                   76.2 |
| bar-magnet    | 2d        |    14.9 |        15.0 |         22.9 |                   14.7 |
| dipole        | 2d        |    59.8 |        68.0 |         57.9 |                      — |
| shell-theorem | 2d        |    24.8 |        17.9 |         37.5 |                   33.6 |
| uniform-field | 2d        |    22.3 |        26.1 |         41.5 |                   24.4 |
| wires         | 3d        |    54.1 |        28.8 |         25.3 |                  146.1 |
| earth-moon    | 3d        |    74.8 |        58.8 |         60.2 |                   79.9 |
| cylinder      | 3d        |    16.1 |        24.9 |         24.0 |                   82.0 |
| capacitor     | 3d        |    28.4 |        27.0 |         26.9 |                   27.7 |
| bar-magnet    | 3d        |    27.8 |        17.7 |         24.1 |                   38.3 |
| dipole        | 3d        |    23.7 |        16.5 |         22.6 |                      — |
| shell-theorem | 3d        |    15.5 |        22.0 |         16.4 |                   57.3 |
| uniform-field | 3d        |    22.5 |        24.1 |         23.4 |                   24.4 |

## Analytic / structural checks

The new 16-test suite evaluates the actual generated LaTeX through the repository's strict parser and evaluator. It checks minus-potential-gradients for gravity, capacitor, dipole, shell, and uniform E; tangency of every supplied stream/flux contour; wire cancellation/reversal and body guards; shell interior gravity and potential; cylinder impermeability/Bernoulli pressure; and prism field against independent numerical face quadrature, including face-plane extensions. These tests do not prove GPU floating-point accuracy arbitrarily close to singularities. Existing whole-gallery tests also compile both GPU dimensions.

The new scene definitions carry actual probeArrows2D/3D, name3d, drag3d and parametric surface domains. Existing probe damping and pointer-drag implementations were reused. All-on acceptance was checked live; an exhaustive visual check of every label at every camera angle, pointer-drag gesture testing, all zero/reversed-source combinations, and every range endpoint were not performed.

The cylinder's Moving/Still/Reset was exercised in 2D and 3D: time advanced approximately 0.699 seconds, remained unchanged after pausing, and reset to zero with native T_scene=0. options-live.json additionally records the nonzero native scalar and names-on view. This tests clock wiring; a long-running undo/history ownership stress test was not performed.

## Scope / remaining extensions

The two new demos are the static shell theorem and uniform E / test-charge force comparison. A moving test-charge trajectory is not implemented or represented by the field particles. The bar magnet uses the exact exterior prism formula, not a manufactured planar stream function. 3D field-line trajectories are numerical when requested through the existing tracer; 2D implicit contours are not mislabeled as 3D lines. Procedural planet maps are illustrative. Default 3D reference-plane shading and axes remain Desmos's own.

No commits were pushed and no pull request was created. This archive is a reviewable patch plus source and reproducible evidence.

The packaged patch also passed `git apply --cached --check` against an isolated index populated from the base commit. No changes were staged in the repository's real index.
