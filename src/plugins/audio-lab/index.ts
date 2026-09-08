import type { ConfigItem } from "..";
import { PluginController } from "../PluginController";
import { AudioLabPanelFunc } from "./AudioLabPanel";

interface AudioLabSettings {
  spotifyUrl: string;
}

const POPOVER_CLASS = "dsm-audio-lab-popover";

export default class AudioLab extends PluginController<AudioLabSettings> {
  static id = "audio-lab" as const;
  static enabledByDefault = false;
  static config = [
    {
      type: "string",
      variant: "text",
      default: "",
      key: "spotifyUrl",
      shouldShow: () => false,
    },
  ] satisfies readonly ConfigItem[];

  private panelElement?: HTMLElement;

  get spotifyUrl() {
    return this.settings.spotifyUrl;
  }

  afterEnable() {
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-audio-lab-menu",
      tooltip: "audio-lab-name",
      iconClass: "dcg-icon-play",
      popup: () => AudioLabPanelFunc(this),
    });
  }

  afterDisable() {
    this.detachPanelElement();
    this.dsm.pillboxMenus?.removePillboxButton("dsm-audio-lab-menu");
  }

  afterConfigChange() {
    this.util.tick();
  }

  setSpotifyUrl(url: string) {
    this.dsm.setPluginSetting("audio-lab", "spotifyUrl", url);
  }

  attachPanelElement(element: HTMLElement) {
    this.panelElement = element;
    element.closest(".dsm-pillbox-popover")?.classList.add(POPOVER_CLASS);
  }

  detachPanelElement() {
    this.panelElement
      ?.closest(`.${POPOVER_CLASS}`)
      ?.classList.remove(POPOVER_CLASS);
    this.panelElement = undefined;
  }
}
