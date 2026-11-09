/* Run against an isolated localhost preview, never production.
 * PK_QA_URL=https://127.0.0.1:8229 PK_QA_OUT=/tmp/proof node scripts/verify-final-world.cjs
 * A local backend count is checked as local evidence; it is never a production total.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/tmp/progresskit-world-playwright';
const {chromium} = require(process.env.PK_PLAYWRIGHT || '/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.PK_QA_URL || 'http://127.0.0.1:8229';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Only an isolated localhost preview is allowed.');
const out = path.resolve(process.env.PK_QA_OUT || 'docs/evidence/world-final-20261109/browser');
fs.mkdirSync(out, {recursive:true});
const report = {scope:'Fresh local Chrome browser; mobile emulation. Local backend count, not production count. No APK transfer, no form submission, no production writes. Videos are recorded at normal speed.', base, checks:[], errors:[], consoleErrors:[], http:[], interceptedDownloads:[], externalBlocked:[], recordings:[], ownerVisualApproval:'OPEN', hardwareAcceptance:'NOT TESTED'};
let browser;
function check(name, detail={}) { report.checks.push({name,status:'PASS',detail}); console.log('PASS', name); }
async function test(name, fn) { try { const detail=await fn(); check(name,detail); } catch(e) { report.checks.push({name,status:'FAIL',detail:e.message});console.error('FAIL',name,e.message); } }
const sleep=(p,t)=>p.waitForTimeout(t);
async function screenshot(p,name) { await p.screenshot({path:path.join(out,name+'.png')}); }
async function setup(width, extra={}) {
 const mobile=width<700, height=mobile?844:900;
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height},isMobile:mobile,hasTouch:mobile,...extra});
 const p=await ctx.newPage();
 if(extra.recordVideo&&!mobile)await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{const cursor=document.createElement('span');cursor.setAttribute('aria-hidden','true');cursor.dataset.recordedPointer='';Object.assign(cursor.style,{position:'fixed',left:'0',top:'0',width:'17px',height:'17px',border:'1px solid rgba(255,255,255,.8)',borderRadius:'50%',boxShadow:'0 0 0 2px rgba(0,0,0,.35)',pointerEvents:'none',transform:'translate(-50%,-50%)',zIndex:'2147483647',opacity:'0'});document.body.append(cursor);addEventListener('pointermove',event=>{cursor.style.opacity='1';cursor.style.left=event.clientX+'px';cursor.style.top=event.clientY+'px';},{passive:true});}));
 p.on('pageerror',e=>report.errors.push({width,url:p.url(),message:e.message,stack:e.stack}));
 p.on('console',e=>{if(e.type()==='error'&&!e.text().includes('503'))report.consoleErrors.push({width,url:p.url(),message:e.text()});});
 p.on('response',r=>{if(r.status()>=400)report.http.push({width,status:r.status(),url:r.url()});});
 await p.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==new URL(base).origin && !['data:','blob:'].includes(u.protocol)) {report.externalBlocked.push(u.href);return route.abort();}
   if(['/download/glikemia-premium','/downloads/glikemia-premium.apk'].includes(u.pathname)) {report.interceptedDownloads.push({url:u.href,method:req.method()});return route.fulfill({status:204});}
   if(req.method()==='POST') return route.fulfill({status:204});
   return route.continue();
 });
 return {ctx,p,mobile,width,height};
}
async function ready(p) {
 await p.waitForFunction(()=>document.body.classList.contains('progresskit-world'),null,{timeout:20000});
 if(await p.locator('[data-world-scene]').count()) await p.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('[data-world-scene]')?.dataset.sceneState),null,{timeout:20000});
 await p.evaluate(()=>document.fonts.ready);
 // Let the native cross-document animation settle without touching its promises.
 await p.waitForTimeout(350);
}
async function noOverflow(p) {
 const metrics=await p.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
 assert(metrics.width<=metrics.viewport+1,JSON.stringify(metrics)); return metrics;
}
async function count(p) { const r=await p.request.get(base+'/api/glikemia/downloads');assert.equal(r.status(),200);const data=await r.json();assert(Number.isSafeInteger(data.downloads));return data.downloads; }
async function visibleCounter(p) {
 await p.locator('[data-download-count]').first().waitFor();
 await p.waitForFunction(()=>[...document.querySelectorAll('[data-download-count]')].every(e=>e.dataset.downloadState==='ready'));
 const n=await count(p), texts=await p.locator('[data-download-count]').allTextContents();
 for(const text of texts) assert.equal(Number(text.replace(/[^0-9]/g,'')),n,text);
 return {localCount:n,texts};
}
async function sceneMetrics(p) {return p.locator('[data-world-scene]').evaluate(e=>({...e.dataset,buffer:[e.width,e.height]}));}
async function navigateProject(p) {
 const link=p.locator('#projekty .artifact-card[href*="glikemia-premium"]').first();
 await link.scrollIntoViewIfNeeded(); await sleep(p,450); await link.click();
 await p.waitForURL('**/projekty/glikemia-premium/');await ready(p);
}
async function walkthrough(width) {
 const name=width<700?'mobile':'desktop';
 const {ctx,p,height}=await setup(width,{recordVideo:{dir:path.join(out,'raw-video'),size:{width,height:width<700?844:900}}});
 const started=Date.now(),events=[],mark=(event)=>events.push({event,seconds:Number(((Date.now()-started)/1000).toFixed(2))});
 try {
 await p.goto(base,{waitUntil:'networkidle'});await ready(p);mark('first viewport');await screenshot(p,name+'-01-start');
 await sleep(p,5000);mark('idle after 5 seconds');await screenshot(p,name+'-02-idle');
 if(width>=700){const box=await p.locator('[data-world-scene]').boundingBox();await p.mouse.move(box.x+box.width+80,box.y+box.height/2,{steps:35});await sleep(p,900);await p.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:25});await sleep(p,1000);mark('cursor proximity');await screenshot(p,'desktop-03-proximity');}
 await p.locator('[data-core-activate]').click();await p.waitForFunction(()=>document.body.dataset.coreState==='active');await sleep(p,1700);mark('Core activated');await screenshot(p,name+'-04-core');
 await p.locator('#projekty').scrollIntoViewIfNeeded();await sleep(p,1700);mark('projects');await screenshot(p,name+'-05-projects');
 const link=p.locator('#projekty .artifact-card[href*="glikemia-premium"]').first();await link.scrollIntoViewIfNeeded();await sleep(p,900);await link.click();await p.waitForURL('**/projekty/glikemia-premium/');mark('homepage to Glikemia');if(width>=700)await screenshot(p,'desktop-06-transition');await ready(p);await sleep(p,1500);mark('Glikemia hero');await screenshot(p,name+'-07-glikemia-hero');
 await p.locator('.project-download-console').first().scrollIntoViewIfNeeded();await visibleCounter(p);await sleep(p,1400);mark('Glikemia download and local real backend counter');await screenshot(p,name+'-08-glikemia-download');
 if(width>=700){
   const chapter=p.locator('[data-project-chapters] a[href="#architektura"]');await chapter.click();await sleep(p,1600);mark('architecture chapter');await screenshot(p,'desktop-09-chapters');
   await p.goto(base+'/#kontakt');await ready(p);await p.locator('#kontakt').scrollIntoViewIfNeeded();await sleep(p,1700);mark('Contact');await screenshot(p,'desktop-10-contact');
 }
 await sleep(p,1000);
 } finally {const video=p.video();await ctx.close();await video.saveAs(path.join(out,name+'-walkthrough.webm'));report.recordings.push({name,width,height,events,durationSeconds:Number(((Date.now()-started)/1000).toFixed(2))});}
}
async function liveCounterWalkthrough() {
 const {ctx,p}=await setup(1440,{recordVideo:{dir:path.join(out,'raw-video'),size:{width:1440,height:900}}});
 const provenance={scope:'Local new UI; counter response read through unchanged from the production GET endpoint. No deployment, no seed, no APK transfer.',url:'https://progresskit.pl/api/glikemia/downloads',reads:[]};
 await p.route('**/api/glikemia/downloads',async route=>{
   const requestedAt=new Date().toISOString();
   const response=await p.request.get(provenance.url,{headers:{'Cache-Control':'no-cache'}});
   const body=await response.text();
   provenance.reads.push({requestedAt,httpStatus:response.status(),responseDate:response.headers().date,cacheControl:response.headers()['cache-control'],rawBody:body});
   await route.fulfill({status:response.status(),contentType:'application/json',headers:{'Cache-Control':'no-store'},body});
 });
 try {
   await p.goto(base);await ready(p);await sleep(p,1800);await p.locator('#projekty').scrollIntoViewIfNeeded();await sleep(p,1800);await navigateProject(p);
   await p.waitForFunction(()=>document.querySelector('[data-download-count]')?.dataset.downloadState==='ready');
   assert(provenance.reads.length>0);const observed=JSON.parse(provenance.reads.at(-1).rawBody).downloads;
   for(const text of await p.locator('[data-download-count]').allTextContents())assert.equal(Number(text.replace(/[^0-9]/g,'')),observed);
   await sleep(p,2500);await screenshot(p,'live-readthrough-glikemia-hero');
   await p.locator('.project-download-console').first().scrollIntoViewIfNeeded();await sleep(p,2500);await screenshot(p,'live-readthrough-glikemia-counter');
   await p.locator('.project-counter-details summary').first().click();await sleep(p,2000);await screenshot(p,'live-readthrough-counter-definition');
   provenance.renderedDownloads=observed;provenance.status='PASS';check('New Glikemia UI displays the untouched read-only production response',provenance);
 } finally {
   const video=p.video();await ctx.close();await video.saveAs(path.join(out,'live-readthrough-walkthrough.webm'));
   fs.writeFileSync(path.join(out,'live-readthrough-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 }
}
(async()=>{
 try {
 browser=await chromium.launch({executablePath:process.env.PK_CHROME || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 const {ctx,p}=await setup(1440);await p.goto(base);await ready(p);const initialCount=await count(p);
 await test('One shared scene and one dominant brand mark in the first viewport',async()=>{
   assert.equal(await p.locator('[data-world-scene]').count(),1);
   const result=await p.evaluate(()=>{
     const candidates=[...document.querySelectorAll('img,video,svg,canvas')].filter(e=>/progresskit|progressorkit|brand|core|world-scene/i.test([e.getAttribute('src'),e.getAttribute('alt'),e.getAttribute('aria-label'),e.getAttribute('class'),e.hasAttribute('data-world-scene')?'world-scene':''].join(' ')));
     return candidates.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,src:e.getAttribute('src'),class:e.getAttribute('class'),width:r.width,height:r.height,visible:r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0};}).filter(x=>x.visible&&x.width>180&&x.height>180);
   });
   assert.equal(result.length,1,JSON.stringify(result));return result;
 });
 await test('Scene performance budget is measured in this browser',async()=>{
   const measure=()=>p.evaluate(async()=>{
     const canvas=document.querySelector('[data-world-scene]');const startFrames=Number(canvas.dataset.frames),started=performance.now();let previous=started;const samples=[];
     while(performance.now()-started<5000)await new Promise(resolve=>requestAnimationFrame(now=>{samples.push(now-previous);previous=now;resolve();}));
     const duration=performance.now()-started;const frameDelta=Number(canvas.dataset.frames)-startFrames;samples.sort((a,b)=>a-b);
     const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const debug=gl?.getExtension('WEBGL_debug_renderer_info');
     return {durationMs:duration,sceneFrameDelta:frameDelta,sceneFramesPerSecond:frameDelta/(duration/1000),browserRafMedianMs:samples[Math.floor(samples.length*.5)],browserRafP95Ms:samples[Math.floor(samples.length*.95)],renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',scene:{...canvas.dataset},buffer:[canvas.width,canvas.height],devicePixelRatio};
   });
   const idle=await measure();const box=await p.locator('[data-world-scene]').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:20});const proximity=await measure();await p.mouse.move(5,5);
   assert(idle.buffer[0]*idle.buffer[1]<=4000000,JSON.stringify(idle));
   return {idle,proximity,hardwareScope:'Renderer-identified actual GPU; automated browser observation, owner acceptance OPEN'};
 });
 await test('Desktop Core activation and motion control are keyboard operable',async()=>{
   await p.locator('[data-core-activate]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.body.dataset.coreState==='active');
   const motion=p.locator('[data-motion-toggle]');const previous=await motion.getAttribute('aria-pressed');await motion.focus();await p.keyboard.press('Space');assert.notEqual(await motion.getAttribute('aria-pressed'),previous);await p.keyboard.press('Space');return sceneMetrics(p);
 });
 await test('Desktop proximity powers controls and offscreen Core suspends rendering',async()=>{
   const control=p.locator('[data-core-activate]');const box=await control.boundingBox();
   await p.mouse.move(5,5);await sleep(p,80);await p.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:15});await sleep(p,100);
   assert.equal(await control.getAttribute('data-proximity'),'surface');
   await p.locator('#kontakt').scrollIntoViewIfNeeded();await sleep(p,400);const before=await sceneMetrics(p);await sleep(p,1000);const after=await sceneMetrics(p);assert(Number(after.frames)-Number(before.frames)<=1,JSON.stringify({before,after}));
   return {proximity:'surface',offscreenFramesBefore:before.frames,offscreenFramesAfter:after.frames};
 });
 await test('Featured artifacts have real routes and the complete catalogue remains discoverable',async()=>{
   const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalog/projects.json'),'utf8')).projects;
   const hrefs=await p.locator('#projekty .artifact-card').evaluateAll(a=>a.map(e=>new URL(e.href).pathname));
   assert(hrefs.length>0);assert.equal(new Set(hrefs).size,hrefs.length);
   for(const href of hrefs)assert(catalog.some(project=>href==='/projekty/'+project.slug+'/'),href);
   const catalogue=await p.request.get(base+'/projekty/');assert.equal(catalogue.status(),200);const markup=await catalogue.text();
   for(const project of catalog)assert(markup.includes('data-id="'+project.id+'"'),project.id);
   return {featured:hrefs.length,catalogue:catalog.length};
 });
 await test('Native project navigation preserves shell, product evidence and backend count',async()=>{
   await navigateProject(p);assert.equal(await p.locator('h1').count(),1);assert.equal(await p.locator('.project-world-hero').count(),1);assert(await p.locator('.project-artifact img').first().isVisible());
   const c=await visibleCounter(p);assert.equal(c.localCount,initialCount);assert.equal(await p.locator('a[data-download-apk]').first().getAttribute('href'),'/download/glikemia-premium');return c;
 });
 await test('Download CTA requests the canonical route without a transfer in this test',async()=>{
   const previous=report.interceptedDownloads.length;await p.locator('a[data-download-apk]').first().click();await sleep(p,350);assert.equal(report.interceptedDownloads.length,previous+1);assert.equal(await count(p),initialCount);return {intercepted:report.interceptedDownloads.at(-1),APKTransferred:false};
 });
 await test('Project chapter navigation has real targets, active state and keyboard access',async()=>{
   const anchors=p.locator('[data-project-chapters] a');const refs=await anchors.evaluateAll(a=>a.map(e=>e.getAttribute('href')));assert(refs.length>=9);
   for(const href of refs){assert(href.startsWith('#'));assert.equal(await p.locator(href).count(),1,href);}
   const target=p.locator('[data-project-chapters] a[href="#architektura"]');await target.focus();await p.keyboard.press('Enter');await p.waitForURL('**#architektura');await sleep(p,700);assert(await p.locator('#architektura').isVisible());return {chapters:refs.length,active:await target.getAttribute('aria-current')};
 });
 await test('Both Glikemia routes share shell and real release metadata',async()=>{
   await p.goto(base+'/glikemia-premium/');await ready(p);assert.equal(await p.locator('.project-world-hero').count(),1);assert.equal(await p.locator('h1').count(),1);
   const metadata=JSON.parse(fs.readFileSync(path.join(__dirname,'../downloads/glikemia-premium.json'),'utf8'));await p.locator('.project-file-details summary').click();const text=await p.locator('main').innerText();assert(text.includes(metadata.version));assert(text.includes(metadata.sha256));await visibleCounter(p);return {version:metadata.version,bytes:metadata.bytes,sha256Visible:true};
 });
 await test('Navigation, rendering and stats reads do not increment the local download count',async()=>{assert.equal(await count(p),initialCount);return {before:initialCount,after:await count(p)};});
 await ctx.close();
 for(const width of [1440,1024,768,390,320]) {
  const {ctx,p}=await setup(width);await p.goto(base);await ready(p);
  await test(width+'px: home and product fit viewport with accessible controls',async()=>{
    await noOverflow(p);assert(await p.locator('[data-core-activate]').isVisible());await p.locator('[data-core-activate]').click();await p.waitForFunction(()=>document.body.dataset.coreState==='active');await navigateProject(p);const g=await noOverflow(p);await visibleCounter(p);const box=await p.locator('a[data-download-apk]').first().boundingBox();assert(box.height>=44&&box.width>=44,JSON.stringify(box));return g;
  });await ctx.close();
 }
 await test('Reduced motion disables continuous scene frames but preserves Core and navigation',async()=>{
  const {ctx,p}=await setup(390,{reducedMotion:'reduce'});try{await p.goto(base);await ready(p);await sleep(p,500);const before=await sceneMetrics(p);await sleep(p,1500);const after=await sceneMetrics(p);assert(Number(after.frames||0)-Number(before.frames||0)<=2,JSON.stringify({before,after}));await p.locator('[data-core-activate]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.body.dataset.coreState==='active');await navigateProject(p);await noOverflow(p);return {before,after};}finally{await ctx.close();}
 });
 await test('Mobile menu and contextual Guide retain native keyboard controls',async()=>{
  const {ctx,p}=await setup(390);try{await p.goto(base);await ready(p);const menu=p.locator('.menu-btn');await menu.focus();await p.keyboard.press('Enter');assert.equal(await menu.getAttribute('aria-expanded'),'true');assert(await p.locator('#mobile-menu').isVisible());await p.locator('#mobile-menu a[href="#kontakt"]').click();assert.equal(await menu.getAttribute('aria-expanded'),'false');await p.locator('[data-guide-toggle]').focus();await p.keyboard.press('Enter');assert(await p.locator('#guide-panel').isVisible());await p.locator('[data-guide-topic="security"]').click();assert((await p.locator('[data-guide-copy]').innerText()).includes('Security'));await p.keyboard.press('Escape');assert.equal(await p.locator('[data-guide-toggle]').getAttribute('aria-expanded'),'false');await noOverflow(p);return {menu:true,guide:true,submission:false};}finally{await ctx.close();}
 });
 await test('Unavailable counter is explicit and never presents a fabricated numeric value',async()=>{
  const {ctx,p}=await setup(390);try{await p.route('**/api/glikemia/downloads',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"test unavailable"}'}));await p.goto(base+'/projekty/glikemia-premium/');await p.waitForFunction(()=>document.querySelector('[data-download-count]')?.dataset.downloadState==='error');const text=await p.locator('[data-download-count]').first().innerText();assert(/niedostępny/i.test(text));assert(!/[0-9]/.test(text));return {text,syntheticFailureOnly:true};}finally{await ctx.close();}
 });
 if(process.env.PK_QA_RECORD !== '0'){await walkthrough(1440);await walkthrough(390);}
 if(process.env.PK_QA_LIVE === '1')await liveCounterWalkthrough();
 await test('Checked local pages have no JavaScript exceptions or unexpected failed resources',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);const unexpected=report.http.filter(r=>!(r.status===503&&new URL(r.url).pathname==='/api/glikemia/downloads'));assert.deepEqual(unexpected,[]);assert.deepEqual(report.externalBlocked,[]);return {exceptions:0,unexpectedHttp:0};});
 } catch(e){report.fatal=e.stack;console.error(e);}
 finally {await browser?.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length+(report.fatal?1:0);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,out}));if(report.FAIL)process.exitCode=1;}
})();
