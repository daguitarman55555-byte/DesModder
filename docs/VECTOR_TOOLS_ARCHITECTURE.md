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

`components/VectorToolsPanel.tsx` is a DCGView component. Three DCGView
behaviours shape how its controls are written, and each of them silently broke a
control before it was accounted for:

- DCGView only re-reads a prop that was passed as a **function**; a bare value is
  wrapped in `DCGView.const` and frozen at first render. Every control therefore
  takes getters, and anything whose DOM state cannot be expressed as an
  attribute is pushed back into the element from `onUpdate` on each render pass.
- DCGView writes props as **attributes**, and `disabled="false"` is still a
  disabled input in HTML. `disabled` is therefore never passed as a prop; the
  property is assigned in `onUpdate` instead. Passing it as a prop disabled every
  number field in the panel.
- Inputs are only re-synced while they do **not** hold focus, so a render
  triggered mid-edit cannot fight the user's typing.

The panel has no `<select>` elements. A native dropdown inside a scrolling
popover is awkward to hit and DCGView cannot drive its selection through props
anyway, so option lists are wrapping rows of one-click chips instead, and the
tab bar is DesModder's existing `SegmentedControl`.

Layout is a fixed title and tab bar, a scrolling body, and a fixed footer, so the
validation state and the Generate/Remove/Reset buttons never scroll away. The
panel itself is CSS-resizable; the pillbox popover is a fixed 290px wide, so the
plugin tags its own popover with a class that lets it size to the panel. Size is
persisted by reading the **inline** width and height, because a corner drag
writes those while a short window merely clamps the rendered box through
`max-height` — persisting the clamp would shrink the panel permanently.

Element IDs are namespaced per axis (`dsm-vector-tools-x-minimum`), because
duplicate IDs point `<label for>` at the wrong input.

## Components in the expression list

The two component definitions are ordinary expressions in the generated folder,
and the panel keeps them in sync in both directions. A dispatcher listener
watches `set-item-latex`, `undo`, `redo`, and `set-state`, and adopts a changed
definition only if its left-hand side still matches the function this field owns;
otherwise it reports that the link is broken rather than adopting an expression
that is no longer the field's component. Writes in the other direction use
`setExpression`, which merges into an existing expression and so leaves
`folderId` and `colorLatex` on the rest of the field alone.

## Flow visualizer

`flow/` holds the only rendering code in the plugin. It is a deliberate,
explicitly requested exception to the "no second renderer" rule, and it is
constrained so it cannot affect the graph it draws over: it owns one
`pointer-events: none` canvas, writes no expressions, touches no calculator
state, and is torn down when it is stopped or the plugin is disabled. See
[VECTOR_FLOW_VISUALIZER.md](VECTOR_FLOW_VISUALIZER.md).

Two of its constraints come from what it draws on rather than from what it
draws. It only registers with the 2D graph paper, so `flowAvailability` refuses
the 3D product before the field is even compiled; `/geometry` is the same graph
paper and needs nothing special. And particle _capacity_ is separated from
particle _count_: the count slider fires per pointermove, and the count owning
an allocation meant deleting and rebuilding two float textures once a frame for
the length of a drag.

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
