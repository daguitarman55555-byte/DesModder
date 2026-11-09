# Research brief for GPT Work: CAS differential equations, engine choice, and audit follow-up

Repository: `daguitarman55555-byte/DesModder`, branch `feature/vector-tools-foundation`, pinned at `11a8bd57`. This is the same revision your audit (`DesModder_Complete_Audit_and_CAS_Plan.md`) used.

Attached:

- `Axiom_Source_v0.70.0.zip`: a standalone JS calculator. Its `app/math-engine.js` is a 12k-line rule-based exact-calculus engine.
- `CalcForge (5).zip`: Pyodide plus SymPy and mpmath, about 85 MB. `de.py` (3,848 lines) solves ODEs and PDEs; `plots.py` draws slope fields, vector fields, 3D fields and surfaces; `steps.py` shows worked steps; `engine.py` dispatches.

Do not edit production files. Prototypes go on a scratch branch or in a zip, and every measurement must name its hardware, browser and build.

## What Claude already accepted from your audit

- **V3 is confirmed in source.** `FlowRenderer.resize(keep)` saves `trailFront`, but the newest trail is in `trailBack` between frames (see the comment in `reproject`). Claude will fix it. You don't need to research it further.
- The other bug-register items (A1–A5, P1–P4, V1, V2, V4–V8) and the Fluid L1/Matrix Priority 1–2/Flow ranks 1–2 order are queued for Claude to implement. You don't need to re-audit them.
- **Your tab proposal conflicts with Rafael's 2026-11-07 decision.** You proposed folding Draw and Color into Field; Rafael decided on five tabs with Draw merging Arrows and Flow. Do not plan around folding until Rafael answers.

## The new requirement (Rafael's words, 2026-11-08)

> "cas should be able to plot any ODE and PDE (in 3d) for any order, as well as providing a slope field/phase and a vector field, and a solution (if any, if not an infinite series approximation to a finite amount will do)"

This sits inside your CAS plan: Physics Lab renamed to CAS, one blank MathQuill query field, and definitions read from the regular Desmos expression list.

## Questions to answer, with evidence

### 1. Engine: measure the trade-off; Rafael makes the choice

There are three candidates. Measure all three on the same ODE/PDE fixture set:

- **(a) Ship CalcForge's Pyodide + SymPy inside the extension**, loaded lazily in a worker on first CAS use.
- **(b) Port the needed rules to TypeScript**, the way Axiom and the existing `src/plugins/physics-lab/symbolic/` do it.
- **(c) A hybrid:** TS handles the fast, common cases; Pyodide is a lazily loaded fallback for everything else.

Measure, don't estimate:

- **Packed extension size.** Measure the delta for the Chrome MV3 build (`npm run build`) and the Firefox build. Can the bundles be trimmed (unused stdlib, `.pyc`-only, unused SymPy subpackages) without losing coverage? Report the size after trimming.
- **Cold and warm start time** to the first ODE answer, measured on Chrome on a desmos.com graph.
- **Peak memory**, and whether the worker can be torn down when CAS closes.
- **Where the wasm can legally run.** Can it run under desmos.com's page CSP (DesModder injects into the page)? Under MV3 `extension_pages` CSP with `wasm-unsafe-eval`? In an extension-origin worker or offscreen document? Which of these work in Firefox? Prove each answer with a running probe, not with documentation.
- **Chrome Web Store and AMO review.** Are there any constraints on bundled wasm and Python source?
- **Per-request latency** for 20 representative fixtures in each candidate.

Present the result as a decision table. Do not recommend one silently: Rafael decides this trade-off.

### 2. Coverage matrix

Build one table with these columns:

- ODE/PDE class
- Example
- CalcForge `de.py` (solves? which function?)
- Existing repo (`symbolic/ode.ts`, `secondOrder.ts`, `initial.ts`, `powerSeries.ts`)
- Axiom (it appears to have none; confirm)
- Desmos-renderable result? (yes / only as a truncated series / no)

It must include at least these classes:

- **First-order ODEs:** separable, linear, exact, Bernoulli, Riccati, homogeneous, Clairaut/d'Alembert.
- **Higher-order linear ODEs:** constant-coefficient of order n, Cauchy–Euler, variation of parameters, Laplace-transform IVPs.
- **Special-function ODEs:** Bessel, Legendre, Airy, Hermite, Mathieu and Heun.
- **Series solutions:** ordinary point, Frobenius at a regular singular point, and irregular singular points.
- **Systems:** linear first-order systems x′ = Ax, nonlinear autonomous systems, and their equilibria with linearization.
- **Boundary-value and eigenvalue problems:** Sturm–Liouville.
- **PDEs:**
  - First-order linear and quasilinear PDEs (characteristics)
  - Heat, wave and Laplace/Poisson equations on intervals and rectangles, with Dirichlet, Neumann and mixed conditions
  - d'Alembert solutions
  - Polar Laplace
  - Traveling waves via the tanh method
  - Nonlinear cases that have no closed form

Run every CalcForge claim on its own engine and record pass, fail or wrong. For each case, check the answer independently: substitute it back into the equation and check the initial and boundary conditions.

### 3. "Any order" plotting in Desmos: the representation spec

Specify exactly what CAS draws for each case. Use Desmos objects: native expressions where possible, and the Vector Tools renderer only as a soft dependency.

- **Order 1, y′ = f(x, y).** Slope field plus solution curves through the initial conditions or draggable points.
- **Order 2, and 2D autonomous systems.** Phase plane (y, y′) as a vector field plus trajectories; the solution y(x) as a curve; nullclines and classified equilibria.
- **Order 3** (and 3D systems). 3D phase space in Desmos 3D, with the vector field and trajectories.
- **Order n ≥ 4.** Reduce to a first-order system, then decide which projections to show. Propose a rule Rafael can judge, and show screenshots.
- **PDE u(x, t).** Show it as a surface z = u(x, y = t) in Desmos 3D and as an animated 2D curve with a t slider. Show u(x, y) for Laplace. Say how the vector field relates: the gradient of u, or the characteristic field for first-order PDEs.
- **No closed form.** Use a truncated series: Taylor, Frobenius, or Fourier/eigenfunction for PDEs. Give N terms with an error estimate and the radius or interval where it is valid, then a numeric fallback (RK4/RK45 lists for ODEs, method of lines for PDEs). Desmos must label the result as approximate, never as exact.

For each case, state whether Desmos can evaluate it natively and live (`\sum` with a finite N, `\int` numeric, or lists from a worker). State the cost of each slider change, and what breaks: special functions that Desmos lacks, recursion, and list-length limits. Measure the Desmos limits live; don't assume them.

### 4. Input syntax in the one CAS field

Specify how a user types an ODE or PDE and its conditions in the single blank field, consistent with your d/dx, int, lim, partial and grad plan:

- y′′ + y = 0
- y(0) = 1, y′(0) = 0
- u*t = k u*{xx}
- u(0, t) = 0
- systems

How do conditions attach? How does CAS tell an equation to solve from a query to evaluate? How are names read from Desmos definitions, including sliders used as parameters? Give 30 example inputs with the expected outputs.

### 5. Fixtures and gates

Deliver a JSON fixture file with 60 or more ODE/PDE cases. Each case gives:

- the input
- the expected closed form, or "series to N terms"
- the check: substitution, conditions, and numeric agreement with an independent RK45 or method-of-lines run at stated tolerances
- the expected Desmos representation

Include traps:

- a lost singular solution
- a branch choice
- an initial condition at a singular point
- an ill-posed BVP
- a non-unique IVP (y′ = √y)
- a stiff system
- a Fourier series showing the Gibbs phenomenon

### 6. Phased plan

Give a phased plan that starts from the CAS core already in your audit (derivatives, integrals, limits, gradient), followed by the ODE and PDE phases. Each phase needs a deliverable, an acceptance gate and a size. Mark every point where Rafael must choose.

## Output format

Return one Markdown report and the fixture JSON, plus the probe code as a zip. Keep the evidence classes from your audit (reproduced, measured, code-confirmed, historical, modeled), and never present a modeled number as measured.
