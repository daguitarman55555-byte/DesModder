/**
 * The exact route: the graph drawn through T by Desmos itself.
 *
 * A curve is a set of points q that satisfy something, F(q) = 0. Its image
 * under an invertible map T is the set of points q whose preimage T⁻¹(q)
 * satisfies it, F(T⁻¹(q)) = 0 — an ordinary implicit equation Desmos already
 * knows how to draw, inequalities and their shading included, sharp all the
 * way to the edge of the screen. Points and parametric curves go the other
 * way, forwards: the image of (f(t), g(t)) is T(f(t), g(t)).
 *
 * Nothing the user typed is rewritten. Each graphed expression gets a hidden
 * copy in a folder this tab owns, and the original is hidden while the copy
 * stands in for it; turning the tab off deletes the folder and shows the
 * originals again, so the graph comes back exactly as it was.
 *
 * Substituting into the user's LaTeX was the obvious approach and the wrong
 * one. `\frac{d}{dx}`, sums, integrals and list comprehensions all bind
 * their own variables, and a textual replacement of x inside `\frac{d}{dx}`
 * is not a derivative any more. Instead each side of the expression becomes
 * the body of a function of (x, y) — where every binding construct means
 * what it meant — and the copy calls those functions at T⁻¹(x, y). Desmos
 * does the substitution, by evaluating a call.
 *
 * Which original is hidden by whom is recorded in the copies' own ids, so
 * the state can be restored from the graph alone: a page reloaded while the
 * map was on, or a graph saved that way and opened elsewhere, still knows
 * which expressions to show again.
 */
import type { ExpressionState, GraphState, ItemState } from "graph-state/state";
import {
  identifierLatex,
  mentions,
} from "../../../field-rendering/identifiers";

export const MATRIX_NAMESPACE = "vector_tools_mx";
export const MATRIX_FOLDER_ID = MATRIX_NAMESPACE;
const COPY_PREFIX = `${MATRIX_NAMESPACE}_c_`;
const GHOST_PREFIX = `${MATRIX_NAMESPACE}_g_`;

/** The names the copies call; the session defines them in the same folder. */
export interface MapNames {
  /** T⁻¹, one coordinate each, as functions of (x, y). */
  inverseX: string;
  inverseY: string;
  /** T as a function of one point. */
  forward: string;
}

/**
 * The identity, spelt as a map, for the faint originals on the exact route:
 * the originals are hidden there, so "the graph as typed" is drawn by the
 * same copies called with (x, y) itself, sharing the same helpers.
 */
export const IDENTITY_NAMES: MapNames = {
  inverseX: String.raw`I_{vtmxx}`,
  inverseY: String.raw`I_{vtmxy}`,
  forward: String.raw`I_{vtmx}`,
};

export const MAP_NAMES: MapNames = {
  inverseX: String.raw`X_{vtmx}`,
  inverseY: String.raw`Y_{vtmx}`,
  forward: String.raw`T_{vtmx}`,
};

/** What the expression list says about one expression, as the planner needs it. */
export interface ExactSource {
  id: string;
  latex: string;
  /** `formula.expression_type`: X_OR_Y, IMPLICIT, SINGLE_POINT, … */
  type: string | undefined;
  inequality: boolean;
  /** `formula.function_definition`, canonical (`f`, `g_1`). */
  functionName?: string;
  /** `formula.assignment`, canonical. */
  assignment?: string;
  /** `formula.domains[0]`, for a polar curve's θ range. */
  domain?: { min: number; max: number };
}

export type Rewrite =
  | { ok: true; helpers: string[]; copy: string; parametric?: [number, number] }
  | { ok: false; reason: string };

// ---- ids ---------------------------------------------------------------------

/**
 * A Desmos item id carried inside one of ours. Ids are usually digits, which
 * pass through with a marker; anything else is spelt in hex, so the copy's
 * id is still one Desmos and the adapter rules accept.
 */
export function encodeId(id: string) {
  if (/^[A-Za-z0-9]+$/.test(id)) return `a${id}`;
  return `u${Array.from(id, (ch) => ch.charCodeAt(0).toString(16).padStart(4, "0")).join("")}`;
}

export function decodeId(encoded: string): string | undefined {
  if (encoded.startsWith("a")) return encoded.slice(1);
  if (!encoded.startsWith("u")) return undefined;
  const hex = encoded.slice(1);
  if (hex.length % 4 !== 0 || !/^[0-9a-f]*$/.test(hex)) return undefined;
  let out = "";
  for (let i = 0; i < hex.length; i += 4)
    out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return out;
}

export const copyId = (sourceId: string) =>
  `${COPY_PREFIX}${encodeId(sourceId)}`;
export const ghostId = (sourceId: string) =>
  `${GHOST_PREFIX}${encodeId(sourceId)}`;
export const helperId = (sourceId: string, index: number) =>
  `${MATRIX_NAMESPACE}_h_${encodeId(sourceId)}_${index}`;

/** The original a copy stands for, or undefined if the id is not a copy's. */
export function sourceOfCopy(id: string) {
  return id.startsWith(COPY_PREFIX)
    ? decodeId(id.slice(COPY_PREFIX.length))
    : undefined;
}

/** The original a faint copy shows, or undefined if the id is not one. */
export function sourceOfGhost(id: string) {
  return id.startsWith(GHOST_PREFIX)
    ? decodeId(id.slice(GHOST_PREFIX.length))
    : undefined;
}

export function isOwned(id: string) {
  return id === MATRIX_NAMESPACE || id.startsWith(`${MATRIX_NAMESPACE}_`);
}

// ---- reading an expression ----------------------------------------------------

const COMPARISONS = [
  ["\\le", "\\le"],
  ["\\ge", "\\ge"],
  ["\\leq", "\\le"],
  ["\\geq", "\\ge"],
  ["\\lt", "<"],
  ["\\gt", ">"],
] as const;

/**
 * The expression's sides and the comparisons between them, at the top level
 * only: `y=x^{2}\left\{x>0\right\}` is two sides, because the `>` inside the
 * restriction is part of the right-hand one. Undefined if there is no
 * comparison to split at, or a bracket is unbalanced.
 */
export function splitComparison(
  latex: string
): { parts: string[]; ops: string[] } | undefined {
  const parts: string[] = [];
  const ops: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < latex.length) {
    if (latex.startsWith("\\left", i)) {
      depth++;
      i += 5;
      // The delimiter belongs to \left: `\left\{` and `\left(` alike.
      i += latex[i] === "\\" ? 2 : 1;
      continue;
    }
    if (latex.startsWith("\\right", i)) {
      depth--;
      i += 6;
      i += latex[i] === "\\" ? 2 : 1;
      continue;
    }
    const ch = latex[i];
    if (ch === "\\") {
      const command = /^\\([A-Za-z]+)/.exec(latex.slice(i));
      if (command === null) {
        i += 2;
        continue;
      }
      if (depth === 0) {
        const comparison = COMPARISONS.find(
          ([spelling]) => command[0] === spelling
        );
        if (comparison !== undefined) {
          parts.push(latex.slice(start, i));
          ops.push(comparison[1]);
          i += command[0].length;
          start = i;
          continue;
        }
      }
      i += command[0].length;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (depth === 0 && (ch === "=" || ch === "<" || ch === ">")) {
      parts.push(latex.slice(start, i));
      ops.push(ch);
      start = i + 1;
    }
    if (depth < 0) return undefined;
    i++;
  }
  if (depth !== 0 || ops.length === 0) return undefined;
  parts.push(latex.slice(start));
  if (parts.some((part) => part.trim() === "")) return undefined;
  return { parts: parts.map((p) => p.trim()), ops };
}

/** The variable a one-argument function definition is written in. */
export function definitionParameter(latex: string): "x" | "y" | undefined {
  const match = /^[^=]*?\\left\(\s*([xy])\s*\\right\)\s*=/.exec(latex);
  return match === null ? undefined : (match[1] as "x" | "y");
}

const pair = (a: string, b: string) => String.raw`\left(${a},${b}\right)`;

const call = (name: string, args: string) =>
  String.raw`${name}\left(${args}\right)`;

/**
 * One expression's copy, or the reason it cannot have one.
 *
 * `token` makes the helpers' names unique to this expression. `reservedT`
 * says the graph defines a global t, which would turn a parametric copy into
 * a single point (brief §5.1), so a polar curve cannot be carried that way.
 */
export function rewrite(
  source: ExactSource,
  token: string,
  names: MapNames = MAP_NAMES,
  reservedT = false,
  reach?: number
): Rewrite {
  const latex = source.latex.trim();
  const pre = `${call(names.inverseX, "x,y")},${call(names.inverseY, "x,y")}`;
  switch (source.type) {
    case "SINGLE_POINT":
    case "POINT_LIST":
    case "PARAMETRIC": {
      if (source.inequality)
        return { ok: false, reason: "a parametric inequality has no copy" };
      // A named point or list is used by name: the copy must not define it
      // a second time.
      const named =
        source.assignment !== undefined && source.type !== "PARAMETRIC";
      const argument = named ? identifierLatex(source.assignment!) : latex;
      return { ok: true, helpers: [], copy: call(names.forward, argument) };
    }
    case "POLAR": {
      if (source.inequality)
        return {
          ok: false,
          reason: "a polar inequality has no exact copy yet",
        };
      const split = splitComparison(latex);
      if (
        split === undefined ||
        split.ops.length !== 1 ||
        split.ops[0] !== "=" ||
        split.parts[0] !== "r"
      )
        return { ok: false, reason: "only r = f(θ) has an exact copy" };
      if (reservedT)
        return {
          ok: false,
          reason: "the graph defines t, which a parametric copy would need",
        };
      const r = `R_{vtmx${token}}`;
      const radius = call(r, "t");
      return {
        ok: true,
        helpers: [String.raw`${call(r, "\\theta")}=${split.parts[1]}`],
        copy: call(
          names.forward,
          String.raw`\left(${radius}\cos t,${radius}\sin t\right)`
        ),
        parametric: [
          source.domain?.min ?? 0,
          source.domain?.max ?? 2 * Math.PI,
        ],
      };
    }
    case "X_OR_Y":
    case "IMPLICIT": {
      // An explicit curve, y = f(x) or x = g(y), is drawn forwards as the
      // parametric T(t, f(t)) when the session gives it a reach for t. Desmos
      // samples a parametric adaptively on screen, and measured on the
      // fisheye (2026-10-22) that kept y = sin x within half a pixel of its
      // true image all the way to the rim, where the implicit copy, sampled
      // by Desmos's implicit plotter, strayed by up to four pixels and visibly
      // left the grid. An inequality keeps the implicit copy, which is what
      // shades; so does any curve that is not a function of one coordinate.
      const forward = reach !== undefined && !reservedT && !source.inequality;
      const along = (
        variable: "x" | "y",
        f: string
      ): Extract<Rewrite, { ok: true }> => ({
        ok: true,
        helpers: [],
        copy: call(
          names.forward,
          variable === "x" ? pair("t", f) : pair(f, "t")
        ),
        parametric: [-reach!, reach!],
      });
      if (source.functionName !== undefined) {
        // f(x) = … is drawn as y = f(x), and g(y) = … as x = g(y).
        const variable = definitionParameter(latex);
        if (variable === undefined)
          return {
            ok: false,
            reason: "a function of something other than x or y",
          };
        const f = identifierLatex(source.functionName);
        if (forward) return along(variable, call(f, "t"));
        // Written as a difference set to 0: `Y(x,y)=f(…)` with a call on the
        // left is how Desmos spells a definition, and it read as a second
        // definition of the inverse.
        return variable === "x"
          ? {
              ok: true,
              helpers: [],
              copy: `${call(names.inverseY, "x,y")}-${call(f, call(names.inverseX, "x,y"))}=0`,
            }
          : {
              ok: true,
              helpers: [],
              copy: `${call(names.inverseX, "x,y")}-${call(f, call(names.inverseY, "x,y"))}=0`,
            };
      }
      const split = splitComparison(latex);
      if (split === undefined)
        return { ok: false, reason: "its two sides could not be told apart" };
      if (forward && split.ops.length === 1 && split.ops[0] === "=") {
        const [left, right] = split.parts;
        for (const [variable, other] of [
          ["x", "y"],
          ["y", "x"],
        ] as const) {
          // y = f(x), or f(x) = y: one side is the coordinate alone and the
          // other never mentions it.
          const body =
            left === other && !mentions(right, other)
              ? right
              : right === other && !mentions(left, other)
                ? left
                : undefined;
          if (body === undefined) continue;
          const helper = `H_{vtmx${token}}`;
          return {
            ...along(variable, call(helper, "t")),
            helpers: [`${call(helper, variable)}=${body}`],
          };
        }
      }
      const helpers = split.parts.map(
        (part, i) => `${call(`H_{vtmx${token}n${i}}`, "x,y")}=${part}`
      );
      const sides = split.parts.map((_, i) =>
        call(`H_{vtmx${token}n${i}}`, pre)
      );
      let [copy] = sides;
      split.ops.forEach((op, i) => {
        copy += op + sides[i + 1];
      });
      return { ok: true, helpers, copy };
    }
    case "POLYGON":
      return {
        ok: false,
        reason: "Desmos keeps a polygon's edges straight",
      };
    default:
      return {
        ok: false,
        reason: `${(source.type ?? "this kind").toLowerCase().replace(/_/g, " ")} has no exact copy`,
      };
  }
}

// ---- the folder -----------------------------------------------------------------

/** Style a copy keeps from its original: everything about how it looks. */
const STYLE_KEYS = [
  "color",
  "colorLatex",
  "lineStyle",
  "lineWidth",
  "lineOpacity",
  "points",
  "lines",
  "pointStyle",
  "pointSize",
  "pointOpacity",
  "fill",
  "fillOpacity",
  "showLabel",
  "label",
  "labelSize",
  "labelOrientation",
  "labelAngle",
  "suppressTextOutline",
  "parametricDomain",
] as const;

/** The copy of `original`, drawn by `latex`, in the tab's folder. */
export function copyState(
  original: ExpressionState,
  latex: string,
  parametric?: [number, number]
): ExpressionState {
  const copy: ExpressionState = {
    type: "expression",
    id: copyId(original.id),
    latex,
    color: original.color,
    folderId: MATRIX_FOLDER_ID,
  };
  const target = copy as unknown as Record<string, unknown>;
  const from = original as unknown as Record<string, unknown>;
  for (const key of STYLE_KEYS)
    if (from[key] !== undefined) target[key] = from[key];
  if (parametric !== undefined)
    copy.parametricDomain = {
      min: String(parametric[0]),
      max: String(parametric[1]),
    };
  return copy;
}

/** The faint copy of `original`: the same look at a quarter of the ink. */
export function ghostState(
  original: ExpressionState,
  latex: string,
  parametric?: [number, number]
): ExpressionState {
  const ghost = copyState(original, latex, parametric);
  ghost.id = ghostId(original.id);
  ghost.lineOpacity = "0.22";
  ghost.fillOpacity = "0.08";
  ghost.pointOpacity = "0.22";
  ghost.showLabel = false;
  return ghost;
}

export function helperState(id: string, latex: string): ExpressionState {
  return {
    type: "expression",
    id,
    latex,
    color: "#000000",
    hidden: true,
    folderId: MATRIX_FOLDER_ID,
  };
}

/**
 * The graph with the tab's folder replaced by `owned` and exactly the
 * originals in `hide` hidden by it.
 *
 * Originals a previous copy hid and that no copy hides any more are shown
 * again; nothing else in the list is touched, and the folder keeps its place
 * in the list, so updating it does not move it to the end. With nothing owned
 * and nothing hidden this is the way back to the graph as it was.
 */
export function withOwnedItems(
  state: GraphState,
  owned: readonly ItemState[],
  hide: ReadonlySet<string>
): GraphState {
  const { list } = state.expressions;
  const hiddenBefore = new Set(
    list.flatMap((item) => {
      const source = sourceOfCopy(item.id);
      return source === undefined ? [] : [source];
    })
  );
  let insertAt: number | undefined;
  const others: ItemState[] = [];
  for (const item of list) {
    if (isOwned(item.id)) {
      insertAt ??= others.length;
      continue;
    }
    if (item.type === "expression") {
      if (hide.has(item.id)) {
        others.push({ ...item, hidden: true });
        continue;
      }
      if (hiddenBefore.has(item.id)) {
        others.push({ ...item, hidden: false });
        continue;
      }
    }
    others.push(item);
  }
  const at = insertAt ?? others.length;
  return {
    ...state,
    expressions: {
      ...state.expressions,
      list: [...others.slice(0, at), ...owned, ...others.slice(at)],
    },
  };
}
