/* Existing public distribution/privacy/alias pages. No APK request or review submission. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pw=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2]||'http://127.0.0.1:8201/',origin=new URL(base).origin,out=path.resolve(process.argv[3]||path.join(__dirname,'support-pages'));
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname))throw Error('Loopback preview only.');
const engines=(process.env.PK_QA_BROWSERS||'chrome,firefox').split(','),widths=[360,390,768,1440];
const root=path.resolve(__dirname,'../..'),report={status:'RUNNING',base,checks:[],errors:[],resources:[],engines:[],ownerVisualApproval:'OPEN',formsSubmitted:false,apkRequested:false,mailDelivery:'NOT_VERIFIED',scope:'Owned loopback preview with disposable synthetic product DB only.'};
const assert=(v,m)=>{if(!v)throw Error(m);};
const fingerprint=()=>Object.fromEntries(['glikemia-premium/index.html','glikemia-premium/product.js','glikemia-premium/product.css','prywatnosc/index.html','progresskit-mail/index.html','catalog/projects.json','catalog/operator.json','assets/site-v5.css'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
function save(){report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;report.BLOCKED=report.checks.filter(c=>c.status==='BLOCKED').length;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
async function check(scope,name,fn){try{report.checks.push({scope,name,status:'PASS',details:await fn()});}catch(e){report.checks.push({scope,name,status:/NS_ERROR_OUT_OF_MEMORY|browser has been closed|Target.*closed/.test(e.message)?'BLOCKED':'FAIL',details:e.message});console.log(scope,name,e.message);}save();}
async function bounds(page){const m=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(m.scrollWidth<=m.width+1,'Document horizontal overflow');return m;}
async function run(){
 fs.mkdirSync(out,{recursive:true});report.sourceBefore=fingerprint();
 for(const name of engines){
  let browser;
  try{browser=name==='chrome'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']}):await pw.firefox.launch({executablePath:'/tmp/progresskit-finalqa-browsers-20261102/firefox-1538/firefox/firefox',headless:true});report.engines.push({name,version:browser.version()});}
  catch(e){report.checks.push({scope:name,name:'Launch',status:'BLOCKED',details:e.message});save();continue;}
  try{for(const width of widths){
   const scope=`${name}:${width}`,context=await browser.newContext({viewport:{width,height:width<500?844:1000}});
   await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==origin||!['GET','HEAD'].includes(r.method())||u.pathname.startsWith('/download/')){report.errors.push({scope,kind:'prohibited-request',method:r.method(),url:r.url()});return route.abort();}return route.continue();});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({scope,kind:'pageerror',message:e.message}));page.on('response',r=>{if(r.status()>=400)report.resources.push({scope,url:r.url(),status:r.status()});});
   await check(scope,'Distribution UI, native validation, gallery keyboard; no submit/download',async()=>{
    const response=await page.goto(new URL('glikemia-premium/',base).href,{waitUntil:'networkidle'});assert(response.status()===200,'Distribution route unavailable');
    assert(await page.locator('h1').textContent()==='Glikemia Premium','Wrong product identity');await bounds(page);
    const downloadTargets=await page.locator('a[href="/download/glikemia-premium"]').count();assert(downloadTargets===2,'Both download links must retain the existing target');
    await page.locator('#submit-review').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#submit-review').disabled);
    const valid=await page.locator('#review-form').evaluate(form=>form.checkValidity());assert(!valid,'Empty review form must fail native required validation');
    for(const id of ['nickname','rating','comment','version'])assert(await page.locator(`label[for="${id}"]`).count()===1,'Missing input label '+id);
    assert(await page.locator('#comment').getAttribute('aria-describedby')==='review-privacy','Comment needs the privacy description');
    const counter=await page.locator('[data-download-count]').first().textContent();assert(/pobrań APK/.test(counter),'Synthetic preview counter did not load');
    const gallery=page.locator('.gallery');await gallery.focus();const before=await gallery.evaluate(e=>({left:e.scrollLeft,max:e.scrollWidth-e.clientWidth}));
    await page.keyboard.press('ArrowRight');await page.waitForTimeout(450);const after=await gallery.evaluate(e=>e.scrollLeft);if(before.max>1)assert(after>before.left,'Scrollable gallery did not respond to ArrowRight');
    await page.locator('img[src]').evaluateAll(items=>items.forEach(e=>{e.loading='eager';}));await page.waitForFunction(()=>[...document.images].every(e=>e.complete));assert(await page.locator('img').evaluateAll(items=>items.every(e=>e.naturalWidth>0)),'Product image failed to decode');
    await page.screenshot({path:path.join(out,`${name}-${width}-distribution-gallery.png`),fullPage:false});
    await page.locator('#feedback').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:'instant'}));await bounds(page);await page.screenshot({path:path.join(out,`${name}-${width}-distribution-form.png`),fullPage:false});
    return{downloadLinks:downloadTargets,formReady:true,emptyFormValid:valid,submitted:false,apkRequested:false,gallery:{...before,after},counterSource:'Disposable local synthetic DB; no production count queried.'};
   });
   for(const [route,h1] of [['prywatnosc/','Prywatność witryny'],['progresskit-mail/','ProgressKit Mail']])await check(scope,route+' readable route',async()=>{const response=await page.goto(new URL(route,base).href,{waitUntil:'networkidle'});assert(response.status()===200,'HTTP failure');assert((await page.locator('h1').textContent()).trim()===h1,'Unexpected H1');if(route==='prywatnosc/'){const operator=JSON.parse(fs.readFileSync(path.join(root,'catalog/operator.json'))),text=(await page.locator('main').textContent()).replace(/\s+/g,' ');assert(await page.locator('#operator').isVisible(),'Operator block missing or hidden');assert(Object.values(operator).every(value=>text.includes(value)),'Operator source fields missing from actual privacy DOM');}await page.screenshot({path:path.join(out,`${name}-${width}-${route.slice(0,-1)}.png`),fullPage:false});return bounds(page);});
   await context.close();console.log('Completed support pages',scope);
  }}finally{await browser.close();}
 }
 await check('all','No browser error, failed resource or prohibited request',async()=>{assert(!report.errors.length&&!report.resources.length,'Inspect errors/resources');return{errors:0,failedResources:0,submitted:false,apkRequested:false};});
 report.sourceAfter=fingerprint();if(JSON.stringify(report.sourceBefore)!==JSON.stringify(report.sourceAfter))report.checks.push({scope:'all',name:'Source integrity',status:'BLOCKED',details:'Source changed during support-page run.'});
 save();report.status=report.FAIL?'FAIL':report.BLOCKED?'BLOCKED':'AUTOMATED_SUPPORT_PAGES_PASS_VISUAL_REVIEW_OPEN';save();console.log({status:report.status,PASS:report.PASS,FAIL:report.FAIL,BLOCKED:report.BLOCKED});if(report.FAIL||report.BLOCKED)process.exitCode=1;
}
run().catch(e=>{report.status='BLOCKED_OR_ABORTED';report.failure=e.stack;fs.mkdirSync(out,{recursive:true});save();console.error(e);process.exitCode=1;});
