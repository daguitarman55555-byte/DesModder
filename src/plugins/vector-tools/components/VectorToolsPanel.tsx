import VectorTools from "..";
import { Component, jsx } from "#DCGView";
import {
  Button,
  For,
  If,
  IfElse,
  InlineMathInputViewGeneral,
} from "#components";
import { format } from "#i18n";
import {
  FLOW_DENSITY_CHOICES,
  type ColorPalette,
  type ColorRangeMode,
  type FlowColorMode,
  type SamplingMode,
  type VectorColorMode,
  type VectorFieldConfig,
  type VectorLengthMode,
  type ZeroVectorMode,
} from "../model";
import "./VectorToolsPanel.less";

interface Choice<T extends string> {
  value: T;
  label: string;
}

const LENGTH_MODES: readonly Choice<VectorLengthMode>[] = [
  { value: "actual", label: "Actual" },
  { value: "normalized", label: "Normalized" },
  { value: "scaled", label: "Scaled" },
  { value: "clamped", label: "Clamped" },
  { value: "compressed", label: "Compressed" },
  { value: "direction-only", label: "Direction only" },
];

const COLOR_MODES: readonly Choice<VectorColorMode>[] = [
  { value: "fixed", label: "Fixed" },
  { value: "magnitude", label: "Magnitude" },
  { value: "log-magnitude", label: "Log magnitude" },
  { value: "direction", label: "Direction" },
  { value: "x-component", label: "x component" },
  { value: "y-component", label: "y component" },
];

const PALETTES: readonly Choice<ColorPalette>[] = [
  { value: "sequential-a", label: "Sequential (indigo)" },
  { value: "sequential-b", label: "Sequential (blue)" },
  { value: "blue-red", label: "Blue to red" },
  { value: "grayscale", label: "Grayscale" },
  { value: "direction-hue", label: "Hue wheel" },
];

const RANGE_MODES: readonly Choice<ColorRangeMode>[] = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

const ZERO_MODES: readonly Choice<ZeroVectorMode>[] = [
  { value: "hide", label: "Hide" },
  { value: "point", label: "Show as points" },
];

const SAMPLING_MODES: readonly Choice<SamplingMode>[] = [
  { value: "step", label: "Step" },
  { value: "count", label: "Count" },
];

const FLOW_COLOR_MODES: readonly Choice<FlowColorMode>[] = [
  { value: "speed", label: "Speed" },
  { value: "direction", label: "Direction" },
  { value: "fixed", label: "Fixed color" },
];

type ConfigGetter = () => VectorFieldConfig;

export class VectorToolsPanel extends Component<{
  vectorTools: () => VectorTools;
}> {
  template() {
    const vectorTools = this.props.vectorTools();
    const config: ConfigGetter = () => vectorTools.getConfig();
    const validation = () => vectorTools.validation;

    return (
      <div class="dcg-popover-interior dsm-vector-tools-menu">
        <div class="dcg-popover-title">{format("vector-tools-name")}</div>
        <p class="dsm-vector-tools-intro">
          Build a 2D vector field from standard Desmos expressions. Generated
          arrows stay editable in the expression list.
        </p>

        {fieldSection(vectorTools, config, validation)}
        {samplingSection(vectorTools, config, validation)}
        {appearanceSection(vectorTools, config)}
        {colorSection(vectorTools, config)}
        {flowSection(vectorTools, config)}
        {actionsSection(vectorTools, validation)}

        <If predicate={() => vectorTools.isTestLabVisible}>
          {() => testLab(vectorTools)}
        </If>
      </div>
    );
  }
}

function fieldSection(
  vectorTools: VectorTools,
  config: ConfigGetter,
  validation: () => VectorTools["validation"]
) {
  return (
    <section class="dsm-vector-tools-section">
      <h3>Field</h3>
      {textControl(
        "dsm-vector-tools-name",
        "Field name",
        () => config().name,
        (value) =>
          vectorTools.updateConfig((field) => {
            field.name = value;
          })
      )}
      <div class="dsm-vector-tools-math-row">
        <div>
          <label class="dsm-vector-tools-label">P(x, y)</label>
          <InlineMathInputViewGeneral
            containerClass={() => ({ "dsm-vector-tools-math-input": true })}
            placeholder="-y"
            ariaLabel="P of x and y"
            latex={() => config().components.xLatex}
            handleLatexChanged={(latex) => {
              vectorTools.setComponent("xLatex", latex);
              vectorTools.refreshFlow();
            }}
            hasError={() => hasIssue(validation().issues, "P(x,y)")}
            handleFocusChanged={(focused) =>
              vectorTools.updateFocus("p", focused)
            }
            isFocused={() => vectorTools.isFocused("p")}
            controller={vectorTools.cc}
            readonly={false}
          />
        </div>
        <div>
          <label class="dsm-vector-tools-label">Q(x, y)</label>
          <InlineMathInputViewGeneral
            containerClass={() => ({ "dsm-vector-tools-math-input": true })}
            placeholder="x"
            ariaLabel="Q of x and y"
            latex={() => config().components.yLatex}
            handleLatexChanged={(latex) => {
              vectorTools.setComponent("yLatex", latex);
              vectorTools.refreshFlow();
            }}
            hasError={() => hasIssue(validation().issues, "Q(x,y)")}
            handleFocusChanged={(focused) =>
              vectorTools.updateFocus("q", focused)
            }
            isFocused={() => vectorTools.isFocused("q")}
            controller={vectorTools.cc}
            readonly={false}
          />
        </div>
      </div>
    </section>
  );
}

function samplingSection(
  vectorTools: VectorTools,
  config: ConfigGetter,
  validation: () => VectorTools["validation"]
) {
  return (
    <section class="dsm-vector-tools-section">
      <h3>Sampling domain</h3>
      {axisControls(vectorTools, "x", config)}
      {axisControls(vectorTools, "y", config)}
      <div class="dsm-vector-tools-count">
        Estimated vectors:{" "}
        {() => validation().estimatedVectorCount.toLocaleString()}
      </div>
    </section>
  );
}

function appearanceSection(vectorTools: VectorTools, config: ConfigGetter) {
  const length = () => config().length;
  return (
    <section class="dsm-vector-tools-section">
      <h3>Arrow appearance</h3>
      {selectControl(
        "dsm-vector-tools-length-mode",
        "Length mode",
        () => length().mode,
        LENGTH_MODES,
        (value) => vectorTools.setLength("mode", value)
      )}
      {checkboxControl(
        "Auto target length from sampling spacing",
        () => length().autoLength,
        (checked) => vectorTools.setLength("autoLength", checked)
      )}
      <div class="dsm-vector-tools-number-grid">
        {numberControl(
          "dsm-vector-tools-target-length",
          "Target length",
          () => length().targetLength,
          (value) => vectorTools.setLength("targetLength", value),
          () => length().autoLength
        )}
        {numberControl(
          "dsm-vector-tools-scale",
          "Scale",
          () => length().scale,
          (value) => vectorTools.setLength("scale", value)
        )}
        {numberControl(
          "dsm-vector-tools-clamp-maximum",
          "Clamp maximum",
          () => length().maximumLength,
          (value) => vectorTools.setLength("maximumLength", value)
        )}
        {numberControl(
          "dsm-vector-tools-compression",
          "Compression",
          () => length().compression,
          (value) => vectorTools.setLength("compression", value)
        )}
        {numberControl(
          "dsm-vector-tools-arrowhead-size",
          "Arrowhead size",
          () => config().arrowhead.size,
          (value) => vectorTools.setArrowhead("size", value)
        )}
        {numberControl(
          "dsm-vector-tools-arrowhead-angle",
          "Arrowhead angle (rad)",
          () => config().arrowhead.angleRadians,
          (value) => vectorTools.setArrowhead("angleRadians", value)
        )}
      </div>
      {selectControl(
        "dsm-vector-tools-zero-mode",
        "Zero vectors",
        () => config().zeroVectorMode,
        ZERO_MODES,
        (value) => vectorTools.setZeroVectorMode(value)
      )}
    </section>
  );
}

function colorSection(vectorTools: VectorTools, config: ConfigGetter) {
  const color = () => config().color;
  return (
    <section class="dsm-vector-tools-section">
      <h3>Color</h3>
      {selectControl(
        "dsm-vector-tools-color-mode",
        "Color mode",
        () => color().mode,
        COLOR_MODES,
        (value) => vectorTools.setColor("mode", value)
      )}
      <div class="dsm-vector-tools-color-options">
        <label
          class="dsm-vector-tools-label"
          for="dsm-vector-tools-fixed-color"
        >
          Fixed color
        </label>
        <input
          id="dsm-vector-tools-fixed-color"
          type="color"
          value={() => color().fixedColor}
          onUpdate={(element: HTMLInputElement) => {
            if (document.activeElement !== element)
              element.value = color().fixedColor;
          }}
          onInput={(event: Event) =>
            vectorTools.setColor(
              "fixedColor",
              (event.target as HTMLInputElement).value
            )
          }
        />
        {selectControl(
          "dsm-vector-tools-palette",
          "Palette",
          () => color().palette,
          PALETTES,
          (value) => vectorTools.setColor("palette", value)
        )}
        {selectControl(
          "dsm-vector-tools-range-mode",
          "Color range",
          () => color().rangeMode,
          RANGE_MODES,
          (value) => vectorTools.setColor("rangeMode", value)
        )}
        <If predicate={() => color().rangeMode === "manual"}>
          {() => (
            <div class="dsm-vector-tools-number-grid">
              {numberControl(
                "dsm-vector-tools-range-minimum",
                "Range minimum",
                () => color().minimum,
                (value) => vectorTools.setColor("minimum", value)
              )}
              {numberControl(
                "dsm-vector-tools-range-maximum",
                "Range maximum",
                () => color().maximum,
                (value) => vectorTools.setColor("maximum", value)
              )}
            </div>
          )}
        </If>
      </div>
    </section>
  );
}

function flowSection(vectorTools: VectorTools, config: ConfigGetter) {
  const flow = () => config().flow;
  const compilation = () => vectorTools.flowCompilation;
  return (
    <section class="dsm-vector-tools-section dsm-vector-tools-flow">
      <h3>Flow visualization</h3>
      <p class="dsm-vector-tools-intro">
        Animates particles carried by the field, drawn over the graph paper. It
        reads the same P and Q you typed above, but it does not add expressions.
      </p>
      <div class="dsm-vector-tools-actions">
        <Button
          color={() => (vectorTools.isFlowRunning ? "light-gray" : "blue")}
          class="dsm-vector-tools-visualize"
          disabled={() => !compilation().ok}
          onTap={() => vectorTools.toggleFlow()}
        >
          {() =>
            vectorTools.isFlowRunning ? "Stop visualization" : "Visualize"
          }
        </Button>
      </div>
      <If predicate={() => !compilation().ok}>
        {() => (
          <div class="dsm-vector-tools-warning">
            {() => {
              const result = compilation();
              return result.ok ? "" : result.error;
            }}
          </div>
        )}
      </If>
      {selectControl(
        "dsm-vector-tools-flow-density",
        "Particle density",
        () => String(flow().particleResolution),
        FLOW_DENSITY_CHOICES.map((choice) => ({
          value: String(choice.resolution),
          label: choice.label,
        })),
        (value) => vectorTools.setFlow("particleResolution", Number(value))
      )}
      {selectControl(
        "dsm-vector-tools-flow-color",
        "Particle color",
        () => flow().colorMode,
        FLOW_COLOR_MODES,
        (value) => vectorTools.setFlow("colorMode", value)
      )}
      {checkboxControl(
        "Constant speed (follow streamlines evenly)",
        () => flow().normalizeSpeed,
        (checked) => vectorTools.setFlow("normalizeSpeed", checked)
      )}
      <div class="dsm-vector-tools-number-grid">
        {numberControl(
          "dsm-vector-tools-flow-speed",
          "Speed",
          () => flow().speed,
          (value) => vectorTools.setFlow("speed", value)
        )}
        {numberControl(
          "dsm-vector-tools-flow-trail",
          "Trail persistence",
          () => flow().trailPersistence,
          (value) => vectorTools.setFlow("trailPersistence", value)
        )}
        {numberControl(
          "dsm-vector-tools-flow-opacity",
          "Opacity",
          () => flow().opacity,
          (value) => vectorTools.setFlow("opacity", value)
        )}
        {numberControl(
          "dsm-vector-tools-flow-point-size",
          "Particle size",
          () => flow().pointSize,
          (value) => vectorTools.setFlow("pointSize", value)
        )}
      </div>
      <div class="dsm-vector-tools-status dsm-vector-tools-flow-status">
        {() => vectorTools.flowStatus}
      </div>
    </section>
  );
}

function actionsSection(
  vectorTools: VectorTools,
  validation: () => VectorTools["validation"]
) {
  return (
    <section class="dsm-vector-tools-section dsm-vector-tools-validation">
      {IfElse(() => validation().issues.length === 0, {
        true: () => (
          <div class="dsm-vector-tools-valid">Ready to generate.</div>
        ),
        false: () => (
          <div>
            <For
              each={() =>
                validation().issues.map((issue, index) => ({ ...issue, index }))
              }
              key={(issue: { index: number }) => issue.index}
            >
              {(getIssue: () => { level: string; message: string }) => (
                <div class={() => `dsm-vector-tools-${getIssue().level}`}>
                  {() => getIssue().message}
                </div>
              )}
            </For>
          </div>
        ),
      })}
      <div class="dsm-vector-tools-actions">
        <Button
          color="blue"
          class="dsm-vector-tools-generate"
          disabled={() => !validation().canGenerate}
          onTap={() => vectorTools.generateProduction()}
        >
          Generate field
        </Button>
        <Button
          color="light-gray"
          class="dsm-vector-tools-remove"
          onTap={() => vectorTools.removeProductionField()}
        >
          Remove field
        </Button>
        <Button
          color="light-gray"
          class="dsm-vector-tools-reset"
          onTap={() => vectorTools.resetConfig()}
        >
          Reset
        </Button>
      </div>
      {confirmationControls(vectorTools)}
      <div class="dsm-vector-tools-status">{() => vectorTools.message}</div>
    </section>
  );
}

function axisControls(
  vectorTools: VectorTools,
  axisName: "x" | "y",
  config: ConfigGetter
) {
  const axis = () => config().domain[axisName];
  return (
    <div class="dsm-vector-tools-axis" data-axis={axisName}>
      <div class="dsm-vector-tools-axis-heading">{axisName} axis</div>
      <div class="dsm-vector-tools-number-grid">
        {numberControl(
          `dsm-vector-tools-${axisName}-minimum`,
          "Minimum",
          () => axis().min,
          (value) => vectorTools.setAxis(axisName, "min", value)
        )}
        {numberControl(
          `dsm-vector-tools-${axisName}-maximum`,
          "Maximum",
          () => axis().max,
          (value) => vectorTools.setAxis(axisName, "max", value)
        )}
      </div>
      {selectControl(
        `dsm-vector-tools-${axisName}-sampling`,
        "Sampling by",
        () => axis().mode,
        SAMPLING_MODES,
        (value) => vectorTools.setAxis(axisName, "mode", value)
      )}
      {IfElse(() => axis().mode === "step", {
        true: () =>
          numberControl(
            `dsm-vector-tools-${axisName}-step`,
            "Step",
            () => axis().step,
            (value) => vectorTools.setAxis(axisName, "step", value)
          ),
        false: () =>
          numberControl(
            `dsm-vector-tools-${axisName}-count`,
            "Count",
            () => axis().count,
            (value) => vectorTools.setAxis(axisName, "count", Math.round(value))
          ),
      })}
    </div>
  );
}

/**
 * DCGView only re-reads a prop if it was passed as a function, and a `value`
 * attribute does not move a `<select>`'s selection anyway. `onUpdate` runs on
 * every render pass, which is the one place a control can be pushed back into
 * sync with the stored configuration.
 */
function selectControl<T extends string>(
  id: string,
  label: string,
  value: () => T,
  choices: readonly Choice<T>[],
  onChange: (value: T) => void
) {
  return (
    <div class="dsm-vector-tools-control">
      <label class="dsm-vector-tools-label" for={id}>
        {label}
      </label>
      <select
        id={id}
        onUpdate={(element: HTMLSelectElement) => {
          if (element.value !== value()) element.value = value();
        }}
        onChange={(event: Event) =>
          onChange((event.target as HTMLSelectElement).value as T)
        }
      >
        {choices.map((choice) => (
          <option
            value={choice.value}
            selected={() => choice.value === value()}
          >
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function numberControl(
  id: string,
  label: string,
  value: () => number,
  onChange: (value: number) => void,
  disabled: () => boolean = () => false
) {
  return (
    <label class="dsm-vector-tools-number" for={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        step="any"
        disabled={disabled}
        onUpdate={(element: HTMLInputElement) => {
          // Never fight the user mid-edit; only re-sync a field they left.
          if (document.activeElement !== element)
            element.value = String(value());
        }}
        onChange={(event: Event) => commitNumber(event, onChange)}
        onInput={(event: Event) => commitNumber(event, onChange)}
      />
    </label>
  );
}

function commitNumber(event: Event, onChange: (value: number) => void) {
  const raw = (event.target as HTMLInputElement).value;
  // An empty or half-typed value ("-", "1e") is not a number yet; leaving the
  // stored value alone lets the user finish typing.
  if (raw.trim() === "") return;
  const next = Number(raw);
  if (Number.isFinite(next)) onChange(next);
}

function textControl(
  id: string,
  label: string,
  value: () => string,
  onChange: (value: string) => void
) {
  return (
    <div class="dsm-vector-tools-control">
      <label class="dsm-vector-tools-label" for={id}>
        {label}
      </label>
      <input
        id={id}
        class="dsm-vector-tools-text-input"
        onUpdate={(element: HTMLInputElement) => {
          if (document.activeElement !== element) element.value = value();
        }}
        onInput={(event: Event) =>
          onChange((event.target as HTMLInputElement).value)
        }
      />
    </div>
  );
}

function checkboxControl(
  label: string,
  checked: () => boolean,
  onChange: (checked: boolean) => void
) {
  return (
    <label class="dsm-vector-tools-checkbox">
      <input
        type="checkbox"
        onUpdate={(element: HTMLInputElement) => {
          element.checked = checked();
        }}
        onChange={(event: Event) =>
          onChange((event.target as HTMLInputElement).checked)
        }
      />
      {label}
    </label>
  );
}

function confirmationControls(vectorTools: VectorTools) {
  return (
    <div class="dsm-vector-tools-confirmation">
      <If predicate={() => vectorTools.needsGenerationConfirmation}>
        {() => (
          <span>
            <span>High-density field:</span>
            <Button
              color="red"
              onTap={() => vectorTools.confirmPendingGeneration()}
            >
              Generate anyway
            </Button>
            <Button
              color="light-gray"
              onTap={() => vectorTools.cancelPendingGeneration()}
            >
              Cancel
            </Button>
          </span>
        )}
      </If>
    </div>
  );
}

function testLab(vectorTools: VectorTools) {
  return (
    <details class="dsm-vector-tools-test-lab">
      <summary>Developer Test Lab</summary>
      <p>
        Development-build only. Test expressions use their own namespace and are
        not stored as production settings.
      </p>
      {selectControl(
        "dsm-vector-tools-test-preset",
        "Preset field",
        () => vectorTools.selectedTestPreset.id,
        vectorTools.testPresets.map((preset) => ({
          value: preset.id,
          label: preset.name,
        })),
        (value) => vectorTools.setTestPreset(value)
      )}
      {selectControl(
        "dsm-vector-tools-test-density",
        "Density",
        () => vectorTools.selectedDensityPreset.id,
        vectorTools.densityPresets.map((density) => ({
          value: density.id,
          label: `${density.name} (${density.xCount} × ${density.yCount})`,
        })),
        (value) => vectorTools.setTestDensity(value)
      )}
      {selectControl(
        "dsm-vector-tools-test-length",
        "Length mode",
        () => vectorTools.currentTestLengthMode,
        LENGTH_MODES,
        (value) => vectorTools.setTestLengthMode(value)
      )}
      {selectControl(
        "dsm-vector-tools-test-color",
        "Color mode",
        () => vectorTools.currentTestColorMode,
        COLOR_MODES,
        (value) => vectorTools.setTestColorMode(value)
      )}
      <div class="dsm-vector-tools-actions">
        <Button color="blue" onTap={() => vectorTools.generateTestField()}>
          Run Test
        </Button>
        <Button color="light-gray" onTap={() => vectorTools.removeTestField()}>
          Remove Test
        </Button>
        <Button
          color="light-gray"
          onTap={() => {
            vectorTools.copyDiagnostics().then(
              () => undefined,
              () => undefined
            );
          }}
        >
          Copy diagnostics
        </Button>
      </div>
      {confirmationControls(vectorTools)}
      <div class="dsm-vector-tools-probes">
        <strong>Manual probes</strong>
        <For
          each={() =>
            vectorTools.selectedTestPreset.probes.map((probe, index) => ({
              probe,
              index,
            }))
          }
          key={(entry: { index: number }) => entry.index}
        >
          {(
            getEntry: () => {
              probe: { point: readonly number[]; expected: readonly number[] };
            }
          ) => (
            <div>
              {() => {
                const { point, expected } = getEntry().probe;
                return `(${point[0]}, ${point[1]}) → (${expected[0]}, ${expected[1]})`;
              }}
            </div>
          )}
        </For>
      </div>
      <div class="dsm-vector-tools-checklist">
        <strong>Manual QA checklist</strong>
        <For
          each={() => vectorTools.checklist}
          key={(item: { id: string }) => item.id}
        >
          {(getItem: () => { id: string; label: string; complete: boolean }) =>
            checkboxControl(
              getItem().label,
              () => getItem().complete,
              (checked) =>
                vectorTools.toggleChecklist(getItem().id as never, checked)
            )
          }
        </For>
      </div>
      {auditTable(vectorTools)}
    </details>
  );
}

function auditTable(vectorTools: VectorTools) {
  const audit = () => vectorTools.testAudit;
  return (
    <div class="dsm-vector-tools-audit">
      <strong>Expression audit</strong>
      <div class="dsm-vector-tools-audit-summary">
        {() => {
          const report = audit();
          if (
            report.folderMissing ||
            report.renderMissing ||
            report.namespaceCollision
          )
            return "Attention required";
          if (report.colorLatexMissing.length > 0)
            return "Mapped colors were dropped by the calculator";
          return "Structure looks correct";
        }}
      </div>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <For each={() => audit().rows} key={(row: { id: string }) => row.id}>
            {(
              getRow: () => {
                purpose: string;
                present: boolean;
                visibility: string;
              }
            ) => (
              <tr>
                <td>{() => getRow().purpose}</td>
                <td>
                  {() => (getRow().present ? getRow().visibility : "missing")}
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function hasIssue(issues: readonly { message: string }[], startsWith: string) {
  return issues.some((issue) => issue.message.startsWith(startsWith));
}

export function VectorToolsPanelFunc(vectorTools: VectorTools) {
  return <VectorToolsPanel vectorTools={() => vectorTools} />;
}
