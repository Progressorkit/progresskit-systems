'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]||'layout',out=path.join(__dirname,'final');fs.mkdirSync(out,{recursive:true});
const report={mode,checks:[],errors:[],externalRequests:[],screenshots:[]};
const save=()=>{report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,`qa-${mode}.json`),JSON.stringify(report,null,2));};
const check=(name,ok,evidence)=>{report.checks.push({name,status:ok?'PASS':'FAIL',evidence});save();if(!ok)console.log('FAIL',name,JSON.stringify(evidence));};
const url='http://127.0.0.1:8194/proof-of-direction/';
let browser;
async function pageFor(options={}){
 const page=await browser.newPage({viewport:{width:1440,height:900},...options});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8194/'))report.externalRequests.push(r.url());});
 await page.addInitScript(()=>{const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();window.__frames={requested:0,pending:0};window.requestAnimationFrame=cb=>{window.__frames.requested++;const id=request(t=>{pending.delete(id);window.__frames.pending=pending.size;cb(t);});pending.add(id);window.__frames.pending=pending.size;return id;};window.cancelAnimationFrame=id=>{pending.delete(id);window.__frames.pending=pending.size;cancel(id);};const add=EventTarget.prototype.addEventListener;window.__pointers=0;EventTarget.prototype.addEventListener=function(type,...args){if(type==='pointermove')window.__pointers++;return add.call(this,type,...args);};});
 await page.goto(url,{waitUntil:'networkidle'});return page;
}
async function at(page,selector,offset=92){await page.locator(selector).evaluate((el,o)=>scrollTo({top:scrollY+el.getBoundingClientRect().top-o,behavior:'instant'}),offset);await page.waitForTimeout(180);}
async function shot(page,name,selector){const target=selector?page.locator(selector):page;await target.screenshot({path:path.join(out,name)});report.screenshots.push(name);save();}
async function settled(page,state){await page.waitForFunction(s=>document.querySelector('[data-device]').dataset.state===s,state);await page.waitForTimeout(150);}
async function bounds(page){return page.evaluate(()=>{const nodes=[...document.querySelectorAll('h1,h2,.motto,.product-summary,.module-details>p,.roadmap,.terminal-copy,a,button')];return nodes.filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&!e.closest('[hidden]')&&!e.matches('.skip')&&(r.left< -1||r.right>innerWidth+1);}).map(e=>({tag:e.tagName,text:e.textContent.trim().slice(0,60),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));});}
(async()=>{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 if(mode==='layout')for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[320,568],[390,844]]){
  const mobile=width<701,page=await pageFor({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const prefix=`${width}x${height}`;
  const screen=await page.locator('.product-screen').evaluate(el=>({ready:el.complete&&el.naturalWidth>0,src:el.getAttribute('src')}));check(prefix+' genuine screenshot loaded',screen.ready&&screen.src.includes('product-measurement.webp'),screen);
  await shot(page,prefix+'-hero.png');check(prefix+' closed content within viewport',(await bounds(page)).length===0,await bounds(page));
  await at(page,'#module');await shot(page,prefix+'-module-closed.png');
  const before=await page.locator('[data-device]').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  if(mobile)await page.locator('[data-ignition]').tap();else await page.locator('[data-ignition]').click();await settled(page,'open');
  const after=await page.locator('[data-device]').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  check(prefix+' activation keeps device mounted',Math.abs(after-before)<2,{before,after});
  check(prefix+' real product content revealed',await page.locator('#module-details').isVisible()&&await page.locator('[data-ignition]').getAttribute('aria-expanded')==='true');
  check(prefix+' open content within viewport',(await bounds(page)).length===0,await bounds(page));
  await at(page,'#module');await shot(page,prefix+'-module-open.png');
  if(width===1440||width===390){await shot(page,prefix+'-device-open.png','[data-device]');await shot(page,prefix+'-whole-module.png','#module');}
  await at(page,'#connection');await shot(page,prefix+'-connection.png');
  check(prefix+' roadmap remains explicit',(await page.locator('.roadmap').textContent()).includes('nie potwierdzeniem działających integracji')&&await page.locator('.terminal').count()===2);
  if(mobile){await page.setViewportSize({width:height,height:width});await page.waitForTimeout(250);check(prefix+' orientation content fits',(await bounds(page)).length===0,await bounds(page));}
  await page.close();console.log(prefix+' complete');
 }
 if(mode==='motion'){
  const page=await pageFor();check('one pointer listener',await page.evaluate(()=>window.__pointers===1));
  check('desktop uses full material response',await page.evaluate(()=>document.documentElement.dataset.quality==='full'));
  await page.mouse.move(120,400);await page.waitForTimeout(750);
  const left=await page.locator('#arrival').evaluate(e=>({light:parseFloat(e.style.getPropertyValue('--lx')),shadow:parseFloat(e.style.getPropertyValue('--shadow-x')),rotation:parseFloat(e.style.getPropertyValue('--tension'))}));await shot(page,'light-left.png');
  await page.mouse.move(1310,400);await page.waitForTimeout(750);
  const right=await page.locator('#arrival').evaluate(e=>({light:parseFloat(e.style.getPropertyValue('--lx')),shadow:parseFloat(e.style.getPropertyValue('--shadow-x')),rotation:parseFloat(e.style.getPropertyValue('--tension'))}));await shot(page,'light-right.png');
  check('light follows pointer and shadow opposes it',left.light<right.light&&left.shadow>right.shadow,{left,right});check('mechanical tension stays below quarter degree',Math.max(Math.abs(left.rotation),Math.abs(right.rotation))<=.24,{left,right});
  const a=await page.evaluate(()=>window.__frames);await page.waitForTimeout(600);const b=await page.evaluate(()=>window.__frames);check('render loop stops after material settles',a.pending===0&&b.pending===0&&a.requested===b.requested,{a,b});
  check('only visible scene lives',await page.locator('[data-live="true"]').count()===1&&await page.locator('#arrival').getAttribute('data-live')==='true');
  await at(page,'#module');check('life follows visible module',await page.locator('#module').getAttribute('data-live')==='true'&&await page.locator('#arrival').getAttribute('data-live')==='false');
  const offscreen=await page.locator('#arrival .idle').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationPlayState==='paused'));check('offscreen idle is paused',offscreen);
  await page.locator('[data-ignition]').click();await page.waitForTimeout(420);await shot(page,'device-half-open.png','[data-device]');await settled(page,'open');
  const doors=await page.locator('.door').evaluateAll(es=>es.map(e=>({x:new DOMMatrix(getComputedStyle(e).transform).m41,w:e.getBoundingClientRect().width})));check('physical shutters retract beyond screen',doors.length===2&&doors[0].x<-doors[0].w&&doors[1].x>doors[1].w,doors);
  await at(page,'#connection');check('activation travels into connection',await page.locator('#connection').getAttribute('data-charge')==='true');await page.waitForTimeout(1750);check('connection energy is one shot',await page.locator('#connection').getAttribute('data-charge')===null);
  await page.locator('[data-pause]').click();check('pause stops all ambient motion',await page.evaluate(()=>document.documentElement.dataset.motion==='paused'&&document.querySelectorAll('[data-live="true"]').length===0&&[...document.querySelectorAll('.idle')].every(e=>getComputedStyle(e).animationPlayState==='paused')));
  await page.mouse.move(1200,350);await page.waitForTimeout(100);check('paused light remains neutral',await page.locator('.scene').evaluateAll(es=>es.every(e=>!e.style.getPropertyValue('--lx'))));
  await page.locator('[data-pause]').click();check('resume restores just one visible scene',await page.locator('[data-live="true"]').count()===1);
  await at(page,'[data-ignition]',450);await page.locator('[data-ignition]').click();await page.locator('[data-pause]').click();check('pause settles closing mechanism',await page.locator('[data-device]').getAttribute('data-state')==='closed'&&!(await page.locator('#module-details').isVisible()));
  await page.locator('[data-pause]').click();await page.locator('[data-ignition]').click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='paused',null,{timeout:1000});check('reduce during opening settles mechanism',await page.locator('[data-device]').getAttribute('data-state')==='open');
  check('OS reduced motion cannot be overridden',await page.locator('[data-pause]').isDisabled()&&await page.evaluate(()=>document.documentElement.dataset.motion==='paused'));
  await page.locator('[data-ignition]').click();check('reduced close is immediate',await page.locator('[data-device]').getAttribute('data-state')==='closed');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='running',null,{timeout:1000});await page.locator('[data-ignition]').click({clickCount:3,delay:90});await settled(page,'open');check('rapid activation preserves final state',await page.locator('[data-ignition]').getAttribute('aria-expanded')==='true'&&await page.locator('#module-details').isVisible());
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));check('pagehide stops motion and frames',await page.evaluate(()=>document.documentElement.dataset.motion==='paused'&&window.__frames.pending===0));await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow')));check('pageshow restores one active scene',await page.locator('[data-live="true"]').count()===1);
  await page.close();
  const phone=await pageFor({viewport:{width:390,height:844},isMobile:true,hasTouch:true});check('mobile selects compact effects',await phone.evaluate(()=>document.documentElement.dataset.quality==='compact'));await phone.mouse.move(300,300);await phone.waitForTimeout(800);check('mobile has no pointer lighting loop',await phone.evaluate(()=>window.__frames.pending===0&&![...document.querySelectorAll('.scene')].some(e=>e.style.getPropertyValue('--lx'))));await phone.close();
 }
 if(mode==='accessibility'){
  const page=await pageFor();await page.keyboard.press('Tab');check('skip link receives first keyboard focus',await page.locator('.skip').evaluate(e=>e===document.activeElement));await page.keyboard.press('Enter');await page.waitForTimeout(450);check('skip link moves to project',await page.evaluate(()=>location.hash==='#module'));
  await page.locator('[data-ignition]').focus();await page.keyboard.press('Enter');await settled(page,'open');check('keyboard activation focuses real product link',await page.locator('.product-actions a').first().evaluate(e=>e===document.activeElement));await page.keyboard.press('Tab');check('next keyboard target is download',await page.locator('.product-actions a').nth(1).evaluate(e=>e===document.activeElement));await page.keyboard.press('Escape');await settled(page,'closed');check('Escape closes and restores ignition focus',await page.locator('[data-ignition]').evaluate(e=>e===document.activeElement)&&!(await page.locator('#module-details').isVisible()));
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.locator('[data-ignition]').click();await settled(page,'open');await at(page,'#module');await shot(page,'forced-colors.png');check('forced colors retains product controls',await page.locator('[data-ignition]').isVisible()&&await page.locator('.product-actions a').first().isVisible());
  await page.emulateMedia({forcedColors:'none',media:'print'});check('print shows image and details',await page.locator('.product-screen').isVisible()&&await page.locator('#module-details').isVisible()&&!(await page.locator('.device-doors').isVisible()));await page.close();
  const nojs=await pageFor({javaScriptEnabled:false});check('no JS keeps genuine screen and product links',await nojs.locator('.product-screen').isVisible()&&await nojs.locator('#module-details').isVisible()&&await nojs.locator('.product-actions a').count()===2);check('no JS has no inert controls or doors',!(await nojs.locator('[data-ignition]').isVisible())&&!(await nojs.locator('[data-pause]').isVisible())&&!(await nojs.locator('.device-doors').isVisible()));await at(nojs,'#module');await shot(nojs,'no-javascript.png');await nojs.close();
  const reduced=await pageFor({reducedMotion:'reduce'});check('reduced motion starts paused',await reduced.evaluate(()=>document.documentElement.dataset.motion==='paused')&&await reduced.locator('[data-pause]').isDisabled());await reduced.locator('[data-ignition]').click();check('reduced motion still opens product',await reduced.locator('[data-device]').getAttribute('data-state')==='open'&&await reduced.locator('#module-details').isVisible());await reduced.close();
 }
 check('no browser or CSP errors',report.errors.length===0,report.errors);check('no external requests',report.externalRequests.length===0,report.externalRequests);
}catch(error){report.errors.push(error.stack);check('script completed',false,error.message);}finally{await browser.close();save();console.log(JSON.stringify({mode,PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL||report.errors.length)process.exitCode=1;}})();
