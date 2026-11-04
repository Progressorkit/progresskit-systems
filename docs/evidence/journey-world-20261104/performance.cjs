const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await p.goto('http://127.0.0.1:8214/');
 await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');
 const sections=[];
 for(const id of ['start','rdzen','projekty','uslugi','proces','technologie']){
  await p.mouse.move(8,78);
  if(id==='projekty') {await p.locator('[data-hero-enter]').click();await p.waitForFunction(()=>document.querySelector('#rdzen').dataset.entryState==='showroom');}
  else await p.locator('#'+id).evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await p.waitForTimeout(id==='projekty'?7000:1500);
  const result=await p.evaluate(async id=>{
   const timings=[];let last=performance.now();
   await new Promise(resolve=>{const end=last+5000;function frame(now){timings.push(now-last);last=now;if(now<end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   timings.sort((a,b)=>a-b);
   return {id,rafMedian:timings[Math.floor(timings.length*.5)],rafP95:timings[Math.floor(timings.length*.95)],frames:timings.length,scene:document.querySelector('#projekty').showroom3D.metrics(),ambient:document.querySelector('#start').installation.metrics()};
  },id);
  sections.push(result);console.log(id,JSON.stringify({rafMedian:result.rafMedian,p95:result.rafP95,sceneFPS:result.scene.fps,gpu:result.scene.gpuFrameMs,drawCalls:result.scene.drawCalls}));
 }
 await p.locator('[data-hero-motion-toggle]').click();await p.waitForTimeout(500);
 const paused=await p.evaluate(()=>({scene:document.querySelector('#projekty').showroom3D.metrics().rafPending,ambient:document.querySelector('#start').installation.metrics().pending,interaction:document.querySelector('#start').interactions.metrics().pending}));
 fs.writeFileSync(path.join(__dirname,'performance-'+(process.argv[2]||'after')+'.json'),JSON.stringify({browser:b.version(),hardware:'Actual local ANGLE renderer, 1440x900, no video recording, five-second samples; browser rAF and renderer FPS reported separately.',sections,paused},null,2));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
