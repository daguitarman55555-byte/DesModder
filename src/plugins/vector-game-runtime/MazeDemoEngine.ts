import type { GameEngine, GameInputState } from "./GameEngine";

const MAP = [
  "111111111111",
  "100000000001",
  "101101110101",
  "100100010001",
  "110101011101",
  "100001000001",
  "101111011101",
  "100000000001",
  "111111111111",
];
const W=320,H=200;

export default class MazeDemoEngine implements GameEngine {
  readonly width=W; readonly height=H;
  private x=2.5;private y=2.5;private angle=0;private pulse=0;

  async start() {}
  step(dt:number,input:GameInputState){
    this.angle+=input.turn*Math.min(dt,0.05)*3.2;
    const speed=Math.min(dt,0.05)*2.2;
    const dx=(Math.cos(this.angle)*input.forward+Math.cos(this.angle+Math.PI/2)*input.strafe)*speed;
    const dy=(Math.sin(this.angle)*input.forward+Math.sin(this.angle+Math.PI/2)*input.strafe)*speed;
    if(!this.wall(this.x+dx,this.y))this.x+=dx;if(!this.wall(this.x,this.y+dy))this.y+=dy;
    this.pulse=Math.max(0,this.pulse-dt*2);if(input.action)this.pulse=1;
  }
  render(ctx:CanvasRenderingContext2D){
    const image=ctx.createImageData(W,H), data=image.data;
    for(let column=0;column<W;column++){
      const ray=this.angle+(column/W-.5)*Math.PI/3;
      let distance=.02,hit=false;
      while(distance<20&&!hit){distance+=.025;hit=this.wall(this.x+Math.cos(ray)*distance,this.y+Math.sin(ray)*distance);}
      const corrected=distance*Math.cos(ray-this.angle), wallHeight=Math.min(H,Math.floor(H/corrected));
      const top=Math.floor((H-wallHeight)/2), bottom=top+wallHeight;
      for(let row=0;row<H;row++){
        const i=(row*W+column)*4;let r=5,g=10,b=20;
        if(row<top){const t=row/H;r=8;g=18+Math.floor(t*30);b=38+Math.floor(t*45);}
        else if(row<bottom){const shade=Math.max(25,210-Math.floor(corrected*22));r=Math.floor(shade*(.35+this.pulse*.25));g=Math.floor(shade*(.72+this.pulse*.18));b=shade;}
        else{const t=(row-bottom)/Math.max(1,H-bottom);r=10+Math.floor(t*12);g=18+Math.floor(t*16);b=24+Math.floor(t*18);}
        data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;
      }
    }
    ctx.putImageData(image,0,0);
    ctx.fillStyle="#fff";ctx.font="11px sans-serif";ctx.fillText("VECTOR MAZE · find the open corridors",8,16);
    ctx.strokeStyle=this.pulse>0?"#ffd166":"#79d8ff";ctx.beginPath();ctx.moveTo(154,100);ctx.lineTo(166,100);ctx.moveTo(160,94);ctx.lineTo(160,106);ctx.stroke();
  }
  serialize(){const state=new Float64Array([this.x,this.y,this.angle]);return new Uint8Array(state.buffer.slice(0));}
  restore(bytes:Uint8Array){if(bytes.byteLength!==24)throw new Error("This save is invalid.");const s=new Float64Array(bytes.slice().buffer);[this.x,this.y,this.angle]=s;}
  destroy(){}
  private wall(x:number,y:number){const row=MAP[Math.floor(y)];return row===undefined||row[Math.floor(x)]!=="0";}
}
