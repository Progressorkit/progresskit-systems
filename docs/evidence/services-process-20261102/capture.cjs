'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/progresskit-art-direction-20261101-playwright';
const path=require('node:path');
const {fs,launch,ready,at,snapshot,active,serviceChecks,sections,save}=require('./common.cjs');
const out=path.join(__dirname,'final');
async function alignedSnapshot(page,selector,file) {
 const section=await page.locator(selector).boundingBox(),viewport=page.viewportSize();
 const x=Math.max(0,section.x),y=Math.max(0,section.y);
 const clip={x,y,width:Math.min(viewport.width,section.x+section.width)-x,height:Math.min(viewport.height-12,section.y+section.height)-y};
 if(clip.width<=0||clip.height<=0)throw new Error('No visible viewport area: '+selector);
 await page.screenshot({path:file,clip,fullPage:false});
 return {selector,section,viewport,clip,clipped:clip.width<section.width-1||clip.height<section.height-1};
}
async function telemetry(page,label) {
 return page.evaluate(label=>({label,t:performance.now(),scrollY,
  services:document.querySelector('#uslugi').spatialServices?.metrics()||null,
  servicesMotion:document.querySelector('#uslugi').dataset.spatialMotion||null,
  process:document.querySelector('#proces').spatialProcess?.metrics()||null
 }),label);
}
async function scrollJourney(page,target,duration) {
 return page.evaluate(async ({target,duration})=>{const start=scrollY,top=document.querySelector(target).getBoundingClientRect().top+scrollY-90,begin=performance.now();await new Promise(resolve=>{const tick=now=>{const t=Math.min(1,(now-begin)/duration),ease=t*t*(3-2*t);scrollTo({top:start+(top-start)*ease,behavior:'instant'});if(t<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});},{target,duration});
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await launch(),report={checks:[],artifacts:[],errors:[],crops:[],events:[],telemetry:[]};let context;
 const check=(name,pass,details)=>report.checks.push({name,status:pass?'PASS':'FAIL',details});
 try{
  const size={width:1440,height:1100};context=await browser.newContext({viewport:size,deviceScaleFactor:1,recordVideo:{dir:path.join(out,'raw'),size}});
  const desktop=await context.newPage(),videoStart=Date.now();desktop.on('pageerror',e=>report.errors.push(e.message));await ready(desktop);await at(desktop,'#uslugi');await desktop.waitForTimeout(1800);
  report.sectionOrder=await sections(desktop);const ids=report.sectionOrder.map(s=>s.id),a=ids.indexOf('uslugi'),b=ids.indexOf('proces');check('Services and Process form a direct transition',a>=0&&b===a+1,{ids,intervening:ids.slice(a+1,b)});
  await desktop.evaluate(()=>{window.__stageEvents=[];const line=document.querySelector('.production-line');const capture=()=>window.__stageEvents.push({t:performance.now(),scrollY,progress:getComputedStyle(line).getPropertyValue('--process-progress'),stages:[...line.querySelectorAll('[data-production-stage]')].map(e=>({id:e.dataset.productionStage,state:e.dataset.productionState}))});new MutationObserver(capture).observe(line,{subtree:true,attributes:true,attributeFilter:['data-production-state']});capture();});
  const started=Date.now(),readyOffset=(started-videoStart)/1000;const mark=event=>report.events.push({seconds:(Date.now()-started)/1000,event});const until=async seconds=>{const ms=started+seconds*1000-Date.now();if(ms>0)await desktop.waitForTimeout(ms);};
  report.telemetry.push(await telemetry(desktop,'started'));
  mark('Services idle');await until(2.8);let file=path.join(out,'services-idle.png');report.crops.push(await snapshot(desktop,'#uslugi',file));report.artifacts.push(file);
  mark('Services hover');await desktop.locator('#uslugi .service-zone').first().hover();await desktop.waitForTimeout(550);let state=await active(desktop);check('Services hover activates first object',state.active,state);file=path.join(out,'services-hover.png');await desktop.screenshot({path:file,clip:report.crops[0].clip});report.artifacts.push(file);report.telemetry.push(await telemetry(desktop,'Services hover'));
  await desktop.mouse.move(1350,100);await until(6);mark('Scroll Services → Process');const journey=scrollJourney(desktop,'#proces',4000);await desktop.waitForTimeout(2000);file=path.join(out,'transition.png');await desktop.screenshot({path:file});report.artifacts.push(file);await journey;
  mark('Continue to Process chambers');await scrollJourney(desktop,'.production-space',1600);await desktop.waitForTimeout(350);report.telemetry.push(await telemetry(desktop,'after journey'));
  mark('Process chambers');file=path.join(out,'process.png');report.crops.push(await alignedSnapshot(desktop,'.production-space',file));report.artifacts.push(file);await until(16.5);
  report.telemetry.push(await telemetry(desktop,'final Process hold'));
  const initial=report.telemetry[0],hover=report.telemetry[1],arrived=report.telemetry[2],final=report.telemetry[3];
  report.captureTelemetry={serviceFpsStartToHover:initial.services?.frames!==undefined&&hover.services?.frames!==undefined?(hover.services.frames-initial.services.frames)*1000/(hover.t-initial.t):null,serviceFramesDuringProcessHold:arrived.services?.frames!==undefined&&final.services?.frames!==undefined?final.services.frames-arrived.services.frames:null,servicesPausedAtEnd:final.services?final.services.rafPending===false:null,finalProcessMetrics:final.process};
  report.stageEvents=await desktop.evaluate(()=>window.__stageEvents);check('Scroll activates original Process stages',report.stageEvents.some(e=>e.stages.some(s=>s.state==='active'||s.state==='complete')),report.stageEvents);
  const stages=await desktop.locator('#proces [data-production-stage]').evaluateAll(items=>items.map(e=>({id:e.dataset.productionStage,title:e.querySelector('h3').textContent.trim(),state:e.dataset.productionState})));
  check('Six original Process stages retained',JSON.stringify(stages.map(s=>s.title))===JSON.stringify(['Pomysł','Projekt','Budowa','Testy','Security','Wdrożenie']),stages);
  const video=desktop.video();await context.close();context=null;report.recording={readyOffset,duration:15,raw:await video.path()};
  // Functional checks run outside the native video to keep the proof focused.
  const functional=await browser.newPage({viewport:size});functional.on('pageerror',e=>report.errors.push(e.message));await ready(functional);await at(functional,'#uslugi');await serviceChecks(functional,report);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>report.errors.push(e.message));await ready(mobile);await at(mobile,'#uslugi');await mobile.waitForTimeout(800);
  file=path.join(out,'mobile-services.png');report.crops.push(await snapshot(mobile,'#uslugi',file,{mobile:true}));report.artifacts.push(file);await serviceChecks(mobile,report);
  file=path.join(out,'mobile-process.png');report.crops.push(await snapshot(mobile,'#proces',file,{mobile:true}));report.artifacts.push(file);
  await mobile.locator('.production-line').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-innerHeight*.9,behavior:'instant'}));await mobile.waitForTimeout(300);const before=await mobile.locator('.production-line').evaluate(e=>getComputedStyle(e).getPropertyValue('--process-progress'));await mobile.locator('.production-line').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-innerHeight*.1,behavior:'instant'}));await mobile.waitForTimeout(500);const after=await mobile.locator('.production-line').evaluate(e=>getComputedStyle(e).getPropertyValue('--process-progress'));
  check('Mobile Process responds to real scrolling',before!==after,{before,after});check('Mobile Process has no horizontal overflow',await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  report.servicesData=await functional.locator('#uslugi').evaluate(e=>({...e.dataset}));check('No uncaught browser errors',report.errors.length===0,report.errors);
 }catch(error){check('Final capture completed',false,error.stack);}finally{if(context)await context.close();await browser.close();save(path.join(out,'capture.json'),report);}
})();
