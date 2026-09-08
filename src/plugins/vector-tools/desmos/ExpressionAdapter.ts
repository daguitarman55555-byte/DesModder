import type { Calc } from "#globals";
import type {
  ExpressionState,
  FolderState,
  GraphState,
  ItemState,
} from "graph-state/state";

const VALID_ID = /^[A-Za-z][A-Za-z0-9_]*$/;
const VALID_COLOR = /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/;

export interface GeneratedExpressionSpec {
  id: string;
  latex: string;
  color?: string;
  colorLatex?: string;
  hidden?: boolean;
  secret?: boolean;
  folderId?: string;
  lineWidth?: string;
  pointSize?: string;
  lines?: boolean;
  points?: boolean;
}

export interface GeneratedFolderSpec {
  id: string;
  title: string;
  collapsed?: boolean;
}

export interface GeneratedItemSnapshot {
  id: string;
  type: "expression" | "folder" | "table" | "text" | "image";
  latex?: string;
  hidden?: boolean;
  secret?: boolean;
  colorLatex?: string;
  folderId?: string;
}

export interface DesmosExpressionAdapter {
  applyGeneratedSet: (
    namespace: string,
    folder: GeneratedFolderSpec,
    expressions: readonly GeneratedExpressionSpec[]
  ) => void;
  removeGeneratedSet: (
    namespace: string,
    ownedIDs: readonly string[]
  ) => { strays: number };
  expressionExists: (id: string) => boolean;
  getGeneratedItems: (namespace: string) => GeneratedItemSnapshot[];
}

/**
 * The single calculator boundary used by Vector Tools.
 *
 * Every write goes through `getState`/`setState`, which is the only public
 * Desmos API that round-trips the properties a generated field needs. In
 * particular `setExpression` silently drops `folderId` and `colorLatex`, and
 * the `set-item-colorLatex` action is not handled by current Desmos builds, so
 * a field written through them renders in one flat color outside any folder.
 *
 * Writing the whole set in a single `setState` also makes generation atomic and
 * undoable, and keeps a regenerated field at its existing position in the
 * expression list instead of jumping to the end.
 */
export class CalculatorExpressionAdapter implements DesmosExpressionAdapter {
  constructor(private readonly calc: Calc) {}

  applyGeneratedSet(
    namespace: string,
    folder: GeneratedFolderSpec,
    expressions: readonly GeneratedExpressionSpec[]
  ) {
    assertValidID(namespace, "generated namespace");
    assertFolderSpec(folder);
    assertWithinNamespace(folder.id, namespace, "generated folder");
    for (const expression of expressions) {
      assertExpressionSpec(expression);
      assertWithinNamespace(expression.id, namespace, "generated expression");
      if (
        expression.folderId !== undefined &&
        expression.folderId !== folder.id
      )
        throw new Error(
          `Generated expression ${expression.id} must live in the generated folder.`
        );
    }
    const duplicate = firstDuplicate([
      folder.id,
      ...expressions.map((e) => e.id),
    ]);
    if (duplicate !== undefined)
      throw new Error(`Generated ID ${duplicate} is used twice in one field.`);

    const state = this.calc.getState();
    const owned: ItemState[] = [];
    const others: ItemState[] = [];
    for (const item of state.expressions.list) {
      (isWithinNamespace(item.id, namespace) ? owned : others).push(item);
    }
    assertOwnedItemsAreReplaceable(owned, folder, expressions);

    const insertionIndex = firstOwnedIndex(state.expressions.list, namespace);
    const generated: ItemState[] = [
      folderState(folder),
      ...expressions.map(expressionState),
    ];
    state.expressions.list =
      insertionIndex === undefined
        ? [...others, ...generated]
        : [
            ...others.slice(0, insertionIndex),
            ...generated,
            ...others.slice(insertionIndex),
          ];
    this.setState(state);
  }

  /**
   * Removes exactly the items this field generated, and nothing else.
   *
   * `ownedIDs` rather than the namespace alone, because sharing a prefix is not
   * the same as being ours: an expression the user named
   * `vector_tools_vf_default_scratch` matches the namespace and was being
   * deleted along with the field. Anything left inside the namespace afterwards
   * is reported back rather than removed, so a stray item survives Remove and
   * the caller can say it is still there.
   */
  removeGeneratedSet(namespace: string, ownedIDs: readonly string[]) {
    assertValidID(namespace, "generated namespace");
    const removable = new Set(
      ownedIDs.filter((id) => isWithinNamespace(id, namespace))
    );
    const state = this.calc.getState();
    const remaining = state.expressions.list.filter(
      (item) => !removable.has(item.id)
    );
    const strays = remaining.filter((item) =>
      isWithinNamespace(item.id, namespace)
    ).length;
    if (remaining.length === state.expressions.list.length) return { strays };
    state.expressions.list = remaining;
    this.setState(state);
    return { strays };
  }

  expressionExists(id: string) {
    assertValidID(id, "expression ID");
    return this.calc.controller.getItemModel(id)?.type === "expression";
  }

  getGeneratedItems(namespace: string): GeneratedItemSnapshot[] {
    assertValidID(namespace, "generated namespace");
    return this.calc
      .getState()
      .expressions.list.filter((item) => isWithinNamespace(item.id, namespace))
      .map((item) => {
        const expression = item as ExpressionState;
        return {
          id: item.id,
          type: item.type,
          latex: item.type === "expression" ? expression.latex : undefined,
          hidden:
            item.type === "expression"
              ? (expression.hidden ?? false)
              : undefined,
          secret: item.secret ?? false,
          colorLatex:
            item.type === "expression" ? expression.colorLatex : undefined,
          folderId: item.type === "folder" ? undefined : (item as any).folderId,
        };
      });
  }

  private setState(state: GraphState) {
    this.calc.setState(state, { allowUndo: true });
  }
}

function folderState(spec: GeneratedFolderSpec): FolderState {
  const folder: FolderState = {
    type: "folder",
    id: spec.id,
    title: spec.title,
  };
  if (spec.collapsed !== undefined) folder.collapsed = spec.collapsed;
  return folder;
}

function expressionState(spec: GeneratedExpressionSpec): ExpressionState {
  const expression: ExpressionState = {
    type: "expression",
    id: spec.id,
    latex: spec.latex,
    color: spec.color ?? "#2d70b3",
    hidden: spec.hidden ?? false,
  };
  if (spec.folderId !== undefined) expression.folderId = spec.folderId;
  if (spec.colorLatex !== undefined) expression.colorLatex = spec.colorLatex;
  if (spec.secret !== undefined) expression.secret = spec.secret;
  if (spec.lineWidth !== undefined) expression.lineWidth = spec.lineWidth;
  if (spec.pointSize !== undefined) expression.pointSize = spec.pointSize;
  if (spec.lines !== undefined) expression.lines = spec.lines;
  if (spec.points !== undefined) expression.points = spec.points;
  return expression;
}

/**
 * Refuse to overwrite anything in the namespace that this field does not
 * already own, so a stray user item that happens to share the prefix is
 * reported instead of silently deleted.
 */
function assertOwnedItemsAreReplaceable(
  owned: readonly ItemState[],
  folder: GeneratedFolderSpec,
  expressions: readonly GeneratedExpressionSpec[]
) {
  const expected = new Map<string, "folder" | "expression">([
    [folder.id, "folder"],
    ...expressions.map((e) => [e.id, "expression"] as const),
  ]);
  for (const item of owned) {
    const expectedType = expected.get(item.id);
    // An item inside the namespace that this write does not account for is not
    // this field's to replace. It used to be skipped here and then dropped by
    // the rebuild below, which deleted it — the exact outcome the paragraph
    // above promises does not happen. Refusing is what makes that true.
    if (expectedType === undefined) {
      throw new Error(
        `${item.id} is not part of this field, but shares its namespace. Rename or remove it, or rename the field, and try again.`
      );
    }
    if (item.type !== expectedType) {
      throw new Error(
        `Generated ID ${item.id} is already used by a ${item.type}.`
      );
    }
  }
}

function firstOwnedIndex(items: readonly ItemState[], namespace: string) {
  let seenOthers = 0;
  for (const item of items) {
    if (isWithinNamespace(item.id, namespace)) return seenOthers;
    seenOthers++;
  }
  return undefined;
}

function firstDuplicate(ids: readonly string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return undefined;
}

function assertFolderSpec(spec: GeneratedFolderSpec) {
  assertValidID(spec.id, "folder ID");
  if (spec.title.trim().length === 0) {
    throw new Error("Generated folder title must not be empty.");
  }
}

function assertExpressionSpec(spec: GeneratedExpressionSpec) {
  assertValidID(spec.id, "expression ID");
  assertValidIDMaybe(spec.folderId, "folder ID");
  if (spec.latex.trim().length === 0) {
    throw new Error("Generated expression LaTeX must not be empty.");
  }
  if (spec.color !== undefined && !VALID_COLOR.test(spec.color)) {
    throw new Error("Generated expression color must be a hex color.");
  }
}

function assertValidIDMaybe(value: string | undefined, label: string) {
  if (value !== undefined) assertValidID(value, label);
}

function assertValidID(value: string, label: string) {
  if (!VALID_ID.test(value)) {
    throw new Error(`${label} must be a valid Desmos identifier.`);
  }
}

function assertWithinNamespace(id: string, namespace: string, label: string) {
  if (!isWithinNamespace(id, namespace)) {
    throw new Error(`${label} ${id} is outside the ${namespace} namespace.`);
  }
}

function isWithinNamespace(id: string, namespace: string) {
  return id === namespace || id.startsWith(`${namespace}_`);
}
