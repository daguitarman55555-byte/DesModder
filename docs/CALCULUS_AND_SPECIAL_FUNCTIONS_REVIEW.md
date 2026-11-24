# Calculus engine and special functions: review brief

Written 2026-11-24 for GPT (Work, with repository access), at Rafael's request:
_"scan for errors and write up a report for work to evaluate everything youve
done, as well as come up with new and better ways of doing things for
efficiency and adaptability and so its simpler to use as well as more
upgrades/new additions in general"_.

Part 1 is what was built, commit by commit, with what each one is unsure of.
Part 2 is the error scan. Part 3 is the known gaps. Part 4 is proposals,
ranked. Part 5 is what you are asked to do. Paste everything below the line.

---

You are reviewing work on a browser extension for the Desmos graphing
calculator: a DesModder fork in TypeScript, branch
`feature/vector-tools-foundation`. Three of its plugins matter here: Physics
Lab (a calculus engine with proofs), Vector Tools (fields, flows, a fluid
tank, a Matrix tab, 3D) and Audio Lab. **Read the code before you judge
anything**; every claim below names the file it is about. When a question
can only be answered in a browser, say so and write the script; the
developer runs it and sends the numbers back.

Read first:

1. `docs/PHYSICS_LAB_HANDOFF.md` and `docs/UPGRADE_ROADMAP.md`, the Physics
   Lab sections. Several items below close roadmap items; say which are
   really closed.
2. `docs/mockups/calculus-tab/README.md`. The **Calculus tab** is a mock-up
   in `docs/mockups/calculus-tab/` that runs Physics Lab's real engines
   (`engine.ts`, bundled to `engine.js`). It is the planned single tab for
   all calculus. Some of this work lives only there (Part 3).
3. `src/symbolic/index.ts`: the shared simplifier, and why `fold`, `condense`
   and `expand` are three functions, not one.
4. `docs/VECTOR_TOOLS_BRIEFING.md` §5, §6 and §10 before proposing anything
   for the GPU side.

## The rules a proposal has to keep

These are the maintainer's.

- It runs in a real desmos.com page inside an extension: no server, and no
  network at run time.
- **Exact or refused.** An answer the engine shows is exact and proved, or
  is labelled "checked numerically, not proved". A decimal never stands in
  for an exact value. A wrong answer that looks right is the worst outcome
  this code can have, and a refusal is always allowed.
- Every antiderivative is checked by differentiating it back (`agreesOnSamples`
  plus `numericDerivative`), and every limit is held to sampled values.
- Desmos semantics are measured, not assumed (see
  `src/field-rendering/sim/strictSemantics.fixtures.ts`).
- Special functions must be **typeable letter by letter** in Desmos, not just
  pasteable. Their definitions live in a secret, readonly, hidden folder.
- A trade-off is the maintainer's call. Mark it **decision** and lay out the
  options; do not settle it.

---

## Part 1: what was built

Fourteen commits, `e8581f26` to `efa285f3`, oldest first. The first four
were reviewed in conversation but not by you; the last ten are new. Each
entry ends with the questions it leaves.

### 1. `e8581f26`: integral-family gaps

`|g|` for non-linear `g` by exact sign changes (`signChanges.ts`), three
special forms (`specialForms.ts`: conjugate, reciprocal quartic, reversed
product rule), and theorems for definite integrals that have no elementary
antiderivative (`definiteTheorems.ts`: King's rule, symmetry, Frullani and
others). Benchmarks: `docs/research/integral-families/`.

_Unsure:_ King's rule is "checked at sample points, not proved"
(`definiteTheorems.ts`). Is there a cheap structural proof that
`f(x) + f(a+b−x)` is constant for the shapes it fires on?

### 2. `78d984fe`: fractional derivatives, and 21 special functions

- `fractional.ts`: six definitions (Riemann–Liouville, Caputo,
  Grünwald–Letnikov, Riesz, Weyl, Hadamard), term by term on power series.
- `src/symbolic/special.ts`: Γ, 1/Γ, B, ψ, ζ, erf, erfc, erfi, Si, Ci, Shi,
  Chi, Ei, li, Li₂, Fresnel S and C, BesselJ, W₀, EllipticK and Mittag-Leffler
  E. Each one has a JavaScript evaluator and a Desmos definition.
- `specialIntegrals.ts`: antiderivatives written with them, e.g.
  `∫eˣ/x = Ei(x)`.

_Unsure:_ the Desmos definitions use integrals over `t_{sf}` and `u_{sf}`,
and some use series cut at fixed N. What accuracy does each have, and over
what range? `scripts/check-special-functions.cjs` checks values against
Desmos. Is that coverage enough?

### 3. `5ef32b55`: typeable names, locked folder, exact special values

- The MathQuill config wrap (`withSpecialFunctionNames`) makes `Ei`, `Li_2`
  and the others type as one name.
- `ensureSpecialFunctions` keeps the definitions in a secret folder.
- `specialValues.ts` gives exact values: Γ(½) = √π, ζ(2n), ψ at rationals,
  Li₂ at its known points.

### 4. `50322ea0`: constants that never overwrite, and special functions in every add-on

- `graphNames.ts` `placeAnswer`: when Add to graph would reuse a constant the
  graph already has, it renames it (C becomes C₁, then C₂) across every line
  the answer adds. Names the user typed are never renamed.
- `specialGLSL.ts`: float GLSL for all 21 functions, shared by Vector Tools'
  2D and 3D fields, flows and Audio Lab.
- The Matrix tab's `compile.ts` falls back to `special.ts`.
- `graphInstall.ts`: the typing support is reference-counted per plugin, so
  turning one plugin off leaves it working for the others.

_Unsure:_ `placeAnswer` reads definitions with a regex
(`definedName` in `graphNames.ts`). Which Desmos definition forms does it
miss? Lists, piecewise heads and `f(x,y)=` are candidates.

### 5. `4bbd49b2`: special functions in fluid solids, and faster shaders

- `sim/strictParse.ts`, `strictEvaluate.ts` and `strictGLSL.ts`: a fluid
  solid's inequality can now use the special functions. They are a
  `special` node in the strict tree. On the CPU they are `special.ts`
  itself; on the GPU they are the same GLSL behind the validity flag, so a
  pole is not solid.
- `specialGLSL.ts`: the four functions that used Simpson's rule now use
  cheaper methods.
  - **Si and Ci** are computed together: the series below 2, and the complex
    continued fraction for E₁(it) above it (modified Lentz). This is
    Numerical Recipes' `cisi`.
  - **Fresnel C and S** are computed together: the series below 1.5, and the
    erfc continued fraction above it (NR's `frenel`).
  - **BesselJ** uses the trapezoid rule on Bessel's integral. The integrand
    is even and 2π-periodic, so the rule converges geometrically once
    N > |z|; it uses N = 16 + |z|, at most 64.
- Steps per pixel dropped from 128 to 25 at worst for Si and Ci, from 257 to
  13 for Fresnel, and from 129 to at most 64 for BesselJ. Accuracy went from
  1e-4 to 1e-5 against `special.ts`, now at any size: Si and Ci used to
  switch to a short asymptotic expansion past 16, and Fresnel past 4.
  Measured times are in Part 2.
- Tests: `fieldFunctions.int.test.ts` runs every case through the field
  compiler and through the solid compiler on both CPU and GPU, on a real
  GPU. `strictEvaluate.unit.test.ts` tests the solid parser.

_Unsure:_ BesselJ is right only for whole orders, as it was before; Bessel's
integral gains a second term otherwise. `special.ts` evaluates any order.
Should the GPU path refuse a non-integer order, or compute it?

### 6. `dc3ff61d`: Γ no longer rewritten as a factorial

`pastedField.ts` used to rewrite a pasted `Γ(z)` as `(z−1)!` on every
keystroke, so Γ typed by hand broke half-way into `(−1)!y`. Γ is a real
function in the graph now, so it passes through. An integration test types
`Ei(x)+Gamma(y)` into Vector Tools' own input.

_Unsure:_ the Vector Tools panel inputs take the typing config from
`cc.getMathquillConfig`, so they work. That was verified for Vector Tools,
not for Physics Lab's or Audio Lab's panel inputs.

### 7. `eaf0ac5a`: roots cancelled in derivatives

`src/symbolic/radicals.ts` `cancelPowers` reads each factor as `base^r` with
r rational (so `√u` is `u^{1/2}`), adds powers of the same base across the
fraction bar, and takes the least power out of a sum when one of the powers
is a root. Results:

- `d/dx x/(1+x²)^{3/2}` is `(−2x²+1)/(1+x²)^{5/2}`.
- `d/dx √(x²+1)³` is `3x√(x²+1)`.

It composes powers only where that keeps the same function: `√(x²)` stays.
`docs/mockups/calculus-tab/probe.cjs` runs the engine on any inputs in a
Desmos API page.

_Unsure:_

- Is the composition rule in `compose()` complete and sound?
- `u^a·u^b = u^{a+b}` cancels a removable point, the same convention `fold`
  uses. Is that ever visible to a user?
- `√((1+x)/(1−x))` still differentiates to an uncollected
  `(1−x+1+x)/…`. That is like-term collection inside a quotient, roadmap
  item 2.

### 8. `6e2590e1`: roots of scaled quadratics

`trigSubstitution.ts` accepts `√(m x² ± k)` with m rational: the
substitution is `x = a·tanθ` (or sin or sec) with a² = k/m, and √m comes
out of the root. `√(4x²+4x+2)`, `√(1−9x²)` and `√(3x²+5)` now integrate.
`fold` takes `√(p/q)` exactly, so `√(9/4)` is 3/2 and `√(3/2)` is √6/2.
Every antiderivative goes through `cancelPowers`, and the result is kept
only when it is shorter.

_Unsure:_ `∫√(3x²+5)` is right but untidy. A `√3` lands outside a sum whose
terms carry `3^{−1/2}`, and cancelling them needs a distribution step.

### 9. `bd4a58af`: `floor`, `ceil`, `|sin u|`, `|cos u|`

The antiderivatives count steps and humps:

- `∫⌊u⌋ = u⌊u⌋ − ⌊u⌋(⌊u⌋+1)/2`
- `∫|sin u| = 2⌊u/π⌋ − cos(u − π⌊u/π⌋)`

Both are continuous, so F(b) − F(a) holds as it stands. `definite.ts` takes
`floor` and `ceil` of exact values, refusing within 1e-9 of a whole number,
including one-sided limits there. The quadrature check now cuts its cells at
each step and corner. Results: `∫₀^{5.5}⌊x⌋ = 25/2` and
`∫₀^{10}|sin x| = 7 − cos(10−3π)`.

_Unsure:_ an interval with more than 40 steps (`MAX_BREAKS`) gives up on
cutting, and the confirming quadrature then fails, so the result is a
refusal, not a wrong answer. Is there a better bound, or a closed-form check
that needs no quadrature for these shapes?

### 10. `302b63e2`: derivatives of `floor`, `ceil` and `sign`

The derivative is 0 between the jumps, and the step says it is undefined at
each jump. This matches how `|u|` is treated.

### 11. `93999fa9`: exact trig division, and integration by parts into Ei

- `trigCancel.ts`: the numerator and denominator are read as polynomials in
  `sin u` and `cos u`, with `sin 2u = 2sc` and `cos 2u = c² − s²`, and
  divided exactly. So `cos 2x/(sin x+cos x)` is `cos x − sin x`, and
  integrates to `sin x + cos x`. Before, the same integral came back through
  a page-long half-angle answer.
- `specialIntegrals.ts` `byPartsOnce`: one integration by parts when nothing
  elementary finishes, with `∫v du` done by the special shapes. So
  `∫e^{−x} ln x = Ei(−x) − e^{−x} ln x`.

_Unsure:_

- The division ignores `s² + c² = 1`. A Gröbner-style reduction modulo it
  would divide more. Worth it?
- The by-parts step is only in the Calculus tab's engine (Part 3).

### 12. `3ec77794`: `k/(x√(ax²+bx))`

The answer is `−2k√(ax²+bx)/(bx)`, from `(√Q/x)′ = −b/(2x√Q)` when Q has no
constant term. It is tried before completing the square.

_Unsure:_ the cases c > 0 and c < 0 of `∫dx/(x√(ax²+bx+c))` have standard
log and arcsin forms that are not added. Should they be added?

### 13. `867650c0` and `efa285f3`: limits with parameters, and t = ln x

`limitRewrites.ts`:

- `parametricLimit` applies L'Hôpital's rule on the tree. While the
  numerator and denominator both fold to the constant 0 at the point, they
  are differentiated. This is structural, so it holds for every value of the
  letters. Then the quotient at the point is the limit wherever the
  denominator there is not 0. The result is checked against the engine's
  proved limit at four whole-number parameter values.
  - `sin(ax)/x → a`
  - `sin(ax)/sin(bx) → a/b` where b ≠ 0
  - `(1−cos kx)/x² → k²/2`
- `logSubstitution`: when x appears only through ln x, t = ln x is
  substituted, so `ln(ln x)/ln x → 0`.

Both run in the mock-up's engine, and in the real panel's Limit tab after
the engine gives up (`PhysicsLabSession.computeLimit`, "unknown" case).

_Unsure:_ is "both fold to the constant 0, so L'Hôpital holds for every
value" sound for every shape it can fire on? In particular, does the
continuity of the derivatives at the point need its own check, beyond the
substituted expression being finite?

---

## Part 2: the error scan

All run on 2026-11-24 at `efa285f3`, Windows 11,
Chrome.

| Check                                            | Result                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Unit tests (`npm run test:unit`)                 | 3,222 passed, 0 failed                                                                                                |
| Integration tests (all, `--roots <rootDir>/src`) | 150 of 154 passed on the full run (detail below). After the fixes, the three suites that had failures passed 65 of 65 |
| Types (`tsc --build`)                            | clean                                                                                                                 |
| ESLint on `src`                                  | clean                                                                                                                 |
| Prettier                                         | clean                                                                                                                 |
| Chrome build (`npm run build`)                   | built                                                                                                                 |
| GPU timings (`scripts/perf/special-shaders.mjs`) | below                                                                                                                 |

The four failures on the full integration run:

- **"A vector pasted from a CAS"**: the test asserted the Γ-to-factorial
  rewrite that commit 6 removed on purpose. It was fixed, and then exposed
  a real bug (below).
- **"Loading a gallery field recompiles the flow"**: a 30 s timeout. It
  passed on the rerun.
- **The fluid tests "a cylinder sheds, and is measured" and "the inlet lets
  the sound out"**: both passed on the rerun. The fluid tests are known to
  flake under load in a full run.

GPU timings come from `node scripts/perf/special-shaders.mjs`. It gives the
median milliseconds for one 1024×1024 draw on Iris Xe through ANGLE/D3D11,
with each function evaluated at every pixel. The table shows four runs.

| Function       | Before (`50322ea0`) | After   | Speed-up        |
| -------------- | ------------------- | ------- | --------------- |
| Si             | 3.8–4.2             | 2.5–2.9 | 1.5–1.7×        |
| Ci             | 4.2–4.3             | 2.5–2.7 | 1.6×            |
| Fresnel C      | 5.8–9.7             | 2.1–2.7 | 2.8–3.6×        |
| BesselJ        | 2.8–4.0             | 2.0–2.6 | 1.3–1.5×        |
| Ei (unchanged) | 2.2–3.4             | 2.1–2.9 | none            |
| Γ (unchanged)  | 1.7–2.4             | 1.6–1.9 | none            |
| Mittag-Leffler | 5.3–8.9             | 5.1–7.9 | none measurable |

The unchanged Γ comes out at about 1.7 ms, so that is the floor of this
measurement (the `readPixels` round trip). Mittag-Leffler is now the most
expensive. Its early stop made no measurable difference, because over the
range tested its terms shrink slowly. A better algorithm for it is an open
question for you.

Faults found and fixed during the scan:

- The shared differentiator (`src/symbolic/differentiate.ts`), used by
  Vector Tools' divergence and curl, refused the pasted sympy field with
  "The derivative of Gamma is not known". The Γ in it was `Γ(2−π)`, a
  constant. A call with no variable in its arguments now differentiates to 0. The exception is a callee that is itself the variable: `x(y−1)` is a
  product the parser could not see, and is still refused, as a test
  requires.

- `trigCancel.ts` divided by a leading coefficient and could print `0.5` in
  an answer, against the exact-or-refused rule. Coefficients are now exact
  fractions, and there is a test.
- `vector-tools.int.test.ts` "a pasted sympy field" expected Γ to be
  rewritten as a factorial, which commit 6 deliberately stopped. The test
  now expects Γ, and waits for the folder's debounced watcher before
  reading item errors.

---

## Part 3: known gaps

1. **Two engines.** The Physics Lab panel (`PhysicsLabSession.ts`) and the
   Calculus-tab mock-up (`docs/mockups/calculus-tab/engine.ts`) each have
   their own orchestration over the shared engines.

   - The special-function antiderivatives (`specialAntiderivative`, with
     `byPartsOnce`) are called only by the mock-up. The panel's Integral tab
     refuses `∫eˣ/x`.
   - The panel calls the limit rewrites but not the series fallback.
   - Both orchestrations format, verify and graph answers separately.

   This is the biggest source of drift in the codebase.

2. **Audio Lab doesn't install the typing names.** It is enabled by
   default, so installing them would turn typed words like "li" or "Chi"
   into functions in every user's graph. Its fields still compile the
   functions. **decision**: install only while its panel is open, or never.
3. **Floats on the GPU.** The special functions hold to about 1e-5 relative,
   except near poles and where the float range overflows: Γ past about 35,
   and erfi, Chi and Shi past about 9.
4. **Untidy answers that are still right.**
   - `√(3x²+5)`: the √3 sits outside a sum.
   - Like terms inside a quotient are not collected.
   - `arcsinh(2x/√6)/√2` isn't rationalised.
5. **Limits the engine does not decide.**
   - A bounded factor inside a sum: `x(2+sin x) − x`.
   - `floor(1/x)·x` at 0⁺.
   - A parameter inside a limit at infinity: the parametric route is
     finite-point L'Hôpital only.
   - Decimal parameters: the check uses whole numbers, because 0.7 is not
     exact as a double.
6. **Refusals still standing.** `x²/√(2x²+3)` is refused through
   Chebyshev's classifier, which says the antiderivative is elementary but
   could not carry out its substitution, although trig substitution with a
   coefficient now exists. Ordering problem?
7. **Panel typing.** Verified for Vector Tools' own inputs. Physics Lab's
   inputs use the same component, but no test covers them.
8. **Special functions in the shared differentiator.** Vector Tools'
   `src/symbolic/differentiate.ts` treats `Γ(const)` as a constant now, but
   `Γ(x)`, `Ei(x)` and the rest are still refused. Their derivatives are
   known: Γψ, eˣ/x, sin x/x, −2e^{−x²}/√π and so on. Physics Lab's own
   differentiator has the same gap.

---

## Part 4: proposals

Ranked by payoff for effort. Each needs your evaluation, and some are
decisions.

### Efficiency

1. **One orchestration, not two.** Move the mock-up's `analyze` (parse, then
   pick the operation, run the engine, verify, format and graph) into
   `src/plugins/physics-lab/calculus/`. Have both the panel and the mock-up
   call it. This removes Part 3 item 1 and halves future work.
   - **decision**: whether the panel's tabs stay or collapse into the one
     Calculus tab (`docs/mockups/calculus-tab/README.md`).
2. **Compile only the special functions a shader uses.** `GLSL_PRELUDE`
   carries all 21 into every field shader. Drivers drop unused functions,
   but ANGLE still parses them. A dependency map in `specialGLSL.ts`, with
   `preludeFor(used)` in `latexToGLSL.ts`, would make compilation cheaper on
   every edit of a field.
   - _Measure first_: time `gl.compileShader` plus `linkProgram` on a field
     shader, with and without the prelude, on Iris Xe.
3. **A Web Worker for the engine.** Roadmap item 6. The probe shows most
   answers in 1–50 ms, but numerical fallbacks take about 2 s (a refused
   `∫₀^{10}|sin x|` before this work). A worker would keep the panel
   responsive and let it stream "trying …" states.
4. **Memoise the shared simplifier.** `fold`, `cancelPowers` and `expand`
   are called repeatedly on the same subtrees, and the integrator tries
   routes that share inputs. A hash-consed `Node`, or a WeakMap cache keyed
   on identity, would cut repeated work.
   - _Measure_ with the integral-families bench (`docs/research/integral-families/bench.cjs`).

### Adaptability

5. **A rule registry for the integrator.** `integrate.ts` is a long ordered
   chain: bars, trigCancel, rules, rewrites, substitution, completing the
   square and so on. Each new technique needs a hand-picked place in it.
   - A registry of `{name, applies(node), run(node), cost}` would make the
     ordering explicit and testable.
   - It would also let the coverage test name which rule answered each
     integral.
6. **One table per special function, end to end.** A special function now
   touches five places:

   - `special.ts`: JS evaluator, Desmos definition, notation;
   - `specialGLSL.ts`: GPU;
   - `specialValues.ts`: exact values;
   - `specialIntegrals.ts`: antiderivative shapes;
   - the typing names.

   One record per function, with a test that checks all five agree, would
   make adding the 22nd a one-file change.

7. **Problem files instead of hand-built trees.** Unit tests build trees
   with `AugBuilders`, because LaTeX parsing needs Desmos. `probe.cjs`
   already runs LaTeX through the real parser. A `problems/*.txt` corpus,
   each line holding an input and its expected answer and verdict, run by
   the probe in CI, would let anyone add a case in one line. The maintainer
   is about to send a batch of integrals, which is where this would pay off
   first.

### Simpler to use

8. **Say what a refusal needs.** Many refusals name a technique ("a quotient
   with the variable above and below …"). They should instead say what the
   user can do: try the series answer, a definite integral, or numerical
   quadrature. The mock-up already has those routes.
9. **"Why this form?" on answers.** When the tidy pass changed the form
   (`cancelPowers`, `trigCancel`), show the identity used. This is already
   done for `expand` via `SimplificationNote`.
10. **Parameter limits in words.** The case split ("wherever b ≠ 0") is a
    note now. Show it in the answer line, as `a/b (b ≠ 0)`.

### New additions

11. **Series tab**: Taylor polynomials with a Lagrange remainder bound, and
    convergence tests that name themselves. `powerSeries.ts` and the limit
    engine already do the hard parts. Roadmap item 1.
12. **Sums tab**: Gosper's algorithm, then acceleration plus recognition, so
    that `Σ1/n³ = ζ(3)` is found and shown.
13. **Second-order ODEs**: variation of parameters, Cauchy–Euler, and
    Laplace with steps.
14. **More special-function shapes**:
    - `∫x^n e^{x}/x` by parts down to Ei;
    - `∫sin(x)/x²` to Ci;
    - `∫e^{−x²}x^{2n}` to erf;
    - Li₂ for `ln(1−x)/x`;
    - Bessel recurrences.
15. **Gruntz's algorithm for limits at infinity.** The t = ln x rewrite
    handles one iterated logarithm. Gruntz decides exp-log limits in
    general, and would replace several hand-written growth rules.

---

## Part 5: what to do

1. **Check Part 1 for errors of mathematics**, above all:

   - the soundness questions in items 7, 11 and 13;
   - the GLSL algorithms in item 5: the branch points, the Lentz stopping
     rules, and float overflow.

   Write any counterexample as an input to `probe.cjs` or a unit test.

2. **Check Part 2's claims** by running the commands listed there. Say which
   numbers you reproduced.
3. **Evaluate Part 4.** For each proposal, say:

   - whether the code already does it;
   - what it would cost (files, roughly how many lines);
   - what it risks;
   - whether it's worth doing.

   Add proposals of your own. Rank everything into one list.

4. Mark every trade-off as **decision**, with the options laid out.
5. Deliver one Markdown file. Put the findings first, each with file:line,
   a failing input and a suggested fix. Then the ranked list. No code
   changes.
