# Vector Tools: the next AP demos, verified through CI

You have repo access. Work on `daguitarman55555-byte/DesModder`, from branch `feature/vector-tools-foundation` at commit **`934cf658`** or later.

## What is there now

Nine AP presets, all checked live on Rafael's machine (56–60 fps, nothing refused, every slider under 150 ms):

- **In `src/field-rendering/gallery/ap-teaching.ts`:** projectile, oscillator, circular motion, streamtube, conductor and induction.
- **In `src/field-rendering/gallery/ap-extensions.ts`:** motion graphs, pendulum and Kepler.

They come with:

- energy bars (`energy-bars.ts`);
- a clock with 0.25× and single step;
- Majestic and Explanatory modes;
- AP Physics 1 and AP Physics 2 shelves (`category`, `apUnit`).

**Read these two first.** Each says what was changed in your last two patches after checking them live, and why. Every item cost a rebuild:

- `docs/research/vector-tools-ap-roadmap/README.md`
- `docs/research/vector-tools-phet/README.md`

## How you verify this time

Your container's Chromium blocks every site and extension by policy, so you cannot run Desmos there. Verify through GitHub instead:

1. **Push to a branch named `gpt/<topic>`** on the fork, through your GitHub connection. The workflow `.github/workflows/vector-tools-pages.yml` runs on every push to `gpt/**`:

   - unit tests;
   - `tsc --build`;
   - the extension build;
   - all 36+ live Desmos cases (`docs/mockups/vector-3d-arrows/ap-look.cjs`);
   - recompute latency (`ap-latency.cjs`).

   Add your new preset ids to the workflow's `IDS` lists so they are checked too.

2. **Read the result** at https://daguitarman55555-byte.github.io/DesModder/ (and its `results.json`). Check the commit SHA matches yours. The run's `vector-tools-verification` artifact has the logs.
3. **Iterate until:**

   - zero refused expressions;
   - every slider p95 under 150 ms;
   - every screenshot looked at, and described in your ledger.

   The runner has no GPU, so ignore its frame rates; Rafael's machine is the frame-rate judge.

If you cannot push, say so plainly. In that case, deliver a patch plus analytic tests, and mark everything live as **not run**. Do not push to `feature/vector-tools-foundation` or `main`.

## What to build, in order

Each is a preset in the shape of `ap-extensions.ts`, with `category`, `apUnit`, `meaning`, `majesticPalette`, unit tests that check the physics at points, and both modes.

1. **Gauss's law** (Physics C: E&M unit 8; enrichment for AP 2 unit 10). In 3D:

   - a draggable Gaussian sphere (centre and radius sliders) among point charges;
   - flux through it worked out natively in Desmos (a sum over a grid of the surface) beside q_enc/ε₀, so a student sees the two agree, and agree no matter where the sphere is as long as it encloses the same charge.

   Say how the surface shows E·n̂. If Desmos 3D cannot colour a surface by a function, find what it can do, and measure it.

2. **Ampère's law** (Physics C: E&M unit 12): a circulation loop (centre, radius, tilt) around the wires preset's currents. ∮B·dl, summed natively, against μ₀I_enc.
3. **Incline free-body diagram** (AP 1 unit 2):
   - angle, μs, μk and mass;
   - weight, normal, friction and net arrows on the block;
   - static friction as the adjustable reaction it is, up to μsN, then sliding with μkN;
   - the threshold angle marked.
4. **Magnet through a coil** (AP 2 unit 12, PhET's Faraday's Law): a bar magnet moving through a loop on the clock, with Φ(t) and emf(t) = −dΦ/dt traced live, as in motion graphs. Reuse the bar magnet's exact field; the flux through the loop is integrated natively.
5. **Measuring tools**, a shared feature, not a preset:

   - a tape measure (two draggable points and their distance);
   - a stopwatch on the scene clock.

   Design the interface: which field of `GalleryPreset` opts in, what the presets window shows, and how it works in 3D, where Desmos draws no labels and the plugin draws names (`name3d`).

## Rules the last patches taught

- **Implicit curves.** No implicit curve over the whole plane when an explicit or parametric form exists. The projectile's trajectories as one implicit curve cost 200 ms a slider move; as an explicit list, 60.
- **Function chains.** No function that calls the previous one more than once. Kepler's K₆ was 3⁶ calls per evaluation and froze Desmos 3D. Put heavy maths in hidden scalar helpers, solved once per change; see `keplerSolve` and `pendulumHelpers`.
- **Moving bodies in 3D** are small parametric spheres (`ball` in `ap-extensions.ts`), which the overlay paints at the clock's instant. Points vanish under Majestic.
- **Slider names.** Never name a 3D slider `u` or `v`; a test enforces this.
- **Majestic colours.** Solids that would vanish on the dark get a `majesticColor`.
- **Density.** Flows run at 24,000 particles in 2D and 30,000 in 3D, thinned with `density` when confined. `speed` is set per preset so the flow draws streaks, not dots. Low values of a one-signed tint are dark in Majestic, so pick the scale so the interesting region is coloured.
- **The flow must be physically honest.** Say what its particles are: GPT's motion-graphs flow drew curves that did not match the graphs, and Kepler's moved at the wrong speeds.

## Make it prettier

For each of the nine existing presets and your new ones, propose one concrete change to its Majestic look. Give it as settings (palette, scale, density, speed, glow, which solids stay) with the reason. Only claim it is better from a screenshot you looked at, from the CI.

## Deliverables

- **Your branch names,** with the Pages run for each final commit.
- **`answers.md`**, containing the designs, what you changed while iterating, and the verification ledger:
  - live in CI;
  - analytic;
  - structural only;
  - not checked.
- **The tests,** run by CI.
