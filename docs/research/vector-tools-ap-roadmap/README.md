# GPT's AP Physics roadmap, and what was kept

GPT's answer to `docs/VECTOR_TOOLS_AP_CURRICULUM_RESEARCH.md` (October 2026):

- `answers.md`: 28 ranked ideas across all fifteen AP Physics 1 and 2 units.
- `designs.md`: six full designs.
- `verification.md`: GPT's own live measurements.
- `curriculum-alignment.json`: the CED pages behind each objective.
- `sources.json`: the sources.

The six presets are in `src/field-rendering/gallery/ap-teaching.ts`. They keep GPT's physics, which its tests check. Everything below was changed after checking them live (screenshots in `docs/assets/vector-3d/ap/`, from `docs/mockups/vector-3d-arrows/ap-look.cjs`).

So `designs.md` describes GPT's versions; where it and the code disagree, the code is right.

## What changed, and why

- **The projectile's flow is a family of projectiles, not gravity.**
  - GPT's design: the uniform field (0, −g) drew as a flat rain that said nothing.
  - The flow: v = (v₀ₓ, v₀ᵧ − g(x + 6)/v₀ₓ) is the velocity of every projectile thrown with the body's launch velocity. Each particle really moves with a = g, and the body rides one of the arcs.
  - The colour is vᵧ: rising, zero at the top (where a is still g), then falling. That is the misconception the demo is for.
  - The probe shows v, and the body shows v and g.
  - The ball relaunches a second after landing; GPT's landed once and stopped.
- **The 3D projectile has z up.** GPT's had gravity along y, so its arc lay flat on the floor.
- **The projectile's launch velocity is v₀ₓ, v₀ᵧ, not u, v.** u and v are Desmos 3D's surface parameters, so with sliders of those names the ground plane and the ball became single points. A test now guards every 3D preset against this.
- **Density, as the charges have it.**
  - Before: 6,000 particles in 2D, sparse on paper and barely there on the dark.
  - Now: 24,000 in 2D and 30,000 in 3D. The streamtube's flow, confined to the tube, uses 40%, so its streamlines show.
- **Speeds are per preset.** The induced field and the conductor's field are slow, and drew dots rather than streaks.
- **The induction defaults are B = 2 and ω = 1.** At B = 1 and ω = 0.6, E peaked at 0.6, so the flow crawled and its colour barely showed.
- **Curves that read:**
  - The oscillator's energy contours are at whole amplitudes; at whole energies they crowd together going out.
  - The conductor's field lines are evenly spaced far away (√ of the flux function); GPT's spacing drew two lines.
  - Circular motion's circles are at whole radii.
  - The streamtube's lines take plain restrictions.
- **The streamtube's colour is pressure against where the speed is U.** It is positive where the tube is wide and slow, and negative where it narrows. GPT's had 1 + …, which coloured the whole tube one red.
- **The conductor shows its induced charge:**
  - In 2D, a red arc on the side E points to and a blue arc on the other, swapping when E reverses.
  - In 3D, two coloured hemispheres.
- **Majestic:**
  - Solids get a `majesticColor` where paper ink would vanish on the dark (ground, walls, the solenoid).
  - Moving bodies in 3D are small spheres that the overlay paints at the clock's instant (`SurfaceDepth`'s paint mode). A Desmos point vanishes under Majestic's dark, and a cut-out sphere lagged Desmos's re-meshing, showing bare paper.
  - The axes are hidden for every paper preset in Majestic, not only the AP ones.
- **The oscillator's 3D phase plane surface is gone.** It drew as an opaque slab over the flow.
- **AP shelves.** The presets window now shelves the physics as AP Physics 1 and AP Physics 2, in CED unit order (`apUnit`), the older physics presets included.

## Found on the way

A preset loaded over another with a variable of the same name kept the old value. Desmos's watcher went on reporting it, and every graph change put it back. So the conductor (R = 1.3), loaded after circular motion (R = 2.5), was drawn and cut out at R = 2.5. `syncParameterValues` now reads a slider's number from the expression list first, as the push already did.

## Not built: the other 22 ideas

`answers.md` ranks them and names the shared capabilities they need:

- C1, a trajectory solver;
- C2, circuits;
- C3, rays;
- C4, waves;
- C5, event populations.

None is started.
