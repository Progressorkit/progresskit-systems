'use strict';
// Compare the pre-sprint controller bytes with the current controllers on the
// same current markup. This isolates allocation churn, not historical +1 cause.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:8130/', baseline='/tmp/progresskit-mechanical-v5-20261023/baseline';
const roles=['translator','agents','voice','mail','messenger','tax'];
const files=['assets/project-showroom.js','assets/ecosystem-system.js','assets/hero-space.js'];
const report={base,startedAt:new Date().toISOString(),method:'Same markup/CSS, reduced motion, pre-sprint versus current JS. WeakSet tracks genuinely new connected DOM nodes without retaining removed nodes. No tolerance for current added nodes. This does not identify the single historical CDP node.',runs:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const version of ['baseline','current']){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  if(version==='baseline')for(const file of files)await page.route(base+file,route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(baseline,file),'utf8')}));
  await page.goto(base,{waitUntil:'networkidle'});
  const cdp=await context.newCDPSession(page);
  for(const id of roles)await page.locator(`[data-ecosystem-select="${id}"]`).click();
  await cdp.send('HeapProfiler.collectGarbage');const cold=await cdp.send('Memory.getDOMCounters');
  await page.evaluate(()=>document.querySelector('.showroom-card.is-active [data-showroom-open]').click());
  await page.locator('.is-slice-expanded').waitFor();await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
   const seen=new WeakSet();const scan=node=>{seen.add(node);for(const child of node.childNodes)scan(child)};scan(document);
   window.allocationProbe={created:{},added:0,removed:0};
   const visit=node=>{if(!seen.has(node)){const key=node.nodeType+':'+node.nodeName;window.allocationProbe.created[key]=(window.allocationProbe.created[key]||0)+1;seen.add(node)};for(const child of node.childNodes)visit(child)};
   window.allocationObserver=new MutationObserver(records=>{for(const r of records){window.allocationProbe.added+=r.addedNodes.length;window.allocationProbe.removed+=r.removedNodes.length;for(const node of r.addedNodes)visit(node)}});
   window.allocationObserver.observe(document,{subtree:true,childList:true});
  });
  await cdp.send('HeapProfiler.collectGarbage');const before=await cdp.send('Memory.getDOMCounters');
  for(let i=0;i<5;i++)for(const id of roles)await page.locator(`[data-ecosystem-select="${id}"]`).click();
  // The public click/keydown handlers run in the real browser, without artificial timers.
  for(let i=0;i<20;i++){
   await page.evaluate(()=>document.querySelector('.showroom-card.is-active [data-showroom-open]').click());
   await page.locator('.is-slice-expanded').waitFor();
   await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(250);await cdp.send('HeapProfiler.collectGarbage');const after=await cdp.send('Memory.getDOMCounters');
  const allocation=await page.evaluate(()=>{window.allocationObserver.disconnect();return window.allocationProbe});
  const row={version,roleSelections:30,openCloseCycles:20,warmupCycles:1,cold,before,after,allocation};report.runs.push(row);
  console.log(JSON.stringify(row));await context.close();
 }
 const current=report.runs.find(x=>x.version==='current');
 report.currentStable=Object.keys(current.allocation.created).length===0&&current.after.documents<=current.before.documents&&current.after.nodes<=current.before.nodes&&current.after.jsEventListeners<=current.before.jsEventListeners;
 if(!report.currentStable)process.exitCode=1;
 }finally{await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'allocation-diagnostic.json'),JSON.stringify(report,null,2)+'\n')}
})().catch(error=>{console.error(error);process.exitCode=1});
