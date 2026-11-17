# Fluid research: the follow-up rounds

---

The follow-up prompts that went to GPT after
`VECTOR_TOOLS_FLUID_RESEARCH_BRIEF.md` (round 1), one section per round, as
they were sent. They were four files, `VECTOR_TOOLS_FLUID_RESEARCH_FOLLOWUP.md`
and `_2` to `_4`, merged on 2026-11-17 with only their headings moved down a
level. What was built from them, and how it was checked, is in
`FLUID_TAB.md`.

| Round | Written    | Was               | Asked                                                     |
| ----- | ---------- | ----------------- | --------------------------------------------------------- |
| 2     | 2026-10-02 | `…_FOLLOWUP.md`   | What the first reply could only propose, measured         |
| 3     | 2026-10-02 | `…_FOLLOWUP_2.md` | The solver's three core numerical choices, by measurement |
| 4     | 2026-10-04 | `…_FOLLOWUP_3.md` | Half-precision storage, and the liquid                    |
| 5     | 2026-10-05 | `…_FOLLOWUP_4.md` | Making the liquid behave like real water                  |

---

## Round 2 (2026-10-02): Follow-up research prompt: fluid flow and 3D FieldPlay

_Written 2026-10-02, after GPT's first reply (`Vector_Tools_Research_Reply.zip`:
`Vector_Tools_Fluid_Research.md` and `Future_Research_Assessment.md`). The
prompt below is meant to be pasted into the same ChatGPT conversation._

---

Thank you. Your reply was checked against the repository. Your replay of the
mock-up kernel reproduces exactly when rerun: mean C_D 2.06686, upstream
density 1.12076, St 0.19628, sampled peak Mach 0.2952. Three findings were
confirmed in the code, and all three change the plan:

- the tank is pressurised to ρ ≈ 1.08–1.14, because no boundary fixes the
  pressure and the inlet trim pumps mass in;
- `latexToGLSL.ts` guards such as `sqrt(max(a,0))`, `log(max(a,1e-12))`,
  `asin(clamp(...))` and `vtDiv` would fabricate solids;
- the level-set wall velocity carries normal motion only.

The `matrix3.ts` row-major/column-major comment conflict and the stale
`symbolic.ts` description were also confirmed.

This round is narrower. Please **turn your proposed targets into measured
numbers where a CPU can measure them**, and **pin data that must not be
reconstructed from memory**. Keep the evidence labels you used (code evidence,
supplied measurement, independent calculation, proposed target, unverified,
decision). They worked well.

The following are **out of scope**, because they will be done against a real
Desmos and real GPUs on our side:

- GPU timings;
- probing the live Desmos 3D camera and projection;
- testing how native `vector()` lists behave;
- product decisions.

### Task 1 (highest priority): a CPU reference solver, and the experiments you proposed

Write a dependency-free JavaScript ES module, `reference/lbm2d.mjs`, runnable
in Node 20 or later, that implements D2Q9 with **exactly the mock-up's
conventions**:

- numbering 0 rest, 1 E, 2 N, 3 W, 4 S, 5 NE, 6 NW, 7 SW, 8 SE;
- post-collision storage with pull streaming, `f_i(x, t+1) = f_i*(x − c_i, t)`;
- cell index `y·NX + x`, with y pointing up;
- lattice units, `c_s² = 1/3`;
- selectable `Float32Array` or `Float64Array` storage, because the GPU will be
  float32.

It will become the oracle our unit tests (Jest, Node) compare a GLSL
implementation against. Give it a small, documented, deterministic API. For
example:

- `createLattice({ nx, ny, tau, storage })`;
- `setSolids(predicate)`, and link fractions `q` for BFL from a signed function
  `F(x, y)` by bracketed bisection, as you described;
- `setBoundaries({ left, right, top, bottom })`, with types `zouHeVelocity`,
  `pressure` (reconstructed), `zeroGradient`, `equilibrium`, `slip`, `noSlip`
  and `periodic`;
- Guo forcing;
- `step(n)`;
- `macroscopic()`;
- `bodyForce(bodyId)` by momentum exchange;
- `massTotal()`.

Then run the experiments below. State each one's wall-clock time and the
resolutions you could afford. Shrink the grid rather than skip a case, and say
so when you do. Report numbers only from runs you actually completed.

1. **Boundaries in an empty channel.** No-slip walls, Re about 50, Zou–He
   velocity inlet (uniform, then parabolic) with a reconstructed pressure
   outlet. Run at H = 16, 32 and 64. Report inlet, section and outlet flux, mass
   drift, the density range, and the profile L2 error against Poiseuille once
   developed. Repeat with the mock-up's pair (an equilibrium inlet at ρ = 1 with
   a zero-gradient outlet) so the difference is measured, not argued.
2. **The mock-up's own cylinder, re-run with correct boundaries.** Use 300 × 120
   cells, D = 20, the centre at the mock-up's position, slip top and bottom, and
   Re 100. Use the same deterministic start: ramp, then a gust, as in the
   mock-up's code. Compare:

   - (a) the mock-up's boundaries with the inlet trim, against
   - (b) a Zou–He inlet with a reconstructed pressure outlet and no trim.

   For each, report the tank density range, mean upstream speed and density,
   C_D normalised both ways, C_L amplitude and St. Does the pressurisation
   disappear? Does St move?

3. **DFG 2D-1 (steady, Re 20)** at D = 16 and D = 32 (and 48 if time allows),
   with staircase bounce-back against BFL. Report C_D, C_L and Δp against the
   official values, plus the change in C_D when the cylinder is shifted by half
   a cell.
4. **Outlet reflection.** A small Gaussian pressure pulse travelling into
   (i) a zero-gradient outlet, (ii) the reconstructed pressure outlet and
   (iii) a sponge 16 and 32 cells wide. Report the reflection coefficient R
   measured as you defined it.
5. **Galilean check for a moving body.** A cylinder translating at constant
   speed through fluid at rest, against a fixed cylinder in uniform flow at the
   same Re. Use the moving-wall bounce-back term, and refill uncovered cells as
   you recommend. Compare the drag. This tells us whether the mock-up's
   "drag the point" interaction can ever be quantitative.
6. **Mach sensitivity.** Run case 2(b) at an inlet lattice speed of 0.05, 0.1
   and 0.15, with τ adjusted to hold Re. Show how C_D and St move.

Deliver the module, a `reference/run-all.mjs` that reproduces every number,
and `results/*.json`.

### Task 2: benchmark data, retrieved rather than remembered

Build `data/benchmarks.json`. Every value needs its source (URL, paper, table or
figure number) and a retrieval date. A value you cannot retrieve from a primary
or official source is marked `"unretrieved"`, never filled from memory.

- **Ghia, Ghia and Shin (1982)**: u along the vertical centreline and v along
  the horizontal centreline at Re 100, 400 and 1000. Add Erturk et al. (2005)
  where it supersedes them.
- **DFG 2D-1 and 2D-2** official values. For 2D-2, the cycle statistics (mean,
  minimum and maximum of C_D and C_L, and St) from the official time-series
  files, with their checksums.
- **The unconfined cylinder**: Park, Kwon and Choi (1998) at Re 40, 60, 80, 100
  and 160. Williamson's St–Re relation for laminar shedding, with its stated
  range. The recirculation length at Re 40.
- **The backward-facing step** (Armaly et al. 1983): reattachment length
  against Re, with the expansion ratio and Re definition.
- Kovasznay and Blasius constants, as you gave them, with sources.

### Task 3: Desmos's real-number semantics, for a strict geometry compiler

Obstacles will compile through a new strict mode in which each operation
returns a value and a validity flag. To match Desmos rather than guess, please
produce a table: **expression → what Desmos does → source (help-centre article,
official documentation, or "needs a runtime test")**. We will run every
"needs a runtime test" row in a real Desmos.

Cover at least:

- `sqrt`, `ln`, `log`, `arcsin`, `arccos`, `arccosh` and `arctanh` outside
  their domains;
- division by zero, and `0^0`;
- negative bases with fractional exponents (Desmos's rule for odd-denominator
  rationals such as `(−8)^{1/3}`), and `\sqrt[n]{}` of negatives;
- `mod` with negative arguments;
- factorial of non-integers;
- a piecewise with no matching branch;
- a restriction `\{...\}` attached to an inequality;
- chained inequalities;
- strict against non-strict inequalities (how the boundary is drawn);
- how `y < f(x)` is shaded where `f` is undefined;
- degree mode;
- what changes in complex mode.

Then propose the validity-propagation rules in GLSL ES 3.00: which operations
produce invalid, how invalid passes through comparisons and piecewise
branches, and the cost per operation.

### Task 4: legibility and rendering for layered 3D FieldPlay

Rafael's proposal, which your Q11(c) endorsed: particles seeded in stacked
z-layers that share one fixed total count, most of them opaque and bold, and
10–30% lighter so the motion inside stays visible. You noted that opaque
particles occlude strongly. Please research how to keep a dense 3D particle and
trail field legible, with mechanisms rather than names:

- opacity optimisation for line and particle fields (Günther, Rössl and
  Theisel 2013, and successors, including any particle or point variants);
- depth-dependent halos (Everts et al. 2009);
- illuminated lines (Zöckler et al. 1996; Mallo et al. 2005);
- ambient occlusion for lines;
- depth cueing;
- seeding strategies for 3D.

For each technique, give its cost in WebGL2 and its benefit to legibility.
Then recommend what "lighter" should modulate (alpha, luminance, size, trail
length, or a combination), with perceptual reasons.

Give WebGL2 specifics for 60,000 particles with 30 world-space history samples
each:

- trails as camera-facing quads or ribbons expanded in the vertex shader from
  `gl_VertexID`, since `lineWidth` above 1 is not portable;
- the ring-buffer layout in textures;
- per-frame draw cost;
- what to drop first when over budget.

### Task 5: what upstream DesModder and the Desmos API know about 3D

Our fork merged upstream DesModder at `53ff70bc`, and our `graph-state` types
know only `threeDMode` and the 3D parametric domains. Please check:

- **Upstream DesModder** (github.com/DesModder/DesModder) since that merge, for
  any 3D-related code: camera or projection access, 3D viewport bounds,
  perspective, 3D GLesmos or overlay work, and `graph-state` additions for 3D.
  Cite file paths and commits.
- **The Desmos API v1.11 `Calculator3D` documentation**: which options,
  settings or `getState()` fields expose 3D bounds, rotation and perspective.

We will verify everything you find at runtime. Do not guess private property
names; say "not found" instead.

### Format of the reply

Send one zip containing:

- `Vector_Tools_Fluid_Followup.md`: one section per task, measured numbers in
  tables, and evidence labels throughout;
- `reference/`: the solver and the run-all script;
- `results/`: the JSON from every run;
- `data/benchmarks.json`.

End the report with any change to your gate order that the measurements
justify, and list what is still unknown.

---

## Round 3 (2026-10-02): Second follow-up research prompt: choosing the numerical core

_Written 2026-10-02, after GPT's `Vector_Tools_Fluid_Followup.zip`. Its 13
solver tests pass on our machine, and a rerun of the H16 channel pair matched
all 325 numeric fields of its JSON exactly. This round is meant to be the last
research round before building gate 0. It asks GPT to make the three remaining
core numerical choices by measurement, using its own oracle. Everything that
needs a live Desmos or a GPU stays on our side._

---

Thank you. The package was verified on our machine. All 13 reference tests
pass, and a rerun of `channel --case H16-uniform` reproduced every numeric
field of your JSON exactly. The oracle is now our ground truth.

Several findings are now settled and will be built on:

- the equilibrium inlet with a zero-gradient outlet starves the channel and
  pressurises the tank;
- a reconstructed pressure outlet reflects R ≈ 0.76, and a 32-cell blend
  brings that to about 0.008;
- regularised boundaries with that sponge give clean shedding;
- BFL cuts half-cell drag sensitivity about fivefold;
- the DFG 2D-2 cycle statistics are pinned.

Desmos runtime semantics, the live 3D camera (your Quake Pro leads,
`perspectiveDistortion` and `getFovBeforePerspectiveDistortion`, are exactly
what we needed), GPU timings and perceptual tests are all ours, so leave them
out.

Three core choices remain that your CPU oracle can decide. Please extend
`reference/lbm2d.mjs` without breaking its API or its 13 tests, add tests for
everything new, and run the experiments below.

The same rules as last time apply:

- report only completed runs, with wall-clock times;
- shrink a grid rather than skip a case, and say so;
- failed runs stay in the results;
- keep the evidence labels.

Priority order is A1, B1, C1, then A2, B2, B4, then the rest.

### A. The collision operator

Add `collision: { type: 'bgk' | 'trt' | 'regularized' | 'mrt', ... }`. For TRT,
include the magic parameter Λ as an option. Add an optional Smagorinsky closure
that can sit on top of any of them. Raw Zou–He at τ = 0.53 failed after 123
steps last round, and an interactive Reynolds-number slider will reach τ much
closer to 0.5 than that.

1. **A1, a stability map.** Use your case-2 cylinder with the regularised
   boundaries and the 32-cell sponge: 300 × 120, D = 20, the deterministic ramp,
   gust and seed. Run at U ∈ {0.05, 0.1} and Re ∈ {100, 200, 400, 800, 1600},
   for each of:

   - BGK;
   - TRT with Λ = 1/4;
   - TRT with Λ = 3/16;
   - regularised collision;
   - MRT, if you implement it;
   - BGK with Smagorinsky at C = 0.1 and C = 0.17.

   For each run, report survived or failed (with the step), the peak local
   Mach, the density range, and whether a regular shedding period was accepted
   under your own St criterion. Use a fixed advective duration per run, and
   state it.

2. **A2, accuracy at Re 100.** Run DFG 2D-2 with BFL at D = 16 and D = 32 for
   each operator that passed A1 at Re 100, against your pinned official cycle
   statistics:

   - C_D maximum, minimum and both means;
   - C_L amplitude;
   - St.

   Also run DFG 2D-1 at D = 32 with TRT and regularised collision. BGK's wall
   position depends on τ, and TRT is supposed to remove that dependence: does
   it close the remaining 1.46% drag gap?

3. **A3, cost.** Give the per-cell operation count for each operator, plus the
   measured JavaScript time per step relative to BGK on the same grid, labelled
   clearly as a CPU proxy, not GPU timing.

Deliver a recommendation: one default operator for an interactive slider
spanning Re 10–2000 at about 20 cells across D, and what the panel should do
when a setting is out of the stable envelope.

### B. Moving obstacles

Last round's translating cylinder matched the fixed one's mean drag to 2.36%.
But its force fluctuation RMS was about 10× the fixed case, and the tank lost
0.34% of its mass. Dragging a Desmos point through the fluid is the
interaction users will try first, so the method matters more than any other.

Add two alternatives to the refill bounce-back:

- **Partially saturated cells**, after Noble and Torczynski (1998): the solid
  fraction per cell comes from the signed function F, either by sub-cell
  sampling or as a smooth coverage estimate from `F/|∇F|`. State which you use.
  It is attractive here because it needs no refill and works directly from the
  strict geometry's F.
- **One immersed-boundary direct-forcing scheme.** For example, multi-direct
  forcing (Wang, Fan and Luo 2008) or implicit velocity correction (Wu and Shu
  2009). Choose one and justify it.

Then run:

1. **B1, the Galilean pair again** (your case 5) for refill bounce-back, PSM and
   IB. Report mean C_D against the fixed case, force fluctuation RMS and
   half-range, mass change, and the cost per step relative to the stationary
   case.
2. **B2, tangential wall motion.** Taylor–Couette flow: the inner cylinder
   rotates at Ω, the outer is fixed. The steady solution is exact,
   `u_θ = A r + B/r`, and the torque is known. Run it at two resolutions for
   halfway bounce-back with a material wall velocity, BFL with a moving
   correction (if you can make one consistent; otherwise say so), PSM, and IB.
   This is the case the level-set velocity cannot represent.
3. **B3, a resizing body.** A circle whose radius grows smoothly from r₀ to 1.5r₀
   over a stated time, in fluid initially at rest: the "slider changes r" case.
   Report the mass balance, the pressure pulse amplitude, and the displaced
   volume against the measured outflow.
4. **B4, a realistic pointer.** Move a cylinder along a recorded-style pointer
   path: 60 Hz samples, smooth segments mixed with jumps of 1, 3 and 10 cells
   per frame. For each method, report:
   - the substeps per frame needed to keep wall displacement at or below 0.25
     cells per step;
   - what breaks when that is violated;
   - the best policy for a teleport (sweep the body, reset locally, or pause
     and resume).

Deliver a recommendation: which moving-obstacle method the tab should use for
dragged points, sliders and t-dependent obstacles, and whether any of them can
carry a quantitative force readout while moving.

### C. Float32 fidelity

The oracle stores float32 but computes in binary64, so it cannot set tolerances
for comparing it against a GLSL implementation.

1. **C1.** Add an arithmetic mode that rounds with `Math.fround` after every
   operation in the hot loop (collision, streaming and boundaries), so it
   behaves like a float32 ALU. Compare four variants:

   - float64;
   - float32 storage only;
   - float32 arithmetic;
   - float32 arithmetic with **shifted populations** (storing `f_i − w_i ρ₀`).

   Run each on:

   - (a) a long Taylor–Green decay at a small velocity (at least 10⁵ steps):
     amplitude error, mass drift;
   - (b) the case-2 cylinder at Re 100 with the A1 default operator: C_D, St,
     mass drift, density range.

2. From those results, recommend:
   - the storage form for the GPU;
   - per-quantity tolerances for GLSL-against-oracle tests (single step,
     100 steps, the long run, and forces);
   - whether any reduction (mass, force) must be done in higher precision,
     such as Kahan or pairwise summation in the reduction passes.

### D. Optional, only if time remains

Find an open-access primary source with fine-grid unconfined-cylinder values
at Re 100: mean C_D, C_L amplitude or RMS, and St, with domain size and
blockage. That would replace the unretrieved Park and Williamson rows. The
same rule applies: retrieved from the primary text, or marked unretrieved.

### Format of the reply

One zip, the same layout as last time:

- `Vector_Tools_Fluid_Followup_2.md`, with one section per task, tables, the
  three recommendations, and what is still unknown;
- `reference/`, updated and backward-compatible, with new tests;
- `results/`, the JSON for every run;
- `results/INDEX.md`.

Run commands should be `node reference/run-all.mjs --group <name>` as before.

---

## Round 4 (2026-10-04): Vector Tools fluid — research round 4: the liquid, and half-precision storage

This continues the thread that produced `Vector_Tools_Fluid_Research.md`,
`lbm2d.mjs` (round 2) and the PSM/collision/float32 study (round 3). Everything
from rounds 1–3 that was adopted is now built, live and tested; the state is
summarised in `FLUID_TAB.md` (attached), and the solver sources are attached
too.

What changed since round 3, briefly:

- The D2Q9 solver (BGK + Guo, shifted float32 populations, BFL walls,
  regularised Zou–He sides, sponge, Smagorinsky above Re 200) runs on WebGL2 in
  one fragment pass per step, three RGBA32F textures plus an RGBA32F force
  target, ping-pong. GPU matches the CPU reference to 4·10⁻⁹ per step;
  DFG 2D-1 C_D within 1.45%, 2D-2 St within 0.17%.
- Moving solids are PSM (your M2/B2) while they move and are **parked** as BFL
  solids when their slider is still. Their level set is sampled on the GPU.
- Auto now halves the lattice speed **in place** (equilibrium at s·u and s²·δρ,
  non-equilibrium × s(τ′−1)/(τ−1) for post-collision populations): a
  Taylor–Green vortex rescaled mid-decay continues within 0.08% of the
  unscaled run.
- The velocity inlet now absorbs sound (part C below asks you to check it).

Measured on the maintainer's machine (Intel Iris Xe, Chrome, ANGLE/D3D11):
300 × 167 cells costs 0.10 ms per step (≈500 MLUPS); 600 × 334 costs 1.22 ms
per step (≈160 MLUPS) — 12× the time for 4× the cells, so the solver is
memory-bandwidth bound once the lattice outgrows the cache.

Please answer A, B and C. As in round 2, **a runnable CPU oracle with tests
and pinned numbers is worth more than prose**: where you recommend a method,
implement it in `reference/` as `.mjs` with `node --test` tests, report the
numbers you measured, and say plainly what you did not run.

---

### A. Half-precision population storage (efficiency)

The step reads 9 populations from three RGBA32F textures and writes 12 floats
plus a 4-float force target: about 200 bytes per cell per step. Halving the
population bytes should nearly halve the step time on integrated GPUs.

1. Lehmann et al. (FluidX3D; "Accuracy and performance of the lattice
   Boltzmann method with 64-bit, 32-bit, and customized 16-bit number
   formats", Phys. Rev. E 106, 015308, 2022) report FP32 arithmetic with
   16-bit storage (FP16S: IEEE half of scaled DDF shifts; FP16C: a custom
   16-bit float) at near-FP32 accuracy for many cases. **Which of these maps
   onto WebGL2**, where the options are `RGBA16F` render targets (IEEE half,
   filterable, renderable with `EXT_color_buffer_float`) and `RGBA16UI`
   integer targets decoded with bit operations in GLSL ES 3.00?
2. Our populations are already shifted (f − w_i). Give the exact scaling for
   FP16S given our δρ and velocity ranges (Ma ≤ 0.3, Re up to ~1000, τ from
   0.5005 to ~1.5), and the FP16C encode/decode in GLSL ES 3.00 if FP16S is
   not enough.
3. **Accuracy, measured on your oracle:** Taylor–Green decay rate at
   U₀ = 10⁻² and 10⁻⁴, Poiseuille, DFG 2D-1 C_D and Δp, DFG 2D-2 St and
   C_D,max, each with FP32, FP16S and FP16C storage (FP32 arithmetic).
   Which fail, and where (low Mach, high Re, near walls)?
4. The macroscopic δρ/ux/uy channel and the force target: can they drop to
   half precision too, given that BFL reads δρ at moving walls, the absorbing
   inlet reads δρ, and drag/lift are summed from the force target?
5. Any other bandwidth saving that is valid in WebGL2 fragment shaders
   (round 1 already ruled out in-place AA/esoteric streaming: no reading and
   writing the same attached texture). For example, packing the solid mask and
   link fractions, or skipping the force target on steps nobody reads.

### B. The liquid

Rafael's product choice (brief §8.0): after the wind tunnel and stirred box,
"the liquid right after": a free-surface liquid that pours from a draggable
point onto whatever the graph makes solid. The house rule is a research-grade
engine explained in AP-level words, so a liquid that can be **measured**
(hydrostatic pressure, Torricelli efflux, a dam break against published data)
is the goal, with a visual-only mode acceptable only if clearly labelled.

Round 1 concluded: visual PBF possible now; quantitative liquid later via a
MAC/APIC grid solver or a validated incompressible particle method; do not
reuse single-phase LBM pressure without an interface algorithm. We now have a
validated, fast D2Q9 GPU solver with strict-geometry solids, BFL walls, PSM
moving solids, Guo forcing and an in-place speed change. That makes a
**free-surface LBM** (mass-tracking VOF-LBM: Körner et al. 2005; Thürey 2007;
Bogner, Rüde et al.; FluidX3D's GPU implementation) the obvious candidate,
since it would reuse all of that. Please decide between it and the
alternatives, and if it wins, specify it fully.

1. **Method choice**, against: (a) free-surface D2Q9 with mass tracking
   (fluid / interface / gas cells, fill level φ); (b) FLIP/APIC on a MAC grid
   with a pressure projection; (c) PBF or DFSPH. Criteria: accuracy on the
   benchmarks below; implementability in **WebGL2 fragment shaders without
   compute or scatter** (round 1 noted that RGBA32F blending is not
   guaranteed, which matters for particle-to-grid); reuse of our solver and
   solids; behaviour with moving PSM solids and parked BFL ones; cost at
   300 × 170 cells on an integrated GPU.
2. If free-surface LBM: give the algorithm as ordered GPU passes, each a
   pure gather (no scatter, no atomics), with:
   - the interface boundary condition (reconstruct missing populations from
     the gas pressure and the interface velocity, and which directions to
     reconstruct: those from gas cells, or those against the normal too);
   - mass exchange between cells, in a form two neighbouring cells compute
     identically (so it conserves mass without atomics);
   - cell-type conversions (interface→fluid when φ ≥ 1, →gas when φ ≤ 0),
     the neighbour fixes they require (new interface cells' populations;
     excess mass redistribution), all as gather passes, and how many passes;
   - the normal and curvature from φ for surface tension (and whether to
     include it at all at this resolution);
   - gravity in lattice units: the bounds that keep the flow below Ma 0.3 and
     the interface stable, and how to choose g_lattice from a graph's g;
   - how solids (BFL and PSM) meet the interface, including a moving PSM
     solid entering liquid;
   - the in-place speed change (above) with liquid present: does it carry
     over, and what scales with what.
3. **Oracle:** a CPU free-surface D2Q9 in `reference/` (or an extension of
   `lbm2d.mjs`), with tests that report:
   - total mass drift in a closed tank over 10⁴ steps (target < 0.1%);
   - hydrostatic pressure at rest against ρ g h (target < 1% at mid-depth);
   - a dam break against Martin & Moyce (1952) with the geometry, aspect
     ratio, release and time normalisation pinned, front position x(t);
   - Torricelli efflux from a tank with an orifice against √(2gh), with the
     discharge coefficient you expect at this resolution;
   - the same at two resolutions, to show convergence.
4. **Display:** the surface from φ (marching squares at φ = ½ in a fragment
   pass? a screen-space reconstruction?), and how our particle renderer should
   behave inside and outside the liquid (particles only where φ > ½?).
5. **The visual alternative:** if (a) is out of reach, specify the best
   labelled visual liquid instead, and what it would have to show to say so.

### C. Check the absorbing inlet

The wind tunnel's velocity inlet reflected sound fully, so a solid near it
made the tunnel ring at its round-trip period (inflow pulsing 3.5%,
δρ swinging 8.9·10⁻³ at the inlet). We now prescribe, on the inlet's
regularised Zou–He reconstruction,

u_n = U_n − c_s (δρ − δρ̄), δρ̄ ← δρ̄ + (1/2000)(δρ − δρ̄) per step,

where δρ is the cell's previous-step density and δρ̄ a per-row low-pass, so the
first-order characteristic condition lets an outgoing acoustic wave leave while
the steady pressure a solid raises is kept. Measured: a pulse comes back at
0.90 from the rigid inlet and 0.018 from this one; on the ringing scene δρ's
swing fell to 9.7·10⁻⁴ and the pulsing to 0.7%. While the tank's mean
pressure is still settling, δρ̄ lags it and the inflow runs up to 2% short for
some seconds.

1. Is this a sound condition, and is there a better one for regularised
   Zou–He at Ma ≤ 0.3 (Izquierdo & Fueyo 2008; Wissocq, Sagaut & Boussuge
   2017; Heubes et al.)?
2. A better way to keep the mean than the low-pass, with no lag during
   start-up (a global mass-flux constraint? a target total inflow?).
3. Does it change DFG 2D-2's St or C_D on your oracle, with the inlet as
   it is in the benchmark?

### Deliverables

- `Vector_Tools_Fluid_Round4.md`: answers to A, B, C, with what was measured
  and what was not.
- `reference/`: runnable oracle code and tests for A (storage formats) and B
  (free surface), with result files we can rerun bit for bit, as in round 2.
- A recommendation, in order: what to build first (FP16 storage, the liquid,
  or both), and the acceptance numbers each must meet.

---

## Round 5 (2026-10-05): Vector Tools fluid — research round 5: making the liquid behave like real water

This continues the thread of rounds 1–4. Round 4 gave us the free-surface
oracle (`free-surface.mjs`) and the FP16S study; both are built. The liquid now
runs as an interactive mock-up (`liquid-mockup.html`, attached), and a CPU
reference with validation scripts is attached as `liquid-validation/`. Please
read its `README.md` first: it holds every number quoted below and how each
was measured.

### Where the liquid stands

- **The tank.** A 1 m wide tank of water, simulated as a 2D slice.
  - D2Q9 free-surface LBM: your round-4 mass ledger and the five gather
    passes.
  - Regularized collision (Latt–Chopard), keeping the non-equilibrium momentum
    that Guo forcing puts there. Without it half the gravity was applied.
  - Smagorinsky C = 0.1.
  - Water's own viscosity: τ = 0.5 + 3ν·dt/dx² ≈ 0.50001.
  - Lattice gravity 3·10⁻⁵, so dt = √(g_lat·dx/g).
  - It plays in real time on WebGL2, float32, with mass stored as its
    difference from density. At 6 mm cells (160 × 96) on an Intel Iris Xe that
    takes 12 000 steps a second; real time needs 7 233.
- **Flag rules.**
  - A surface cell with no liquid beside it is emptied, and the ledger's
    reservoir keeps its mass.
  - For holes, either half-full cells inside the liquid fill 5% a step, or
    (with bubbles) Thürey's rule applies.
  - Spray (a surface cell with no bulk liquid beside it) is held to Mach 0.25.
- **Walls.** By default a slip wall with log-law friction: specular
  reflection on straight walls, plus a wall-stress body force from
  u/u*τ = ln(y u*τ/ν)/κ + B at the first cell's centre (κ 0.41, B 5.2). Plain
  bounce-back is a switch.
- **Bubbles (a switch).** Each enclosed gas region is an ideal gas with p·V
  kept, as in Thürey, Körner and Anderl. On the GPU:
  - regions are labelled in a shader and summed onto a root pixel with
    float-blended scatter;
  - pressure is limited to ±0.15 atm;
  - the update runs every 4th step.
- **Tap.** A nozzle kept full, with the jet leaving at 1 m/s.

What matches reality, measured:

- **Dam-break front speed.** Late-stage speed 1.32 √(gH) against Martin &
  Moyce's 1.32. Positions run 3–6% ahead; with 3 mm cells, 9%.
- **Hydrostatics.** Within 0.1–0.65% of ρgh.
- **Mass.** Kept to 10⁻⁷–10⁻⁸ on the GPU.

### What Rafael reports, and what we found

Rafael tried it and said the water is "too fast", leaves holes, sticks to
walls weirdly, and should "act exactly like real life fluid". He asked us to
look to real experiments and real simulations. In order:

1. **Sticking (largely fixed).** Bounce-back stops the first cell dead.
   - A 1.5 cm film beside a wall fell 38% as far as free fall; a 3 cm slab
     74%.
   - The slip-plus-log-law wall gives 80% and 93%. The same slabs in open air
     fall 89% and 98%.
   - So the free surface itself slows thin sheets by about 10%. Why?
2. **Holes and churning (cause found, fix incomplete).**
   - Air held at one atmosphere implodes: a 6 cm pocket under 30 cm of water
     collapsed in 0.14 s and stirred the water at 0.3–0.5 m/s for seconds.
   - The ideal-gas bubble model stops that, but a 6.3 cm bubble, 10 cells
     across, breaks up within about 0.4 s. It rises at 0.2 m/s; Collins (1965)
     measured 0.58 √(g d) ≈ 0.46 m/s.
   - More dissipation makes it rise faster and cleaner: at τ 0.51 (about 300×
     water's viscosity) it reached 0.39 m/s.
   - With bubbles on, the water is no calmer after a pour.
3. **"Too fast": unknown.** Sliding walls leave the water livelier: 11.5 J/m
   of kinetic energy 2 s into the dam break, against 4.7 with gripping walls.
   We have no measured energy decay to compare either with. A 2D slice also
   lacks the 3D turbulence that drains real water.
4. **Waves die too fast.** A standing wave (mode 2, 30 cm deep, 2 cm high)
   keeps its period (0.831 s against 0.819) but loses 13% of its height a
   period at 6 mm and 4.8% at 3 mm, against under 1% for real water.
   - Eddy viscosity, collision, bubbles and fill rules do not change it;
     only finer cells help.
   - It looks like the free surface smeared over a few cells.

### What we ask

As before, **a runnable CPU oracle with `node --test` tests and pinned numbers
is worth more than prose**. Please build on `liquid-validation/liquid.cjs` and
its scripts, report what you measured, and say plainly what you did not run.

#### A. Measured data to compare against

We need real experiments with numbers, not only pictures. For each, give the
source, the geometry, the measured quantities, and digitized values or where to
get them:

1. **Energy decay or settling after a dam break in a closed tank.**
   - Wave gauges or wall pressures over several seconds: Lobovský et al. 2014;
     SPHERIC test cases; Kleefsman et al. 2005 (3D with an obstacle — is a
     2D-comparable part usable?); Koshizuka & Oka 1996; any others.
   - We want what happens after the first impact on the far wall, which is
     where "too fast" shows.
2. **Sloshing in a rectangular tank.** Damping of free decay at small and at
   large, breaking, amplitude.
3. **A jet or tap pouring into a pool.** How far and how long entrained air
   lasts, and how the pool settles once the tap stops.
4. **Rising bubbles that can be compared in 2D.** Planar or Hele-Shaw bubbles
   (Collins 1965 and later), with rise speed and shape against size.

Say which of these a 2D slice can honestly be compared with, and which need 3D.

#### B. A 2D slice of 3D water

Our tank is a slice of something, and real water loses energy in ways a 2D
lattice cannot represent: the 3D turbulence cascade, and friction on front
and back walls.

1. What do published 2D free-surface simulations validated against
   experiments do about this? Possible answers include:
   - a Hele-Shaw or wall-friction drag for a tank of depth b;
   - a depth-averaged turbulence closure;
   - a larger Smagorinsky constant, or WALE or Vreman;
   - a calibrated linear or quadratic drag;
   - nothing.
2. Recommend one, give its parameters in terms of physical quantities (tank
   depth b, water's ν, cell size), and calibrate it on your oracle against
   A.1–A.3.
3. It must not spoil the dam-break front (Martin & Moyce, and Lobovský if
   usable) or hydrostatics. Show the before and after numbers.

#### C. Bubbles and spray at 6–8 mm cells

1. Why does a 10-cell bubble fragment and rise at half speed at water's
   viscosity? Is it the free-surface condition (Schwarzmeier et al. 2023 found
   no variant balances liquid and gas pressure), the absent surface tension,
   too little dissipation, or resolution?
2. **Surface tension.** Water's capillary length (2.7 mm) is smaller than a
   cell, yet surface tension is what keeps small bubbles and drops whole.
   - How do FSLBM codes add it at the free surface, and with which curvature
     estimate (Thürey's local triangulation, finite differences of normals,
     height functions)?
   - Is it stable and useful at our resolution, or harmful?
   - Measure on the oracle with the CPU bubble model on: a 2D drop's
     oscillation, a bubble's rise, and spurious currents.
3. **Subgrid bubbles.** Is the right answer for bubbles smaller than about
   20 cells to stop resolving them? For example, convert an enclosed gas
   region below some size into Lagrangian bubble particles that rise at
   measured speeds (Clift, Grace & Weber; Collins) and pop at the surface,
   with the liquid refilled consistently with the mass ledger. Give a
   conservative algorithm, or say why not.
4. The same question for spray: drops of one or two cells. We currently cap
   them at Mach 0.25.

#### D. Standing waves damp too fast

Our free surface loses 13% of a wave's height a period at 6 mm (3.2 cells of
amplitude) and 4.8% at 3 mm. Is this the known first-order behaviour of the
mass-ledger free surface?

Which fix is known to work on a wave: a sharper interface reconstruction
(PLIC-like normals in the mass exchange), the Schwarzmeier variant (iii) we
already use, a different mass-exchange weight, or a higher-order
free-surface condition? Measure the damping per period on the oracle with
`wave.cjs`.

#### E. The wall model

Is reflection plus log-law wall stress at the first cell a sound wall model
for a free-surface liquid at these resolutions? Check:

- where it is wrong: thin films, contact lines, corners and diagonal walls
  (we fall back to bounce-back there);
- whether a published LBM wall function (Malaspinas & Sagaut 2014 and
  successors) does better for films;
- what a cell-thick film on a wall should do, and whether our 80% fall is
  right for a 1.5 cm film or still too slow.

#### F. Constraints for anything you recommend

- **Platform.** WebGL2 fragment shaders, float32 (FP16S storage possible),
  no compute shaders and no atomics. Float blending (`EXT_float_blend`) is
  available, which is how we sum bubbles.
- **Step budget.** About 140 µs a step at 160 × 96 on an Iris Xe to stay in
  real time. Today a step is about 100 µs without bubbles and 125 µs with
  bubbles every 4th step. Say what each recommendation costs per cell per
  step.
- **Mass.** It stays conserved to round-off; anything that adds or removes
  liquid must go through the ledger.
- **Rafael judges by eye.** Within these limits, prefer what makes the
  water look and move like real water: pours, splashes, settling, bubbles and
  films. But every claim must stand on a measured comparison, and say where
  the comparison is only qualitative.

### Attached

- `liquid-mockup.html`: the mock-up. It runs offline in Chrome. The solver
  (`Liquid`, CPU) and `GpuLiquid` (WebGL2) are inline in its script.
- `liquid-validation/`:
  - `liquid.cjs`, the CPU reference;
  - `dam.cjs`, `rise.cjs`, `wave.cjs`, `wall.cjs`, `physics.cjs`;
  - `README.md`, with every number above.
- `FLUID_TAB.md`: the Fluid tab and the liquid's history, rounds 1–4.
- `VECTOR_TOOLS_FLUID_RESEARCH_FOLLOWUP_3.md`: the round-4 prompt, for
  continuity.
