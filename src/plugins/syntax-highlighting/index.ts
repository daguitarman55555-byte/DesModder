import { PluginController } from "../PluginController";
import { generateBracketPairColorizationCSS } from "./bracket-pair-colorization";
import { Config, configList } from "./config";
import "./index.less";

const bpcStyleSheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(bpcStyleSheet);

export default class SyntaxHighlighting extends PluginController<Config> {
  static id = "syntax-highlighting" as const;
  static enabledByDefault = false;
  static config = configList;

  caretBracketContainer: HTMLElement | null = null;
  mouseBracketContainer: HTMLElement | null = null;

  afterConfigChange(): void {
    this.resetHighlightedRanges();

    const bpcCss = generateBracketPairColorizationCSS(this.settings);
    void bpcStyleSheet.replace(bpcCss);
    bpcStyleSheet.disabled = !this.settings.bracketPairColorization;

    document.body.classList.toggle(
      "dsm-syntax-highlighting-underline-highlighted-ranges",
      this.settings.underlineHighlightedRanges
    );
  }

  resetHighlightedRanges() {
    this.changeCaretElement(null);
    this.changeMouseOverElement(null);
  }

  changeCaretElement(el: HTMLElement | null) {
    const oldcaretBracketContainer = this.caretBracketContainer;
    this.caretBracketContainer = el;

    if (oldcaretBracketContainer !== this.caretBracketContainer) {
      if (oldcaretBracketContainer)
        delete oldcaretBracketContainer.dataset.containsCaret;
      if (this.caretBracketContainer)
        this.caretBracketContainer.dataset.containsCaret = "true";
    }
  }

  changeMouseOverElement(el: HTMLElement | null) {
    delete this.mouseBracketContainer?.dataset.isDirectlyHovered;
    this.mouseBracketContainer = el;
    if (this.mouseBracketContainer)
      this.mouseBracketContainer.dataset.isDirectlyHovered = "true";
  }

  onMouseOver = (e: MouseEvent) => {
    if (!this.settings.highlightBracketBlocksHover) return;

    const el = e.target;

    if (!(el instanceof Element)) return;

    const closestMQBC = el.closest(".dcg-mq-bracket-container");
    this.changeMouseOverElement(closestMQBC as HTMLElement | null);
  };

  onKeyDown = () => {
    this.changeMouseOverElement(null);
  };

  onWheel = () => {
    this.changeMouseOverElement(null);
  };

  onClick = () => {
    this.changeMouseOverElement(null);
  };

  caretFrame: number | undefined = undefined;

  /**
   * Follows the caret once a frame, but only while some element on the page
   * holds focus. This was a `setInterval` with no delay — a document query
   * every 4 ms for as long as the plugin was on, whether or not anything was
   * being typed. MathQuill only draws a caret in a focused field, so with
   * nothing focused there is nothing to follow; the loop runs one last check
   * after focus leaves (which clears the highlight) and then stops.
   */
  followCaret = () => {
    this.caretFrame = undefined;
    if (this.settings.highlightBracketBlocks) {
      const cursor = document.querySelector(".dcg-mq-cursor");
      const newCursorEl = cursor?.closest(".dcg-mq-bracket-container");
      this.changeCaretElement((newCursorEl as HTMLElement | null) ?? null);
    }
    if (document.activeElement && document.activeElement !== document.body)
      this.caretFrame = requestAnimationFrame(this.followCaret);
  };

  onFocusChange = () => {
    this.caretFrame ??= requestAnimationFrame(this.followCaret);
  };

  afterEnable(): void {
    this.afterConfigChange();

    document.addEventListener("focusin", this.onFocusChange);
    document.addEventListener("focusout", this.onFocusChange);
    this.onFocusChange();

    document.addEventListener("mouseover", this.onMouseOver);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("wheel", this.onWheel);
    document.addEventListener("click", this.onClick);
  }

  afterDisable(): void {
    if (this.caretFrame !== undefined) cancelAnimationFrame(this.caretFrame);
    this.caretFrame = undefined;
    document.removeEventListener("focusin", this.onFocusChange);
    document.removeEventListener("focusout", this.onFocusChange);
    bpcStyleSheet.disabled = true;
    document.removeEventListener("mouseover", this.onMouseOver);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("click", this.onClick);
    this.resetHighlightedRanges();
  }
}
