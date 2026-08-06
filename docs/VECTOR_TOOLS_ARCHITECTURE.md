# Vector Tools architecture

## Scope

Vector Tools is a disabled-by-default DesModder plugin for editable vector and
calculus visualizations. It has two independent halves:

- The **generator** turns a field configuration into an ordinary Desmos folder
  of ordinary expressions. It adds no canvas, renderer, external service, or
  custom expression evaluator.
- The **flow visualizer** animates the same field as GPU particles on a
  transparent canvas layered over the graph paper. It writes no expressions and
  is off unless the user presses **Visualize**.

The panel is opened from the existing DesModder pillbox. Enabling the plugin
only adds that entry point. It never generates a graph automatically, and
disabling it only removes the entry point and stops the visualizer—it
deliberately leaves generated Desmos content intact and useful.

## Configuration and persistence

`VectorFieldConfig` in `src/plugins/vector-tools/model.ts` is the only
persisted configuration format. It is plain JSON, has a `schemaVersion`, and
is stored in the current DesModder plugin-settings mechanism under the hidden
`serializedFieldConfig` setting. On load, the configuration is normalized to
the current schema; it is not used to regenerate a graph.

Validation occurs before generation. It checks scalar component fields, finite
domain and rendering parameters, sampling limits, fixed-color syntax, and a
manual color range. More than 2,500 vectors requires an explicit confirmation;
more than 10,000 is rejected. The sampling estimate is always based on the
effective step or count, rather than a UI-only value.

## Generator

`generator.ts` maps one configuration to a deterministic `VectorFieldPlan`.
Every ID begins with `vector_tools_vf_<field-id>_`, which enables stable update,
audit, and removal without relying on expression-list positions. The plan
contains a single generated folder, hidden helpers for the samples, flattened
grid, component functions, magnitudes, directions, display components, and
color list, plus visible restricted parametric curves for shafts and arrowhead
wings.

The grid is a Desmos Cartesian list comprehension. The configurable P(x, y)
and Q(x, y) fields are embedded only in namespaced helper functions. Arrow
length modes are calculated in expressions, including an epsilon-protected
normalization path so zero magnitudes cannot cause division by zero. Zero
vectors can be hidden or shown as point markers. Color values are standard
Desmos `rgb`/`hsv` list expressions and are applied to rendered expressions
through the existing item-color action.

## Adapter, ownership, and audit

`desmos/ExpressionAdapter.ts` is the sole calculator boundary, and every write
goes through `Calc.getState()`/`Calc.setState()`.

That choice is forced by Desmos rather than preferred: `setExpression` silently
drops both `folderId` and `colorLatex`, and the `set-item-colorLatex` action is
not handled by current Desmos builds. A field written through them lands outside
its folder and renders in one flat color no matter which color mode is selected.
Writing the whole set in one `setState` also makes generation atomic and
undoable in a single step, and keeps a regenerated field at its existing
position in the expression list instead of moving it to the end.

`applyGeneratedSet` validates every ID, color, and namespace membership before
it reads state, so a malformed plan cannot half-apply. It refuses to overwrite
an item inside the namespace whose type it does not expect, and it rebuilds
`expressions.list` by preserving every other item in order.

`removeGeneratedSet` accepts only a validated namespace and matches that exact
namespace or an underscore-delimited child ID. It cannot remove an unrelated
expression with a similar prefix. The generator also exposes an audit that
compares expected and present folder/expressions, reports missing render rows,
unexpected items, duplicate IDs, dropped `colorLatex`, and namespace collisions.
Audit reports are observational: they never claim mathematical correctness from
a guessed evaluation result.

## Panel

`components/VectorToolsPanel.tsx` is a DCGView component, and DCGView only
re-reads a prop that was passed as a function—a bare value is wrapped in
`DCGView.const` and frozen at first render. Every control therefore takes
getters, and controls whose DOM state cannot be expressed as an attribute use
`onUpdate` to push the stored value back into the element on each render pass:

- `<select>` has no working `value` attribute at all, so its selection is set
  imperatively.
- Number and text inputs are only re-synced when they do not hold focus, so a
  render triggered mid-edit does not fight the user's typing.

Element IDs are namespaced per axis (`dsm-vector-tools-x-minimum`), because
duplicate IDs point `<label for>` at the wrong input.

## Flow visualizer

`flow/` holds the only rendering code in the plugin. It is a deliberate,
explicitly requested exception to the "no second renderer" rule, and it is
constrained so it cannot affect the graph it draws over: it owns one
`pointer-events: none` canvas, writes no expressions, touches no calculator
state, and is torn down when it is stopped or the plugin is disabled. See
[VECTOR_FLOW_VISUALIZER.md](VECTOR_FLOW_VISUALIZER.md).

## Development Test Lab

The Test Lab is compiled into watch/development builds only through the
`DEV_BUILD` compile-time value. Release builds do not render it and no query
parameter or persistent setting can enable it. Its generated field uses the
separate `vector_tools_vf_test` namespace and its preset choice, density,
manual checklist, and diagnostics are session-only. See
[VECTOR_TOOLS_TEST_LAB.md](VECTOR_TOOLS_TEST_LAB.md) for its workflow.

## Extension points

Later vector, gradient, contour, and complex-plane tools should add a versioned
configuration plus a deterministic plan, then use the same adapter ownership
and audit rules. Any additional Desmos-internal integration should stay
isolated at the adapter boundary and be re-verified as Desmos or DesModder
changes.
