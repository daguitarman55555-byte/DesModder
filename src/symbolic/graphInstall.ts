/**
 * The special functions, switched on in the calculator for whichever
 * plugins use them: Physics Lab, Vector Tools and Audio Lab.
 *
 * Two things, both needed for Γ(0.5) typed into the expression list to be
 * √π rather than an error:
 *
 * - The expression list learns the names. Typing E then i writes
 *   \operatorname{Ei}, Gamma writes Γ. Without this, a definition like
 *   Ei(z) = … survives being pasted but breaks into E·i the first time its
 *   line is edited.
 * - Whenever a line calls one, the whole library goes into the graph's
 *   locked, hidden folder (special.ts, definitionFolderItems).
 *
 * Shared rather than owned by one plugin, because a field in Vector Tools
 * and a curve in Physics Lab read the same graph. The install is counted:
 * it is undone only when the last plugin using it is disabled, so turning
 * Physics Lab off does not take Γ away from a field that is drawing it.
 */
import type { Calc } from "#globals";
import {
  SPECIAL_FUNCTIONS,
  ensureSpecialFunctions,
  specialFunctionsIn,
  withSpecialFunctionNames,
} from "./special";

type MathquillConfig = Calc["controller"]["getMathquillConfig"];

interface Installed {
  calc: Calc;
  original: MathquillConfig;
  wrapped: MathquillConfig;
  stop: () => void;
}

const owners = new Set<string>();
let installed: Installed | undefined;

/** Switches the special functions on for `owner` (a plugin id). */
export function useSpecialFunctions(owner: string, calc: Calc) {
  owners.add(owner);
  if (installed !== undefined) return;
  const cc = calc.controller;
  const original = cc.getMathquillConfig;
  const wrapped: MathquillConfig = function (this: unknown, e) {
    return withSpecialFunctionNames(original.call(this, e));
  };
  cc.getMathquillConfig = wrapped;
  installed = { calc, original, wrapped, stop: watch(calc) };
}

/** Switches them off for `owner`; the last owner to leave undoes it all. */
export function releaseSpecialFunctions(owner: string) {
  owners.delete(owner);
  if (owners.size > 0 || installed === undefined) return;
  const { calc, original, wrapped, stop } = installed;
  // Only our own wrapper is undone: another plugin that wrapped it since
  // (custom-mathquill-config does) keeps its chain.
  if (calc.controller.getMathquillConfig === wrapped)
    calc.controller.getMathquillConfig = original;
  stop();
  installed = undefined;
}

/**
 * Checked shortly after a change rather than during it: a state change
 * inside Desmos's own dispatch throws.
 */
function watch(calc: Calc): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    timer = undefined;
    const used = new Set<string>();
    for (const e of calc.getExpressions())
      if ("latex" in e && typeof e.latex === "string")
        for (const s of specialFunctionsIn(e.latex)) used.add(s);
    if (used.size === 0) return;
    // The whole library, once one is in use: typing the next works too.
    // While a line has the cursor, the definitions go in without moving it;
    // the next check after the cursor leaves tidies them into the folder.
    ensureSpecialFunctions(
      calc as unknown as Parameters<typeof ensureSpecialFunctions>[0],
      SPECIAL_FUNCTIONS.map((f) => f.symbol),
      {
        // Keyboard focus in an expression line, not Desmos's notion of a
        // selected item, which outlives Escape.
        editing: document.activeElement?.closest(".dcg-expressionitem") != null,
      }
    );
  };
  const schedule = () => {
    if (timer !== undefined) return;
    timer = setTimeout(check, 400);
  };
  const unsubscribe = calc.controller.subscribeToChanges(schedule);
  // Leaving a line changes nothing in the graph, so it is watched on its
  // own: that is when the definitions move into their folder.
  document.addEventListener("focusout", schedule);
  schedule();
  return () => {
    unsubscribe();
    document.removeEventListener("focusout", schedule);
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
}
