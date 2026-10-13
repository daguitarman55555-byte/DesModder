# GPT's next AP batch, and what was kept

GPT's answer to `docs/VECTOR_TOOLS_GPT_BRIEF_NEXT.md` (12 October 2026) is `answers.md`: its designs, the moving-magnet and measuring-tool specifications, and Majestic notes for each preset.

GPT could not push a `gpt/` branch through its GitHub connection, so nothing ran in CI. Its `types.ts` and `index.ts` hunks were written against a reconstructed copy of those files and did not apply. Everything below was checked here instead:

- 48 live cases (12 AP presets × 2D/3D × both modes): 57.9 fps or better, nothing refused;
- recompute times in `docs/assets/vector-3d/ap/latency.json`;
- unit tests that tie each preset's own LaTeX to an independent oracle (`ap-next-physics.ts`).

## Kept

- **Gauss's law** (`ap-gauss-flux`, AP 2 unit 10, Physics C: E&M): two movable point charges, a movable Gaussian sphere, and the flux as a native 80-point Fibonacci sum beside the exact enclosed charge.
- **Ampère's law** (`ap-ampere-loop`, AP 2 unit 12, Physics C: E&M): two long wires, a tilted loop, and the circulation summed natively beside μ₀I_enc.
- **Incline** (`ap-incline-forces`, AP 1 unit 2): static friction as the reaction it is, up to μsN, then μkN; the threshold arctan μs.

## Changed after looking

- **Gauss and Ampère in 2D drew dots.** A point source's field spans orders of magnitude, so away from the sources every particle stood still. They now draw direction only (`normalizeSpeed`), as the charges preset does; the colour carries the strength.
- **Gauss's colour was E·n̂ measured from the sphere's centre,** meaningful only on the surface. It is now the potential V, as on the charges preset, and a test checks E = −∇V.
- **The 3D Gaussian sphere drew solid** over the flow, hiding the charge inside. It is now a wireframe of five latitudes and six meridians.
- **The 2D force arrows were refused:** Desmos 2D has no `vector()`. They are now the probe's arrows (`probeArrows2D/3D`), named F_g, N, f and F_net, undamped so their lengths are in proportion.
- **The law is read off the graph.** In 2D Explanatory, a label shows Φ beside Q_enc/ε₀, and ∮B·dl beside μ₀I_enc. In 3D the values are in the expression list, as Desmos 3D draws no labels.
- **Ampère's tint scale is 0.15, not 0.6.** At these currents |B| is a few tenths, and the field was all the dark end of the palette in Majestic.
- **The Gauss drag handles take their charges' colours.** Default slate drew both charges blue-grey.
- **Greek slider names** (α, β) were written as ordinary JavaScript strings, which lost their backslashes; they are now raw strings.

## Held back

- **The measuring tools (`measurements.ts`).** As written, they added 5–7 sliders (the tape's endpoints) to nine already-verified presets, plus a "stopwatch" that was a copy of T. They need a proper floating control, not more sliders. GPT's own specification in `answers.md` says the same.
- **The moving magnet through a coil.** Specified only; not built.

## Close to the budget

3D Gauss is the closest: moving the Gaussian sphere's centre recomputes in about 100 ms alone. Late in a long run, under load, one sample reached 176 ms and one spike 1024 ms. Re-measured alone, the worst was 97 ms.
