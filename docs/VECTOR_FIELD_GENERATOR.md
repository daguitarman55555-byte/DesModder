# 2D vector-field generator

## Using the production panel

Enable **Vector Tools** in DesModder, open its compass button, and enter the
two scalar components of the field:

- `P(x, y)` is the horizontal component.
- `Q(x, y)` is the vertical component.

Set the x and y domain endpoints, then sample each axis by either step or an
inclusive count. The panel shows the resulting vector estimate before it adds
anything to the graph. A typical rotational field is `P=-y`, `Q=x`.

Choose an arrow-length behavior appropriate to the field:

- **Actual** displays the raw component magnitude.
- **Normalized** and **Direction only** use a common arrow length.
- **Scaled** multiplies the raw vector.
- **Clamped** caps displayed length.
- **Compressed** applies a logarithmic compression.

Auto target length bases normalized arrow size on the sample spacing. Adjust
arrowhead size and angle independently. Zero vectors are either omitted or
shown as points.

Color may be fixed, magnitude, log magnitude, direction, x component, or y
component. Sequential, diverging, grayscale, and hue palettes are provided.
Magnitude-based modes can use the computed field range or a manually entered
range. Every mode other than fixed is applied by pointing the rendered
expressions' `colorLatex` at a generated color list, so the colors stay live if
you edit the field afterwards. The generated field remains an editable Desmos
folder after creation.

**Visualize** animates the same `P` and `Q` as flowing particles over the graph
without adding any expressions; see
[VECTOR_FLOW_VISUALIZER.md](VECTOR_FLOW_VISUALIZER.md).

## Safety behavior

Generation is blocked for invalid or incomplete components and invalid numeric
settings. A field above 2,500 vectors presents a second explicit confirmation;
one above 10,000 vectors is rejected. The generator uses a small epsilon in
normalization/color calculations and treats zero vectors separately.

**Remove field** removes only the current field namespace. It does not clear
the expression list and it never removes user-created expressions. Disabling
the plugin also does not remove generated fields.

Generating and removing are each a single undoable step, so Ctrl+Z reverses the
whole field at once. Regenerating rewrites the field where it already sits in
the expression list rather than moving it to the end.

## Expression structure

For a field ID `default`, generated IDs begin with
`vector_tools_vf_default_`. The folder contains hidden lists for x/y samples,
flattened grid points, P/Q functions, components, magnitude, direction,
display values, endpoints, and colors. Visible restricted parametric curves
draw shafts and two arrowhead wings; the optional zero-point expression is
visible only when that mode is selected. Re-running Generate updates the same
IDs rather than duplicating the field.
