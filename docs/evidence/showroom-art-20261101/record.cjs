'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/progresskit-art-direction-20261101-playwright';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'final');
const at=async p=>p.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));
async function point(p,id){return p.locator(id==='core'?'[data-capsule-toggle]':`.showroom-card[data-project-id="${id}"]`).evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 const reports=[];
 for(const mobile of [false,true]){
  const name=mobile?'mobile':'desktop',size=mobile?{width:390,height:844}:{width:1440,height:1080};
  const context=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,recordVideo:{dir:path.join(out,'raw'),size}});
  const p=await context.newPage(),videoStart=Date.now(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');await at(p);await p.waitForTimeout(5000);
  await p.evaluate(()=>{window.__recordFrames=[];document.querySelector('[data-showroom-canvas]').addEventListener('showroom:frame',()=>{const m=document.querySelector('#projekty').showroom3D.metrics();window.__recordFrames.push({t:performance.now(),frames:m.frames,cpuFrameMs:m.cpuFrameMs,gpuFrameMs:m.gpuFrameMs,drawCalls:m.drawCalls,triangles:m.triangles,dpr:m.dpr,quality:m.quality});});});
  const started=Date.now(),readyOffset=(started-videoStart)/1000,events=[];
  const mark=event=>events.push({seconds:(Date.now()-started)/1000,event});
  const until=async seconds=>{const ms=started+seconds*1000-Date.now();if(ms>0)await p.waitForTimeout(ms);};
  mark('idle');await until(6.2);if(!mobile)await p.screenshot({path:path.join(out,'idle.png')});
  const core=await point(p,'core');mark('core activation');if(mobile)await p.touchscreen.tap(core.x,core.y);else await p.mouse.move(core.x,core.y);
  if(!mobile){await p.waitForTimeout(2500);await p.screenshot({path:path.join(out,'activation.png')});}
  await until(10.5);
  if(mobile){mark('mobile crystal tap');const selected=await point(p,'glikemia-premium');await p.touchscreen.tap(selected.x,selected.y);await p.waitForSelector('.is-slice-expanded');}
  else{mark('Mail raycast hover');const selected=await point(p,'progresskit-mail');await p.mouse.move(selected.x,selected.y,{steps:18});await until(12);await p.screenshot({path:path.join(out,'hover.png')});const crystal=await p.locator('.showroom-card[data-project-id="progresskit-mail"]').boundingBox();await p.screenshot({path:path.join(out,'crystal-closeup.png'),clip:{x:crystal.x-40,y:crystal.y-40,width:crystal.width+80,height:crystal.height+80}});await until(14);mark('cursor lighting reaction');await p.mouse.move(core.x-65,core.y+80,{steps:35});}
  await until(mobile?16.5:19);
  const metrics=await p.locator('#projekty').evaluate(e=>e.showroom3D.metrics()),frames=await p.evaluate(()=>window.__recordFrames);
  // One extra still after the recorded sequence, cropped from the real canvas (no rescaling).
  if(!mobile){const box=await p.locator('.showroom-scene').boundingBox();await p.screenshot({path:path.join(out,'core-closeup.png'),clip:{x:box.x+box.width/2-250,y:box.y+box.height/2-270,width:500,height:540}});}
  const video=p.video();await context.close();const raw=await video.path();reports.push({name,readyOffset,duration:mobile?15:18,events,metrics,frames,errors,raw});
  fs.writeFileSync(path.join(out,'recording-metrics.json'),JSON.stringify(reports,null,2));console.log(name,metrics.renderer,metrics.fps,raw);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
