/* Coordinated local QA only. Run after the catalog/build is frozen; never submits forms. */
'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'/tmp/progresskit-finalqa-browsers-20261102';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pw=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),base=process.argv[2]||'http://127.0.0.1:8191/',out=path.resolve(process.argv[3]||path.join(__dirname,'browser'));
const origin=new URL(base).origin;if(!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname))throw Error('Only an isolated loopback preview is allowed.');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog/projects.json'))),projects=catalog.projects;
const browsers=(process.env.PK_QA_BROWSERS||'chrome,firefox').split(','),widths=(process.env.PK_QA_WIDTHS||'360,390,768,1440').split(',').map(Number),shots=process.env.PK_QA_SCREENSHOTS!=='0';
const report={startedAt:new Date().toISOString(),processId:process.pid,signals:[],base,catalogSchemaVersion:catalog.schemaVersion,catalogAsOf:catalog.asOf,catalogCount:projects.length,catalogIds:projects.map(p=>p.id),caseMatrix:{engines:browsers,widths,expectedVisits:projects.length*browsers.length*widths.length},checks:[],browsers:[],resources:[],errors:[],screenshots:[],readability:[],performance:[],safety:{formsSubmitted:false,externalRequestsAllowed:false,mailDeliveryVerified:false,physicalMobileVerified:false},ownerVisualApproval:'OPEN',visualReviewRequired:true};
const assert=(v,m)=>{if(!v)throw Error(m);};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function fingerprint(){const codes=[];function walk(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const file=path.posix.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(?:css|js|mjs)$/.test(file))codes.push(file);}}walk('assets');const files=['catalog/projects.json','catalog/operator.json','catalog/brand.json','scripts/build-site.py','scripts/showroom_markup.py','templates/site.html','prywatnosc/index.html','index.html',...codes,...projects.map(p=>`projekty/${p.slug}/index.html`)];return Object.fromEntries([...new Set(files)].sort().filter(f=>fs.existsSync(path.join(root,f))).map(f=>[f,sha(path.join(root,f))]));}
function checkpoint(){if(!fs.existsSync(out))return;report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;report.BLOCKED=report.checks.filter(c=>c.status==='BLOCKED').length;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{report.signals.push({signal,at:new Date().toISOString()});checkpoint();console.log('PROCESS SIGNAL',signal);});
async function check(scope,name,fn){try{const details=await fn();report.checks.push({scope,name,status:'PASS',details});checkpoint();return true;}catch(e){const environment=/NS_ERROR_OUT_OF_MEMORY|Target (?:page, context or browser has been closed|closed)|Browser closed|browser has been closed/.test(e.message);report.checks.push({scope,name,status:environment?'BLOCKED':'FAIL',details:e.message});console.log(environment?'BLOCKED':'FAIL',scope,name,e.message);checkpoint();return false;}}
function blocked(scope,name,details){report.checks.push({scope,name,status:'BLOCKED',details});console.log('BLOCKED',scope,name,details);checkpoint();}
async function prepare(context,scope){await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){report.errors.push({scope,type:'blocked-mutation',method:req.method(),url:req.url()});return route.abort();}if(url.origin!==origin){report.errors.push({scope,type:'blocked-external-resource',url:req.url()});return route.abort();}return route.continue();});}
function telemetry(page,scope){page.on('pageerror',e=>report.errors.push({scope,type:'pageerror',message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({scope,type:'console',message:m.text()});});page.on('response',r=>{if(r.status()>=400)report.resources.push({scope,url:r.url(),status:r.status()});});}
async function at(page,selector,settle=550){await page.locator(selector).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:'instant'}));if(settle)await page.waitForTimeout(settle);else await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function shot(page,name){if(!shots)return;await page.screenshot({path:path.join(out,name),fullPage:false});report.screenshots.push(name);}
async function geometry(page,scope){const g=await page.evaluate(()=>{const visible=e=>{for(let a=e;a;a=a.parentElement){const s=getComputedStyle(a);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<=.01)return false;}const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>80&&r.top<innerHeight;};return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{text:e.innerText.trim().slice(0,100),left:r.left,right:r.right,width:r.width,height:r.height,fontSize:parseFloat(s.fontSize),clipPath:s.clipPath};})};});report.readability.push({scope,...g});assert(g.scrollWidth<=g.width+1,'Horizontal document overflow '+g.scrollWidth+'>'+g.width);const invalid=g.headings.filter(h=>h.left < -2 || h.right > g.width+2 || h.fontSize<12);assert(!invalid.length,'Visible heading bounds/font require review: '+JSON.stringify(invalid));return{horizontalOverflow:false,visibleHeadingCount:g.headings.length,note:'Automated geometry only; screenshots require human visual review.'};}
async function showroom(page,scope){await at(page,'#projekty');await page.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer,{timeout:15000});const mode=await page.locator('#projekty').getAttribute('data-renderer');assert(await page.locator('.showroom-card').count()===projects.length,'Showroom count differs from catalog');const target=page.locator('.showroom-card.is-active [data-showroom-open]');if(mode==='three-webgl2'){await page.locator('[data-capsule-toggle]').focus();await page.waitForFunction(()=>{const phases=document.querySelector('#projekty').showroom3D.metrics().phases;return phases.length>0&&phases.every(p=>p.phase==='ready');});}await target.focus();await page.keyboard.press('Enter');await page.locator('.is-slice-expanded').waitFor();assert(await page.locator('.is-slice-expanded').count()===1,'Disclosure opens exactly one project');const id=await page.locator('.is-slice-expanded').getAttribute('data-project-id');assert(projects.some(p=>p.id===id),'Disclosure uses a real catalog identity');await page.keyboard.press('Escape');assert(await page.locator('.is-slice-expanded').count()===0,'Escape closes disclosure');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);let reduced={mode};if(mode==='three-webgl2'){const first=await page.locator('#projekty').evaluate(e=>e.showroom3D.metrics());await page.waitForTimeout(350);const second=await page.locator('#projekty').evaluate(e=>e.showroom3D.metrics());assert(!second.rafPending&&second.frames===first.frames,'Reduced motion must stop continuous rendering');reduced={mode,static3D:true,frames:second.frames};}await page.emulateMedia({reducedMotion:'no-preference'});return{id,...reduced};}
async function catalogUi(page){
  const serviceTargets=await page.locator('#uslugi a[href*="technologia="]').evaluateAll(items=>items.map(e=>e.getAttribute('href')));
  await page.goto(new URL('projekty/',base).href,{waitUntil:'networkidle'});
  const actual=await page.locator('.catalog-card').evaluateAll(items=>items.map(e=>e.dataset.id));
  assert(JSON.stringify(actual)===JSON.stringify(projects.map(p=>p.id)),'Catalog identities/order differ from current JSON');
  const reset=async()=>{await page.locator('#catalog-filters [type=reset]').click();await page.waitForTimeout(180);assert(await page.locator('.catalog-card:visible').count()===projects.length,'Reset restores all projects');};
  const name=projects[0].name;await page.locator('#project-search').fill(name);await page.waitForTimeout(300);
  assert(new URL(page.url()).searchParams.get('q')===name,'Search query must reach URL');
  assert(await page.locator(`.catalog-card[data-id="${projects[0].id}"]:visible`).count()===1,'Search retains expected project');await reset();
  const kinds=[...new Set(projects.map(p=>p.portfolio?.classification).filter(Boolean))],tested=[];
  assert(await page.locator('#classification-filter').count()===1,'V2 classification filter is missing');
  for(const kind of kinds){
    await page.locator('#classification-filter').selectOption(kind);
    const expected=projects.filter(p=>p.portfolio.classification===kind).map(p=>p.id);
    const visible=await page.locator('.catalog-card:visible').evaluateAll(items=>items.map(e=>e.dataset.id));
    assert(JSON.stringify(expected)===JSON.stringify(visible),'Classification identities differ: '+kind);
    assert(new URL(page.url()).searchParams.get('typ')===kind,'Classification must persist in typ URL parameter');
    await page.reload({waitUntil:'networkidle'});
    assert(await page.locator('#classification-filter').inputValue()===kind,'Classification URL does not restore after reload');
    assert(await page.locator('.catalog-card:visible').count()===expected.length,'Reload loses classification results');tested.push({kind,count:expected.length});
  }
  await reset();assert(!new URL(page.url()).searchParams.has('typ'),'Reset retains typ URL state');
  const aliased=projects.find(p=>p.portfolio?.aliases?.length);
  if(aliased){await page.locator('#project-search').fill(aliased.portfolio.aliases[0]);await page.waitForTimeout(250);assert(await page.locator(`.catalog-card[data-id="${aliased.id}"]:visible`).count()===1,'Product alias must resolve to its existing identity');await reset();}
  for(const [selector,key,field] of [['#technology-filter','technologia','technologies'],['#stage-filter','etap','stage']]){
    const value=await page.locator(selector+' option').evaluateAll(items=>items.find(e=>e.value)?.value);
    if(!value)continue;await page.locator(selector).selectOption(value);
    const expected=projects.filter(p=>field==='technologies'?p.technologies.includes(value):(p.stage||'unverified')===value).map(p=>p.id);
    const visible=await page.locator('.catalog-card:visible').evaluateAll(items=>items.map(e=>e.dataset.id));
    assert(JSON.stringify(visible)===JSON.stringify(expected),'Filter mismatch '+selector);
    assert(new URL(page.url()).searchParams.get(key)===value,'Filter URL mismatch '+key);await reset();
  }
  const linkedFilters=[];
  for(const href of serviceTargets){const url=new URL(href,base);await page.goto(url.href,{waitUntil:'networkidle'});const value=url.searchParams.get('technologia');assert(await page.locator('#technology-filter').inputValue()===value,'Services technology link did not restore '+value);const visible=await page.locator('.catalog-card:visible').count();assert(visible>0,'Services technology link returns no project: '+value);linkedFilters.push({href,technology:value,count:visible});}
  if(serviceTargets.length)await reset();
  return{catalogCount:projects.length,ids:actual,search:name,classifications:tested,alias:aliased?.portfolio.aliases[0]||null,serviceTargets:linkedFilters};
}
async function contact(page){await at(page,'#kontakt');const mail=await page.locator('#kontakt a[href^="mailto:"]').first().getAttribute('href');assert(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/.test(mail||''),'Contact needs a syntactically valid mailto');await at(page,'#brief');const input=page.locator('.brief textarea').first();assert(await input.count()>0,'Local brief textarea exists');await input.fill('Syntetyczny test lokalnego briefu — bez danych osobowych.');const download=page.waitForEvent('download');await page.locator('[data-download-brief]').click();const artifact=await download;assert(artifact.suggestedFilename().endsWith('.txt'),'Brief creates local text file');await input.fill('');return{mailtoSyntax:true,delivery:'NOT_VERIFIED',localBriefDownload:artifact.suggestedFilename(),formSent:false};}
const normalize=value=>String(value).replace(/\s+/g,' ').trim();
async function images(page){
  const count=await page.locator('img[src]').evaluateAll(items=>{for(const e of items)if(e.getAttribute('src'))e.loading='eager';return items.filter(e=>e.getAttribute('src')).length;});
  await page.waitForFunction(()=>[...document.querySelectorAll('img[src]')].filter(e=>e.getAttribute('src')).every(e=>e.complete));
  const failed=await page.locator('img[src]').evaluateAll(items=>items.filter(e=>e.getAttribute('src')&&!e.naturalWidth).map(e=>e.getAttribute('src')));
  assert(!failed.length,'Images fail to decode: '+JSON.stringify(failed));return{decoded:count};
}
async function cases(page,scope){for(const project of projects){await check(scope,'Case '+project.id,async()=>{
  const url=new URL(`projekty/${project.slug}/`,base),response=await page.goto(url.href,{waitUntil:'networkidle'});
  assert(response.status()===200,'Case HTTP '+response.status());assert(await page.locator('h1').count()===1,'Case needs one H1');
  assert((await page.locator('h1').textContent()).trim()===project.name,'Case H1 differs from catalog');
  assert(normalize(await page.locator('main').textContent()).includes(normalize(project.summary)),'Case summary missing');
  assert(await page.locator('.case-hero time').getAttribute('datetime')===project.updatedAt,'Case source date differs from current JSON');
  await geometry(page,scope+':'+project.id+':hero');await shot(page,`${scope.replace(':','-')}-case-${project.slug}.png`);
  const meta=project.portfolio;assert(meta,'Final V2 case requires portfolio metadata');
  assert(await page.locator('#platformy .platform-status').count()===meta.platforms.length,'Platform inventory differs from JSON');
  const platformText=normalize(await page.locator('#platformy').textContent());
  for(const value of [meta.functionalStatus,meta.distributionStatus,meta.productionStatus,...meta.platforms.flatMap(p=>Object.values(p))])assert(platformText.includes(normalize(value)),'Platform/readiness fact missing: '+project.id);
  const records=page.locator('#weryfikacja .verification-record');assert(await records.count()===meta.verification.length,'Verification record count differs from JSON');
  for(let i=0;i<meta.verification.length;i++){
    const record=meta.verification[i],node=records.nth(i),text=normalize(await node.textContent());
    for(const key of ['scope','status','result','environment','revision'])assert(text.includes(normalize(record[key])),'Verification provenance missing '+key+' for '+project.id);
    assert(await node.locator(`a[href="#source-${record.source}"]`).count()===1,'Verification has no correct source anchor');
    assert(text.includes(record.historical?'Wynik historyczny':'Przegląd bieżący'),'Historical/current scope label lost');
    if(record.date)assert(await node.locator('time').getAttribute('datetime')===record.date,'Evidence date changed');
    else assert(await node.locator('time').count()===0&&text.includes('Data wykonania nieustalona'),'Undated historical evidence must remain explicit');
  }
  const missing=await page.locator('a[href^="#"]').evaluateAll(items=>items.map(e=>e.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(decodeURIComponent(h.slice(1)))));
  assert(!missing.length,'Missing local source/section anchors '+JSON.stringify(missing));
  const featureRefs=await page.locator('#funkcje .feature-sources').count();assert(featureRefs===project.features.length,'Each implemented feature needs visible source links');
  for(const selector of ['#platformy','#weryfikacja']){await at(page,selector,0);await geometry(page,scope+':'+project.id+':'+selector.slice(1));}
  return{url:url.pathname,sourceDate:project.updatedAt,classification:meta.classification,platforms:meta.platforms.length,verificationRecords:meta.verification.length,features:project.features.length,images:await images(page),visualReview:'OPEN'};
});}}
async function fallback(browser,name){const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3});await prepare(context,name+':fallback');const p=await context.newPage();telemetry(p,name+':fallback');await p.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).startsWith('webgl')?null:native.call(this,kind,...args);};});await check(name+':fallback','Unavailable WebGL retains usable projects and Services',async()=>{await p.goto(base,{waitUntil:'networkidle'});await at(p,'#projekty');await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='fallback');assert(await p.locator('.showroom-card').count()===projects.length,'Fallback preserves all identities');await p.locator('.showroom-card.is-active [data-showroom-open]').focus();await p.keyboard.press('Enter');await p.locator('.is-slice-expanded').waitFor();await p.keyboard.press('Escape');await at(p,'#uslugi');assert(await p.locator('#uslugi .service-zone').count()===2,'Services fallback preserves both groups');await geometry(p,name+':fallback');return{webgl:'forced unavailable',dpr:3};});await context.close();}
async function noJs(browser,name){const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});await prepare(context,name+':no-js');const p=await context.newPage();await check(name+':no-js','Prerendered catalog and case links work without JavaScript',async()=>{const r=await p.goto(new URL('projekty/',base).href,{waitUntil:'networkidle'});assert(r.status()===200,'Static catalog HTTP failure');assert(await p.locator('.catalog-card').count()===projects.length,'No-JS catalog loses identities');for(const project of projects)assert(await p.locator(`a[href="${project.slug}/"]`).count()>0,'Missing static case link '+project.id);return{count:projects.length,interactiveFilters:'not required without JS'};});await context.close();}
async function lowPower(browser){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3});await prepare(context,'chrome:low-power');
  const p=await context.newPage();p.setDefaultTimeout(25000);telemetry(p,'chrome:low-power');const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const metrics=()=>p.evaluate(()=>({time:performance.now(),showroom:document.querySelector('#projekty')?.showroom3D?.metrics(),services:document.querySelector('#uslugi')?.spatialServices?.metrics(),process:document.querySelector('#proces')?.spatialProcess?.metrics()}));
  const hold=async(ms=1100)=>{const before=await metrics();await p.waitForTimeout(ms);const after=await metrics();return{before,after,elapsedSeconds:(after.time-before.time)/1000};};
  await check('chrome:low-power','CPU4x DPR3 context renders with bounded iterations',async()=>{
    await p.goto(base,{waitUntil:'networkidle'});const results=[];
    for(const [selector,key,cap]of [['#projekty','showroom',30],['#uslugi','services',30],['.production-space','process',24]]){
      await at(p,selector);await p.waitForFunction(([sel,key])=>{const e=document.querySelector(sel),m=e?.[key]?.metrics();return m&&Number.isFinite(m.frames);},[key==='process'?'#proces':selector,key==='showroom'?'showroom3D':key==='services'?'spatialServices':'spatialProcess']);
      const sample=await hold(),a=sample.before[key],b=sample.after[key],delta=b.frames-a.frames;
      assert(b.dpr<=1,'Renderer must cap DPR: '+key);assert(delta>0,'CPU stress renderer does not advance: '+key);
      assert(delta<=sample.elapsedSeconds*cap+3,'Renderer exceeds intended frame cap: '+key);
      results.push({key,frames:delta,elapsedSeconds:sample.elapsedSeconds,observedFPS:delta/sample.elapsedSeconds,frameCap:cap,dpr:b.dpr});
      await geometry(p,'chrome:low-power:'+key);
    }
    report.performance.push({context:'Chrome CDP CPU4x, viewport390x844, deviceScaleFactor3',samples:results,note:'Observed iteration caps only; no physical-phone or GPU benchmark claim.'});return results;
  });
  await check('chrome:low-power','All showroom/Services/Process render loops stop offscreen',async()=>{
    await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForTimeout(500);
    const sample=await hold(600),bounds=await p.evaluate(()=>Object.fromEntries(['#projekty','#uslugi','#proces'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{top:r.top,bottom:r.bottom,offscreen:r.bottom<=0||r.top>=innerHeight}];})));
    for(const key of ['showroom','services','process']){const a=sample.before[key],b=sample.after[key];assert(a&&b&&Number.isFinite(b.frames),'Offscreen metrics unavailable: '+key);assert(a.frames===b.frames&&!b.rafPending,'Offscreen frames/RAF remain active: '+key);}
    assert(Object.values(bounds).every(b=>b.offscreen),'Offscreen proof requires all three actual bounds outside viewport');return{...sample,bounds};
  });
  await cdp.detach();await context.close();
}
async function main(){
  fs.mkdirSync(out,{recursive:true});report.status='RUNNING';report.sourceBefore=fingerprint();
  const ready=await check('catalog','Frozen V2 catalog and explicit expected-count gate',async()=>{
    assert(catalog.schemaVersion===2,'Final QA requires catalog schemaVersion2');
    if(process.env.PK_QA_EXPECTED_COUNT)assert(projects.length===Number(process.env.PK_QA_EXPECTED_COUNT),'Explicit expected catalog count mismatch');
    assert(projects.every(p=>p.portfolio),'Every identity needs V2 metadata');
    return{count:projects.length,asOf:catalog.asOf,schemaVersion:catalog.schemaVersion,caseVisits:report.caseMatrix.expectedVisits};
  });
  if(!ready){report.status='PREFLIGHT_FAIL';checkpoint();process.exitCode=1;return;}
  for(const name of browsers){
    let browser;
    try{
      if(name==='chrome')browser=await pw.chromium.launch({executablePath:process.env.PK_QA_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
      else if(name==='firefox')browser=await pw.firefox.launch({executablePath:process.env.PK_QA_FIREFOX||'/tmp/progresskit-finalqa-browsers-20261102/firefox-1538/firefox/firefox',headless:true});
      else throw Error('Unknown browser '+name);
      report.browsers.push({name,version:browser.version(),status:'LAUNCHED'});checkpoint();
    }catch(e){blocked(name,'Browser launch',e.message);continue;}
    try{
      for(const width of widths){
        const scope=name+':'+width,context=await browser.newContext({viewport:{width,height:width<500?844:1000},deviceScaleFactor:1,hasTouch:width<500,...(name==='chrome'?{isMobile:width<500}:{})});
        await prepare(context,scope);const page=await context.newPage();page.setDefaultTimeout(15000);telemetry(page,scope);
        const loaded=await check(scope,'Homepage, dynamic catalog count and first viewport',async()=>{
          const r=await page.goto(base,{waitUntil:'networkidle'});assert(r.status()===200,'Homepage is unavailable');
          assert(await page.locator('h1').count()===1,'Homepage needs one H1');assert(await page.locator('.showroom-card').count()===projects.length,'All catalog identities must reach showroom');
          await shot(page,`${name}-${width}-hero.png`);await images(page);return geometry(page,scope+':hero');
        });
        if(!loaded){blocked(scope,'Dependent checks not run','Homepage did not load successfully; do not report downstream selector timeouts as independent product defects.');await context.close();continue;}
        const showroomPassed=await check(scope,'Showroom keyboard, disclosure and reduced motion',()=>showroom(page,scope));
        if(showroomPassed)await shot(page,`${name}-${width}-showroom.png`);
        for(const [selector,label]of [['#uslugi','services'],['#proces','process']])await check(scope,label+' visible geometry',async()=>{await at(page,selector);await shot(page,`${name}-${width}-${label}.png`);return geometry(page,scope+':'+label);});
        await check(scope,'Contact and local brief, no send',()=>contact(page));
        await check(scope,'Search, aliases, classification, technology, stage and URL state',()=>catalogUi(page));
        await check(scope,'Catalog viewport',()=>geometry(page,scope+':catalog'));
        await cases(page,scope);await context.close();
        console.log('Completed',scope,'cases',projects.length);checkpoint();
      }
      if(process.env.PK_QA_EXTRA!=='0'){await fallback(browser,name);await noJs(browser,name);if(name==='chrome')await lowPower(browser);}
    }finally{await browser.close();}
  }
  await check('all','No unexpected browser errors or HTTP resource failures',async()=>{assert(!report.errors.length,JSON.stringify(report.errors));assert(!report.resources.length,JSON.stringify(report.resources));return{errors:0,resourceErrors:0};});
  report.caseMatrix.visited=report.checks.filter(c=>c.name.startsWith('Case ')).length;
  report.caseMatrix.passed=report.checks.filter(c=>c.name.startsWith('Case ')&&c.status==='PASS').length;
  if(report.caseMatrix.visited!==report.caseMatrix.expectedVisits)blocked('all','Incomplete case route matrix',report.caseMatrix);
  report.sourceAfter=fingerprint();const changed=Object.keys(report.sourceBefore).filter(p=>report.sourceBefore[p]!==report.sourceAfter[p]);
  if(changed.length)blocked('all','Source changed during QA',changed);
  report.finishedAt=new Date().toISOString();checkpoint();report.status=report.FAIL?'FAIL':report.BLOCKED?'BLOCKED':'AUTOMATED_CHECKS_PASS_VISUAL_REVIEW_OPEN';checkpoint();
  console.log({status:report.status,PASS:report.PASS,FAIL:report.FAIL,BLOCKED:report.BLOCKED,caseVisits:report.caseMatrix.visited,errors:report.errors.length,resourceErrors:report.resources.length});
  if(report.FAIL||report.BLOCKED||report.errors.length||report.resources.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{fs.mkdirSync(out,{recursive:true});report.status='BLOCKED_OR_ABORTED';report.failure=e.stack;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
module.exports={geometry,fingerprint};
