/* Actual footer capture and baseline comparison; no product DOM/style edits. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:8111/';
const out=__dirname;
const root=process.cwd();
const report={base,baseline:'9322e4e4b35be58517fbf7073c8015673770ef43',checks:[],errors:[],screenshots:[],method:'Current screenshots use real single viewports after natural scroll. Baseline footer computed styles use the same unchanged HTML/JS and only the two CSS responses from git9322e4e in a separate browser page; baseline does not produce acceptance screenshots.'};
const hash=data=>createHash('sha256').update(data).digest('hex');
const assert=(value,message)=>{if(!value)throw Error(message)};
async function check(name,work){try{report.checks.push({name,status:'PASS',details:await work()});}catch(error){report.checks.push({name,status:'FAIL',details:error.message});}}
async function footerState(page){return page.evaluate(()=>{
 const footer=document.querySelector('body>footer');
 const properties=['color','backgroundColor','backgroundImage','fontFamily','fontSize','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopColor','borderTopWidth','boxShadow','display','gap'];
 return{html:footer.outerHTML,styles:[footer,...footer.querySelectorAll('*')].map(el=>({tag:el.tagName,classes:el.className,
   style:Object.fromEntries(properties.map(key=>[key,getComputedStyle(el)[key]]))}))};
});}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 report.browser=browser.version();
 try{
  for(const[width,height]of[[1920,1080],[1440,900],[390,844],[320,568]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
   const current=await context.newPage();
   current.on('pageerror',error=>report.errors.push({width,type:'pageerror',message:error.message}));
   current.on('console',msg=>{if(msg.type()==='error')report.errors.push({width,type:'console',message:msg.text()});});
   await current.goto(base,{waitUntil:'networkidle'});
   await current.evaluate(()=>document.fonts.ready);
   await current.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await current.waitForTimeout(800);
   const actual=await footerState(current);
   const geometry=await current.locator('body>footer').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),height:innerHeight,width:innerWidth,
    headerBottom:document.querySelector('.topbar').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1}));
   const name=`${width}-footer.png`;await current.screenshot({path:path.join(out,name),fullPage:false});report.screenshots.push(name);
   await check(`${width}: complete untouched footer fits real viewport`,async()=>{
    assert(!geometry.overflow&&geometry.rect.top>=geometry.headerBottom-1&&geometry.rect.bottom<=height+1,JSON.stringify(geometry));
    assert((await current.locator('body>footer a').count())===6,'Footer destinations lost');return geometry;
   });
   const baseline=await context.newPage();
   for(const name of ['interface-life','ecosystem-system']){
    const body=execFileSync('git',['show',`9322e4e:assets/${name}.css`],{cwd:root});
    await baseline.route(`**/assets/${name}.css`,route=>route.fulfill({status:200,contentType:'text/css',body}));
   }
   await baseline.goto(base,{waitUntil:'networkidle'});await baseline.evaluate(()=>document.fonts.ready);
   const original=await footerState(baseline);
   await check(`${width}: footer markup and computed materials equal 9322e4e`,async()=>{
    assert(JSON.stringify(original)===JSON.stringify(actual),'Footer changed before original landscape was identified');
    return{elements:actual.styles.length,htmlSha256:hash(actual.html),computedStylesSha256:hash(JSON.stringify(actual.styles)),baselineCssOnly:'git9322e4e',footerRestoration:'NOT_PERFORMED_ORIGINAL_UNCONFIRMED'};
   });
   await context.close();
  }
  await check('No runtime errors in current footer captures',async()=>{assert(report.errors.length===0,JSON.stringify(report.errors));return{errors:0}});
 }finally{await browser.close();}
 report.totals={PASS:report.checks.filter(x=>x.status==='PASS').length,FAIL:report.checks.filter(x=>x.status==='FAIL').length};
 fs.writeFileSync(path.join(out,'footer-review.json'),JSON.stringify(report,null,2)+'\n');console.log(report.totals);
 if(report.totals.FAIL)process.exitCode=1;
})().catch(error=>{report.fatal=error.message;fs.writeFileSync(path.join(out,'footer-review.json'),JSON.stringify(report,null,2)+'\n');console.error(error);process.exitCode=1;});
