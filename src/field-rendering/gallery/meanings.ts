/**
 * What every preset's colour means, for the legend in the presets window.
 *
 * A colour on a field is a claim about it. Most presets colour by how fast
 * the flow goes, which is a real quantity, but only if someone says which
 * one: the gas falling into a black hole, the stars in a galaxy. The physics
 * presets colour by a quantity a class learns — a potential, a field's
 * strength, a pressure — and say so. Kept in one table so a preset can't be
 * added without a line here: the gallery test checks every preset has one.
 */
import type { ColorMeaning } from "./types";

const speed = (of: string): ColorMeaning => ({
  quantity: `Speed of ${of}`,
  low: "slow",
  high: "fast",
});

export const COLOR_MEANINGS: Readonly<Record<string, ColorMeaning>> = {
  "black-hole": {
    quantity: "Speed of the falling gas",
    low: "slow, far out",
    high: "fastest, and hottest, near the horizon",
  },
  pulsar: speed("the plasma streaming off the star"),
  "three-body-crash": speed("the gas each star carries"),
  binary: speed("the gas the two planets carry"),
  cellular: {
    quantity: "Spin of the fluid (vorticity)",
    low: "turning clockwise",
    zero: "not turning",
    high: "turning counter-clockwise",
  },
  tornado: speed("the air"),
  karman: speed("the water past the cylinder"),
  lorenz: speed("the state round the attractor"),
  thomas: speed("the state round the attractor"),
  charges: {
    quantity: "Electric potential V",
    low: "negative, near −",
    zero: "V = 0",
    high: "positive, near +",
  },
  "bar-magnet": {
    quantity: "Magnetic field strength |B|",
    low: "weak",
    high: "strong, at the poles",
    half: "upper",
  },
  dipole: {
    quantity: "Magnetic scalar potential",
    low: "negative, south of the dipole",
    zero: "zero, across its middle",
    high: "positive, north of it",
  },
};
