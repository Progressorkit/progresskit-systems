/* Fixes only capture timing; production source, other proof files and player stay unchanged. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'showroom-proof'),out=path.join(__dirname,'owner-proof'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'matrix-final/chrome-1440/report.json'))).sourceAfter;
const unchanged=['core-idle.png','project-hover.png','desktop-15s.mp4'];
const report={startedAt:new Date().toISOString(),scope:'Only the core-active.png artifact after actual six-crystal materialization',errors:[],sourceBefore:Object.fromEntries(Object.keys(reference).map(file=>[file,sha(path.join(root,file))])),otherFilesBefore:Object.fromEntries(unchanged.map(file=>[file,sha(path.join(folder,file))])),oldActiveSha256:sha(path.join(folder,'core-active.png')),ownerVisualApproval:'OPEN'};
const assert=(v,m)=>{if(!v)throw Error(m);};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const old=path.join(out,'attempt-premature-core-active.png');if(!fs.existsSync(old))fs.copyFileSync(path.join(folder,'core-active.png'),old);
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 try{const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:8201'&&route.request().method()==='GET'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:8201/',{waitUntil:'networkidle'});
  await page.locator('[data-showroom-viewport]').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2'&&document.querySelector('#projekty').showroom3D.metrics().frames>2);
  const box=await page.locator('[data-capsule-toggle]').boundingBox();assert(box,'Core target has no geometry');report.mouseClick={x:box.x+box.width/2,y:box.y+box.height/2};
  await page.mouse.click(report.mouseClick.x,report.mouseClick.y);const activation=Date.now();
  await page.waitForFunction(()=>{const phases=document.querySelector('#projekty').showroom3D.metrics().phases;return phases.length===6&&phases.every(p=>p.phase==='ready');},undefined,{timeout:20000});
  report.readyWaitMilliseconds=Date.now()-activation;await page.mouse.move(8,80);await page.waitForTimeout(400);
  report.scene=await page.locator('#projekty').evaluate(e=>({awake:e.querySelector('[data-capsule-toggle]').getAttribute('aria-expanded'),phases:e.showroom3D.metrics().phases,relatedProject:e.dataset.relatedProject,focusVisible:[...e.querySelectorAll(':focus-visible')].map(n=>n.tagName+'.'+n.className),labels:e.showroom3D.metrics().phases.map(p=>({id:p.id,name:e.querySelector(`.showroom-card[data-project-id="${p.id}"] h3`).textContent.trim()}))}));
  assert(report.scene.awake==='true'&&report.scene.phases.length===6&&report.scene.phases.every(p=>p.phase==='ready'),'Core did not stay awake with six ready crystals');assert(report.scene.focusVisible.length===0,'Unexpected focus rectangle');assert(!report.scene.relatedProject,'Mouse must leave crystal hover');
  report.canvas=await page.locator('[data-showroom-canvas]').boundingBox();await page.locator('[data-showroom-canvas]').screenshot({path:path.join(folder,'core-active.png')});
 }finally{await browser.close();}
 report.newActiveSha256=sha(path.join(folder,'core-active.png'));report.otherFilesAfter=Object.fromEntries(unchanged.map(file=>[file,sha(path.join(folder,file))]));report.sourceAfter=Object.fromEntries(Object.keys(reference).map(file=>[file,sha(path.join(root,file))]));
 assert(JSON.stringify(report.sourceBefore)===JSON.stringify(reference)&&JSON.stringify(report.sourceAfter)===JSON.stringify(reference),'Frozen UI source changed');assert(JSON.stringify(report.otherFilesBefore)===JSON.stringify(report.otherFilesAfter),'Unrequested proof file changed');assert(report.errors.length===0,'Browser page error');
 report.status='CAPTURE_CORRECTED_SIX_READY_NATIVE_CANVAS_VISUAL_REVIEW_PENDING';report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'core-active-correction.json'),JSON.stringify(report,null,2));console.log({status:report.status,readyWaitMilliseconds:report.readyWaitMilliseconds,labels:report.scene.labels,newActiveSha256:report.newActiveSha256});
})().catch(e=>{report.status='FAIL';report.failure=e.stack;fs.writeFileSync(path.join(out,'core-active-correction.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
