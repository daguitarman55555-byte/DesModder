/**
 * What each preset slider is, said in a sentence, for the presets window to
 * show when its name is hovered (Rafael, 2026-11-08: "when you hover over a
 * variable name … it should tell you what it is").
 *
 * And which sliders are a position: an object's x, y and z, which the window
 * folds behind one "position" link rather than listing as three sliders.
 */

const SUB = /^(?:\\)?([A-Za-z]+)_\{([^}]*)\}$/;

const AXIS_WORD: Record<string, string> = { x: "x", y: "y", z: "z" };

/** A preset's own meanings, where a letter means something particular. */
const BY_PRESET: Record<string, Record<string, string>> = {
  "bar-magnet": {
    a: "Half the magnet's length, along x.",
    b: "Half the magnet's width, along y.",
    c: "Half the magnet's depth, along z.",
    p: "The magnet's pole strength: how strong its field is.",
  },
  dipole: {
    m: "The dipole moment: the field's strength and, by its sign, which way the dipole points.",
  },
  "ap-conductor": {
    E: "The uniform field far from the conductor, before the conductor bends it.",
    R: "The conducting sphere's radius.",
  },
  "ap-gauss-flux": {
    "R_{g}": "The Gaussian sphere's radius.",
    "N_{g}":
      "How many points on the sphere the flux sum adds up: more is closer to the exact integral.",
    "\\alpha_{g}":
      "Where the sample point sits round the sphere: its longitude.",
    "\\beta_{g}":
      "Where the sample point sits round the sphere: its angle down from the top.",
  },
};

/** One sentence on what slider `name` of preset `presetId` is. */
export function variableAbout(
  presetId: string,
  name: string,
  toggle?: string
): string {
  if (toggle !== undefined) return `Shows or hides ${toggle.toLowerCase()}.`;
  const own = BY_PRESET[presetId]?.[name];
  if (own !== undefined) return own;
  if (name === "N_{q}")
    return "How many charges are in the picture, from 1 to 10.";
  if (name === "q_{0}")
    return "The test charge the force arrow is drawn for: the force on it is q₀E.";
  if (name === "T_{scene}")
    return "The scene's clock, in seconds: where the bodies are along their paths.";
  if (name === "s_{arrow}" || name === "s_{gain}")
    return "How long the probe's arrows are drawn per unit of field. It changes the drawing, not the field.";
  const match = SUB.exec(name);
  if (match !== null) {
    const [, base, sub] = match;
    if (base === "q" && /^\d+$/.test(sub))
      return `Charge ${sub}'s strength (k = 1): positive is red and pushes the field out, negative is blue and pulls it in.`;
    const charge = /^q(\d+)$/.exec(sub);
    if (charge !== null && "XYZ".includes(base))
      return `Where charge ${charge[1]} is: its ${base.toLowerCase()} coordinate.`;
    if (base === "p" && AXIS_WORD[sub] !== undefined)
      return `The probe, where the field is read and its arrow drawn: its ${sub} coordinate.`;
    if (base === "C" && /^g[xyz]$/.test(sub))
      return `The Gaussian sphere's centre: its ${sub[1]} coordinate.`;
  }
  return `A number the field is written in; the field reads it as ${name}.`;
}

/** One coordinate of something placed: whose, and which axis. */
export interface PositionAxis {
  owner: string;
  axis: "x" | "y" | "z";
}

/**
 * Whether slider `name` is a coordinate of something placed on the graph,
 * and of what: X_{q1} is charge q_{1}'s x, p_{y} is the probe p's y, C_{gz}
 * is the Gaussian sphere's z.
 */
export function positionAxis(name: string): PositionAxis | undefined {
  const match = SUB.exec(name);
  if (match === null) return undefined;
  const [, base, sub] = match;
  const charge = /^q(\d+)$/.exec(sub);
  if (charge !== null && "XYZ".includes(base) && base.length === 1)
    return {
      owner: `q_{${charge[1]}}`,
      axis: base.toLowerCase() as PositionAxis["axis"],
    };
  if (base === "p" && /^[xyz]$/.test(sub))
    return { owner: "p", axis: sub as PositionAxis["axis"] };
  if (base === "C" && /^g[xyz]$/.test(sub))
    return { owner: "C_{g}", axis: sub[1] as PositionAxis["axis"] };
  return undefined;
}

/** What a position's owner is called in its popup's title and tooltip. */
export function ownerAbout(owner: string) {
  if (owner === "p") return "The probe";
  if (owner === "C_{g}") return "The Gaussian sphere's centre";
  const charge = /^q_\{(\d+)\}$/.exec(owner);
  if (charge !== null) return `Charge ${charge[1]}`;
  return owner;
}
