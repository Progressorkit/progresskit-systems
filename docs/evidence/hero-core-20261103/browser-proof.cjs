'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname,base='http://127.0.0.1:8203/';
const report={date:'2026-11-03',browser:'local Chrome',mobile:'viewport and touch emulation; physical device NOT_RUN',checks:[],errors:[],missing:[],external:[],screenshots:[],videos:[]};
const check=(name,fn)=>Promise.resolve().then(fn).then(detail=>{report.checks.push({name,status:'PASS',detail});console.log('PASS',name);}).catch(e=>{report.checks.push({name,status:'FAIL',error:e.message});console.log('FAIL',name,e.message);});
const shot=async(page,name,opts={})=>{await page.screenshot({path:path.join(out,name),...opts});report.screenshots.push(name);};
const ready=page=>page.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');
const formed=page=>page.waitForFunction(()=>document.querySelector('#projekty').showroom3D.metrics().phases.some(x=>x.phase==='ready'));
const state=page=>page.evaluate(()=>({entry:document.querySelector('#start').dataset.entryState,awake:document.querySelector('[data-capsule-toggle]').getAttribute('aria-expanded'),flight:document.querySelectorAll('.hero-core-flight').length,width:document.documentElement.scrollWidth,renderer:document.querySelector('#projekty').dataset.renderer,metrics:document.querySelector('#projekty').showroom3D?.metrics()}));
async function context(browser,width,extra={}) {
 const height=width===1440?900:844;
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,...extra});
 await ctx.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){report.external.push(route.request().url());return route.abort();}return route.continue();});
 const page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))report.missing.push({url:r.url(),status:r.status()});});
 return{ctx,page};
}
async function capture(browser,width) {
 const name=width===1440?'desktop':'mobile';
 const {ctx,page}=await context(browser,width,{recordVideo:{dir:path.join(out,'raw-video'),size:{width,height:width===1440?900:844}}});
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);await ready(page);await page.waitForTimeout(700);
 await check(`${name}: hero dominates and showroom dormant`,async()=>{
  const result=await page.evaluate(()=>{const h=document.querySelector('[data-hero-enter]'),b=h.getBoundingClientRect(),i=h.querySelector('img');return{width:b.width,centerY:b.y+b.height/2,viewport:innerHeight,animation:getComputedStyle(i).animationName,playState:getComputedStyle(i).animationPlayState,awake:document.querySelector('[data-capsule-toggle]').getAttribute('aria-expanded'),overflow:document.documentElement.scrollWidth>innerWidth,relief:getComputedStyle(document.querySelector('.stone-line')).textShadow};});
  assert(result.width>width*.25&&result.centerY>result.viewport*.45);assert.equal(result.awake,'false');assert.equal(result.playState,'running');assert(!result.overflow);assert.notEqual(result.relief,'none');return result;
 });
 await shot(page,width===1440?'01-hero-start.png':'06-mobile-hero.png');
 const before=await page.locator('[data-hero-enter] img').evaluate(e=>({transform:getComputedStyle(e).transform,filter:getComputedStyle(e).filter}));
 await page.waitForTimeout(1600);
 await check(`${name}: real logo pulse changes scale and light`,async()=>{const after=await page.locator('[data-hero-enter] img').evaluate(e=>({transform:getComputedStyle(e).transform,filter:getComputedStyle(e).filter}));assert.notDeepEqual(before,after);return{before,after};});
 if(width===1440)await shot(page,'02-hero-pulse.png');
 await page.waitForTimeout(2000);
 if(width===1440)await page.locator('[data-hero-enter]').click();else await page.locator('[data-hero-enter]').tap();
 await page.waitForTimeout(750);
 await check(`${name}: continuous flight before activation`,async()=>{const s=await state(page);assert.equal(s.entry,'entering');assert.equal(s.flight,1);assert.equal(s.awake,'false');const box=await page.locator('.hero-core-flight').boundingBox();assert(box.y>=0&&box.y+box.height<=(width===1440?900:844),'Flying emblem must stay inside viewport');return{...s,box};});
 if(width===1440)await shot(page,'03-transition.png');
 await page.waitForFunction(()=>document.querySelector('#start').dataset.entryState==='showroom');await formed(page);await page.waitForTimeout(1400);
 await check(`${name}: activation, materialization and cleanup`,async()=>{const s=await state(page);assert.equal(s.awake,'true');assert.equal(s.flight,0);assert.equal(s.width,width);assert(s.metrics.phases.every(p=>p.phase==='ready'));return s;});
 if(width===1440){await shot(page,'04-showroom.png');const box=await page.locator('.showroom-card.is-active').first().boundingBox();await shot(page,'05-crystal-detail.png',{clip:{x:Math.max(0,box.x-65),y:Math.max(80,box.y-65),width:300,height:270}});}
 await page.waitForTimeout(2500);
 await check(`${name}: native project disclosure and close`,async()=>{
  const card=page.locator('.showroom-card.is-active').first(),id=await card.getAttribute('data-project-id');
  await card.locator('[data-showroom-open]').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#projekty').classList.contains('is-slice-open'));
  assert.equal(new URL(page.url()).searchParams.get('projekt'),id);
  await page.waitForTimeout(1400);await card.locator('[data-slice-close]').click();
  await page.waitForFunction(()=>!document.querySelector('#projekty').classList.contains('is-slice-open'));
  assert.equal(new URL(page.url()).searchParams.has('projekt'),false);return{id};
 });
 await page.waitForTimeout(700);
 const video=page.video();await ctx.close();await video.saveAs(path.join(out,`${name}.webm`));report.videos.push(`${name}.webm`);
}
async function regressions(browser){
 for(const width of [320,768,1920]){const{ctx,page}=await context(browser,width);await page.goto(base);await ready(page);
  await check(`layout ${width}: no overflow, visible logo and native navigation`,async()=>{const s=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,logo:document.querySelector('[data-hero-enter]').getBoundingClientRect().toJSON(),links:[...document.querySelectorAll('.topbar a')].map(a=>[a.textContent.trim(),a.getAttribute('href')])}));assert.equal(s.width,s.viewport);assert(s.logo.left>=0&&s.logo.right<=width);return s;});await ctx.close();}
 for(const mode of ['reduce','paused','forced']){const{ctx,page}=await context(browser,390,mode==='reduce'?{reducedMotion:'reduce'}:mode==='forced'?{forcedColors:'active'}:{});await page.goto(base);await ready(page);
  await check(`${mode}: accessible keyboard entry and visible projects`,async()=>{if(mode==='paused')await page.locator('[data-hero-motion-toggle]').click();await page.locator('[data-hero-enter]').focus();await page.keyboard.press('Enter');if(mode==='forced')await page.waitForTimeout(2200);else await formed(page);const s=await state(page);assert.equal(s.awake,'true');assert.equal(s.flight,0);if(mode!=='forced')assert(s.metrics.phases.every(p=>p.phase==='ready'));return s;});await ctx.close();}
 {const{ctx,page}=await context(browser,390);await ctx.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});await page.goto(base);
 await check('controlled WebGL unavailable: usable native project fallback',async()=>{await page.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='fallback');await page.locator('[data-hero-enter]').tap();assert.equal((await state(page)).flight,0);const card=page.locator('.showroom-card.is-active [data-showroom-open]').first();await card.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#projekty').classList.contains('is-slice-open'));return{fallback:true};});await ctx.close();}
 {const{ctx,page}=await context(browser,1440);await page.goto(base);await ready(page);
 await check('interrupt transition and re-enter without stuck overlay',async()=>{await page.locator('[data-hero-enter]').click();await page.waitForTimeout(250);await page.keyboard.press('Escape');assert.equal((await state(page)).flight,0);await page.locator('.topbar .brand').click();await page.waitForTimeout(1000);await page.locator('[data-hero-enter]').click();await page.waitForFunction(()=>document.querySelector('#start').dataset.entryState==='showroom');assert.equal((await state(page)).flight,0);return{reentry:true};});
 await check('core pointer hover and focus do not activate; Enter does',async()=>{await page.locator('[data-showroom-viewport]').focus();await page.keyboard.press('Escape');assert.equal((await state(page)).awake,'false');await page.locator('[data-capsule-toggle]').focus();assert.equal((await state(page)).awake,'false');const pt=await page.locator('[data-capsule-toggle]').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.mouse.move(pt.x,pt.y);await page.waitForTimeout(300);assert.equal((await state(page)).awake,'false');await page.keyboard.press('Enter');await formed(page);assert.equal((await state(page)).awake,'true');return{keyboard:true,hover:false};});
 await check('existing navigation and project text preserved',async()=>{const original=execFileSync('git',['show','HEAD:index.html'],{encoding:'utf8'});const s=await page.evaluate(html=>{const old=new DOMParser().parseFromString(html,'text/html');const nav=d=>[...d.querySelectorAll('.topbar a')].map(a=>[a.textContent.trim(),a.getAttribute('href')]);const cards=d=>[...d.querySelectorAll('.showroom-card')].map(a=>a.textContent.replace(/\s+/g,' ').trim());return{nav:JSON.stringify(nav(old))===JSON.stringify(nav(document)),cards:JSON.stringify(cards(old))===JSON.stringify(cards(document)),count:cards(document).length};},original);assert(s.nav&&s.cards&&s.count===19);return s;});await ctx.close();}
 {const{ctx,page}=await context(browser,390,{javaScriptEnabled:false});await page.goto(base);await check('JavaScript disabled: hero and catalog link remain usable',async()=>{assert(await page.locator('[data-hero-enter]').isVisible());assert.equal(await page.locator('[data-hero-enter]').getAttribute('href'),'#projekty');await page.locator('[data-hero-enter]').tap();assert.equal(new URL(page.url()).hash,'#projekty');return{nativeAnchor:true};});await ctx.close();}
}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});try{report.version=browser.version();await capture(browser,1440);await capture(browser,390);await regressions(browser);await check('no browser errors, missing resources or external requests',()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);assert.deepEqual(report.external,[]);});}finally{await browser.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,'QA.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL}));}if(report.FAIL)process.exitCode=1;})().catch(e=>{report.abort=e.stack;fs.writeFileSync(path.join(out,'QA.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
