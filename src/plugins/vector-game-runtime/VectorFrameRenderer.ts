export type FrameMode = "vectors" | "pixels";

const VERTEX = `#version 300 es
in vec2 a; out vec2 uv;
void main(){ uv=a*.5+.5; gl_Position=vec4(a,0,1); }`;
const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D frame; uniform vec2 size; uniform vec2 outputSize;
uniform float cellSize; uniform int mode;
in vec2 uv; out vec4 color;
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 vec2 suv=vec2(uv.x,1.-uv.y); vec3 raw=texture(frame,suv).rgb;
 if(mode==1){color=vec4(raw,1);return;}
 vec2 cells=max(vec2(1),outputSize/cellSize);
 vec2 id=floor(uv*cells), p=fract(uv*cells)-.5;
 vec2 q=(id+.5)/cells; q.y=1.-q.y; vec2 t=1./size;
 vec3 c=texture(frame,q).rgb;
 vec2 g=vec2(lum(texture(frame,q+vec2(t.x,0)).rgb)-lum(texture(frame,q-vec2(t.x,0)).rgb),
             lum(texture(frame,q+vec2(0,t.y)).rgb)-lum(texture(frame,q-vec2(0,t.y)).rgb));
 float e=clamp(lum(c)*1.25,0.,1.);
 vec2 d=length(g)>.002?normalize(vec2(-g.y,g.x)):vec2(cos(e*6.283),sin(e*6.283));
 vec2 n=vec2(-d.y,d.x); float along=dot(p,d), across=abs(dot(p,n));
 float halfLen=mix(.12,.48,sqrt(e));
 float glyph=(1.-smoothstep(.10,.18,across))*(1.-smoothstep(halfLen,halfLen+.05,abs(along)));
 color=vec4(mix(raw*.08,c,glyph),1);
}`;

function shader(gl: WebGL2RenderingContext, type: number, source: string) {
  const value = gl.createShader(type);
  if (value === null) throw new Error("Could not allocate shader.");
  gl.shaderSource(value, source); gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(value) ?? "Shader compilation failed.");
  return value;
}

export default class VectorFrameRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private width = 320; private height = 200;
  private mode: FrameMode = "vectors"; private cellSize = 4;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,depth:false});
    if(gl===null) throw new Error("WebGL2 is required."); this.gl=gl;
    const program = gl.createProgram();
    const texture = gl.createTexture();
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if(!program||!texture||!vao||!buffer) throw new Error("Could not allocate GPU resources.");
    this.program=program; this.texture=texture; this.vao=vao;
    const vs = shader(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.bindAttribLocation(program,0,"a");gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)??"Shader link failed.");
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }

  configure(mode: FrameMode, cellSize: number) { this.mode=mode; this.cellSize=Math.max(2,Math.min(12,cellSize)); }
  resize(w:number,h:number,ratio=devicePixelRatio){const r=Math.min(2,Math.max(1,ratio));this.canvas.width=Math.max(1,Math.round(w*r));this.canvas.height=Math.max(1,Math.round(h*r));}
  draw(source: HTMLCanvasElement){
    const {gl}=this;this.width=source.width;this.height=source.height;
    gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    const u=(n:string)=>gl.getUniformLocation(this.program,n);
    gl.uniform1i(u("frame"),0);gl.uniform2f(u("size"),this.width,this.height);gl.uniform2f(u("outputSize"),this.canvas.width,this.canvas.height);
    gl.uniform1f(u("cellSize"),this.cellSize);gl.uniform1i(u("mode"),this.mode==="pixels"?1:0);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  destroy(){this.gl.deleteTexture(this.texture);this.gl.deleteVertexArray(this.vao);this.gl.deleteProgram(this.program);}
}
