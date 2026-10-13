# Air flow: no crashes, correct, no lag, extremes at 60 fps

_Written 2026-10-13, before any of the work. It measures the Wind tunnel as it
stands, names what breaks, and ranks what to build. The liquid's own state is
at the end._

Rafael asked for air flows that "don't crash, are mathematically correct,
don't lag at all, and can handle extreme situations at 60 fps." This is the
preparation: a stress harness, its baseline, and a plan in the order the
evidence supports.

## The harness

`docs/mockups/fluid-stress/wind-tunnel-stress.cjs` drives the real Fluid tab
in Desmos through eight cases for 8 seconds each. For each it records frames
a second, the 95th-percentile and worst frame, the real-time factor (simulated
seconds per real second), the peak Mach number, every notice the tab gives,
and whether every measurement is finite. Results are in
`docs/assets/fluid-stress/results.json`, with one screenshot per case.

The plugin's settings outlive the page. The first run carried the fine
grid's 1024 cells into every case after it, so each case now starts from
`resetConfig()`.

## The baseline (Iris Xe, 2026-10-13)

| Case                                         | fps     | p95 frame  | Real time | Peak Mach | What happened                                                         |
| -------------------------------------------- | ------- | ---------- | --------- | --------- | --------------------------------------------------------------------- | ---- | ---- |
| Cylinder, Re 100                             | 59.1    | 17 ms      | 0.97      | 0.30      | Auto halved the lattice speed                                         |
| Cylinder, Re 2000                            | 60.1    | 17 ms      | 1.00      | 0.30      | Auto halved the lattice speed                                         |
| Inflow 40 units/s                            | 60.0    | 17 ms      | **0.32**  | 0.18      | Halved; runs at a third of real time                                  |
| 1024 cells across                            | **6.3** | **183 ms** | 0.36      | 0.29      | **Lag**: the frame budget counts steps, not milliseconds              |
| Eight solids, Re 500                         | 60.1    | 17 ms      | 1.00      | 0.30      | Halved                                                                |
| A wall across most of the tank,              | y       | ≤ 5.5      | 60.1      | 17 ms     | 1.00                                                                  | 0.18 | Fine |
| Thin plate two cells from the inlet, Re 1000 | 59.9    | 17 ms      | —         | **0.74**  | **Crash**: unstable, stopped, then the browser took the WebGL context |
| A solid dragged at 8 units/s                 | 60.1    | 17 ms      | 1.00      | 0.30      | Wall speed clamped to 0.05 cells a step; halved                       |

Every measurement stayed finite, and no case threw a page error.

## What breaks, and why

1. **Crash at extremes.** With a thin plate near the inlet at Re 1000, Auto
   halves the lattice speed once at Mach 0.39. After that the Mach number
   climbs in steps from 0.32 to 0.74, with a "speed limit exceeded" notice at
   each, until the flow goes unstable and stops. Then the browser drops the
   graphics context, probably after an over-long GPU frame. There are two
   faults:
   - Auto reacts once and then only reports. It never halves again.
   - The solver is BGK with Smagorinsky in the bulk (regularisation is used
     only at open boundaries). BGK is the collision the literature
     shows going unstable first in under-resolved, high-Re flow.
2. **Lag on big grids.** `StepScheduler` caps a frame at 64 steps, whatever
   they cost. At 1024 cells a step costs about 3 ms, so 64 steps make a
   183 ms frame. The cap has to be in milliseconds.
3. **A speed that is set too high.** Every case, even Re 100, reaches Mach
   0.30 and is halved within seconds. Starting at the speed Auto settles on
   would remove the restart from the common case.
4. **Fast inflow falls behind real time** (0.32 at 40 units/s). This is the
   Mach limit, not lag: a faster inflow needs more steps a second. It is a
   real trade-off between real time and accuracy, so it is for Rafael. The
   tab should at least say "slow motion ×3" plainly.

## The plan, in order

Each step is checked by the harness above, plus the existing integration
tests (cylinder Strouhal 0.18–0.3, drag over 1.5), before the next.

1. **A time budget per frame** (lag). Measure what a step costs. Prefer
   `EXT_disjoint_timer_query_webgl2` where present, sampled every few frames
   rather than every frame, since timer queries are reported to slow some
   drivers. Otherwise use the frame time from `requestAnimationFrame`. Run as
   many steps as fit in about 8 ms, and report the rest as slow motion.
   _Target: the 1024-cell case at ≥ 55 fps, its real-time factor shown._
2. **Never block the GPU long enough to lose it** (crash). The same budget
   bounds each submission. Handle `webglcontextlost` by cancelling it and
   rebuilding the lattice from the last state held on the CPU, instead of
   telling the user to restart. _Target: no context loss in any case._
3. **Auto that keeps acting** (crash). Halve again at every Mach crossing,
   down to a floor. Keep the last valid state (the "rollback above Re 200"
   that `FLUID_TAB.md` lists as not built) and return to it on a NaN instead
   of stopping. _Target: the thin-plate case runs on, below Mach 0.3._
4. **A collision model that survives under-resolved, high-Re flow**
   (correctness). The candidates:

   - **Regularised bulk collision.** It is already written for the
     boundaries and for the liquid (Latt–Chopard); it is the smallest change.
   - **Cumulant collision** (Geier et al. 2015). It is validated on spheres
     from Re 200 to 10⁵, and to 10⁶ in the 2017 follow-up.
   - **KBC entropic multi-relaxation** (Karlin, Bösch and Chikatamarla).
     It is more stable and accurate than BGK and ELBM on under-resolved 2D
     turbulence.

   Pick by the cylinder benchmarks already in the tests (Strouhal, drag),
   plus the thin-plate case. This is the step to brief GPT on; it is the
   research part.

5. **Start at the speed Auto settles on** (smoothness): 0.05 rather than
   0.1, unless step 4 makes 0.1 safe. _Target: no halving notice in the
   baseline case._
6. **Fast inflow** is Rafael's call (see 4 above): real time at lower
   accuracy, or accurate in slow motion. Either way, behind a labelled
   control.

## The liquid

Unchanged since 2026-10-06 (see `FLUID_TAB.md` "Next" and the liquid
mock-up). It waits on three answers from Rafael:

- whether "too fast" meant the playback or the water itself;
- whether the bubbles should be on by default;
- whether to run a GPT round on energy decay, 2D dissipation and surface
  tension.

The port's checklist (GpuLiquid from the page: mass as its difference from
density, fresh flags, the regularised collision with its momentum term, the
slip wall) is ready. Step 1 above, the time budget, is shared with it.

## Sources

- Geier, Schönherr, Pasquali and Krafczyk, _The cumulant lattice Boltzmann
  equation in three dimensions: Theory and validation_, Comput. Math. Appl.
  70(4), 2015, doi:10.1016/j.camwa.2015.05.001; the 2017 follow-up to Re 10⁶:
  [TU Braunschweig](https://www.tu-braunschweig.de/fileadmin/Redaktionsgruppen/Forschung/SFB880/Veroeffentlichungen/Veroeffentlichung_A5_2017_Kutscher_Param_cumul_Journ_Compu_rev_2.pdf).
- A comparison of collision models:
  [arXiv:1904.12948](https://arxiv.org/pdf/1904.12948).
- Bösch, Chikatamarla and Karlin, _Entropic multi-relaxation models for
  simulation of fluid turbulence_:
  [arXiv:1507.02509](https://arxiv.org/abs/1507.02509).
- `EXT_disjoint_timer_query`:
  [Khronos registry](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query);
  context loss from long GPU work:
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost).
