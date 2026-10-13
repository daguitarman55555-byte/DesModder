# PhET against AP Physics 1, 2 and C: what to take, what to beat

October 2026. All 112 simulations on PhET's physics shelf were checked (73 HTML5, 39 Java or Flash), from the live catalogue at phet.colorado.edu. Each was placed against the AP Physics 1 and 2 CEDs (units 1–15) and AP Physics C (Mechanics and E&M). There is no AP Physics 3; "C" is the calculus-based pair.

This is a survey of what PhET teaches and how, from the catalogue and its descriptions and from knowing the simulations. It is not a run-through of every screen of every one. Before building anything taken from one, open that simulation and check what it does now.

## The short version

PhET is very good at three things:

- **One idea per screen, with an intro screen and then a lab screen.**
- **Measuring tools you drag onto the picture:** tape measure, stopwatch, voltmeter, E-field sensor.
- **Energy and graphs kept in step with the motion.**

It is weak where we are strong:

- Its fields are drawn on a coarse grid of arrows or a few lines.
- Nothing is 3D.
- Nothing is editable as a formula.
- Nothing can be changed into a new problem.
- Its looks are flat cartoons.

So the work is to take its teaching moves into Desmos, where every quantity is a slider and an equation the teacher can see and edit:

- the measuring tools;
- the synced energy bars;
- the graphs drawn as the thing moves;
- slow motion and stepping;
- an intro version with fewer controls.

The flows, the exact fields, 3D and Majestic are what we already do better.

## What to take from PhET in general

These are patterns across many simulations, worth building once and using everywhere.

| PhET pattern                                                                  | Where it is                                              | What it would be here                                                                                                                                                                           | Cost   |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Drag-on measuring tools:** tape measure, stopwatch, field sensor, voltmeter | Charges and Fields, Projectile Motion, CCK, Pendulum Lab | The probe already reads the field at a point. Add a tape measure (two draggable points and the distance between them) and a stopwatch tied to the scene clock. In Explanatory only.             | Small  |
| **Energy bar or pie charts in step with the motion**                          | Energy Skate Park, Masses and Springs, Pendulum Lab      | Native Desmos bars (rectangles whose heights are KE, U and total) beside the scene, for the projectile, oscillator and circular motion. Total stays flat, so conservation is something you see. | Small  |
| **Slow motion and single-step**                                               | Almost every mechanics sim                               | Moving / Still exists. Add a ×¼ speed and a step button to the clock. The time speed is already a setting, so this is mostly controls.                                                          | Small  |
| **Graphs drawn as it moves**                                                  | The Moving Man, Collision Lab, Calculus Grapher          | x(t), v(t) and a(t) traced live from the scene clock, as Desmos curves with a domain up to T. This is the AP Physics 1 unit 1 demo GPT ranked 7th.                                              | Small  |
| **Intro screen, then lab screen**                                             | Most HTML5 sims                                          | Our Explanatory has every switch at once. A preset could have a "fewer controls" first state: the switches start off and are revealed one at a time.                                            | Medium |
| **Values shown on the picture**                                               | Vector Addition, Forces and Motion                       | Probe arrow names exist. Add an optional number beside each arrow (\|E\| = 2.3 N/C) in Explanatory.                                                                                             | Small  |
| **Sonification and accessible description**                                   | Newer HTML5 sims                                         | Out of scope now; Audio Lab is where sound would live.                                                                                                                                          | Later  |

## The simulations, by course

Key:

- **Take:** what PhET does that we should copy.
- **Beat:** what we can do that it cannot.
- **Home:**
  - VT preset is a Vector Tools preset;
  - PL is Physics Lab;
  - AL is Audio Lab;
  - C1–C5 are GPT's shared capabilities (`docs/research/vector-tools-ap-roadmap/answers.md`).
- **Have:** what we already ship that covers it.

### AP Physics 1

#### Unit 1: Kinematics

- **Projectile Motion**
  - Take: target practice, air resistance, mass and diameter, height and range readouts.
  - Beat: drag as an exact velocity-dependent field (Physics C), and the projectile family flow.
  - Home: VT preset. Have: Projectile.
- **Projectile Data Lab**
  - Take: many launches, with histograms of range.
  - Beat: launch spread as a seed of the flow.
  - Home: PL or C5.
- **The Moving Man** (Java)
  - Take: x, v and a graphs locked to the motion.
  - Beat: the same graphs as Desmos curves you can edit, with reference frames.
  - Home: VT preset (GPT idea 7).
- **Ladybug Motion 2D** (Java)
  - Take: v and a vectors on a body moving in 2D, including circular.
  - Beat: our circular motion with the body's v and a.
  - Home: VT. Have: Circular motion.
- **Motion in 2D** (Java)
  - Take: the same, simpler.
  - Home: covered.
- **Vector Addition**
  - Take: tip-to-tail and component views.
  - Beat: the 3D vector tools already do this in Desmos.
  - Home: Vector Tools core.
- **Calculus Grapher**
  - Take: a function, its derivative and its integral linked.
  - Beat: Desmos does this natively. Use for Physics C kinematics.
  - Home: PL.
- **Maze Game** (Java)
  - Take: steering with acceleration.
  - Home: low value.

#### Unit 2: Force and translational dynamics

- **Forces and Motion: Basics** and **Forces and Motion** (Java)
  - Take: friction and applied force with live force arrows and a speedometer.
  - Beat: free-body diagram arrows on a Desmos body, with the static-friction threshold.
  - Home: VT (GPT idea 8).
- **Ramp: Forces and Motion** and **The Ramp** (Java)
  - Take: the incline with its free-body diagram, and work and energy charts.
  - Beat: the same with editable angle and μ, and energy bars.
  - Home: VT (GPT idea 8).
- **Friction**
  - Take: microscopic picture of friction heating.
  - Home: low value.
- **Forces in 1 Dimension** (Java)
  - Take: force and position graphs.
  - Home: covered by idea 8.
- **Gravity Force Lab** and **Gravity Force Lab: Basics**
  - Take: two masses with the force readout, the "equal and opposite" arrows.
  - Beat: exact gravity field between them, 3D.
  - Home: VT. Have: Earth and Moon.
- **Gravity and Orbits**
  - Take: orbit with velocity and gravity vectors, and "turn gravity off".
  - Beat: our orbit presets, with probe arrows.
  - Home: VT. Have: Planets, figure-8.
- **My Solar System**
  - Take: n-body editor with traces.
  - Beat: orbit presets. An editable n-body needs C1.
  - Home: C1.
- **Kepler's Laws**
  - Take: equal areas swept, the period–axis graph.
  - Beat: equal-area wedges as Desmos regions on our orbit. Small and very AP.
  - Home: VT, new.
- **Lunar Lander** (Flash)
  - Take: thrust against gravity.
  - Home: low value.

#### Unit 3: Work, energy and power

- **Energy Skate Park** and **Energy Skate Park: Basics**
  - Take: the best-known PhET: draw a track, energy bars and pie, friction to thermal.
  - Beat: the track as a Desmos curve the student types, the skater's motion exact on it, and the energy bars. Strong candidate.
  - Home: VT, new, with C1 for a general track.
- **Energy Forms and Changes**
  - Take: energy transfer chains.
  - Home: low value for AP.

#### Unit 4: Linear momentum

- **Collision Lab**
  - Take: elasticity slider, centre-of-mass marker, momenta as vectors, 2D collisions.
  - Beat: exact 1D collision with its momentum and kinetic-energy bars; the centre of mass moving steadily through it.
  - Home: VT (GPT idea 10). General needs C1.

#### Units 5 and 6: Torque and rotation

- **Torque** (Java)
  - Take: force on a rotating platform, torque and angular momentum readouts.
  - Beat: lever arm drawn, torque coloured by sign.
  - Home: VT (GPT idea 11).
- **Ladybug Revolution** (Java)
  - Take: rotation with ω, α and the linear speed of points at different radii.
  - Beat: our circular motion's rigid rotation already colours speed by radius.
  - Home: VT. Have.
- **Balancing Act**
  - Take: torque balance with masses on a beam.
  - Beat: the same with exact torques, and the beam tipping when unbalanced.
  - Home: VT (idea 11).

#### Unit 7: Oscillations

- **Masses and Springs** and **Masses and Springs: Basics**
  - Take: spring with energy bars, damping, period readout.
  - Beat: our phase portrait plus a physical spring drawn beside it, moving in step.
  - Home: VT. Have: Oscillator, which needs the spring and the energy bars.
- **Pendulum Lab**
  - Take: two pendulums, period timer, energy, large angles.
  - Beat: the pendulum's exact phase portrait, separatrix included, where large angle stops being simple harmonic. Very good on the dark.
  - Home: VT, new.
- **Hooke's Law**
  - Take: springs in series and parallel.
  - Home: small.
- **Resonance** (Flash)
  - Take: driven oscillators at different natural frequencies.
  - Beat: resonance curve in Desmos.
  - Home: PL.
- **Normal Modes**
  - Take: coupled masses' modes.
  - Home: Physics C or beyond.

#### Unit 8: Fluids

- **Fluid Pressure and Flow** (Java)
  - Take: pipe of changing width with flux meter, pressure gauge, dots moving faster in the narrow part.
  - Beat: exactly our streamtube, with a pressure probe added.
  - Home: VT. Have: Continuity and Bernoulli; add a pressure readout.
- **Under Pressure**
  - Take: pressure against depth, with gauges.
  - Beat: GPT idea 14, pressure-coloured tank.
  - Home: VT, new.
- **Buoyancy**, **Buoyancy: Basics**, and **Balloons & Buoyancy** (Java)
  - Take: blocks of different density, force arrows, displaced-volume readout.
  - Beat: buoyant force as pressure integrated over the surface, which is the real explanation.
  - Home: VT (idea 14).
- **Density**
  - Take: mass and volume.
  - Home: low value.

### AP Physics 2

#### Unit 9: Thermodynamics

- **Gas Properties**, **Gases Intro** and **Diffusion**
  - Take: particles in a box, with P, V and T controls and gauges; speed histogram.
  - Beat: the kinetic-theory particles are a real fit for our GPU particles: thousands of them, coloured by speed, with the Maxwell distribution beside. A P–V diagram traced live.
  - Home: VT or a new GPU mode (GPT idea 15).
- **States of Matter** and **Atomic Interactions**
  - Take: potential well between atoms.
  - Home: low value for AP.
- **Energy Forms and Changes**
  - Take: heat flow between objects.
  - Home: GPT idea 16.

#### Unit 10: Electric force, field and potential

- **Charges and Fields**
  - Take: place charges freely, E-field sensor, equipotential pencil, voltmeter.
  - Beat: our charges: exact field, flow, equipotentials, 3D, Majestic. Add a free "drop another charge" and an equipotential pen (click to draw the V = const curve through a point).
  - Home: VT. Have: Electric charges.
- **Coulomb's Law**
  - Take: the force between two charges with a ruler.
  - Home: covered by charges.
- **Electric Field Hockey** (Java)
  - Take: place charges to steer a puck through a maze.
  - Beat: this is a game, and would be good in Majestic. It needs C1 (the puck moves under the force).
  - Home: C1.
- **Electric Field of Dreams** (Java)
  - Take: field from movable charges.
  - Home: covered.
- **Balloons and Static Electricity**, and **John Travoltage**
  - Take: charging by contact and induction.
  - Home: low value for AP.
- **Capacitor Lab** (Java) and **Capacitor Lab: Basics**
  - Take: plate area, separation, dielectric, with C, Q, U and field readouts.
  - Beat: our capacitor with a dielectric slab and readouts.
  - Home: VT. Have; add the dielectric.

#### Unit 11: Circuits

- **Circuit Construction Kit: DC** (and its Virtual Lab)
  - Take: build any circuit, with electrons flowing and meters.
  - Beat: GPT's idea 18. Needs C2, a circuit solver. Majestic: conductors coloured by potential, current as a flow, which shows current is not used up.
  - Home: C2.
- **Circuit Construction Kit: AC**
  - Take: AC, inductors, capacitors.
  - Home: C2 (Physics C).
- **Ohm's Law** and **Resistance in a Wire**
  - Take: equation letters that grow and shrink.
  - Beat: Desmos sliders do this.
  - Home: low value.
- **Battery-Resistor Circuit**, **Battery Voltage**, **Signal Circuit** and **Conductivity** (Java)
  - Take: microscopic picture of current.
  - Home: low value.

#### Unit 12: Magnetism and electromagnetism

- **Faraday's Electromagnetic Lab** (2024 HTML5 port), **Magnets and Electromagnets** and **Magnet and Compass**
  - Take: bar magnet field with compass grid, electromagnet, pickup coil with bulb, transformer, generator.
  - Beat:
    - our bar magnet and wires;
    - induction (just built);
    - a moving magnet through a coil with flux and emf graphs, a natural extension of the induction preset.
  - Home: VT. Have most; add the moving magnet.
- **Faraday's Law**
  - Take: push a magnet through a coil and see the bulb and voltmeter.
  - Beat: the same extension.
  - Home: VT.
- **Generator**
  - Take: rotating coil.
  - Beat: rotating loop with flux and emf graphs (AP Physics 2, and AC for Physics C).
  - Home: VT, new.
- **Simplified MRI** (Java)
  - Home: beyond AP.

#### Unit 13: Geometric optics

- **Bending Light**
  - Take: refraction, total internal reflection, prism, intensity readouts, wave view.
  - Beat: GPT idea 21. A single interface fits in native Desmos now; general optics needs C3.
  - Home: VT or C3.
- **Geometric Optics** and **Geometric Optics: Basics**
  - Take: lenses and mirrors with principal rays and virtual images.
  - Beat: GPT idea 22.
  - Home: C3.
- **Color Vision**
  - Home: low value for AP.

#### Unit 14: Waves, sound and physical optics

- **Wave Interference**
  - Take: two sources, slits, intensity screen, water, sound and light.
  - Beat: GPT idea 25. Needs C4 for a wave field rather than particles. Majestic interference would be striking.
  - Home: C4.
- **Waves Intro** and **Wave on a String**
  - Take: pulse, oscillator, fixed or loose end, damping, tension.
  - Beat: standing waves (GPT idea 23) with nodes marked.
  - Home: VT, native curves.
- **Sound Waves**
  - Take: pressure waves, the Doppler screen.
  - Beat: GPT idea 24; Audio Lab for real sound.
  - Home: AL or C4.
- **Fourier: Making Waves**
  - Take: harmonics summed.
  - Beat: Audio Lab already analyses spectra.
  - Home: AL.
- **Radio Waves & Electromagnetic Fields** (Java), **Radiating Charge** (Flash) and **Microwaves** (Java)
  - Take: the field kink from an accelerated charge.
  - Beat: a beautiful Majestic piece. Beyond AP 2, near Physics C.
  - Home: C4, later.

#### Unit 15: Modern physics

- **Photoelectric Effect** (Java)
  - Take: frequency against intensity, stopping voltage, current graph.
  - Beat: GPT idea 27.
  - Home: VT with C5.
- **Models of the Hydrogen Atom** and **Neon Lights & Other Discharge Lamps** (Java)
  - Take: energy levels and spectra.
  - Beat: transitions as emission lines.
  - Home: PL or VT, small.
- **Blackbody Spectrum**
  - Take: the Planck curve against T.
  - Beat: native Desmos.
  - Home: PL, small.
- **Alpha Decay**, **Beta Decay**, **Build a Nucleus**, **Radioactive Dating Game** (Java) and **Nuclear Fission** (Java)
  - Take: half-life with many nuclei, decay chains.
  - Beat: GPT idea 28.
  - Home: C5.
- **Rutherford Scattering**
  - Take: alpha particles deflected by a nucleus.
  - Beat: exact hyperbolic Coulomb trajectories as a flow. A family of trajectories, as with the projectile, would work here.
  - Home: VT, new.
- **Quantum Wave Interference**, **Davisson-Germer** (Java), **Quantum Measurement** and **Quantum Coin Toss**
  - Take: matter waves.
  - Home: mostly beyond AP 2, apart from de Broglie wavelength.
- **Lasers**, **Stern-Gerlach**, **Quantum Tunneling**, **Quantum Bound States**, **Band Structure**, **Double Wells**, **Semiconductors** and **Optical Quantum Control** (Java or Flash)
  - Home: beyond AP.

### AP Physics C (calculus-based)

Most of PhET's catalogue is algebra-level. What Physics C adds, and where it fits:

- **Mechanics:**
  - **Velocity-dependent drag**, with terminal velocity. Projectile Motion has air resistance but no calculus.
    - Beat: drag field plus exact solutions.
    - Home: VT and PL.
  - **Rotational inertia by integration.**
    - Home: PL.
  - **Gravitation and orbits with energy.** We have these.
- **E&M:**
  - **Gauss's law.** PhET has nothing.
    - Beat: flux through a draggable Gaussian sphere or cylinder around our charges, with the enclosed charge counted. Our 3D is made for this.
    - Home: VT, new, strong.
  - **Ampère's law.**
    - Beat: our wires with a circulation loop, ∮B·dl against the enclosed current.
    - Home: VT, new.
  - **RC, RL and LC circuits.**
    - Home: C2, or fixed templates now.
  - **Induction with calculus.** Our induction preset is already the integral form.
  - **Displacement current.**
    - Home: later.

## Ranked: what to build from this

Each is ranked by AP value against cost, with what PhET has that we lack in brackets.

| Rank | Build                                                                                                           | Course   | Cost        |
| ---: | --------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
|    1 | **Energy bars**, synced, for projectile, oscillator and circular motion [Energy Skate Park, Masses and Springs] | AP 1     | Small       |
|    2 | **Live x(t), v(t), a(t) graphs** from the scene clock [Moving Man]                                              | AP 1     | Small       |
|    3 | **Clock: slow motion and single step** [every mechanics sim]                                                    | all      | Small       |
|    4 | **Pendulum phase portrait** with separatrix, plus a physical pendulum [Pendulum Lab]                            | AP 1 / C | Small       |
|    5 | **Kepler's equal areas** on our orbits [Kepler's Laws]                                                          | AP 1     | Small       |
|    6 | **Gauss's law** with a draggable Gaussian surface in 3D [none]                                                  | C        | Medium      |
|    7 | **Ampère's law** loop around our wires [none]                                                                   | C        | Medium      |
|    8 | **Incline free-body diagram** with the friction threshold [Ramp, Forces and Motion]                             | AP 1     | Small       |
|    9 | **Measuring tools:** tape measure and stopwatch [many]                                                          | all      | Small       |
|   10 | **Moving magnet through a coil**, flux and emf graphs [Faraday's Law]                                           | AP 2     | Medium      |
|   11 | **Kinetic gas:** GPU particles with a speed histogram and P–V trace [Gas Properties]                            | AP 2     | Medium      |
|   12 | **Energy Skate Park in Desmos:** a typed track [Energy Skate Park]                                              | AP 1     | Medium + C1 |
|   13 | **Circuits** [CCK]                                                                                              | AP 2 / C | C2          |
|   14 | **Optics bench** [Bending Light, Geometric Optics]                                                              | AP 2     | C3          |
|   15 | **Interference field** [Wave Interference]                                                                      | AP 2     | C4          |

Ranks 1–3 improve the six presets just built. Ranks 4–9 are new presets that fit what exists. From 10 on, they need new machinery.
