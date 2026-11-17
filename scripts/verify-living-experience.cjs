/* Real local browser checks. No production requests, submissions or APK transfers. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const playwrightPath=process.env.PK_PLAYWRIGHT||'/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
let ffmpegCache;
if(process.env.PK_QA_RECORD==='1'&&process.platform==='linux'&&fs.existsSync('/usr/bin/ffmpeg')){
 const coreDirectory=path.dirname(require.resolve('playwright-core/package.json',{paths:[playwrightPath]}));
 const revision=JSON.parse(fs.readFileSync(path.join(coreDirectory,'browsers.json'))).browsers.find(b=>b.name==='ffmpeg').revision;
 ffmpegCache=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'progresskit-video-tools-'));
 const directory=path.join(ffmpegCache,'ffmpeg-'+revision);fs.mkdirSync(directory);fs.symlinkSync('/usr/bin/ffmpeg',path.join(directory,'ffmpeg-linux'));
 process.env.PLAYWRIGHT_BROWSERS_PATH=ffmpegCache;
}
const {chromium}=require(playwrightPath);
const base=process.env.PK_QA_URL||'http://127.0.0.1:8236';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const out=path.resolve(process.env.PK_QA_OUT||'docs/evidence/living-experience-v12-20261116/browser');fs.mkdirSync(out,{recursive:true});
const report={scope:'Local Chrome; mobile and touch are emulated. No publication or external delivery.',checks:[],errors:[],csp:[],http:[],external:[],performance:{},captures:[]};
const shots=[['start',0],['morph',.7],['map',1.45],['node-unfold',2.125],['mail',2.8],['carrier-turn',3.4],['tax',4],['glikemia',5.2],['world-entry',5.8],['vaeloria',6.4],['remote',7.6],['reveal',8.8],['finale',10]];
let browser,preview,previewDirectory;
async function startPreview(){
 if(process.env.PK_QA_EXISTING==='1')return;
 const {spawn}=require('node:child_process');
 previewDirectory=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'progresskit-living-qa-'));
 preview=spawn(process.env.PK_PYTHON||path.resolve(__dirname,'../.venv/bin/python'),['-m','uvicorn','preview:app','--app-dir','analytics','--host','127.0.0.1','--port',new URL(base).port,'--no-access-log'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PK_PRODUCT_DB:path.join(previewDirectory,'product.db'),PK_INQUIRIES_DB:path.join(previewDirectory,'inquiries.db'),PK_PUBLIC_ORIGIN:base},stdio:['ignore','ignore','pipe']});
 await new Promise((resolve,reject)=>{let log='';const timeout=setTimeout(()=>reject(new Error('Local preview startup timed out')),15000);
  preview.once('error',e=>{clearTimeout(timeout);reject(e)});preview.once('exit',code=>{clearTimeout(timeout);reject(new Error('Local preview exited: '+code+' '+log))});
  preview.stderr.on('data',chunk=>{log+=String(chunk);if(log.includes('Uvicorn running on')){clearTimeout(timeout);resolve();}});
 });
}
async function test(name,fn){try{const detail=await fn();report.checks.push({name,status:'PASS',detail});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'FAIL',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function setup(width=1440,height=900,options={}){
 const ctx=await browser.newContext({viewport:{width,height},...options});
 await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin){report.external.push(u.origin);return route.abort();}return route.continue();});
 await ctx.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
 const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 return {p,ctx};
}
async function home(p){const response=await p.goto(base);assert.equal(response.status(),200);await p.waitForSelector('.living-ready,.living-static');await p.waitForTimeout(100);return response;}
async function at(p,progress){await p.evaluate(value=>{const root=document.querySelector('[data-living-journey]');scrollTo({top:root.getBoundingClientRect().top+scrollY+value*document.querySelector('.living-stage').clientHeight,behavior:'instant'});},progress);await p.waitForFunction(value=>Math.abs(Number(document.querySelector('[data-living-journey]').dataset.progress)-value)<.01,progress);await p.waitForTimeout(80);}
async function snapshot(p,name){const filename=name+'.png';await p.screenshot({path:path.join(out,filename)});report.captures.push(filename);}
async function frames(p){return Number(await p.locator('[data-world-scene]').getAttribute('data-frames')||0);}
function contrast(a,b){
 const luminance=color=>{const channels=color.match(/[\d.]+/g).map(Number);assert(channels.length===3||channels[3]===1,'Measure opaque colours only: '+color);return channels.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)};
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
async function surface(locator){return locator.evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,border:s.borderTopColor,shadow:s.boxShadow,outline:s.outlineStyle,outlineWidth:s.outlineWidth,focusVisible:e.matches(':focus-visible')};});}
async function readableSurface(locator){const s=await surface(locator);assert.equal(s.backgroundImage,'none','Flat contrast sampling requires no background image/gradient');const ratio=contrast(s.color,s.background);assert(ratio>=4.5,JSON.stringify({...s,ratio}));return {...s,ratio};}
async function readableSystemSurface(locator){
 const s=await surface(locator);const canvas=await locator.evaluate(e=>getComputedStyle(e.closest('.living-stage')).backgroundColor);
 const bg=s.background.match(/[\d.]+/g).map(Number),under=canvas.match(/[\d.]+/g).map(Number),alpha=bg[3]??1;
 assert(under.length===3||under[3]===1,'System Canvas must be opaque');assert.equal(s.backgroundImage,'none');
 const composed='rgb('+bg.slice(0,3).map((v,i)=>v*alpha+under[i]*(1-alpha)).join(', ')+')',ratio=contrast(s.color,composed);
 assert(ratio>=4.5,JSON.stringify({...s,canvas,composed,ratio}));return {...s,canvas,composed,ratio};
}
async function settled(p,progress){await p.waitForFunction(value=>Math.abs(Number(document.querySelector('[data-living-journey]').dataset.progress)-value)<.01,progress);await p.waitForTimeout(100);}
async function geometry(p,mode){return p.evaluate(mode=>{
 const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
 const active=[...document.querySelectorAll('.living-chapter')].find(e=>getComputedStyle(e).visibility==='visible'&&Number(e.style.opacity)>.99);
 const node=[...document.querySelectorAll('.living-node')].find(e=>Number(e.style.getPropertyValue('--media'))>.99&&Number(e.style.opacity)>.99);
 const media=node?[...node.querySelectorAll('.living-screen,.living-diagram>span')].map(box):[];
 const copy=active?box(active.querySelector('.living-chapter__copy')):null;
 const caption=active?box(active.querySelector('.living-provenance')):null;
 const controls=[...document.querySelectorAll('.living-stage a,.living-stage button')].filter(e=>!e.closest('[inert]')&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0).map(e=>({text:e.textContent.trim().slice(0,55),hit:(()=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===e||e.contains(hit);})(),...box(e)}));
 const labels=mode==='map'?[...document.querySelectorAll('.living-node:not([inert]) .living-node__name')].map(box):[];
 const mapControls=mode==='map'?[...document.querySelectorAll('.living-map-controls button,.living-map-controls a')].map(box):null;
 const revealCopy=mode==='reveal'?box(document.querySelector('.living-reveal')):null;
 const revealMedia=mode==='reveal'?[...document.querySelectorAll('.living-node:not([inert]) .living-screen,.living-node:not([inert]) .living-diagram>span')].map(box):[];
 const revealLabels=mode==='reveal'?[...document.querySelectorAll('.living-node:not([inert]) .living-node__name')].map(box):[];
 const finale=mode==='finale'?box(document.querySelector('.living-finale')):null;
 return {revealCopy,revealMedia,revealLabels,finale,identity:box(document.querySelector('.living-identity')),hud:box(document.querySelector('.living-hud')),labels,mapControls,width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,copy,caption,media,controls,mode};
 },mode);}
async function verifyForcedColors(){
 await test('Forced colors preserve visible map controls and keyboard focus',async()=>{
  const {p,ctx}=await setup(390,844,{forcedColors:'active'});try{await home(p);await at(p,0);assert.equal(await p.locator('.living-backdrop').evaluate(e=>getComputedStyle(e).display),'none');const core=p.locator('[data-core-activate]');const normal=await readableSystemSurface(core);await core.focus();await p.keyboard.press('Enter');await p.waitForTimeout(300);const selected=await readableSystemSurface(core);await snapshot(p,'390-forced-colors-active');await at(p,1.45);const node=p.locator('.living-node').first();await node.focus();assert.equal(await node.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');assert(await p.locator('[data-map-step="1"]').isVisible());await snapshot(p,'390-forced-colors');return {normal,selected};}finally{await ctx.close();}
 });
}
(async()=>{
 try{
 await startPreview();
 browser=await chromium.launch({executablePath:process.env.PK_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 if(process.env.PK_QA_FORCED_ONLY==='1'){report.scope+=' Targeted forced-colors check only.';await verifyForcedColors();return;}
 if(process.env.PK_QA_VISUAL_ONLY==='1'){
  report.scope+=' Diagnostic captures only; no regression pass is claimed.';report.layouts=[];
  for(const [width,height] of [[1440,900],[390,844],[320,568],[768,1024]]){
   const {p,ctx}=await setup(width,height,{hasTouch:width<600,isMobile:width<600});await home(p);await p.waitForTimeout(1100);
   for(const [name,position] of shots){await at(p,position);await snapshot(p,`${width}-${name}`);report.layouts.push(await geometry(p,name));}
   await ctx.close();
  }
  return;
 }
 if(process.env.PK_QA_RECORD_ONLY!=='1'){
 for(const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844],[320,568]]){
  const {p,ctx}=await setup(width,height,{hasTouch:width<600,isMobile:width<600});
  await test(`${width}×${height}: thirteen scene positions, readable copy and uncropped media`,async()=>{
   await home(p);await p.waitForTimeout(950);
   const layouts=[];
   for(const [name,position] of shots){await at(p,position);const g=await geometry(p,name);layouts.push(g);assert(g.documentWidth<=width,JSON.stringify(g));
    for(const control of g.controls)assert(control.hit,JSON.stringify({mode:name,control}));
    if(g.mapControls)for(const label of g.labels)for(const control of g.mapControls)assert(label.right<=control.left||label.left>=control.right||label.bottom<=control.top||label.top>=control.bottom,JSON.stringify({mode:name,label,control}));
    if(g.revealCopy)for(const m of g.revealMedia){assert(g.revealCopy.right<=m.left+2||g.revealCopy.bottom<=m.top+2,JSON.stringify(g));assert(m.left>=-1&&m.right<=width+1&&m.top>=0&&m.bottom<=g.hud.top,JSON.stringify(g));}
    for(const label of g.revealLabels){assert(label.bottom<=g.hud.top,JSON.stringify(g));for(const m of g.revealMedia)assert(label.right<=m.left+2||label.left>=m.right-2||label.bottom<=m.top+2||label.top>=m.bottom-2,JSON.stringify({label,media:m,width}));}
    if(g.finale)assert(g.identity.bottom<=g.finale.top,JSON.stringify(g));
    if(g.caption)assert(g.caption.bottom<=g.hud.top,JSON.stringify(g));
    if(g.copy){assert(g.copy.left>=0&&g.copy.right<=width&&g.copy.top>=0&&g.copy.bottom<height-40,JSON.stringify(g));
     assert(await p.locator('.living-node:not([inert]) img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),'All visible product images must be decoded');
     for(const m of g.media){assert(m.left>=-1&&m.right<=width+1&&m.top>=0&&m.bottom<height-40,JSON.stringify(g));
      assert(width<1000?g.copy.bottom<=m.top+2:g.copy.right<=m.left+3,JSON.stringify(g));
      assert(g.caption.top>=m.bottom-2,JSON.stringify(g));}
    }
    await snapshot(p,`${width}-${name}`);
   }
   return layouts;
  });report.csp.push(...await p.evaluate(()=>window.__csp));await ctx.close();
 }
 const {p,ctx}=await setup();const response=await home(p);
 await test('Primary and secondary labels retain 4.5:1 contrast on their rendered opaque surfaces',async()=>{
  const samples=[];
  for(const [name,stop,selector] of [['hero',0,'[data-core-activate]'],['map',1.45,'.living-map-controls .world-control'],['mail',2.8,'[data-living-project="progresskit-mail"] .world-control'],['tax',4,'[data-living-project="progresskit-tax"] .world-control'],['glikemia',5.2,'[data-living-project="glikemia-premium"] .world-control'],['vaeloria',6.4,'[data-living-project="vaeloria"] .world-control'],['remote',7.6,'[data-living-project="progresskit-remote"] .world-control'],['reveal',8.8,'.living-reveal .world-control'],['finale',10,'.living-finale .world-control']]){
   await at(p,stop);await p.mouse.move(1,1);samples.push({name,...await readableSurface(p.locator(selector))});
   if(stop>=2.8&&stop<=7.6)samples.push({name:name+' caption',...await readableSurface(p.locator(selector).locator('xpath=ancestor::article').locator('.living-provenance'))});
  }
  samples.push({name:'motion',...await readableSurface(p.locator('[data-motion-toggle]'))});
  return {scope:'Computed foreground and opaque background of visible controls/captions; photographic scene backgrounds are reviewed visually, not certified by this test.',samples};
 });
 await test('Primary CTA exposes hover, keyboard focus, physical press and persistent selected state',async()=>{
  await at(p,0);await p.mouse.move(1,1);const button=p.locator('[data-core-activate]');const normal=await readableSurface(button);
  await button.hover();await p.waitForTimeout(250);const hover=await readableSurface(button);assert.notEqual(hover.background,normal.background);await snapshot(p,'1440-cta-hover');
  await p.mouse.down();await p.waitForTimeout(250);const pressed=await readableSurface(button);assert.notEqual(pressed.background,hover.background);assert(pressed.shadow.includes('inset'));await snapshot(p,'1440-cta-pressed');await p.mouse.move(1,1);await p.mouse.up();
  await p.keyboard.press('Tab');await button.focus();await p.waitForTimeout(250);const focus=await surface(button);assert(focus.focusVisible&&focus.outline==='solid'&&parseFloat(focus.outlineWidth)>=2);await snapshot(p,'1440-cta-focus');
  await p.keyboard.press('Enter');await p.waitForTimeout(300);assert.equal(await button.getAttribute('aria-pressed'),'true');const selected=await readableSurface(button);assert.notEqual(selected.background,normal.background);await snapshot(p,'1440-core-active');
  await p.keyboard.press('Enter');await p.waitForTimeout(300);assert.equal(await button.getAttribute('aria-pressed'),'false');await button.evaluate(e=>e.blur());
  return {normal,hover,pressed,focus,selected};
 });
 await test('Guide panel and map active state use visible edges, labels and independent keyboard focus',async()=>{
  await at(p,0);const guide=p.locator('[data-guide-toggle]');const closed=await readableSurface(guide);await guide.click();await p.mouse.move(1,1);await p.waitForTimeout(300);const open=await readableSurface(guide);assert.equal(await guide.getAttribute('aria-expanded'),'true');assert.notEqual(open.background,closed.background);
  const panel=await p.locator('#guide-panel').evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,edge:s.borderTopColor,edgeWidth:s.borderTopWidth,text:getComputedStyle(e.querySelector('p')).color};});assert(contrast(panel.text,panel.background)>=4.5);assert(parseFloat(panel.edgeWidth)>=1);for(const topic of await p.locator('.guide-topics button').all())await readableSurface(topic);await snapshot(p,'1440-guide-open');await p.keyboard.press('Escape');
  await at(p,1.45);await p.mouse.move(1,1);const node=p.locator('.living-node[data-project-id="progresskit-mail"]');const edge=node.locator('.living-hex path').first();const inactive=await edge.evaluate(e=>getComputedStyle(e).stroke);await node.hover();await p.waitForTimeout(250);const active=await edge.evaluate(e=>getComputedStyle(e).stroke);assert.notEqual(active,inactive);assert((await node.locator('.living-node__name').evaluate(e=>getComputedStyle(e).textDecorationLine)).includes('underline'));await snapshot(p,'1440-map-hover');
  await p.mouse.move(1,1);await p.keyboard.press('Tab');await node.focus();const focus=await surface(node);assert(focus.focusVisible&&focus.outline==='solid');await snapshot(p,'1440-map-focus');await node.evaluate(e=>e.blur());return {closed,open,panel,inactive,active,focus};
 });
 await home(p);
 await test('Hero has three independent depth planes and a dominant original mark',async()=>{
  await at(p,0);
  const layers=()=>p.evaluate(()=>['.living-architecture','.living-identity','.living-foreground'].map(s=>new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s)).transform).m41));
  await p.mouse.move(800,400);await p.waitForTimeout(80);const a=await layers();await p.mouse.move(1150,550);await p.waitForTimeout(80);const b=await layers();const delta=b.map((v,i)=>Math.abs(v-a[i]));
  assert(delta[0]>0&&delta[1]>delta[0]&&delta[2]>delta[1]);
  const mark=await p.locator('.living-identity img').boundingBox();assert(mark.height>=600&&mark.width>=600);return {depthPlaneShiftPx:delta,mark};
 });
 await test('One carrier unfolds the node, turns between products and freezes reversibly at a midpoint',async()=>{
  await p.evaluate(()=>window.__carrier=document.querySelector('.living-portal'));
  await at(p,1.45);const start=await p.locator('.living-portal').getAttribute('style');
  await at(p,2.125);const middle=await p.locator('.living-portal').getAttribute('style');assert.notEqual(start,middle);
  await at(p,3.4);const turn=await p.locator('.living-portal').getAttribute('style'),first=await frames(p);await p.waitForTimeout(800);assert.equal(await frames(p),first);assert.equal(await p.locator('.living-portal').getAttribute('style'),turn);
  await at(p,4);await at(p,3.4);assert.equal(await p.locator('.living-portal').getAttribute('style'),turn);
  assert(await p.evaluate(()=>window.__carrier===document.querySelector('.living-portal')));return {sameElement:true,reverseIdentical:true,frozenForMs:800};
 });
 await test('All five products occupy the main composition and keep honest media provenance',async()=>{
  const sizes=[];for(const [name,stop] of [['mail',2.8],['tax',4],['glikemia',5.2],['vaeloria',6.4],['remote',7.6]]){
   await at(p,stop);const g=await geometry(p,name);const left=Math.min(...g.media.map(m=>m.left)),right=Math.max(...g.media.map(m=>m.right)),top=Math.min(...g.media.map(m=>m.top)),bottom=Math.max(...g.media.map(m=>m.bottom));
   const widthRatio=(right-left)/g.width,heightRatio=(bottom-top)/g.height;assert(widthRatio>=.45&&heightRatio>=.5,JSON.stringify({name,widthRatio,heightRatio}));sizes.push({name,widthRatio,heightRatio});
  }
  assert((await p.locator('[data-living-project="progresskit-tax"] .living-provenance').textContent()).includes('dane DEMO'));
  assert((await p.locator('[data-living-project="vaeloria"] .living-provenance').textContent()).includes('nie render rozgrywki'));return sizes;
 });
 await test('Same original mark and node survive hero → map → product → reverse scroll',async()=>{
  await p.evaluate(()=>{window.__mark=document.querySelector('.living-identity');window.__node=document.querySelector('.living-node');});
  await at(p,.7);const before=await p.locator('.living-identity').getAttribute('style');await at(p,4);await at(p,.7);assert.equal(await p.locator('.living-identity').getAttribute('style'),before);
  assert(await p.evaluate(()=>window.__mark===document.querySelector('.living-identity')&&window.__node===document.querySelector('.living-node')));
  assert.equal(await p.locator('.living-identity').count(),1);return {originalAsset:await p.locator('.living-identity img').getAttribute('src'),reversible:true};
 });
 await test('Idle and paused scroll render zero extra scene frames',async()=>{await at(p,1.45);const before=await frames(p);await p.waitForTimeout(1100);assert.equal(await frames(p),before);return {framesIn1100ms:0};});
 await test('Hover and focus illuminate a node without navigation or panel opening',async()=>{
  const node=p.locator('.living-node[data-project-id="progresskit-mail"]');const href=p.url();await node.hover();await p.waitForTimeout(80);assert.equal(p.url(),href);assert.equal(await p.locator('[data-living-journey]').getAttribute('data-scene'),'1');assert.equal(await node.getAttribute('data-near'),'true');
  await node.focus();assert.equal(await node.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');assert.equal(p.url(),href);
 });
 await test('Click and keyboard Enter/Space zoom to Mail, Escape and back restore map',async()=>{
  const node=p.locator('.living-node[data-project-id="progresskit-mail"]');
  await node.click();await settled(p,2.8);assert.equal(new URL(p.url()).hash,'#scena-progresskit-mail');assert.equal(await p.evaluate(()=>document.activeElement.id),'living-title-progresskit-mail');
  await p.keyboard.press('Escape');await settled(p,1.45);assert.equal(await p.evaluate(()=>document.activeElement.dataset.projectId),'progresskit-mail');
  await p.keyboard.press('Enter');await settled(p,2.8);await p.goBack();await settled(p,1.45);
  await node.focus();await p.keyboard.press('Space');await settled(p,2.8);await p.locator('[data-living-project="progresskit-mail"] [data-return-map]').click();await settled(p,1.45);
 });
 await test('All 19 project links can be reached in four map groups',async()=>{
  const ids=[];for(let page=0;page<4;page++){
   ids.push(...await p.locator('.living-node:not([inert])').evaluateAll(a=>a.map(e=>e.dataset.projectId)));
   await p.locator('[data-map-step="1"]').click();await p.waitForTimeout(80);
  }
  const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalog/projects.json'))).projects.map(p=>p.id);
  assert.deepEqual(ids.slice().sort(),expected.slice().sort());return {projects:ids.length,groups:4};
 });
 await test('Motion toggle preserves the current chapter and restores the cinematic path',async()=>{
  await at(p,5.2);await p.locator('[data-motion-toggle]').click();await p.waitForSelector('.living-static');assert.equal(await p.locator('.living-node:not([inert])').count(),19);assert.equal(await p.locator('.living-chapter:not([inert])').count(),5);
  await p.locator('[data-motion-toggle]').click();await p.waitForSelector('.living-ready');await settled(p,5.2);
 });
 await test('Offscreen and persisted page lifecycle suspend rendering',async()=>{
  await p.locator('#kontakt').scrollIntoViewIfNeeded();await p.waitForTimeout(250);let before=await frames(p);await p.mouse.move(100,100);await p.waitForTimeout(250);assert.equal(await frames(p),before);
  await at(p,1.45);before=await frames(p);await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await p.mouse.move(300,400);await p.waitForTimeout(150);assert.equal(await frames(p),before);
  await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await p.waitForTimeout(150);assert((await frames(p))>before);return {offscreen:'real IntersectionObserver',pageLifecycle:'synthetic persisted pagehide/pageshow events'};
 });
 await test('Measured scrolling cadence and no autonomous rendering after it stops',async()=>{
  await at(p,0);report.performance=await p.evaluate(async()=>{
   const elapsed=[],started=performance.now();let previous=started;const scene=document.querySelector('[data-world-scene]'),first=Number(scene.dataset.frames);
   await new Promise(resolve=>{function frame(now){elapsed.push(now-previous);previous=now;scrollTo({top:Math.min(10,(now-started)/350)*innerHeight,behavior:'instant'});if(now-started<3500)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   elapsed.sort((a,b)=>a-b);let renderer='unavailable';const c=document.createElement('canvas'),gl=c.getContext('webgl');if(gl){const info=gl.getExtension('WEBGL_debug_renderer_info');if(info)renderer=gl.getParameter(info.UNMASKED_RENDERER_WEBGL);gl.getExtension('WEBGL_lose_context')?.loseContext();}
   return {durationMs:performance.now()-started,rafSamples:elapsed.length,medianMs:elapsed[Math.floor(elapsed.length*.5)],p95Ms:elapsed[Math.floor(elapsed.length*.95)],over50ms:elapsed.filter(x=>x>50).length,sceneFrames:Number(scene.dataset.frames)-first,rendererProbe:renderer,siteRenderer:scene.dataset.renderer,devicePixelRatio};
  });await p.waitForTimeout(150);const before=await frames(p);await p.waitForTimeout(750);assert.equal(await frames(p),before);return report.performance;
 });
 await test('Actual response CSP remains restrictive and no scene uses external scripts',async()=>{
  const csp=response.headers()['content-security-policy'];assert(csp.includes("script-src 'self'"));assert(!csp.includes("'unsafe-eval'"));assert(!csp.includes("'unsafe-inline'"));assert.deepEqual(await p.evaluate(()=>window.__csp),[]);return {csp};
 });
 await test('Deep links and full-product back navigation restore the selected scene',async()=>{
  await p.goto(base+'/#scena-progresskit-tax');await p.waitForSelector('.living-ready');await settled(p,4);
  await p.locator('[data-living-project="progresskit-tax"] .world-control').click();await p.waitForURL('**/projekty/progresskit-tax/');await p.goBack();await p.waitForSelector('.living-ready');await settled(p,4);
 });
 await test('Existing catalogue search, details and full product routes remain functional',async()=>{
  await p.goto(base+'/projekty/');await p.locator('#project-search').fill('OffGrid');await p.waitForTimeout(200);assert.equal(await p.locator('.catalog-card:visible').count(),1);const summary=p.locator('.catalog-card[data-id="progresskit-offgrid"] summary');await summary.focus();await p.keyboard.press('Space');assert.equal(await p.locator('.catalog-card[data-id="progresskit-offgrid"] details').getAttribute('open'),'');await p.keyboard.press('Space');assert.equal(await p.locator('.catalog-card[data-id="progresskit-offgrid"] details').getAttribute('open'),null);
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalog/projects.json'))).projects;
  for(const project of catalog){const res=await p.request.get(base+'/projekty/'+project.slug+'/');assert.equal(res.status(),200,project.id);assert((await res.text()).includes('project-world-hero'),project.id);}
  return {routes:catalog.length,search:'OffGrid',details:'open and close by Space'};
 });
 await test('Product gallery opens, changes image, closes and returns keyboard focus',async()=>{
  await p.goto(base+'/projekty/glikemia-premium/');const first=p.locator('[data-gallery-item]').first();await first.scrollIntoViewIfNeeded();await first.click();assert(await p.locator('#gallery-dialog').isVisible());await p.keyboard.press('ArrowRight');assert((await p.locator('#gallery-position').innerText()).includes('2'));await p.keyboard.press('Escape');assert(!(await p.locator('#gallery-dialog').isVisible()));assert(await first.evaluate(e=>e===document.activeElement));
 });report.csp.push(...await p.evaluate(()=>window.__csp));await ctx.close();
 for(const reduced of [false,true]){
  const {p,ctx}=await setup(390,844,{hasTouch:true,isMobile:true,reducedMotion:reduced?'reduce':'no-preference'});
  await test(reduced?'Reduced motion exposes all content and preserves navigation':'Touch, mobile menu and Guide work without hover',async()=>{
   await home(p);
   if(reduced){assert.equal(await p.locator('.living-static').count(),1);assert.equal(await p.locator('.living-node:not([inert])').count(),19);await p.locator('[data-core-activate]').click();assert.equal(await p.locator('[data-core-activate]').getAttribute('aria-pressed'),'true');const before=await frames(p);await p.waitForTimeout(400);assert.equal(await frames(p),before);await snapshot(p,'390-reduced-motion');}
   else{await at(p,1.45);await p.locator('.living-node[data-project-id="progresskit-mail"]').tap();await settled(p,2.8);await p.locator('[data-return-map]').first().tap();await settled(p,1.45);await at(p,0);
    const core=p.locator('[data-core-activate]');await core.tap();await p.waitForTimeout(300);assert.equal(await core.getAttribute('aria-pressed'),'true');await readableSurface(core);await snapshot(p,'390-core-active');await core.tap();
    await p.locator('[data-guide-toggle]').tap();await p.waitForTimeout(300);await snapshot(p,'390-guide-open');await p.keyboard.press('Escape');
   }
   await p.locator('.menu-btn').scrollIntoViewIfNeeded();await p.locator('.menu-btn').tap();assert.equal(await p.locator('.menu-btn').getAttribute('aria-expanded'),'true');await p.locator('#mobile-menu a[href="#kontakt"]').tap();assert.equal(await p.locator('.menu-btn').getAttribute('aria-expanded'),'false');await p.locator('[data-guide-toggle]').tap();assert(await p.locator('#guide-panel').isVisible());await p.keyboard.press('Escape');assert(!(await p.locator('#guide-panel').isVisible()));
  });report.csp.push(...await p.evaluate(()=>window.__csp));await ctx.close();
 }
 await test('No-JavaScript fallback retains all 19 routes, anchors and readable content',async()=>{
  const {p,ctx}=await setup(390,844,{javaScriptEnabled:false});try{await p.goto(base);assert.equal(await p.locator('.living-ready').count(),0);assert.equal(await p.locator('.living-node').count(),19);await p.locator('.living-entry-link').click();assert.equal(new URL(p.url()).hash,'#projekty');await p.waitForTimeout(900);await snapshot(p,'390-no-js-map');const link=p.locator('.living-node[data-project-id="progresskit-mail"]');await link.click();await p.waitForURL('**/projekty/progresskit-mail/');assert(await p.locator('h1').isVisible());}finally{await ctx.close();}
 });
 await verifyForcedColors();
 await test('Canvas unavailability keeps the full interactive HTML experience',async()=>{
  const {p,ctx}=await setup();try{await p.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});await home(p);assert.equal(await p.locator('[data-world-scene]').getAttribute('data-scene-state'),'fallback');await at(p,1.45);await p.locator('.living-node[data-project-id="progresskit-mail"]').click();await settled(p,2.8);assert(await p.locator('[data-living-project="progresskit-mail"] h2').isVisible());}finally{await ctx.close();}
 });
 }
 if(process.env.PK_QA_RECORD==='1'){
  report.recordings=[];
  for(const [width,height] of [[1440,900],[390,844]]){
   const {p,ctx}=await setup(width,height,{hasTouch:width<600,isMobile:width<600,recordVideo:{dir:path.join(out,'raw-video'),size:{width,height}}});
   await home(p);await p.waitForTimeout(1600);
   for(const [,progress] of shots.filter(s=>s[0]!=='start')){
    await p.evaluate(async value=>{const root=document.querySelector('[data-living-journey]'),y=root.getBoundingClientRect().top+scrollY+value*document.querySelector('.living-stage').clientHeight,from=scrollY,started=performance.now();await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-started)/1700),ease=t*t*(3-2*t);scrollTo({top:from+(y-from)*ease,behavior:'instant'});if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});},progress);
    await settled(p,progress);await p.waitForTimeout([.7,2.125,3.4,5.8].includes(progress)?500:1200);
    console.log(`RECORD ${width}: scroll ${progress}`);
   }
   // Show an actual reverse transformation before returning to the contact finale.
   for(const progress of [8.8,10]){
    await p.evaluate(value=>{const root=document.querySelector('[data-living-journey]');scrollTo({top:root.getBoundingClientRect().top+scrollY+value*document.querySelector('.living-stage').clientHeight,behavior:'smooth'});},progress);await settled(p,progress);await p.waitForTimeout(1000);
   }
   const video=p.video();report.csp.push(...await p.evaluate(()=>window.__csp));await ctx.close();const file=`${width}-journey.webm`;await video.saveAs(path.join(out,file));report.recordings.push(file);
  }
 }
 await test('No JavaScript exceptions, CSP violations or unexpected failed resources',async()=>{
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.csp,[]);assert.deepEqual(report.external,[]);
  const unexpected=report.http.filter(x=>!(x.status===503&&x.path==='/api/project-inquiries/token'));assert.deepEqual(unexpected,[]);
  return {exceptions:0,cspViolations:0,externalRequests:0,expectedUnconfiguredInquiry503:report.http.length,formSubmissions:0,apkTransfers:0};
 });
 }catch(e){report.fatal=e.stack;console.error(e);}
 finally{await browser?.close();if(preview){preview.kill('SIGTERM');await new Promise(resolve=>{preview.once('exit',resolve);setTimeout(resolve,1500)});}if(previewDirectory)fs.rmSync(previewDirectory,{recursive:true,force:true});if(ffmpegCache)fs.rmSync(ffmpegCache,{recursive:true,force:true});report.PASS=report.checks.filter(x=>x.status==='PASS').length;report.FAIL=report.checks.filter(x=>x.status==='FAIL').length+(report.fatal?1:0);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,out}));if(report.FAIL)process.exitCode=1;}
})();
