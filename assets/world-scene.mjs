import * as THREE from './vendor/three/three.module.js';
/* One modest WebGL context. All geometry is local and pooled; no postprocessing. */
const canvas=document.querySelector('[data-world-scene]');
if(canvas) initialize().catch(()=>{canvas.dataset.sceneState='fallback';document.body.removeAttribute('data-scene-ready');});
async function initialize(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width:760px)');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile.matches?1.15:1.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,80);camera.position.set(0,.3,12.8);
  const core=new THREE.Group();scene.add(core);core.position.y=.45;
  const silver=new THREE.MeshStandardMaterial({color:0x969ba6,metalness:.92,roughness:.28});
  const dark=new THREE.MeshStandardMaterial({color:0x171a22,metalness:.86,roughness:.31});
  const edge=new THREE.MeshStandardMaterial({color:0xb6a8b8,metalness:.95,roughness:.2});
  const crimson=new THREE.MeshStandardMaterial({color:0x7c182e,metalness:.72,roughness:.3,emissive:0xa21a37,emissiveIntensity:.4});
  const hot=new THREE.MeshBasicMaterial({color:0xff5b6c});
  const glass=new THREE.MeshPhysicalMaterial({color:0x281724,metalness:.15,roughness:.14,transparent:true,opacity:.4,clearcoat:1,clearcoatRoughness:.16,side:THREE.DoubleSide,depthWrite:false});
  // Studio reflection cards live only in an environment texture, never extra contexts.
  const environment=new THREE.Scene();environment.background=new THREE.Color(0x15131a);
  function reflection(x,y,z,w,h,color,intensity=1){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.material.color.multiplyScalar(intensity);m.position.set(x,y,z);m.lookAt(0,0,0);environment.add(m);}
  reflection(-5,3,2,2,8,0xbccde8,2);reflection(5,2,1,1,7,0xe0dde3,2);reflection(0,6,0,9,1,0xffffff,3);reflection(0,-2,-5,8,3,0x7d1728,1);reflection(-1,3,6,7,3,0xc8ccda,1.4);
  let env;
  function reflectEnvironment(){
    env?.dispose();const pmrem=new THREE.PMREMGenerator(renderer);env=pmrem.fromScene(environment,.06);scene.environment=env.texture;pmrem.dispose();
    // Keep the tiny CPU-side reflection rig for context recovery; free its GPU resources.
    environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  }
  reflectEnvironment();
  scene.add(new THREE.HemisphereLight(0x9eacc7,0x24101c,2));
  const key=new THREE.DirectionalLight(0xe3e9ff,4.4);key.position.set(-4,6,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xb33340,2);rim.position.set(4,-1,3);scene.add(rim);
  const lamp=new THREE.PointLight(0xff3541,5,8,2);lamp.position.set(1,-1,1);scene.add(lamp);
  const ring=(radius,tube,material,arc=Math.PI*2)=>new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,Math.ceil(96*arc/(Math.PI*2)),arc),material);
  const bearing=ring(2.18,.105,dark);core.add(bearing);
  const rimRing=ring(2.2,.018,edge);rimRing.position.z=.1;core.add(rimRing);
  const rearRing=ring(1.97,.042,silver);rearRing.position.z=-.35;core.add(rearRing);
  const energy=ring(1.88,.023,hot);energy.position.z=-.08;core.add(energy);
  const inner=ring(1.73,.075,dark);inner.position.z=.08;core.add(inner);
  const glassFace=new THREE.Mesh(new THREE.CircleGeometry(1.7,64),glass);glassFace.position.z=.14;core.add(glassFace);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(1.72,1.8,.32,64,1,true),dark);hub.rotation.x=Math.PI/2;hub.position.z=-.17;core.add(hub);
  // Bevelled PK identity, built as real geometry and lit in the same assembly.
  const mark=new THREE.Group();mark.scale.setScalar(.91);mark.position.set(.15,0,.3);core.add(mark);
  const outerC=ring(1.47,.11,silver,Math.PI*1.44);outerC.rotation.z=.75;mark.add(outerC);
  const innerC=ring(1.15,.075,silver,Math.PI*1.34);innerC.rotation.z=.88;mark.add(innerC);
  const copper=ring(1.47,.115,crimson,.64);copper.rotation.z=.04;mark.add(copper);
  function extrude(shape,mat){const geo=new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:20});return new THREE.Mesh(geo,mat);}
  const p=new THREE.Shape();p.moveTo(-.38,-1.4);p.lineTo(-.38,1);p.lineTo(.18,1);p.bezierCurveTo(1.24,1,1.24,-.27,.18,-.27);p.lineTo(-.06,-.27);p.lineTo(-.06,-1.4);p.closePath();
  const hole=new THREE.Path();hole.moveTo(-.06,.68);hole.lineTo(.17,.68);hole.bezierCurveTo(.76,.68,.76,.05,.17,.05);hole.lineTo(-.06,.05);hole.closePath();p.holes.push(hole);mark.add(extrude(p,silver));
  const k=new THREE.Shape();k.moveTo(.02,-1.46);k.lineTo(.02,-.54);k.lineTo(.32,-.3);k.lineTo(.32,-.73);k.lineTo(1.04,.02);k.lineTo(1.45,.02);k.lineTo(.76,-.73);k.lineTo(1.56,-1.46);k.lineTo(1.07,-1.46);k.lineTo(.47,-.94);k.lineTo(.32,-1.1);k.lineTo(.32,-1.46);k.closePath();const km=extrude(k,silver);km.position.z=.06;mark.add(km);
  // Six machined segments slide radially on activation.
  const segments=[];
  for(let i=0;i<6;i++){const angle=i*Math.PI/3+.13;const mount=new THREE.Group();mount.rotation.z=angle;
    const shell=ring(2.02,.17,i%2?dark:silver,.73);shell.scale.z=.65;mount.add(shell);
    const trace=ring(2.13,.012,crimson,.66);trace.position.z=.14;mount.add(trace);
    const fastener=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,.05,8),edge);fastener.rotation.x=Math.PI/2;fastener.position.set(2.03,.1,.17);mount.add(fastener);core.add(mount);segments.push({mount,angle});
  }
  // Slim physical support beams ground the object in a continuous chamber.
  const stand=new THREE.Group();stand.position.set(0,-2.05,-.5);scene.add(stand);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.85,3.05,.14,80),dark);stand.add(plinth);
  const plinthEdge=ring(2.81,.015,crimson);plinthEdge.rotation.x=Math.PI/2;plinthEdge.position.y=.08;stand.add(plinthEdge);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.6,.23,64),dark);base.position.y=-.18;stand.add(base);
  for(const x of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(.07,1.8,.08),silver);arm.position.set(x*1.8,-1.1,-.5);arm.rotation.z=-x*.55;scene.add(arm);}
  // Etched plate: actual bump response, not a text-shadow emboss.
  const inscription=document.createElement('canvas');inscription.width=1024;inscription.height=128;const ctx=inscription.getContext('2d');ctx.fillStyle='#858585';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#202020';ctx.font='30px monospace';ctx.textAlign='center';ctx.fillText('P R O G R E S S K I T   /   S Y S T E M S',512,77);const bump=new THREE.CanvasTexture(inscription);
  const plaque=new THREE.Mesh(new THREE.BoxGeometry(2.5,.32,.05),new THREE.MeshStandardMaterial({color:0x5c5661,metalness:.9,roughness:.35,bumpMap:bump,bumpScale:.04}));plaque.position.set(0,-2.12,1.7);scene.add(plaque);
  // Fixed particle pool. No per-frame allocations or global CSS blur.
  const count=46;const positions=new Float32Array(count*3);const phases=new Float32Array(count);
  for(let i=0;i<count;i++){positions[i*3]=Math.sin(i*39.7)*4.8;positions[i*3+1]=Math.cos(i*17.4)*3;positions[i*3+2]=-1+Math.sin(i*3)*2;phases[i]=i*1.7;}
  const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const sparks=new THREE.Points(particleGeo,new THREE.PointsMaterial({color:0xff6a75,size:.027,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(sparks);
  // A second, tiny pool flashes only on approach or activation (240 ms).
  const dischargePositions=new Float32Array(12*3),dischargeOrigins=new Float32Array(12*3),dischargeVelocities=new Float32Array(12*3);
  const dischargeGeo=new THREE.BufferGeometry();dischargeGeo.setAttribute('position',new THREE.BufferAttribute(dischargePositions,3));
  const dischargeMaterial=new THREE.PointsMaterial({color:0xffb4a4,size:.04,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  const discharge=new THREE.Points(dischargeGeo,dischargeMaterial);discharge.visible=false;discharge.frustumCulled=false;core.add(discharge);
  let px=0,py=0,near=0,active=0,targetActive=document.body.dataset.coreState==='active'?1:0,inView=false,paused=reduce.matches||document.body.dataset.motion==='paused',raf=0,last=0,frames=0,stopped=false,pageActive=true,dischargeAt=-Infinity,discharges=0;
  const canDraw=()=>inView&&!document.hidden&&pageActive&&!stopped;
  function emitDischarge(now,angle){
    if(paused||!canDraw()||now-dischargeAt<700)return;
    dischargeAt=now;discharge.visible=true;canvas.dataset.dischargeCount=String(++discharges);
    const amount=mobile.matches?6:12;dischargeGeo.setDrawRange(0,amount);
    for(let i=0;i<amount;i++){
      const j=i*3,a=angle+(i%3-1)*.035,speed=.7+(i%4)*.38;
      dischargeOrigins[j]=Math.cos(a)*2.16;dischargeOrigins[j+1]=Math.sin(a)*2.16;dischargeOrigins[j+2]=.2;
      dischargeVelocities[j]=Math.cos(a+(i%5-2)*.28)*speed;dischargeVelocities[j+1]=Math.sin(a+(i%5-2)*.28)*speed;dischargeVelocities[j+2]=.2+(i%3)*.3;
    }
  }
  function clearPresence(){px=0;py=0;near=0;discharge.visible=false;canvas.dataset.proximity='far';}
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
    const pixelRatio=Math.min(devicePixelRatio,mobile.matches?1.15:1.35);if(renderer.getPixelRatio()!==pixelRatio)renderer.setPixelRatio(pixelRatio);
    renderer.setSize(r.width,r.height,false);particleGeo.setDrawRange(0,mobile.matches?18:46);camera.aspect=r.width/r.height;camera.position.z=mobile.matches?13.9:11.4;camera.updateProjectionMatrix();if(canDraw())draw(performance.now(),true);
  }
  const resizer=new ResizeObserver(resize);resizer.observe(canvas);
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.03});observer.observe(canvas);
  function draw(now,once=false){
    if(!canDraw())return;const t=now*.001;
    const movement=paused?0:1;
    active+=(targetActive-active)*.08;
    if(paused)active=targetActive;
    core.rotation.set(.1+py*.11,.28+px*.18,Math.sin(t*.22)*.018*movement);
    core.position.y=.4+Math.sin(t*.7)*.045*movement;
    mark.rotation.z=Math.sin(t*.25)*.018*movement;
    segments.forEach(({mount,angle},i)=>{const separation=active*.42+near*.025;mount.position.set(Math.cos(angle+.35)*separation,Math.sin(angle+.35)*separation,Math.sin(t*.7+i)*.012*movement);});
    lamp.intensity=3+active*4+near*1.8+Math.sin(t*1.5)*.5*movement;crimson.emissiveIntensity=.35+active*.55+near*.3;
    energy.scale.setScalar(1+active*.025);energy.material.color.setHSL(.99,.7,.4+active*.12);
    if(!paused){for(let i=0;i<(mobile.matches?18:count);i++){positions[i*3+1]=((t*.12+phases[i])%6)-2.7;positions[i*3]+=Math.sin(t+phases[i])*.0004;}particleGeo.attributes.position.needsUpdate=true;}
    if(discharge.visible){const age=(now-dischargeAt)/1000;if(paused||age>=.24)discharge.visible=false;else{
      dischargeMaterial.opacity=(1-age/.24)*.9;
      for(let i=0;i<dischargeGeo.drawRange.count;i++){const j=i*3;dischargePositions[j]=dischargeOrigins[j]+dischargeVelocities[j]*age;dischargePositions[j+1]=dischargeOrigins[j+1]+dischargeVelocities[j+1]*age-age*age*2;dischargePositions[j+2]=dischargeOrigins[j+2]+dischargeVelocities[j+2]*age;}
      dischargeGeo.attributes.position.needsUpdate=true;
    }}
    renderer.render(scene,camera);frames++;canvas.dataset.frames=String(frames);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.motion=paused?'paused':inView?'running':'offscreen';
    canvas.dataset.sceneState='ready';document.body.setAttribute('data-scene-ready','');
    if(!once)last=now;
  }
  function loop(now){raf=0;if(!canDraw()||paused)return;const interval=1000/30,elapsed=now-last;if(elapsed>=interval){draw(now);last=now-(elapsed%interval);}raf=requestAnimationFrame(loop);}
  function schedule(){if(raf)cancelAnimationFrame(raf);raf=0;if(canDraw()){if(paused)draw(performance.now(),true);else raf=requestAnimationFrame(loop);}canvas.dataset.motion=!pageActive||document.hidden?'hidden':!inView?'offscreen':paused?'paused':'running';}
  canvas.parentElement.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||paused||!canDraw())return;const r=canvas.getBoundingClientRect();px=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));py=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));const previous=near;near=Math.max(0,1-Math.hypot(px,py)*1.5);if(near>.2&&previous<=.2)emitDischarge(performance.now(),Math.atan2(-py,px));canvas.dataset.proximity=near>.7?'near':near>.2?'reflection':'far';},{passive:true});
  canvas.parentElement.addEventListener('pointerleave',clearPresence);
  document.addEventListener('progresskit:core',event=>{targetActive=event.detail.active?1:0;if(targetActive)emitDischarge(performance.now(),.6);if(paused)draw(performance.now(),true);});
  document.addEventListener('progresskit:motion',event=>{paused=reduce.matches||event.detail.paused;if(paused)clearPresence();schedule();});
  reduce.addEventListener('change',()=>{paused=reduce.matches||document.body.dataset.motion==='paused';if(paused)clearPresence();schedule();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPresence();schedule();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stopped=true;clearPresence();schedule();canvas.dataset.sceneState='fallback';document.body.removeAttribute('data-scene-ready');});
  canvas.addEventListener('webglcontextrestored',()=>{try{reflectEnvironment();stopped=false;resize();schedule();}catch{canvas.dataset.sceneState='fallback';}});
  window.addEventListener('pagehide',()=>{pageActive=false;clearPresence();schedule();},{passive:true});
  window.addEventListener('pageshow',()=>{pageActive=true;resize();schedule();},{passive:true});
  // Initialization can finish while restored scroll places the Core offscreen.
  // The first render remains deferred until visible; fallback is hidden in draw().
  canvas.dataset.sceneState='ready';resize();schedule();
}
