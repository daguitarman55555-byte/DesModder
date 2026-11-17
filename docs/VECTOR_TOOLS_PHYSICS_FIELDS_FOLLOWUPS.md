# Physics fields research: the follow-up rounds

---

The follow-up prompts that went to GPT after
`VECTOR_TOOLS_PHYSICS_FIELDS_RESEARCH_BRIEF.md`, one section per round, as
they were sent. They were three files,
`VECTOR_TOOLS_PHYSICS_FIELDS_FOLLOWUP.md` and `_2` to `_3`, merged on
2026-11-17 with only their headings moved down a level. GPT's answers are in
`docs/research/physics-fields-gpt/`.

| Round | Written    | Was               | Asked                                                 |
| ----- | ---------- | ----------------- | ----------------------------------------------------- |
| B     | 2026-10-07 | `…_FOLLOWUP.md`   | B1–B6, after measuring the report in real Desmos      |
| C     | 2026-10-07 | `…_FOLLOWUP_2.md` | C1–C5, after the commits that changed its assumptions |
| D     | 2026-10-08 | `…_FOLLOWUP_3.md` | Bringing the other physics presets up to the charges' |

---

## Round B (2026-10-07): Vector Tools physics fields — follow-up to your report

Thank you: the report is strong, and most of it we will build as written.
Your repository observations check out against the code (division clamped
at 1e−12 rather than leaving holes, the birth pool refreshing over 16
frames, absorb as a magnitude threshold, the gallery's unconditional
saturation 1.45 / contrast 1.2, traces and particles as alternatives).

Below: facts we measured in the real Desmos pages after reading it, which
change parts of your plan, and the questions we need answered before
building. **Answer only these; do not redo the report.**

---

### A. Facts we measured (7 October 2026, live desmos.com, headless Chrome)

#### A1. Desmos 2D has no vectors; Desmos 3D does

- **2D calculator:** `\operatorname{vector}\left(\left(0,0\right),\left(2,1\right)\right)` is
  refused: _"This calculator does not support the 'vector' function."_
- **3D:** `\operatorname{vector}\left(\left(0,0,0\right),\left(2,1,1\right)\right)` draws a
  clean shaded arrow.
- **Point labels** (`showLabel: true`, `label: …`) display in both. We
  did **not** verify whether a label renders LaTeX such as `\vec{E}`, or
  what the exact syntax for maths in a label is.

#### A2. Coordinate colour maps did not apply through the state we tried

We set `colorLatex: "\\operatorname{rgb}(255x,0,0)"` on a 2D region
`x^{2}+y^{2}\le1` and on a 3D sphere `x^{2}+y^{2}+z^{2}=1`. Neither raised
an error, and both drew in the default colour. Either the format is wrong
or colour maps need another field. Your planet designs depend on this.

#### A3. In 3D, our canvas covers Desmos

The 3D flow canvas sits directly **above** Desmos's canvas, and every 3D
preset draws a backdrop at opacity 1: **any Desmos sphere, plate, vector
or point is hidden under it today.** Our particles can already pass
behind Desmos surfaces (we draw the graphed surfaces into our own depth
buffer), but the backdrop paints over Desmos's pixels.

In 2D the flow canvas can be placed **under** Desmos's graph (a layer
setting), and then Desmos's objects, grid and labels draw on top of the
particles. That works today.

#### A4. Helper names will collide

Our compiler calls functions the graph defines, so your helpers (`f`,
`g`, `h`, `V`, `S`, `r_{1}`, `D_{1}`, `A`, `C`, `H`, `J`, `X`, `Y`, `Z`) would
collide with what students already have in their graphs (`f` above all)
and with each other across presets. Names must be a Latin letter plus an
optional subscript of letters and digits (`f_{E}`, `V_{q2}`). We keep a
preset's own expressions in a namespaced folder and leave any name the
user already defines alone, so a collision silently changes the field.

#### A5. Time

The plugin's clock `t` reaches our shaders only; Desmos geometry cannot
read it. A Desmos ticker driving a slider `T` reaches both (the field
reads `T` as a uniform). Our **Moving / Still** switch currently stops the
plugin clock only.

---

### B. Questions

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

### Attached

- `vector-tools-research.md`: your report, for reference.
- Screenshots of the A1–A2 tests: `desmos-test-2d.png`, `desmos-test-3d.png`
  (in `docs/research/physics-fields-gpt/`).

---

## Round C (2026-10-07): Vector Tools physics fields: second follow-up (C1–C5)

Thank you for B1–B6. The charges fixtures, the named-colour sphere and the
backdrop-off policy are what we will build first. Your answers are kept in
`docs/research/physics-fields-gpt/follow-up/`.

The branch has moved since the snapshot you inspected (`4cd8cdd9`). It is now
at `36d92870` on `daguitarman55555-byte/DesModder`,
`feature/vector-tools-foundation`. Three commits change what you assumed.
Please read them before answering:

- **`0d89a861`: moving bodies are worked out on the CPU.**
  - This is new: `src/field-rendering/gallery/orbits.ts` and a
    `ClockParameters { names, at(t) }` on presets (`gallery/types.ts`).
  - Each frame the plugin calls `at(t)` with its own clock `t` and passes the
    results to the shader as plain uniforms.
  - The figure-8 is integrated once with RK4 from Simó's initial conditions
    into a 4,096-sample table. The Kepler pair solves Kepler's equation by
    Newton's method.
  - This is what fixed the 3D three-body. Its old Fourier-series field took
    12 s to compile and then stalled the GPU at 0 fps. It now runs at 60 fps.
  - It is the "dynamics provider" your §17 asks for, in its simplest form.
- **`648e4207`: the 3D magnet is a pure point dipole.** Its core, and the
  absorption around the centre, have been removed.
- **`36d92870`: no stacked slices in 3D.**
  - Wires, cylinder and capacitor are now seeded in one connected piece:
    tubes of rings round each wire, a sheet hugging the cylinder, and the
    plates' gap and fringes. All are continuous along |z| < 2.5.
  - The vortex lattice is one sheet.
  - The wires now read as objects. The cylinder and capacitor still don't,
    because nothing solid is drawn. B3 is the answer to that.

You don't need to re-verify what you marked unverified. I will check these
live myself and report back:

- 3D math labels;
- full state import;
- `pointOpacity` 0 labels;
- the eight-band fallbacks;
- core respawning;
- frame rate with native objects.

### C1. One clock, when the plugin owns the body positions

B5 says one ticker-driven `T` should drive both the native geometry and the
shader. Since `0d89a861`, body positions come from the CPU with no closed form
in Desmos: the figure-8 is a sampled table, Kepler is a Newton solve, and a
random three-body would be a replayed trajectory. The native spheres must sit
exactly where the shader thinks the bodies are.

1. Which of these do you recommend? Give a reason, and a measurement where you
   can make one.
   - **(a)** The Desmos ticker owns `T`. The plugin reads `T` each frame,
     computes positions, and writes them into owned scalars (`a_{1}` and so
     on) with `setExpression`.
     - What does that cost at 30 or 60 Hz?
     - Does it pollute undo history?
     - Does it fight a student dragging a slider?
   - **(b)** Desmos computes the positions itself from `T`.
     - For the figure-8: an owned list of samples, interpolated by `T`.
     - For Kepler: a fixed number of Newton steps written as nested
       expressions.
     - The plugin evaluates the same thing in JS for the uniforms.
     - Give the exact Desmos LaTeX for both, with braced subscripts, and say
       how far Desmos's value and ours can drift apart.
   - **(c)** Something better.
2. Our Moving/Still pill and the plugin's own `t` already exist.
   - How do they map onto your owned-ticker rules?
   - What happens when a student's graph already has its own ticker?

### C2. Collision-safe names that a class can read

B4 is right that our variables (`gallery/physics.ts`, loaded by
`loadPresetVariables` in `src/plugins/vector-tools/index.ts`) are unsafe
today. They are named `q_{1}`, `q_{2}`, `d` and so on, and are left alone when
the student already defines that name, which silently binds to the student's
definition. We will fix that.

But these sliders are what a teacher shows on a projector. `q_{E1VT1}` next to
the slider reads as noise to an AP student.

1. Is allocating the plain textbook name when it is free, and suffixing only on
   collision, safe under your rules 1–5?
2. If not, what is the most readable scheme that is?
3. Can a Desmos slider show a readable name while the identifier is long? For
   example, a label, or a note beside it. Say what you have actually seen
   render.

### C3. The other five presets, complete

Please do for these five what you did for charges: a complete
`.state.json` per dimension, plus a deep partial `.vector-tools.json` patch.

| Preset     | What it needs                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Wires      | Two native wires with current direction shown by geometry.                                                          |
| Earth–Moon | Your named-colour Earth, a grey cratered-look Moon by the same method, sizes and distance honest or clearly scaled. |
| Cylinder   | A solid native cylinder, rotating visibly, so it is not a "gaping hole".                                            |
| Capacitor  | Two solid plates with + and − shown by geometry.                                                                    |
| Bar magnet | A solid prism with N/S faces coloured, and your exact prism field.                                                  |

For each one:

- Use the branch's current seeds as the starting point: `WIRE_TUBES`,
  `CYLINDER_SHEET` and `PLATE_GAP` in `physics.ts`.
- Give default slider values and bounds an AP teacher would actually use.
- Use the native probe arrows from B1, where the preset has a meaningful
  probe.
- Mark plainly which parts you verified live and which you only checked
  structurally.

### C4. Random three-body, on our provider

Your §17 needs a trajectory bank, collisions and restart. Our provider is
`at(t) → numbers`, a pure function of the plugin clock.

1. Specify how a run of screened systems, with collisions and the 0.7 s flash,
   maps onto that interface. For example, a piecewise schedule in `t` built
   ahead of time.
2. Specify what the provider must also expose so that Desmos can draw the
   flash and the trails.
3. Give the integrator you used precisely enough that we can reproduce your
   six collision times in the browser to within 0.01 s:
   - the method;
   - the step-size rule;
   - the swept collision test;
   - the stopping rule.
4. Give a bank format we can store: initial states only, plus a screening
   result we re-check at load.

### C5. Anything we got wrong

If anything in the three commits above conflicts with your physics, say so
specifically. For example, a figure-8 period, the Kepler sign convention, or
point-dipole seeding that misrepresents field density.

Please put everything in the same layout as last time:

- an `answers.md` that comes first;
- the files beside it;
- a verification ledger saying what was seen live and what was not.

---

## Round D (2026-10-08): Vector Tools physics presets: bring the rest up to the charges' standard

You have repo access again. Work on `daguitarman55555-byte/DesModder`, branch
`feature/vector-tools-foundation`, at commit **`e25aa05a`** or later. Your
last answers (C1–C5, the fixtures for wires, Earth–Moon, cylinder, capacitor
and bar magnet) are in `docs/research/physics-fields-gpt/follow-up-2/`.

**Electric charges** is now built, tested live and liked. It is the template.
Your job is to bring the other six physics presets to the same standard:

- Parallel wires;
- Earth and Moon;
- Spinning cylinder;
- Capacitor;
- Bar magnet;
- Magnetic dipole.

The audience is AP Physics 1 and 2 teachers demonstrating in class, with no
writing on the graph. Every picture must be physically exact, readable on a
projector, and quick to respond.

### 1. How the charges preset is built — read this code first

| What                                                                                | Where                                                                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| The preset: field, seed, tint, variables, switches, scene                           | `src/field-rendering/gallery/physics.ts` (`charges`, `CHARGES_SCENE_2D/3D`, `chargeProbe`, `CHARGE_TINT`, `CHARGE_FLOW`) |
| Probe arrows, damping, 3D names                                                     | `src/field-rendering/gallery/probe.ts`                                                                                   |
| Types: `SceneItem`, `GalleryVariable.toggle`, `onPaper`, `tint`, `name3d`, `drag3d` | `src/field-rendering/gallery/types.ts`                                                                                   |
| Loading a preset's objects into the graph                                           | `loadPresetVariables`, `sceneItemSpec`, `syncScene3D` in `src/plugins/vector-tools/index.ts`                             |
| Preset → config (on-paper look, auto ink, tint)                                     | `src/plugins/vector-tools/gallery.ts` (`finished`, `PAPER_FLOW`, `paperSpace`)                                           |
| 3D names and 3D probe drag, drawn by the plugin                                     | `src/field-rendering/Scene3DLayer.ts`                                                                                    |
| Colour by a formula (`colorMode: "scalar"`, `vtTint`)                               | `FlowRenderer.ts`, `Flow3DRenderer.ts`, `field.ts`, `field3d.ts`                                                         |
| The guards that keep Desmos-refused forms out                                       | `src/field-rendering/gallery/scene.unit.test.ts`                                                                         |
| Live-check scripts to copy                                                          | `docs/mockups/vector-3d-arrows/charges-*.cjs`                                                                            |

In short, a preset can carry:

- **Variables** (sliders), and **switches** (0/1 variables shown as
  checkboxes).
- **A scene**: Desmos expressions loaded into the preset's own folder, such as
  solids, the probe, arrows and exact field lines.
- **`onPaper`**: no dark backdrop; the flow sits under Desmos's objects, with
  auto ink.
- **A `tint`**: a scalar formula the particles are coloured by, through a
  diverging palette with `tanh(value/scale)`. Charges use the potential on
  the `charge` palette: red is positive, dark slate is zero, blue is
  negative.

### 2. What we learned live — your designs must respect these

1. **Desmos 2D rejects** these forms:
   - a number before a list, `0.25[…]`, which it reads as indexing;
   - two numbers side by side, as in `0.55·0.4` written without `\cdot`;
   - a bare trig argument followed by another factor, `\cos u\sin v`;
   - `\ne` in a condition;
   - a bare `|y|`.
2. **In 3D, `f(x,y,z)=a` is a redefinition of `f`.** Write a sphere
   parametrically instead.
3. **The plugin hides particles only behind parametric `(u,v)` surfaces**, not
   implicit ones. Draw every solid in 3D parametrically, with a
   `domainU`/`domainV`.
4. **Labels:**
   - A 2D point with `pointOpacity` 0 hides its label; use `pointSize` 0.
   - **Desmos 3D draws no labels at all.** Use `name3d` instead; the plugin
     draws those itself.
5. **Desmos 3D cannot drag points.** Use `drag3d` on the probe.
6. **Implicit contours cost a lot.**
   - A list of 81 levels took Desmos 400 ms per slider change; 17 levels
     took 320 ms.
   - A single curve `\sin(4\pi S)=0` gives the same lines in 100 ms.
   - Wherever a stream function or flux function exists, draw the exact
     field lines that way.
   - Budget: **Desmos's whole recompute after a slider change under 150 ms**,
     measured with a script like `charges-desmos-cost.cjs`.
7. **Arrow lengths are damped by default** (`L·tanh(|gV|/L)`), behind a switch
   for exact proportion. Reach is 5 in 2D at home view (±10) and 2.5 in 3D.
8. **A flow with a sink piles particles up there.** In 3D, a short lifetime
   (about 1.2 s) keeps the flow even.
9. **Colours must mean a physical quantity**, and the meaning must be one a
   class learns. The tint is the flow's colour, the field lines are dark
   slate, and the equipotentials are dashed dark grey.

### 3. What to produce, per preset (2D and 3D)

For each of the six presets, deliver TypeScript in the shape `physics.ts`
uses (`GalleryPreset` with `scene`, `variables` with switches, `tint`,
`onPaper` where it fits), ready to paste in.

1. **The field**:
   - exact, with the same guards as the charges (zero inside solids, no
     softening where a solid covers the pole);
   - a seed that puts particles where the structure is, never in stacked
     slices.
2. **The meaning of colour**: which scalar to tint by, and why a teacher
   would point at it. Examples:

   - wires: |B|, or A_z, whose contours are the field lines;
   - Earth–Moon: the gravitational potential;
   - cylinder: pressure from Bernoulli (lift made visible), or the stream
     function;
   - capacitor: the potential;
   - magnets: the magnetic scalar potential, or |B|.

   Give the formula, the palette (an existing one or a new one with stops),
   and the scale.

3. **Exact field lines in Desmos**: a stream or flux function where one
   exists, drawn as a single implicit curve. Where none exists, say so and
   propose the cheapest honest alternative.
4. **The solids, as Desmos objects** (2D regions; 3D parametric surfaces):
   - wires with their current direction;
   - Earth and Moon with your coordinate-colour maps;
   - a cylinder whose spin you can see;
   - capacitor plates with their signs;
   - a bar magnet with red N and blue S.
5. **A probe with its arrows** (via `probeArrows2D/3D`), and switches for what
   a teacher toggles. For example:
   - wires: each wire's B and the force per length between them;
   - gravity: g, each body's pull, and the net;
   - cylinder: the velocity, and the pressure force;
   - capacitor: E;
   - magnets: B.
6. **Defaults and slider ranges a teacher would use**, with the switches' text
   labels.
7. **Measured evidence**, run live through the built extension (`npm run
build`, load `dist`):

   - a screenshot of 2D and of 3D;
   - Desmos's recompute time after a slider change (under 150 ms);
   - zero refused expressions.

   Copy the `charges-live.cjs` and `charges-desmos-cost.cjs` patterns.

### 4. Then, new demos

From the list in your original report (§ "teacher demos") and anything better
you find, rank up to five new presets by value to an AP 1/2 teacher divided
by build cost. Examples: a uniform field and a moving test charge; the
potential landscape; the shell theorem; Faraday induction; a conducting
sphere in a uniform E.

For the top two, give the same full design as in §3.

### 5. Format

- A zip with `answers.md` first, then:
  - the TypeScript, one file per preset or one patch to `physics.ts`;
  - the screenshots;
  - the timing results;
  - a verification ledger: what you saw live, and what you only checked
    structurally.
- Build on the branch's real types and helpers; don't invent APIs. If one is
  missing, say exactly what it should be.
- Run `npm run test:unit` on your patch and report the result.
