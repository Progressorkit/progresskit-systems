const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 const p=await b.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[];
 const check=async(name,fn)=>{try{const detail=await fn();checks.push({name,status:'PASS',detail});}catch(e){checks.push({name,status:'FAIL',error:e.message});}};
 p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8209/');await p.waitForFunction(()=>document.querySelector('#start').interactions);
 await check('eight category summaries; technology inventory hidden until activation',async()=>{
  const data=await p.evaluate(()=>({labels:[...document.querySelectorAll('.technology-group__title')].map(e=>e.textContent.toUpperCase()),open:document.querySelectorAll('.technology-group[open]').length,glyphs:document.querySelectorAll('.technology-glyph').length,exposed:[...document.querySelectorAll('.technology-chip')].filter(e=>e.checkVisibility({contentVisibilityAuto:true})).length}));
  assert.deepEqual(data.labels,['BACKEND','WEB','MOBILE','DATA','INFRASTRUCTURE','SECURITY','AI / MEDIA','DELIVERY']);assert.equal(data.open,0);assert.equal(data.exposed,0);assert.equal(data.glyphs,110);return data;
 });
 await check('same bounded canvas and particle allocations, filled process side surfaces',async()=>{
  const data=await p.evaluate(()=>({canvasCount:document.querySelector('#start').installation.metrics().canvasCount,pool:document.querySelector('#start').interactions.metrics().poolSize,sides:document.querySelectorAll('.process-side').length,wireframe:document.querySelectorAll('.process-facet').length,solid:getComputedStyle(document.querySelector('.process-side')).backgroundImage,core:getComputedStyle(document.querySelector('.core-shell__rim'),'::before').backgroundImage}));
  assert.equal(data.canvasCount,6);assert.equal(data.pool,24);assert.equal(data.sides,12);assert.equal(data.wireframe,0);assert(data.solid.includes('process-crystal'));assert(data.core.includes('optical-core'));return data;
 });
 await check('proximity grows with measured cursor distance; sparse far emission and near arcs',async()=>{
  const box=await p.locator('[data-proximity-object="contact"]').boundingBox(),states=[];
  for(const distance of [200,100,12]) {await p.mouse.move(box.x+box.width+distance,box.y+box.height/2,{steps:20});await p.waitForTimeout(900);states.push(await p.evaluate(()=>document.querySelector('#start').interactions.metrics()));}
  assert(states[0].intensity<states[1].intensity&&states[1].intensity<states[2].intensity);assert(states[0].emitted<=2);assert(states[2].arcs>0);assert(states.every(s=>s.alive<=24));return states.map(s=>({intensity:s.intensity,emitted:s.emitted,arcs:s.arcs}));
 });
 await check('activated inventory uses three icon columns; guide has no box frame',async()=>{
  const summary=p.locator('[data-technology-family="data"] summary');await summary.click();await p.waitForTimeout(500);
  const columns=await p.locator('[data-technology-family="data"] .technology-chips').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,3);
  await p.screenshot({path:path.join(__dirname,'desktop-technology-grid.png')});
  await p.locator('.technology-guide-row .guide-trigger').click();await p.waitForTimeout(800);
  const style=await p.locator('.context-guide').evaluate(e=>({border:getComputedStyle(e).borderTopWidth,shadow:getComputedStyle(e).boxShadow,background:getComputedStyle(e).backgroundImage,projection:getComputedStyle(e,'::before').clipPath}));assert.equal(style.border,'0px');assert.equal(style.shadow,'none');assert.equal(style.background,'none');assert(style.projection.includes('polygon'));return {columns,...style};
 });
 await check('project hover approaches the camera smoothly and shares proximity pool',async()=>{
  await p.locator('[data-hero-enter]').click();await p.waitForFunction(()=>document.querySelector('#rdzen').dataset.entryState==='showroom');await p.mouse.move(8,78);
  await p.waitForFunction(()=>document.querySelector('#projekty').showroom3D.metrics().phases.every(p=>p.phase==='ready'));
  await p.evaluate(()=>{document.querySelector('[data-showroom-canvas]').addEventListener('showroom:frame',e=>{document.querySelector('#projekty').proofLocations=e.detail.projects;});});
  await p.waitForTimeout(350);const z=()=>p.evaluate(()=>document.querySelector('#projekty').proofLocations?.find(p=>p.id==='glikemia-premium')?.z);
  const before=await z(),box=await p.locator('.showroom-card.is-active').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:25});await p.waitForTimeout(1500);
  const after=await z(),interaction=await p.evaluate(()=>document.querySelector('#start').interactions.metrics());
  assert(Number.isFinite(before)&&after<before,JSON.stringify({before,after,interaction}));assert.equal(interaction.active,'project');assert.equal(interaction.poolSize,24);return {before,after,active:interaction.active};
 });
 await check('no runtime JavaScript errors',()=>assert.deepEqual(errors,[]));
 await b.close();const report={checks,PASS:checks.filter(c=>c.status==='PASS').length,FAIL:checks.filter(c=>c.status==='FAIL').length};fs.writeFileSync(path.join(__dirname,'material-checks.json'),JSON.stringify(report,null,2));console.log(report);if(report.FAIL)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
