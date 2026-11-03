'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/progresskit-art-direction-20261101-playwright';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mobile=process.argv[2]==='mobile',name=mobile?'mobile':'desktop',out=path.join(__dirname,'final');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const viewport=mobile?{width:390,height:844}:{width:1440,height:1050};const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,recordVideo:{dir:out,size:viewport}});const page=await context.newPage();const errors=[],timeline=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const started=Date.now();await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));await page.waitForTimeout(500);const ready=Date.now();
const until=async(seconds)=>{const remaining=ready+seconds*1000-Date.now();if(remaining>0)await page.waitForTimeout(remaining);};const mark=label=>timeline.push({seconds:(Date.now()-ready)/1000,label});mark('Idle artifact');
await until(2);if(!mobile){await page.mouse.move(1180,440);mark('Directional light / opposite shadow');}
await until(3.5);if(mobile)await page.locator('[data-capsule-toggle]').tap();else await page.locator('[data-capsule-toggle]').hover();mark('Core activation');
await until(6.5);if(mobile){await page.locator('.showroom-card.is-active [data-showroom-open]').tap();mark('Tap opens genuine project');await page.waitForTimeout(900);await page.locator('.is-slice-expanded').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'smooth'}));}
else{await page.locator('[data-showroom-open="progresskit-mail"]').hover();mark('Core to project energy / other lenses dim');}
await until(10);if(!mobile){await page.mouse.move(950,430);mark('Layered material response');}
await until(14);const readyOffset=(ready-started)/1000;const video=page.video();await context.close();const target=path.join(out,name+'-raw.webm');await video.saveAs(target);const original=await video.path();if(original!==target)fs.unlinkSync(original);await browser.close();fs.writeFileSync(path.join(out,name+'-recording.json'),JSON.stringify({viewport,readyOffset,timeline,errors},null,2));console.log(JSON.stringify({name,readyOffset,timeline,errors}));if(errors.length)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1;});
