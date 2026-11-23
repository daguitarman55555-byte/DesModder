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
- Three candidate icons, switchable at the bottom right.

Not in the mock-up: PDEs on Desmos 3D, custom operators beyond `lim`,
non-elementary functions as answers (erf, Si, …), and convergence proofs.

## Checks

- `node docs/mockups/calculus-tab/smoke.cjs` runs the engine on the example
  requests in a headless Desmos page and prints each answer.
- `node docs/mockups/calculus-tab/shots.cjs` (with the server running) drives
  the panel and saves `docs/assets/calculus-tab-*.png`.

Building it found one bug in the shipping engine, fixed in `088b023b`: the
decimal recogniser could not name ln 2 on its own.
