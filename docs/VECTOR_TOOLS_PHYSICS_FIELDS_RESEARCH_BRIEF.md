# Vector Tools — research brief: physics fields that teach, and look real

You are being asked to research and design, not to write prose for students.
The deliverable is a set of **field designs we can build**: exact formulas,
how each is drawn, and why it is right. Everything below tells you what we
have, how it really behaves, and what is wrong with it today.

**Read this whole brief before answering.** The constraints in §2 and §3
are hard; a design that needs something we do not have is not usable,
however good it is.

---

## 0. Who this is for, and the bar

The user is building this for **AP Physics 1 and AP Physics 2 teachers**,
running live class demos on a projector. Three requirements:

1. **It teaches.** A student watching should see the concept: why field
   lines start and end where they do, why the cylinder lifts, why the
   capacitor's field is uniform between the plates. A pretty picture that
   says nothing is a failure. Today's electric-charges preset is exactly
   that failure (§5).
2. **No writing on screen.** The demos must work without text or
   explanations drawn on the graph. The picture, its motion, and the
   teacher's sliders carry the meaning. Colour, shape, motion, and Desmos's
   own geometry (points, curves, surfaces) are the vocabulary. Short slider
   names (`q_{1}`, `d`) are fine; labels and captions are not.
3. **It looks like the real thing.** With its particle seed on, each preset
   should look like the well-known picture of that phenomenon: a photograph
   where one exists (a planet, a galaxy, a tornado, an aurora), else the
   standard textbook figure (field lines of two charges, flow past a
   cylinder). With the seed switched off, the same picture, plus the field
   filling the space around it.

"Accurate" means the physics is right — the field is the real one, with
the real dependence on its variables — and the picture is honest: nothing
drawn that the field does not do.

---

## 1. What the product is

**DesModder** is a browser extension that adds plugins to desmos.com. This
fork adds **Vector Tools**, which draws a vector field F(x, y) on the 2D
calculator (desmos.com/calculator) and F(x, y, z) on Desmos 3D
(desmos.com/3d). The field is typed in Desmos LaTeX, compiled to GLSL, and
drawn on our own WebGL2 canvas laid exactly over Desmos's.

It draws a field three ways. **These, plus Desmos itself, are the only tools
you may use:**

| Tool                                              | 2D  | 3D  | What it is                                                                                                                                                                                                      |
| ------------------------------------------------- | --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flow** (a port of Andrei Kashcha's _fieldplay_) | yes | yes | GPU particles advected through the field, leaving fading trails. The main picture.                                                                                                                              |
| **GPU arrows**                                    | yes | yes | One instanced draw: an arrow per grid point (or per point on a graphed surface in 3D), length and colour from the field.                                                                                        |
| **Desmos itself**                                 | yes | yes | Anything Desmos can graph: points, curves, implicit curves and regions, parametric curves and surfaces, polygons, 3D surfaces and solids, sliders, lists, tickers. Our plugin can add expressions to the graph. |

Also present: **traced streamlines** in 3D (a fixed set of streamlines
drawn as lines through the box), and a **cloud** mode (arrows as a
volumetric haze). Use them if they help.

Not available: custom meshes, textures or images in our renderer;
particle–particle interaction; anything not expressible as a field plus a
seed plus Desmos expressions. **No new renderer features** unless you show
that one small, specific addition unlocks a lot — then name it precisely,
and we will judge.

---

## 2. How a field is written: the compiler's real rules

Each component is one Desmos LaTeX expression, compiled to GLSL ES 3.00 by
our compiler (`src/field-rendering/latexToGLSL.ts`). It is evaluated per
particle, four times per step (RK4), on an integrated GPU (Intel Iris Xe),
for 20,000–90,000 particles, at 60 fps. Cost matters: every `sin` in the
field runs about 5 million times a second.

**Supported:**

- Variables `x`, `y` (and `z` in 3D), and **`t`, the clock**: seconds,
  scaled by the preset's time speed. A field reading `t` animates.
- Numbers, `+ − · /`, `\frac`, powers `^{}` (any real exponent), `\sqrt`,
  `\left|…\right|`.
- Functions: `sin cos tan cot sec csc`, `arcsin arccos arctan` (also the
  two-argument `\arctan(y, x)`, which is atan2), `arccot arcsec arccsc`,
  `sinh cosh tanh coth sech csch`, `arcsinh arccosh arctanh`, `exp`, `ln`,
  `log`, `abs`, `sign`, `floor`, `ceil`, `round`, `mod`, `min`/`max` (up to
  four arguments).
- **Piecewise**: `\left\{x^{2}+y^{2}>1:A,B\right\}`. Conditions are
  comparisons (`< > ≤ ≥ =`). Nesting works.
- **Graph variables (sliders)**: any name the graph defines as a number
  becomes a live uniform. Dragging its slider changes the field without a
  recompile. **Names must be a Latin letter with an optional subscript**:
  `q_{1}`, `I_{2}`, `d`, `U`, `R`, `M_{1}`. **Greek names are not
  recognised** (`\omega`, `\sigma` fail).
- **Graph functions**: a function the graph defines, `f(x,y)=…`, can be
  called in the field and is compiled with it. A long formula can be split
  into named pieces defined in the graph. They must be single-expression
  definitions.
- A component that is non-finite at a point (division by zero, an undefined
  piecewise) draws nothing there.

**Not supported**: lists, list comprehensions, sums `\sum`, integrals,
derivatives in the field (we differentiate symbolically elsewhere, for
gradient fields only), recursion, `\operatorname{…}` beyond the list above,
and Greek variable names.

**Gradient fields**: the user can instead give a scalar f, and the field
is ∇f, differentiated exactly. Potentials are therefore first-class: a
preset can be "E = −∇V" with V written out.

**Formatting**: we write LaTeX the way Desmos writes it (`\left(…\right)`,
`x^{2}`, `\frac{a}{b}`), because these strings appear in the user's
expression list.

---

## 3. How each tool really draws (read carefully: this is where designs fail)

### 3.1 The 2D flow

- **Particles**: a fixed count (16k–50k). Each step every particle moves by
  RK4 through the field: `h = 0.01 × speed` units of field time per frame,
  or with **normalize speed** on, a fixed screen distance per frame along
  the field's direction (magnitude ignored).
- **Birth**: a particle dies at random with probability `dropRate` per
  frame, when it leaves the view (plus a margin), or stalls, and is reborn
  at a point drawn from the **seed** — an expression in x, y (and t) giving
  a birth probability 0–1. No seed means born uniformly in the view. The
  seed is how a preset says where its matter is (a disk, a ring, a
  cluster). A switch lets the user turn the seed off.
- **Trails**: the screen is a texture faded by `trailPersistence` each frame
  (0.9–0.995), and particles are drawn into it as small glowing dots. So a
  trail is the particle's path over the last ~1/(1 − persistence) frames,
  in screen space.
- **Colour**: by speed, `palette(1 − e^{−|F|/colorScale})`; or one fixed
  colour; or by direction (a hue wheel). Palettes are ramps (see §3.5).
  Drawn with screen blending over a dark backdrop: overlapping trails add
  up towards white. **Dense regions saturate to white**, whatever the
  palette.
- **Density is the flow's, not the field's.** In steady state, particle
  density follows the flow: particles pile up at sinks and thin out at
  sources. For a field from + to − charge, the + side drains dark and the
  − side crowds. Today we fight this with short lifetimes. Field-line
  _density_ ∝ |E| is **not** what the flow shows by itself.
- **Lens**: an optional black hole at the origin (shadow disc and photon
  ring).

### 3.2 The 3D flow

- Same idea in the box. RK4 in field units; a particle moves at
  `speed × |F|/scale` box half-widths per second, where `scale` is Auto
  (from the field's median) or fixed per preset. Colour is
  `palette(1 − e^{−|F|/scale})`.
- **Trails** are a ring buffer of at most 64 positions per particle, drawn
  as lines, faded with age, kept between frames and redrawn whole while the
  view moves. Heads are glowing points.
- `lifetime` (seconds, random exponential), `absorb` (particles die in a
  pole's core), `clip` to the box, a margin past the box where particles
  are born so the inflow face is not faded.
- Optional: **lens** (a black hole with true thin-lens images of the disk
  behind it), **Doppler beaming**, fog with depth, a cutaway, and hiding
  behind graphed surfaces (we draw Desmos's surfaces into our depth
  buffer, so the flow can go behind a sphere the user graphed).
- Same saturation and density caveats as 2D.

### 3.3 GPU arrows

A grid of arrows (or arrows standing on a graphed surface in 3D), length
by magnitude (linear, log, or normalized), coloured by a palette. Cheap,
exact, readable for showing magnitude and direction at points; can be
combined with the flow.

### 3.4 Desmos itself

Everything the calculator can graph, added as expressions in a folder. For
example: a filled disc for a cylinder; points for charges, drawn with a
colour and size; implicit curves `V(x,y)=c` for equipotentials (Desmos
draws these natively and exactly); a list of contours
`V(x,y)=[-3,-2,…,3]`; a 3D sphere for a planet, coloured by an expression;
parametric curves; a ticker animating a slider; a test charge as a
draggable point, with a force arrow drawn as a segment from it. Desmos 3D
draws surfaces with lighting and can colour a surface by a function of
position. **Desmos's own drawing is exact and crisp; ours is particles.**
Combining them is allowed and encouraged.

### 3.5 Palettes

Ramps from dark to light, chosen per preset. Among them: `starfield`
(white-blue, nearly monochrome), `ember`, `blackbody`, `magnetar`
(violet → cyan → white), `galaxy` (gold → cream → blue), `ocean`,
`worlds`, `storm`, `plasma`, `neon`, `sunset`, `auroral`, `nebula`,
`spectral`, `turbo`, `grayscale`, and a hue wheel. **The user dislikes
garish colour**: the 2D/3D magnet in white-blue (`starfield`) is their
reference for "looks right".

---

## 4. How a preset is built

A preset (`src/field-rendering/gallery/types.ts`) carries, for 2D and for
3D separately:

- the components (`xLatex`, `yLatex`, and in `space`, `zLatex`);
- a **seed** (where matter is born);
- **variables**: `{name, value, min, max, step}`, loaded as sliders in a
  folder of their own when the preset is chosen. The presets window shows
  them too, with Reset. A name the graph already defines is left as the
  user's — so a teacher can type a problem's numbers;
- the look: palette, particle count, speed, trail, lifetime, opacity,
  glow, normalize, backdrop colour, colour scale (2D) or scale (3D);
- `timeSpeed` (how fast `t` runs);
- in 3D, optionally a lens (black hole).

Today a preset **cannot** add other Desmos expressions (a disc, a point, a
contour) to the graph. The variables mechanism shows that it could: you may
assume a preset can add a folder of Desmos expressions (geometry, points,
contours, surfaces), drawn under or over the flow, and say exactly which.
That is the one infrastructure addition we expect to make.

The presets window also has **Moving / Still** (the clock running or
stopped) and **Whole look** (load the field only, or its look too).

---

## 5. The current presets and what is wrong with them

Attached pictures: `flow-presets.png` (3D), `flow-presets-2d.png` (2D),
`preset-variables.png` (the physics sliders), `preset-closeups.png`. The
source of every preset is attached: `space.ts`, `fluids.ts`, `chaos.ts`,
`fields.ts`, `physics.ts`, `latex.ts` (shared builders).

### Physics shelf (the priority)

| Preset                | Field today                                                                               | Problem                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Electric charges**  | Coulomb, q₁ at (−d/2, 0), q₂ at (d/2, 0), E = Σ q(r − rᵢ)/(                               | r − rᵢ                                                                                                                                                                                    | ² + 0.05)^1.5; normalized speed; `ember` palette; seeded everywhere. | **Means nothing as it is.** A haze of streaks with a bright and a dark blob. No sense of lines leaving + and ending on −, of line density showing strength, of the neutral point, of what a test charge would do. Density artefacts (§3.1) make the + side dark. |
| **Parallel wires**    | B from two infinite wires along z, currents I₁, I₂.                                       | 2D: readable rings, but grey and featureless. 3D: drawn as three stacked slices (z = 0, ±2.5) — **the user hates the stacking**; it must read as one thing.                               |
| **Earth and Moon**    | Newtonian gravity of M₁ = 81, M₂ = 1, d apart, about their barycentre.                    | A uniform blue starburst. The Moon is a dimple. Nothing looks like a planet.                                                                                                              |
| **Spinning cylinder** | Ideal flow past a cylinder with circulation: u − iv = U(1 − R²/z²) − iR²w/z; zero inside. | **The cylinder is a gaping black hole** where particles do not go. Should read as a solid, spinning body with the Magnus asymmetry and the stagnation points visible. 3D: stacked slices. |
| **Capacitor**         | Two finite plates (closed-form strip fields), ±s, half-width L, gap d.                    | 2D: decent — uniform field between, fringing at the ends — but the plates are not drawn, and the + plate's side drains dark. 3D: stacked slices.                                          |
| **Bar magnet**        | Pole model: ±p at the ends of a bar of length L, uniform field inside the bar.            | 2D: reads as a magnet, though the bar is a black rectangle.                                                                                                                               |
| **Magnetic dipole**   | Point dipole, (3(m·r)r − m r²)/r⁵, m on an AC cycle cos(0.4t).                            | The user's reference for "looks right" (white-blue, loops shrinking endlessly into the centre). In 3D it still has a uniform core of radius 0.6, being fixed.                             |

### Space shelf

| Preset                                                                                                    | Problem                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Double planet** (two worlds on Kepler ellipses about their barycentre, each carrying circling material) | **Must look like actual planets.** Today: glowing fuzzy blobs (2D) and cyan comet smears (3D). Think Earth/Moon or Pluto/Charon: lit spheres, terminator, maybe atmosphere, ring for one. |
| **Three-body eight** (Chenciner–Montgomery figure-eight, stars carrying gas)                              | Reads well in 2D. **The 3D one currently breaks the renderer** (being fixed separately).                                                                                                  |
| **Black hole**, **Spiral galaxy**, **Pulsar**, **Aurora**, **Solar wind**                                 | Reasonable; improve if you can make them more like photographs or NASA visualisations.                                                                                                    |

### Fluids and chaos

Vortex lattice (Taylor–Green), Tornado (Burgers–Rott, flaring funnel),
Smoke ring (Hill's vortex / thin-core ring), Vortex street (von Kármán),
Lorenz, Thomas. Lower priority; note improvements if cheap.

### Known artefacts to design around

- **Stacking in 3D**: fields uniform along z (wires, cylinder, capacitor)
  were seeded in three thin slices, which reads as three stacked copies.
  Filling the box instead reads as fog. Needed: a way to show a
  translation-invariant field in 3D as one coherent object.
- **Source/sink density**: §3.1.
- **Saturation to white** in dense regions.
- **Holes where the field is undefined** (inside a cylinder, at a point
  charge) read as black voids unless something is drawn there.

---

## 6. What to research and deliver

### 6.1 For each physics preset: a teaching design

For electric charges, wires, Earth–Moon gravity, the spinning cylinder,
the capacitor, the bar magnet and the dipole:

1. **The physics**: the exact field, in Desmos LaTeX that our compiler
   accepts (§2), with its variables (Latin names), their defaults and
   ranges. Say what is idealised (infinite wire, ideal flow) and why that
   is the right model for AP.
2. **What a student should see**: the 2–4 concepts this demo exists to
   show, matched to the AP Physics 1 / 2 course framework (cite the unit
   and learning objective where you can).
3. **How to draw it**, using only §1's tools:
   - flow settings (seed, normalize or not, colour mode, palette, scale,
     lifetime, trail, particle count) and the reason for each;
   - arrows, if they help;
   - the **Desmos expressions** to add: e.g. the charges as points sized
     by |q| and coloured by sign; equipotentials as implicit contours;
     the cylinder as a solid disc with something that shows its spin; the
     plates as segments; a draggable test charge with its force vector.
     Give the exact expressions.
4. **How it changes with the sliders**, and which slider moves are the
   demo (e.g. flip q₂'s sign: attraction becomes repulsion and the neutral
   point appears).
5. **In 3D**: the same, designed for the box — and specifically how to show
   the translation-invariant ones (wires, cylinder, plates) as one object,
   not stacks.

### 6.2 Field-line density

The single biggest flaw: the flow does not show field-line density ∝ |E|,
and sources drain while sinks crowd. Research how to make the particle
picture show the textbook field-line picture, within our tools:

- seeding strategies (e.g. seed density chosen so the steady particle
  density ∝ |F|; seeding on the sources in proportion to their flux, as
  field-line diagrams do — N lines ∝ q);
- particle lifetime tied to distance travelled rather than time;
- normalized vs true speed;
- whether Desmos-drawn exact field lines (parametric curves, or contours of
  a stream function where one exists — in 2D, for many of these, it does)
  should carry the lines while particles carry the motion.

Give the math, and say which you would choose for each preset.

### 6.3 Making things look like real objects

- **Planets**: what combination of a Desmos 3D sphere (coloured by an
  expression of position: continents from a few sinusoids, a terminator
  from the light direction), a 2D disc with shading, and particles
  (atmosphere, ring, orbit trail) makes a world read as a planet, and as
  _which_ planet? Give expressions. Same for the stars of the three-body
  orbit and the pulsar's star.
- **The spinning cylinder**: solid, visibly rotating (stripes, a marker,
  arrows on its rim), with the stagnation points and the lift visible.
- **Charges and magnets**: what the textbooks and PhET simulations use, and
  how close we can get.
- For each space preset, the reference image you are matching (NASA, ESA,
  EHT, textbook), and the specific changes that would bring ours closer.

### 6.4 New fields worth adding for AP Physics 1 and 2

Rank by teaching value per hour of work. For each, the field, its
variables, the drawing, and the concept it shows. Candidates we have
thought of (add your own, and drop any that do not earn their place):
equipotentials and E = −∇V on a potential landscape (V as a 3D surface);
a charge in a uniform field; a conductor in a field (method of images); a
current loop and a solenoid (closed forms or good approximations); Faraday
induction with a changing B; the two-source interference pattern (ripple
tank, double slit) as a field or a scalar; continuity in a narrowing pipe
(AP Physics 1 fluids); buoyancy and pressure with depth; gravitational
field of a planet, inside and outside (shell theorem); orbits and escape.

### 6.5 Validation

For every formula: a check we can run — a value at a point, a symmetry, a
conservation law (∇·B = 0, ∇×E = 0 for statics, flux), a limit (far field
of the capacitor, the cylinder's stagnation points at
sin θ = −w R/(2U)). Say what you checked, and how. **A demonstrated result
beats a cited one; say plainly what you did not verify.**

---

## 7. Form of the answer

1. A ranked plan: which presets to fix or add, in what order, with a rough
   cost each.
2. Per preset: §6.1's five parts, with all LaTeX ready to paste, written
   in Desmos's format, using only what §2 allows. Where our compiler would
   refuse something, say so and give the workaround.
3. §6.2's field-line-density answer, with the math.
4. §6.3's look designs, with expressions.
5. A short list of the infrastructure additions you assumed (we expect only
   "a preset can add Desmos expressions"), each named precisely.
6. Everything you could not verify, listed.

---

## Attached

- **This brief.**
- **Pictures**: `flow-presets.png`, `flow-presets-2d.png`,
  `preset-closeups.png`, `preset-variables.png` (all in
  `docs/assets/vector-3d/`).
- **The presets**: `src/field-rendering/gallery/types.ts`, `physics.ts`,
  `fields.ts`, `space.ts`, `fluids.ts`, `chaos.ts`, `latex.ts`.
- **The compiler**: `src/field-rendering/latexToGLSL.ts`.
- **The renderers** (for exact behaviour): `src/field-rendering/FlowRenderer.ts`
  (2D flow), `Flow3DRenderer.ts` (3D flow), `palettes.ts`.
- **Background**: `docs/VECTOR_TOOLS_BRIEFING.md`,
  `docs/VECTOR_TOOLS_ARCHITECTURE.md`.
