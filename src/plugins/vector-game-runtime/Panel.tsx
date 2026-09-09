import { Component, jsx } from "#DCGView";
import type VectorGameRuntime from ".";

class Panel extends Component<{plugin:()=>VectorGameRuntime}> {
  template(){return <div class="dcg-popover-interior dsm-vgr-menu">
    <div class="dcg-popover-title">Vector Game Runtime</div>
    <div class="dsm-vgr-body" didMount={(e:HTMLElement)=>this.props.plugin().mount(e)} willUnmount={()=>this.props.plugin().unmount()}>
      <div data-vgr="stage" class="dsm-vgr-stage"><div data-vgr-placeholder="canvas"/></div>
      <div class="dsm-vgr-controls">
        <button data-vgr="mode" class="dcg-btn-light-gray">Vector field</button>
        <button data-vgr="fullscreen" class="dcg-btn-light-gray">Fullscreen</button>
        <button data-vgr="save" class="dcg-btn-light-gray">Save</button>
        <button data-vgr="load" class="dcg-btn-light-gray">Load</button>
      </div>
      <p data-vgr="status" class="dsm-vgr-status" role="status">Starting…</p>
      <p class="dsm-vgr-help">Click the view, then use WASD or arrow keys. Move the mouse to turn. Space, E, or left click activates the pulse.</p>
    </div>
  </div>;}
}
export const PanelFunc=(plugin:VectorGameRuntime)=><Panel plugin={()=>plugin}/>;
