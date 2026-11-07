/**
 * A preset's Desmos objects as the parts someone would name, to show or hide
 * one at a time: "the E arrow", "field lines", "the charges". An arrow is
 * three objects (shaft, head, name) and a charge three more (ball, signs),
 * and a list of their keys is not what anyone looks for.
 *
 * Grouped from the keys the presets already use, so no preset has to name
 * its parts twice; a key no rule knows gets its own part, named from the key.
 */
import type { SceneItem } from "./types";

export interface ScenePart {
  id: string;
  label: string;
  /** For an arrow: the vector's name, Desmos LaTeX such as `F_{net}`. */
  name?: string;
  /** The objects Desmos draws, shown and hidden through the graph. */
  keys: string[];
  /**
   * Names this plugin draws on Desmos 3D (`SceneItem.name3d`): their items
   * are hidden helpers, so hiding the part has to reach the overlay too.
   */
  names3d: string[];
}

/** Parts by the stem of their keys (the key up to its first digit). */
const NAMES: Readonly<Record<string, string>> = {
  trail: "Trails",
  path: "Whole paths",
  body: "Stars",
  crash: "Crash rings",
  crashLabel: "Crash labels",
  ball: "Charges",
  minus: "Charge signs",
  plus: "Charge signs",
  lines: "Field lines",
  fieldlines: "Field lines",
  axis: "Axis line",
  equipotentials: "Equipotentials",
  equi: "Equipotentials",
  probe: "Probe",
  planet: "Planets",
  land: "Planets",
  ice: "Planets",
  crater: "Planets",
  plate: "Plates",
  bar: "Magnet",
  orbit: "Orbit",
  sphere: "Conductor",
  plusCharge: "Induced charge",
  flux: "Solenoid",
  Bdot: "Field direction",
  Bcrossm: "Field direction",
  Bcrossp: "Field direction",
  charge: "Charges",
  gaussianRim: "Gaussian surface",
  gaussianSphere: "Gaussian surface",
  gaussReadout: "Readout",
  normalProbe: "Surface normal",
  center: "Surface centre",
  handle: "Drag handles",
  dragCharge: "Drag handles",
  dragCenter: "Drag handles",
  gaussianLatitudes: "Gaussian surface",
  gaussianMeridians: "Gaussian surface",
  Bvector: "Field direction",
};

/** `separatrixUpper` is "Separatrix upper": a key no rule knows, as words. */
function words(key: string) {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** An arrow's name from its label, `\vec{F}_{\mathrm{net}}` as `F_{net}`. */
function vectorName(label: string | undefined) {
  if (label === undefined) return undefined;
  return label
    .replace(/`/g, "")
    .replace(/\\vec\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1");
}

/**
 * A number the graph works out and shows in the expression list, such as a
 * flux or a friction force, rather than draws: nothing on the graph to hide.
 */
function isValue(item: SceneItem) {
  return (
    // `y=0` is a line; `F_{N}=…` is a value.
    /^(?![xyzr]=)\\?[A-Za-z]+(_\{[^}]*\})?=/.test(item.latex) &&
    item.points !== true &&
    item.domain === undefined &&
    item.domainU === undefined &&
    item.name3d === undefined
  );
}

/** The parts a scene's visible objects make, in the order they first appear. */
export function sceneParts(scene: readonly SceneItem[]): ScenePart[] {
  const parts = new Map<string, ScenePart>();
  const add = (
    id: string,
    make: () => Omit<ScenePart, "id" | "keys" | "names3d">,
    item: SceneItem
  ) => {
    const part = parts.get(id) ?? { ...make(), id, keys: [], names3d: [] };
    if (item.hidden === true) part.names3d.push(item.key);
    else part.keys.push(item.key);
    parts.set(id, part);
  };
  const names = new Map(
    scene.map((item) => [item.key, item.label ?? item.name3d?.label])
  );
  for (const item of scene) {
    // A helper, hidden for good, has nothing to show, unless it carries a
    // name the plugin draws on Desmos 3D; and a value is not on the graph.
    if (item.hidden === true && item.name3d === undefined) continue;
    if (isValue(item)) continue;
    const arrow = /^(.*?)(shaft|head|name|arrow)$/.exec(item.key);
    if (arrow !== null && arrow[1] !== "") {
      const [, base] = arrow;
      add(
        `arrow:${base}`,
        () => ({
          label: "Arrow",
          name: vectorName(names.get(`${base}name`)),
        }),
        item
      );
      continue;
    }
    const stem = item.key.replace(/\d.*$/, "");
    const label = NAMES[stem] ?? words(stem);
    add(label, () => ({ label }), item);
  }
  return [...parts.values()];
}
