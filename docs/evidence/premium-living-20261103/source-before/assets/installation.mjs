/* One persistent world: viewport-sized atmosphere, world-space camera travel.
   Section observers control foreground animation only; never particle pools. */
const root = document.querySelector('.hero--installation');
const world = document.querySelector('.installation-world');
if (root && world) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const compact = matchMedia('(max-width: 700px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const listeners = [], visible = new Set();
  const canvas = world.querySelector('canvas'), ctx = canvas.getContext('2d', {alpha:true});
  let raf=0, timer=0, pointerFrame=0, dead=false, leaving=false;
  let frames=0, last=0, elapsed=0, charge=0, w=1, h=1, scale=1;
  let scrollTarget=scrollY, cameraY=scrollY;
  const perspective={x:0,y:0,tx:0,ty:0};
  const on=(node,type,fn,options)=>{node?.addEventListener(type,fn,options);listeners.push(()=>node?.removeEventListener(type,fn,options));};
  const paused=()=>reduce.matches||forced.matches||document.hidden||leaving||document.documentElement.dataset.interfaceMotion==='paused';
  const sprite=document.createElement('canvas');sprite.width=sprite.height=32;
  const s=sprite.getContext('2d'), g=s.createRadialGradient(16,16,0,16,16,15);
  g.addColorStop(0,'#fff2d8');g.addColorStop(.13,'#f4a174');g.addColorStop(.3,'#c94838b0');g.addColorStop(1,'#9b211d00');s.fillStyle=g;s.fillRect(0,0,32,32);
  const haze=document.createElement('canvas');haze.width=512;haze.height=256;
  const hc=haze.getContext('2d');
  for(let i=0;i<24;i++){
    const x=(i*137)%512,y=(i*71)%256,r=35+(i*19)%90;
    const cloud=hc.createRadialGradient(x,y,0,x,y,r);
    cloud.addColorStop(0,i%3?'#79545c50':'#a86d682e');cloud.addColorStop(.45,'#482b3540');cloud.addColorStop(1,'#15101900');
    hc.fillStyle=cloud;hc.fillRect(0,0,512,256);
  }
  let seed=31;
  const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  // Pool identity survives scrolling, chapter changes, resizing and charging.
  const particles=Array.from({length:116},(_,id)=>({id,x:rand(),phase:rand(),speed:.014+rand()*.024,z:rand(),wave:rand()*6.28,life:.3+rand()*.65}));
  const count=()=>compact.matches?64:particles.length;
  function resize(){
    w=innerWidth;h=innerHeight;scale=Math.min(.75,1000/w,800/h);
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  }
  const objects=[...new Set(document.querySelectorAll('#start,#rdzen,[data-installation-object]'))];
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries){e.target.dataset.installationVisible=String(e.isIntersecting);if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target);}
  },{threshold:.01});
  objects.forEach(e=>observer.observe(e));
  function stop(){cancelAnimationFrame(raf);clearTimeout(timer);cancelAnimationFrame(pointerFrame);raf=timer=pointerFrame=0;last=0;}
  function draw(now){
    raf=0;if(paused()||dead)return;
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;elapsed+=dt;
    cameraY+=(scrollTarget-cameraY)*Math.min(1,dt*9);
    perspective.x+=(perspective.tx-perspective.x)*.09;perspective.y+=(perspective.ty-perspective.y)*.09;
    const depth=1-Math.exp(-Math.max(0,cameraY)/6500);
    // Far architecture, middle illumination and near ash have distinct rates,
    // all derived from the same unsegmented camera coordinate.
    world.style.setProperty('--world-scale',String(1+depth*.14));
    world.style.setProperty('--world-far-x',`${perspective.x*-4}px`);
    world.style.setProperty('--world-far-y',`${depth*-h*.065-perspective.y*3}px`);
    world.style.setProperty('--world-mid-x',`${perspective.x*-12}px`);
    world.style.setProperty('--world-mid-y',`${depth*-h*.12-perspective.y*7}px`);
    for(const e of visible){e.style.setProperty('--depth-near-x',`${perspective.x*3}deg`);e.style.setProperty('--depth-near-y',`${perspective.y*-2}deg`);}
    ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
    const t=elapsed, nearTravel=cameraY*.025;
    ctx.globalAlpha=.22;ctx.drawImage(haze,w*.1+Math.sin(t*.018)*w*.025-perspective.x*2,h*.08-depth*h*.03,w*.9,h*.65);
    ctx.globalAlpha=.2;ctx.drawImage(haze,w*-.1+Math.sin(t*.033+2)*w*.045-perspective.x*8,h*.36-depth*h*.07+Math.cos(t*.021)*h*.035,w*1.25,h*.5);
    ctx.globalAlpha=.13;ctx.drawImage(haze,w*.3+Math.cos(t*.047)*w*.055-perspective.x*18,h*.63-depth*h*.12,w*.95,h*.42);
    const heat=ctx.createRadialGradient(w*.87,h*.62,0,w*.87,h*.62,w*.48);
    heat.addColorStop(0,'#a2212426');heat.addColorStop(.4,'#77102116');heat.addColorStop(1,'#3b0a1400');
    ctx.globalAlpha=.7+Math.sin(t*.43)*.14;ctx.fillStyle=heat;ctx.fillRect(0,0,w,h);
    const energy=1+Math.max(0,(charge-now)/2100)*.6;
    for(let i=0;i<count();i++){
      const a=particles[i];
      const phase=((a.phase+t*a.speed+nearTravel*(.3+a.z*.7)/h)%1+1)%1;
      const fade=Math.sin(phase*Math.PI)*a.life;
      const x=w*(.03+a.x*.94)+Math.sin(t*.23+a.wave)*(8+a.z*14)-perspective.x*(3+a.z*18);
      const y=h*(1.1-phase*1.2), size=.6+a.z*1.9;
      ctx.globalAlpha=Math.min(1,fade*(.55+a.z*.5)*energy);
      ctx.drawImage(sprite,x-size*2,y-size*2,size*4,size*4);
      if(a.z>.78){ctx.strokeStyle='#ef9b7166';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+1,y+size*4);ctx.lineTo(x,y);ctx.stroke();}
    }
    ctx.globalAlpha=1;frames++;schedule();
  }
  function schedule(){if(!raf&&!timer&&!dead&&!paused())timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(draw);},1000/(compact.matches?18:24));}
  function sync(){if(paused()){stop();if(reduce.matches||forced.matches)ctx.clearRect(0,0,canvas.width,canvas.height);}else schedule();}
  const machine=document.querySelector('.hero-machine');let point=null;
  on(document,'pointermove',e=>{if(!fine.matches||paused()||e.pointerType==='touch')return;perspective.tx=e.clientX/innerWidth-.5;perspective.ty=e.clientY/innerHeight-.5;},{passive:true});
  on(machine,'pointermove',e=>{
    if(!fine.matches||paused()||e.pointerType==='touch')return;point={x:e.clientX,y:e.clientY};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;const b=machine.getBoundingClientRect();machine.style.setProperty('--machine-x',`${((point.y-b.top)/b.height-.5)*-7}deg`);machine.style.setProperty('--machine-y',`${((point.x-b.left)/b.width-.5)*9}deg`);});
  },{passive:true});
  on(machine,'pointerleave',()=>{cancelAnimationFrame(pointerFrame);pointerFrame=0;machine.style.removeProperty('--machine-x');machine.style.removeProperty('--machine-y');});
  on(window,'scroll',()=>{scrollTarget=scrollY;},{passive:true});
  on(window,'resize',()=>{resize();sync();},{passive:true});
  on(document,'progresskit:core-charge',()=>{charge=performance.now()+2100;schedule();});
  on(window,'progresskit:motionchange',sync);on(document,'visibilitychange',sync);on(reduce,'change',sync);on(forced,'change',sync);on(compact,'change',sync);
  function dispose(){if(dead)return;dead=true;stop();observer.disconnect();listeners.splice(0).forEach(f=>f());canvas.remove();}
  on(window,'pagehide',e=>{leaving=true;sync();if(!e.persisted)dispose();});on(window,'pageshow',()=>{leaving=false;scrollTarget=scrollY;sync();});
  root.installation={metrics:()=>({frames,pending:!!(raf||timer||pointerFrame),paused:paused(),visible:visible.size,canvasCount:dead?0:1,particles:count(),poolSize:particles.length,poolSignature:particles.map(p=>p.id).join(','),fpsLimit:compact.matches?18:24,disposed:dead,cameraY,depthRates:{far:.065,mid:.12,ash:.025},size:{width:canvas.width,height:canvas.height},coordinateSpace:'global-camera',sections:objects.map(e=>({id:e.id||e.className,visible:visible.has(e)}))}),dispose};
  resize();sync();
}
