/* Local read-only interaction profiler. Product sources are never written. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pw=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname,base='http://127.0.0.1:8201/',mode=process.argv[2]||'baseline';
const report={startedAt:new Date().toISOString(),mode,viewport:{width:1440,height:1000},trials:[],errors:[],blocked:[],frozen:mode!=='after',note:'Hardware Chrome local desktop emulation; no recording. RAF samples measure delivered callbacks, not presentation FPS. Trace duration sums can overlap across threads.'};
function save(){fs.writeFileSync(path.join(out,mode+'-interactions.json'),JSON.stringify(report,null,2));}
function fingerprints(){const root=mode==='after'?path.resolve(out,'../../..'):path.join(out,'source-before'),files=['index.html','assets/technology-field.css','assets/technology-field.mjs','assets/material-finish.css','assets/luxury-world.mjs','assets/interface-life.js','assets/spatial-chapters.mjs','assets/showroom-scene.mjs','assets/showroom-3d.mjs'];return Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const variants=mode==='after'?['production']:['baseline','no-haze','no-grain','static-gradients','no-transforms'];
const css={
 'no-haze':'.luxury-atmosphere{display:none!important}',
 'no-grain':'body.luxury-world::after{display:none!important}',
 'static-gradients':'#main #technologie .technology-group{--field-x:35%!important;--field-y:20%!important}#main #technologie{--field-scan:50%!important}',
 'no-transforms':'#main #technologie .technology-group{transform:none!important;transition:opacity .6s!important}',
};
async function main(){
 report.sourceBefore=fingerprints();
 const browser=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 try{for(const variant of variants){
  const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1});
  await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==new URL(base).origin||!['GET','HEAD'].includes(req.method())){report.blocked.push({url:req.url(),method:req.method()});return route.abort();}const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1)),saved=path.join(out,'source-before',rel);if(mode!=='after'&&fs.existsSync(saved)&&fs.statSync(saved).isFile())return route.fulfill({status:200,contentType:rel.endsWith('.html')?'text/html':rel.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(saved)});return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push({variant,message:e.message}));
  await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.locator('#technologie').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:'instant'}));
  await page.waitForTimeout(700);
  if(css[variant])await page.addStyleTag({content:css[variant]});
  // In this diagnostic the shader must stop too, not merely become invisible.
  if(variant==='no-haze')await page.evaluate(()=>document.querySelector('#main').luxuryWorld.dispose());
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  if(!report.environment)report.environment=await page.evaluate(()=>{const c=document.querySelector('.luxury-atmosphere'),gl=c?.getContext('webgl2'),x=gl?.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):null,technologyGroups:document.querySelectorAll('#technologie .technology-group').length,atmosphere:document.querySelector('#main').luxuryWorld.metrics()};});
  for(let trial=0;trial<2;trial++){
   const tracing=variant==='baseline'&&trial===0||variant==='production'&&trial===0,events=[];
   const onTrace=e=>events.push(...e.value);
   if(tracing){cdp.on('Tracing.dataCollected',onTrace);await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,cc',transferMode:'ReportEvents'});}
   const result={variant,trial:trial+1,phases:[]};
   for(const [kind,groupIndex]of [['pointer',0],['pointer',5],['wheel',0]]){
    await page.mouse.move(5,80);
    await page.locator('#technologie .technology-group').nth(groupIndex).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-180,behavior:'instant'}));
    await page.waitForTimeout(350);
    const box=await page.locator('#technologie .technology-group').nth(groupIndex).boundingBox();
    await page.evaluate(()=>{window.__profile={start:performance.now(),last:null,intervals:[],longtasks:[],frames:0};window.__profile.running=true;window.__profile.observer=new PerformanceObserver(list=>window.__profile.longtasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));window.__profile.observer.observe({type:'longtask',buffered:false});const tick=t=>{const s=window.__profile;if(!s.running)return;if(s.last!==null)s.intervals.push(t-s.last);s.last=t;s.frames++;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    const perfBefore=(await cdp.send('Performance.getMetrics')).metrics;
    const t0=Date.now(),duration=kind==='pointer'?1500:2000;let inputs=0;
    if(kind==='wheel')await page.mouse.move(1350,500);
    while(Date.now()-t0<duration){const t=Date.now()-t0;if(kind==='pointer'){const p=t/duration;await page.mouse.move(Math.max(20,Math.min(1420,box.x+box.width*(.2+.6*p))),Math.max(180,Math.min(850,box.y+Math.min(box.height-80,260)+Math.sin(p*Math.PI*4)*90)));}else await page.mouse.wheel(0,48);inputs++;await sleep(kind==='pointer'?16:45);}
    const sample=await page.evaluate(()=>{const s=window.__profile;s.running=false;s.observer.disconnect();const v=[...s.intervals].sort((a,b)=>a-b),sum=v.reduce((a,b)=>a+b,0);return {durationMs:performance.now()-s.start,frames:s.frames,intervalsMs:s.intervals,meanMs:sum/v.length,p95Ms:v[Math.floor((v.length-1)*.95)]||null,maxMs:v.at(-1)||null,delaysOver50:v.filter(x=>x>50).length,delaysOver33:v.filter(x=>x>33.5).length,longtasks:s.longtasks,atmosphere:document.querySelector('#main').luxuryWorld.metrics(),technology:document.querySelector('#technologie').technologyField.metrics()};});
    const perfAfter=(await cdp.send('Performance.getMetrics')).metrics;
    const before=Object.fromEntries(perfBefore.map(x=>[x.name,x.value]));sample.performanceDelta=Object.fromEntries(perfAfter.filter(x=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'].includes(x.name)).map(x=>[x.name,x.value-(before[x.name]||0)]));
    result.phases.push({kind,groupIndex,inputs,...sample});
   }
   if(tracing){const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;cdp.off('Tracing.dataCollected',onTrace);const sums={};for(const e of events){if(e.ph==='X'&&e.dur){const key=e.name;sums[key]??={count:0,totalMs:0,maxMs:0};sums[key].count++;sums[key].totalMs+=e.dur/1000;sums[key].maxMs=Math.max(sums[key].maxMs,e.dur/1000);}}result.traceSummary=Object.entries(sums).map(([name,v])=>({name,...v})).sort((a,b)=>b.totalMs-a.totalMs);fs.writeFileSync(path.join(out,mode+'-trace.json'),JSON.stringify({traceEvents:events}));}
   report.trials.push(result);save();console.log(JSON.stringify({variant,trial:trial+1,phases:result.phases.map(p=>({kind:p.kind,group:p.groupIndex,p95:p.p95Ms,over50:p.delaysOver50,mean:p.meanMs,taskMs:p.performanceDelta.TaskDuration*1000,layoutMs:p.performanceDelta.LayoutDuration*1000,recalcMs:p.performanceDelta.RecalcStyleDuration*1000}))}));
  }
  await context.close();
 }}finally{await browser.close();report.sourceAfter=fingerprints();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.finishedAt=new Date().toISOString();save();}
}
main().catch(e=>{report.failure=e.stack;save();console.error(e);process.exitCode=1;});
