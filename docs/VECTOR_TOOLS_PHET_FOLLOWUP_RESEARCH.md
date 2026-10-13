# Vector Tools: turn the PhET survey into buildable designs

You have repo access. Work on `daguitarman55555-byte/DesModder`, branch `feature/vector-tools-foundation`, at commit **`e388d5d4`** or later.

That commit holds:

- **Your six AP presets, reworked.** They are in `src/field-rendering/gallery/ap-teaching.ts`. Read `docs/research/vector-tools-ap-roadmap/README.md` for what changed from your designs and why.
- **A survey of all 112 PhET physics simulations** against AP Physics 1, 2 and C: `docs/VECTOR_TOOLS_PHET_SURVEY.md`. It ends in a ranked list of 15 things to build.

The survey is a sketch. It was made from PhET's catalogue and from knowing the simulations, not from opening every one. Each idea is a line or two. **Your job is to make it concrete:** check it against the real simulations, then turn each idea into something a developer can build without guessing.

## 1. Check the survey against PhET itself

Open the PhET simulations behind the top 15 ideas. You have a browser; use the HTML5 versions where they exist.

For each, record:

- what it actually shows;
- which controls and readouts it has;
- what its intro and lab screens split;
- which teaching move makes it work.

Correct the survey where it is wrong or out of date, and say what you changed. Check against the CEDs too:

- every AP Physics 1 and 2 claim against the current College Board CEDs;
- the AP Physics C claims against the current Physics C: Mechanics and Physics C: E&M CEDs.

Cite unit, topic and learning objective.

If you find a PhET simulation worth more than the survey gave it, or an AP topic the survey missed, add it, and say where it ranks.

## 2. Make each idea concrete

For every idea in the survey's ranked list, and any you added, give a design at the right depth for its cost.

### Small and medium ideas, which fit what exists (survey ranks 1–11)

These are:

- **Shared features:** synced energy bars, live x/v/a graphs, a clock with slow motion and single step, measuring tools.
- **New presets:** pendulum phase portrait, Kepler's equal areas, Gauss's law, Ampère's law, the incline, a moving magnet through a coil, kinetic gas.

For each:

- **Exactly what the student sees**, in Explanatory and in Majestic. Majestic draws no text. A Majestic view keeps only solids, with a dense glowing flow whose colour means a named physical quantity; say which quantity.
- **The formulas.** Give exact Desmos LaTeX for every scene object, every slider with default, range and step, and every switch. Give the GPU field and its tint, with scale and palette.
- **Where it goes in the code, and how:**
  - which file;
  - whether it is a preset in the shape of `ap-teaching.ts` or a shared feature;
  - for a shared feature, its interface: which presets opt in, through which field of `GalleryPreset` or `SceneItem`, and what the presets window shows.
- **Interaction:** what is draggable, what the clock drives (`sceneTime`), and what happens on Reset.
- **The physics, with its limits:** what is exact, what is approximate, and what a teacher must not claim from it.
- **Acceptance tests:**
  - unit tests in the style of `ap-teaching.unit.test.ts`, checking the physics at points;
  - the live checks, as below.

For **synced energy bars** and **live graphs** in particular, design them once for all six AP presets and the existing orbit and charge presets. Bars are native Desmos rectangles; traces are curves with a domain up to `T_{scene}`. Say:

- where they sit in the view so they never cover the picture;
- how they scale;
- how they behave in 3D, where Desmos draws no labels.

### Large ideas, which need new machinery (survey ranks 12–15 and the capabilities C1–C5)

These are Energy Skate Park with a typed track, circuits, the optics bench, and interference. For each:

- the smallest capability that unlocks it (refine C1–C5 from your last answer);
- its interface;
- what it computes;
- the test that proves it right;
- which ideas share it.

Say which one to build first, and why.

## 3. Build the first ones

Build these as a patch:

- **The clock's slow motion and single step.**
- **Synced energy bars** on the projectile, oscillator and circular motion presets.
- **Live x(t), v(t), a(t) graphs**, either on a new motion-graphs preset (your idea 7) or on the projectile.
- **The pendulum phase portrait** (separatrix included) **and Kepler's equal areas**, as presets in the shape of `ap-teaching.ts`.

Follow the lessons in `docs/research/vector-tools-ap-roadmap/README.md`; each cost a rebuild last time:

- **Density.** Flows run at 24,000 particles in 2D and 30,000 in 3D. `density` thins a flow confined to a small region, and `speed` is set per preset so slow fields draw streaks.
- **Names.** Never name a 3D slider `u` or `v`; they are Desmos 3D's surface parameters, and a test enforces this.
- **Majestic colours.** Solids that would vanish on the dark get a `majesticColor`.
- **Moving bodies in 3D** are small parametric spheres, which the overlay paints at the clock's instant; points vanish under Majestic.
- **Restrictions.** Desmos's implicit plotter can silently draw nothing under some restrictions. Check every curve is visible, not just accepted.
- **Shared variable names.** Variables shared between presets (`R`, `w`) must take the new preset's value on load. This is fixed; keep it fixed.
- **AP shelves.** Presets go on the `ap1` or `ap2` shelf with an `apUnit`. Physics C presets go on the shelf of the course whose unit they extend; say which, and propose a C shelf if that reads better.

Run the live checks with `docs/mockups/vector-3d-arrows/ap-look.cjs`. For every preset, in 2D and 3D, in both modes:

- **zero refused expressions;**
- **frames per second.** The target is 60, on the machine you report.
- **slider recompute under 150 ms;**
- **screenshots you have looked at.** Say what you saw, not only that you took them.

Run `npm run test:unit` and `npx tsc --build`, and report both.

## Deliverables

Deliver a zip with, in this order:

1. `answers.md`:
   - the corrected survey;
   - the ranked list, with any changes and why;
   - the concrete designs;
   - the capability specs;
   - which to build next.
2. The code as a patch against the commit you used.
3. Screenshots and timing results for what you built.
4. A verification ledger:
   - what you saw live;
   - what you checked against analytic results;
   - what you only checked structurally;
   - what you did not check.

Don't push.
