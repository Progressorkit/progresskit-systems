const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('docs/evidence/mobile-correction-20261020');
const check=(condition,message)=>{if(!condition)throw Error(message)};
const results=[];
async function shot(page,name,locator){
 await page.waitForTimeout(700);
 if(!locator){await page.screenshot({path:path.join(out,name)});return;}
 const box=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}});
 const before=await page.evaluate(()=>({x:scrollX,y:scrollY}));
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(80);
 const cdp=await page.context().newCDPSession(page);const capture=await cdp.send('Page.captureScreenshot',{format:'png',clip:box,captureBeyondViewport:true,fromSurface:true});
 fs.writeFileSync(path.join(out,name),Buffer.from(capture.data,'base64'));await cdp.detach();
 await page.evaluate(p=>scrollTo({left:p.x,top:p.y,behavior:'instant'}),before);
}
async function choose(p,id){for(let i=0;i<14;i++){if(await p.locator('.showroom-card.is-active').getAttribute('data-project-id')===id)return;await p.locator('[data-showroom-step="1"]').click()}throw Error(id)}
async function align(p){await p.locator('.showroom-card.is-active').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-80,behavior:'instant'}))}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});try{
 for(const [width,height] of [[320,568],[390,844]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1}),p=await c.newPage();await p.goto('http://127.0.0.1:8098/',{waitUntil:'networkidle'});
  await shot(p,`mobile-${width}x${height}-first-view.png`);
  await choose(p,'progresskit-tax');await align(p);
  const header=await p.locator('.showroom-card.is-active').evaluate(el=>{
   const source=el.querySelector('[data-showroom-open]'),plate=el.querySelector('.project-slice');
   return{clip:getComputedStyle(plate).clipPath,parts:[...el.querySelectorAll('h3,.showroom-card__category,.showroom-card__stage,.showroom-card__action')].map(n=>{let r=n.getBoundingClientRect(),hits=[.15,.5,.85].map(v=>document.elementFromPoint(r.x+r.width*v,r.y+r.height/2));return{text:n.innerText,visible:hits.every(h=>source.contains(h)||h===source),width:n.clientWidth,scroll:n.scrollWidth}})}
  });check(header.parts.every(x=>x.visible&&x.scroll<=x.width+1),'Header text clipped at '+width);results.push({case:'Complete Tax title/category/status/action hit-test',width,result:'PASS',header});
  await shot(p,`mobile-${width}-tax-collapsed.png`);
  await p.locator('.showroom-card.is-active [data-showroom-open]').tap();await p.waitForTimeout(350);const tax=p.locator('.showroom-card.is-slice-expanded');
  check(await tax.locator('.project-slice__body').evaluate(el=>getComputedStyle(el).overflowY==='visible'&&el.scrollHeight<=el.clientHeight+1),'Nested scroll');
  await shot(p,`mobile-${width}-tax-expanded-full-module.png`,tax);await align(p);await shot(p,`mobile-${width}-tax-expanded-top.png`);
  await tax.locator('.project-slice__actions').scrollIntoViewIfNeeded();await shot(p,`mobile-${width}-tax-actions-after-page-scroll.png`);
  await tax.locator('[data-slice-close]').scrollIntoViewIfNeeded();await tax.locator('[data-slice-close]').tap();
  await choose(p,'progresskit-community');await align(p);await shot(p,`mobile-${width}-longest-name.png`);
  await p.locator('#uslugi').scrollIntoViewIfNeeded();await shot(p,`services-material-${width}.png`,p.locator('#uslugi'));
  await p.locator('.collaboration').scrollIntoViewIfNeeded();await shot(p,`collaboration-material-${width}.png`,p.locator('.collaboration'));
  const actions=await p.locator('.collaboration a').evaluateAll(list=>list.map(a=>{const r=a.getBoundingClientRect();return{text:a.innerText,width:r.width,scroll:a.scrollWidth,client:a.clientWidth,height:r.height}}));
  check(actions.every(a=>a.height>=44&&a.scroll<=a.client+1),'Collaboration action overflow');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');results.push({case:'Collaboration buttons and page width',width,result:'PASS',actions});
  await c.close();
 }
}finally{await browser.close()}
fs.writeFileSync(path.join(out,'visual-check.json'),JSON.stringify({checks:results,totals:{PASS:results.length,FAIL:0}},null,2)+'\n');console.log(JSON.stringify(results.map(x=>({case:x.case,width:x.width,result:x.result}))))})().catch(e=>{console.error(e);process.exitCode=1})
