# GPT's PhET designs, and what was kept

GPT's answer to `docs/VECTOR_TOOLS_PHET_FOLLOWUP_RESEARCH.md` (12 October 2026):

- `answers.md`: its audit of `docs/VECTOR_TOOLS_PHET_SURVEY.md` against PhET's HTML5 descriptions and the CEDs, then concrete designs for every ranked idea and the C1–C5 capability specs.
- `gpt-ledger.md`: what it could and could not check.
- `analytic_checks.py` and `analytic_checks.json`: its numeric checks.
- `chromium-container-diagnosis.md`: why it could not run Desmos. Its own container's Chromium blocks every website and every extension by managed policy.

Its corrections to the survey stand:

- The survey assessed a catalogue; it did not click through 112 simulations.
- Several screen descriptions were out of date.
- Kepler's first and second laws are enrichment, not AP Physics C exam objectives.
- Gauss's and Ampère's laws have no PhET counterpart; they would be ours.

## What GPT built, and what changed after checking it live

GPT could not run the tests, the type check or Desmos. All of that was done here: 36 cases (9 presets, 2D and 3D, both modes), screenshots in `docs/assets/vector-3d/ap/`, and recompute times in `latency.json`.

- **Clock: 0.25× and single step.** Kept as written. Live: a step advances exactly 1/30 s and Desmos follows; 0.25× runs at a quarter speed.
- **Energy bars** (projectile, oscillator, circular motion). Kept. A paper card is added under the bars; over the flow they were read through a field of particles.
- **Kepler's equal areas:**
  - _The flow used one speed for every orbit._ It drew the right ellipses at the wrong speeds, and its colour was not the areal velocity. Now μ/h = √(M/p) with p = r + ex, so every particle is a true Kepler orbit and the colour is its h/2. A test checks orbits other than the reference.
  - _Kepler's equation was six function steps,_ each calling the last three times: 3⁶ = 729 calls per position, at every vertex of every 3D surface on every tick. Desmos 3D froze. Now the steps are six plain scalars, solved once per change. The orbit and the wedges are drawn in the eccentric anomaly, which needs no solving.
- **Pendulum:**
  - _The state rode the separatrix,_ the one motion that never repeats: the pendulum crept up to upside-down and stayed. Now an amplitude slider θ₀ drives the exact large-angle motion, θ = 2 arcsin(k sn(ω₀t + K)). K comes from the arithmetic–geometric mean, and sn and cn from their nome series. A test checks it against energy and period.
  - _Tint scale 3, not 10,_ so the swinging region is coloured in Majestic rather than dark.
- **Motion graphs.** Redesigned:
  - Three strips of fixed size, each with its zero line, and a "now" line through all three.
  - The track and object at the top.
  - A current along the track that moves as the object does: it slows, stops and turns round while a stays constant.
  - In 3D, it stands in the xz-plane.
  - GPT's flow, (1, v₀ + at) with x as time, drew x–t curves that did not line up with the strips' axes.
- **Projectile trajectories** are now an explicit list of curves rather than one implicit curve over the plane. Moving g took 200 ms to recompute; it now takes 60.
- **Greek variable names** (θ₀) display as letters in the presets window.

## The GitHub Pages verification

GPT's workflow is at `.github/workflows/vector-tools-pages.yml`, with its report at `docs/mockups/vector-3d-arrows/ap-pages-report.cjs`. See `docs/VERIFY_GITHUB_PAGES.md`.

Its latency proxy (one slider, flow redraw only) is replaced by `docs/mockups/vector-3d-arrows/ap-latency.cjs`. That script times Desmos's recompute for every physics slider, which is the 150 ms budget.

GitHub's runners have no GPU, so the dashboard's frame rates are not the classroom's. Its refusal counts, screenshots and recompute times are meaningful. The frame rates measured here, on Rafael's machine, are the real ones.
