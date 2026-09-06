# Vector Tools Developer Test Lab

## Availability

The Test Lab is intentionally present only in development/watch builds. It is
controlled by the compile-time `DEV_BUILD` value, not a URL flag, plugin
setting, or local-storage preference. A normal production build has no Test
Lab control or backdoor.

## Workflow

Expand **Developer Test Lab** in the Vector Tools panel and select a known
preset field, density, length mode, and color mode. The presets cover
rotational, radial, inward radial, saddle, horizontal/vertical uniform,
nonlinear trigonometric, zero, decaying vortex, and mixed-magnitude fields.
Small, medium, large, and warning densities give fast coverage of both normal
and confirmation-required generation.

Click **Run Test** to produce only the `vector_tools_vf_test` namespace.
**Remove Test** removes that namespace only. Test choices and the manual QA
checklist are session state, never production field configuration.

## Audit and manual checks

The audit lists every expected helper and render expression and reports its
presence and visibility, as well as missing visible geometry, duplicate IDs,
unexpected namespace items, a missing folder, or a namespace collision. It also
reports rendered rows whose `colorLatex` the calculator dropped, which is the
symptom of a field that silently renders in one flat color. It does not
evaluate arbitrary user LaTex and does not label a test as passing when that
evaluation is unreliable.

Instead, the lab displays exact manual probe expectations for the selected
preset and a manual checklist for direction, zero behavior, color behavior,
and responsiveness. **Copy diagnostics** exports a sanitized JSON report with
the test configuration, validation result, structural audit, checklist state,
extension version, and browser user agent. It deliberately excludes graph
state and other user expressions.
