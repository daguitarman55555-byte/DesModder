# Vector Tools physics fields: second follow-up (C1–C5)

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

## C1. One clock, when the plugin owns the body positions

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

## C2. Collision-safe names that a class can read

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

## C3. The other five presets, complete

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

## C4. Random three-body, on our provider

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

## C5. Anything we got wrong

If anything in the three commits above conflicts with your physics, say so
specifically. For example, a figure-8 period, the Kepler sign convention, or
point-dipole seeding that misrepresents field density.

Please put everything in the same layout as last time:

- an `answers.md` that comes first;
- the files beside it;
- a verification ledger saying what was seen live and what was not.
