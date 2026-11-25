/* Current installation regression. Local only: no production requests, submissions
   or APK transfers. Default evidence is one temporary JSON, no images or videos. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwrightPath=process.env.PK_PLAYWRIGHT||'/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(playwrightPath);
const {PNG}=require(require.resolve('pngjs',{paths:[path.dirname(playwrightPath)]}));
const root=path.resolve(__dirname,'..'),base=process.env.PK_QA_URL||'http://127.0.0.1:8265';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const out=path.resolve(process.env.PK_QA_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'progresskit-living-qa-')));fs.mkdirSync(out,{recursive:true});
const reportFile=path.resolve(process.env.PK_QA_REPORT||path.join(out,'checks.json'));fs.mkdirSync(path.dirname(reportFile),{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog/projects.json'))).projects;
const expectedIds=catalog.map(p=>p.id),groups=Math.ceil(catalog.length/6);
const report={scope:'Current local Chromium installation. Touch/mobile emulated; no physical-device acceptance or owner visual approval.',catalogCount:catalog.length,checks:[],errors:[],csp:[],http:[],external:[],performance:{},captures:[]};
let browser,preview,previewDirectory,sceneStops=[];const responseBodies=[];
async function startPreview(){
 try{const r=await fetch(base,{signal:AbortSignal.timeout(1500)});if(r.ok){report.preview='Existing local server';return;}}catch{}
 if(process.env.PK_QA_EXISTING==='1')throw Error('Required local preview is unavailable at '+base);
 const{spawn}=require('node:child_process');previewDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'progresskit-living-db-'));
 preview=spawn(process.env.PK_PYTHON||path.join(root,'.venv/bin/python'),['-m','uvicorn','preview:app','--app-dir','analytics','--host','127.0.0.1','--port',new URL(base).port,'--no-access-log'],{cwd:root,env:{...process.env,PK_PRODUCT_DB:path.join(previewDirectory,'product.db'),PK_INQUIRIES_DB:path.join(previewDirectory,'inquiries.db'),PK_PUBLIC_ORIGIN:base},stdio:['ignore','ignore','pipe']});
 await new Promise((resolve,reject)=>{let log='';const deadline=setTimeout(()=>reject(Error('Local preview startup timed out')),15000);preview.once('error',e=>{clearTimeout(deadline);reject(e)});preview.once('exit',code=>{clearTimeout(deadline);reject(Error('Preview exited '+code+' '+log))});preview.stderr.on('data',chunk=>{log+=chunk;if(log.includes('Uvicorn running on')){clearTimeout(deadline);resolve();}});});report.preview='Isolated temporary preview';
}
async function test(name,fn){try{const detail=await fn();report.checks.push({name,status:'PASS',detail});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'FAIL',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function setup(width=1440,height=900,options={}){
 const ctx=await browser.newContext({viewport:{width,height},...options});
 await ctx.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin){report.external.push(url.origin);return route.abort();}return route.continue();});
 await ctx.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
 const p=await ctx.newPage();p.setDefaultTimeout(7000);p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()<400)return;const item={path:new URL(r.url()).pathname,status:r.status()};report.http.push(item);if(item.path==='/api/project-inquiries/token'&&item.status===429)responseBodies.push(r.json().then(body=>{item.code=body.detail?.code;item.noStore=(r.headers()['cache-control']||'').includes('no-store');}).catch(()=>{item.code='unreadable';}));});
 return{p,ctx};
}
async function collect(p){report.csp.push(...await p.evaluate(()=>window.__csp||[]));}
async function home(p){const response=await p.goto(base,{waitUntil:'networkidle'});assert.equal(response.status(),200);await p.waitForSelector('.living-ready,.living-static');return response;}
async function settled(p,value){
 try {
  await p.waitForFunction(v=>Math.abs(Number(document.querySelector('[data-living-journey]').dataset.progress)-v)<.012,value);
 } catch(error) {
  const position=await p.evaluate(()=>{const r=document.querySelector('[data-living-journey]');return {scene:r?.dataset.scene,progress:r?.dataset.progress,width:innerWidth,y:scrollY,hash:location.hash};});
  throw new Error('Expected scroll stop '+value+'; observed '+JSON.stringify(position),{cause:error});
 }
 await p.waitForTimeout(100);
}
async function at(p,value){await p.evaluate(v=>{const r=document.querySelector('[data-living-journey]');scrollTo({top:r.getBoundingClientRect().top+scrollY+v*r.querySelector('.living-stage').clientHeight,behavior:'instant'});},value);await settled(p,value);}
async function frames(p){return Number(await p.locator('[data-world-scene]').getAttribute('data-frames')||0);}
async function readyScene(p){await p.waitForFunction(()=>document.querySelector('[data-world-scene]').dataset.sceneState==='ready');}
async function snapshot(p,name){if(process.env.PK_QA_CAPTURE!=='1')return;const file=name+'.png';await p.screenshot({path:path.join(out,file)});report.captures.push(file);}
function ratio(a,b){const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);return(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);}
async function surface(locator){return locator.evaluate(e=>{const s=getComputedStyle(e);return{color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,border:s.borderTopColor,shadow:s.boxShadow,transform:s.transform,translate:s.translate,outline:s.outlineStyle,outlineWidth:s.outlineWidth,focusVisible:e.matches(':focus-visible')};});}
// Capture the real backdrop beneath the actual label rectangles, with the label
// ink temporarily transparent. This measures alpha/glass/gradient composition,
// rather than pretending the new material is an opaque flat color. No file saved.
async function readableSurface(locator){
 const forced=await locator.evaluate(()=>matchMedia('(forced-colors: active)').matches);
 const labels=await locator.evaluate((e,forced)=>{const box=e.getBoundingClientRect(),labels=[],walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;window.__livingInk=[];
  while(node=walker.nextNode()){const parent=node.parentElement,s=getComputedStyle(parent);if(!/[\p{L}\p{N}]/u.test(node.textContent)||parent.closest('[aria-hidden="true"],.sr-only')||s.display==='none'||s.visibility==='hidden')continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width>0&&r.height>0)labels.push({text:node.textContent.trim().slice(0,75),color:s.color.match(/[\d.]+/g).map(Number),x:r.x-box.x,y:r.y-box.y,width:r.width,height:r.height});}
  if(!forced)for(const target of [e,...e.querySelectorAll('*')]){window.__livingInk.push([target,target.getAttribute('style')]);target.style.setProperty('color','transparent','important');target.style.setProperty('-webkit-text-fill-color','transparent','important');target.style.setProperty('text-shadow','none','important');}return labels;},forced);
 let png;try{png=PNG.sync.read(await locator.screenshot({animations:'disabled'}));}finally{await locator.evaluate(()=>{for(const[e,style]of window.__livingInk||[])style===null?e.removeAttribute('style'):e.setAttribute('style',style);delete window.__livingInk;});}
 assert(labels.length>0,'No visible text labels to measure');const css=await locator.boundingBox(),sx=png.width/css.width,sy=png.height/css.height;
 const measurements=labels.map(label=>{assert(label.color[3]===undefined||label.color[3]===1,'Label ink must be opaque');let minimum=Infinity,background;const palette=new Map();
  const left=Math.max(0,Math.ceil(label.x*sx)),right=Math.min(png.width,Math.floor((label.x+label.width)*sx)),top=Math.max(0,Math.ceil(label.y*sy)),bottom=Math.min(png.height,Math.floor((label.y+label.height)*sy));
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const i=(y*png.width+x)*4,bg=[...png.data.slice(i,i+3)],r=ratio(label.color,bg);if(forced){const key=bg.join(',');palette.set(key,(palette.get(key)||0)+1);}else if(r<minimum){minimum=r;background=bg;}}
  if(forced){assert(palette.size>0);background=[...palette.entries()].sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number);minimum=ratio(label.color,background);}
  assert(Number.isFinite(minimum),'Label rectangle outside sampled control');assert(minimum>=4.5,JSON.stringify({text:label.text,ratio:minimum,foreground:label.color,background}));return{text:label.text,minimumContrast:minimum,foreground:label.color,background};});
 return{method:forced?'Forced-colors keeps system ink despite author transparency. Measure the modal flat system backdrop pixel in each unmodified label rectangle.':'Rendered PNG backdrop pixels under visible text rectangles; temporary transparent ink; every sampled background pixel >=4.5:1.',labels:measurements};
}
async function geometry(p,mode){return p.evaluate(mode=>{
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
 const active=[...document.querySelectorAll('.living-chapter')].find(e=>getComputedStyle(e).visibility==='visible'&&Number(e.style.opacity)>.99);
 const node=[...document.querySelectorAll('.living-node')].find(e=>Number(e.style.getPropertyValue('--media'))>.99&&Number(e.style.opacity)>.99);
 const controls=[...document.querySelectorAll('.living-stage a,.living-stage button')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return!e.closest('[inert]')&&s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0;}).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:e.textContent.trim().slice(0,60),hit:hit===e||e.contains(hit),...box(e)};});
 return{mode,width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,copy:active?box(active.querySelector('.living-chapter__copy')):null,caption:active?box(active.querySelector('.living-provenance')):null,media:node?[...node.querySelectorAll('.living-screen')].map(box):[],rotor:box(document.querySelector('.core-rotor')),identity:box(document.querySelector('.living-identity')),hud:box(document.querySelector('.living-hud')),controls,labels:mode==='map'?[...document.querySelectorAll('.living-node:not([inert]) .living-node__name')].map(box):[],mapControls:mode==='map'?[...document.querySelectorAll('.living-map-controls button,.living-map-controls a')].map(box):[],revealCopy:mode==='reveal'?box(document.querySelector('.living-reveal')):null,revealMedia:mode==='reveal'?[...document.querySelectorAll('.living-node:not([inert]) .living-screen')].map(box):[],finale:mode==='finale'?box(document.querySelector('.living-finale')):null};
 },mode);}
function separate(a,b,tolerance=2){return a.right<=b.left+tolerance||a.left>=b.right-tolerance||a.bottom<=b.top+tolerance||a.top>=b.bottom-tolerance;}
async function forcedColors(){await test('Forced colors preserve readable labels, map controls and keyboard focus',async()=>{const{p,ctx}=await setup(390,844,{forcedColors:'active'});try{await home(p);const normal=await readableSurface(p.locator('[data-core-activate]'));await p.locator('[data-core-activate]').focus();await p.keyboard.press('Enter');await settled(p,1.45);const node=p.locator('.living-node').first();await node.focus();assert.equal((await surface(node)).outline,'solid');assert(await p.locator('[data-map-step="1"]').isVisible());const paging=await readableSurface(p.locator('.living-map-controls .world-control'));await snapshot(p,'forced-colors');await collect(p);return{normal,paging};}finally{await ctx.close();}});}
(async()=>{try{
 await startPreview();browser=await chromium.launch({executablePath:process.env.PK_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-gpu','--use-gl=angle','--use-angle=gl','--ozone-platform=x11','--ignore-gpu-blocklist','--disable-background-networking']});
 if(process.env.PK_QA_FORCED_ONLY==='1'){await forcedColors();return;}
 const discovery=await setup();await home(discovery.p);sceneStops=await discovery.p.locator('[data-living-project]').evaluateAll(chapters=>chapters.map(e=>({id:e.dataset.livingProject,stop:Number(document.querySelector('#scena-'+e.dataset.livingProject).dataset.stop)})));await collect(discovery.p);await discovery.ctx.close();
 assert(sceneStops.length>0,'Featured product scenes required');const shotStops=[['hero',0],['morph',.7],['map',1.45],...sceneStops.flatMap((scene,index)=>[[scene.id,scene.stop],...(index<sceneStops.length-1?[['turn-'+index,(scene.stop+sceneStops[index+1].stop)/2]]:[])]),['reveal',8.8],['finale',10]];
 await test('Direct map entry stays usable without flashing hero while its module is delayed',async()=>{
  const samples=[];
  for(const[width,height]of[[390,844],[1366,768]]){
   const{p,ctx}=await setup(width,height);let release,held=false;
   const gate=new Promise(resolve=>{release=resolve;});
   try{
    await ctx.route('**/assets/living-experience.mjs',async route=>{held=true;await gate;await route.continue().catch(()=>{});});
    await ctx.addInitScript(()=>{
     window.__mapEntryFrames=[];window.__mapEntrySampling=true;
     function visible(element){if(!element)return false;const s=getComputedStyle(element),r=element.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity)>.05&&r.width>0&&r.height>0;}
     function sample(){const root=document.querySelector('[data-living-journey]');if(root&&location.hash==='#projekty')window.__mapEntryFrames.push({enhanced:root.classList.contains('living-ready'),hero:visible(root.querySelector('.living-intro')),machine:visible(root.querySelector('.living-identity')),mapParsed:!!root.querySelector('.living-map-heading'),map:visible(root.querySelector('.living-map-heading')),readyState:document.readyState});if(window.__mapEntrySampling)requestAnimationFrame(sample);}
     requestAnimationFrame(sample);
    });
    const request=p.waitForRequest(r=>new URL(r.url()).pathname==='/assets/living-experience.mjs');
    const response=await p.goto(base+'/#projekty',{waitUntil:'commit'});assert.equal(response.status(),200);await request;
    await p.waitForSelector('.living-map-heading');assert(held,'The actual installation module was not intercepted');
    assert.equal(await p.locator('.living-ready,.living-static').count(),0,'Module ran before the delayed-entry assertions');
    assert(!(await p.locator('.living-intro').isVisible()),'Hero flashes before the module loads');assert(!(await p.locator('.living-identity').isVisible()),'Logo flashes before the module loads');
    const link=p.locator('.living-node').first();await link.click({trial:true});
    const destination=new URL(await link.getAttribute('href'),base+'/').href;
    const[opened]=await Promise.all([ctx.waitForEvent('page'),link.click({modifiers:['Control']})]);
    await opened.waitForURL(destination);assert(await opened.locator('h1').isVisible(),'Native map link does not reach its real product');await collect(opened);await opened.close();
    await p.evaluate(()=>new Promise(resolve=>{let count=0;function frame(){if(++count>=6)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
    const before=await p.evaluate(()=>window.__mapEntryFrames.filter(f=>!f.enhanced));assert(before.length>=2,'No pending-module paint samples collected');assert(before.every(f=>!f.hero&&!f.machine),'An incoming frame showed the home scene');assert(before.some(f=>f.mapParsed)&&before.filter(f=>f.mapParsed).every(f=>f.map),'Parsed map heading hidden before enhancement: '+JSON.stringify(before));
    release();await p.waitForSelector('.living-ready');await settled(p,1.45);
    assert(!(await p.locator('.living-intro').isVisible()),'Hero visible after map enhancement');assert.equal(await p.locator('.living-identity').evaluate(e=>Number(getComputedStyle(e).opacity)),0);assert(await p.locator('.living-map-heading').isVisible());
    await link.click({trial:true});const paints=await p.evaluate(()=>{window.__mapEntrySampling=false;return window.__mapEntryFrames;});assert(paints.every(f=>!f.hero&&!f.machine),'A hero frame leaked during module release: '+JSON.stringify(paints));assert(paints.some(f=>f.enhanced&&f.map),'No enhanced-map paint sample collected');
    const id=await link.getAttribute('data-project-id'),scene=sceneStops.find(s=>s.id===id);assert(scene,'First catalog group must expose its featured product');await link.focus();await p.keyboard.press('Enter');await settled(p,scene.stop);assert(await p.locator(`[data-living-project="${id}"] h2`).isVisible());
    await home(p);assert(await p.locator('.living-intro').isVisible(),'Normal home entry lost its hero');assert(await p.locator('[data-original-mechanism] .core-rotor').isVisible(),'Normal home entry lost its original shutter');await p.locator('[data-core-activate]').click();await settled(p,1.45);
    await collect(p);samples.push({width,height,nativeDestination:new URL(destination).pathname,pendingPaintSamples:before.length,totalMapPaintSamples:paints.length,normalHomeActivation:true});
   }finally{release();await ctx.close();}
  }
  return samples;
 });
 for(const[width,height]of[[320,720],[360,720],[390,844],[412,915],[768,1024],[1024,768],[1366,768],[1920,1080]])await test(`${width}x${height}: scene geometry, actionable controls and complete media`,async()=>{
  const{p,ctx}=await setup(width,height,{hasTouch:width<768,isMobile:width<768});try{await home(p);const layouts=[];for(const[name,stop]of shotStops){await at(p,stop);const g=await geometry(p,name);layouts.push(g);assert(g.documentWidth<=width+1,JSON.stringify(g));for(const control of g.controls)assert(control.hit,JSON.stringify({mode:name,control}));
   if(name==='hero'){assert(g.rotor.left>=-1&&g.rotor.right<=width+1&&g.rotor.top>=0&&g.rotor.bottom<=height+1,JSON.stringify(g.rotor));}
   for(const label of g.labels)for(const control of g.mapControls)assert(separate(label,control),JSON.stringify({label,control}));
   if(g.copy){assert(g.copy.left>=0&&g.copy.right<=width+1&&g.copy.top>=0&&g.copy.bottom<height-30,JSON.stringify(g));await p.waitForFunction(()=>[...document.querySelectorAll('.living-node:not([inert]) .living-screen')].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:1500});for(const media of g.media){assert(media.left>=-1&&media.right<=width+1&&media.top>=0&&media.bottom<height-20,JSON.stringify(g));assert(separate(g.copy,media),JSON.stringify(g));assert(g.caption.top>=media.bottom-2,JSON.stringify(g));}assert(g.caption.bottom<=g.hud.top+1,JSON.stringify(g));}
   if(g.revealCopy)for(const media of g.revealMedia){assert(separate(g.revealCopy,media),JSON.stringify(g));assert(media.left>=-1&&media.right<=width+1&&media.top>=0&&media.bottom<=g.hud.top+1,JSON.stringify(g));}
   if(g.finale)assert(g.identity.bottom<=g.finale.top+2,JSON.stringify(g));await snapshot(p,`${width}-${name}`);
  }await collect(p);return{positions:layouts.length,width,height};}finally{await ctx.close();}
 });
 const{p,ctx}=await setup();const response=await home(p);
 await test('Rendered primary/secondary labels and provenance retain 4.5:1 contrast on glass',async()=>{const samples=[];for(const[name,stop,selector]of[['core',0,'[data-core-activate]'],['map',1.45,'.living-map-controls .world-control'],...sceneStops.map(s=>[s.id,s.stop,`[data-living-project="${s.id}"] .world-control`]),['reveal',8.8,'.living-reveal .world-control'],['finale',10,'.living-finale .world-control']]){await at(p,stop);await p.mouse.move(1,1);samples.push({name,...await readableSurface(p.locator(selector).first())});if(sceneStops.some(s=>s.id===name))samples.push({name:name+' provenance',...await readableSurface(p.locator(`[data-living-project="${name}"] .living-provenance`))});}return samples;});
 await test('Core hover, physical press, keyboard focus and activation open the map',async()=>{await at(p,0);const button=p.locator('[data-core-activate]');await p.mouse.move(1,1);const normal=await surface(button);await button.hover();await p.waitForTimeout(200);const hover=await surface(button);assert(hover.border!==normal.border||hover.backgroundImage!==normal.backgroundImage,'Hover has no material response');await p.mouse.down();await p.waitForTimeout(180);const press=await surface(button);assert(press.shadow.includes('inset'));assert(press.translate!==hover.translate||press.transform!==hover.transform);await p.mouse.move(1,1);await p.mouse.up();await p.keyboard.press('Tab');await button.focus();const focus=await surface(button);assert(focus.focusVisible&&focus.outline==='solid'&&parseFloat(focus.outlineWidth)>=2);await p.keyboard.press('Enter');await settled(p,1.45);assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await p.locator('body').getAttribute('data-core-state'),'active');await at(p,0);await button.focus();await p.keyboard.press('Enter');await settled(p,1.45);assert.equal(await button.getAttribute('aria-pressed'),'true');return{normal,hover,press,focus,activation:'Idempotent map opening, not a historical on/off toggle'};});
 await test('Polish drone explains catalog projects, contrast, keyboard close and independent map focus',async()=>{await at(p,0);const drone=p.locator('[data-drone-toggle]');await drone.click();assert.equal(await drone.getAttribute('aria-expanded'),'true');const panel=p.locator('#guide-panel');assert(await panel.isVisible());const options=p.locator('[data-guide-project]');assert.equal(await options.locator('option').count(),catalog.length);await options.selectOption('taskpet');await p.locator('[data-guide-topic=feature]').click();assert.equal(await p.locator('[data-guide-copy]').textContent(),await options.locator('option:checked').getAttribute('data-feature'));const samples=[];for(const topic of await p.locator('.guide-topics button').all())samples.push(await readableSurface(topic));samples.push(await readableSurface(p.locator('[data-motion-toggle]')));assert(!/GUIDE|INITIALIZATION|PROCESSING/.test(await panel.innerText()));await p.keyboard.press('Escape');assert(!(await panel.isVisible()));assert(await drone.evaluate(e=>document.activeElement===e));await at(p,1.45);const node=p.locator('.living-node').first(),label=node.locator('.living-node__name');await p.mouse.move(1,1);const before=await label.evaluate(e=>getComputedStyle(e).color);await node.hover();await p.waitForTimeout(100);assert.notEqual(await label.evaluate(e=>getComputedStyle(e).color),before);await p.keyboard.press('Tab');await node.focus();assert.equal((await surface(node)).outline,'solid');return{projects:catalog.length,contrast:samples};});
 await home(p);
 await test('Original shutter moves inside its fixed housing with three independent depth planes',async()=>{await at(p,0);const layers=()=>p.evaluate(()=>['.living-architecture','.living-identity','.living-foreground'].map(s=>new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s)).transform).m41));await p.mouse.move(800,400);await p.waitForTimeout(80);const a=await layers();await p.mouse.move(1150,550);await p.waitForTimeout(80);const b=await layers(),delta=b.map((v,i)=>Math.abs(v-a[i]));assert(delta.every(x=>x>0));assert(delta[2]>Math.max(delta[0],delta[1]));assert(Math.abs(delta[0]-delta[1])>.1);const rotor=p.locator('.core-rotor');const rect=await rotor.boundingBox();assert(rect.width>=1440*.15&&rect.height>=1440*.15);const first=await rotor.evaluate(e=>getComputedStyle(e).transform);await p.waitForFunction(previous=>getComputedStyle(document.querySelector('.core-rotor')).transform!==previous,first,{timeout:2500});assert.equal(await p.locator('[data-original-mechanism] [data-iris-blade]').count(),6);assert(await p.locator('.core-sigil').evaluate(e=>e.complete&&e.naturalWidth&&e.currentSrc.endsWith('/progresskit-mark-hero.webp')));assert(await p.locator('.core-housing img').evaluate(e=>e.complete&&e.naturalWidth>0&&e.currentSrc.includes('optical-core')));return{depthPlaneShiftPx:delta,shutter:rect};});
 await test('The room moves reversibly, idle vapour animates, and consecutive product media never overlap',async()=>{
  await at(p,1.45);
  const room=p.locator('.living-architecture'), air=p.locator('[data-forge-atmosphere]');
  const start=await room.evaluate(e=>e.style.transform);
  await at(p,2.125);
  assert.notEqual(await room.evaluate(e=>e.style.transform),start);
  const midpoint=(sceneStops[0].stop+sceneStops[1].stop)/2;
  await at(p,midpoint);
  const pose=await room.evaluate(e=>e.style.transform);
  await readyScene(p);
  const before=await frames(p),airBefore=Number(await air.getAttribute('data-frames'));
  await p.waitForTimeout(650);
  assert.equal(await frames(p),before);
  assert(Number(await air.getAttribute('data-frames'))>airBefore);
  await at(p,sceneStops[1].stop);
  await at(p,midpoint);
  assert.equal(await room.evaluate(e=>e.style.transform),pose);
  const samples=await p.evaluate(async stops=>{
    const root=document.querySelector('[data-living-journey]'), stage=root.querySelector('.living-stage');
    const top=root.getBoundingClientRect().top+scrollY;
    let positions=0,maxProducts=0,staleCopies=0;
    for(let i=0;i<stops.length-1;i++){
      for(let j=0;j<=20;j++){
        scrollTo({top:top+(stops[i]+(stops[i+1]-stops[i])*j/20)*stage.clientHeight,behavior:'instant'});
        await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
        const shown=[...root.querySelectorAll('.living-node[data-media-visible=true]')].filter(n=>getComputedStyle(n).visibility==='visible'&&Number(n.style.opacity)>.015);
        const texts=[...root.querySelectorAll('[data-living-project]')].filter(n=>getComputedStyle(n).visibility==='visible'&&Number(n.style.opacity)>.015);
        maxProducts=Math.max(maxProducts,shown.length);
        if(shown.length&&texts.some(t=>t.dataset.livingProject!==shown[0].dataset.projectId))staleCopies++;
        positions++;
      }
    }
    return {positions,maxProducts,staleCopies};
  },sceneStops.map(s=>s.stop));
  assert.equal(samples.maxProducts,1);assert.equal(samples.staleCopies,0);
  return {...samples,webglIdleDraws:0,atmosphereActive:true};
 });
 await test('Interrupted activation yields to the wheel and the same iris closes on reverse scroll',async()=>{
  await at(p,0);
  const leaves=()=>p.locator('[data-iris-blade]').evaluateAll(items=>items.map(e=>getComputedStyle(e).transform));
  const rest=await leaves();
  await p.locator('[data-core-activate]').click();
  await p.waitForFunction(()=>Number(document.querySelector('.living-journey').dataset.opening)>.32);
  await p.mouse.wheel(0,-64);
  // A real wheel gesture can continue scrolling on the compositor after its
  // event. Wait for the user's scroll to settle before measuring the hold.
  await p.waitForFunction(()=>{const pos=scrollY,now=performance.now();if(window.__irisWheelY!==pos){window.__irisWheelY=pos;window.__irisWheelSince=now;}return now-window.__irisWheelSince>340;});
  const read=()=>p.locator('.living-journey').getAttribute('data-opening');
  const held=Number(await read()),spread=await leaves();
  assert(held>0&&held<.9);
  assert.equal(new Set(spread).size,6);
  await p.waitForTimeout(450);assert.equal(Number(await read()),held);
  await at(p,0);assert.deepEqual(await leaves(),rest);
  await at(p,1.45);await readyScene(p);
  const initial=await frames(p);await p.waitForTimeout(680);const ticks=await frames(p)-initial;
  assert(ticks>0&&ticks<32,'Visible floating solids must update on a bounded clock');
  return{held,independentVanes:spread.length,mapFramesIn680ms:ticks};
 });
 await test('Every featured product has large genuine media and its source caption',async()=>{const specs=JSON.parse(fs.readFileSync(path.join(root,'catalog/product-showcases.json'))),living=JSON.parse(fs.readFileSync(path.join(root,'catalog/living-media.json'))),captions=[];function walk(x){if(x&&typeof x==='object'){if(x.caption)captions.push(x.caption);Object.values(x).forEach(walk);}}walk(specs);walk(living);walk(catalog);const sizes=[];for(const scene of sceneStops){await at(p,scene.stop);const g=await geometry(p,scene.id);assert(g.media.length>0);const left=Math.min(...g.media.map(m=>m.left)),right=Math.max(...g.media.map(m=>m.right)),top=Math.min(...g.media.map(m=>m.top)),bottom=Math.max(...g.media.map(m=>m.bottom)),widthRatio=(right-left)/g.width,heightRatio=(bottom-top)/g.height;const allocated=await p.locator(`.living-node[data-project-id="${scene.id}"] .living-media`).boundingBox(),widthUse=(right-left)/allocated.width,heightUse=(bottom-top)/allocated.height;assert(allocated.width/g.width>=.45&&allocated.height/g.height>=.5,'Allocated exhibit lost main composition size');assert(widthUse>=.75&&heightUse>=.75&&heightRatio>=.5&&(right-left)>=g.copy.width,JSON.stringify({id:scene.id,widthRatio,heightRatio,widthUse,heightUse}));const copy=await p.locator(`[data-living-project="${scene.id}"] .living-provenance`).textContent();if(scene.id==='progresskit-tax'){assert(/DEMO/.test(copy)&&/Android/.test(copy)&&/MFA/.test(copy),'Tax lost WWW DEMO / native Android MFA provenance');const sources=await p.locator('.living-node[data-project-id="progresskit-tax"] .living-screen').evaluateAll(images=>images.map(i=>new URL(i.src).pathname));assert.deepEqual(sources.sort(),[specs['progresskit-tax'].hero.src,specs['progresskit-tax'].android.src].map(s=>'/'+s).sort());}else assert(captions.some(c=>copy.includes(c)),scene.id+' lost real provenance');sizes.push({id:scene.id,widthRatio,heightRatio,allocatedWidthRatio:allocated.width/g.width,allocatedHeightRatio:allocated.height/g.height,widthUse,heightUse});}return sizes;});
 await test('Hover/focus illuminate without navigation; Enter/Space/Escape/history restore the map',async()=>{await at(p,1.45);const node=p.locator('.living-node').first(),id=await node.getAttribute('data-project-id'),scene=sceneStops.find(s=>s.id===id),url=p.url();await node.hover();await p.waitForTimeout(100);assert.equal(p.url(),url);assert.equal(await node.getAttribute('data-near'),'true');await node.focus();assert.equal((await surface(node)).outline,'solid');await p.keyboard.press('Enter');await settled(p,scene.stop);assert.equal(new URL(p.url()).hash,'#scena-'+id);assert.equal(await p.evaluate(()=>document.activeElement.id),'living-title-'+id);await p.keyboard.press('Escape');await settled(p,1.45);assert.equal(await p.evaluate(()=>document.activeElement.dataset.projectId),id);await p.keyboard.press('Space');await settled(p,scene.stop);await p.goBack();await settled(p,1.45);await node.click();await settled(p,scene.stop);await p.locator(`[data-living-project="${id}"] [data-return-map]`).click();await settled(p,1.45);return{project:id,keys:['Enter','Space','Escape'],history:true};});
 await test('All catalog projects are reachable through the derived map groups',async()=>{await at(p,1.45);const ids=[];for(let i=0;i<groups;i++){ids.push(...await p.locator('.living-node:not([inert])').evaluateAll(nodes=>nodes.map(n=>n.dataset.projectId)));await p.locator('[data-map-step="1"]').click();await p.waitForTimeout(100);}assert.deepEqual(ids.sort(),expectedIds.slice().sort());return{projects:ids.length,groups};});
 await test('Motion pause preserves a chapter, exposes every route and stops WebGL',async()=>{const stop=sceneStops[Math.floor(sceneStops.length/2)].stop;await at(p,stop);const before=await frames(p);await p.locator('[data-motion-toggle]').evaluate(e=>e.click());await p.waitForSelector('.living-static');assert.equal(await p.locator('.living-node:not([inert])').count(),catalog.length);assert.equal(await p.locator('.living-chapter:not([inert])').count(),sceneStops.length);await p.waitForTimeout(450);assert.equal(await frames(p),before);await p.locator('[data-motion-toggle]').evaluate(e=>e.click());await p.waitForSelector('.living-ready');await settled(p,stop);return{chapterStop:stop,control:'Existing native toggle clicked programmatically to test state at an offscreen chapter; its visible UI is tested in the drone check.'};});
 await test('Real offscreen state and persisted page lifecycle suspend and resume rendering',async()=>{await p.locator('footer').scrollIntoViewIfNeeded();await p.waitForTimeout(250);let before=await frames(p);await p.mouse.move(100,100);await p.waitForTimeout(300);assert.equal(await frames(p),before);await at(p,1.45);before=await frames(p);await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await p.mouse.move(300,400);await p.waitForTimeout(180);assert.equal(await frames(p),before);await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await p.waitForFunction(n=>Number(document.querySelector('[data-world-scene]').dataset.frames)>n,before);return{offscreen:'Real IntersectionObserver',pageLifecycle:'Synthetic persisted pagehide/pageshow events'};});
 await test('Measured scroll cadence and a stationary finale stop WebGL drawing',async()=>{await at(p,0);report.performance=await p.evaluate(async()=>{const times=[],r=document.querySelector('[data-living-journey]'),stage=r.querySelector('.living-stage'),top=r.getBoundingClientRect().top+scrollY,scene=r.querySelector('[data-world-scene]'),first=Number(scene.dataset.frames),start=performance.now();let last=start;await new Promise(resolve=>{function frame(now){times.push(now-last);last=now;scrollTo({top:top+Math.min(10,(now-start)/300)*stage.clientHeight,behavior:'instant'});if(now-start<3000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});times.sort((a,b)=>a-b);return{durationMs:performance.now()-start,rafSamples:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],over50ms:times.filter(x=>x>50).length,sceneFrames:Number(scene.dataset.frames)-first,renderer:scene.dataset.renderer,devicePixelRatio};});await p.waitForTimeout(150);const before=await frames(p);await p.waitForTimeout(600);assert.equal(await frames(p),before);return report.performance;});
 await test('Response CSP remains restrictive and uses no external scene scripts',async()=>{const csp=response.headers()['content-security-policy'];assert(csp?.includes("script-src 'self'"));assert(!csp.includes("'unsafe-eval'"));assert(!csp.includes("'unsafe-inline'"));assert.deepEqual(await p.evaluate(()=>window.__csp),[]);return{csp};});
 await test('Deep scene links, full product pages and browser back restore the selected scene',async()=>{const scene=sceneStops.find(s=>s.id==='progresskit-tax')||sceneStops[0];await p.goto(base+'/#scena-'+scene.id);await p.waitForSelector('.living-ready');await settled(p,scene.stop);await p.locator(`[data-living-project="${scene.id}"] .world-control`).first().click();await p.waitForURL('**/projekty/'+scene.id+'/');await p.goBack();await p.waitForSelector('.living-ready');await settled(p,scene.stop);return scene;});
 await test('Catalog search, keyboard details and every full product route remain functional',async()=>{await p.goto(base+'/projekty/');await p.locator('#project-search').fill('OffGrid');await p.waitForTimeout(150);assert.equal(await p.locator('.catalog-card:visible').count(),1);const card=p.locator('.catalog-card[data-id="progresskit-offgrid"]'),summary=card.locator('summary');await summary.focus();await p.keyboard.press('Space');assert(await card.locator('details').evaluate(e=>e.open));await p.keyboard.press('Space');assert(!(await card.locator('details').evaluate(e=>e.open)));for(const project of catalog){const r=await p.request.get(base+'/projekty/'+project.slug+'/');assert.equal(r.status(),200,project.id);assert((await r.text()).includes('project-world-hero'),project.id);}return{routes:catalog.length};});
 await test('Shared product gallery changes images, closes and restores keyboard focus',async()=>{await p.goto(base+'/projekty/glikemia-premium/');const first=p.locator('[data-gallery-item]').first();await first.click();assert(await p.locator('#gallery-dialog').isVisible());await p.keyboard.press('ArrowRight');assert((await p.locator('#gallery-position').innerText()).includes('2'));await p.keyboard.press('Escape');assert(!(await p.locator('#gallery-dialog').isVisible()));assert(await first.evaluate(e=>document.activeElement===e));});await collect(p);await ctx.close();
 for(const reduced of[false,true])await test(reduced?'Reduced motion retains all projects and disables continuous frames':'Touch scrolling, map navigation, mobile menu and Polish drone work without hover',async()=>{const{p,ctx}=await setup(390,844,{hasTouch:true,isMobile:true,reducedMotion:reduced?'reduce':'no-preference'});try{await home(p);if(reduced){assert.equal(await p.locator('.living-static').count(),1);assert.equal(await p.locator('.living-node:not([inert])').count(),catalog.length);await p.locator('[data-core-activate]').tap();assert.equal(await p.locator('[data-core-activate]').getAttribute('aria-pressed'),'true');const before=await frames(p);await p.waitForTimeout(350);assert.equal(await frames(p),before);}else{const cdp=await ctx.newCDPSession(p),before=await p.evaluate(()=>scrollY);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:450}]});for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:170,y:450-i*24}]});await p.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);assert(await p.evaluate(()=>scrollY)>before+100);await at(p,1.45);const scene=sceneStops[0];await p.locator(`.living-node[data-project-id="${scene.id}"]`).tap();await settled(p,scene.stop);await p.locator(`[data-living-project="${scene.id}"] [data-return-map]`).tap();await settled(p,1.45);}
  const menu=p.locator('.menu-btn');await menu.scrollIntoViewIfNeeded();await menu.tap();assert.equal(await menu.getAttribute('aria-expanded'),'true');await p.locator('#mobile-menu a[href="#kontakt"]').tap();assert.equal(await menu.getAttribute('aria-expanded'),'false');const drone=p.locator('[data-drone-toggle]');await drone.tap();assert(await p.locator('#guide-panel').isVisible());await p.keyboard.press('Escape');assert(!(await p.locator('#guide-panel').isVisible()));await collect(p);return{catalogCount:catalog.length};}finally{await ctx.close();}});
 await test('No-JavaScript fallback retains the catalog and native project routes',async()=>{const{p,ctx}=await setup(390,844,{javaScriptEnabled:false});try{await p.goto(base);assert.equal(await p.locator('.living-ready').count(),0);assert.equal(await p.locator('.living-node').count(),catalog.length);await p.locator('.living-entry-link').click();await p.waitForURL('**/projekty/');assert.equal(await p.locator('.catalog-card').count(),catalog.length);await p.locator('.catalog-card[data-id="progresskit-mail"] a[href="progresskit-mail/"]').first().click();await p.waitForURL('**/projekty/progresskit-mail/');assert(await p.locator('h1').isVisible());return{routes:catalog.length};}finally{await ctx.close();}});
 await test('A map selection keeps the eye projection inside the product on desktop and touch',async()=>{
  const results=[];
  for(const [width,height,touch] of [[1440,900,false],[390,844,true]]){
   const {p,ctx}=await setup(width,height,{hasTouch:touch,isMobile:touch});
   try{
    await home(p);
    const activate=async selector=>{
     const target=p.locator(selector),box=await target.boundingBox();
     assert(box,selector);
     const point={x:box.x+box.width/2,y:box.y+box.height/2};
     assert(await target.evaluate((el,pt)=>el.contains(document.elementFromPoint(pt.x,pt.y)),point),selector);
     if(touch)await p.touchscreen.tap(point.x,point.y);
     else await p.mouse.click(point.x,point.y);
    };
    await activate('[data-core-activate]');
    await settled(p,1.45);
    await p.waitForFunction(()=>document.querySelector('[data-living-journey]').dataset.opening==='1.0000'&&document.querySelector('[data-core-activate]').textContent.includes('Pokaż projekty'));
    const crystal='.living-node[data-project-id="taskpet"]';
    if(!touch){
     const box=await p.locator(crystal).boundingBox();
     await p.mouse.move(box.x+box.width/2,box.y+box.height/2);
     await p.waitForSelector('[data-bot-hologram][data-visible="true"][data-project="taskpet"]');
    }
    await activate(crystal);
    const surface=p.locator('[data-bot-product="taskpet"] [data-bot-hologram][data-visible="true"]');
    try{await surface.waitFor({state:'visible'});}catch(error){
     const state=await p.evaluate(()=>{
      const bounds=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();
      return {viewport:[innerWidth,innerHeight],hash:location.hash,landing:bounds('[data-bot-product]'),actor:bounds('.inspection-bot-dock'),projection:bounds('[data-bot-hologram]'),beam:bounds('.bot-projector-beam')};
     });
     throw new Error('Missing visible TaskPet projection '+JSON.stringify(state),{cause:error});
    }
    const geometry=await surface.evaluate(el=>{
     const bounds=node=>node.getBoundingClientRect().toJSON();
     return {projection:bounds(el),landing:bounds(el.closest('[data-bot-product]')),viewport:innerWidth};
    });
    const {projection,landing,viewport}=geometry;
    assert(projection.left>=Math.max(0,landing.left)-1.5&&projection.right<=Math.min(viewport,landing.right)+1.5,JSON.stringify(geometry));
    assert(projection.top>=landing.top-1.5&&projection.bottom<=landing.bottom+1.5,JSON.stringify(geometry));
    await activate('[data-living-project="taskpet"] [data-return-map]');
    await settled(p,1.45);
    const returned=await p.locator('.inspection-bot-dock').evaluate(dock=>{
     const rect=dock.getBoundingClientRect(),style=getComputedStyle(dock);
     const painted=style.visibility!=='hidden'&&style.display!=='none'&&rect.width>0&&rect.height>0;
     return {layout:dock.dataset.layout,placement:dock.dataset.placement,painted,
      inside:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,
      mapLinkFocused:document.activeElement?.matches('.living-node')};
    });
    assert.equal(returned.layout,'stage',JSON.stringify(returned));
    assert(returned.placement==='hidden-collision'?!returned.painted:!returned.painted||returned.inside,JSON.stringify(returned));
    assert(!returned.mapLinkFocused,'Pointer return must not select another crystal');
    await collect(p);
    results.push({width,height,...geometry,returned});
   }finally{await ctx.close();}
  }
  return results;
 });
 await forcedColors();
 await test('WebGL unavailability retains the complete interactive HTML experience',async()=>{const{p,ctx}=await setup();try{await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);};});await home(p);await p.locator('[data-core-activate]').click();await settled(p,1.45);await p.waitForFunction(()=>document.querySelector('[data-world-scene]').dataset.sceneState==='fallback');assert.equal(await p.locator('[data-world-scene]').isVisible(),false,'A failed canvas must not cover the room');assert(await p.locator('.living-node').first().locator('.crystal-render').isVisible(),'The prerendered cut must stay visible');await p.locator('.living-node').first().click();await settled(p,sceneStops[0].stop);assert(await p.locator(`[data-living-project="${sceneStops[0].id}"] h2`).isVisible());await collect(p);}finally{await ctx.close();}});
 await test('No JavaScript exceptions, CSP violations or unexpected resources',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.csp,[]);assert.deepEqual(report.external,[]);await Promise.all(responseBodies);const expected=x=>x.path==='/api/project-inquiries/token'&&(x.status===503||(x.status===429&&x.code==='rate_limited'&&x.noStore));const unexpected=report.http.filter(x=>!expected(x));assert.deepEqual(unexpected,[]);return{exceptions:0,cspViolations:0,externalRequests:0,expectedUnconfiguredInquiry503:report.http.filter(x=>x.status===503).length,expectedRateLimitedInquiry429:report.http.filter(x=>x.status===429).length,submissions:0,apkTransfers:0};});
 }catch(e){report.fatal=e.stack;console.error(e.stack);}finally{await browser?.close();if(preview){preview.kill('SIGTERM');await new Promise(resolve=>{preview.once('exit',resolve);setTimeout(resolve,1500)});}if(previewDirectory)fs.rmSync(previewDirectory,{recursive:true,force:true});report.PASS=report.checks.filter(x=>x.status==='PASS').length;report.FAIL=report.checks.filter(x=>x.status==='FAIL').length+(report.fatal?1:0);fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,report:reportFile,out}));if(report.FAIL)process.exitCode=1;}})();
