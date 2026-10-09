# Vector Tools: what else to build for AP Physics 1 and 2

You have repo access. Work on `daguitarman55555-byte/DesModder`, branch
`feature/vector-tools-foundation`, at commit **`71a48d97`** or later. That
commit holds the eight physics presets you designed last time:

- charges, wires, Earth–Moon, cylinder, capacitor, bar magnet and dipole;
- shell theorem and uniform field.

## The question

**Which topics in the current AP Physics 1 and AP Physics 2 Course and Exam
Descriptions would a teacher most want to demonstrate live in Desmos, with
what this extension can draw?** "Current" means the frameworks in force for
the 2025–26 and 2026–27 exam years. Use College Board's own CEDs as the
source of truth. Cite the unit, the topic numbers, and the learning
objectives or essential knowledge each demo serves.

Work through every unit of both courses. Don't stop at the field topics
we've done.

- **AP Physics 1:** kinematics; force and translational dynamics; work,
  energy and power; linear momentum; torque and rotational dynamics; energy
  and momentum of rotating systems; oscillations; fluids, if the current CED
  places them in AP 1.
- **AP Physics 2:** thermodynamics; electric force, field and potential;
  electric circuits; magnetism and electromagnetism; geometric optics; waves,
  sound and physical optics; modern physics, and whichever of fluids and
  thermodynamics the current CED keeps in AP 2.

Check the unit lists against the CED rather than this summary.

## What the extension can draw

Judge each idea against these. Read the code; the brief in
`docs/VECTOR_TOOLS_PHYSICS_FIELDS_FOLLOWUP_3.md` and your own last answers in
`docs/research/physics-fields-gpt/follow-up-3/` describe them.

- **Vector fields** in 2D and 3D, drawn as flowing particles on the GPU or as
  arrows, from any Desmos formula. They can be coloured by speed, by
  direction, or by any formula (`tint`).
- **Desmos objects** loaded with a preset: solids, curves, regions, exact
  contour lines, and a draggable probe with damped vector arrows and names.
  Names in 3D are drawn by the plugin; so is dragging in 3D.
- **Sliders and switches** in the presets window; a clock with Moving and
  Still; quantities that move with the clock, worked out on the CPU each
  frame (`ClockParameters`, as in the three-body and orbits).
- **The Fluid tab:** a real lattice-Boltzmann fluid simulation (see
  `src/field-rendering/sim/`), with walls drawn from the graph and a measured
  force on them.
- **Audio Lab**, a separate plugin, plays a field as sound. It is in scope
  for waves and sound if it helps.
- **Physics Lab**, another plugin, is in scope only as a neighbour. Say if an
  idea belongs there instead.

The limits, all measured:

- Desmos's own recompute must stay under about 150 ms per slider change.
- Desmos 3D draws no labels and cannot drag points.
- Implicit contour lists are expensive; one implicit curve such as
  `\sin(k\pi S)=0` is cheap.
- No text on the graph in Majestic mode (see below).

## Majestic and explanatory

We are adding a **demo mode** switch.

- **Majestic** is the field as a beautiful moving picture: a dark
  background, a glowing flow, few or no objects.
- **Explanatory** is the textbook figure: graph paper, the solids, exact
  lines, the probe and its arrows, colour by a quantity a class learns.

For each idea, say what each mode should show. In both modes, the flow's
colour must mean a physical quantity, and you must say which one.

## Deliverables

1. **A ranked table of 20–30 ideas across both courses.** For each idea give:
   - the CED unit, topics and learning objectives;
   - what the teacher shows, and the misconception it addresses;
   - what draws it: field preset, Desmos objects only, Fluid tab, Audio Lab,
     or a new capability;
   - the quantity its colour means;
   - what Majestic and Explanatory each show;
   - build cost: small, medium or large, or "needs a new capability";
   - classroom value: a judgement, said to be one.
2. **Complete designs for the top 6** that fit the current capabilities, in
   the shape of `src/field-rendering/gallery/physics-teaching.ts`:

   - exact formulas, variables and switches;
   - the Desmos scene;
   - the tint and palette;
   - the Majestic look: palette, particle settings, which objects stay.

   Run the same live checks as last time:

   - zero refused expressions;
   - recompute under 150 ms on your machine (report the machine);
   - screenshots of 2D and 3D in both modes;
   - the frame rate.

3. **For ideas that need a new capability** (for example, a moving test
   charge's trajectory, circuits, ray optics, wave interference with phase),
   describe the smallest capability that would unlock them and which ideas
   share it. Don't build these.
4. **A verification ledger:** what you saw live, what you checked against
   analytic results, and what you only checked structurally.

Deliver a zip with `answers.md` first, the code as a patch against the
commit you used, the screenshots, and the timing results. Run `npm run
test:unit` and report the result. Don't push.
