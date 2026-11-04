const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});const report={ownerVisualApproval:'OPEN',mode:'User motion control paused; actual browser screenshots, no visual simulation',shots:[]};try{
 const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});await p.goto('http://127.0.0.1:8209/');await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');
 await p.locator('[data-hero-enter]').click();await p.mouse.move(8,78);await p.waitForFunction(()=>{const x=document.querySelector('#projekty').showroom3D.metrics();return x.phases.length===6&&x.phases.every(p=>p.phase==='ready');});
 await p.locator('[data-hero-motion-toggle]').evaluate(e=>e.click());
 for(const [id,selector] of[['hero','#start'],['core','#rdzen'],['showroom','.showroom-viewport'],['services','.service-zones'],['process','.production-space'],['ecosystem','.ecosystem-system'],['technologies','.technology-groups']]){
  await p.mouse.move(8,78);await p.locator(selector).first().evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(450);
  const state=await p.evaluate(()=>({motion:document.documentElement.dataset.interfaceMotion,ambient:document.querySelector('#start').installation.metrics(),scene:document.querySelector('#projekty').showroom3D.metrics(),pulse:getComputedStyle(document.querySelector('.core-shell')).animationPlayState}));
  assert.equal(state.motion,'paused');assert(!state.ambient.pending&&!state.scene.rafPending);assert.equal(state.pulse,'paused');
  const name=`depth-${id}.png`;await p.screenshot({path:__dirname+'/'+name});report.shots.push({name,paused:true,sceneFrames:state.scene.frames});
 }
 report.status='CAPTURED_FOR_VISUAL_REVIEW';
}finally{await b.close();fs.writeFileSync(__dirname+'/depth-review.json',JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
