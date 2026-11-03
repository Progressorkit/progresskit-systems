'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'final'),report={checks:[],errors:[]};
const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok)console.log('FAIL',name,details);};
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const open=async(options={})=>{
  const page=await browser.newPage({viewport:{width:1440,height:1050},...options});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.addInitScript(()=>{
   window.__proof={corona:0,plasma:0,audio:[]};
   const clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.classList.contains('capsule-corona'))window.__proof.corona++;if(this.canvas.classList.contains('capsule-plasma'))window.__proof.plasma++;return clear.apply(this,args);};
   const Native=window.AudioContext;
   window.AudioContext=class extends Native{constructor(){super();this.proofGains=[];window.__proof.audio.push(this);}createGain(){const gain=super.createGain();this.proofGains.push(gain);return gain;}};
  });
  await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));await page.waitForTimeout(650);return page;
 };
 const counts=page=>page.evaluate(()=>({corona:window.__proof.corona,plasma:window.__proof.plasma}));
 const sound=page=>page.evaluate(()=>{const ctx=window.__proof.audio[0];return {contexts:window.__proof.audio.length,state:ctx?.state,level:ctx?.proofGains[0].gain.value};});
 try{
  const page=await open(),toggle=page.locator('[data-capsule-audio]');
  check('No audio engine or autoplay on load',(await sound(page)).contexts===0&&await toggle.getAttribute('aria-pressed')==='false');
  await page.locator('[data-capsule-toggle]').hover();await page.waitForTimeout(1600);
  check('Core activation never opts into audio',(await sound(page)).contexts===0);
  await page.locator('[data-showroom-open="progresskit-mail"]').hover();await page.waitForTimeout(400);
  check('Project hover never opts into audio',(await sound(page)).contexts===0);
  await toggle.click();await page.waitForTimeout(800);const base=await sound(page);
  check('Explicit hum button starts one audio context',base.contexts===1&&base.state==='running'&&base.level>0&&base.level<.04,base);
  const rms=await page.evaluate(async()=>{
   const ctx=window.__proof.audio[0],master=ctx.proofGains[0],analyser=ctx.createAnalyser(),silent=ctx.createGain();
   silent.gain.value=0;master.connect(analyser);analyser.connect(silent);silent.connect(ctx.destination);
   await new Promise(r=>setTimeout(r,300));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);
   master.disconnect(analyser);analyser.disconnect();silent.disconnect();return Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);
 });check('Hum produces a quiet measurable audio signal',rms>.0001&&rms<.03,{rms});
  await page.locator('[data-showroom-open="progresskit-mail"]').hover();await page.waitForTimeout(650);const stronger=await sound(page);
  check('Related project gently raises hum intensity',stronger.level>base.level&&stronger.level<.05,{base,stronger});
  await page.screenshot({path:path.join(out,'matter-hover-hum-enabled.png')});
  await toggle.click();await page.waitForTimeout(800);let muted=await sound(page);
  check('One click fades and suspends hum',muted.state==='suspended'&&muted.level<.003&&await toggle.getAttribute('aria-pressed')==='false',muted);
  await toggle.click();await page.waitForTimeout(500);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(900);
  check('Leaving showroom suspends opted-in sound',(await sound(page)).state==='suspended');
  await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));await page.waitForTimeout(650);
  check('Returning resumes only previously opted-in sound',(await sound(page)).state==='running');
  await page.locator('[data-showroom-motion-toggle]').click();await page.waitForTimeout(800);
  check('Global effect pause suspends hum',(await sound(page)).state==='suspended');
  await page.locator('[data-showroom-motion-toggle]').click();await page.waitForTimeout(500);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(850);
  check('Reduced motion disables and deselects optional audio',(await sound(page)).state==='suspended'&&await toggle.isDisabled()&&await toggle.getAttribute('aria-pressed')==='false');
  await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));await page.screenshot({path:path.join(out,'matter-audio-reduced.png')});
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(600);check('Removing reduced motion does not restart audio',(await sound(page)).state==='suspended'&&await toggle.getAttribute('aria-pressed')==='false');
  await toggle.click();await toggle.click();await page.waitForTimeout(700);check('Rapid audio toggles reuse one engine and finish muted',(await sound(page)).contexts===1&&(await sound(page)).state==='suspended');
  await page.close();
  const mobile=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  check('Mobile audio control stays inside viewport',await mobile.locator('[data-capsule-audio]').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=64&&r.bottom<=innerHeight;}));
  await mobile.locator('[data-capsule-audio]').tap();await mobile.waitForTimeout(700);check('Mobile hum requires and accepts explicit tap',(await sound(mobile)).state==='running');
  await mobile.locator('[data-capsule-toggle]').tap();await mobile.waitForTimeout(1000);await mobile.locator('.showroom-card.is-active [data-showroom-open]').tap();await mobile.waitForTimeout(950);check('Opening a product suspends ambient audio',(await sound(mobile)).state==='suspended');await mobile.close();
  const unavailable=await browser.newPage();await unavailable.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});await unavailable.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});check('Unsupported Web Audio hides the optional control',!(await unavailable.locator('[data-capsule-audio]').isVisible()));await unavailable.locator('[data-capsule-toggle]').click();await unavailable.waitForTimeout(1400);check('Unsupported audio keeps visual disclosure working',await unavailable.locator('.showroom-card.is-active').evaluate(c=>c.classList.contains('is-energized')));await unavailable.close();
  check('No browser or CSP errors',report.errors.length===0,report.errors);
 }catch(e){report.errors.push(e.stack);check('QA completed',false,e.message);}
 finally{await browser.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,'qa-audio.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL)process.exitCode=1;}
})();
