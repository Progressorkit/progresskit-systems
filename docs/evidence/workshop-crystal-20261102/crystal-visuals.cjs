/* Genuine local Chrome proof. Does not measure host embedded preview latency. */
'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/progresskit-finalqa-browsers-20261102';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const pw=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname,base='http://127.0.0.1:8201/',mode=process.argv[2]||'screens';
const report={mode,startedAt:new Date().toISOString(),hostPreview:'UNKNOWN: in-app browser unavailable, standalone hardware Chrome used for development proof.',physicalMobile:'NOT_RUN: 390x844 touch emulation.',ownerVisualApproval:'OPEN',errors:[],blocked:[],artifacts:[]};
const save=()=>fs.writeFileSync(path.join(out,'crystal-'+mode+'.json'),JSON.stringify(report,null,2));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sources=()=>Object.fromEntries(['assets/technology-field.css','assets/technology-field.mjs','assets/material-finish.css'].map(f=>[f,hash(path.resolve(out,'../../..',f))]));
async function position(page,index=0,offset=145){await page.locator('#technologie .technology-group').nth(index).evaluate((e,y)=>scrollTo({top:Math.max(0,scrollY+e.getBoundingClientRect().top-y),behavior:'instant'}),offset);await page.waitForTimeout(550);}
async function glide(page,index=0,duration=1500){await page.locator('#technologie .technology-group').nth(index).evaluate(async(e,duration)=>{const start=scrollY,end=scrollY+e.getBoundingClientRect().top-140,t0=performance.now();await new Promise(resolve=>{const frame=t=>{const p=Math.min(1,(t-t0)/duration);scrollTo(0,start+(end-start)*p*p*(3-2*p));p<1?requestAnimationFrame(frame):resolve();};requestAnimationFrame(frame);});},duration);await page.waitForTimeout(100);}
async function screenshot(page,file,state){if(mode==='videos')return;await page.screenshot({path:path.join(out,file)});report.artifacts.push({file,sha256:hash(path.join(out,file)),kind:'actual local Chrome screenshot',state});save();}
async function main(){
 report.sourceBefore=sources();save();
 for(const mobile of[false,true]){
  const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
  const browser=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
  try{
   const rawFolder=path.join(out,'crystal-video-raw');fs.mkdirSync(rawFolder,{recursive:true});
   const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile,...(mode==='videos'?{recordVideo:{dir:rawFolder,size:viewport}}:{})});
   await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==new URL(base).origin||!['GET','HEAD'].includes(req.method())){report.blocked.push({method:req.method(),url:req.url()});return route.abort();}return route.continue();});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({mobile,message:e.message}));
   await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await position(page,0,mobile?125:145);
   const groups=page.locator('#technologie .technology-group'),first=groups.first();
   if(mode==='screens'){
    if(!mobile){await page.mouse.move(5,80);await page.waitForTimeout(900);await screenshot(page,'workshop-crystal-idle.png','desktop idle thick dark crystal');await first.locator('a').first().hover({force:true});await page.waitForTimeout(900);await screenshot(page,'workshop-crystal-powered.png','desktop powered hover');}
    else{await first.locator('h3').tap();await page.waitForTimeout(850);report.mobileTap=await page.evaluate(()=>{const root=document.querySelector('#technologie'),g=root.querySelector('.technology-group');return {active:g.classList.contains('is-field-active'),rootActive:root.dataset.fieldActive,metrics:root.technologyField.metrics(),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};});await screenshot(page,'workshop-crystal-mobile-tap.png','mobile emulation tap powered dark crystal');}
    await context.close();continue;
   }
   const start=Date.now();
   if(!mobile){
    await page.mouse.move(5,80);await page.waitForTimeout(900);await screenshot(page,'workshop-crystal-idle.png','desktop idle thick dark crystal');
    await first.locator('a').first().hover({force:true});await page.waitForTimeout(900);await screenshot(page,'workshop-crystal-powered.png','desktop powered hover');
    const b=await first.boundingBox();await page.mouse.move(b.x+b.width*.75,b.y+Math.min(b.height-60,220),{steps:30});await page.waitForTimeout(1100);
    await page.mouse.move(5,80);await glide(page,5,2000);await groups.nth(5).locator('a').first().hover({force:true});await page.waitForTimeout(1500);
    await page.mouse.move(5,80);await glide(page,0,2000);await first.locator('a').first().focus();await page.waitForTimeout(1300);await page.evaluate(()=>document.activeElement.blur());
   }else{
    await page.waitForTimeout(900);const tap=first.locator('h3');await tap.tap();await page.waitForTimeout(850);
    report.mobileTap=await page.evaluate(()=>{const root=document.querySelector('#technologie'),g=root.querySelector('.technology-group');return {active:g.classList.contains('is-field-active'),rootActive:root.dataset.fieldActive,metrics:root.technologyField.metrics(),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};});
    await screenshot(page,'workshop-crystal-mobile-tap.png','mobile emulation tap powered dark crystal');
    await page.waitForTimeout(1100);await glide(page,1,1700);await groups.nth(1).locator('h3').tap();await page.waitForTimeout(1800);await glide(page,0,1700);await tap.tap();await page.waitForTimeout(1300);
   }
   await page.waitForTimeout(Math.max(400,13000-(Date.now()-start)));
   const elapsed=(Date.now()-start)/1000,raw=await page.video().path();await context.close();
   const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',raw],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);
   const rawDuration=Number(JSON.parse(probe.stdout).format.duration),trim=Math.max(0,rawDuration-elapsed),file=mobile?'workshop-crystal-mobile.mp4':'workshop-crystal-desktop.mp4';
   const encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',trim.toFixed(3),'-i',raw,'-t',elapsed.toFixed(3),'-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-vf','fps=25','-threads','2','-movflags','+faststart',path.join(out,file)],{encoding:'utf8'});if(encode.status!==0)throw Error(encode.stderr);
   report.artifacts.push({file,sha256:hash(path.join(out,file)),rawFile:path.relative(out,raw),rawSha256:hash(raw),kind:'actual local Chrome recording',seconds:elapsed,viewport,playbackRate:1,recordingFps:25,note:'Recordings are separate from performance benchmark; recording FPS is not rendering FPS.'});save();
  }finally{await browser.close();}
 }
 report.sourceAfter=sources();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({errors:report.errors,blocked:report.blocked,sourceStable:report.sourceStable,mobileTap:report.mobileTap,artifacts:report.artifacts.map(a=>({file:a.file,seconds:a.seconds}))}));
}
main().catch(e=>{report.failure=e.stack;save();console.error(e);process.exitCode=1;});
