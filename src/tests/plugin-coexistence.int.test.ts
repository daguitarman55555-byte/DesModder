import { testWithPage } from "./puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

/**
 * Vector Tools and Audio Lab are separate plugins that happen to share one
 * expression list and one pillbox. Nothing in either one's own tests can catch
 * them standing on each other, so this belongs to neither and lives here.
 *
 * The hazard is concrete rather than theoretical. Vector Tools writes its field
 * by rebuilding the whole expression list through `setState`, which is the only
 * Desmos API that round-trips the properties a generated field needs — so
 * anything it fails to carry across is deleted. Audio Lab writes two snapshot
 * expressions of its own into that same list.
 */

const VECTOR_BUTTON = ".dsm-action-menu .dsm-icon-compass2";
const AUDIO_BUTTON = ".dsm-action-menu .dcg-icon-play";
const GENERATE = ".dsm-vector-tools-generate";
const REMOVE = ".dsm-vector-tools-remove";
const NAMESPACE = "vector_tools_vf_default";
const WAVEFORM = "audio_lab_waveform";
const SPECTRUM = "audio_lab_spectrum";

testWithPage(
  "Vector Tools and Audio Lab share a graph without disturbing each other",
  async (driver) => {
    // Audio Lab is enabled by default; Vector Tools is not.
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(VECTOR_BUTTON);
    await driver.assertSelectorEventually(AUDIO_BUTTON);

    const ids = async () =>
      (await driver.getState()).expressions.list.map((item) => item.id);

    // Stand in for a snapshot, using the exact IDs Audio Lab writes. Calling
    // into its runtime would need tab capture and a Spotify session; what
    // matters here is that two expressions with those IDs survive.
    await driver.evaluate(
      (waveform, spectrum) => {
        Calc.setExpressions([
          { id: waveform, latex: "\\left(1,2\\right)" },
          { id: spectrum, latex: "\\left(3,4\\right)" },
        ]);
      },
      WAVEFORM,
      SPECTRUM
    );
    await driver.waitForSync();
    expect(await ids()).toEqual(expect.arrayContaining([WAVEFORM, SPECTRUM]));

    // Generating a field rebuilds the expression list. Audio Lab's two items
    // are outside the field's namespace, so they must come through untouched.
    await driver.click(VECTOR_BUTTON);
    await driver.click(GENERATE);
    await driver.waitForSync();
    const afterGenerate = await ids();
    expect(afterGenerate).toEqual(expect.arrayContaining([WAVEFORM, SPECTRUM]));
    expect(
      afterGenerate.filter((id) => id?.startsWith(`${NAMESPACE}_`))
    ).toHaveLength(20);

    // And removing the field takes only the field.
    await driver.click(REMOVE);
    await driver.waitForSync();
    const afterRemove = await ids();
    expect(afterRemove).toEqual(expect.arrayContaining([WAVEFORM, SPECTRUM]));
    expect(
      afterRemove.filter((id) => id?.startsWith(`${NAMESPACE}_`))
    ).toHaveLength(0);

    // Turning one off leaves the other alone, in the menu as well as the graph.
    await driver.disablePlugin("vector-tools");
    await driver.assertSelectorNot(VECTOR_BUTTON);
    await driver.assertSelectorEventually(AUDIO_BUTTON);
    expect(await ids()).toEqual(expect.arrayContaining([WAVEFORM, SPECTRUM]));

    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);
