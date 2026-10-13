/**
 * What each preset is for: the one thing someone should be able to say after
 * watching it. A picture nobody can take anything from is decoration, so
 * every preset has one, and the presets window shows it above the colour
 * legend while the preset is loaded.
 *
 * Written for an AP student: one idea, in plain words, with the law or
 * equation that states it where there is one. Each is true of the field as
 * drawn, not only of the textbook ideal behind it.
 */
export const TAKEAWAYS: Readonly<Record<string, string>> = {
  "black-hole":
    "Orbits are faster further in (v ∝ 1/√r), and inside the innermost stable orbit no circular orbit survives: the gas stops circling and plunges in.",
  "spiral-galaxy":
    "Outer stars orbit about as fast as inner ones. Visible matter alone would make them slower further out, which is the evidence for dark matter. The arms are a pattern that stars pass through, not fixed groups of stars.",
  aurora:
    "Charged particles follow magnetic field lines down into the atmosphere, and the curtain glows where they stop, at its sharp lower edge.",
  pulsar:
    "A pulse is a beam sweeping past, like a lighthouse's: the magnetic axis is tilted from the spin axis, so each turn of the star swings the beam round once.",
  "star-cluster":
    "Three equal masses can share one closed orbit and stay on it: a rare, stable answer to the three-body problem, where most starting points give chaos.",
  "three-body-crash":
    "Most three-body systems are unstable: a 12% nudge breaks up a perfect triangle. In the crash momentum is conserved and kinetic energy is not; the stars stick together, a perfectly inelastic collision.",
  pythagorean:
    "With no outside force the centre of mass never moves. Bodies let go from rest fall together towards it, and that is where everything ends up.",
  binary:
    "Both bodies orbit their common centre of mass, the lighter one on the larger ellipse, and both move fastest when they are closest together.",
  "solar-wind":
    "The wind blows straight out, yet the field it carries winds into a spiral, because the Sun turns underneath while the wind travels, like water from a spinning sprinkler.",
  cellular:
    "Neighbouring vortices spin opposite ways, so where two meet the fluid moves the same way, and the cells shear against each other.",
  tornado:
    "Air drawn inward spins faster as it closes on the core, conserving angular momentum like a skater pulling in their arms, until the core turns as a solid.",
  "smoke-ring":
    "A vortex ring carries its own fluid: the smoke inside turns over and over and travels with the ring, while the air outside only parts and closes behind it.",
  karman:
    "A steady stream past a cylinder leaves an unsteady wake, with vortices shed alternately from each side. That is why wires hum and chimneys sway in the wind.",
  lorenz:
    "Deterministic is not predictable: two starts closer than any measurement could tell apart soon separate completely, yet both stay on the same butterfly.",
  thomas:
    "A smooth flow in a plane cannot be chaotic, so in 2D this one settles into regular spirals. Chaos needs a third dimension, as its 3D form shows.",
  charges:
    "Field lines start on positive charge and end on negative, and the field at any point is the vector sum of each charge's own field (superposition).",
  wires:
    "Parallel currents attract and opposite currents repel: each wire sits in the other's circling magnetic field, and F = IL × B points towards it or away.",
  "earth-moon":
    "Gravity adds as vectors: between Earth and Moon their pulls cancel at one point, much nearer the Moon, because the Moon's mass is so much smaller.",
  cylinder:
    "Spin makes the flow faster on one side of the cylinder, so the pressure there is lower (Bernoulli), and the difference pushes it sideways: the Magnus lift that curves a spinning ball.",
  capacitor:
    "Between oppositely charged plates the field is nearly uniform and outside it nearly cancels, so the voltage across is field times distance, ΔV = Ed.",
  "bar-magnet":
    "Outside the magnet, field lines leave the north pole and enter the south, and they close into loops through it: there is no magnetic charge for them to start or end on.",
  dipole:
    "A dipole's field fades as 1/r³, faster than a single pole's 1/r², because far away the fields of its two opposite ends almost cancel.",
  "shell-theorem":
    "A uniform shell pulls on anything outside it as if all its mass were at its centre, and exerts no net force at all on anything inside it.",
  "uniform-field":
    "Between parallel plates E is the same everywhere, so a charge feels the same force at every point, and the potential drops steadily across the gap, ΔV = Ed.",
  "ap-projectile":
    "Horizontal velocity never changes, and vertical velocity changes by g every second, even at the top, where it is zero and the acceleration is still g downward.",
  "ap-shm":
    "Energy passes back and forth between kinetic and potential with the total fixed, so the state goes round a closed loop; the period, T = 2π√(m/k), does not depend on the amplitude.",
  "ap-circular":
    "Moving in a circle at constant speed is still accelerating: velocity is along the circle, and acceleration points to the centre, a = v²/r.",
  "ap-nozzle":
    "What flows in must flow out, A₁v₁ = A₂v₂: where the tube narrows the fluid speeds up, and where it is faster its pressure is lower (Bernoulli).",
  "ap-conductor":
    "In a conductor at equilibrium E = 0 inside: charge moves to the surface until it is, and the field outside meets the surface at right angles.",
  "ap-induction":
    "A changing magnetic flux makes a circulating electric field (Faraday's law). It is strongest when B changes fastest, not when B is largest.",
  "ap-motion-graphs":
    "The slope of x(t) is v(t), and the slope of v(t) is a(t): the object can stop and turn round while its acceleration stays exactly the same.",
  "ap-pendulum-phase":
    "Small swings are simple harmonic, but larger ones take longer, and beyond the separatrix the pendulum goes over the top instead of swinging back.",
  "ap-kepler-areas":
    "A planet sweeps equal areas in equal times, because its angular momentum is conserved, so it moves fastest when it is closest to the Sun.",
  "ap-gauss-flux":
    "The flux through a closed surface depends only on the charge inside it, Φ = Q_enc/ε₀: reshaping the surface, or moving charges outside it, changes nothing.",
  "ap-ampere-loop":
    "The circulation of B around a closed loop depends only on the current passing through it, ∮B·dl = μ₀I_enc, whatever the loop's shape.",
  "ap-incline-forces":
    "Static friction is only as large as it needs to be, up to μsN. Once tan θ passes μs the block slides, and friction becomes kinetic, μkN.",
};
