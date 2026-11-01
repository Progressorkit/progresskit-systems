'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const checks=[],errors=[],external=[];const check=(name,ok,details)=>checks.push({name,status:ok?'PASS':'FAIL',details});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.locator('img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
  check('All gallery and comparison images load offline',await page.locator('img').count()===75,{count:await page.locator('img').count()});
  check('69 final screenshots are listed',await page.locator('.gallery figure').count()===69,{});
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('video')).every(v=>v.readyState>=1&&v.duration>5));
  check('Both native recordings load offline',await page.locator('video').count()===2,await page.locator('video').evaluateAll(v=>v.map(x=>({duration:x.duration,width:x.videoWidth,height:x.videoHeight}))));
  for(const [value,count] of [['320x568',11],['320',3],['',69]]){
   await page.selectOption('#size',value);
   check('Screenshot filter '+(value||'reset'),await page.locator('.gallery figure:visible').count()===count,{});
  }
  await page.screenshot({path:path.join(__dirname,'gallery-desktop.png')});
  await page.setViewportSize({width:320,height:568});
  check('Gallery fits a 320px viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{});
  check('No gallery runtime errors',errors.length===0,errors);check('No external gallery requests',external.length===0,external);
 }finally{await browser.close();}
 const report={checks,PASS:checks.filter(x=>x.status==='PASS').length,FAIL:checks.filter(x=>x.status==='FAIL').length};
 fs.writeFileSync(path.join(__dirname,'gallery-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.FAIL)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
