/* Bounded local product QA: no production access, user data or downloads. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),base=process.env.PK_QA_URL||'http://127.0.0.1:8265';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out=path.join(root,'docs/evidence/content-visual-20261125/product-browser');fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog/projects.json')));
const ids=['taskpet','echo-worlds','vaeloria','progresskit-tax'];
const report={scope:'Fresh local Chromium. Mobile is emulated, no physical phone acceptance.',checks:[],screenshots:[],errors:[],blockedExternal:[],status:'RUNNING'};
async function check(name,fn){try{const detail=await fn();report.checks.push({name,status:'PASS',detail});console.log('PASS '+name);}catch(error){report.checks.push({name,status:'FAIL',error:error.stack});console.log('FAIL '+name+' '+error.message);}}
(async()=>{let browser;try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const preflight=await browser.newPage();const ready=await preflight.goto(base+'/projekty/progresskit-tax/');assert.equal(ready.status(),200);await preflight.close();
 for(const id of ids){
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin){report.blockedExternal.push(u.origin);return route.abort();}return route.continue();});
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push({id,message:e.message}));
  for(const width of [320,360,390,412,768,1024,1366,1920])await check(id+' layout '+width,async()=>{
   await p.setViewportSize({width,height:width<600?844:900});const r=await p.goto(base+'/projekty/'+id+'/',{waitUntil:'networkidle'});assert.equal(r.status(),200);
   await p.locator('.exhibit-hero img').first().evaluate(e=>e.decode());assert.equal(await p.locator('h1').count(),1);assert.equal(await p.locator('[id^=source-]').count(),catalog.projects.find(x=>x.id===id).sources.length);assert.equal(await p.locator('[data-showcase]').getAttribute('data-showcase'),id);
   const g=await p.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,title:(()=>{const r=document.querySelector('.exhibit-headline').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()}));
   assert(g.document<=width+1&&g.body<=width+1,JSON.stringify(g));assert(g.title.left>=0&&g.title.right<=width+1,JSON.stringify(g));
   if([390,1366].includes(width)){const name=id+'-'+width+'-hero.png';await p.screenshot({path:path.join(out,name)});report.screenshots.push(name);}
   return g;
  });
  await check(id+' current gallery and keyboard lightbox',async()=>{
   await p.setViewportSize({width:390,height:844});await p.goto(base+'/projekty/'+id+'/',{waitUntil:'networkidle'});
   const link=p.locator('#galeria [data-exhibit-expand]').first();await link.scrollIntoViewIfNeeded();await link.focus();await p.keyboard.press('Enter');
   assert(await p.locator('.exhibit-lightbox').evaluate(e=>e.open));const preview=p.locator('.exhibit-lightbox img');await preview.evaluate(e=>e.decode());assert(await preview.evaluate(e=>e.naturalWidth>0));
   await p.keyboard.press('Escape');assert(!(await p.locator('.exhibit-lightbox').evaluate(e=>e.open)));assert(await link.evaluate(e=>document.activeElement===e));
   return {gallery:await p.locator('#galeria figure').count(),keyboardOpenClose:true};
  });
  await check(id+' historic fragment links',async()=>{
   const entry=catalog.projects.find(x=>x.id===id);assert(entry,'Catalog entry '+id);
   for(const fragment of ['problem','platformy','wyzwania','screenshots','source-'+entry.sources[0].id,'source-'+entry.sources.at(-1).id]){
    await p.goto(base+'/projekty/'+id+'/#'+encodeURIComponent(fragment),{waitUntil:'networkidle'});
    const target=p.locator('[id="'+fragment+'"]');assert.equal(await target.count(),1,fragment);assert(await target.isVisible(),fragment+' hidden');
    const y=await target.evaluate(e=>e.getBoundingClientRect().top);assert(y>=-2&&y<844,fragment+' y='+y);
   }return {fragments:6};
  });
  await context.close();
 }
 for(const [slug,id]of [['taskpet','taskpet'],['echo-worlds','echo-worlds']])await check(slug+' early full-product link',async()=>{
  const c=await browser.newContext({viewport:{width:390,height:844}});try{const p=await c.newPage();await p.goto(base+'/'+slug+'/',{waitUntil:'networkidle'});const link=p.locator('.game-intro a[href="../projekty/'+id+'/"]');assert.equal(await link.count(),1);assert(await link.isVisible());await link.click();await p.waitForURL('**/projekty/'+id+'/');assert(await p.locator('[data-showcase]').isVisible());return {route:p.url()};}finally{await c.close();}
 });
 await check('Four exhibits have no runtime JavaScript errors',async()=>{assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.blockedExternal.length,0,JSON.stringify(report.blockedExternal));return {errors:0,externalRequests:0};});
 report.status=report.checks.every(x=>x.status==='PASS')?'PASS':'FAIL';
}catch(e){report.status='FAIL';report.fatal=e.stack;}finally{await browser?.close();report.totals={pass:report.checks.filter(x=>x.status==='PASS').length,fail:report.checks.filter(x=>x.status==='FAIL').length};fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.totals));if(report.status!=='PASS')process.exitCode=1;}})();
