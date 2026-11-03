'use strict';
const path=require('node:path');
const {fs,launch,ready,at,snapshot,active,serviceChecks,save}=require('./common.cjs');
const out=process.env.PK_PHASE_A_OUT||'/tmp/progresskit-services-phase-a-20261102';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const report={phase:'A — Services only',checks:[],artifacts:[],errors:[],crops:[]},browser=await launch();
 const check=(name,pass,details)=>report.checks.push({name,status:pass?'PASS':'FAIL',details});
 try {
  const desktop=await browser.newPage({viewport:{width:1440,height:1100}});desktop.on('pageerror',e=>report.errors.push(e.message));
  await ready(desktop);await at(desktop,'#uslugi');await desktop.waitForTimeout(1600);
  let file=path.join(out,'services-idle.png');report.crops.push(await snapshot(desktop,'#uslugi',file));report.artifacts.push(file);
  await desktop.locator('#uslugi .service-zone').first().hover();await desktop.waitForTimeout(650);let state=await active(desktop);check('Services hover activates the first physical object',state.active,state);
  file=path.join(out,'services-hover.png');await desktop.screenshot({path:file,clip:report.crops[0].clip});report.artifacts.push(file);
  await serviceChecks(desktop,report);
  await desktop.emulateMedia({reducedMotion:'reduce'});await desktop.waitForTimeout(400);
  const animations=await desktop.locator('#uslugi').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').map(a=>a.animationName||'WebAnimation'));
  check('Reduced motion stops running Services CSS animations',animations.length===0,animations);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>report.errors.push(e.message));await ready(mobile);await at(mobile,'#uslugi');await mobile.waitForTimeout(900);
  file=path.join(out,'mobile-services.png');report.crops.push(await snapshot(mobile,'#uslugi',file,{mobile:true}));report.artifacts.push(file);
  await serviceChecks(mobile,report);await mobile.locator('#uslugi .service-zone').first().tap();await mobile.waitForTimeout(350);state=await active(mobile);report.mobileTapState=state;
  check('No uncaught browser errors',report.errors.length===0,report.errors);
 } catch(error) { check('Phase A completed',false,error.stack); } finally {await browser.close();save(path.join(out,'phase-a.json'),report);}
})();
