# Calculus tab mock-up

Physics Lab as one general **Calculus** tab beside a **Precise values** tab,
on a real Desmos graph. Built 2026-11-23 to decide whether the redesign in
`docs/GPT_EFFICIENCY_AND_GENERAL_CAS_BRIEF.md` (Part 2) is worth building.

## Running it

```sh
node docs/mockups/calculus-tab/build.mjs        # bundles engine.ts → engine.js
python -m http.server 8765 --directory docs/mockups
# open http://localhost:8765/calculus-tab/
```

Or start the `mockups` entry in `.claude/launch.json`. It needs the network:
the graph is Desmos's public API with its demo key, which is also why it
cannot be published as an artifact.

## What is real and what is mock-up

Real: the graph, Desmos's parser and MathQuill, and every answer. `engine.ts`
calls Physics Lab's own engines from `src/` — differentiation with its rule
tree, the integrator with its derivative check and series fallback, the
limit engine, the first- and second-order ODE solvers, and the decimal
recogniser.

New, and what is being judged:

- One input instead of six tabs. The operation comes from the notation
  (`\frac{d}{dt}`, `\int … du`, `\operatorname{lim}_{h\to0}`, `\sum`,
  `y'=`, `\frac{dp}{dt}=`) or from a shortcut chip, which writes the
  notation into the field so it stays visible.
- Any variable names. The variable is the one the notation binds, or the one
  free letter, or a chip the user picks; with two candidates nothing is
  guessed. The ODE solvers are written for y and x, so other names are
  renamed in and out.
- Graph sliders kept as letters or replaced by their values, by choice, and
  graph functions written in (`f(1+h)` uses the graph's `f`).
- A verdict on every answer: Proved, Proved and checked, Checked numerically,
  Series answer, Not decided.
- Precise values: a decimal matched against constants, or a series summed with
  Kahan compensation, accelerated (Richardson or Wynn ε, whichever is more
  stable), and the limit matched — labelled as evidence, not proof. The
  nth-term test proves divergence.
- Three candidate icons, switchable at the bottom right. Rafael picked the
  integral sign on 2026-11-23.

- **Fractional derivatives and integrals** (added 2026-11-23), typed as
  `\frac{d^{\pi}}{dx^{\pi}}(…)` with any order, or picked with the dᵅ/dxᵅ
  chip; a negative order is a fractional integral. The engine is
  `src/plugins/physics-lab/symbolic/fractional.ts`. Every definition that
  gives a different answer gets its own card, and a table compares their
  values at a point:
  - **Riemann–Liouville** and **Caputo**: closed forms in Γ, ψ and the
    Mittag-Leffler function from 0. From another lower limit, or where there
    is no closed form, an exact integral representation instead.
  - **Grünwald–Letnikov**: the finite-difference limit, evaluated with
    Richardson extrapolation. It agrees with Riemann–Liouville, as it must.
  - **Conformable**: always elementary.
  - **Caputo–Hadamard**: an exact integral with a logarithmic kernel.
  - **Weyl**: from −∞, term by term, with the reason any term has none.
- **Special functions with their real notation**:
  - **The library** (`src/symbolic/special.ts`): Γ, 1/Γ, B, ψ, ζ, erfc, erfi,
    Si, Ci, Shi, Chi, Ei, li, Li₂, the Fresnel S and C, Bessel J, Lambert W,
    elliptic K, and the Mittag-Leffler E.
  - **In Desmos:** each one is defined in Desmos, and its definition is added
    to the graph with any answer that uses it. Desmos accepts `\Gamma`, `\psi`,
    `\zeta`, `\operatorname{Li}_{2}`, `\operatorname{Ei}` and the rest as names
    of functions the user defines. The one exception is E\_{a,b}(z), which has
    to be E(a,b,z) because a subscript cannot hold a comma.
  - **Checking:** `node scripts/check-special-functions.cjs` compares every
    Desmos definition with the JavaScript value in live Desmos (worst
    relative error 3×10⁻¹⁴ on 2026-11-23).
  - **Antiderivatives:** integrals with no elementary antiderivative are now
    answered in these functions (`specialIntegrals.ts`): ∫eˣ/x = Ei(x),
    ∫ln(1+x)/x = −Li₂(−x), ∫sin(3x)/x = Si(3x), ∫e^{−x²}, ∫cos(x²), ∫1/ln x.
    Each is checked by differentiating back.
  - `node docs/mockups/calculus-tab/graph-check.cjs` puts each graphed answer
    into a fresh Desmos page and compares Desmos's value with the panel's.

Not in the mock-up yet: PDEs on Desmos 3D, custom operators beyond `lim`, and
convergence proofs. Also wanted, and asked of GPT in the brief's Part 2
question 10: higher-order and nonlinear ODEs solved and drawn (phase plane,
3D phase portrait, solution curves), and a Simplify operation that goes far
beyond today's.

An indefinite ∫ has empty bound slots in Desmos's MathQuill. They are hidden
until the cursor goes into one (arrow right from beside the ∫), and typing
there makes the integral definite.

## Checks

- `node docs/mockups/calculus-tab/smoke.cjs` runs the engine on the example
  requests in a headless Desmos page and prints each answer.
- `node docs/mockups/calculus-tab/shots.cjs` (with the server running) drives
  the panel and saves `docs/assets/calculus-tab-*.png`.

Building it found one bug in the shipping engine, fixed in `088b023b`: the
decimal recogniser could not name ln 2 on its own.
