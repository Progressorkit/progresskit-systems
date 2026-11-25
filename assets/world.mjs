/* Shared installation behavior. Native links remain navigable without JavaScript. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const body = document.body;
let pulseTimer, pulseFrame=0, manualPause=false, pageActive=true;
const effectsPaused=()=>manualPause||reduce.matches||document.hidden||!pageActive;
function cancelPulse(){clearTimeout(pulseTimer);cancelAnimationFrame(pulseFrame);pulseFrame=0;body.classList.remove('world-pulse');}
export function pulse() {
  if (effectsPaused()) return;
  cancelPulse();
  pulseFrame=requestAnimationFrame(() => { pulseFrame=0;if(effectsPaused())return;body.classList.add('world-pulse'); pulseTimer = setTimeout(() => body.classList.remove('world-pulse'), 220); });
}
const activate = document.querySelector('[data-core-activate]');
activate?.addEventListener('click', event => {
  body.dataset.coreState = 'active';
  activate.setAttribute('aria-pressed','true');
  activate.querySelector('[data-core-label]').textContent = 'Pokaż projekty';
  document.dispatchEvent(new CustomEvent('progresskit:core', {detail:{active:true,keyboard:event.detail===0}}));
});
const motion = document.querySelector('[data-motion-toggle]');
function updateMotion() {
  const paused = manualPause || reduce.matches;
  body.dataset.motion = paused ? 'paused' : 'running';
  motion?.setAttribute('aria-pressed', String(paused));
  if (motion) motion.textContent = reduce.matches ? 'Ograniczony ruch' : paused ? 'Wznów ruch' : 'Wstrzymaj ruch';
  if(paused){cancelPulse();resetProximity();}
  document.dispatchEvent(new CustomEvent('progresskit:motion', {detail:{paused}}));
}
motion?.addEventListener('click', () => { if (!reduce.matches) { manualPause = !manualPause; updateMotion(); } });
// One event-driven proximity pass. Visible controls share optical coordinates;
// no idle animation frame or layout polling is kept alive by this module.
const targetSelector = '[data-proximity],.world-control,.cta,.plain-button,.category,.button,.nav-cta,.artifact-card,.nav a,.mobile-panel a,.project-chapter-rail a,.exhibit-rail a,button,summary,input,select,textarea';
const controlSelector = 'button:not(.living-core,.living-node,.pet-interaction,.realm-portal,.inspection-bot),summary,input,select,textarea,.world-control,.cta,.plain-button,.category,.button,.nav-cta,.nav a,.mobile-panel a,.project-chapter-rail a,.exhibit-rail a';
const targets = new Set(), visible = new Set(), pressed = new Set(), releaseTimers = new Map();
let point = null, frame = 0;
function clearSurface(node) {
  node.style.removeProperty('--proximity');
  node.style.removeProperty('--px');
  node.style.removeProperty('--py');
  node.dataset.proximity = 'far';
}
function clearPressed(node) {
  node.removeAttribute('data-glass-pressed');
  pressed.delete(node);
  clearTimeout(releaseTimers.get(node));
  releaseTimers.delete(node);
}
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) visible.add(entry.target);
  else { visible.delete(entry.target); clearSurface(entry.target); clearPressed(entry.target); }
}), {rootMargin:'40px'});
function registerControl(node) {
  if (!node) return node;
  const first = !targets.has(node);
  if (first) { targets.add(node); node.dataset.proximity = 'far'; }
  if (node.matches(controlSelector)) {
    node.setAttribute('data-glass-control', '');
    if (!node.matches('input,select,textarea') && !node.querySelector(':scope > .glass-sparks')) {
      const sparks = document.createElement('span');
      sparks.className = 'glass-sparks';
      sparks.setAttribute('aria-hidden', 'true');
      node.append(sparks);
    }
  }
  if (first) observer.observe(node);
  return node;
}
document.querySelectorAll(targetSelector).forEach(registerControl);
function resetProximity() {
  point = null;
  cancelAnimationFrame(frame); frame = 0;
  targets.forEach(node => { clearSurface(node); clearPressed(node); });
}
function surface(node, energy, x = 50, y = 0) {
  node.style.setProperty('--proximity', energy.toFixed(2));
  node.style.setProperty('--px', `${Math.max(0,Math.min(100,x))}%`);
  node.style.setProperty('--py', `${Math.max(0,Math.min(100,y))}%`);
}
function proximity() {
  frame = 0;
  if (!point || !fine.matches || effectsPaused()) return;
  const surfaces = [], cleared = [];
  // Read bounds together before changing any optical coordinates. Spark
  // positioning must not turn neighboring controls into alternating layouts.
  for (const node of visible) {
    if (!node.isConnected) {
      observer.unobserve(node); visible.delete(node); targets.delete(node); clearPressed(node);
      continue;
    }
    if (node.matches(':disabled') || node.closest('[inert]')) { cleared.push(node); continue; }
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) { cleared.push(node); continue; }
    const dx = Math.max(r.left - point.x, 0, point.x - r.right);
    const dy = Math.max(r.top - point.y, 0, point.y - r.bottom);
    const distance = Math.hypot(dx,dy);
    const energy = Math.max(0,1-distance/110);
    surfaces.push({node,distance,energy,x:(point.x-r.left)/r.width*100,y:(point.y-r.top)/r.height*100});
  }
  cleared.forEach(clearSurface);
  for (const {node,distance,energy,x,y} of surfaces) {
    if (energy) {
      node.dataset.proximity = distance === 0 ? 'surface' : distance < 18 ? 'edge' : distance < 90 ? 'near' : 'far';
      surface(node,energy,x,y);
    } else clearSurface(node);
  }
}
function scheduleProximity() {
  if (point && fine.matches && !effectsPaused() && !frame) frame = requestAnimationFrame(proximity);
}
document.addEventListener('pointerover', event => {
  registerControl(event.target.closest?.(targetSelector));
}, {passive:true});
document.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' || !fine.matches || effectsPaused()) return;
  point = {x:event.clientX,y:event.clientY}; scheduleProximity();
}, {passive:true});
document.addEventListener('pointerleave', resetProximity);
document.addEventListener('pointerdown', event => {
  const node = registerControl(event.target.closest?.(controlSelector));
  if (!node || node.matches(':disabled') || node.closest('[inert]')) return;
  clearPressed(node);
  if (node.matches('button,summary,a,[role="button"]')) { pressed.add(node); node.dataset.glassPressed = 'true'; }
  if (event.pointerType === 'touch' && !effectsPaused()) {
    const r = node.getBoundingClientRect();
    if (r.width && r.height) surface(node,1,(event.clientX-r.left)/r.width*100,(event.clientY-r.top)/r.height*100);
    node.dataset.proximity = 'surface';
  }
}, {passive:true});
function releasePressed(touch = false) {
  for (const node of [...pressed]) {
    clearPressed(node);
    if (touch) releaseTimers.set(node,setTimeout(() => { clearSurface(node); releaseTimers.delete(node); },180));
  }
}
document.addEventListener('pointerup', event => releasePressed(event.pointerType === 'touch'), {passive:true});
document.addEventListener('pointercancel', resetProximity, {passive:true});
window.addEventListener('blur', resetProximity);
document.addEventListener('focusin', event => {
  const node = registerControl(event.target.closest?.(controlSelector));
  if (!node || effectsPaused() || node.matches(':disabled')) return;
  surface(node,.6); node.dataset.proximity = 'edge';
});
document.addEventListener('focusout', event => {
  const node = event.target.closest?.(controlSelector);
  if (node) { clearSurface(node); clearPressed(node); }
  scheduleProximity();
});
document.addEventListener('keydown', event => {
  if (event.repeat || !['Enter',' '].includes(event.key)) return;
  const node = registerControl(event.target.closest?.(controlSelector));
  if (!node || node.matches(':disabled') || !node.matches('button,summary,a,[role="button"]') || (event.key === ' ' && node.matches('a'))) return;
  pressed.add(node); node.dataset.glassPressed = 'true';
});
document.addEventListener('keyup', event => { if (['Enter',' '].includes(event.key)) releasePressed(); });
window.addEventListener('scroll',scheduleProximity,{passive:true});
window.addEventListener('resize',scheduleProximity,{passive:true});
reduce.addEventListener('change', updateMotion);fine.addEventListener('change',resetProximity);updateMotion();
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPulse();resetProximity();}});
window.addEventListener('pagehide',()=>{pageActive=false;cancelPulse();resetProximity();},{passive:true});
window.addEventListener('pageshow',()=>{pageActive=true;updateMotion();},{passive:true});
// The same ambient field stays alive while scrolling between zones.
const zoneObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    body.dataset.worldZone = entry.target.dataset.worldZone;
    const zones={core:['57%','32%'],projects:['25%','50%'],engineering:['80%','40%'],ecosystem:['30%','65%'],contact:['65%','65%']};
    const values=zones[entry.target.dataset.worldZone]||zones.core;
    body.style.setProperty('--world-light-x',values[0]); body.style.setProperty('--world-light-y',values[1]);
  }
},{rootMargin:'-20% 0px -45% 0px'});
document.querySelectorAll('[data-world-zone]').forEach(zone=>zoneObserver.observe(zone));
const navLinks=[...document.querySelectorAll('.nav a')].filter(link => { const target=new URL(link.href); return target.origin===location.origin && target.pathname===location.pathname; });
const navObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  navLinks.forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
}),{rootMargin:'-15% 0px -65% 0px'});
navLinks.forEach(link=>{const node=document.getElementById(link.hash.slice(1));if(node)navObserver.observe(node);});
// One physical assistant, assembled from disjoint crops of the original render.
// It reuses the existing catalogue select and panel; it owns no product state.
function mountInspectionRobot({panel,project,onToggle}) {
  const stage=document.querySelector('[data-living-journey] .living-stage');
  const journey=stage?.closest('[data-living-journey]');
  if(!stage)return{syncPanel(){},react(){}};
  const chapters=[...stage.querySelectorAll('[data-living-project]')];
  const landing=document.createElement('section');landing.className='bot-context-landing';landing.setAttribute('aria-label','Kontekst projektu od asystenta');
  let productMode=false,productOption=null,contextChapter=null;
  const scope=new AbortController(),on=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:scope.signal});
  const coarse=matchMedia('(hover:none), (pointer:coarse)');
  const geometry=[
    ['body',0,0,98.958333,98.4375,1520,1008],
    ['left-module',1.171875,31.738281,16.601562,35.058594,255,359],
    ['right-module',80.729167,33.105469,18.164062,35.9375,279,368],
    ['eye',32.552083,35.644531,25.520833,38.28125,392,392],
    ['antenna',70.768229,1.953125,5.989583,26.074219,92,267],
  ];
  const dock=document.createElement('div');dock.className='inspection-bot-dock';dock.dataset.ready='false';dock.dataset.scene='hero';
  const button=document.createElement('button');button.type='button';button.className='inspection-bot';button.dataset.botToggle='';button.setAttribute('aria-label','Otwórz asystenta ProgressKit');button.setAttribute('aria-controls','guide-panel');button.setAttribute('aria-expanded','false');
  const figure=document.createElement('span');figure.className='bot-assembly';figure.dataset.inspectionBot='';figure.dataset.ready='false';figure.setAttribute('aria-hidden','true');
  const fallback=document.createElement('img');fallback.className='bot-fallback';fallback.src=new URL('./brand/inspection-drone.webp',import.meta.url);fallback.alt='';fallback.width=280;fallback.height=186;figure.append(fallback);
  const images=[];
  for(const[name,left,top,width,height,naturalWidth,naturalHeight]of geometry){
    const layer=document.createElement('span');layer.className=`bot-part bot-part--${name}`;
    for(const[property,value]of Object.entries({left,top,width,height}))layer.style.setProperty(property,`${value}%`);
    const image=document.createElement('img');image.alt='';image.width=naturalWidth;image.height=naturalHeight;image.decoding='async';image.fetchPriority='low';image.src=new URL(`./assistant/robot-${name}.webp`,import.meta.url);layer.append(image);figure.append(layer);images.push(image);
  }
  const shadow=document.createElement('span');shadow.className='bot-floor-shadow';shadow.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='bot-label';label.textContent='Asystent';
  button.append(figure,label);dock.append(shadow,button);stage.append(dock);
  const portrait=document.createElement('div');portrait.className='bot-panel-portrait';portrait.setAttribute('aria-hidden','true');
  panel.querySelector(':scope>img')?.before(portrait);
  const originalPortrait=panel.querySelector(':scope>img');if(originalPortrait)originalPortrait.hidden=true;
  const hologram=document.createElement('aside');hologram.className='bot-hologram';hologram.dataset.botHologram='';hologram.dataset.visible='false';hologram.setAttribute('aria-label','Projekcja kontekstowa asystenta');hologram.setAttribute('aria-hidden','true');
  const kicker=document.createElement('span');kicker.className='bot-hologram__kicker';kicker.textContent='PROJEKCJA ASYSTENTA';
  const title=document.createElement('strong');title.className='bot-hologram__title';
  const description=document.createElement('p');description.id='inspection-hologram-description';
  hologram.append(kicker,title,description);document.body.append(hologram);
  const svg=(tag,attrs={})=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[name,value]of Object.entries(attrs))node.setAttribute(name,value);return node;};
  const beam=svg('svg',{'class':'bot-projector-beam','aria-hidden':'true'});beam.setAttribute('hidden','');
  const defs=svg('defs'),coneGradient=svg('linearGradient',{id:'inspection-cone-light',gradientUnits:'userSpaceOnUse'}),rayGradient=svg('linearGradient',{id:'inspection-ray-light',gradientUnits:'userSpaceOnUse'});
  for(const[offset,opacity]of[['0','.42'],['.55','.12'],['1','.025']])coneGradient.append(svg('stop',{offset,'stop-color':'#ff3e58','stop-opacity':opacity}));
  for(const[offset,color,opacity]of[['0','#ffe1d5','.9'],['.2','#ff6774','.55'],['1','#ff526c','.18']])rayGradient.append(svg('stop',{offset,'stop-color':color,'stop-opacity':opacity}));
  defs.append(coneGradient,rayGradient);
  const cone=svg('polygon',{fill:'url(#inspection-cone-light)'}),rays=svg('path',{'class':'bot-projector-rays',fill:'none',stroke:'url(#inspection-ray-light)'}),coreRay=svg('path',{'class':'bot-projector-core',fill:'none',stroke:'url(#inspection-ray-light)'});
  const interference=svg('path',{'class':'bot-projector-interference',fill:'none',stroke:'url(#inspection-ray-light)'});
  beam.append(defs,cone,rays,coreRay,interference);document.body.append(beam);
  let frame=0,hideTimer=0,reactTimer=0,point=null,contextTarget=null,contextOption=null,placed=false,needsPlacement=true,stageVisible=true,disposed=false,keyboardContext=false,describedTarget=null,previousDescription='';
  let pose=null,flight=null,openingState=null,motionFrames=0,lastProgressNumber=Number(journey.dataset.progress||0),observedProgress=journey.dataset.progress||'';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function clearDescription(){if(describedTarget){if(previousDescription)describedTarget.setAttribute('aria-describedby',previousDescription);else describedTarget.removeAttribute('aria-describedby');describedTarget=null;}}
  function hideContext(restore=true){const had=!!contextTarget;clearTimeout(hideTimer);contextTarget=null;contextOption=null;concealProjection();clearDescription();if(restore&&had){needsPlacement=true;schedule();}}
  function motion(){const paused=effectsPaused()||(!stageVisible&&panel.hidden);figure.dataset.motion=paused?'paused':'running';if(paused){figure.style.removeProperty('--bot-yaw');figure.style.removeProperty('--bot-pitch');}}
  function syncPanel(){
    const open=!panel.hidden;button.setAttribute('aria-expanded',String(open));
    flight=null;openingState=null;setFlight('idle');
    if(open){hideContext(false);portrait.append(figure);dock.hidden=true;}else{button.prepend(figure);needsPlacement=true;place(true);schedule();}
    motion();
  }
  function react(){figure.dataset.reacting='true';clearTimeout(reactTimer);reactTimer=setTimeout(()=>{figure.dataset.reacting='false';},600);}
  on(button,'click',()=>{if(contextOption)project.value=contextOption.value;react();onToggle(button);});
  function visibleRect(node){
    if(!node)return null;
    let alpha=1;
    for(let ancestor=node;ancestor&&ancestor!==stage.parentElement;ancestor=ancestor.parentElement){const style=getComputedStyle(ancestor);if(style.visibility==='hidden'||style.display==='none')return null;alpha*=Number(style.opacity);if(alpha<=.12)return null;}
    const r=node.getBoundingClientRect();return r.width&&r.height?r:null;
  }
  const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right+8)-Math.max(a.left,b.left-8))*Math.max(0,Math.min(a.bottom,b.bottom+8)-Math.max(a.top,b.top-8));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{const p=clamp(t,0,1);return p*p*(3-2*p);};
  const samePose=(a,b)=>a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<.7&&Math.abs(a.w-b.w)<.5;
  function concealProjection(){hologram.dataset.visible='false';hologram.setAttribute('aria-hidden','true');beam.setAttribute('hidden','');dock.dataset.projecting='false';}
  function clearProjectionPose(){for(const key of['left','top','width','height','translate','transform','transform-origin'])hologram.style.removeProperty(key);}
  const contained=(box,bounds,tolerance=1)=>box.width>0&&box.height>0&&box.left>=bounds.left-tolerance&&box.top>=bounds.top-tolerance&&box.right<=bounds.right+tolerance&&box.bottom<=bounds.bottom+tolerance;
  function revealProjection(){
    const viewport={left:0,top:0,right:innerWidth,bottom:innerHeight},plane=hologram.getBoundingClientRect();
    if(!contained(plane,viewport,0)||dock.hidden||dock.dataset.flight!=='idle'){concealProjection();return false;}
    if(productMode){const bounds=landing.getBoundingClientRect(),actor=figure.getBoundingClientRect();if(!contained(plane,bounds)||!contained(actor,bounds)||!contained(actor,viewport,0)){concealProjection();return false;}}
    hologram.dataset.visible='true';hologram.setAttribute('aria-hidden','false');dock.dataset.projecting='true';updateBeam();
    if(productMode&&!beam.hasAttribute('hidden')&&!contained(beam.getBoundingClientRect(),landing.getBoundingClientRect())){concealProjection();return false;}
    return true;
  }

  function sceneObstacles(scene=null){
    const selectors=scene===0?'.living-intro':scene===1?'.living-map-heading,.living-node:not([inert]),.living-node:not([inert]) .living-node__name,.living-map-controls>.living-paging,.living-map-controls>a,.living-hud':'.living-intro,.living-map-heading,.living-node:not([inert]),.living-node:not([inert]) .living-node__name,.living-map-controls>.living-paging,.living-map-controls>a,.living-hud';
    return [...stage.querySelectorAll(selectors)].map(visibleRect).filter(Boolean);
  }
  function setFlight(state,kind='rest',progress=1){dock.dataset.flight=state;dock.dataset.flightKind=kind;dock.dataset.flightProgress=progress.toFixed(4);}
  function applyPose(next){
    const previous=pose;pose={x:next.x,y:next.y,w:next.w};
    const base=coarse.matches?112:260;
    // Keep the original raster layers at a stable size: flight is compositor
    // translation/scale, not a fresh image layout and repaint on every frame.
    dock.style.width=`${base}px`;dock.style.left='0px';dock.style.top='0px';dock.style.translate='none';dock.style.transformOrigin='50% 50%';
    dock.style.transform=`translate3d(${pose.x-base/2}px,${pose.y-base/3}px,0) scale(${pose.w/base})`;
    const bank=previous&&!effectsPaused()&&!coarse.matches?clamp((pose.x-previous.x)*.1,-4,4):0;
    figure.style.setProperty('--bot-bank',`${bank.toFixed(2)}deg`);
    dock.dataset.motionFrames=String(++motionFrames);
    const altitude=clamp(1-pose.w/base,0,.7),speed=previous?clamp(Math.hypot(pose.x-previous.x,pose.y-previous.y)/36,0,1):0;
    dock.style.setProperty('--bot-lift',altitude.toFixed(3));dock.style.setProperty('--bot-speed',speed.toFixed(3));
  }
  function flightSafety(){
    if(!pose||dock.hidden||dock.dataset.layout==='flow')return;
    const r=stage.getBoundingClientRect(),box={left:r.left+pose.x-pose.w/2,right:r.left+pose.x+pose.w/2,top:r.top+pose.y-pose.w/3,bottom:r.top+pose.y+pose.w/3};
    const unsafe=sceneObstacles().some(obstacle=>overlap(box,obstacle)>0);
    dock.dataset.occluded=String(unsafe);dock.style.visibility=unsafe?'hidden':'';
  }
  function travelPose(from,to,t){
    const r=stage.getBoundingClientRect(),small=clamp(r.width*.075,96,144),right=r.width-small/2-14;
    const x=t<.28?mix(from.x,right,ease(t/.28)):t>.82?mix(right,to.x,ease((t-.82)/.18)):right;
    const y=mix(from.y,to.y,ease((t-.18)/.64));
    const w=t<.2?mix(from.w,small,ease(t/.2)):t>.84?mix(small,to.w,ease((t-.84)/.16)):small;
    return{x,y,w};
  }
  function requestPose(next,kind='rest',immediate=false){
    if(!next)return;
    if(!pose||immediate||effectsPaused()||coarse.matches){flight=null;applyPose(next);setFlight('idle',kind);return;}
    if(flight&&samePose(flight.to,next))return;
    if(!flight&&samePose(pose,next))return;
    concealProjection();
    const distance=Math.hypot(next.x-pose.x,next.y-pose.y),largeVertical=Math.abs(next.y-pose.y)>stage.clientHeight*.35;
    flight={from:{...pose},to:next,start:performance.now(),duration:clamp(distance*.85,320,largeVertical?1050:760),kind,largeVertical};
    setFlight('moving',kind,0);
  }
  function advanceFlight(now){
    if(!flight)return;
    const f=flight,t=clamp((now-f.start)/f.duration,0,1),q=ease(t);
    let next;
    if(f.largeVertical)next=f.from.y>f.to.y?travelPose(f.from,f.to,t):travelPose(f.to,f.from,1-t);
    else next={x:mix(f.from.x,f.to.x,q),y:mix(f.from.y,f.to.y,q),w:mix(f.from.w,f.to.w,q)};
    applyPose(next);setFlight(t<1?'moving':'idle',f.kind,t);flightSafety();
    if(t===1){flight=null;figure.style.setProperty('--bot-bank','0deg');}
  }
  function restPose(scene,r,w){
    const h=w*2/3+17,obstacles=sceneObstacles(scene);
    const candidates=scene<1?[[.58,.87],[.60,.76],[.84,.86],[.48,.88],[.84,.69]]:coarse.matches?[[.84,.25],[.18,.25],[.5,.25],[.9,.82],[.5,.87]]:[[.9,.12],[.88,.18],[.9,.82],[.5,.86],[.12,.82],[.12,.22]];
    const candidatesWithRoom=candidates.map(([nx,ny],i)=>{const x=clamp(r.width*nx,w/2+12,r.width-w/2-12),y=clamp(r.height*ny,h/2+12,r.height-h/2-27),box={left:r.left+x-w/2,right:r.left+x+w/2,top:r.top+y-h/2,bottom:r.top+y+h/2};return{x,y,w,area:obstacles.reduce((sum,o)=>sum+overlap(box,o),0),order:i};}).filter(p=>p.area===0).sort((a,b)=>a.order-b.order);
    return candidatesWithRoom[0]||null;
  }
  function concealDock(reason='hidden-scene'){
    dock.hidden=true;dock.style.visibility='hidden';dock.dataset.placement=reason;dock.dataset.occluded='false';flight=null;setFlight('idle','rest');concealProjection();
  }
  function place(immediate=false){
    if(productMode){dock.dataset.layout='product';dock.dataset.scene='product';dock.dataset.placement='product-clear';dock.dataset.occluded='false';dock.hidden=!panel.hidden;dock.style.visibility='';for(const key of['left','top','width','translate','transform','transform-origin'])dock.style.removeProperty(key);clearProjectionPose();for(const key of['--bot-bank','--bot-yaw','--bot-pitch'])figure.style.removeProperty(key);flight=null;pose=null;setFlight('idle','product');needsPlacement=false;placed=true;return;}
    const staticMode=journey.classList.contains('living-static'),scene=Number(journey.dataset.scene||0);dock.dataset.scene=scene<1?'hero':'map';
    if(!staticMode&&!journey.classList.contains('living-ready')){dock.hidden=true;return;}
    if(staticMode){const intro=stage.querySelector('.living-intro');if(dock.parentElement!==intro)intro?.append(dock);dock.dataset.layout='flow';dock.dataset.placement='flow-clear';dock.hidden=!panel.hidden;dock.style.visibility='';dock.style.transform='';dock.style.translate='';flight=null;pose=null;setFlight('idle');needsPlacement=false;placed=true;return;}
    if(dock.parentElement!==stage)stage.append(dock);dock.dataset.layout='stage';
    needsPlacement=false;placed=true;
    if(!panel.hidden||!stageVisible||scene>1){concealDock();hideContext(false);return;}
    const r=stage.getBoundingClientRect(),w=coarse.matches?112:clamp(r.width*.165,190,260),next=restPose(scene,r,w);
    if(!next){concealDock('hidden-collision');return;}
    dock.dataset.placement='clear';dock.hidden=false;dock.style.visibility='';requestPose(next,'rest',immediate);flightSafety();
  }
  function openingPose(){
    const progress=Number(journey.dataset.progress||0),opening=progress>0&&progress<1.45&&!journey.classList.contains('living-static')&&!coarse.matches&&!effectsPaused();
    if(!opening)return false;
    const r=stage.getBoundingClientRect(),w=clamp(r.width*.165,190,260),delta=progress-lastProgressNumber,direction=delta<-.0001?-1:delta>.0001?1:openingState?.direction||1;
    concealProjection();flight=null;
    const to=restPose(direction>0?1:0,r,w),from=pose||restPose(direction>0?0:1,r,w);
    if(!from||!to){dock.hidden=true;setFlight('opening','opening',progress/1.45);return true;}
    if(!openingState||openingState.direction!==direction)openingState={from:{...from},to,entry:progress,direction};
    const state=openingState,t=direction>0?(progress-state.entry)/Math.max(.001,1.45-state.entry):(state.entry-progress)/Math.max(.001,state.entry);
    if(dock.parentElement!==stage)stage.append(dock);dock.dataset.layout='stage';dock.hidden=!panel.hidden||!stageVisible;
    applyPose(travelPose(state.from,state.to,clamp(t,0,1)));setFlight('opening','opening',progress/1.45);dock.dataset.placement='opening-route';flightSafety();needsPlacement=true;placed=true;return true;
  }
  function updateBeam(){
    if(hologram.dataset.visible!=='true'||effectsPaused()||(coarse.matches&&!productMode)||dock.hidden||dock.dataset.flight!=='idle'){beam.setAttribute('hidden','');return;}
    // The light starts at the transformed, actually rendered lens, not a cached
    // actor coordinate. This remains correct after yaw, resize and short flights.
    const eye=figure.querySelector('.bot-part--eye').getBoundingClientRect(),plane=hologram.getBoundingClientRect(),a={x:eye.left+eye.width/2,y:eye.top+eye.height/2};
    let b,c;
    if(a.y<plane.top||a.y>plane.bottom){const y=a.y<plane.top?plane.top+6:plane.bottom-6;b={x:plane.left+8,y};c={x:plane.right-8,y};}
    else{const x=a.x<(plane.left+plane.right)/2?plane.left+5:plane.right-5;b={x,y:plane.top+8};c={x,y:plane.bottom-8};}
    const left=Math.min(a.x,b.x,c.x)-5,top=Math.min(a.y,b.y,c.y)-5,width=Math.max(a.x,b.x,c.x)-left+5,height=Math.max(a.y,b.y,c.y)-top+5;
    const local=p=>`${(p.x-left).toFixed(2)},${(p.y-top).toFixed(2)}`;
    beam.style.left=`${left}px`;beam.style.top=`${top}px`;beam.style.width=`${width}px`;beam.style.height=`${height}px`;beam.setAttribute('viewBox',`0 0 ${width} ${height}`);
    cone.setAttribute('points',`${local(a)} ${local(b)} ${local(c)}`);rays.setAttribute('d',`M${local(a)}L${local(b)} M${local(a)}L${local(c)}`);
    const midpoint={x:(b.x+c.x)/2,y:(b.y+c.y)/2};coreRay.setAttribute('d',`M${local(a)}L${local(midpoint)}`);
    const cross=t=>{const left={x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)},right={x:mix(a.x,c.x,t),y:mix(a.y,c.y,t)};return`M${local(left)}Q${local({x:mix(left.x,right.x,.5)+2,y:mix(left.y,right.y,.5)-2})} ${local(right)}`;};
    interference.setAttribute('d',[.46,.69,.87].map(cross).join(' '));
    for(const gradient of[coneGradient,rayGradient]){gradient.setAttribute('x1',String(a.x-left));gradient.setAttribute('y1',String(a.y-top));gradient.setAttribute('x2',String(midpoint.x-left));gradient.setAttribute('y2',String(midpoint.y-top));}
    beam.dataset.eyeX=a.x.toFixed(3);beam.dataset.eyeY=a.y.toFixed(3);beam.dataset.tracking='actual-eye';beam.removeAttribute('hidden');
  }
  function short(text){const value=(text||'').replace(/\s+/g,' ').trim();return value.length>154?value.slice(0,151).replace(/\s+\S*$/,'')+'…':value;}
  function showContext(target,keyboard=false){
    if(!panel.hidden||!stageVisible||(!keyboard&&(coarse.matches||effectsPaused())))return;
    const id=target.dataset.projectId;const option=id?[...project.options].find(o=>o.value===id):null;
    if(!option&&!target.matches('[data-core-activate]'))return;
    clearTimeout(hideTimer);keyboardContext=keyboard;
    if(contextTarget!==target){concealProjection();clearDescription();contextTarget=target;contextOption=option;title.textContent=option?option.textContent:'Mapa projektów';description.textContent=option?short(option.dataset.feature||option.dataset.summary):'Aktywacja otwiera mapę istniejących projektów ProgressKit.';hologram.dataset.project=id||'progresskit-systems';}
    hologram.setAttribute('aria-live',keyboard?'polite':'off');
    if(keyboard&&describedTarget!==target){describedTarget=target;previousDescription=target.getAttribute('aria-describedby')||'';target.setAttribute('aria-describedby',[previousDescription,description.id].filter(Boolean).join(' '));}
    react();schedule();
  }
  function projectContext(){
    if(!contextTarget)return;
    const target=visibleRect(contextTarget);
    if(!target||contextTarget.closest('[inert]')||!panel.hidden){hideContext();return;}
    const w=Math.min(240,innerWidth-24);hologram.style.width=`${w}px`;
    const h=hologram.getBoundingClientRect().height,botWidth=coarse.matches?100:Math.min(210,innerWidth*.16),botHeight=botWidth*2/3+12;
    const obstacles=[...stage.querySelectorAll('.living-map-heading,.living-map-controls>.living-paging,.living-map-controls>a,.living-node:not([inert]),.living-node:not([inert]) .living-node__name,.living-intro,.living-hud')].map(visibleRect).filter(Boolean);
    const verticalWidth=Math.max(w,botWidth),verticalHeight=botHeight+14+h,horizontalWidth=botWidth+20+w,horizontalHeight=Math.max(h,botHeight);
    const cx=target.left+target.width/2,cy=target.top+target.height/2;
    const bar=document.querySelector('.topbar')?.getBoundingClientRect(),safeTop=bar&&bar.bottom>0&&bar.top<innerHeight?bar.bottom+8:12;
    const heading=visibleRect(stage.querySelector('.living-map-heading')),bandX=Math.max(cx-horizontalWidth/2,(heading?.right||0)+20);
    // Staggered crystals can enter the upper band. Derive its actual free
    // intervals instead of assuming the space above every column is empty.
    const bandY=safeTop+4,blocked=obstacles.filter(o=>o.bottom+8>bandY&&o.top-8<bandY+horizontalHeight).map(o=>[Math.max(14,o.left-8),Math.min(innerWidth-14,o.right+8)]).sort((a,b)=>a[0]-b[0]);
    const freeBands=[];let edge=14;
    for(const[left,right]of blocked){if(left-edge>=horizontalWidth)freeBands.push([edge,left]);edge=Math.max(edge,right);}
    if(innerWidth-14-edge>=horizontalWidth)freeBands.push([edge,innerWidth-14]);
    const upperSlots=freeBands.map(([left,right])=>({x:clamp(cx-horizontalWidth/2,left,right-horizontalWidth),y:bandY,width:horizontalWidth,height:horizontalHeight,vertical:false}));
    const candidates=[
      {x:target.right+20,y:cy-verticalHeight/2,width:verticalWidth,height:verticalHeight,vertical:true},
      {x:target.left-verticalWidth-20,y:cy-verticalHeight/2,width:verticalWidth,height:verticalHeight,vertical:true},
      {x:cx-horizontalWidth/2,y:target.top-horizontalHeight-20,width:horizontalWidth,height:horizontalHeight,vertical:false},
      {x:cx-horizontalWidth/2,y:target.bottom+20,width:horizontalWidth,height:horizontalHeight,vertical:false},
      ...upperSlots,
      {x:bandX,y:safeTop+4,width:horizontalWidth,height:horizontalHeight,vertical:false},
    ].filter(p=>p.width<=innerWidth-28&&p.height<=innerHeight-safeTop-22).map((p,i)=>{const x=clamp(p.x,14,innerWidth-p.width-14),y=clamp(p.y,safeTop,innerHeight-p.height-22),box={left:x,right:x+p.width,top:y,bottom:y+p.height};return{...p,x,y,area:obstacles.reduce((sum,r)=>sum+overlap(box,r),0),distance:Math.hypot(x+p.width/2-cx,y+p.height/2-cy)+i*.01};}).filter(p=>p.area===0).sort((a,b)=>a.distance-b.distance);
    if(!candidates.length){concealProjection();place();return;}
    const p=candidates[0],sr=stage.getBoundingClientRect();
    if(dock.parentElement!==stage)stage.append(dock);dock.dataset.layout='stage';dock.hidden=false;dock.dataset.placement='context-clear';
    const bx=p.vertical?p.x+p.width/2:p.x+botWidth/2,by=p.vertical?p.y+botHeight/2:p.y+p.height/2;
    requestPose({x:bx-sr.left,y:by-sr.top,w:botWidth},'context');
    if(flight||dock.dataset.flight==='opening'){concealProjection();return;}
    const hx=p.vertical?p.x+(p.width-w)/2:p.x+botWidth+20,hy=p.vertical?p.y+botHeight+14:p.y+(p.height-h)/2;
    hologram.style.left=`${hx}px`;hologram.style.top=`${hy}px`;dock.dataset.occluded='false';dock.style.visibility='';revealProjection();
  }
  const notifyLayout=()=>journey.dispatchEvent(new Event('progresskit:robot-layout'));
  const layoutObserver=new ResizeObserver(notifyLayout);layoutObserver.observe(landing);
  function chapterContext(){
    const scene=Number(journey.dataset.scene||0),staticMode=journey.classList.contains('living-static'),chapter=staticMode?chapters.find(c=>location.hash===`#scena-${c.dataset.livingProject}`):scene>=2&&scene<=6?chapters[scene-2]:null;
    const active=chapter&&!chapter.inert&&Number(getComputedStyle(chapter).opacity)>.88;
    const option=active?[...project.options].find(o=>o.value===chapter.dataset.livingProject):null;
    if(!option){
      if(productMode){concealDock('hidden-transfer');productMode=false;productOption=null;contextChapter=null;dock.dataset.layout='stage';dock.dataset.scene='map';for(const key of['left','top','width','translate','transform','transform-origin'])dock.style.removeProperty(key);pose=null;stage.append(dock);document.body.append(hologram);clearProjectionPose();landing.remove();delete hologram.dataset.layout;delete beam.dataset.layout;needsPlacement=true;placed=false;notifyLayout();}
      return false;
    }
    if(contextChapter!==chapter){hideContext(false);contextChapter=chapter;productOption=option;productMode=true;landing.dataset.botProduct=option.value;chapter.querySelector('.living-chapter__copy')?.append(landing);landing.append(dock,hologram);clearProjectionPose();hologram.dataset.layout='product';beam.dataset.layout='product';notifyLayout();}
    return true;
  }
  function render(now=performance.now()){
    frame=0;if(disposed)return;
    if(!panel.hidden){motion();return;}
    if(chapterContext()){
      place();motion();
      if(stageVisible){contextOption=productOption;title.textContent=productOption.textContent;description.textContent=short(productOption.dataset.feature||productOption.dataset.summary);hologram.dataset.project=productOption.value;hologram.setAttribute('aria-live','off');revealProjection();}else concealProjection();
      return;
    }
    const opening=openingPose();
    if(!opening){
      if(openingState){openingState=null;needsPlacement=true;setFlight('idle');}
      if((needsPlacement||!placed)&&!contextTarget)place();
      if(contextTarget)projectContext();
      advanceFlight(now);
    }
    motion();
    if(point&&!effectsPaused()&&!coarse.matches&&!dock.hidden){const r=button.getBoundingClientRect(),x=clamp((point.x-r.left-r.width/2)/Math.max(1,innerWidth/2),-1,1),y=clamp((point.y-r.top-r.height/2)/Math.max(1,innerHeight/2),-1,1);figure.style.setProperty('--bot-yaw',`${x*7}deg`);figure.style.setProperty('--bot-pitch',`${-y*4}deg`);figure.style.setProperty('--bot-eye-turn',`${x*3}deg`);}
    if(!opening&&contextTarget&&!flight)projectContext();
    if(hologram.dataset.visible==='true')updateBeam();
    if(flight&&!effectsPaused()&&!coarse.matches)schedule();
    lastProgressNumber=Number(journey.dataset.progress||0);
  }
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(render);}
  const contextSelector='.living-node[data-project-id],[data-core-activate]';
  on(document,'pointerover',event=>{const target=event.target.closest?.(contextSelector);if(target)showContext(target);});
  on(document,'pointerout',event=>{if(contextTarget&&contextTarget.contains(event.target)&&!contextTarget.contains(event.relatedTarget)&&!dock.contains(event.relatedTarget)){clearTimeout(hideTimer);hideTimer=setTimeout(hideContext,450);}});
  on(dock,'pointerenter',()=>clearTimeout(hideTimer));
  on(dock,'pointerleave',event=>{if(contextTarget&&!contextTarget.contains(event.relatedTarget)){clearTimeout(hideTimer);hideTimer=setTimeout(hideContext,250);}});
  on(document,'focusin',event=>{const target=event.target.closest?.(contextSelector);if(target)showContext(target,true);});
  on(document,'focusout',event=>{if(contextTarget?.contains(event.target))hideContext();});
  on(document,'pointermove',event=>{if(event.pointerType==='touch'||coarse.matches||effectsPaused())return;point={x:event.clientX,y:event.clientY};schedule();},{passive:true});
  on(document,'keydown',event=>{if(event.key==='Escape'&&hologram.dataset.visible==='true'){hideContext();}});
  on(window,'scroll',()=>{needsPlacement=true;if(!keyboardContext)hideContext();schedule();},{passive:true});
  on(window,'resize',()=>{needsPlacement=true;hideContext();schedule();},{passive:true});
  on(document,'progresskit:motion',()=>{const previous=contextTarget,keyboard=keyboardContext;needsPlacement=true;hideContext();if(previous&&keyboard)showContext(previous,true);schedule();});
  on(document,'visibilitychange',()=>{if(document.hidden){point=null;hideContext();cancelAnimationFrame(frame);frame=0;}else schedule();motion();});
  on(coarse,'change',()=>{needsPlacement=true;hideContext();schedule();});
  const observer=new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;needsPlacement=true;if(!stageVisible)hideContext();schedule();});observer.observe(stage);
  const sceneObserver=new MutationObserver(records=>{const progress=journey.dataset.progress||'';if(progress!==observedProgress||records.some(record=>record.attributeName!=='data-progress')){observedProgress=progress;needsPlacement=true;if(Number(journey.dataset.scene)>1)hideContext(false);schedule();}});sceneObserver.observe(journey,{attributes:true,attributeFilter:['class','data-scene','data-progress']});
  on(window,'pagehide',event=>{hideContext();figure.dataset.motion='paused';cancelAnimationFrame(frame);frame=0;if(!event.persisted){disposed=true;scope.abort();observer.disconnect();sceneObserver.disconnect();layoutObserver.disconnect();clearTimeout(reactTimer);}});
  on(window,'pageshow',()=>{needsPlacement=true;schedule();});
  on(window,'hashchange',schedule);on(window,'popstate',schedule);
  on(document,'click',event=>{if(event.target.closest?.('.living-node,[data-return-map]'))schedule();});
  Promise.all(images.map(image=>image.decode())).then(()=>{figure.dataset.ready='true';dock.dataset.ready='true';schedule();}).catch(()=>{figure.dataset.ready='false';dock.dataset.ready='false';});
  schedule();return{syncPanel,react};
}

// All assistant answers still come from the existing public catalogue options.
const guide = document.querySelector('[data-guide-toggle]');
const panel = document.getElementById('guide-panel');
if (guide && panel) {
  const project = panel.querySelector('[data-guide-project]');
  const topics = [...panel.querySelectorAll('[data-guide-topic]')];
  let topic = 'summary', opener = guide;
  const panelHome = document.createComment('assistant-panel-home'); panel.before(panelHome);
  let robot = {syncPanel(){},react(){}};
  const refresh = () => {
    const option = project.selectedOptions[0];
    if (!option) return;
    panel.querySelector('[data-guide-copy]').textContent = option.dataset[topic];
    panel.querySelector('[data-guide-link]').href = option.dataset.href;
    topics.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.guideTopic === topic)));
    robot.react();
  };
  const close = (restoreFocus = false) => {
    panel.hidden = true; panel.classList.remove('world-guide--robot-open'); panelHome.after(panel); guide.setAttribute('aria-expanded','false'); robot.syncPanel();
    if (restoreFocus) opener.focus({preventScroll:true});
  };
  const toggle = trigger => {
    if (!panel.hidden) { close(); return; }
    document.querySelector('.menu-btn[aria-expanded="true"]')?.click();
    opener = trigger; refresh();
    if(trigger.matches('[data-bot-toggle]')){document.body.append(panel);panel.classList.add('world-guide--robot-open');}else{panelHome.after(panel);panel.classList.remove('world-guide--robot-open');}
    panel.hidden = false; guide.setAttribute('aria-expanded','true'); robot.syncPanel(); project.focus({preventScroll:true});
  };
  robot = mountInspectionRobot({panel,project,onToggle:toggle});
  guide.addEventListener('click', () => toggle(guide));
  project.addEventListener('change', refresh);
  topics.forEach(button => button.addEventListener('click', () => { topic = button.dataset.guideTopic; refresh(); }));
  panel.querySelector('[data-guide-close]').addEventListener('click', () => close(true));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(true); });
  document.querySelector('.menu-btn')?.addEventListener('click', () => close());
}
// Progressive enhancement of existing roadmap buttons; no invented integration states.
document.querySelectorAll('[data-ecosystem-select]').forEach(button=>button.addEventListener('click',()=>{
  const region=document.getElementById(button.getAttribute('aria-controls'));
  const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));region.hidden=!open;pulse();
}));
// Keep real links and native history; arrival effects live in the shared CSS.
// Cross-document ViewTransition is not required for navigation or continuity.
document.addEventListener('click', event => {
  if (event.target.closest('.artifact-card,.project-chapter-rail a')) pulse();
});
