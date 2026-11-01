'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]||'phase1',out=path.join(__dirname,mode);fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const report={errors:[],checks:[],screenshots:[]};
const check=(name,ok,details)=>report.checks.push({name,status:ok?'PASS':'FAIL',details});
try{for(const width of [1440,390]){
 const height=width===1440?900:844,page=await browser.newPage({viewport:{width,height},isMobile:width<701,hasTouch:width<701});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:8194/proof-of-direction/',{waitUntil:'networkidle'});await page.waitForTimeout(300);
 async function shot(label,selector){if(selector){await page.locator(selector).evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-88,behavior:'instant'}));await page.waitForTimeout(300);}const name=`${width}-${label}.png`;await page.screenshot({path:path.join(out,name)});report.screenshots.push(name);const bounds=await page.evaluate(()=>({view:innerWidth,document:document.documentElement.scrollWidth}));check(width+' '+label+' fits',bounds.document<=bounds.view,bounds);}
 await shot('hero');await page.mouse.move(width*.82,height*.33,{steps:8});await page.waitForTimeout(700);await shot('hero-light');
 await shot('module-closed','#module');await page.locator('[data-device]').screenshot({path:path.join(out,`${width}-device-closed.png`)});
 await page.locator('[data-ignition]').click();await page.waitForFunction(()=>document.querySelector('[data-device]').dataset.state==='open');
 await shot('module-open','#module');await page.locator('[data-device]').screenshot({path:path.join(out,`${width}-device-open.png`)});
 await shot('connection','#connection');await page.close();
}}finally{await browser.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.FAIL||report.errors.length)process.exitCode=1;}})().catch(e=>{console.error(e);process.exitCode=1});
