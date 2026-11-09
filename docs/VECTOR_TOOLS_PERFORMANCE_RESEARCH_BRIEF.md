# Vector Tools: 10× faster flow, fluid and Matrix tab — research brief

Written 2026-11-08 for GPT (Work, with repository access), at Rafael's request:
_"figure out the best way to optimize flow, fluids and matrices by 10 times or
more while keeping the same quality (if not better)."_

Paste everything below the line.

---

You are reviewing the performance of three renderers in a browser extension
for the Desmos graphing calculator (a DesModder fork, TypeScript, WebGL2,
branch `feature/vector-tools-foundation`). The goal is **at least 10× less
time per frame for the same picture**, or a measurably better picture at the
same cost. Read the code before proposing anything; every number below was
measured in headless Chrome on the developer's machine and should be checked,
not trusted.

## What "the same quality" means here

These are a teacher's and student's tools, so correctness is not negotiable:

- The flow's particles must follow the field exactly as the shader evaluates
  it (no lower-order integration that visibly bends the streamlines, no
  lower field-evaluation precision that changes where particles go).
- The fluid is a D2Q9 lattice Boltzmann solver held to a CPU reference by
  integration tests (Poiseuille, Taylor–Green, DFG cylinder benchmark,
  Strouhal number of shedding). A proposal that changes the physics must say
  which of those tests it keeps passing and why.
- The Matrix tab's exact route must stay exact: Desmos draws F(T⁻¹(x, y)) = 0
  itself. The redraw route may approximate, but not visibly at 1× zoom.
- No visible flicker, no frame where the picture is cleared, no pop when an
  automatic quality level changes.

## 1. The flow visualizer (`src/field-rendering/FlowRenderer.ts`, `FlowOverlay.ts`)

How it works now (read the file comments, which explain each choice):

- Particles live in an RGBA32F texture (position, age); one fragment pass
  steps them (forward Euler-like step `u_h` along the normalised or raw field,
  `vtField(p)` compiled from the user's LaTeX to GLSL by `latexToGLSL.ts`).
- Each frame: step pass → fade pass (full-screen, multiplies the previous
  trail texture by `trailPersistence`) → draw pass (`gl.POINTS`, one point per
  particle, additive premultiplied blend into the trail texture) → blit pass
  (full-screen, trail texture to the canvas with a backdrop).
- Trail textures are canvas-sized at device-pixel ratio × `autoScale`; a
  frame-time EMA lowers `autoScale` by 0.25 (minimum 0.5) when frames run
  slow and retries later. **Changing it reallocates the trail textures and
  clears them, which flickers the whole picture**; Rafael saw this.
- Defaults: 16 000 particles; presets use 20 000 – 50 000. Point size ~1.4 px.
- Quality complaint from Rafael: the trails look _dotted_, because a
  particle moves several pixels per frame and only its endpoint is drawn.
- The arrows (`ArrowRenderer.ts`) and the flow are separate canvases with
  separate WebGL contexts; the fluid (below) is a third.

Questions:

1. How to draw continuous trails instead of dots at the same or lower cost:
   line segments from previous to current position (instanced quads, or
   `gl.LINES` with the previous position kept in a second texture), and how
   to make them anti-aliased and width-stable under DPR changes.
2. How to make quality changes invisible: e.g. keep the trail texture at a
   fixed size and change only the particle count / draw resolution, or
   resample the old trail texture into the new one instead of clearing.
3. Where the frame time actually goes (fade + blit are full-screen passes at
   DPR²; the draw pass is fill-rate bound by overdraw). Propose a profiling
   method (EXT_disjoint_timer_query_webgl2 where available) and a budget.
4. Whether the three WebGL contexts should become one (shared textures, one
   compositing pass, no browser-level compositing of three canvases), and
   what that costs in code.
5. Integration: is RK2/RK4 per particle affordable at these counts, and is
   it needed for the "follows the field exactly" requirement?
6. A concrete design for an **automatic quality mode as an option** (Rafael
   asked for Auto to be selectable, with fixed levels available) that never
   clears the screen.

## 2. The fluid (`src/field-rendering/sim/`, `src/plugins/vector-tools/fluid/`)

- D2Q9 LBM on the GPU (`sim/lbm/GpuD2Q9.ts`): one fragment pass per step,
  pull-scheme streaming, three RGBA32F textures through MRT (g0–g3, g4–g7,
  g8/δρ/ux/uy) plus a force target for drag/lift, ping-ponged. Optional FP16S
  storage (Lehmann et al. 2022) for g0–g7.
- Boundaries: regularized velocity inlet, pressure outlet, bounce-back
  links (`links.ts`), moving solids (`movingSolids.ts`), a sponge,
  Smagorinsky LES. Obstacles come from the user's Desmos inequalities,
  compiled by a strict compiler with CPU validity checks.
- Scheduling (`sim/StepScheduler.ts`): fixed dt per step, steps per frame by
  elapsed time, and since 2026-11-08 a time budget that cuts the step cap
  when frames run past 40 ms.
- Measured: at `cellsAcross = 1024` the tank ran 6 fps before the budget and
  33 fps after, with the simulation at 0.34× real time either way. At the
  default 300 cells across it is real time but Rafael still calls it "very
  slow to render".
- Drawing: `FluidOverlay.ts` maps each screen pixel into the tank and colours
  vorticity, speed or pressure; the flow's particles can also ride the fluid.

Questions:

1. Per-step cost: is one pass with MRT the right shape, or would a
   two-lattice-in-one / esoteric-pull / AA-pattern scheme halve the memory
   traffic? What do FluidX3D and published WebGL LBMs do, and what can WebGL2
   (no compute shaders, no SSBOs) actually express?
2. FP16S everywhere vs. float32: what accuracy do the gates lose, measured?
3. Multigrid in time: fewer, larger steps with a coarser lattice away from
   solids (grid refinement), or a lower-resolution lattice upsampled for
   display with an unchanged look?
4. Is WebGPU (compute shaders, storage buffers, workgroup shared memory)
   available enough in Chrome today to be the primary path with WebGL2 as
   fallback, and what speedup does a compute-shader LBM get on integrated
   GPUs?
5. Display: is the per-pixel colour pass or the particle pass the cost, and
   can it render at a lower resolution with an edge-aware upsample?

## 3. The Matrix tab (`src/plugins/vector-tools/matrix/`)

- **Exact route** (`exactRoute.ts`): every graphed expression gets a hidden
  copy that calls the original's sides as functions of (x, y) at T⁻¹(x, y).
  Desmos then re-plots everything, implicit curves included, through its own
  evaluator. Slowness comes from Desmos re-sampling implicit equations, which
  is far more expensive than explicit y = f(x).
- **Redraw route** (`redraw.ts`, `MatrixLayer.ts`): wraps Desmos's
  `graphsLayer.redrawToCtx` and maps Desmos's own sampled polylines through T
  each frame, subdividing segments for curved maps ("Redraw detail": fast /
  balanced / fine). Shaded regions are rebuilt from boundaries.
- Rafael says matrices are "very slow to render".

Questions:

1. Measure first: which route, which expression types, how many ms per
   frame and per slider tick, and where (Desmos's evaluator, our mapping,
   canvas path filling)?
2. For linear maps, can the exact route skip implicit plotting entirely
   (an explicit curve under a linear map is still parametrisable: map
   (x, f(x)) forwards as a parametric instead of plotting F(T⁻¹(q)) = 0)?
3. For the redraw route: cache mapped polylines per sketch and only remap on
   change; adaptive subdivision by the map's local Jacobian rather than a
   fixed detail; Path2D reuse; drawing on the GPU instead of Canvas 2D.
4. Is there a cheaper hook in Desmos's grapher (a transform applied at
   projection time) that avoids touching polylines at all? It is minified
   and undocumented; say how you would find it and how to make the code
   fail safe if a Desmos release renames it.

## What to send back

For each of the three, ranked by expected speedup per day of work:

1. The bottleneck, with how you measured it (code or numbers).
2. The change, concretely enough to implement (files, data layout, shader
   sketch), and its expected speedup on an integrated GPU and a discrete one.
3. What could get worse (picture, accuracy, browser support) and the test
   that would catch it.
4. Anything you would _not_ do, and why.

Prefer proposals that keep the existing tests meaningful. Where you need a
browser to measure, say so and give the script; the developer will run it
and send the numbers back.
