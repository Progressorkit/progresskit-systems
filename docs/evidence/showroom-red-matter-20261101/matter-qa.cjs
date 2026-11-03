'use strict';
// Browser proof for the matter pass. Run modes separately: desktop | fallback | mobile.
// Only this evidence script instruments rendering; the shipped renderer has no QA hooks.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]||'desktop',out=path.join(__dirname,'final');
if(!['desktop','fallback','mobile'].includes(mode))throw new Error('Expected desktop, fallback or mobile mode');
fs.mkdirSync(out,{recursive:true});
const report={mode,checks:[],errors:[],screenshots:[],notes:['Local Chrome; mobile is emulated. Visual acceptance remains owner review.']};
const save=()=>{report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,`qa-matter-${mode}.json`),JSON.stringify(report,null,2));};
const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});save();if(!ok)console.log('FAIL',name,JSON.stringify(details));};
let browser;
async function open({mobile=false,denyWebGL=false,width=mobile?390:1440,height=mobile?844:1050}={}) {
 const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.addInitScript(({deny})=>{
  window.__matterProof={draws:0,drawTimes:[],samples:[],sampleErrors:[],timeline:[]};
  // Explicitly denied WebGL exercises the shipped CSS fallback, including on mobile.
  if(deny){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(this.classList.contains('capsule-matter')&&/^(webgl2?|experimental-webgl)$/.test(kind))return null;return get.call(this,kind,...args);};}
  for(const Context of [window.WebGLRenderingContext,window.WebGL2RenderingContext]) {
   if(!Context)continue;
   const draw=Context.prototype.drawArrays;
   Context.prototype.drawArrays=function(...args) {
    const result=draw.apply(this,args);
    if(!this.canvas.classList.contains('capsule-matter')||this.isContextLost())return result;
    const proof=window.__matterProof,now=performance.now();proof.draws++;proof.drawTimes.push(now);
    if(proof.drawTimes.length>3000)proof.drawTimes.shift();
    const last=proof.samples.at(-1);
    if(last&&now-last.t<450)return result;
    try {
     // Three one-pixel rows, sampled at most ~2 Hz immediately after an actual draw.
     // readPixels never relies on preserveDrawingBuffer or races a cleared compositor buffer.
     const width=this.drawingBufferWidth,height=this.drawingBufferHeight,row=new Uint8Array(width*4);
     let hash=2166136261,occupied=0,red=0,maxRed=0;
     for(const y of [.32,.5,.68]) {
      this.readPixels(0,Math.min(height-1,Math.floor(height*y)),width,1,this.RGBA,this.UNSIGNED_BYTE,row);
      for(let i=0;i<row.length;i++)hash=Math.imul(hash^row[i],16777619);
      for(let i=0;i<row.length;i+=4) {
       if(row[i+3]>3){occupied++;maxRed=Math.max(maxRed,row[i]);if(row[i]>10&&row[i]>row[i+1]*1.4&&row[i]>row[i+2]*1.2)red++;}
      }
     }
     proof.samples.push({t:now,hash:hash>>>0,occupied,red,maxRed,width,height});
     if(proof.samples.length>120)proof.samples.shift();
    }catch(error){proof.sampleErrors.push(error.message);}
    return result;
   };
  }
 },{deny:denyWebGL});
 await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});
 await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('#projekty')?.classList.contains('capsule-ready')&&document.querySelector('.capsule-matter')?.dataset.matterRenderer,undefined,{timeout:10000});
 await page.waitForTimeout(700);
 return page;
}
const metrics=page=>page.evaluate(()=>({draws:window.__matterProof.draws,samples:window.__matterProof.samples.slice(),sampleErrors:window.__matterProof.sampleErrors.slice()}));
const surface=page=>page.locator('.capsule-matter').evaluate(c=>({width:c.width,height:c.height,pixels:c.width*c.height,renderer:c.dataset.matterRenderer,rootRenderer:document.querySelector('#projekty').dataset.matterRenderer,motion:document.querySelector('#projekty').dataset.matterMotion}));
const shot=async(page,name)=>{await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');save();};
async function snapshotNow(page,name) {
 const cdp=await page.context().newCDPSession(page);
 try{const data=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.data,'base64'));report.screenshots.push(name+'.png');save();}finally{await cdp.detach();}
}
async function watchMaterialization(page) {
 await page.evaluate(()=>{
  const root=document.querySelector('#projekty'),proof=window.__matterProof,states=new Map();proof.timeline=[];proof.observedAt=performance.now();
  let phase;
  const sample=()=>{
   const t=performance.now()-proof.observedAt;
   if(root.dataset.matterPhase!==phase){phase=root.dataset.matterPhase;proof.timeline.push({kind:'phase',state:phase,t});}
   root.querySelectorAll('.showroom-card').forEach(card=>{
    const state=card.dataset.matterState||'',energized=card.classList.contains('is-energized'),key=state+'|'+energized;
    if(states.get(card)!==key){states.set(card,key);proof.timeline.push({kind:'project',id:card.dataset.projectId,state,energized,visible:!card.classList.contains('is-orbit-hidden'),t});}
   });
  };
  new MutationObserver(sample).observe(root,{subtree:true,attributes:true,attributeFilter:['data-matter-phase','data-matter-state','class']});sample();
 });
}
async function verifyMaterialization(page,tag) {
 await page.waitForFunction(()=>[...document.querySelectorAll('.showroom-card:not(.is-orbit-hidden)')].every(c=>c.classList.contains('is-energized')&&c.dataset.matterState==='ready'),undefined,{timeout:6500});
 const timeline=await page.evaluate(()=>window.__matterProof.timeline),visible=await page.locator('.showroom-card:not(.is-orbit-hidden)').evaluateAll(cs=>cs.map(c=>c.dataset.projectId));
 report.activationTimeline=timeline;
 const compression=timeline.find(e=>e.kind==='phase'&&e.state==='compressing');
 const release=timeline.find(e=>e.kind==='phase'&&e.state==='releasing');
 const reveals=visible.map(id=>timeline.find(e=>e.kind==='project'&&e.id===id&&e.energized));
 check(tag+' pressure and release precede visible materialization',Boolean(compression&&release&&compression.t<release.t&&reveals.every(e=>e&&e.t>release.t&&e.t-compression.t>=300)),{compression,release,reveals});
 check(tag+' every visible project progresses through waiting and materializing',visible.every(id=>{
  const states=timeline.filter(e=>e.kind==='project'&&e.id===id),waiting=states.find(e=>e.state==='waiting'),materializing=states.find(e=>e.state==='materializing'),ready=states.find(e=>e.state==='ready');
  return waiting&&!waiting.energized&&materializing&&materializing.energized&&ready&&waiting.t<materializing.t&&materializing.t<=ready.t;
 }),visible);
 check(tag+' collection preserves all fourteen real project entries',await page.locator('.showroom-card').count()===14);
}
async function fallbackAnimation(page) {
 return page.locator('.capsule-matter-fallback').evaluate(async e=>{
  const style=getComputedStyle(e),before=e.getAnimations({subtree:true}).map(a=>({name:a.animationName,time:a.currentTime,state:a.playState}));
  await new Promise(resolve=>setTimeout(resolve,550));
  const after=e.getAnimations({subtree:true}).map(a=>({name:a.animationName,time:a.currentTime,state:a.playState}));
  return {display:style.display,visibility:style.visibility,opacity:style.opacity,before,after,advances:after.some((a,i)=>a.state==='running'&&typeof a.time==='number'&&typeof before[i]?.time==='number'&&a.time-before[i].time>100)};
 });
}
async function assertStopped(page,label) {
 await page.waitForTimeout(650);const a=await metrics(page);await page.waitForTimeout(650);const b=await metrics(page);
 check(label,a.draws===b.draws,{before:a.draws,after:b.draws});
}
(async()=>{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 if(mode==='desktop') {
  const page=await open(),initial=await surface(page);
  check('Desktop uses the actual WebGL renderer',initial.renderer==='webgl'&&initial.rootRenderer==='webgl',initial);
  check('One matter canvas replaces all lightning surfaces and paths',await page.locator('.capsule-space canvas').count()===1&&await page.locator('.capsule-plasma,.capsule-corona,[data-capsule-link],.capsule-link-pulse').count()===0);
  check('Idle keeps projects dormant',await page.locator('[data-capsule-toggle]').getAttribute('aria-expanded')==='false'&&await page.locator('.showroom-card').evaluateAll(cs=>cs.every(c=>c.inert)));
  const stacking=await page.evaluate(()=>{
   const c=document.querySelector('.capsule-matter'),trigger=document.querySelector('[data-capsule-toggle]'),r=trigger.getBoundingClientRect(),previous=c.style.pointerEvents;
   // Only hit-test eligibility changes for this synchronous probe; paint order does not.
   c.style.pointerEvents='auto';const stack=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2);c.style.pointerEvents=previous;
   const back=stack.indexOf(c),front=stack.findIndex(e=>e===trigger||trigger.contains(e));
   return {back,front,outsideTrigger:!trigger.contains(c),layerZ:getComputedStyle(c.closest('.capsule-matter-layer')).zIndex,triggerZ:getComputedStyle(trigger).zIndex,stack:stack.slice(0,12).map(e=>e.className||e.tagName)};
  });
  check('Hit-tested matter layer paints behind the core',stacking.outsideTrigger&&stacking.front>=0&&stacking.back>stacking.front,stacking);
  const mark=await page.locator('.capsule-mark').evaluate(e=>({src:e.getAttribute('src'),opacity:getComputedStyle(e).opacity,ancestors:[e,e.parentElement,e.parentElement.parentElement].map(n=>({filter:getComputedStyle(n).filter,blend:getComputedStyle(n).mixBlendMode}))}));
  check('Original metallic logo has no tint or blend overlay',mark.src==='assets/brand/progressorkit-stamp.png'&&Number(mark.opacity)>=.95&&mark.ancestors.every(s=>s.blend==='normal'&&!/hue-rotate|sepia|url\(/.test(s.filter)),mark);
  await shot(page,'matter-desktop-idle-start');const start=await page.evaluate(()=>performance.now()),a=await metrics(page);
  await page.waitForTimeout(5100);const b=await metrics(page),samples=b.samples.filter(s=>s.t>=start);await shot(page,'matter-desktop-idle-after-5s');
  check('Matter continues drawing throughout at least five seconds of idle',b.draws-a.draws>=10,{elapsedMs:5100,draws:b.draws-a.draws});
  check('Spatial pattern changes across several idle samples',samples.length>=4&&new Set(samples.map(s=>s.hash)).size>=4,{samples});
  check('Rendered volume contains red chromatic matter',samples.some(s=>s.occupied>20&&s.red>20),samples.map(({occupied,red,maxRed})=>({occupied,red,maxRed})));
  check('WebGL sampling completed without errors',b.sampleErrors.length===0,b.sampleErrors);
  await watchMaterialization(page);await page.locator('[data-capsule-toggle]').hover();await page.waitForTimeout(100);await snapshotNow(page,'matter-desktop-core-pressure');
  await verifyMaterialization(page,'Desktop');await shot(page,'matter-desktop-activated');
  await page.locator('[data-showroom-open="progresskit-mail"]').hover();await page.waitForTimeout(600);await shot(page,'matter-desktop-project-hover');
  check('Hover activates one project without a connector',await page.locator('.showroom-card.is-related').count()===1&&await page.locator('.showroom-card.is-related').getAttribute('data-project-id')==='progresskit-mail'&&await page.locator('.capsule-space svg').count()===0);
  await page.mouse.move(50,500);await page.locator('[data-capsule-toggle]').focus();await page.keyboard.press('Tab');
  check('Keyboard focus reaches a fully revealed selected project',await page.locator('.showroom-card.is-active [data-showroom-open]').evaluate(e=>e===document.activeElement&&e.closest('.showroom-card').classList.contains('is-energized')));
  await page.keyboard.press('Enter');await page.waitForTimeout(1000);check('Enter opens original project content',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());await assertStopped(page,'Opening project details stops matter work');
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.waitForTimeout(300);
  check('Escape sleeps collection and retains the core control',await page.locator('[data-capsule-toggle]').evaluate(e=>e===document.activeElement&&e.getAttribute('aria-expanded')==='false'));
  await page.emulateMedia({reducedMotion:'reduce'});
  let reducedSynchronized=true;
  try {
   await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion:reduce)').matches&&document.querySelector('#projekty')?.dataset.matterMotion==='paused',undefined,{timeout:3000});
  }catch(error){if(error.name!=='TimeoutError')throw error;reducedSynchronized=false;}
  const reducedState=await page.evaluate(()=>({mediaReduced:matchMedia('(prefers-reduced-motion:reduce)').matches,matterMotion:document.querySelector('#projekty')?.dataset.matterMotion,interfaceMotion:document.documentElement.dataset.interfaceMotion,renderer:document.querySelector('.capsule-matter')?.dataset.matterRenderer,hidden:document.hidden,rootClasses:document.querySelector('#projekty')?.className}));
  check('Reduced motion exposes the paused matter state',reducedSynchronized&&reducedState.mediaReduced&&reducedState.matterMotion==='paused',reducedState);
  await assertStopped(page,'Reduced motion freezes WebGL after its static frame');
  await page.locator('[data-capsule-toggle]').click();check('Reduced activation reveals content without waiting for a shader',await page.locator('.showroom-card.is-active').evaluate(e=>e.classList.contains('is-energized')));await shot(page,'matter-desktop-reduced-static');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(500);await page.locator('[data-showroom-motion-toggle]').click();await assertStopped(page,'Global pause stops WebGL');await page.locator('[data-showroom-motion-toggle]').click();
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await assertStopped(page,'Offscreen matter does no WebGL work');
  await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));await page.waitForTimeout(700);const before=(await metrics(page)).draws;await page.waitForTimeout(600);check('Returning to the showroom resumes live matter',(await metrics(page)).draws>before);
  await page.close();
 }
 if(mode==='fallback') {
  const page=await open({denyWebGL:true}),state=await surface(page);
  check('Denied WebGL selects the shipped CSS fallback',state.renderer==='fallback'&&state.rootRenderer==='fallback',state);
  const animated=await fallbackAnimation(page);check('CSS fallback is visibly present and continues animating',animated.display!=='none'&&animated.visibility!=='hidden'&&Number(animated.opacity)>0&&animated.advances,animated);await shot(page,'matter-css-fallback-idle');
  await page.locator('[data-capsule-toggle]').hover();await page.waitForTimeout(2000);check('CSS fallback preserves project disclosure',await page.locator('.showroom-card:not(.is-orbit-hidden)').evaluateAll(cs=>cs.every(c=>c.classList.contains('is-energized'))));
  await page.locator('.showroom-card.is-active [data-showroom-open]').click();await page.waitForTimeout(1000);check('CSS fallback opens original project content',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(400);const frozen=await fallbackAnimation(page);check('Reduced motion also freezes the CSS fallback',!frozen.advances,frozen);await page.close();
  const mobile=await open({denyWebGL:true,mobile:true});const mobileFallback=await fallbackAnimation(mobile);check('Mobile fallback remains live instead of becoming a static image',mobileFallback.advances,mobileFallback);await shot(mobile,'matter-mobile-css-fallback');await mobile.locator('[data-capsule-toggle]').tap();await mobile.waitForTimeout(1600);check('Mobile fallback retains readable tap activation',await mobile.locator('.showroom-card.is-active').evaluate(c=>c.classList.contains('is-energized')&&!c.inert));await mobile.close();
  const lost=await open();check('Context-loss test starts with actual WebGL',(await surface(lost)).renderer==='webgl');
  const extension=await lost.locator('.capsule-matter').evaluate(c=>{const gl=c.getContext('webgl')||c.getContext('webgl2')||c.getContext('experimental-webgl');const ext=gl?.getExtension('WEBGL_lose_context');if(!ext)return false;window.__matterLoss=ext;ext.loseContext();return true;});
  check('Browser provides a real WebGL context-loss mechanism',extension);
  if(extension){await lost.waitForFunction(()=>document.querySelector('#projekty').dataset.matterRenderer==='fallback',undefined,{timeout:6000});const lostFallback=await fallbackAnimation(lost);check('Context loss activates animated CSS matter',lostFallback.advances,lostFallback);await assertStopped(lost,'Lost WebGL context stops drawing');await shot(lost,'matter-context-loss-fallback');await lost.locator('[data-capsule-toggle]').click();await lost.waitForTimeout(1700);check('Context loss does not block project disclosure',await lost.locator('.showroom-card.is-active').evaluate(c=>c.classList.contains('is-energized')));await lost.evaluate(()=>window.__matterLoss.restoreContext());await lost.waitForFunction(()=>document.querySelector('#projekty').dataset.matterRenderer==='webgl',undefined,{timeout:10000});const before=(await metrics(lost)).draws;await lost.waitForTimeout(800);check('Restoring context resumes procedural matter',(await metrics(lost)).draws>before);}
  await lost.close();
 }
 if(mode==='mobile') {
  const desktop=await open(),reference=await surface(desktop);await desktop.close();
  const page=await open({mobile:true}),small=await surface(page);
  check('Mobile uses actual procedural matter',small.renderer==='webgl'&&small.rootRenderer==='webgl',small);
  check('Mobile uses a smaller render buffer than desktop',small.pixels>0&&small.pixels<reference.pixels,{desktop:reference,mobile:small});
  const start=await page.evaluate(()=>performance.now()),a=await metrics(page);await shot(page,'matter-mobile-idle-start');await page.waitForTimeout(5100);const b=await metrics(page),samples=b.samples.filter(s=>s.t>=start);await shot(page,'matter-mobile-idle-after-5s');
  check('Mobile matter evolves across five seconds of idle',b.draws>a.draws+5&&new Set(samples.map(s=>s.hash)).size>=3,{draws:b.draws-a.draws,samples});
  check('Mobile keeps the deep-red volume',samples.some(s=>s.occupied>10&&s.red>10),samples.map(({occupied,red,maxRed})=>({occupied,red,maxRed})));
  check('Mobile page remains within viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await watchMaterialization(page);await page.locator('[data-capsule-toggle]').tap();await page.waitForTimeout(100);await snapshotNow(page,'matter-mobile-core-pressure');await verifyMaterialization(page,'Mobile');await shot(page,'matter-mobile-activated');
  check('Core and active lens remain spatially separate on mobile',await page.evaluate(()=>document.querySelector('[data-capsule-toggle]').getBoundingClientRect().bottom+20<document.querySelector('.showroom-card.is-active .project-slice').getBoundingClientRect().top));
  await page.locator('.showroom-card.is-active [data-showroom-open]').tap();await page.waitForTimeout(950);check('Mobile tap opens real project details',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());await assertStopped(page,'Mobile reading pauses procedural work');
  await page.locator('.is-slice-expanded [data-slice-close]').tap();await page.waitForTimeout(300);await page.emulateMedia({reducedMotion:'reduce'});await assertStopped(page,'Mobile reduced motion retains a static volume');await page.close();
 }
 check('No JavaScript or CSP errors',report.errors.length===0,report.errors);
}catch(error){report.errors.push(error.stack);check('QA completed',false,error.message);}
finally{await browser.close();save();console.log(JSON.stringify({mode,PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL||report.errors.length)process.exitCode=1;}
})();
