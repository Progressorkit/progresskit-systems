const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const out='docs/evidence/approved-copy-v2-20261023';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={method:'Actual single viewport screenshots. Natural document scroll to target top minus90px; 800ms settle. No hidden header, modified styles, stitched capture or DOM content edits.',browser:await browser.version(),viewports:[]};
 try{
  for(const[width,height]of[[1920,1080],[1440,900],[390,844],[320,568]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
   await page.goto('http://127.0.0.1:8100/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const frames=[];
   async function capture(label,selector){
    if(selector)await page.evaluate(sel=>{const el=document.querySelector(sel);scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-90),behavior:'instant'})},selector);
    else await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(800);
    const name=`${width}-${label}.png`;await page.screenshot({path:`${out}/${name}`,fullPage:false});
    const state=await page.evaluate(()=>({scrollY,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,activeElement:document.activeElement?.tagName,header:document.querySelector('.topbar').getBoundingClientRect().toJSON(),skipLink:document.querySelector('.skip-link').getBoundingClientRect().toJSON()}));
    frames.push({path:name,target:selector,...state});
   }
   await capture('first',null);await capture('ecosystem','#ekosystem');
   if(width===1440)await capture('ecosystem-bottom','.delivery-independent');
   if(width<600){
    if(width===320)await capture('translator-description','.delivery-flow__node[data-ecosystem-project="progresskit-translator"]');
    await capture('flow-middle','.delivery-flow__node[data-ecosystem-concept="local-ai-agents"]');
    await capture('communication-bottom','.delivery-independent');
    await capture('roadmap-note','#ecosystem-roadmap-note');
   }
   report.viewports.push({width,height,frames});await page.close();
  }
 }finally{await browser.close()}
 report.pngCount=report.viewports.reduce((n,x)=>n+x.frames.length,0);
 fs.writeFileSync(`${out}/screenshot-review.json`,JSON.stringify(report,null,2)+'\n');
 const gui=JSON.parse(fs.readFileSync(`${out}/gui-review.json`));
 for(const viewport of gui.viewports)viewport.screenshots=report.viewports.find(v=>v.width===viewport.width).frames.map(f=>f.path);
 gui.screenshotMethod=report.method;gui.originalCaptureHistory='stitching-first/';
 fs.writeFileSync(`${out}/gui-review.json`,JSON.stringify(gui,null,2)+'\n');
 console.log(JSON.stringify({pngCount:report.pngCount,viewports:report.viewports.map(v=>({width:v.width,pngCount:v.frames.length,overflow:v.frames.some(f=>f.overflow)}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
