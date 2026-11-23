import { Driver, clean, testWithPage } from "#tests";

/**
 * Syntax Highlighting used to look for the caret every 4 ms for as long as
 * it was on; it now follows the caret once a frame while something holds
 * focus. These pin what the poll did: the bracket around the caret is marked
 * while typing, follows the caret, and is cleared when focus leaves.
 */

const MARKED = '[data-contains-caret="true"]';

async function markedCount(driver: Driver) {
  return await driver.evaluate(
    (sel) => document.querySelectorAll(sel).length,
    MARKED
  );
}

testWithPage(
  "Syntax Highlighting marks the bracket around the caret, and clears it on blur",
  async (driver) => {
    await driver.enablePlugin("syntax-highlighting");
    await driver.setPluginSetting(
      "syntax-highlighting",
      "highlightBracketBlocks",
      true
    );
    await driver.focusIndex(0);
    await driver.keyboard.type("1+(2+3");
    await driver.page.waitForFunction(
      (sel) => document.querySelectorAll(sel).length === 1,
      { timeout: 3000 },
      MARKED
    );

    // Out of the bracket: nothing marked.
    await driver.keyboard.press("ArrowRight");
    await driver.page.waitForFunction(
      (sel) => document.querySelectorAll(sel).length === 0,
      { timeout: 3000 },
      MARKED
    );

    // Back in, then focus leaves the field: cleared, and stays cleared.
    await driver.keyboard.press("ArrowLeft");
    await driver.page.waitForFunction(
      (sel) => document.querySelectorAll(sel).length === 1,
      { timeout: 3000 },
      MARKED
    );
    await driver.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur()
    );
    await driver.page.waitForFunction(
      (sel) => document.querySelectorAll(sel).length === 0,
      { timeout: 3000 },
      MARKED
    );
    expect(await markedCount(driver)).toBe(0);

    await driver.clean();
    return clean;
  },
  20000
);
