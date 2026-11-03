/* Scoped local Chrome benchmark; not the application's embedded preview. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pw=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname,base='http://127.0.0.1:8201/',mode=process.argv[2]||'baseline';
const files=['assets/technology-field.css','assets/technology-field.mjs','assets/material-finish.css'];
const report={mode,startedAt:new Date().toISOString(),viewport:{width:1440,height:1000},trials:[],errors:[],blocked:[],hostPreviewLatency:'UNKNOWN; only standalone local hardware Chrome measured.',note:'Trusted event timestamp to DOM state is not optical input-to-display latency. RAF intervals are callbacks, not presentation FPS. No video during benchmarks.'};
const save=()=>fs.writeFileSync(path.join(out,mode+'-crystal-profile.json'),JSON.stringify(report,null,2));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mode==='baseline'?path.join(out,'source-before'):path.resolve(out,'../../..'),f))).digest('hex')]));
async function arm(page){await page.evaluate(()=>{const d=window.__reaction={armed:performance.now(),event:null,state:null,raf:null};const root=document.querySelector('#technologie');const handler=e=>{d.event={handler:performance.now(),timestamp:e.timeStamp,trusted:e.isTrusted,type:e.type};requestAnimationFrame(()=>d.raf=performance.now());};root.querySelectorAll('.technology-group').forEach(g=>g.addEventListener('pointerenter',handler,{once:true,capture:true}));const observer=new MutationObserver(()=>{if(d.event&&root.dataset.fieldActive==='true'&&d.state===null){d.state=performance.now();observer.disconnect();}});observer.observe(root,{subtree:true,attributes:true,attributeFilter:['class','data-field-active']});});}
async function reaction(page){return page.evaluate(()=>{const d=window.__reaction;return {...d,eventToDOMMs:d.state!==null&&d.event?d.state-d.event.timestamp:null,handlerToDOMMs:d.state!==null&&d.event?d.state-d.event.handler:null,handlerToRAFMs:d.raf!==null&&d.event?d.raf-d.event.handler:null};});}
async function main(){
 report.sourceBefore=hashes();save();
 const browser=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 try{const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1});
  await context.route('**/*',route=>{const q=route.request(),u=new URL(q.url());if(u.origin!==new URL(base).origin||!['GET','HEAD'].includes(q.method())){report.blocked.push({url:q.url(),method:q.method()});return route.abort();}const rel=decodeURIComponent(u.pathname.slice(1));if(mode==='baseline'&&files.includes(rel))return route.fulfill({status:200,contentType:rel.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(out,'source-before',rel))});return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  report.environment=await page.evaluate(()=>{const c=document.querySelector('.luxury-atmosphere'),gl=c?.getContext('webgl2'),x=gl?.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):null,groups:document.querySelectorAll('#technologie .technology-group').length,links:document.querySelectorAll('#technologie .technology-chips a').length};});
  for(let trial=0;trial<2;trial++){
   const result={trial:trial+1,phases:[]},events=[],onTrace=e=>events.push(...e.value);
   if(trial===0){cdp.on('Tracing.dataCollected',onTrace);await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,cc',transferMode:'ReportEvents'});}
   for(const [kind,groupIndex]of [['idle',0],['pointer',0],['pointer',5],['wheel',0]]){
    await page.mouse.move(5,80);await page.locator('#technologie .technology-group').nth(groupIndex).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-180,behavior:'instant'}));await page.waitForTimeout(400);
    const box=await page.locator('#technologie .technology-group').nth(groupIndex).boundingBox();
    await page.evaluate(()=>{const s=window.__sample={start:performance.now(),last:null,intervals:[],longtasks:[],running:true};s.observer=new PerformanceObserver(list=>s.longtasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));s.observer.observe({type:'longtask',buffered:false});const tick=t=>{if(!s.running)return;if(s.last!==null)s.intervals.push(t-s.last);s.last=t;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    if(kind==='pointer')await arm(page);
    const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
    const start=Date.now(),duration=kind==='idle'?5000:kind==='pointer'?1500:2000;let inputs=0;
    if(kind==='wheel')await page.mouse.move(1350,500);
    while(Date.now()-start<duration){const p=(Date.now()-start)/duration;if(kind==='pointer'){await page.mouse.move(Math.max(20,Math.min(1420,box.x+box.width*(.2+.6*p))),Math.max(180,Math.min(850,box.y+Math.min(box.height-80,260)+Math.sin(p*Math.PI*4)*90)));inputs++;}else if(kind==='wheel'){await page.mouse.wheel(0,48);inputs++;}await sleep(kind==='idle'?100:kind==='pointer'?16:45);}
    const sample=await page.evaluate(()=>{const s=window.__sample;s.running=false;s.observer.disconnect();const v=[...s.intervals].sort((a,b)=>a-b);return {durationMs:performance.now()-s.start,frames:s.intervals.length+1,meanMs:v.reduce((a,b)=>a+b,0)/v.length,p95Ms:v[Math.floor((v.length-1)*.95)],maxMs:v.at(-1),delaysOver50:v.filter(x=>x>50).length,delaysOver33:v.filter(x=>x>33.5).length,longtasks:s.longtasks,technology:document.querySelector('#technologie').technologyField.metrics(),atmosphere:document.querySelector('#main').luxuryWorld.metrics()};});
    const delta=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(x=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'].includes(x.name)).map(x=>[x.name,x.value-(before[x.name]||0)]));
    result.phases.push({kind,groupIndex,inputs,...sample,performanceDelta:delta,...(kind==='pointer'?{reaction:await reaction(page)}:{})});
   }
   if(trial===0){const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;cdp.off('Tracing.dataCollected',onTrace);const sums={};for(const e of events)if(e.ph==='X'&&e.dur){const s=sums[e.name]??={count:0,totalMs:0,maxMs:0};s.count++;s.totalMs+=e.dur/1000;s.maxMs=Math.max(s.maxMs,e.dur/1000);}result.traceSummary=Object.entries(sums).map(([name,v])=>({name,...v})).sort((a,b)=>b.totalMs-a.totalMs);fs.writeFileSync(path.join(out,mode+'-crystal-trace.json'),JSON.stringify({traceEvents:events}));}
   report.trials.push(result);save();console.log(JSON.stringify({trial:trial+1,phases:result.phases.map(p=>({kind:p.kind,group:p.groupIndex,p95:p.p95Ms,max:p.maxMs,over50:p.delaysOver50,reaction:p.reaction?.eventToDOMMs,recalcMs:p.performanceDelta.RecalcStyleDuration*1000,taskMs:p.performanceDelta.TaskDuration*1000}))}));
  }
  await context.close();
 }finally{await browser.close();report.sourceAfter=hashes();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.finishedAt=new Date().toISOString();save();}
}
main().catch(e=>{report.failure=e.stack;save();console.error(e);process.exitCode=1;});
