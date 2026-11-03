'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'final'),report={checks:[],errors:[]};
const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok)console.log('FAIL',name,details);};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.addInitScript(()=>{
  window.__plasma={draws:0,lines:0,states:[],drawTimes:[]};
  for(const [method,metric] of [['clearRect','draws'],['lineTo','lines']]){
   const original=CanvasRenderingContext2D.prototype[method];
   CanvasRenderingContext2D.prototype[method]=function(...args){if(this.canvas.classList.contains('capsule-plasma')){window.__plasma[metric]++;if(metric==='draws')window.__plasma.drawTimes.push(performance.now());}return original.apply(this,args);};
  }
 });
 try{
  await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});
  await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));
  await page.waitForTimeout(700);
  const cdp=await page.context().newCDPSession(page);
  const snap=async name=>{const r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};
  const metrics=()=>page.evaluate(()=>({draws:window.__plasma.draws,lines:window.__plasma.lines}));
  const pixels=()=>page.locator('.capsule-plasma').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n;});
  let a=await metrics();await page.waitForTimeout(400);let b=await metrics();check('Dormant canvas does no rendering',a.draws===b.draws,{a,b});
  check('No SVG or dash connector remains',await page.locator('.capsule-space svg').count()===0);
  await page.evaluate(()=>{
   const states=new Map();window.__plasma.started=performance.now();
   new MutationObserver(records=>records.forEach(({target:c})=>{const state=c.dataset.plasmaState;if(state&&states.get(c)!==state){states.set(c,state);window.__plasma.states.push({id:c.dataset.projectId,state,t:performance.now()-window.__plasma.started,visible:c.classList.contains('is-energized')});}})).observe(document.querySelector('.showroom-track'),{subtree:true,attributes:true,attributeFilter:['data-plasma-state']});
  });
  await page.locator('[data-capsule-toggle]').hover();await page.waitForTimeout(110);await snap('1440x1050-plasma-arrival');
  await page.waitForTimeout(1400);
  const states=await page.evaluate(()=>window.__plasma.states);report.activationTimeline=states;
  const ids=[...new Set(states.map(s=>s.id))];
  check('Six lenses receive staged power',ids.length===6,ids);
  check('For every lens: discharge then impact then materialization',ids.every(id=>{
   const s=states.filter(x=>x.id===id),charge=s.find(x=>x.state==='charging'),impact=s.find(x=>x.state==='impact'),material=s.find(x=>x.state==='materializing');
   return charge&&!charge.visible&&impact&&!impact.visible&&material&&material.visible&&charge.t<impact.t&&impact.t<material.t;
  }),states);
  check('All visible content is revealed after delivery',await page.locator('.showroom-card:not(.is-orbit-hidden)').evaluateAll(cs=>cs.every(c=>c.classList.contains('is-energized'))));
  check('Canvas fully clears after initial delivery',await pixels()===0);
  a=await metrics();await page.waitForTimeout(500);b=await metrics();check('Awake idle has no canvas redraw loop',a.draws===b.draws,{a,b});
  const hoverStart=await page.evaluate(()=>performance.now());
  await page.locator('[data-showroom-open="progresskit-mail"]').hover();await page.waitForTimeout(50);
  const hoverPixels=await pixels(),hoverMetrics=await metrics();
  check('Hover renders a fine branched discharge',hoverPixels>0&&hoverMetrics.lines>a.lines+20,{hoverPixels,hoverMetrics});
  await snap('1440x1050-project-hover-plasma');
  check('Hover isolates one project and preserves its content',await page.locator('.showroom-card.is-related.is-energized').count()===1&&await page.locator('.capsule-plasma').getAttribute('data-project-id')==='progresskit-mail');
  await page.waitForTimeout(450);check('Hover discharge clears between re-strikes',await pixels()===0);
  a=await metrics();
  await page.waitForTimeout(3700);b=await metrics();check('Sustained hover re-strikes without a permanent connector',b.draws>a.draws,{a,b});
  const hoverDraws=await page.evaluate(start=>window.__plasma.drawTimes.filter(t=>t>=start),hoverStart);
  const quietGaps=hoverDraws.slice(1).map((t,i)=>t-hoverDraws[i]);
  check('Sustained hover includes long intervals with no rendering',Math.max(...quietGaps)>1800,{draws:hoverDraws.length,longestQuietMs:Math.max(...quietGaps)});
  await page.mouse.move(50,500);await page.waitForTimeout(500);a=await metrics();await page.waitForTimeout(4500);b=await metrics();check('Leaving the project cancels further re-strikes',a.draws===b.draws,{a,b});
  // Explicit opening remains owned by the existing controller and is delayed only for power arrival.
  await page.locator('[data-showroom-open="vaeloria"]').focus();await page.keyboard.press('Enter');
  check('Explicit activation waits for energy before disclosure',await page.locator('.is-slice-expanded').count()===0);
  await page.waitForTimeout(100);await page.keyboard.press('Escape');await page.waitForTimeout(400);check('Escape cancels charging without opening content',await page.locator('.is-slice-expanded').count()===0);
  await page.keyboard.press('Enter');await page.waitForTimeout(900);check('Later activation opens original content',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());
  a=await metrics();await page.waitForTimeout(500);b=await metrics();check('Expanded content stops plasma rendering',a.draws===b.draws);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-capsule-toggle]').click();await page.waitForTimeout(250);
  check('Reduced motion reveals lenses immediately',await page.locator('.showroom-card:not(.is-orbit-hidden)').evaluateAll(cs=>cs.every(c=>c.classList.contains('is-energized'))));
  check('Reduced motion retains a static luminous impulse',await pixels()>0);await snap('1440x1050-reduced-static-impulse');
  a=await metrics();await page.waitForTimeout(800);b=await metrics();check('Reduced impulse does not flicker or redraw',a.draws===b.draws,{a,b});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(400);check('Offscreen canvas clears even in reduced motion',await pixels()===0);
  a=await metrics();await page.waitForTimeout(500);b=await metrics();check('Offscreen canvas remains stopped',a.draws===b.draws);
  const fallback=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){return this.classList.contains('capsule-plasma')?null:get.apply(this,args);};});
  await fallback.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});await fallback.locator('[data-capsule-toggle]').tap();
  check('Unavailable canvas cannot block project disclosure',await fallback.locator('.showroom-card.is-active').evaluate(c=>c.classList.contains('is-energized')));
  await fallback.locator('.showroom-card.is-active [data-showroom-open]').tap();await fallback.waitForTimeout(700);check('Unavailable canvas retains tap opening',await fallback.locator('.is-slice-expanded .project-slice__panel').isVisible());await fallback.close();
  check('No browser or CSP errors',report.errors.length===0,report.errors);
 }catch(e){report.errors.push(e.stack);check('QA completed',false,e.message);}
 finally{await browser.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,'qa-plasma.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL)process.exitCode=1;}
})();
