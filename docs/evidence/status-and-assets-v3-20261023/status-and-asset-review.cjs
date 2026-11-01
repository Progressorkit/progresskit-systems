/* Local factual status and user-approved reconstruction acceptance checks. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:8111/';
const out=__dirname;
const expected={'glikemia-premium':'Dostępny APK','progresskit-mail':'Wersja testowa','progresskit-community':'Finalizacja'};
const report={base,checks:[],errors:[],screenshots:[],startedAt:new Date().toISOString()};
const assert=(value,message)=>{if(!value)throw Error(message)};
async function check(name,work){try{report.checks.push({name,status:'PASS',details:await work()});}catch(error){report.checks.push({name,status:'FAIL',details:error.message});}}
async function capture(page,name,locator){
 if(locator)await locator.evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-90,behavior:'instant'}));
 await page.waitForTimeout(800);await page.screenshot({path:path.join(out,name),fullPage:false});report.screenshots.push(name);
}
function observe(page,scope){
 page.on('pageerror',error=>report.errors.push({scope,message:error.message}));
 page.on('console',msg=>{if(msg.type()==='error')report.errors.push({scope,message:msg.text()});});
 page.on('response',response=>{if(response.status()>=400)report.errors.push({scope,url:response.url(),status:response.status()});});
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});report.browser=browser.version();
 try{
  for(const[width,height]of[[1440,900],[390,844],[320,568]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
   const page=await context.newPage();observe(page,`${width}:main`);page.setDefaultTimeout(8000);
   await page.goto(base,{waitUntil:'networkidle'});
   await check(`${width}: all three actual statuses survive homepage rendering and hydration`,async()=>{
    const data=JSON.parse(await page.locator('#showroom-data').textContent());
    assert(data.length===14&&await page.locator('.showroom-card').count()===14,'Lost a project');
    for(const[id,stage]of Object.entries(expected)){
     assert(data.find(p=>p.id===id)?.stage===stage,'Payload stage lost: '+id);
     assert((await page.locator(`.showroom-card[data-project-id="${id}"] .showroom-card__stage`).textContent()).trim()===stage,'Card stage lost: '+id);
    }
    return expected;
   });
   await check(`${width}: approved red aluminium is loaded on the existing mechanism`,async()=>{
    const style=await page.locator('.showroom-frame').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert(style.includes('red-aluminium-reconstruction.jpg'),'Red material missing');return{background:style};
   });
   await page.locator('[data-ecosystem-select="mail"]').click();
   await check(`${width}: Mail testing status and all five planned connections remain truthful`,async()=>{
    assert(await page.locator('[data-ecosystem-node="mail"]').getAttribute('data-ecosystem-stage')==='testing','Testing classification lost');
    assert((await page.locator('#ecosystem-status-mail').textContent()).trim()===expected['progresskit-mail'],'Wrong Mail badge');
    assert(await page.locator('[data-ecosystem-edge][data-integration-status="planned"]').count()===5,'Connection promoted to available');
    assert(await page.locator('[data-ecosystem-map]').evaluate(el=>getComputedStyle(el).backgroundImage.includes('red-aluminium-reconstruction.jpg')),'Map red material missing');
    return{mail:expected['progresskit-mail'],connections:'5 planned'};
   });
   await capture(page,`${width}-mail-ecosystem.png`,width<600?page.locator('[data-ecosystem-node="mail"]'):page.locator('[data-ecosystem-map]'));
   for(const[id,stage]of Object.entries(expected)){
    await page.goto(base+'projekty/?etap='+encodeURIComponent(stage),{waitUntil:'networkidle'});
    await check(`${width}: actual stage filter ${stage}`,async()=>{
     assert(await page.locator('#stage-filter').inputValue()===stage,'Filter lost canonical stage');
     const visible=page.locator('.catalog-card:visible');assert(await visible.count()===1,'Unexpected filtered projects');
     assert(await visible.getAttribute('data-id')===id,'Wrong filtered project');return{id,stage};
    });
    await page.goto(base+`projekty/${id}/`,{waitUntil:'networkidle'});
    await check(`${width}: case study status ${id}`,async()=>{
     assert((await page.locator('.status-row .status-chip').first().textContent()).trim()===stage,'Case stage mismatch');
     assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),'Horizontal overflow');return{stage};
    });
   }
   await page.goto(base+'progresskit-mail/',{waitUntil:'networkidle'});
   await check(`${width}: legacy Mail route uses the same current stage`,async()=>{
    assert((await page.locator('.status-row .status-chip').first().textContent()).trim()===expected['progresskit-mail'],'Legacy route stale');
   });
   for(const[route,label,selector]of[['','home','body>footer'],['projekty/progresskit-mail/','mail','body>footer'],['glikemia-premium/','glikemia','body>.pk-footer']]){
    await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(800);
    const footer=page.locator(selector);
    await check(`${width}: approved panorama and preserved footer destinations on ${label}`,async()=>{
     const info=await footer.evaluate(el=>{const s=getComputedStyle(el,'::before');return{image:s.backgroundImage,width:parseFloat(s.width),height:parseFloat(s.height),footer:el.getBoundingClientRect().toJSON(),viewport:innerWidth,viewportHeight:innerHeight,links:[...el.querySelectorAll('a')].map(a=>a.getAttribute('href'))}});
     assert(info.image.includes('footer-forest-mountains-reconstruction.png'),'Panorama missing');
     assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),'Route horizontal overflow');
     assert(info.width>=width-1&&info.height>=(width<700?88:120),'Panorama not full width');
     assert(info.footer.top>=60&&info.footer.bottom<=height+1,'Entire footer not visible: '+JSON.stringify(info));
     assert(info.links.length===(label==='glikemia'?4:6),'Footer link count changed');
     if(label==='glikemia')assert((await page.locator('.status-chip').first().textContent()).trim()==='ANDROID // '+expected['glikemia-premium'],'APK product route stale');
     return info;
    });
    await capture(page,`${width}-${label}-footer.png`);
   }
   await page.emulateMedia({forcedColors:'active'});
   await page.goto(base,{waitUntil:'networkidle'});
   await check(`${width}: footer high contrast preserves system colors without the panorama`,async()=>{
    const style=await page.locator('body>footer').evaluate(el=>({display:getComputedStyle(el,'::before').display,background:getComputedStyle(el).backgroundImage}));
    assert(style.display==='none'&&style.background==='none','Decorative image survived forced colors');return style;
   });
   await page.emulateMedia({forcedColors:'none',media:'print'});
   await check(`${width}: print hides the decorative panorama`,async()=>assert(await page.locator('body>footer').evaluate(el=>getComputedStyle(el,'::before').display)==='none','Panorama retained in print'));
   await context.close();
  }
  await check('No runtime or resource errors',async()=>assert(report.errors.length===0,JSON.stringify(report.errors)));
 }finally{await browser.close();}
 report.finishedAt=new Date().toISOString();report.totals={PASS:report.checks.filter(c=>c.status==='PASS').length,FAIL:report.checks.filter(c=>c.status==='FAIL').length};
 report.screenshotHashes=report.screenshots.map(name=>({path:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')}));
 fs.writeFileSync(path.join(out,'status-and-asset-review.json'),JSON.stringify(report,null,2)+'\n');console.log(report.totals);
 if(report.totals.FAIL)process.exitCode=1;
})().catch(error=>{report.fatal=error.message;fs.writeFileSync(path.join(out,'status-and-asset-review.json'),JSON.stringify(report,null,2)+'\n');console.error(error);process.exitCode=1;});
