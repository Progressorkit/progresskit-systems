/* One GPU layer behind the artifact: a translucent field and batched branching filaments. */
(() => {
  'use strict';
  const sphereVertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const sphereFragment=`
    precision highp float;
    varying vec2 vUv;
    uniform vec2 uSize;
    uniform float uRadius,uTime,uPulse;
    void main(){
      vec2 p=(vUv-.5)*2.;p.x*=uSize.x/uSize.y;
      float radius=uRadius*(1.+uPulse*.025),r=length(p)/radius;
      if(r>=1.)discard;
      float z=sqrt(max(0.,1.-r*r));
      float interior=.5+.5*sin(p.x*18.+uTime*.29)*sin(p.y*15.-uTime*.21+z*8.);
      float rim=pow(1.-z,2.4);
      float alpha=(.32+z*.33)*(1.-smoothstep(.975,1.,r));
      vec3 color=vec3(.220,.0035,.0200)*(1.+z*.45+interior*.16);
      color+=vec3(.22,.003,.021)*rim;
      vec3 normal=vec3(p/radius,z);
      float hemisphere=.38+.62*max(0.,dot(normal,normalize(vec3(-.55,.35,.75))));
      color*=hemisphere;
      color+=vec3(.035,.0004,.0025)*uPulse*z;
      gl_FragColor=vec4(color*alpha,alpha);
    }
  `;
  const filamentVertex=`
    precision highp float;
    attribute vec4 aPosition,aPrevious,aNext;
    attribute vec3 aRoot,aInfo;
    uniform vec2 uSize,uCssSize,uCursor,uTarget;
    uniform mat3 uRotation;
    uniform float uTime,uRadius,uPulse,uActive,uTargetActive,uGlow;
    varying float vEdge,vAlpha,vHot,vBranch;
    vec3 curve(vec4 node){
      float t=node.w,seed=aInfo.x;
      float cycle=uTime*(.041+seed*.039)+seed*17.9;
      float epoch=floor(cycle);
      vec3 root=uRotation*aRoot;
      vec3 p=uRotation*node.xyz;
      vec3 n=normalize(root);
      vec3 tangent=normalize(vec3(-n.y,n.x,n.z*.16)+vec3(.001,0.,0.));
      vec3 bitangent=cross(n,tangent);
      float phase=seed*53.7+epoch*4.73;
      float tip=smoothstep(.02,.9,t);
      p+=(tangent*sin(t*9.3+uTime*.57+phase)*.018+bitangent*sin(t*15.1-uTime*.39+phase*.73)*.010)*tip;
      p=root+(p-root)*(1.+uPulse*.68);
      vec2 cursor=vec2(uCursor.x,-uCursor.y);
      float attention=pow(max(0.,dot(normalize(n.xy+vec2(.001)),normalize(cursor+vec2(.001)))),5.)*min(1.,length(cursor));
      p.xy+=cursor*attention*tip*.085;
      p*=uRadius;
      vec2 target=vec2(uTarget.x*uSize.x/uSize.y,-uTarget.y);
      vec2 direction=normalize(target+vec2(.001));
      float sector=smoothstep(.76,.985,dot(normalize(n.xy+vec2(.001)),direction));
      sector*=smoothstep(.18,.52,length(n.xy))*uTargetActive;
      vec2 spread=vec2(sin(seed*87.1),cos(seed*61.3))*uRadius*.17;
      vec2 side=vec2(-direction.y,direction.x);
      vec3 origin=root*uRadius;
      vec3 destination=vec3(target+spread,0.);
      vec3 guided=mix(origin,destination,t);
      guided.xy+=side*sin(t*3.14159265)*uRadius*(sin(seed*49.)*.29);
      guided.xy+=side*sin(t*15.+phase)*uRadius*.022*tip;
      p=mix(p,guided,sector*smoothstep(.04,.96,t));
      return p;
    }
    vec2 project(vec3 p){vec2 q=p.xy*(1.+.14*p.z/uRadius);q.x/=uSize.x/uSize.y;return q;}
    void main(){
      vec3 current=curve(aPosition),before=curve(aPrevious),after=curve(aNext);
      vec2 point=project(current),delta=(project(after)-project(before))*uCssSize;
      vec2 normal=normalize(vec2(-delta.y,delta.x)+vec2(.00001,0.));
      float depth=clamp(current.z/uRadius,-1.,1.);
      float width=mix(.78,3.5,uGlow)*(1.-aInfo.z*.16)*(1.+uPulse*.14);
      vec2 offset=normal*width*2./uCssSize*aInfo.y;
      gl_Position=vec4(point+offset,0.,1.);
      float cycle=uTime*(.041+aInfo.x*.039)+aInfo.x*17.9;
      float life=fract(cycle+aInfo.z*.047);
      float envelope=smoothstep(.015,.14,life)*(1.-smoothstep(.80,.995,life));
      float depthLight=.27+.73*smoothstep(-.85,.85,depth);
      float shimmer=.83+.17*sin(uTime*.91+aInfo.x*71.+aInfo.z*1.3);
      vAlpha=envelope*depthLight*shimmer*(.65+aInfo.x*.65)*(1.+uPulse*.36+uActive*.13);
      vEdge=aInfo.y;vHot=step(.974,aInfo.x)*smoothstep(.18,.75,aPosition.w);vBranch=aInfo.z;
    }
  `;
  const filamentFragment=`
    precision highp float;
    uniform float uGlow,uPulse;
    varying float vEdge,vAlpha,vHot,vBranch;
    void main(){
      float edge=abs(vEdge);
      float halo=exp(-edge*edge*3.4)*vAlpha*.16;
      float core=(1.-smoothstep(.055,.235,edge))*vAlpha;
      vec3 deep=vec3(.47,.0045,.024),bright=vec3(.91,.015,.047);
      vec3 color=mix(deep,bright,clamp(vAlpha*.72,0.,1.));
      color=mix(color,vec3(1.,.55,.52),vHot*.68);
      // Premultiplied halo + fine core in one ribbon pass, not two vertex passes.
      float alpha=halo+core*(1.-halo);
      vec3 emission=vec3(.43,.003,.019)*halo+color*core*(1.-halo);
      gl_FragColor=vec4(emission,alpha);
    }
  `;

  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const unit=a=>{const n=Math.hypot(...a)||1;return mul(a,1/n);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const cubic=(a,b,c,d,t)=>{const u=1-t;return [0,1,2].map(i=>u*u*u*a[i]+3*u*u*t*b[i]+3*u*t*t*c[i]+t*t*t*d[i]);};
  function geometry(compact){
    const roots=compact?144:360,mainSegments=compact?18:24,branchSegments=compact?10:14;
    const data=new Float32Array(roots*(mainSegments+branchSegments*2)*6*18);
    let offset=0,randomSeed=0x5f237b19;
    const random=()=>{randomSeed^=randomSeed<<13;randomSeed^=randomSeed>>>17;randomSeed^=randomSeed<<5;return (randomSeed>>>0)/4294967296;};
    const write=(points,along,root,seed,branch,index,side)=>{
      for(const p of [Math.max(0,index),Math.max(0,index-1),Math.min(points.length-1,index+1)]){
        data[offset++]=points[p][0];data[offset++]=points[p][1];data[offset++]=points[p][2];data[offset++]=along[p];
      }
      data[offset++]=root[0];data[offset++]=root[1];data[offset++]=root[2];
      data[offset++]=seed;data[offset++]=side;data[offset++]=branch;
    };
    const ribbon=(points,along,root,seed,branch)=>{
      for(let i=0;i<points.length-1;i++)for(const [index,side] of [[i,-1],[i,1],[i+1,-1],[i+1,-1],[i,1],[i+1,1]])write(points,along,root,seed,branch,index,side);
    };
    for(let i=0;i<roots;i++){
      const y=1-2*(i+.5)/roots,radial=Math.sqrt(1-y*y),theta=i*2.399963229728653;
      const normal=[Math.cos(theta)*radial,y,Math.sin(theta)*radial];
      const tangent=unit(cross(normal,Math.abs(y)<.9?[0,1,0]:[1,0,0])),bitangent=cross(normal,tangent);
      const seed=random(),layer=i%7===0 ? .64+random()*.20 : .965+random()*.035;
      const root=mul(normal,layer),length=.025+Math.pow(random(),3.5)*.30;
      const returning=random()<.72,sign=random()<.5?-1:1,turn=(.045+random()*.21)*sign;
      const endNormal=unit(add(add(normal,mul(tangent,turn)),mul(bitangent,turn*.34)));
      const end=mul(endNormal,layer+(returning?0:length*.82));
      const controlA=add(add(root,mul(normal,length*.92)),mul(tangent,length*.49*sign));
      const controlB=add(add(end,mul(normal,length*.48)),mul(bitangent,length*.37*sign));
      const points=[],along=[];
      for(let j=0;j<=mainSegments;j++){
        const t=j/mainSegments,p=cubic(root,controlA,controlB,end,t),window=Math.sin(t*Math.PI);
        const ripple=(Math.sin(t*11.7+seed*37)*.065+Math.sin(t*22.1+seed*19)*.017)*length*window;
        points.push(add(p,add(mul(tangent,ripple),mul(bitangent,Math.sin(t*15.3+seed*23)*length*.033*window))));along.push(t);
      }
      ribbon(points,along,root,seed,0);
      for(let branch=1;branch<=2;branch++){
        const at=Math.floor(mainSegments*(branch===1 ? .29 : .62)),start=points[at],base=along[at];
        const forward=unit(add(points[at+1],mul(points[at-1],-1)));
        const branchLength=length*(.28+random()*.35)+.035;
        const direction=unit(add(add(forward,mul(tangent,(branch===1?1:-1)*(.5+random()))),mul(normal,.55)));
        const finish=add(start,mul(direction,branchLength));
        const a=add(start,mul(forward,branchLength*.44)),b=add(finish,mul(bitangent,branchLength*.28*sign));
        const branchPoints=[],branchAlong=[];
        for(let j=0;j<=branchSegments;j++){
          const t=j/branchSegments,p=cubic(start,a,b,finish,t);
          branchPoints.push(add(p,mul(bitangent,Math.sin(t*12.7+seed*31)*branchLength*.065*Math.sin(t*Math.PI))));
          branchAlong.push(base+(1-base)*t*.86);
        }
        ribbon(branchPoints,branchAlong,root,seed,branch);
      }
    }
    return {data,vertices:offset/18,strands:roots*3};
  }

  function create(canvas){
    let mode='fallback',gl=null,sphere=null,filaments=null,quad=null,strands=null,vertices=0;
    let timer=0,disposed=false,lost=false,elapsed=0,lastTick=0,pulseAt=-100,pulseStrength=0;
    let width=0,height=0,cssWidth=0,cssHeight=0,smoothX=0,smoothY=0,smoothActive=0,smoothTarget=0;
    let scale=1,averageFrame=0,qualityFrames=0,needsRedraw=true,resizePending=false,smoothTargetX=0,smoothTargetY=0;
    const state={running:false,compact:false,reduced:false,x:0,y:0,active:false,target:null};
    const clamp=value=>Math.max(-1,Math.min(1,Number(value)||0));
    const dispatch=(type,reason)=>canvas?.dispatchEvent(new CustomEvent(type,{bubbles:true,detail:{reason}}));
    function setMode(next,reason){mode=next;if(canvas){canvas.dataset.matterRenderer=next;if(next==='fallback')canvas.dataset.matterFilaments='0';}queueMicrotask(()=>{if(!disposed)dispatch(next==='webgl'?'progresskit:matter-ready':'progresskit:matter-fallback',reason);});}
    function stop(){clearTimeout(timer);timer=0;lastTick=0;}
    function disposeResources(){if(!gl||lost)return;for(const item of [sphere,filaments])if(item)gl.deleteProgram(item.program);for(const item of [quad,strands])if(item)gl.deleteBuffer(item);sphere=filaments=quad=strands=null;}
    function compile(vertex,fragment,names){
      const shaders=[];let program=null;
      try{
        for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
          const shader=gl.createShader(type);if(!shader)throw new Error('shader allocation');shaders.push(shader);
          gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('shader compilation');
        }
        program=gl.createProgram();shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('shader linking');
        const uniforms={};names.forEach(name=>{uniforms[name]=gl.getUniformLocation(program,name);});return {program,uniforms};
      }catch(error){if(program)gl.deleteProgram(program);throw error;}finally{shaders.forEach(shader=>gl.deleteShader(shader));}
    }
    function buildStrands(){
      if(!gl||lost||!strands)return;
      const result=geometry(state.compact);vertices=result.vertices;
      gl.bindBuffer(gl.ARRAY_BUFFER,strands);gl.bufferData(gl.ARRAY_BUFFER,result.data,gl.STATIC_DRAW);
      canvas.dataset.matterFilaments=String(result.strands);needsRedraw=true;
    }
    function boot(){
      if(disposed||!canvas)return false;
      try{
        gl=gl||canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
        if(!gl){setMode('fallback','unavailable');return false;}
        sphere=compile(sphereVertex,sphereFragment,['uSize','uRadius','uTime','uPulse']);
        filaments=compile(filamentVertex,filamentFragment,['uSize','uCssSize','uCursor','uTarget','uRotation','uTime','uRadius','uPulse','uActive','uTargetActive','uGlow']);
        quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        strands=gl.createBuffer();buildStrands();
        gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
        width=height=0;setMode('webgl','ready');resizeBuffer();return true;
      }catch{disposeResources();setMode('fallback','initialization');return false;}
    }
    function resizeBuffer(){
      if(mode!=='webgl'||lost||disposed)return false;
      cssWidth=canvas.clientWidth;cssHeight=canvas.clientHeight;if(!cssWidth||!cssHeight)return false;
      const limit=(state.compact?600:900)*scale,ratio=Math.min(window.devicePixelRatio||1,1,limit/cssWidth,limit/cssHeight);
      const nextWidth=Math.max(1,Math.round(cssWidth*ratio)),nextHeight=Math.max(1,Math.round(cssHeight*ratio));
      if(width!==nextWidth||height!==nextHeight){width=nextWidth;height=nextHeight;canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);needsRedraw=true;}
      canvas.dataset.matterQuality=state.compact?'compact':'full';canvas.dataset.matterScale=scale.toFixed(2);resizePending=false;return true;
    }
    function bindAttributes(program,buffer,attributes,stride){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for(let i=0;i<5;i++)gl.disableVertexAttribArray(i);
      for(const [name,size,offset] of attributes){const location=gl.getAttribLocation(program,name);if(location<0)continue;gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,stride,offset);}
    }
    function draw(still=false){
      if(mode!=='webgl'||lost||disposed||!width||!height)return;
      const now=performance.now(),rawDt=lastTick?(now-lastTick)/1000:1/24,dt=Math.min(.20,rawDt);lastTick=now;
      if(!still){elapsed+=dt;averageFrame=averageFrame?averageFrame*.92+rawDt*.08:rawDt;qualityFrames++;}
      const ease=1-Math.exp(-dt*3.8);
      smoothX+=((still?0:state.x)-smoothX)*ease;smoothY+=((still?0:state.y)-smoothY)*ease;
      smoothActive+=((state.active?1:0)-smoothActive)*ease;smoothTarget+=((state.active&&state.target?1:0)-smoothTarget)*ease;
      const age=elapsed-pulseAt,pulse=still||age>2.1?0:pulseStrength*Math.sin(Math.min(1,age/.20)*Math.PI*.5)*Math.exp(-age*1.8);
      const radiusPx=state.compact?Math.min(cssWidth*.39,135):Math.min(cssWidth*.34,230),radius=radiusPx/(cssHeight*.5);
      const targetEase=still?1:1-Math.exp(-dt*8.0);
      smoothTargetX+=((state.target?.x||0)-smoothTargetX)*targetEase;smoothTargetY+=((state.target?.y||0)-smoothTargetY)*targetEase;
      const time=elapsed+9.7;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(sphere.program);bindAttributes(sphere.program,quad,[['aPosition',2,0]],8);
      const su=sphere.uniforms;gl.uniform2f(su.uSize,width,height);gl.uniform1f(su.uRadius,radius);gl.uniform1f(su.uTime,time);gl.uniform1f(su.uPulse,pulse);gl.drawArrays(gl.TRIANGLES,0,6);
      gl.useProgram(filaments.program);bindAttributes(filaments.program,strands,[['aPosition',4,0],['aPrevious',4,16],['aNext',4,32],['aRoot',3,48],['aInfo',3,60]],72);
      const fu=filaments.uniforms,angle=time*.018,c=Math.cos(angle),s=Math.sin(angle);
      gl.uniformMatrix3fv(fu.uRotation,false,new Float32Array([c,0,-s,0,1,0,s,0,c]));
      gl.uniform2f(fu.uSize,width,height);gl.uniform2f(fu.uCssSize,cssWidth,cssHeight);
      gl.uniform2f(fu.uCursor,still?0:smoothX,still?0:smoothY);gl.uniform2f(fu.uTarget,smoothTargetX,smoothTargetY);
      gl.uniform1f(fu.uTime,time);gl.uniform1f(fu.uRadius,radius);gl.uniform1f(fu.uPulse,pulse);
      gl.uniform1f(fu.uActive,still?(state.active?1:0):smoothActive);gl.uniform1f(fu.uTargetActive,still?(state.active&&state.target?1:0):smoothTarget);
      gl.uniform1f(fu.uGlow,1);gl.drawArrays(gl.TRIANGLES,0,vertices);needsRedraw=false;
      // Back off resolution, not strand count, when a software GPU cannot keep pace.
      if(!still&&qualityFrames>=18){
        const budget=1/(state.compact?15:24);
        if(averageFrame>budget*1.8&&scale>.66){scale=Math.max(.66,scale*.86);resizePending=true;}
        qualityFrames=0;
      }
    }
    function tick(){timer=0;if(disposed||lost||mode!=='webgl'||!state.running||state.reduced){lastTick=0;return;}const start=performance.now();if(resizePending)resizeBuffer();draw();timer=setTimeout(tick,Math.max(1,1000/(state.compact?15:24)-(performance.now()-start)));}
    function setState(next={}){
      if(disposed)return;const before={...state};
      for(const key of ['running','compact','reduced','active'])if(key in next)state[key]=Boolean(next[key]);
      if('x'in next)state.x=clamp(next.x);if('y'in next)state.y=clamp(next.y);
      if('target'in next)state.target=next.target&&Number.isFinite(next.target.x)&&Number.isFinite(next.target.y)?{x:Math.max(-2,Math.min(2,next.target.x)),y:Math.max(-2,Math.min(2,next.target.y))}:null;
      if(state.compact!==before.compact){scale=1;averageFrame=0;qualityFrames=0;buildStrands();resizeBuffer();}
      if(!state.running||state.reduced)stop();if(mode!=='webgl')return;
      const targetChanged=state.target?.x!==before.target?.x||state.target?.y!==before.target?.y;
      if(state.reduced){if(!before.reduced||state.active!==before.active||state.compact!==before.compact||targetChanged){if(resizeBuffer())draw(true);}}
      else if(state.running&&!timer){if(resizeBuffer())tick();}
      else if(!state.running&&(needsRedraw||state.active!==before.active||targetChanged)){if(resizeBuffer())draw(true);}
    }
    function activate(strength=1){if(disposed||state.reduced||!state.running)return;pulseAt=elapsed;pulseStrength=Math.max(0,Math.min(1,Number(strength)||0));if(!timer&&mode==='webgl')tick();}
    function resize(){if(disposed||mode!=='webgl')return;resizeBuffer();if(state.reduced||(!state.running&&needsRedraw))draw(true);else if(state.running&&!timer)tick();}
    function onLost(event){event.preventDefault();lost=true;stop();setMode('fallback','contextlost');}
    function onRestored(){if(disposed)return;lost=false;sphere=filaments=quad=strands=null;if(boot()){if(state.reduced||!state.running)draw(true);else tick();}}
    function destroy(){if(disposed)return;stop();disposeResources();disposed=true;canvas?.removeEventListener('webglcontextlost',onLost);canvas?.removeEventListener('webglcontextrestored',onRestored);}
    canvas?.addEventListener('webglcontextlost',onLost,false);canvas?.addEventListener('webglcontextrestored',onRestored,false);boot();
    return {get mode(){return mode;},setState,activate,resize,destroy};
  }
  window.ProgressKitMatter=Object.freeze({create});
})();
