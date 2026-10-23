const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const crypto=require('node:crypto');
const out='docs/evidence/approved-copy-v2-20261023';
const base='http://127.0.0.1:8100';
const expected={lead:'Plan współpracy modułów. Połączenia poniżej są roadmapą, nie potwierdzeniem działających integracji.',note:'Nie potwierdzono działających integracji między tymi modułami. Planowane połączenia nie stanowią dostępnej oferty.',nodes:[['ProgressKit Tax','W rozwoju','Obsługa biura.'],['ProgressKit Translator','Prototyp','Niezależny moduł językowy offline-first.'],['Local AI Agents','Planowane','Lokalni agenci AI.'],['Voice Gateway','Planowane','Integracje telefoniczne.']],branches:[['ProgressKit Mail','W rozwoju','Komunikacja e-mail. Połączenie z głównym przepływem — planowane.'],['Bezpieczny komunikator','Planowane','Osobny kierunek rozwoju. Połączenie z ekosystemem — planowane.']]};
const norm=s=>s.replace(/\s+/g,' ').trim();
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={base,browser:await browser.version(),scope:'Targeted actual Chromium QA of approved copy only, four emulated viewport sizes. Not a repeat of the full 80-case mechanism regression or physical-device acceptance.',sourceHtmlSha256:crypto.createHash('sha256').update(fs.readFileSync('index.html')).digest('hex'),viewports:[]};
 try {
  for(const [width,height] of [[1920,1080],[1440,900],[390,844],[320,568]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
   const errors=[],failedResources=[];const checks=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   page.on('requestfailed',r=>failedResources.push({url:r.url(),error:r.failure()?.errorText}));
   const record=(name,okay,details)=>checks.push({name,status:okay?'PASS':'FAIL',details});
   await page.goto(base+'/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
   await page.screenshot({path:`${out}/${width}-first.png`});
   const initial=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,projects:document.querySelectorAll('.showroom-card').length,uniqueProjects:new Set([...document.querySelectorAll('.showroom-card')].map(e=>e.dataset.projectId)).size,label:document.querySelector('.showroom-viewport').getAttribute('aria-label'),motion:document.querySelector('[data-showroom-motion-toggle]').textContent.trim(),liveStatus:{text:document.querySelector('#showroom-status').textContent,color:getComputedStyle(document.querySelector('#showroom-status')).color,fontSize:getComputedStyle(document.querySelector('#showroom-status')).fontSize}}));
   record('first view preserves14 projects without horizontal overflow',!initial.overflow&&initial.projects===14&&initial.uniqueProjects===14,initial);
   record('approved mechanical aria label',initial.label==='Mechaniczna ekspozycja projektów',initial.label);
   record('approved initial pause label',initial.motion==='Wstrzymaj efekty mechanizmu',initial.motion);
   const motion=page.locator('[data-showroom-motion-toggle]');
   await motion.click();
   const paused={text:norm(await motion.textContent()),pressed:await motion.getAttribute('aria-pressed')};
   record('pause shows approved resume label and state',paused.text==='Wznów efekty mechanizmu'&&paused.pressed==='true',paused);
   await motion.click();
   const resumed={text:norm(await motion.textContent()),pressed:await motion.getAttribute('aria-pressed')};
   record('resume restores approved pause label and state',resumed.text==='Wstrzymaj efekty mechanizmu'&&resumed.pressed==='false',resumed);
   const map=await page.evaluate(()=>{
    const txt=s=>document.querySelector(s)?.textContent.replace(/\s+/g,' ').trim();
    const rows=sel=>[...document.querySelectorAll(sel)].map(e=>[e.querySelector('.delivery-flow__heading')?.textContent.trim(),e.querySelector('.delivery-state')?.textContent.trim(),e.querySelector('.delivery-flow__description')?.textContent.trim()]);
    const texts=[...document.querySelectorAll('#ekosystem .delivery-flow__heading,#ekosystem .delivery-flow__description,#ekosystem .delivery-flow__relationship,.delivery-map-intro,.delivery-roadmap p')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{text:e.textContent.trim(),left:r.left,right:r.right,width:r.width,height:r.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,visible:s.display!=='none'&&s.visibility!=='hidden'&&r.height>0,overflowX:s.overflowX,overflowY:s.overflowY}});
    const scrollContainers=[...document.querySelectorAll('#ekosystem,#ekosystem .delivery-map,#ekosystem .delivery-flow,#ekosystem .delivery-flow__node,#ekosystem .delivery-independent,#ekosystem .delivery-branch')].map(e=>({className:e.className,overflowY:getComputedStyle(e).overflowY,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}));
    return{lead:txt('.delivery-map-intro'),note:txt('.delivery-roadmap p'),independentTitle:txt('#ecosystem-communication-title'),nodes:rows('.delivery-flow__node'),branches:rows('.delivery-branch'),relationships:[...document.querySelectorAll('.delivery-flow__relationship')].map(e=>e.textContent.trim()),texts,scrollContainers,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   record('approved ecosystem lead and explicit roadmap note',map.lead===expected.lead&&map.note===expected.note,{lead:map.lead,note:map.note});
   record('approved four names states and role descriptions',JSON.stringify(map.nodes)===JSON.stringify(expected.nodes),map.nodes);
   record('approved independent communication branch names states and descriptions',map.independentTitle==='Niezależna komunikacja'&&JSON.stringify(map.branches)===JSON.stringify(expected.branches),{title:map.independentTitle,branches:map.branches});
   record('all three relationships explicitly planned',map.relationships.length===3&&map.relationships.every(s=>s==='Planowane połączenie'),map.relationships);
   const clipped=map.texts.filter(e=>!e.visible||e.left<-.5||e.right>width+.5||e.scrollWidth>e.clientWidth+1);
   record('all ecosystem labels and descriptions visible and horizontally uncut',!map.overflow&&clipped.length===0,{clipped,measurements:map.texts});
   const innerScroll=map.scrollContainers.filter(e=>['auto','scroll'].includes(e.overflowY)&&e.scrollHeight>e.clientHeight+1);
   await page.locator('#ekosystem').scrollIntoViewIfNeeded();
   const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,350);await page.waitForTimeout(120);const after=await page.evaluate(()=>scrollY);
   record('ecosystem uses natural page scrolling without nested scrollers',innerScroll.length===0&&after>before,{before,after,innerScroll,containers:map.scrollContainers});
   await page.locator('#ekosystem').screenshot({path:`${out}/${width}-ecosystem.png`});
   const screenshots=[`${width}-first.png`,`${width}-ecosystem.png`];
   if(width<600){await page.locator('.delivery-independent').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-communication-bottom.png`});screenshots.push(`${width}-communication-bottom.png`)}
   const cta=page.locator('#wyzwania a');const ctaText=norm(await cta.textContent()),ctaHref=await cta.getAttribute('href');
   record('approved case studies CTA and existing catalogue destination',ctaText==='Case studies projektów →'&&ctaHref==='projekty/',{text:ctaText,href:ctaHref});
   await cta.click();await page.waitForURL('**/projekty/');record('case studies CTA opens the existing catalogue',page.url()===base+'/projekty/',page.url());
   record('no page errors or failed resource requests',errors.length===0&&failedResources.length===0,{errors,failedResources});
   report.viewports.push({width,height,screenshots,PASS:checks.filter(x=>x.status==='PASS').length,FAIL:checks.filter(x=>x.status==='FAIL').length,checks});
   await page.close();
  }
 }finally{await browser.close()}
 report.PASS=report.viewports.reduce((n,x)=>n+x.PASS,0);report.FAIL=report.viewports.reduce((n,x)=>n+x.FAIL,0);report.BLOCKED=0;
 fs.writeFileSync(`${out}/gui-review.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,BLOCKED:0,viewports:report.viewports.map(x=>({width:x.width,PASS:x.PASS,FAIL:x.FAIL,issues:x.checks.filter(c=>c.status!=='PASS')}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
