import InputController from "./InputController";
import MazeDemoEngine from "./MazeDemoEngine";
import { loadState, saveState } from "./SaveStore";
import VectorFrameRenderer, { type FrameMode } from "./VectorFrameRenderer";

export default class Runtime {
  private readonly source=document.createElement("canvas");
  private readonly output=document.createElement("canvas");
  private readonly engine=new MazeDemoEngine();
  private readonly painter:VectorFrameRenderer;
  private input?:InputController;private frame?:number;private previous=0;private mode:FrameMode="vectors";

  constructor(private readonly root:HTMLElement){
    this.source.width=this.engine.width;this.source.height=this.engine.height;this.source.hidden=true;
    this.output.className="dsm-vgr-canvas";this.output.dataset.vgr="canvas";
    root.querySelector("[data-vgr-placeholder=canvas]")?.replaceWith(this.output);
    this.painter=new VectorFrameRenderer(this.output);this.bind();this.resize();void this.start();
  }
  destroy(){if(this.frame!==undefined)cancelAnimationFrame(this.frame);this.input?.destroy();this.engine.destroy();this.painter.destroy();}
  private find<T extends Element>(name:string){const e=this.root.querySelector<T>(`[data-vgr="${name}"]`);if(!e)throw new Error(`Missing control: ${name}`);return e;}
  private bind(){
    this.find<HTMLButtonElement>("mode").addEventListener("click",()=>{this.mode=this.mode==="vectors"?"pixels":"vectors";this.painter.configure(this.mode,4);this.find<HTMLButtonElement>("mode").textContent=this.mode==="vectors"?"Vector field":"Source pixels";});
    this.find<HTMLButtonElement>("fullscreen").addEventListener("click",()=>{ this.find<HTMLElement>("stage").requestFullscreen().catch(() => undefined); });
    this.find<HTMLButtonElement>("save").addEventListener("click",()=>{ saveState("demo",this.engine.serialize()).then(()=>this.status("Saved."),e=>this.status(String(e),true)).catch(() => undefined); });
    this.find<HTMLButtonElement>("load").addEventListener("click",()=>{ loadState("demo").then(s=>{if(!s)throw new Error("No save exists yet.");this.engine.restore(s);this.status("Save loaded.");},e=>this.status(String(e),true)).catch(() => undefined); });
    new ResizeObserver(()=>this.resize()).observe(this.find<HTMLElement>("stage"));
  }
  private async start(){await this.engine.start();this.input=new InputController(this.find<HTMLElement>("stage"));this.status("Running. Click the view to capture controls.");this.frame=requestAnimationFrame(this.draw);}
  private readonly draw=(time:number)=>{const dt=this.previous===0?0:Math.min(.05,(time-this.previous)/1000);this.previous=time;this.engine.step(dt,this.input?.sample()??{forward:0,strafe:0,turn:0,action:false});const context=this.source.getContext("2d");if(!context)throw new Error("Canvas 2D is unavailable.");this.engine.render(context);this.painter.draw(this.source);this.frame=requestAnimationFrame(this.draw);};
  private resize(){const r=this.find<HTMLElement>("stage").getBoundingClientRect();this.painter.resize(r.width,r.height);}
  private status(text:string,error=false){const e=this.find<HTMLElement>("status");e.textContent=text;e.classList.toggle("dsm-vgr-error",error);}
}
