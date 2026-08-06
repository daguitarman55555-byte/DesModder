import { PluginController } from "../PluginController";
import { VectorToolsPanelFunc } from "./components/VectorToolsPanel";
import {
  CalculatorExpressionAdapter,
  type GeneratedItemSnapshot,
} from "./desmos/ExpressionAdapter";
import {
  configForPreset,
  DENSITY_PRESETS,
  isDevelopmentBuild,
  normalizeVectorFieldConfig,
  type ColorPalette,
  type ColorRangeMode,
  type DensityPreset,
  type FlowConfig,
  type SamplingAxisConfig,
  type SamplingMode,
  type VectorColorMode,
  type VectorFieldConfig,
  type VectorFieldPreset,
  type VectorLengthMode,
  type ZeroVectorMode,
  VECTOR_FIELD_PRESETS,
  cloneDefaultConfig,
  validateVectorFieldConfig,
} from "./model";
import {
  auditVectorFieldPlan,
  createVectorFieldPlan,
  type ExpressionAudit,
  type VectorFieldPlan,
} from "./generator";
import { FlowOverlay } from "./flow/FlowOverlay";
import { compileFieldComponentToGLSL } from "./flow/latexToGLSL";
import type { ConfigItem } from "..";
import type { FocusLocation } from "#globals";

export { TEST_FOLDER_ID, TEST_LINE_ID, TEST_NAMESPACE } from "./ids";

interface VectorToolsSettings {
  serializedFieldConfig: string;
}

type GenerationTarget = "production" | "test";
type TestChecklistID = "visual" | "zero" | "colors" | "responsiveness";

/** The compiled shader field, or the reason it could not be put on the GPU. */
type FlowCompilation =
  | { ok: true; p: string; q: string }
  | { ok: false; error: string };

const FLOW_REFRESH_DELAY_MS = 300;

function compileFlowField(xLatex: string, yLatex: string): FlowCompilation {
  const p = compileFieldComponentToGLSL(xLatex);
  if (!p.ok) return { ok: false, error: `P(x, y): ${p.error}` };
  const q = compileFieldComponentToGLSL(yLatex);
  if (!q.ok) return { ok: false, error: `Q(x, y): ${q.error}` };
  return { ok: true, p: p.glsl, q: q.glsl };
}

const TEST_CHECKLIST: readonly {
  id: TestChecklistID;
  label: string;
}[] = [
  { id: "visual", label: "Arrow directions match the selected preset." },
  {
    id: "zero",
    label: "Zero vectors follow the selected hide/point behavior.",
  },
  { id: "colors", label: "Arrow colors follow the chosen color mode." },
  {
    id: "responsiveness",
    label: "The graph remains responsive at this density.",
  },
];

export default class VectorTools extends PluginController<VectorToolsSettings> {
  static id = "vector-tools" as const;
  static enabledByDefault = false;
  static config = [
    {
      type: "string",
      variant: "text",
      default: JSON.stringify(cloneDefaultConfig()),
      key: "serializedFieldConfig",
      shouldShow: () => false,
    },
  ] satisfies readonly ConfigItem[];

  private readonly expressions = new CalculatorExpressionAdapter(this.calc);
  private pendingGeneration: GenerationTarget | undefined;
  private lastActionMessage =
    "Configure a field, then generate it into Desmos.";
  private testPresetID: VectorFieldPreset["id"] = "rotational";
  private testDensityID: DensityPreset["id"] = "small";
  private testLengthMode: VectorLengthMode = "normalized";
  private testColorMode: VectorColorMode = "magnitude";
  private readonly completedChecklist = new Set<TestChecklistID>();
  private readonly flowOverlay = new FlowOverlay(this.calc, {
    onError: (message) => {
      this.flowMessage = message;
      this.util.tick();
    },
  });
  private flowMessage = "";
  private flowRefreshTimer?: ReturnType<typeof setTimeout>;
  private flowCompilationCache?: { key: string; result: FlowCompilation };
  /**
   * `getConfig` is read many times while the panel renders, and each read has
   * to parse the persisted JSON. Cache it against the raw string so a render
   * pass costs one parse rather than dozens.
   */
  private configCache?: { serialized: string; config: VectorFieldConfig };

  afterEnable() {
    this.ensureStoredConfigIsCurrent();
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-vector-tools-menu",
      tooltip: "vector-tools-name",
      iconClass: "dsm-icon-compass2",
      popup: () => VectorToolsPanelFunc(this),
    });
  }

  afterDisable() {
    if (this.flowRefreshTimer !== undefined)
      clearTimeout(this.flowRefreshTimer);
    this.flowOverlay.stop();
    this.dsm.pillboxMenus?.removePillboxButton("dsm-vector-tools-menu");
  }

  afterConfigChange() {
    if (this.flowOverlay.isRunning)
      this.flowOverlay.setOptions(this.flowOptions);
    this.util.tick();
  }

  isFocused(id: "p" | "q") {
    const focused = this.cc.getFocusLocation();
    return (
      focused?.type === "dsm-focus" &&
      focused.plugin === "vector-tools" &&
      focused.id === id
    );
  }

  updateFocus(id: "p" | "q", isFocused: boolean) {
    const location: FocusLocation = {
      type: "dsm-focus",
      plugin: "vector-tools",
      id,
    };
    this.cc.dispatch({
      type: isFocused ? "set-focus-location" : "blur-focus-location",
      location,
    });
  }

  getConfig(): VectorFieldConfig {
    const serialized = this.settings.serializedFieldConfig;
    if (this.configCache?.serialized === serialized) {
      return this.configCache.config;
    }
    let config: VectorFieldConfig;
    try {
      config = normalizeVectorFieldConfig(JSON.parse(serialized));
    } catch {
      config = cloneDefaultConfig();
    }
    this.configCache = { serialized, config };
    return config;
  }

  updateConfig(update: (config: VectorFieldConfig) => void) {
    // Copy first: `getConfig` hands back a cached object shared with the panel.
    const next = normalizeVectorFieldConfig(
      JSON.parse(JSON.stringify(this.getConfig()))
    );
    update(next);
    this.saveConfig(next);
  }

  resetConfig() {
    this.saveConfig(cloneDefaultConfig());
    this.lastActionMessage = "Restored the default rotational field settings.";
  }

  setComponent(component: "xLatex" | "yLatex", latex: string) {
    this.updateConfig((config) => {
      config.components[component] = latex;
    });
  }

  setAxis(
    axisName: "x" | "y",
    key: keyof SamplingAxisConfig,
    value: number | SamplingMode
  ) {
    this.updateConfig((config) => {
      const axis = config.domain[axisName];
      if (key === "mode") axis.mode = value as SamplingMode;
      else axis[key] = value as never;
    });
  }

  setLength(
    key: keyof VectorFieldConfig["length"],
    value: number | boolean | VectorLengthMode
  ) {
    this.updateConfig((config) => {
      config.length[key] = value as never;
    });
  }

  setArrowhead(key: "size" | "angleRadians", value: number) {
    this.updateConfig((config) => {
      config.arrowhead[key] = value;
    });
  }

  setColor(
    key: keyof VectorFieldConfig["color"],
    value: number | string | VectorColorMode | ColorPalette | ColorRangeMode
  ) {
    this.updateConfig((config) => {
      config.color[key] = value as never;
    });
  }

  setZeroVectorMode(mode: ZeroVectorMode) {
    this.updateConfig((config) => {
      config.zeroVectorMode = mode;
    });
  }

  setFlow<K extends keyof FlowConfig>(key: K, value: FlowConfig[K]) {
    this.updateConfig((config) => {
      config.flow[key] = value;
    });
  }

  // ---- flow visualizer ---------------------------------------------------

  get isFlowRunning() {
    return this.flowOverlay.isRunning;
  }

  get flowStatus() {
    if (this.flowMessage !== "") return this.flowMessage;
    return this.flowOverlay.isRunning
      ? "Streaming the field over the graph paper."
      : "Animate the field as flowing particles, drawn over the graph.";
  }

  /**
   * The compiled shader field, or the reason the current components cannot be
   * put on the GPU. The panel uses this to disable the button with a specific
   * explanation instead of failing on click.
   */
  get flowCompilation(): FlowCompilation {
    const { components } = this.getConfig();
    const key = JSON.stringify([components.xLatex, components.yLatex]);
    // The panel reads this several times per render pass, so compile once per
    // distinct pair of components rather than once per read.
    if (this.flowCompilationCache?.key === key) {
      return this.flowCompilationCache.result;
    }
    const result = compileFlowField(components.xLatex, components.yLatex);
    this.flowCompilationCache = { key, result };
    return result;
  }

  toggleFlow() {
    if (this.flowOverlay.isRunning) {
      this.flowOverlay.stop();
      this.flowMessage = "";
      this.util.tick();
      return;
    }
    this.startFlow();
  }

  /**
   * Recompiles the running visualizer against the current components. Typing in
   * the math field fires this per keystroke, and each restart links a new
   * shader program and reseeds every particle, so it settles first.
   */
  refreshFlow() {
    if (!this.flowOverlay.isRunning) return;
    if (this.flowRefreshTimer !== undefined)
      clearTimeout(this.flowRefreshTimer);
    this.flowRefreshTimer = setTimeout(() => {
      this.flowRefreshTimer = undefined;
      if (this.flowOverlay.isRunning) this.startFlow();
    }, FLOW_REFRESH_DELAY_MS);
  }

  private startFlow() {
    const compiled = this.flowCompilation;
    if (!compiled.ok) {
      this.flowMessage = compiled.error;
      this.util.tick();
      return;
    }
    this.flowMessage = "";
    this.flowOverlay.start(compiled.p, compiled.q, this.flowOptions);
    this.util.tick();
  }

  private get flowOptions() {
    const config = this.getConfig();
    return { ...config.flow, fixedColor: config.color.fixedColor };
  }

  get validation() {
    return validateVectorFieldConfig(this.getConfig());
  }

  get message() {
    return this.lastActionMessage;
  }

  get isTestLabVisible() {
    return isDevelopmentBuild();
  }

  get testPresets() {
    return VECTOR_FIELD_PRESETS;
  }

  get densityPresets() {
    return DENSITY_PRESETS;
  }

  get testConfig() {
    return configForPreset(
      this.selectedTestPreset,
      this.selectedDensityPreset,
      this.testLengthMode,
      this.testColorMode
    );
  }

  get selectedTestPreset() {
    return VECTOR_FIELD_PRESETS.find(
      (preset) => preset.id === this.testPresetID
    )!;
  }

  get selectedDensityPreset() {
    return DENSITY_PRESETS.find(
      (density) => density.id === this.testDensityID
    )!;
  }

  get currentTestLengthMode() {
    return this.testLengthMode;
  }

  get currentTestColorMode() {
    return this.testColorMode;
  }

  setTestPreset(id: VectorFieldPreset["id"]) {
    this.testPresetID = id;
    this.completedChecklist.clear();
    this.util.tick();
  }

  setTestDensity(id: DensityPreset["id"]) {
    this.testDensityID = id;
    this.completedChecklist.clear();
    this.util.tick();
  }

  setTestLengthMode(mode: VectorLengthMode) {
    this.testLengthMode = mode;
    this.completedChecklist.clear();
    this.util.tick();
  }

  setTestColorMode(mode: VectorColorMode) {
    this.testColorMode = mode;
    this.completedChecklist.clear();
    this.util.tick();
  }

  get checklist() {
    return TEST_CHECKLIST.map((item) => ({
      ...item,
      complete: this.completedChecklist.has(item.id),
    }));
  }

  toggleChecklist(id: TestChecklistID, complete: boolean) {
    if (complete) this.completedChecklist.add(id);
    else this.completedChecklist.delete(id);
    this.util.tick();
  }

  generateProduction(confirmed = false) {
    this.generate(this.getConfig(), "production", confirmed);
  }

  generateTestField(confirmed = false) {
    if (!this.isTestLabVisible) return;
    this.generate(this.testConfig, "test", confirmed);
  }

  confirmPendingGeneration() {
    if (this.pendingGeneration === "production") this.generateProduction(true);
    else if (this.pendingGeneration === "test") this.generateTestField(true);
  }

  cancelPendingGeneration() {
    this.pendingGeneration = undefined;
    this.lastActionMessage = "Generation cancelled.";
    this.util.tick();
  }

  get needsGenerationConfirmation() {
    return this.pendingGeneration !== undefined;
  }

  removeProductionField() {
    this.expressions.removeGeneratedSet(
      createVectorFieldPlan(this.getConfig()).namespace
    );
    this.pendingGeneration = undefined;
    this.lastActionMessage = "Removed only this Vector Tools field.";
    this.util.tick();
  }

  removeTestField() {
    if (!this.isTestLabVisible) return;
    this.expressions.removeGeneratedSet(
      createVectorFieldPlan(this.testConfig).namespace
    );
    this.pendingGeneration = undefined;
    this.lastActionMessage = "Removed the development test field.";
    this.util.tick();
  }

  get productionAudit(): ExpressionAudit {
    return this.audit(createVectorFieldPlan(this.getConfig()));
  }

  get testAudit(): ExpressionAudit {
    return this.audit(createVectorFieldPlan(this.testConfig));
  }

  async copyDiagnostics() {
    if (!this.isTestLabVisible) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      extensionVersion: VERSION,
      plugin: "vector-tools",
      testConfiguration: this.testConfig,
      testValidation: validateVectorFieldConfig(this.testConfig),
      audit: this.testAudit,
      manualChecklist: this.checklist,
      browser: navigator.userAgent,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      this.lastActionMessage = "Sanitized diagnostics copied to the clipboard.";
    } catch {
      this.lastActionMessage =
        "Could not copy diagnostics in this browser context.";
    }
    this.util.tick();
  }

  private generate(
    config: VectorFieldConfig,
    target: GenerationTarget,
    confirmed: boolean
  ) {
    const validation = validateVectorFieldConfig(config);
    if (!validation.canGenerate) {
      this.pendingGeneration = undefined;
      this.lastActionMessage = "Fix the validation errors before generating.";
      this.util.tick();
      return;
    }
    if (validation.requiresConfirmation && !confirmed) {
      this.pendingGeneration = target;
      this.lastActionMessage = `This will create ${validation.estimatedVectorCount.toLocaleString()} vectors. Confirm to continue.`;
      this.util.tick();
      return;
    }

    const plan = createVectorFieldPlan(config);
    try {
      this.applyPlan(plan);
      this.pendingGeneration = undefined;
      this.lastActionMessage = `Generated ${validation.estimatedVectorCount.toLocaleString()} vectors as ordinary Desmos expressions.`;
    } catch (error) {
      this.pendingGeneration = undefined;
      this.lastActionMessage = `Generation stopped safely: ${error instanceof Error ? error.message : "unknown error"}`;
    }
    this.util.tick();
  }

  private applyPlan(plan: VectorFieldPlan) {
    this.expressions.applyGeneratedSet(
      plan.namespace,
      plan.folder,
      plan.expressions
    );
  }

  private audit(plan: VectorFieldPlan) {
    const items: GeneratedItemSnapshot[] = this.expressions.getGeneratedItems(
      plan.namespace
    );
    return auditVectorFieldPlan(plan, items);
  }

  private saveConfig(config: VectorFieldConfig) {
    this.dsm.setPluginSetting(
      "vector-tools",
      "serializedFieldConfig",
      JSON.stringify(config)
    );
  }

  private ensureStoredConfigIsCurrent() {
    const normalized = this.getConfig();
    const serialized = JSON.stringify(normalized);
    if (serialized !== this.settings.serializedFieldConfig) {
      this.dsm.setPluginSetting(
        "vector-tools",
        "serializedFieldConfig",
        serialized
      );
    }
  }
}
