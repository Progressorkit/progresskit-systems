import {rooms,sampleJourney,drawArchitecture} from './world-journey.mjs';
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
  let stops=[],bays=[],zone=sampleJourney([],0);
  const measureJourney=()=>{stops=rooms.map(room=>{const node=document.getElementById(room.id);return node?{...room,at:Math.max(0,node.getBoundingClientRect().top+scrollY-innerHeight*.18)}:null;}).filter(Boolean);bays=[...document.querySelectorAll('.service-zone')].map(node=>{const b=node.getBoundingClientRect();return{node,bottom:b.bottom+scrollY};});};
  const canvas = world.querySelector('canvas'), ctx = canvas.getContext('2d', {alpha:true});
  let raf=0, timer=0, pointerFrame=0, dead=false, leaving=false;
  let frames=0, last=0, elapsed=0, charge=0, w=1, h=1, scale=1;
  let scrollTarget=scrollY, cameraY=scrollY;
  const perspective={x:0,y:0,tx:0,ty:0};
  const on=(node,type,fn,options)=>{node?.addEventListener(type,fn,options);listeners.push(()=>node?.removeEventListener(type,fn,options));};
  const updateBays=y=>{for(const b of bays)b.node.style.setProperty('--bay-visible',String(Math.max(0,Math.min(1,(b.bottom-y-innerHeight*.25)/(innerHeight*.4)))));};
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
  // Cached elliptical light on the polished floor; composited twice on
  // desktop in the existing canvas, never a new renderer or particle pool.
  const reflection=document.createElement('canvas');reflection.width=512;reflection.height=128;
  const rc=reflection.getContext('2d');rc.scale(4,1);
  const rg=rc.createRadialGradient(64,64,0,64,64,62);
  rg.addColorStop(0,'#bbc9e35c');rg.addColorStop(.22,'#8494b22e');rg.addColorStop(.6,'#78556416');rg.addColorStop(1,'#14101900');
  rc.fillStyle=rg;rc.fillRect(0,0,128,128);
  let seed=31;
  const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  // Pool identity survives scrolling, chapter changes, resizing and charging.
  const particles=Array.from({length:116},(_,id)=>({id,x:rand(),phase:rand(),speed:.014+rand()*.024,z:rand(),wave:rand()*6.28,life:.3+rand()*.65}));
  const count=()=>compact.matches?64:particles.length;
  // Smooth, bounded illumination changes with unrelated intervals. The room and
  // mounted objects stay still at idle; there is no periodic camera dolly/bob.
  const lightSample=(step,channel)=>{let value=Math.imul(step+channel*997,1597334677);value=Math.imul(value^(value>>>16),2246822519);return(value>>>0)/4294967295*2-1;};
  const lightDrift=(time,interval,channel)=>{const step=Math.floor(time/interval),u=time/interval-step,v=u*u*(3-2*u);return lightSample(step,channel)*(1-v)+lightSample(step+1,channel)*v;};
  function resize(){
    w=innerWidth;h=innerHeight;scale=Math.min(.75,1000/w,800/h);
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    measureJourney();
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
    const follow=1-Math.exp(-dt*5);
    perspective.x+=(perspective.tx-perspective.x)*follow;perspective.y+=(perspective.ty-perspective.y)*follow;
    const depth=1-Math.exp(-Math.max(0,cameraY)/6500);
    const desktopLiving=w>=1000&&fine.matches, t=elapsed;
    zone=sampleJourney(stops,cameraY);
    updateBays(cameraY);
    world.dataset.zone=zone.id;
    const ambience=lightDrift(t,23,1)*.025+lightDrift(t,47,2)*.015;
    const travel=desktopLiving?1:.38;
    // Far architecture, middle illumination and near ash have distinct rates,
    // all derived from the same unsegmented camera coordinate.
    world.style.setProperty('--world-scale',String(1+(zone.scale-1)*travel));
    world.style.setProperty('--world-far-x',`${zone.x*w*travel+perspective.x*(desktopLiving?-10:-4)}px`);
    world.style.setProperty('--world-far-y',`${zone.y*h*travel-perspective.y*4}px`);
    world.style.setProperty('--world-mid-x',`${zone.x*w*.3*travel+perspective.x*(desktopLiving?-24:-12)}px`);
    world.style.setProperty('--world-mid-y',`${depth*-h*.12-perspective.y*4}px`);
    if(desktopLiving){world.style.setProperty('--world-breath',String(.84+zone.heat*.08+ambience));world.style.setProperty('--world-specular-x',`${zone.x*w*.05+perspective.x*20}px`);}
    for(const e of visible){e.style.setProperty('--depth-near-x',`${perspective.x*1.5}deg`);e.style.setProperty('--depth-near-y',`${perspective.y*-1}deg`);e.style.setProperty('--core-light',String(.8+ambience));e.style.setProperty('--ember-light',String(.72+ambience));e.style.setProperty('--relief-light',String(.97+ambience*.4));if(desktopLiving){e.style.setProperty('--light-x',`${48+perspective.x*50}%`);e.style.setProperty('--light-y',`${35+perspective.y*40}%`);}}
    ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
    if(desktopLiving)drawArchitecture(ctx,w,h,zone,t,perspective.x,perspective.y);
    const nearTravel=cameraY*.025;
    ctx.globalAlpha=.22+ambience*.25;ctx.drawImage(haze,w*.1-perspective.x*2,h*.08-depth*h*.03,w*.9,h*.65);
    ctx.globalAlpha=desktopLiving? 0.42+zone.core*.13+ambience:.2;ctx.drawImage(haze,w*-.1-perspective.x*8,h*.36-depth*h*.07,w*1.25,h*.5);
    ctx.globalAlpha=desktopLiving? 0.34+lightDrift(t,37,3)*.02:.13;ctx.drawImage(haze,w*.3-perspective.x*(desktopLiving?24:12),h*.63-depth*h*.12,w*.95,h*.42);
    if(desktopLiving){
      ctx.globalAlpha=.56+lightDrift(t,31,4)*.025;ctx.drawImage(reflection,w*.33-perspective.x*12,h*(.78-depth*.03),w*.75,h*.18);
      ctx.globalAlpha=.32+lightDrift(t,41,5)*.02;ctx.drawImage(reflection,w*.57-perspective.x*6,h*.91,w*.42,h*.12);
    }
    const heat=ctx.createRadialGradient(w*.87,h*.62,0,w*.87,h*.62,w*.48);
    heat.addColorStop(0,desktopLiving?'#ae242e40':'#a2212426');heat.addColorStop(.4,'#77102116');heat.addColorStop(1,'#3b0a1400');
    ctx.globalAlpha=desktopLiving? 0.35+zone.heat*.8+ambience:.7+ambience*.5;ctx.fillStyle=heat;ctx.fillRect(0,0,w,h);
    const energy=1+Math.max(0,(charge-now)/2100)*.6;
    for(let i=0;i<count();i++){
      const a=particles[i];
      const phase=((a.phase+t*a.speed*(desktopLiving?1.55:1)+nearTravel*(.3+a.z*.7)/h)%1+1)%1;
      const fade=Math.sin(phase*Math.PI)*a.life;
      let x=w*(.03+a.x*.94)+lightDrift(t+a.wave*9,29+(i%13),i+7)*(3+a.z*5)-perspective.x*(3+a.z*18);
      let y=h*(1.1-phase*1.2);
      if(desktopLiving&&i>82&&zone.core>.05){const cx=w*(.5+(a.x-.5)*(.36+a.z*.28));x+=(cx-x)*zone.core;y+=(h*(.9-phase*.9)-y)*zone.core;}
      const size=(desktopLiving? 0.85:.6)+a.z*(desktopLiving?2.3:1.9);
      ctx.globalAlpha=Math.min(1,fade*(desktopLiving? 0.72+zone.heat*.2+a.z*.5:.55+a.z*.5)*energy);
      ctx.drawImage(sprite,x-size*2,y-size*2,size*4,size*4);
      if(a.z>.78){ctx.strokeStyle='#ef9b7166';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+1,y+size*4);ctx.lineTo(x,y);ctx.stroke();}
    }
    ctx.globalAlpha=1;frames++;schedule();
  }
  function schedule(){if(!raf&&!timer&&!dead&&!paused())timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(draw);},1000/(compact.matches?18:24));}
  function sync(){if(paused()){stop();if(reduce.matches||forced.matches)ctx.clearRect(0,0,canvas.width,canvas.height);}else schedule();}
  const machine=document.querySelector('.hero-machine');let point=null;
  on(document,'pointermove',e=>{if(!fine.matches||paused()||e.pointerType==='touch')return;perspective.tx=Math.max(-.5,Math.min(.5,e.clientX/innerWidth-.5));perspective.ty=Math.max(-.5,Math.min(.5,e.clientY/innerHeight-.5));},{passive:true});
  on(machine,'pointermove',e=>{
    if(!fine.matches||paused()||e.pointerType==='touch')return;point={x:e.clientX,y:e.clientY};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;const b=machine.getBoundingClientRect();machine.style.setProperty('--machine-x',`${Math.max(-.5,Math.min(.5,(point.y-b.top)/b.height-.5))*-3}deg`);machine.style.setProperty('--machine-y',`${Math.max(-.5,Math.min(.5,(point.x-b.left)/b.width-.5))*4}deg`);});
  },{passive:true});
  on(machine,'pointerleave',()=>{cancelAnimationFrame(pointerFrame);pointerFrame=0;if(paused())return;machine.style.removeProperty('--machine-x');machine.style.removeProperty('--machine-y');});
  on(window,'scroll',()=>{scrollTarget=scrollY;updateBays(scrollY);},{passive:true});
  on(window,'resize',()=>{resize();sync();},{passive:true});
  const journeyObserver=new ResizeObserver(measureJourney);journeyObserver.observe(document.querySelector('#main'));
  document.fonts.ready.then(()=>{if(!dead)measureJourney();});
  on(document,'progresskit:core-charge',()=>{charge=performance.now()+2100;schedule();});
  on(window,'progresskit:motionchange',sync);on(document,'visibilitychange',sync);on(reduce,'change',sync);on(forced,'change',sync);on(compact,'change',sync);
  function dispose(){if(dead)return;dead=true;stop();observer.disconnect();journeyObserver.disconnect();listeners.splice(0).forEach(f=>f());canvas.remove();}
  on(window,'pagehide',e=>{leaving=true;sync();if(!e.persisted)dispose();});on(window,'pageshow',()=>{leaving=false;scrollTarget=scrollY;sync();});
  root.installation={metrics:()=>({frames,pending:!!(raf||timer||pointerFrame),paused:paused(),visible:visible.size,canvasCount:dead?0:1,particles:count(),poolSize:particles.length,poolSignature:particles.map(p=>p.id).join(','),fpsLimit:compact.matches?18:24,disposed:dead,cameraY,elapsed,zone:{...zone},desktopLiving:w>=1000&&fine.matches,depthRates:{far:.065,mid:.12,ash:.025},size:{width:canvas.width,height:canvas.height},idleCameraMotion:false,coordinateSpace:'global-camera',sections:objects.map(e=>({id:e.id||e.className,visible:visible.has(e)}))}),dispose};
  resize();sync();
}
