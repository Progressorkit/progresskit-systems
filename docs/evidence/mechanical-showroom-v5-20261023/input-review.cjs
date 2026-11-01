'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const report={base:'http://127.0.0.1:8130/',scope:'Real browser input in emulation, not a physical Android',checks:[]};
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
async function check(name,fn){try{report.checks.push({name,status:'PASS',details:await fn()})}catch(e){report.checks.push({name,status:'FAIL',details:e.message})}}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await mobile.newPage();await page.goto(report.base,{waitUntil:'networkidle'});
 const cdp=await mobile.newCDPSession(page);const active=()=>page.locator('.showroom-card.is-active').getAttribute('data-project-id');
 async function swipe(dx,dy){
  await page.locator('.showroom-viewport').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-90,behavior:'instant'}));
  const box=await page.locator('.showroom-viewport').boundingBox(),x=box.x+box.width*.7,y=box.y+230;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let step=1;step<=6;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/6,y:y+dy*step/6,id:1}]});await page.waitForTimeout(30)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);
 }
 await check('390: real horizontal touch sequence changes project without accidental opening',async()=>{
  const before=await active();await swipe(-180,0);const after=await active();
  assert(before!==after,'Horizontal touch did not rotate');assert(await page.locator('.is-slice-expanded').count()===0,'Swipe opened a project');return{before,after};
 });
 await check('390: vertical touch scroll leaves project selection unchanged',async()=>{
  await page.locator('.showroom-viewport').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-90,behavior:'instant'}));
  const id=await active(),before=await page.evaluate(()=>scrollY);await swipe(0,-150);const after=await page.evaluate(()=>scrollY);
  assert(Math.abs(after-before)>30,'Touch did not scroll document');assert(await active()===id,'Vertical scroll rotated the mechanism');return{before,after,id};
 });
 await mobile.close();
 const desktop=await browser.newContext({viewport:{width:1440,height:900}});const work=await desktop.newPage();await work.goto(report.base,{waitUntil:'networkidle'});
 await check('Home/End, Enter and Escape preserve keyboard access across all 14 identities',async()=>{
  const viewport=work.locator('.showroom-viewport');await viewport.focus();await work.keyboard.press('End');await work.waitForTimeout(700);
  assert(await work.locator('.showroom-card.is-active').getAttribute('data-project-id')==='progresskit-infrastructure','End failed');
  await work.keyboard.press('Enter');await work.locator('.is-slice-expanded').waitFor();await work.keyboard.press('Escape');
  assert(await work.evaluate(()=>document.activeElement.dataset.showroomOpen)==='progresskit-infrastructure','Escape focus failed');
  await work.keyboard.press('Home');await work.waitForTimeout(700);
  assert(await work.locator('.showroom-card.is-active').getAttribute('data-project-id')==='glikemia-premium','Home failed');
 });
 await check('Changing category during an open project closes it and keeps category deep link',async()=>{
  await work.locator('.showroom-card.is-active [data-showroom-open]').click();await work.locator('.is-slice-expanded').waitFor();
  await work.locator('[data-showroom-category="technology"]').click();await work.waitForTimeout(700);
  assert(await work.locator('.is-slice-expanded').count()===0,'Open panel leaked through filter');
  assert(await work.locator('.showroom-card:not(.is-orbit-hidden):not([data-category="technology"])').count()===0,'Wrong category items');
  assert(new URL(work.url()).searchParams.get('kategoria')==='technology','Filter deep link missing');
  await work.reload({waitUntil:'networkidle'});
  assert(await work.locator('[data-showroom-category="technology"]').getAttribute('aria-pressed')==='true','Reload lost filter');
 });
 await check('Catalog search still finds Tax from the real catalog',async()=>{
  await work.goto(report.base+'projekty/?q=tax',{waitUntil:'networkidle'});
  const cards=work.locator('.catalog-card:visible');
  assert(await cards.count()===1,'Search did not return exactly Tax');assert((await cards.innerText()).includes('Tax'),'Wrong search result');
 });
 await desktop.close();
 }finally{await browser.close();report.totals={PASS:report.checks.filter(c=>c.status==='PASS').length,FAIL:report.checks.filter(c=>c.status==='FAIL').length};fs.writeFileSync(path.join(__dirname,'input-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.totals.FAIL)process.exitCode=1}
})();
