# Faster graph drawing, and Physics Lab as a general calculus tool — research brief

Written 2026-11-22 for GPT (Work, with repository access), at Rafael's request:
_"make a prompt to gpt on how to boost efficiency on all 'drawing on the graph'
tools like vector fields and matrices, as well as on how to transform physics
lab into a more general tool that's easier to use and doesn't contain prebuilt
symbols."_

Rafael's own words on what Physics Lab should become, quoted because they are
the specification:

> we need to upgrade the power for this, integration, limits, series, odes,
> they're all too weak right now. we should have 1 tab for all calculus parts,
> and then another for precise values (aimed more for partial sums that go very
> close to a constant, so you'd put the value from the sum, as well as
> ~constant it's approaching (if convergent)). pdes should also be graphed
> whenever possible in 3d graphs. everything should be able to handle any
> desmos input and formula and operation, and we should also have our own
> custom operations for more advanced calculus, as well as some nonelementary
> functions that are fairly common, and an infinite series fallback for
> integration when the answer is nonelementary.

He also confirmed that "no prebuilt symbols" means all three of: no fixed
variable names, no fixed-purpose tabs, and no baked-in constant table as the
only way to recognise a value.

Paste everything below the line.

---

You are doing two pieces of research for a browser extension on the Desmos
graphing calculator: a DesModder fork in TypeScript, branch
`feature/vector-tools-foundation`, merged with upstream DesModder v0.16.0 on
2026-11-22. **Read the code before proposing anything.** Every number below
was measured in Chrome on the developer's laptop (Windows 11, i7-1185G7, Iris
Xe integrated GPU) and should be checked, not trusted. When a question needs a
browser to answer, say so and write the script; the developer will run it and
send the numbers back. `scripts/perf/probe.cjs` is the probe that produced the
numbers in Part 1 — extend it rather than writing a new one.

Read first, in this order:

1. `docs/VECTOR_TOOLS_BRIEFING.md` — §5 (what Desmos, DCGView and WebGL
   actually allow; each item was learned the hard way), §6 (decisions that look
   like bugs and are not — do not undo them), §10 (the rules a proposal must
   satisfy).
2. `docs/VECTOR_TOOLS_ARCHITECTURE.md`.
3. `docs/VECTOR_TOOLS_PERFORMANCE_RESEARCH_BRIEF.md` — the last performance
   round (2026-11-08). Say which of its proposals are already in the code and
   which are not; do not propose again what was built.
4. `docs/PHYSICS_LAB_HANDOFF.md` and `docs/UPGRADE_ROADMAP.md` (Physics Lab and
   "The CAS engine" sections).
5. `docs/CAS_ENGINE_CHROME_PROBE.md` and `docs/UNIFIED_CAS_V05_TEST.md` — the
   measured state of the Pyodide + SymPy alternative.

## Rules that apply to both parts

These are the maintainer's, and a proposal that breaks one is not useful:

- **It runs in a real desmos.com page inside an extension**: no server, no
  external service, nothing sent off the machine.
- **Desmos cannot be taught new notation.** `Desmos.Private.Parser` exposes
  only `parse`, `parseIdentifier` and `setInput`; there is no operator
  registry. Anything new — a custom operator included — lives in this
  extension's own input and is either evaluated by us or expanded into
  ordinary Desmos expressions before it reaches the graph.
- **A trade-off goes behind a labelled control with a sensible default**, never
  a limit imposed on the user. Two limits were imposed where an option belonged
  (an arrow cap and a colour range) and both had to be undone. Do not make
  product decisions for the maintainer; where you would, list the options and
  what each costs.
- **Correctness is not negotiable.** These are teaching tools. A faster
  picture that is visibly different is a regression; an answer that is not
  proved is labelled as such or not shown.
- **Evidence is a picture.** Most bugs here were invisible to assertions and
  obvious in a screenshot. Say what screenshot proves each change.
- **The engine choice for Physics Lab is the maintainer's, not yours** (Part
  2, question 1). Present it as options with measured costs.

---

## Part 1 — Make every "drawing on the graph" tool cheaper

The tools that draw over or into the graph:

| Tool                               | Where                                                                      | How it draws                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Generated vector field             | `src/plugins/vector-tools/`                                                | Ordinary Desmos expressions (`polygon` lists with a per-arrow colour list), written atomically through `getState`/`setState` |
| Live arrows                        | `src/field-rendering/ArrowRenderer.ts`, `ArrowOverlay.ts`                  | Own WebGL2 canvas; instanced arrows from the field compiled to GLSL by `latexToGLSL.ts`                                      |
| Flow (particles)                   | `src/field-rendering/FlowRenderer.ts`, `FlowOverlay.ts`                    | Own WebGL2 canvas; particle texture stepped in a fragment pass, trails faded and reprojected on pan                          |
| 3D arrows, streamlines, glow cloud | `src/field-rendering/Scene3DLayer.ts`, `Flow3DRenderer.ts`, `Overlay3D.ts` | Own WebGL2 canvas over Desmos 3D, camera read from `grapher3d.redrawResult`                                                  |
| Fluid (air LBM, liquid FLIP/APIC)  | `src/field-rendering/sim/`, `src/plugins/vector-tools/fluid/`              | GPU D2Q9 lattice Boltzmann; FLIP liquid with a GPU solver (`gpu-flip.js`)                                                    |
| Matrix tab, exact route            | `src/plugins/vector-tools/matrix/exactRoute.ts`                            | Hidden Desmos copies of every expression evaluated at T⁻¹(x, y)                                                              |
| Matrix tab, redraw route           | `matrix/redraw.ts`, `MatrixLayer.ts`                                       | Wraps `graphsLayer.redrawToCtx`; maps Desmos's own sampled polylines through T on Canvas 2D                                  |
| Slope and phase fields             | `src/plugins/physics-lab/` over the shared `field-rendering` arrows        | Same GPU arrows as Vector Tools                                                                                              |
| Audio Lab's field                  | `src/plugins/audio-lab/` over `field-rendering`                            | Same shared renderer                                                                                                         |

### What was measured on 2026-11-22

Headless Chrome 131 with a GPU, 1280×800, `node scripts/perf/probe.cjs`.
"Busy" is main-thread milliseconds per second of wall time; a pan moves the
viewport a little on every frame, as a drag does. Numbers move by ±30 % with
machine load, so compare within one run.

| Scenario                                                   | Busy (ms/s)                       | fps     | Where the time is                                                                          |
| ---------------------------------------------------------- | --------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| Plain Desmos, idle                                         | ~40                               | 60      | Desmos's own tick; DesModder's default plugins add nothing measurable                      |
| Plain Desmos, panning                                      | 500–750                           | 55–60   | Desmos: view updates, `drawSketchToCtx`                                                    |
| Generated field (35×35 arrows as `polygon` lists), panning | ~1 000                            | **20**  | Desmos drawing 2 450 coloured polygons (`drawSketchToCtx`, `getDepthValues`); heap ~500 MB |
| Flow, 16 000 particles, still view                         | ~60                               | 59      | GPU; the main thread is nearly idle                                                        |
| Matrix, redraw route, panning                              | 970 → **570** after today's fixes | 31 → 41 | Desmos's own drawing, plus our grid (now ~6 % of a core)                                   |
| Matrix, exact route, panning                               | 990 → **730** after today's fixes | 31 → 47 | Desmos re-plotting the hidden implicit copies                                              |
| Slope field, panning                                       | 500–650                           | 59      | Same as plain Desmos: the GPU arrows are cheap                                             |

Page load, warm cache: plain Desmos is ready in ~400 ms, DesModder in
~750–1 150 ms. Of that, Desmos's patched source compiled through `eval`
(no V8 code cache, unlike a `<script>` tag) is ~115 ms, and the first load
after a Desmos release spends ~1.7 s applying the replacements before they
are cached. Heap after GC: 13 MB plain, 30 MB with DesModder.

Fixed on 2026-11-22, so do not propose them again: the Lorenz gallery
preset was integrated at module load (~150 ms of every page load); the
loader hashed the whole 3 MB calculator source for its cache key (~20 ms);
the Matrix session dispatched a Desmos `tick` after every pan, re-rendering
every view a second time per frame; the Matrix grid's thinning allocated
tuples per distance; DesModder re-sorted its plugin list four times per
dispatched action; Multiline and Syntax Highlighting polled every 4 ms; and
Jest and Prettier walked agent worktrees under `.claude/`.

### Questions

For each tool, ranked by expected speedup per day of work:

1. **Where the time goes**, per frame and per change (slider tick, pan, edit),
   split into: Desmos's own evaluator, our main-thread JavaScript, GPU time
   (`EXT_disjoint_timer_query_webgl2` where present), and browser compositing
   of the extra canvases. Give the measurement script.
2. **Idle cost.** A still picture should cost nothing. Find every loop,
   observer and timer that keeps running while nothing changes (an
   `on-evaluator-changes` listener fires on every frame of an animating
   slider; `graphpaperBounds` on every pointermove) and say which can stop.
3. **One WebGL context instead of several.** The arrows, flow, 3D layer and
   fluid each hold a context on top of Desmos's own. §5.3 explains why arrows
   and flow were kept apart (a still picture must not pay an animation loop's
   costs). Is there a design that shares one context and still lets a still
   layer cost nothing — e.g. a shared context with per-layer cached textures
   and one compositing pass that runs only when some layer is dirty? What
   does it cost in code, and what happens on context loss?
4. **The Matrix tab**, the one Rafael calls "very slow to render":
   - Exact route: for a _linear_ map, an explicit curve y = f(x) maps to a
     parametric (T·(x, f(x))) that Desmos draws far faster than the implicit
     F(T⁻¹(q)) = 0. Which expression types can be rewritten this way
     (functions, parametrics, polar, points, inequalities via their
     boundaries) and which must stay implicit? Prove the rewritten picture is
     identical.
   - Redraw route: cache mapped polylines per sketch and remap only on change;
     subdivide by the map's local Jacobian instead of a fixed detail level;
     reuse `Path2D`; or draw the polylines on the GPU. Which is worth it?
   - Is there a cheaper hook in Desmos's grapher (a transform applied at
     projection time)? It is minified and undocumented: say how you would find
     it and how the code fails safe when a Desmos release renames it.
5. **Generated fields.** The default generated field is 35×35 arrows drawn
   as two `\operatorname{polygon}` lists (shafts as two-point polygons,
   heads as triangles) with a per-arrow `rgb` colour list, and it is the
   slowest thing measured above: 20 fps while panning, ~500 MB of heap. Is
   there a cheaper Desmos form that draws the same picture — shafts as a
   `\operatorname{segment}` list, fewer colour buckets (one list per colour
   band instead of a per-item colour), heads only above a pixel size, or
   anything else Desmos draws faster — and how does each behave under
   Desmos's own caps and on the 3D calculator? Measure in Desmos with the
   probe; a guess about Desmos's renderer is not an answer.
6. **Compiling the field.** `latexToGLSL.ts` compiles the user's LaTeX to
   GLSL for every renderer. Should the compiled shader be cached by source
   across renderers and across panel reopenings? Can the CPU evaluators
   (colour scale, CPU validity checks for the fluid's obstacles) reuse one
   compiled JavaScript function instead of re-walking the tree?
7. **Quality levels that never flicker.** Any automatic quality mode must be a
   selectable option beside fixed levels, and a change of level must never
   clear the picture (§6.6 explains why trails are reprojected, not cleared).
8. **WebGPU.** Is it available enough in Chrome and Firefox today to be the
   primary path for the fluid and flow, with WebGL2 as the fallback? What
   speedup does a compute-shader version get on an integrated GPU?
9. **Native-speed code, with an automatic converter back to Desmos.**
   Rafael asked whether computations could run faster in a faster language
   (Rust, C++, assembly, raw machine code) and be converted back into Desmos
   automatically. Research this properly; do not assume the answer.
   - In a browser the realistic route to native speed is WebAssembly
     (Rust or C++ compiled to `.wasm`), with SIMD and, where the page is
     cross-origin isolated, threads. Assembly or machine code for the CPU
     cannot run in a web page; say plainly what is and is not possible
     inside a browser extension, and whether a native-messaging helper
     installed outside the browser is worth its install burden (it breaks
     rule 1 above, so only if the gain is overwhelming).
   - **Where would it pay?** Name the hot paths by measurement, not by
     guess: the CPU parts of the fluid (the FLIP liquid's CPU path, the LBM
     reference and validity checks), the Matrix redraw's polyline mapping
     and grid thinning, the field compiler (`latexToGLSL.ts`) and its CPU
     evaluators, the symbolic engines (`symbolic/`, `src/symbolic/`), PSLQ
     and high-precision arithmetic (currently `decimal.js`), and the
     slope-field and ODE integrators. For each, the expected speedup over
     today's JavaScript on V8 (which is often within 1.5–3× of native for
     numeric loops), the cost of copying data across the JS–WASM boundary,
     and whether the GPU (WebGL2/WebGPU) is the better answer instead.
   - **What the platform allows.** Our code runs in the desmos.com page,
     not an extension page, so desmos.com's own Content-Security-Policy
     decides whether `WebAssembly.compile` is allowed there; extension pages
     need `'wasm-unsafe-eval'` (see `CAS_ENGINE_CHROME_PROBE.md`). DesModder
     already sets COEP/COOP headers, so `SharedArrayBuffer` and WASM
     threads may be available. Say how to check each in both Chrome and
     Firefox, and give the probe to run.
   - **The converter back to Desmos.** The result has to come back as
     ordinary Desmos expressions that someone can read, edit and share:
     lists of numbers (`L=[…]`), point lists, polygons, piecewise
     definitions, or LaTeX formulas. Design that converter — what format
     each kind of result takes, how large a list Desmos accepts and how fast
     it re-plots one, how to update a list every frame without rewriting
     the graph state (`setState` is atomic but heavy; a `HelperExpression`
     or one `setExpression` per frame may not be), and how the formatting
     stays in the repo's canonical Desmos LaTeX (`\left(…\right)`, `x^{2}`;
     there is a test for it). Also the reverse: compiling Desmos LaTeX into
     the fast code, the way `latexToGLSL.ts` compiles it to GLSL today.
   - **Toolchain cost.** What adding Rust or C++ to this repository costs:
     build steps beside esbuild, bundle size, CI, debugging, Firefox AMO
     review of a `.wasm` binary (reviewers want reproducible source builds),
     and who maintains it. Compare against simpler wins in JavaScript
     (typed arrays, no allocation in hot loops, Web Workers) that get part
     of the way for none of that cost.

For every proposal: the bottleneck and how you measured it; the change,
concretely enough to implement (files, data layout, shader sketch); the
expected speedup on an integrated and a discrete GPU; what could get worse and
the test or screenshot that catches it; and what you would _not_ do, and why.

---

## Part 2 — Physics Lab as a general calculus tool

Physics Lab today (`src/plugins/physics-lab/`, about 50 files of exact
symbolic engines under `symbolic/`, and the shared simplifier in
`src/symbolic/`) has six fixed tabs: Slope field, 2nd order, Limit,
Derivative, Integral, Exact value. Each assumes its own variable names
(y′ = f(x, y); y(x₀) = y₀; a limit in x), and Exact value recognises a value
against a built-in table of constants. Rafael finds the engines too weak and
the tabs too rigid. The target is:

- **One Calculus tab** that takes anything Desmos can parse — any variable
  names, any functions the graph defines, any operation — and works out what
  is being asked: differentiate, integrate (definite or not), take a limit,
  sum a series, solve an ODE or system, solve or plot a PDE.
- **One Precise values tab**, for partial sums and other numbers that sit very
  close to a constant: given the value (or the sum itself), report the
  constant it approaches when it converges, and how sure that is.
- **PDEs drawn on Desmos 3D** whenever a solution surface u(x, t) or u(x, y)
  can be drawn.
- **Custom operators** for more advanced calculus than Desmos has.
- **Common non-elementary functions** (erf, erfc, Si, Ci, Ei, li, Γ, the
  incomplete gammas, Fresnel S and C, Bessel J and Y, Airy, Lambert W, the
  polylogarithm — say which belong), and **an infinite series answer when an
  antiderivative is not elementary**.
- Research-grade in what it decides (proved, with domains and side
  conditions; numbers are a diagnostic, never the proof), AP-level in how it
  explains, with the depth behind an explanation-level control. The Limit and
  Derivative tabs already work this way: keep it.

### Questions

1. **The engine.** Three candidates, measured so far in
   `CAS_ENGINE_CHROME_PROBE.md` and `UNIFIED_CAS_V05_TEST.md`:

   - extend the TypeScript engines in `symbolic/`;
   - CalcForge (Pyodide + SymPy) in an offscreen worker: 3–6 s boot, about
     +340 MB peak, +9.8 MB packed, needs `'wasm-unsafe-eval'`, Firefox
     untested;
   - a hybrid (TypeScript for what it proves fast; SymPy for the rest, loaded
     only when first needed).

   For each: which of the target's capabilities it reaches, how soon, at what
   startup and memory cost, and how answers are _verified_ (the TypeScript
   integrator differentiates every antiderivative back before showing it —
   what is the equivalent check for each route?). **Do not choose.** Lay out
   the options so the maintainer can.

2. **Reading any Desmos input.** The input is Desmos LaTeX, parsed by
   `Desmos.Private.Parser` and the repository's text-mode AST
   (`text-mode-core/`). Design how one tab decides what is being asked, with
   no fixed variable names:

   - which symbol is the variable (the one not defined in the graph? the one
     in `d/dx`? the one a slider does not own?), and how the user overrides
     the guess;
   - how functions and constants the graph defines are pulled in (Vector
     Tools' `environment.ts` already reads the rest of the graph — reuse it);
   - how an ambiguous request is shown back ("integrating with respect to t,
     treating a as a constant") before it is answered;
   - what Desmos's own operators already express (`\frac{d}{dx}`, `\int`,
     `\sum`, `\prod`) and what needs syntax of our own — Desmos has no
     limit operator, no partial-derivative symbol that renders, and no
     ODE/PDE notation.

3. **Custom operators.** Desmos cannot learn notation (rule above). Propose a
   small operator set — for example ∂, ∇, ∇·, ∇×, Laplace and inverse Laplace,
   Fourier series coefficients, residue, Taylor(f, a, n), series(f, x, a),
   ODE and PDE solve — with: how each is typed (MathQuill must be able to
   edit it; `\partial` and `\nabla` render as nothing in Desmos's MathQuill),
   how it is shown, and how its result goes back into the graph as ordinary
   Desmos expressions.

4. **Raising the power** of each engine, ranked by how many real problems it
   unlocks per day of work:

   - **Integration**: Risch for the elementary transcendental case, Hermite
     reduction and Lazard–Rioboo–Trager for rationals, a Rubi-style rule
     table, and the non-elementary closures (erf, Si, Ei, li, Γ, Fresnel).
     When none applies: a series answer with its radius of convergence and a
     proved remainder bound, and a definite value by quadrature with an error
     bound.
   - **Limits**: Gruntz's algorithm (the handoff says it is not built
     properly), with parameters and one-sided cases.
   - **Series**: summation in closed form (Gosper, Zeilberger, hypergeometric
     recognition), convergence tests that prove, and the radius of a power
     series.
   - **ODEs**: any order and systems; what to prove symbolically and what to
     solve numerically with a validated method; equilibria and their
     stability; boundary-value problems.
   - **PDEs**: which classes have closed forms worth doing (heat, wave,
     Laplace on simple domains by separation of variables and Fourier
     series; first-order by characteristics), and how to solve the rest
     numerically for display.

5. **The Precise values tab.** Given a decimal (possibly the 40th partial sum
   of something), find the constant it approaches:

   - integer relation finding (PSLQ is in `symbolic/pslq.ts`) over a basis
     that is _built from the input_ — the constants appearing in the summand,
     π, e, logs of small primes, ζ values, Catalan's G, γ — rather than a
     fixed table;
   - convergence acceleration of the partial sums themselves (Richardson,
     Aitken, Levin u, Wynn ε, Euler–Maclaurin tails) so that the constant is
     reached from a slowly converging sum, with an error estimate;
   - how confidence is reported: digits agreed, the size of the relation,
     and whether the identity was then proved symbolically or only found
     numerically. A found-but-not-proved identity must say so.

6. **PDEs on Desmos 3D.** The 3D calculator draws `z = f(x, y)` and
   parametric surfaces (`docs/DESMOS_3D_CAMERA.md`, briefing §5.5). For a
   solution u(x, t): a truncated Fourier series written as a Desmos surface
   with a slider for the number of terms; a numeric solution sampled onto a
   surface; or our own WebGL surface over the 3D canvas. Which is accurate
   enough, fast enough to animate in t, and shareable?

7. **The panel.** Sketch the one Calculus tab: one MathQuill input, the
   recognised request shown back, the answer, a derivation tree at three
   depths (the Derivative tab's Standard / Every step / research levels), and
   "Add to graph". Keep the house style: DCGView components that take
   getters, chips instead of `<select>`, a `SegmentedControl` tab bar, real
   MathQuill fields. What becomes of today's six tabs — folded in, kept as
   shortcuts that pre-fill the input, or removed?

8. **A test corpus.** The repo's coverage tests (`limit.coverage.unit.test.ts`,
   the 50-limit suite, `coverage.unit.test.ts`) are the model. Propose a
   corpus of a few hundred problems across integration, limits, series, ODEs
   and PDEs, with the expected answer and the source of truth for each, so
   progress is measured rather than asserted.

9. **Native speed for the engines.** Part 1, question 9 asks about
   WebAssembly (Rust or C++) for computation generally. Answer it here for
   the CAS in particular: which engine work is numeric and would gain
   (quadrature, PSLQ, high-precision arithmetic, numeric ODE/PDE solvers,
   series acceleration) and which is symbolic tree rewriting, where WASM
   gains little. Also whether an existing native CAS compiled to WASM
   (SymEngine, FLINT/Arb for rigorous numerics, Giac — the engine behind
   GeoGebra's CAS, which already runs as WASM) is a fourth engine option
   beside the three in question 1, with its size, startup time, licence
   (GPL engines and this repository's licence), and how its answers would
   be converted back into Desmos LaTeX.

10. **Three capabilities Rafael wants the design to leave room for**
    (added 2026-11-23, after the mock-up in `docs/mockups/calculus-tab/`):
    - **Fractional derivatives and integrals**, D^α for real α. Which
      definitions to offer (Riemann–Liouville, Caputo, Grünwald–Letnikov,
      Weyl) and how the choice is shown — the conventions disagree on
      constants and on what the lower limit is, so it is a labelled control,
      not a silent default. Closed forms where they exist (x^k through Γ,
      e^{ax}, sin and cos, Mittag-Leffler functions for fractional ODEs),
      numerics with an error bound where they do not, and how each is
      graphed in Desmos (its factorial accepts non-integers, so Γ is
      available). How a fractional order is typed in one input.
    - **Higher-order and nonlinear ODEs, solved and drawn.** Any order,
      lowered to a first-order system; exact solutions where a method
      applies, a validated numerical one otherwise. A slope field exists only
      for first order, so say what replaces it: the phase plane for an
      autonomous second-order equation (Physics Lab already draws one), a
      3D phase portrait on Desmos 3D for third order (Vector Tools already
      draws 3D arrows and streamlines), solution curves through
      user-placed initial conditions for any order, and what can be shown
      for order four and up.
    - **Simplifying hard.** A Simplify operation that goes well past
      today's `fold`/`condense`: rational functions to lowest terms, trig,
      exponential and log identities, radicals, and assumptions that change
      the answer (√(x²) = |x|, or x with x > 0). How "simplest" is chosen
      when forms compete (shortest, factored, expanded, the form a course
      expects), and how every rewrite stays proved, with the assumptions it
      used shown.

### What to send back

For each question: the recommendation, the evidence (code read, papers,
measurements), what it costs to build, what it risks, and the test or
screenshot that would prove it works. Put decisions that belong to the
maintainer in a separate list at the end, each with its options and costs.
