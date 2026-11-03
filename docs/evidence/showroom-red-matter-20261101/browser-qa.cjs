'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]||'layout',batch=process.argv[3]||'',out=path.join(__dirname,'final');fs.mkdirSync(out,{recursive:true});
const report={mode,checks:[],errors:[],screenshots:[]};
const save=()=>{report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,`qa-${mode}${batch ? "-"+batch : ""}.json`),JSON.stringify(report,null,2));};
const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});save();if(!ok)console.log('FAIL',name,details);};
const at=async(page,selector='.showroom-viewport',offset=80)=>{await page.locator(selector).evaluate((e,o)=>scrollTo({top:scrollY+e.getBoundingClientRect().top-o,behavior:'instant'}),offset);await page.waitForTimeout(250);};
const shot=async(page,name)=>{await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');save();};
let browser;
async function open(options={}){
 const page=await browser.newPage({viewport:{width:1440,height:1050},...options});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.addInitScript(()=>{const req=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();window.__frames={pending:0,total:0};window.requestAnimationFrame=fn=>{window.__frames.total++;const id=req(t=>{pending.delete(id);window.__frames.pending=pending.size;fn(t);});pending.add(id);window.__frames.pending=pending.size;return id;};window.cancelAnimationFrame=id=>{pending.delete(id);window.__frames.pending=pending.size;cancel(id);};});
 await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});await at(page);await page.waitForTimeout(600);return page;
}
const wake=async(page,mobile=false)=>{if(mobile)await page.locator('[data-capsule-toggle]').tap();else await page.locator('[data-capsule-toggle]').hover();await page.waitForTimeout(1400);};
(async()=>{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 if(mode==='layout')for(const [width,height] of [[1440,1050],[1920,1080],[1366,768],[390,844],[320,568],[700,900]].filter(([w])=>!batch||batch.split(",").includes(String(w)))){
  const mobile=width<=700,page=await open({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),tag=`${width}x${height}`;
  check(tag+' initial dormant state',await page.locator('[data-capsule-toggle]').getAttribute('aria-expanded')==='false'&&await page.locator('.showroom-card').evaluateAll(cs=>cs.every(c=>c.inert)));
  await shot(page,tag+'-idle');await wake(page,mobile);
  check(tag+' core reveals original collection',await page.locator('[data-capsule-toggle]').getAttribute('aria-expanded')==='true'&&await page.locator('.showroom-card').count()===14);
  check(tag+' page fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const outside=await page.locator('.showroom-card:not(.is-orbit-hidden) h3').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect(),p=e.closest('.project-slice').getBoundingClientRect();return r.left<p.left-1||r.right>p.right+1||r.bottom>p.bottom-2||r.top<p.top;}).map(e=>e.textContent));check(tag+' titles stay inside lenses',outside.length===0,outside);
  check(tag+' no hexagonal clipping',await page.locator('.showroom-card.is-active .project-slice').evaluate(e=>getComputedStyle(e).clipPath==='none'));
  await shot(page,tag+'-activated');
  if(mobile){
   check(tag+' core does not overlap active lens',await page.evaluate(()=>document.querySelector('[data-capsule-toggle]').getBoundingClientRect().bottom+20<document.querySelector('.showroom-card.is-active .project-slice').getBoundingClientRect().top));
   check(tag+' compact materials',await page.locator('#projekty').getAttribute('data-capsule-quality')==='compact'&&await page.locator('.showroom-card.is-active .project-slice').evaluate(e=>getComputedStyle(e).backdropFilter==='none'));
   await page.locator('.showroom-card.is-active [data-showroom-open]').tap();await page.waitForTimeout(800);check(tag+' tap opens actual content',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());await at(page,'.is-slice-expanded',85);await shot(page,tag+'-project-open');await page.locator('.is-slice-expanded [data-slice-close]').tap();await page.waitForTimeout(300);check(tag+' touch close restores awake collection',await page.locator('#projekty').evaluate(e=>e.classList.contains('is-awake')&&!e.classList.contains('is-slice-open')));
  }else if(width===1440){await page.locator('[data-showroom-open="progresskit-mail"]').hover();await page.waitForTimeout(500);await shot(page,'1440x1050-project-hover');check('hover relationship chooses one product',await page.locator('.showroom-card.is-related').count()===1&&await page.locator('#projekty').getAttribute('data-related-project')==='progresskit-mail');check('other lenses dim during relation',await page.locator('.showroom-card:not(.is-related):not(.is-orbit-hidden) .project-slice').first().evaluate(e=>Number(getComputedStyle(e).opacity)<.8));}
  await page.close();console.log(tag+' complete');
 }
 if(mode==='interaction'){
  const page=await open();await page.locator('[data-capsule-toggle]').focus();await page.keyboard.press('Tab');
  check('focus wakes capsule and Tab reaches active project',await page.locator('.showroom-card.is-active [data-showroom-open]').evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Enter');await page.waitForTimeout(850);check('Enter opens actual product',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());
  check('open panel pauses capsule',await page.locator('#projekty').getAttribute('data-capsule-motion')==='paused');await page.keyboard.press('Escape');await page.waitForTimeout(150);check('first Escape closes only the product',await page.locator('#projekty').evaluate(e=>e.classList.contains('is-awake')&&!e.classList.contains('is-slice-open')));await page.keyboard.press('Escape');await page.waitForTimeout(150);check('second Escape sleeps and restores core focus',await page.locator('[data-capsule-toggle]').evaluate(e=>e===document.activeElement&&e.getAttribute('aria-expanded')==='false'));
  await at(page);await page.mouse.move(300,500);await page.waitForTimeout(1100);const left=await page.locator('#projekty').evaluate(e=>({x:+e.style.getPropertyValue('--core-x'),light:parseFloat(e.style.getPropertyValue('--core-light-x'))}));const shadowL=await page.locator('.capsule-shadow').evaluate(e=>getComputedStyle(e).transform);await page.mouse.move(1250,500);await page.waitForTimeout(1100);const right=await page.locator('#projekty').evaluate(e=>({x:+e.style.getPropertyValue('--core-x'),light:parseFloat(e.style.getPropertyValue('--core-light-x'))}));const shadowR=await page.locator('.capsule-shadow').evaluate(e=>getComputedStyle(e).transform);check('cursor changes light and shadow direction',left.x<right.x&&left.light<right.light&&shadowL!==shadowR,{left,right,shadowL,shadowR});
  const a=await page.evaluate(()=>window.__frames);await page.waitForTimeout(500);const b=await page.evaluate(()=>window.__frames);check('RAF settles instead of running permanently',a.pending===0&&b.pending===0&&a.total===b.total,{a,b});
  await wake(page);await page.locator('[data-showroom-motion-toggle]').click();check('global pause stops capsule',await page.locator('#projekty').getAttribute('data-capsule-motion')==='paused');await page.locator('[data-showroom-motion-toggle]').click();await at(page);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(350);check('offscreen capsule pauses',await page.locator('#projekty').getAttribute('data-capsule-motion')==='paused');await at(page);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.interfaceMotion==='paused');check('reduced motion disables layer animation',await page.locator('.capsule-float').evaluate(e=>getComputedStyle(e).animationName==='none'));await page.locator('[data-capsule-toggle]').click();check('reduced motion retains activation',await page.locator('[data-capsule-toggle]').getAttribute('aria-expanded')==='true');
  await page.emulateMedia({forcedColors:'active'});await shot(page,'forced-colors');check('forced colors keeps readable core control',await page.locator('.capsule-caption').evaluate(e=>getComputedStyle(e).opacity==='1')&&await page.locator('[data-capsule-toggle]').isVisible());
  await page.emulateMedia({forcedColors:'none',media:'print'});check('print exposes all project names',await page.locator('.showroom-card').evaluateAll(es=>es.every(e=>{const s=getComputedStyle(e);return s.display!=='none'&&s.visibility==='visible'&&s.opacity==='1';})));await page.close();
  const fallback=await open({javaScriptEnabled:false,viewport:{width:390,height:844}});check('no JS preserves real project links',await fallback.locator('[data-showroom-open]').count()===14&&await fallback.locator('.showroom-card').first().isVisible());check('no JS does not expose inert core control',!(await fallback.locator('[data-capsule-toggle]').isVisible()));await fallback.close();
  const deep=await browser.newPage();await deep.goto('http://127.0.0.1:8191/?projekt=progresskit-mail#projekty');await deep.waitForSelector('.is-slice-expanded .project-slice__panel',{state:'visible'});check('direct product URL bypasses dormancy',await deep.locator('#projekty').evaluate(e=>e.classList.contains('is-awake')));await deep.close();
 }
 check('no browser or CSP errors',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('script completed',false,e.message);}finally{await browser.close();save();console.log(JSON.stringify({mode,PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL||report.errors.length)process.exitCode=1;}})();
