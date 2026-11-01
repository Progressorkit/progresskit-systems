'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/progresskit-art-direction-20261101-playwright';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]||'desktop',mobile=mode==='mobile',out=path.join(__dirname,'final');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const viewport=mobile?{width:390,height:960}:{width:1440,height:1000};const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,recordVideo:{dir:out,size:viewport}});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const start=Date.now(),timeline=[];const mark=label=>{timeline.push({seconds:(Date.now()-start)/1000,label});console.log(label);};
const at=async(selector,offset)=>{await page.locator(selector).evaluate((el,o)=>scrollTo({top:scrollY+el.getBoundingClientRect().top-o,behavior:'smooth'}),offset);await page.waitForTimeout(1800);};
try{await page.goto('http://127.0.0.1:8194/proof-of-direction/',{waitUntil:'networkidle'});mark('Hero / idle');await page.waitForTimeout(1800);
if(!mobile){mark('Light, shadow, material inertia');await page.mouse.move(140,420,{steps:40});await page.waitForTimeout(900);await page.mouse.move(1320,400,{steps:60});await page.waitForTimeout(1100);}
mark('Continuous descent into module');await at('#module',90);await page.waitForTimeout(1000);await at('[data-device]',mobile?78:105);await page.waitForTimeout(1500);
mark('Mechanical activation');if(mobile)await page.locator('[data-ignition]').tap();else await page.locator('[data-ignition]').click();await page.waitForTimeout(1800);
await at('[data-device]',mobile?78:105);await page.waitForTimeout(1800);
if(!mobile){mark('Reverse and reactivate');await page.locator('[data-ignition]').click();await page.waitForTimeout(1500);await page.locator('[data-ignition]').click();await page.waitForTimeout(1800);await page.mouse.move(1170,350,{steps:30});await page.waitForTimeout(650);}
mark('Cable / ecosystem transition');await at('#connection',100);await page.waitForTimeout(3000);
if(mobile){await at('.ecosystem-fragment',160);await page.waitForTimeout(2000);}else{await page.locator('.terminal-tax').hover();await page.waitForTimeout(1200);}
mark('End');}finally{const video=page.video();await context.close();await video.saveAs(path.join(out,`${mode}-proof.webm`));const original=await video.path();if(original!==path.join(out,`${mode}-proof.webm`))fs.unlinkSync(original);await browser.close();fs.writeFileSync(path.join(out,`${mode}-recording.json`),JSON.stringify({viewport,timeline,errors},null,2));if(errors.length)process.exitCode=1;}})().catch(e=>{console.error(e);process.exitCode=1;});
