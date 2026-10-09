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
  "spiral-galaxy": speed("the stars and gas round the centre"),
  aurora: speed("the charged particles along the field"),
  pulsar: speed("the plasma streaming off the star"),
  "star-cluster": speed("the gas each star carries"),
  binary: speed("the gas the two planets carry"),
  "solar-wind": speed("the solar wind"),
  cellular: {
    quantity: "Spin of the fluid (vorticity)",
    low: "turning clockwise",
    zero: "not turning",
    high: "turning counter-clockwise",
  },
  tornado: speed("the air"),
  "smoke-ring": speed("the air carried by the ring"),
  karman: speed("the water past the cylinder"),
  lorenz: speed("the state round the attractor"),
  thomas: speed("the state round the attractor"),
  charges: {
    quantity: "Electric potential V",
    low: "negative, near −",
    zero: "V = 0",
    high: "positive, near +",
  },
  wires: {
    quantity: "Magnetic field strength |B|",
    low: "weak",
    high: "strong, near a wire",
    half: "upper",
  },
  "earth-moon": {
    quantity: "Gravitational potential",
    low: "deepest, near the masses",
    high: "zero, far away",
    half: "lower",
  },
  cylinder: {
    quantity: "Pressure (Bernoulli)",
    low: "lower than the stream's",
    zero: "the stream's own",
    high: "higher than the stream's",
  },
  capacitor: {
    quantity: "Electric potential V",
    low: "negative, at the − plate",
    zero: "V = 0, midway",
    high: "positive, at the + plate",
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
  "shell-theorem": {
    quantity: "Gravitational potential",
    low: "deepest, inside and at the shell",
    high: "zero, far away",
    half: "lower",
  },
  "uniform-field": {
    quantity: "Electric potential V",
    low: "lower, towards the − plate",
    zero: "V = 0, at the middle",
    high: "higher, towards the + plate",
  },
};
