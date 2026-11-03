'use strict';
// Integration checks for the Services renderer only. Run after the preview is ready:
// node docs/evidence/services-process-20261102/lifecycle.cjs
const path = require('node:path');
const {fs, launch, ready, at, save} = require('./common.cjs');
const output = path.join(__dirname, 'final');
fs.mkdirSync(output, {recursive:true});
const report = {checks:[], errors:[], expectedContextMessages:[]};
const expectedLinks = [
  'projekty/?technologia=C%23', 'projekty/?technologia=.NET',
  'projekty/?technologia=ASP.NET%20Core', 'projekty/?technologia=PostgreSQL',
  'projekty/?technologia=Android', '#kontakt', '#brief'
];
const check = (name, pass, details) => {
  report.checks.push({name,status:pass?'PASS':'FAIL',details});
  if (!pass) console.log('FAIL',name,details);
};
const metrics = page => page.locator('#uslugi').evaluate(e=>e.spatialServices.metrics());
const renderer = page => page.locator('#uslugi').getAttribute('data-service-renderer');
const processMetrics = page => page.locator('#proces').evaluate(e=>e.spatialProcess.metrics());
const runningProcessAnimations = page => page.locator('#proces').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').map(a=>({type:a.constructor.name,name:a.animationName||a.transitionProperty,currentTime:a.currentTime})));
async function holdProcess(page,ms=650) {
  await page.waitForTimeout(250);
  const before=await processMetrics(page);await page.waitForTimeout(ms);
  return {before,after:await processMetrics(page)};
}
function listen(page, mode) {
  page.on('pageerror',error=>report.errors.push({mode,message:error.message}));
  page.on('console',message=>{
    const text=message.text();
    // Context-loss notices are emitted by Three as part of the test, not JS errors.
    if (/Context Lost|Context Restored|CONTEXT_LOST_WEBGL/i.test(text)) {
      report.expectedContextMessages.push({mode,text});
    } else if (message.type()==='error' && /THREE.*Shader Error|VALIDATE_STATUS|GL_INVALID_/i.test(text)) {
      report.errors.push({mode,message:text});
    }
  });
  page.setDefaultTimeout(15000);
}
async function enter(page) {
  await ready(page);
  await at(page,'#uslugi');
  await page.waitForFunction(()=>document.querySelector('#uslugi')?.dataset.serviceRenderer==='webgl2', null, {timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#uslugi').spatialServices.metrics().frames>0);
}
async function hold(page,ms=650) {
  await page.waitForTimeout(250); // allow queued visibility/media/resize callbacks to settle
  const before=await metrics(page);
  await page.waitForTimeout(ms);
  return {before,after:await metrics(page)};
}
async function linksRemain(page,name) {
  const links=await page.locator('#uslugi a').evaluateAll(items=>items.map(e=>({
    href:e.getAttribute('href'),name:e.textContent.replace(/\s+/g,' ').trim(),
    rendered:!!e.getClientRects().length && getComputedStyle(e).display!=='none' && getComputedStyle(e).visibility!=='hidden'
  })));
  const headings=await page.locator('#uslugi .service-zone h3').allTextContents();
  check(name,links.length===7&&links.every((e,i)=>e.href===expectedLinks[i]&&e.name&&e.rendered)&&headings.length===2&&headings.every(h=>h.trim()),{links,headings});
}
(async()=>{
  const browser=await launch();
  try {
    const desktop=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
    const page=await desktop.newPage();listen(page,'desktop');
    try {
      await enter(page);
      const init=await metrics(page);
      check('Services initializes one WebGL2 canvas with visible objects',await page.locator('#uslugi canvas').count()===1&&await renderer(page)==='webgl2'&&init.frames>0&&init.drawCalls>0&&init.objects>0,init);
      const before=init.frames;await page.waitForTimeout(850);const idle=await metrics(page);
      check('Visible idle animates with one live scheduler',idle.frames>before+5&&idle.rafPending,idle);

      // Move beyond Services, then generate real additional scroll input while it stays offscreen.
      await page.locator('#uslugi').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().bottom+160,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('#uslugi').getBoundingClientRect().bottom<0&&!document.querySelector('#uslugi').spatialServices.metrics().rafPending);
      const offscreen=await hold(page,400);
      await page.mouse.wheel(0,100);await page.waitForTimeout(120);
      await page.mouse.wheel(0,-40);await page.waitForTimeout(120);
      await page.mouse.wheel(0,140);await page.waitForTimeout(400);
      const offAfter=await metrics(page),bounds=await page.locator('#uslugi').boundingBox();
      check('Offscreen real scroll produces no frames or RAF',offscreen.before.frames===offscreen.after.frames&&offAfter.frames===offscreen.after.frames&&!offAfter.rafPending&&bounds.y+bounds.height<0,{before:offscreen.before,after:offAfter,bounds});
      await at(page,'#uslugi');await page.waitForFunction(()=>document.querySelector('#uslugi').spatialServices.metrics().rafPending);
      const returning=(await metrics(page)).frames;await page.waitForTimeout(450);
      check('Returning to Services resumes animation',(await metrics(page)).frames>returning);

      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('#uslugi').dataset.spatialMotion==='paused'&&!document.querySelector('#uslugi').spatialServices.metrics().rafPending);
      const staticScene=await hold(page);
      check('Reduced motion keeps rendered 3D but stops continuous work',await renderer(page)==='webgl2'&&staticScene.before.frames===staticScene.after.frames&&!staticScene.after.rafPending&&staticScene.after.drawCalls>0,staticScene);
      await page.setViewportSize({width:980,height:900});await at(page,'#uslugi');
      const resized=await metrics(page);
      check('Paused resize updates the static renderer and caps desktop DPR',resized.frames>staticScene.after.frames&&resized.dpr<=.85&&resized.buffer.width>0&&resized.buffer.width<=980,resized);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForFunction(()=>document.querySelector('#uslugi').spatialServices.metrics().rafPending);

      // DOM click uses the existing real button without scrolling Services away.
      const toggle=page.locator('[data-hero-motion-toggle]');
      await toggle.evaluate(e=>e.click());
      await page.waitForFunction(()=>document.querySelector('#uslugi').dataset.spatialMotion==='paused');
      const globallyPaused=await hold(page);
      check('Existing global motion control pauses onscreen Services',globallyPaused.before.frames===globallyPaused.after.frames&&!globallyPaused.after.rafPending,globallyPaused);
      await toggle.evaluate(e=>e.click());
      await page.waitForFunction(()=>document.querySelector('#uslugi').spatialServices.metrics().rafPending);
      const resumed=(await metrics(page)).frames;await page.waitForTimeout(350);
      check('Existing global motion control resumes Services',(await metrics(page)).frames>resumed);

      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>!document.querySelector('#uslugi').spatialServices.metrics().rafPending);
      const canLose=await page.locator('[data-service-canvas]').evaluate(canvas=>{
        window.__serviceLoss=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
        if(!window.__serviceLoss)return false;
        window.__serviceLoss.loseContext();return true;
      });
      check('Browser exposes real WEBGL_lose_context',canLose);
      if(canLose){
        await page.waitForFunction(()=>document.querySelector('#uslugi').dataset.serviceRenderer==='fallback');
        await linksRemain(page,'Context loss fallback retains all seven Services links and headings');
        const lost=await hold(page,350);
        check('Lost context has no active RAF or frame work',!lost.after.rafPending&&lost.before.frames===lost.after.frames,lost);
        await page.evaluate(()=>window.__serviceLoss.restoreContext());
        await page.waitForFunction(()=>document.querySelector('#uslugi').dataset.serviceRenderer==='webgl2',null,{timeout:30000});
        const restored=await hold(page);
        check('Context restoration rebuilds one static 3D renderer while reduced',await page.locator('#uslugi canvas').count()===1&&!restored.after.rafPending&&restored.after.frames>0&&restored.after.drawCalls>0&&restored.before.frames===restored.after.frames,restored);
      }
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForFunction(()=>document.querySelector('#uslugi').spatialServices.metrics().rafPending);
      await page.locator('#uslugi').evaluate(e=>e.spatialServices.dispose());
      const disposed=await metrics(page);
      await page.mouse.wheel(0,100);await page.setViewportSize({width:1000,height:920});await page.waitForTimeout(500);
      const disposedAfter=await metrics(page);
      check('Explicit dispose cancels RAF and prevents scroll/resize resurrection',disposed.disposed&&!disposed.rafPending&&disposedAfter.disposed&&!disposedAfter.rafPending&&disposed.frames===disposedAfter.frames&&disposedAfter.remainingGeometries===0&&disposedAfter.remainingTextures===0,{before:disposed,after:disposedAfter});

      // Process consumes the shared scroll state after the separate Services renderer is disposed.
      await at(page,'#proces .production-line',180);
      await page.waitForFunction(()=>document.querySelector('#proces').spatialProcess?.metrics().rafPending);
      const processInit=await processMetrics(page);await page.waitForTimeout(550);
      const processIdle=await processMetrics(page);
      check('Visible Process has one animated canvas and a live RAF',await page.locator('#proces [data-process-canvas]').count()===1&&processIdle.frames>processInit.frames+3&&processIdle.rafPending,processIdle);

      const samples=[];
      for(const fraction of [.75,.45,.15,-.12]){
        await page.locator('#proces .production-line').evaluate((line,ratio)=>scrollTo({top:scrollY+line.getBoundingClientRect().top-innerHeight*ratio,behavior:'instant'}),fraction);
        await page.waitForTimeout(240);
        samples.push({metrics:await processMetrics(page),stages:await page.locator('#proces [data-production-stage]').evaluateAll(items=>items.map(e=>({id:e.dataset.productionStage,state:e.dataset.productionState})))});
      }
      const statesAgree=samples.every(sample=>{
        const selected=sample.stages.find(stage=>stage.state==='active');
        const order={complete:0,active:1,pending:2},values=sample.stages.map(stage=>order[stage.state]);
        return sample.stages.length===6&&values.every(Number.isFinite)&&values.every((value,i)=>i===0||value>=values[i-1])&&sample.stages.filter(stage=>stage.state==='active').length<=1&&(!selected||selected.id===sample.metrics.active);
      });
      check('Process observes existing stage state during actual scroll',statesAgree&&samples.every((sample,i)=>i===0||sample.metrics.progress>=samples[i-1].metrics.progress)&&samples.at(-1).metrics.progress-samples[0].metrics.progress>.25,samples);

      await at(page,'#uslugi');
      await page.waitForFunction(()=>{const root=document.querySelector('#proces'),b=root.querySelector('[data-process-canvas]').getBoundingClientRect();return (b.top>=innerHeight||b.bottom<=0)&&!root.spatialProcess.metrics().rafPending;});
      const processOffscreen=await holdProcess(page,350);
      await page.mouse.wheel(0,90);await page.waitForTimeout(120);await page.mouse.wheel(0,-40);await page.waitForTimeout(450);
      const processOffAfter=await processMetrics(page);
      check('Offscreen Process ignores additional real Services scroll',processOffscreen.before.frames===processOffscreen.after.frames&&processOffAfter.frames===processOffscreen.after.frames&&!processOffAfter.rafPending,{before:processOffscreen.before,after:processOffAfter});
      await at(page,'#proces .production-line',180);
      await page.waitForFunction(()=>document.querySelector('#proces').spatialProcess.metrics().rafPending);
      const processReturn=(await processMetrics(page)).frames;await page.waitForTimeout(350);
      check('Returning to Process resumes its energy packet',(await processMetrics(page)).frames>processReturn);

      await toggle.evaluate(e=>e.click());
      await page.waitForFunction(()=>!document.querySelector('#proces').spatialProcess.metrics().rafPending);
      const processPaused=await holdProcess(page),pausedAnimations=await runningProcessAnimations(page);
      check('Existing global pause stops Process canvas and chamber animations',processPaused.before.frames===processPaused.after.frames&&!processPaused.after.rafPending&&pausedAnimations.length===0,{...processPaused,runningAnimations:pausedAnimations});
      await toggle.evaluate(e=>e.click());
      await page.waitForFunction(()=>document.querySelector('#proces').spatialProcess.metrics().rafPending);
      const processResume=(await processMetrics(page)).frames;await page.waitForTimeout(350);
      check('Existing global motion control resumes Process',(await processMetrics(page)).frames>processResume);

      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>!document.querySelector('#proces').spatialProcess.metrics().rafPending);
      const processReduced=await holdProcess(page),reducedAnimations=await runningProcessAnimations(page);
      const reducedStages=await page.locator('#proces [data-production-stage]').evaluateAll(items=>items.map(e=>({state:e.dataset.productionState,title:e.querySelector('h3')?.textContent.trim()})));
      check('Reduced motion keeps all six Process stages static without RAF or CSS animation',processReduced.before.frames===processReduced.after.frames&&!processReduced.after.rafPending&&reducedAnimations.length===0&&reducedStages.length===6&&reducedStages.every(stage=>stage.state==='complete'&&stage.title),{...processReduced,stages:reducedStages,runningAnimations:reducedAnimations});
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForFunction(()=>document.querySelector('#proces').spatialProcess.metrics().rafPending);
      await page.locator('#proces').evaluate(e=>e.spatialProcess.dispose());
      const processDisposed=await processMetrics(page);
      await page.mouse.wheel(0,120);await page.setViewportSize({width:1010,height:900});await page.waitForTimeout(500);
      const processDisposedAfter=await processMetrics(page);
      check('Explicit Process dispose prevents RAF resurrection after scroll and resize',processDisposed.disposed&&!processDisposed.rafPending&&processDisposedAfter.disposed&&!processDisposedAfter.rafPending&&processDisposed.frames===processDisposedAfter.frames,{before:processDisposed,after:processDisposedAfter});

    }catch(error){check('Desktop lifecycle sequence completed',false,error.stack);}finally{await desktop.close();}

    const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const phone=await mobile.newPage();listen(phone,'mobile');
    try{
      await enter(phone);const m=await metrics(phone);
      const dimensions=await phone.locator('[data-service-canvas]').evaluate(e=>({width:e.clientWidth,height:e.clientHeight}));
      check('Mobile DPR3 uses compact rendering rather than a triple-sized buffer',m.dpr<=.7&&m.buffer.width<=Math.ceil(dimensions.width*.7)+1&&m.buffer.height<=Math.ceil(dimensions.height*.7)+1,{metrics:m,canvas:dimensions});
      check('Mobile Services fits the viewport',await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await linksRemain(phone,'Mobile keeps the original seven links and both service groups');
    }catch(error){check('Mobile lifecycle sequence completed',false,error.stack);}finally{await mobile.close();}

    const unavailable=await browser.newContext({viewport:{width:1200,height:1000}});
    const fallback=await unavailable.newPage();listen(fallback,'unavailable-webgl');
    try{
      await fallback.addInitScript(()=>{
        const native=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(kind,...args){
          return this.hasAttribute('data-service-canvas')&&kind==='webgl2'?null:Reflect.apply(native,this,[kind,...args]);
        };
      });
      await ready(fallback);await at(fallback,'#uslugi');
      await fallback.waitForFunction(()=>document.querySelector('#uslugi').dataset.serviceRenderer==='fallback');
      await linksRemain(fallback,'Unavailable WebGL2 preserves rendered Services copy and seven exact link targets');
      check('Unavailable WebGL2 leaves no scene RAF',(await metrics(fallback)).initialized===false,await metrics(fallback));
    }catch(error){check('Unavailable-WebGL sequence completed',false,error.stack);}finally{await unavailable.close();}
    check('No unhandled JavaScript or shader errors',report.errors.length===0,report.errors);
  }finally{
    await browser.close();
    save(path.join(output,'lifecycle.json'),report);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
