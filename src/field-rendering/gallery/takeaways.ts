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
  pulsar:
    "A pulse is a beam sweeping past, like a lighthouse's: the magnetic axis is tilted from the spin axis, so each turn of the star swings the beam round once.",
  "three-body-crash":
    "Most three-body systems are unstable: a 12% nudge breaks up a perfect triangle. In the crash momentum is conserved and kinetic energy is not; the stars stick together, a perfectly inelastic collision.",
  binary:
    "Both bodies orbit their common centre of mass, the lighter one on the larger ellipse, and both move fastest when they are closest together.",
  cellular:
    "Neighbouring vortices spin opposite ways, so where two meet the fluid moves the same way, and the cells shear against each other.",
  tornado:
    "Air drawn inward spins faster as it closes on the core, conserving angular momentum like a skater pulling in their arms, until the core turns as a solid.",
  karman:
    "A steady stream past a cylinder leaves an unsteady wake, with vortices shed alternately from each side. That is why wires hum and chimneys sway in the wind.",
  lorenz:
    "Deterministic is not predictable: two starts closer than any measurement could tell apart soon separate completely, yet both stay on the same butterfly.",
  thomas:
    "A smooth flow in a plane cannot be chaotic, so in 2D this one settles into regular spirals. Chaos needs a third dimension, as its 3D form shows.",
  charges:
    "Field lines start on positive charge and end on negative, and the field at any point is the vector sum of each charge's own field (superposition).",
  "bar-magnet":
    "Outside the magnet, field lines leave the north pole and enter the south, and they close into loops through it: there is no magnetic charge for them to start or end on.",
  dipole:
    "A dipole's field fades as 1/r³, faster than a single pole's 1/r², because far away the fields of its two opposite ends almost cancel.",
  "ap-conductor":
    "In a conductor at equilibrium E = 0 inside: charge moves to the surface until it is, and the field outside meets the surface at right angles.",
  "ap-gauss-flux":
    "The flux through a closed surface depends only on the charge inside it, Φ = Q_enc/ε₀: reshaping the surface, or moving charges outside it, changes nothing.",
};
