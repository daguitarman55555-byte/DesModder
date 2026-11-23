import { Driver, clean, testWithPage } from "#tests";

/**
 * Multiline used to poll its queue every 4 ms for as long as it was on; it
 * now arms a timer when something is queued. These pin what the poll did:
 * a long expression is broken onto lines once editing has paused, and not
 * while the user is still typing.
 */

const LONG = String.raw`\left[${Array.from({ length: 60 }, (_, i) => `${i}`).join(",")}\right]`;

async function autoBreaks(driver: Driver) {
  return await driver.evaluate(
    () => document.querySelectorAll("[data-is-auto-line-break]").length
  );
}

testWithPage(
  "Multiline breaks a long expression once editing pauses",
  async (driver) => {
    await driver.enablePlugin("multiline");
    await driver.setPluginSetting(
      "multiline",
      "multilinifyDelayAfterEdit",
      2000
    );
    await driver.focusIndex(0);
    await driver.setLatexAndSync(LONG);

    // Straight after the edit, inside the delay: not yet.
    expect(await autoBreaks(driver)).toBe(0);

    // After it, without anything else happening: broken onto lines.
    await driver.page.waitForFunction(
      () => document.querySelectorAll("[data-is-auto-line-break]").length > 0,
      { timeout: 6000 }
    );

    await driver.clean();
    return clean;
  },
  20000
);

testWithPage(
  "Multiline leaves no timer running once disabled",
  async (driver) => {
    await driver.enablePlugin("multiline");
    await driver.setPluginSetting(
      "multiline",
      "multilinifyDelayAfterEdit",
      300
    );
    await driver.focusIndex(0);
    await driver.setLatexAndSync(LONG);
    await driver.disablePlugin("multiline");
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Disabling un-breaks everything; a timer that outlived the plugin
    // would have broken it again.
    expect(await autoBreaks(driver)).toBe(0);

    await driver.clean();
    return clean;
  },
  20000
);
