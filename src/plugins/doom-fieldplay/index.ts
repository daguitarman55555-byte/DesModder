import { PluginController } from "../PluginController";
import { DoomPanelFunc } from "./DoomPanel";
import DoomRuntime from "./DoomRuntime";
import "./doom-fieldplay.less";

export default class DoomFieldplay extends PluginController {
  static id = "doom-fieldplay" as const;
  static enabledByDefault = false;
  private runtime?: DoomRuntime;

  afterEnable() {
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-doom-fieldplay-menu",
      tooltip: "doom-fieldplay-name",
      iconClass: "dcg-icon-play",
      popup: () => DoomPanelFunc(this),
    });
  }

  afterConfigChange() {}

  afterDisable() {
    this.unmount();
    this.dsm.pillboxMenus?.removePillboxButton("dsm-doom-fieldplay-menu");
  }

  mount(element: HTMLElement) {
    this.unmount();
    this.runtime = new DoomRuntime(element);
  }

  unmount() {
    this.runtime?.destroy();
    this.runtime = undefined;
  }
}
