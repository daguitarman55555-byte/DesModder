# Vector Tools physics presets: bring the rest up to the charges' standard

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

## 1. How the charges preset is built — read this code first

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

## 2. What we learned live — your designs must respect these

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

## 3. What to produce, per preset (2D and 3D)

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

## 4. Then, new demos

From the list in your original report (§ "teacher demos") and anything better
you find, rank up to five new presets by value to an AP 1/2 teacher divided
by build cost. Examples: a uniform field and a moving test charge; the
potential landscape; the shell theorem; Faraday induction; a conducting
sphere in a uniform E.

For the top two, give the same full design as in §3.

## 5. Format

- A zip with `answers.md` first, then:
  - the TypeScript, one file per preset or one patch to `physics.ts`;
  - the screenshots;
  - the timing results;
  - a verification ledger: what you saw live, and what you only checked
    structurally.
- Build on the branch's real types and helpers; don't invent APIs. If one is
  missing, say exactly what it should be.
- Run `npm run test:unit` on your patch and report the result.
