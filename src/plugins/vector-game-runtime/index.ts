import { PluginController } from "../PluginController";
import { PanelFunc } from "./Panel";
import Runtime from "./Runtime";
import "./style.less";

export default class VectorGameRuntime extends PluginController {
  static id="vector-game-runtime" as const;
  static enabledByDefault=false;
  private runtime?:Runtime;
  afterEnable(){this.dsm.pillboxMenus?.addPillboxButton({id:"dsm-vector-game-runtime",tooltip:"vector-game-runtime-name",iconClass:"dcg-icon-play",popup:()=>PanelFunc(this)});}
  afterConfigChange(){}
  afterDisable(){this.unmount();this.dsm.pillboxMenus?.removePillboxButton("dsm-vector-game-runtime");}
  mount(element:HTMLElement){this.unmount();this.runtime=new Runtime(element);}
  unmount(){this.runtime?.destroy();this.runtime=undefined;}
}
