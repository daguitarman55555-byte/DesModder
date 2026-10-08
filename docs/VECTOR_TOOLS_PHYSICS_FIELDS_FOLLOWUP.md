# Vector Tools physics fields — follow-up to your report

Thank you: the report is strong, and most of it we will build as written.
Your repository observations check out against the code (division clamped
at 1e−12 rather than leaving holes, the birth pool refreshing over 16
frames, absorb as a magnitude threshold, the gallery's unconditional
saturation 1.45 / contrast 1.2, traces and particles as alternatives).

Below: facts we measured in the real Desmos pages after reading it, which
change parts of your plan, and the questions we need answered before
building. **Answer only these; do not redo the report.**

---

## A. Facts we measured (7 October 2026, live desmos.com, headless Chrome)

### A1. Desmos 2D has no vectors; Desmos 3D does

- **2D calculator:** `\operatorname{vector}\left(\left(0,0\right),\left(2,1\right)\right)` is
  refused: _"This calculator does not support the 'vector' function."_
- **3D:** `\operatorname{vector}\left(\left(0,0,0\right),\left(2,1,1\right)\right)` draws a
  clean shaded arrow.
- **Point labels** (`showLabel: true`, `label: …`) display in both. We
  did **not** verify whether a label renders LaTeX such as `\vec{E}`, or
  what the exact syntax for maths in a label is.

### A2. Coordinate colour maps did not apply through the state we tried

We set `colorLatex: "\\operatorname{rgb}(255x,0,0)"` on a 2D region
`x^{2}+y^{2}\le1` and on a 3D sphere `x^{2}+y^{2}+z^{2}=1`. Neither raised
an error, and both drew in the default colour. Either the format is wrong
or colour maps need another field. Your planet designs depend on this.

### A3. In 3D, our canvas covers Desmos

The 3D flow canvas sits directly **above** Desmos's canvas, and every 3D
preset draws a backdrop at opacity 1: **any Desmos sphere, plate, vector
or point is hidden under it today.** Our particles can already pass
behind Desmos surfaces (we draw the graphed surfaces into our own depth
buffer), but the backdrop paints over Desmos's pixels.

In 2D the flow canvas can be placed **under** Desmos's graph (a layer
setting), and then Desmos's objects, grid and labels draw on top of the
particles. That works today.

### A4. Helper names will collide

Our compiler calls functions the graph defines, so your helpers (`f`,
`g`, `h`, `V`, `S`, `r_{1}`, `D_{1}`, `A`, `C`, `H`, `J`, `X`, `Y`, `Z`) would
collide with what students already have in their graphs (`f` above all)
and with each other across presets. Names must be a Latin letter plus an
optional subscript of letters and digits (`f_{E}`, `V_{q2}`). We keep a
preset's own expressions in a namespaced folder and leave any name the
user already defines alone, so a collision silently changes the field.

### A5. Time

The plugin's clock `t` reaches our shaders only; Desmos geometry cannot
read it. A Desmos ticker driving a slider `T` reaches both (the field
reads `T` as a uniform). Our **Moving / Still** switch currently stops the
plugin clock only.

---

## B. Questions

**B1. Main vectors and names, given A1.** You proposed a GPU instance
list plus a stroke-glyph alphabet for names. Compare with a Desmos-native
design:

- 3D: `vector()` for the arrows; a point label at each tip for the name.
- 2D: a segment plus a filled triangular polygon for each arrow; a point
  label for the name.

Which is better for a projector demo (crispness, depth, legibility from
the back of a room, cost, keeping several arrows on one scale)? If
Desmos-native wins in either dimension, give the exact expressions for
the charges preset's probe: E, E₁, E₂ and F = q₀E, on one shared scale,
plus the arrowhead geometry for 2D. Tell us the exact label syntax for
`\vec{E}` if Desmos supports maths in labels, and the fallback if it
doesn't.

**B2. Colour maps, given A2.** The exact Desmos **graph-state JSON** for
one 3D sphere coloured by a function of x, y, z (your Earth-like map), and
whether any equivalent exists for 2D regions. If it can only be set
through the UI, say so: we will then use your eight-band fallback in both
dimensions.

**B3. 3D compositing, given A3.** What should a 3D physics preset do so
Desmos objects show with the particles? Options we see:

1. no backdrop (particles over Desmos's own white or dark theme);
2. a partial backdrop (opacity ~0.5) so Desmos objects show through
   dimmed;
3. a new layer mode: our canvas drawn **under** Desmos's, if Desmos 3D's
   canvas has a transparent clear (we can test this; tell us what to look
   for);
4. our renderer drawing the objects itself (spheres and discs as
   impostors), using your geometry, which breaks "Desmos draws the
   objects".

Recommend one per preset type, with the look you expect (Desmos 3D's
lighting on white versus our dark backdrop).

**B4. Names, given A4.** A naming scheme for every helper in sections
4–10 and 17 that cannot collide with ordinary student graphs or across
presets, within the identifier rule, and the renamed expressions. Keep
them readable for a teacher who opens the folder (`V_{E}` for the
charges' potential reads better than `q_{zz}`).

**B5. Time, given A5.** Confirm that presets with moving geometry should
be driven entirely by a ticker on `T` (field and geometry), and give the
ticker settings (handler, step) that keep `T` in seconds at playback
speed. Say how Still should stop it.

**B6. Electric charges, end to end.** It is our first build. With B1–B5
applied, give the complete 2D and 3D expression lists as **graph-state
JSON**: every item with id, latex, colour, hidden, line/point/fill style,
label, slider bounds, and folder; plus the field components and the flow
settings, all as you would have them load. Mark anything you have not
verified in Desmos.

---

## Attached

- `vector-tools-research.md`: your report, for reference.
- Screenshots of the A1–A2 tests: `desmos-test-2d.png`, `desmos-test-3d.png`
  (in `docs/research/physics-fields-gpt/`).
