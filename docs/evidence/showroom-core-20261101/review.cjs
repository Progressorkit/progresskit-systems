'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname,report={checks:[],errors:[],screenshots:[]};
const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok)console.log('FAIL',name,details);};
async function at(page,selector='.showroom-viewport',offset=90){await page.locator(selector).evaluate((el,n)=>scrollTo({top:scrollY+el.getBoundingClientRect().top-n,behavior:'instant'}),offset);await page.waitForTimeout(200);}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');}
async function core(page){return page.locator('.mechanism-hub').evaluate(e=>({halo:getComputedStyle(e,'::before').animationPlayState,light:getComputedStyle(e,'::after').animationPlayState,mark:getComputedStyle(e.querySelector('img')).animationPlayState,border:getComputedStyle(e).borderTopColor}));}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [width,height] of [[1440,1000],[1920,1080],[390,844],[320,568]]){
  const mobile=width<701,page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});await at(page,'.showroom-viewport',width===1440?30:90);await page.waitForFunction(()=>[...document.querySelectorAll('.showroom-card:not(.is-orbit-hidden) .showroom-card__visual img')].every(img=>img.complete&&img.naturalWidth>0));await shot(page,width+'-idle');
  check(width+' page fits horizontally',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(width+' visible titles fit faces',await page.locator('.showroom-card:not(.is-orbit-hidden) h3').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),p=e.closest('.project-slice').getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.bottom+1;})));
  check(width+' original fourteen projects',await page.locator('.showroom-card').count()===14);
  if(width===1440){
   const idle=await core(page);check('visible core breathes',idle.halo==='running'&&idle.light==='running'&&idle.mark==='running',idle);
   const face=page.locator('.showroom-card[data-project-id="progresskit-mail"] .project-slice'),trigger=page.locator('[data-showroom-open="progresskit-mail"]');
   const base=await face.evaluate(e=>({transform:getComputedStyle(e).transform,filter:getComputedStyle(e).filter,alpha:getComputedStyle(e,'::after').opacity}));
   await trigger.hover();await page.waitForTimeout(450);const hover=await face.evaluate(e=>({transform:getComputedStyle(e).transform,filter:getComputedStyle(e).filter,alpha:getComputedStyle(e,'::after').opacity}));
   check('hover lifts and illuminates face',hover.transform!==base.transform&&hover.filter!==base.filter&&Number(hover.alpha)>Number(base.alpha),{base,hover});
   check('hover lights the shared core',(await core(page)).border!==idle.border);await shot(page,'1440-hover');
   await page.mouse.move(15,100);await page.locator('.showroom-viewport').focus();await page.keyboard.press('Tab');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.showroom-card.is-active .project-slice')).filter==='brightness(1.12)',null,{timeout:1500});
   check('focus has equivalent material response',await page.locator('.showroom-card.is-active [data-showroom-open]').evaluate(e=>e===document.activeElement));
   check('keyboard outline is visible',await page.locator('.showroom-card.is-active [data-showroom-open]').evaluate(e=>getComputedStyle(e).outlineStyle==='solid'&&getComputedStyle(e).outlineWidth==='2px'));await shot(page,'1440-focus');
   await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#projekty').classList.contains('is-slice-open'));check('existing keyboard opening still works',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());
   check('open product suspends core',Object.values(await core(page)).slice(0,3).every(v=>v==='paused'));
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#projekty').classList.contains('is-slice-open'));check('Escape restores project focus',await page.evaluate(()=>document.activeElement.matches('[data-showroom-open]')));
   await at(page);await page.locator('[data-showroom-motion-toggle]').click();check('pause suspends core',Object.values(await core(page)).slice(0,3).every(v=>v==='paused'));await page.locator('[data-showroom-motion-toggle]').click();await at(page);
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(400);check('offscreen core pauses',Object.values(await core(page)).slice(0,3).every(v=>v==='paused'));
   await at(page);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.interfaceMotion==='paused');
   check('reduced motion disables core animations',await page.locator('.mechanism-hub').evaluate(e=>[getComputedStyle(e,'::before'),getComputedStyle(e,'::after'),getComputedStyle(e.querySelector('img'))].every(s=>s.animationName==='none')));
   await page.locator('.showroom-card.is-active [data-showroom-open]').focus();check('reduced motion retains static focus without lift',await page.locator('.showroom-card.is-active .project-slice').evaluate(e=>getComputedStyle(e).transform==='none'));await shot(page,'1440-reduced');
   await page.emulateMedia({forcedColors:'active'});check('forced colors removes decorative mechanism',!(await page.locator('.showroom-frame').isVisible()));check('forced colors keeps project link visible',await page.locator('.showroom-card.is-active [data-showroom-open]').isVisible());
  }
  if(mobile){
   check(width+' core remains above the project face',await page.evaluate(()=>document.querySelector('.mechanism-hub').getBoundingClientRect().bottom+6<=document.querySelector('.showroom-card.is-active .project-slice').getBoundingClientRect().top));
   const quality=await page.evaluate(()=>document.documentElement.dataset.interfaceQuality);check(width+' lightweight glass',await page.locator('.showroom-card.is-active .project-slice').evaluate(e=>getComputedStyle(e).backdropFilter==='none')&&quality==='compact');
   check(width+' mobile disables sweep and logo scale',await page.locator('.mechanism-hub').evaluate(e=>getComputedStyle(e,'::after').animationName==='none'&&getComputedStyle(e.querySelector('img')).animationName==='none'));
   const id=await page.locator('.showroom-card.is-active').getAttribute('data-project-id');await page.locator('[data-showroom-step="1"]').tap();await page.waitForTimeout(750);check(width+' touch navigation still selects next project',await page.locator('.showroom-card.is-active').getAttribute('data-project-id')!==id);
   await page.locator('.showroom-card.is-active [data-showroom-open]').tap();await page.waitForFunction(()=>document.querySelector('#projekty').classList.contains('is-slice-open'));await at(page,'.is-slice-expanded',85);await shot(page,width+'-open');check(width+' touch opens real project content',await page.locator('.is-slice-expanded .project-slice__panel').isVisible());
   await page.locator('.is-slice-expanded [data-slice-close]').tap();await page.waitForFunction(()=>!document.querySelector('#projekty').classList.contains('is-slice-open'));check(width+' closes without horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.close();console.log(width+' complete');
 }
 const fallback=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await fallback.goto('http://127.0.0.1:8191/');check('no JavaScript keeps fourteen original project links',await fallback.locator('[data-showroom-open]').count()===14);await fallback.close();
 check('no browser or CSP errors',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('review completed',false,e.message);}finally{await browser.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL||report.errors.length)process.exitCode=1;}})();
