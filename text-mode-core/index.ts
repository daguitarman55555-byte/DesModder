export * as TextAST from "./TextAST";
export * as TextASTSynthetic from "./TextAST/Synthetic";
export { default as textToRaw, textModeExprToLatex } from "./down/textToRaw";
export {
  rawNonFolderToAug,
  rawToAugSettings,
  rawToDsmMetadata,
  parseRootLatex,
} from "./aug/rawToAug";
export type { ProgramAnalysis } from "./ProgramAnalysis";
export { parse as parseText } from "./down/textToAST";
export { astToText, type TextEmitOptions } from "./up/astToText";
export { childExprToAug } from "./down/astToAug";
export { itemAugToAST, childLatexToAST } from "./up/augToAST";
export { graphSettingsToText, itemToText, augToText } from "./up/augToText";
export * as StyleDefaults from "./down/style/defaults";
export type { AnyHydrated, AnyHydratedValue } from "./down/style/Hydrated";
export { rawToText } from "./up/rawToText";
export { identifierToString, latexTreeToString } from "./aug/augLatexToRaw";
export type { ExpressionAug } from "./aug/AugState";
// The Aug latex tree, its builders, and the parser that produces it. Exported
// so consumers can analyze and rewrite expressions (Vector Tools differentiates
// them) without reaching past this boundary.
export { Aug } from "./aug";
export * as AugBuilders from "./aug/augBuilders";
export { parseLatex } from "./aug/rawToAug";
export type { PublicConfig, Config } from "./TextModeConfig";
export { buildConfig, buildConfigFromGlobals } from "./TextModeConfig";
