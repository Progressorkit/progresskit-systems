#!/usr/bin/env node
'use strict';

// Local focused review for the mobile correction. No production requests.
// node check.cjs [site-url] [artifact-directory] [optional-product-api-url]
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const base=process.argv[2]||'http://127.0.0.1:8098/';
const output=path.resolve(process.argv[3]||'/tmp/progresskit-mobile-correction/artifacts');
const api=process.argv[4]||base;
for(const url of [base,api])if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Local hosts only');
fs.mkdirSync(output,{recursive:true});
const report={startedAt:new Date().toISOString(),base,api,checks:[],artifacts:[],geometry:[],pageErrors:[],failedRequests:[],httpErrors:[]};
let browser,reviewPage;
const active=page=>page.locator('.showroom-card.is-active');
const opened=page=>page.locator('.showroom-card.is-slice-expanded');
const body=page=>opened(page).locator('.project-slice__body');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const closeEnough=(a,b,tolerance=3)=>Math.abs(a-b)<=tolerance;
function record(name,pass,details=''){report.checks.push({name,result:pass?'PASS':'FAIL',details});process.stdout.write(`${pass?'PASS':'FAIL'} ${name}${details?`: ${details}`:''}\n`);}
async function check(name,work){try{record(name,true,await work()||'');}catch(error){record(name,false,error.message);if(reviewPage&&!reviewPage.isClosed())try{await reviewPage.keyboard.press('Escape');}catch{}}}
function wire(page,label){
  reviewPage=page;page.setDefaultTimeout(7000);page.setDefaultNavigationTimeout(10000);
  page.on('pageerror',error=>report.pageErrors.push({label,message:error.message}));
  page.on('requestfailed',request=>{const failure=request.failure()?.errorText;if(failure!=='net::ERR_ABORTED')report.failedRequests.push({label,url:request.url(),failure});});
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({label,url:response.url(),status:response.status()});});
}
async function ready(page){await page.goto(base,{waitUntil:'networkidle'});await page.locator('[data-showroom].showroom-enhanced').waitFor();}
async function projects(page){return page.locator('#showroom-data').evaluate(element=>{const source=JSON.parse(element.textContent);return Array.isArray(source)?source:source.projects;});}
async function choose(page,id){
  if(await opened(page).count()){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.showroom-card.is-slice-expanded'));}
  for(let step=0;step<14;step++){
    const current=await active(page).getAttribute('data-project-id');if(current===id)return;
    await page.locator('[data-showroom-step="1"]').click();
    await page.waitForFunction(prior=>document.querySelector('.showroom-card.is-active')?.dataset.projectId!==prior,current);
  }
  throw new Error(`Project ${id} not reachable`);
}
async function align(page,locator=active(page)){
  await locator.evaluate(element=>{const navigation=document.querySelector('.topbar')?.getBoundingClientRect().bottom||0;window.scrollTo({top:scrollY+element.getBoundingClientRect().top-navigation-16,behavior:'instant'});});
}
async function screenshot(page,name,locator){const destination=path.join(output,name);if(locator)await locator.screenshot({path:destination});else await page.screenshot({path:destination});report.artifacts.push(name);}
async function expand(page){await align(page);await active(page).locator('[data-showroom-open]').tap();await opened(page).waitFor();await opened(page).locator('[data-slice-panel]').waitFor({state:'visible'});}
async function layout(page){return page.locator('[data-showroom]').evaluate(root=>{
  const card=root.querySelector('.showroom-card.is-active'),stage=root.querySelector('[data-showroom-viewport]');
  const rect=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,documentTop:scrollY+r.top};};
  return{documentHeight:document.documentElement.scrollHeight,scrollY,stage:rect(stage),card:rect(card),next:root.nextElementSibling?rect(root.nextElementSibling):null,narrow:root.classList.contains('showroom-narrow')};
});}
async function collapsedReadable(page){
  const data=await active(page).evaluate(card=>{
    const rect=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const slab=rect(card.querySelector('.project-slice')||card);
    const parts=['h3','.showroom-card__stage','.showroom-card__action'].map(selector=>{
      const element=card.querySelector(selector),r=rect(element),link=element.closest('[data-showroom-open]');
      const points=[[.15,.25],[.5,.5],[.85,.75]];
      const blocked=points.filter(([x,y])=>{const hit=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);return !hit||!(hit===element||element.contains(hit)||hit===link||link?.contains(hit));}).length;
      return{selector,text:element.innerText.trim(),rect:r,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,visibility:getComputedStyle(element).visibility,blocked};
    });
    return{id:card.dataset.projectId,slab,parts,viewport:{width:innerWidth,height:innerHeight}};
  });
  assert(data.parts.every(part=>part.text),'Selected module has empty title, status or action');
  for(const part of data.parts){const r=part.rect,s=data.slab,v=data.viewport;
    assert(r.width>0&&r.height>0&&part.visibility==='visible',`Selected ${part.selector} is hidden`);
    assert(r.x>=s.x-1&&r.y>=s.y-1&&r.right<=s.right+1&&r.bottom<=s.bottom+1,`${part.selector} escapes its slab: ${JSON.stringify(data)}`);
    assert(r.x>=-1&&r.y>=-1&&r.right<=v.width+1&&r.bottom<=v.height+1,`${part.selector} is outside viewport: ${JSON.stringify(data)}`);
    assert(part.scrollWidth<=part.clientWidth+1,`${part.selector} text is horizontally truncated: ${JSON.stringify(part)}`);
    assert(!part.blocked,`${part.selector} is occluded: ${JSON.stringify(part)}`);
  }
  report.geometry.push({case:'collapsed-readable',...data});return data;
}
async function backgroundsInert(page){
  const data=await page.locator('.showroom-card:not(.is-active)').evaluateAll(cards=>cards.map(card=>{
    const painted=element=>{if(!element)return false;for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility!=='visible'||Number(style.opacity)===0)return false;}const r=element.getBoundingClientRect();return r.width>0&&r.height>0;};
    return{id:card.dataset.projectId,inert:card.inert,ariaHidden:card.getAttribute('aria-hidden'),tabIndex:card.querySelector('[data-showroom-open]').tabIndex,paintedContent:[...card.querySelectorAll('h3,.showroom-card__category,.showroom-card__stage,.showroom-card__action')].some(painted)};
  }));
  assert(data.length===13,`Expected 13 inactive modules, got ${data.length}`);
  assert(data.every(card=>card.inert&&card.ariaHidden==='true'&&card.tabIndex<0&&!card.paintedContent),`Inactive project content is exposed: ${JSON.stringify(data)}`);
  return data;
}
async function touchScroll(page,distance=220){
  const context=page.context(),session=await context.newCDPSession(page),size=page.viewportSize();
  const x=size.width*.5,y=Math.min(size.height-70,Math.max(220,size.height*.74));
  const before=await page.evaluate(()=>({page:scrollY,body:document.querySelector('.showroom-card.is-slice-expanded .project-slice__body')?.scrollTop||0,panel:document.querySelector('.showroom-card.is-slice-expanded [data-slice-panel]')?.scrollTop||0}));
  try{
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=9;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-distance*i/9}]});await page.waitForTimeout(25);}
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(220);
  }finally{await session.detach();}
  const after=await page.evaluate(()=>({page:scrollY,body:document.querySelector('.showroom-card.is-slice-expanded .project-slice__body')?.scrollTop||0,panel:document.querySelector('.showroom-card.is-slice-expanded [data-slice-panel]')?.scrollTop||0}));
  assert(after.page>before.page+50,`Native touch did not scroll the page: ${JSON.stringify({before,after})}`);
  assert(after.body===0&&after.panel===0,`Touch scrolled a nested panel: ${JSON.stringify({before,after})}`);
  return{before,after};
}
async function clip(page){
  const temporary='/tmp/progresskit-mobile-correction/frames';fs.mkdirSync(temporary,{recursive:true});
  const session=await page.context().newCDPSession(page),frames=[];
  session.on('Page.screencastFrame',event=>{const file=path.join(temporary,`frame-${String(frames.length).padStart(5,'0')}.jpg`);fs.writeFileSync(file,Buffer.from(event.data,'base64'));frames.push({file,time:performance.now()});session.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
  await session.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:390,maxHeight:844,everyNthFrame:1});
  let stopped;
  try{
    await page.waitForTimeout(400);await choose(page,'progresskit-tax');await align(page);await page.waitForTimeout(600);
    await expand(page);await page.waitForTimeout(650);await touchScroll(page);await page.waitForTimeout(500);
    await opened(page).locator('.project-slice__actions').scrollIntoViewIfNeeded();await page.waitForTimeout(600);
    await opened(page).locator('[data-slice-close]').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
    await opened(page).locator('[data-slice-close]').tap();await page.waitForFunction(()=>!document.querySelector('.showroom-card.is-slice-expanded'));
    await page.waitForTimeout(650);stopped=performance.now();
  }finally{await session.send('Page.stopScreencast');await session.detach();}
  assert(frames.length>=8,`Insufficient actual browser frames: ${frames.length}`);
  const entries=frames.flatMap((frame,index)=>[`file '${frame.file}'`,`duration ${Math.max(.02,((frames[index+1]?.time||stopped)-frame.time)/1000).toFixed(4)}`]);entries.push(`file '${frames.at(-1).file}'`);
  const manifest=path.join(temporary,'frames.txt');fs.writeFileSync(manifest,entries.join('\n')+'\n');
  const video=path.join(output,'mobile-tax-page-scroll.mp4');
  const encoded=spawnSync('/usr/bin/ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',manifest,'-vf','fps=24,pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',video],{encoding:'utf8'});
  assert(encoded.status===0,encoded.stderr||'ffmpeg failed');report.artifacts.push('mobile-tax-page-scroll.mp4');return`${frames.length} actual CDP browser frames; ${((stopped-frames[0].time)/1000).toFixed(2)}s`;
}
async function apkPreserved(){
  const previous=JSON.parse(fs.readFileSync(path.resolve('docs/evidence/project-slices-20261020/apk-http.json'),'utf8'));
  const apk=path.resolve('downloads/glikemia-premium.apk'),hash=crypto.createHash('sha256');
  for await(const chunk of fs.createReadStream(apk))hash.update(chunk);
  const localSha256=hash.digest('hex'),localBytes=fs.statSync(apk).size;
  assert(localSha256===previous.localSha256&&localBytes===previous.bytes,'Local APK differs from prior verified artifact');
  const counterUrl=new URL('/api/glikemia/downloads',api),route=new URL('/download/glikemia-premium',api);
  const beforeResponse=await fetch(counterUrl);assert(beforeResponse.ok,`Counter response ${beforeResponse.status}`);const before=await beforeResponse.json();
  const head=await fetch(route,{method:'HEAD'});assert([200,405].includes(head.status),`Unexpected APK HEAD ${head.status}`);
  const range=await fetch(route,{headers:{Range:'bytes=0-31'}}),bytes=Buffer.from(await range.arrayBuffer());
  assert(range.status===206&&bytes.length===32,`APK range returned ${range.status}, ${bytes.length} bytes`);
  assert(range.headers.get('content-range')===`bytes 0-31/${localBytes}`,`Incorrect content range ${range.headers.get('content-range')}`);
  const first=Buffer.alloc(32),descriptor=fs.openSync(apk,'r');try{fs.readSync(descriptor,first,0,32,0);}finally{fs.closeSync(descriptor);}
  assert(bytes.equals(first),'HTTP range differs from local APK');
  const afterResponse=await fetch(counterUrl);assert(afterResponse.ok,`Counter response ${afterResponse.status}`);const after=await afterResponse.json();
  assert(before.downloads===after.downloads,'Range request changed the download counter');
  const evidence={previousFullGetStatus:previous.status,previousFullGetSha256:previous.sha256,currentHeadStatus:head.status,currentRangeStatus:range.status,rangeBytes:bytes.length,contentRange:range.headers.get('content-range'),localSha256,localBytes,counterBefore:before.downloads,counterAfter:after.downloads,note:'Current HTTP transfer is limited to 32 APK bytes. Prior full GET 200 is retained from the preceding review; current local artifact SHA matches.'};
  assert(previous.status===200&&previous.sha256===localSha256,'Prior full GET evidence does not match current APK');
  fs.writeFileSync(path.join(output,'apk-preservation.json'),JSON.stringify(evidence,null,2)+'\n');report.artifacts.push('apk-preservation.json');return`Range 206/32 bytes; SHA unchanged; counter ${before.downloads} → ${after.downloads}; full GET not repeated`;
}

(async()=>{
  browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  let videoContext,videoPage;
  for(const [width,height] of [[320,568],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},screen:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    const page=await context.newPage();wire(page,`mobile-${width}`);await ready(page);
    let closedLayout;
    await check(`Mobile ${width} first view and compact mechanism spacing`,async()=>{
      assert(await page.locator('[data-showroom]').evaluate(element=>element.classList.contains('showroom-narrow')),'Narrow layout state is missing');
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await screenshot(page,`mobile-${width}x${height}-first-view.png`);
      const compact=await layout(page);report.geometry.push({case:'mobile-first-view',width,height,...compact});
      assert(compact.card.documentTop-compact.stage.documentTop<=96,`Blank space before selected slab is ${compact.card.documentTop-compact.stage.documentTop}px`);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert(overflow<=1,`Horizontal document overflow ${overflow}px`);
    });
    await check(`Mobile ${width} selects Tax with readable title, status and action`,async()=>{
      await choose(page,'progresskit-tax');await align(page);await collapsedReadable(page);await backgroundsInert(page);closedLayout=await layout(page);
      await screenshot(page,`mobile-${width}-tax-collapsed.png`);
    });
    await check(`Mobile ${width} exposes all fourteen projects through next`,async()=>{
      const expected=(await projects(page)).map(project=>project.id).sort(),seen=new Set();assert(expected.length===14,'Source catalogue is not 14 projects');
      for(let i=0;i<14;i++){seen.add(await active(page).getAttribute('data-project-id'));await page.locator('[data-showroom-step="1"]').click();}
      assert(JSON.stringify([...seen].sort())===JSON.stringify(expected),`Reached only ${seen.size} projects`);
      await choose(page,'progresskit-tax');await align(page);closedLayout=await layout(page);
    });
    await check(`Mobile ${width} Tax expands the same aluminum module in normal page flow`,async()=>{
      await choose(page,'progresskit-tax');await align(page);closedLayout=await layout(page);const original=await active(page).elementHandle();
      await expand(page);assert(await original.evaluate(element=>element===document.querySelector('.showroom-card.is-slice-expanded')),'Expansion replaced the selected module');await original.dispose();
      const source=(await projects(page)).find(project=>project.id==='progresskit-tax'),text=await body(page).innerText();assert(text.includes(source.summary)&&text.includes(source.problem),'Expanded Tax copy is incomplete');
      const natural=await opened(page).evaluate(card=>['.project-slice','[data-slice-panel]','.project-slice__body'].map(selector=>{const element=card.querySelector(selector),style=getComputedStyle(element);return{selector,overflowY:style.overflowY,maxHeight:style.maxHeight,height:element.clientHeight,scrollHeight:element.scrollHeight};}));
      for(const item of natural.filter(item=>item.selector!=='.project-slice'))assert(item.overflowY==='visible'&&item.scrollHeight<=item.height+1,`Nested or clipped Tax content: ${JSON.stringify(natural)}`);
      const full=await layout(page);report.geometry.push({case:'mobile-tax-expanded',width,height,closedLayout,full,natural});
      assert(full.card.height>closedLayout.card.height+100&&full.stage.height>closedLayout.stage.height+100&&full.documentHeight>closedLayout.documentHeight+100,'Open Tax did not increase module, stage and document heights');
      if(full.next&&closedLayout.next)assert(full.next.documentTop>closedLayout.next.documentTop+100,'Expanded Tax overlaps the following section instead of moving it');
      await screenshot(page,`mobile-${width}-tax-expanded-full-module.png`,opened(page));
    });
    await check(`Mobile ${width} reads full Tax by ordinary page scroll without nested scrolling`,async()=>{
      if(!await opened(page).count())await expand(page);
      await align(page);const native=await touchScroll(page);report.geometry.push({case:'native-tax-touch-scroll',width,...native});
      await opened(page).locator('.project-slice__technologies li').last().scrollIntoViewIfNeeded();await opened(page).locator('.project-slice__actions a').last().scrollIntoViewIfNeeded();
      const nested=await body(page).evaluate(element=>element.scrollTop);assert(nested===0,`Description scrolled internally to ${nested}`);
      await screenshot(page,`mobile-${width}-tax-actions-after-page-scroll.png`);
    });
    await check(`Mobile ${width} close restores natural stage height and usable focus`,async()=>{
      if(!await opened(page).count())await expand(page);
      await opened(page).locator('[data-slice-close]').scrollIntoViewIfNeeded();await opened(page).locator('[data-slice-close]').tap();await page.waitForFunction(()=>!document.querySelector('.showroom-card.is-slice-expanded'));
      const restored=await layout(page);assert(closedLayout,'No collapsed baseline');assert(closeEnough(restored.stage.height,closedLayout.stage.height)&&closeEnough(restored.documentHeight,closedLayout.documentHeight),`Obsolete expanded height remains: ${JSON.stringify({closedLayout,restored})}`);
      const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,blocked:!!document.activeElement.closest('[hidden],[inert],[aria-hidden="true"]')}));assert(!focus.blocked,`Close left focus hidden: ${JSON.stringify(focus)}`);
      await align(page);await collapsedReadable(page);report.geometry.push({case:'mobile-close-restored',width,restored});
    });
    await check(`Mobile ${width} wraps the longest catalogue project name without clipping`,async()=>{
      const longest=(await projects(page)).sort((a,b)=>[...b.name].length-[...a.name].length)[0];await choose(page,longest.id);await align(page);await collapsedReadable(page);await backgroundsInert(page);await screenshot(page,`mobile-${width}-longest-name.png`);return longest.name;
    });
    if(width===390){videoContext=context;videoPage=page;}else await context.close();
  }
  const mobile=videoPage;
  await check('Mobile to desktop resize preserves the open project and Escape restores focus',async()=>{
    await choose(mobile,'progresskit-tax');await expand(mobile);await mobile.setViewportSize({width:1440,height:900});await mobile.waitForTimeout(100);
    assert(!await mobile.locator('[data-showroom]').evaluate(element=>element.classList.contains('showroom-narrow')),'Narrow state remained after desktop resize');assert(await opened(mobile).getAttribute('data-project-id')==='progresskit-tax','Resize changed the opened project');
    const visible=await mobile.locator('.showroom-card:not(.is-orbit-hidden)').count();assert(visible===6,`Desktop orbit has ${visible} visible modules`);
    await screenshot(mobile,'orientation-mobile-to-desktop-open.png');await mobile.keyboard.press('Escape');await mobile.waitForFunction(()=>!document.querySelector('.showroom-card.is-slice-expanded'));
    const focus=await mobile.evaluate(()=>({blocked:!!document.activeElement.closest('[hidden],[inert],[aria-hidden="true"]'),project:document.activeElement.getAttribute('data-showroom-open'),viewport:document.activeElement.matches('[data-showroom-viewport]')}));assert(!focus.blocked&&(focus.project||focus.viewport),`Resize/Escape left unusable focus: ${JSON.stringify(focus)}`);
    await mobile.setViewportSize({width:390,height:844});await mobile.waitForTimeout(100);assert(await mobile.locator('[data-showroom]').evaluate(element=>element.classList.contains('showroom-narrow')),'Mobile state did not return');
  });
  await check('Actual mobile Tax selection, natural page scroll and close recording',async()=>{await ready(mobile);await choose(mobile,'glikemia-premium');await align(mobile);return clip(mobile);});
  await check('Services and collaboration show their material surfaces and readable actions',async()=>{
    for(const [selector,name] of [['#uslugi','services-material-mobile.png'],['.collaboration','collaboration-material-mobile.png']]){const element=mobile.locator(selector);await element.scrollIntoViewIfNeeded();await screenshot(mobile,name,element);}
    const styles=await mobile.locator('#uslugi li,.collaboration,.collaboration h3,.collaboration p,.collaboration a,.brief textarea').evaluateAll(elements=>elements.map(element=>{const style=getComputedStyle(element);return{selector:element.matches('li')?'service':element.className||element.tagName,text:(element.innerText||'').trim().slice(0,80),color:style.color,backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage,borderColor:style.borderColor,fontSize:style.fontSize,lineHeight:style.lineHeight};}));
    assert(styles.length>=10,'Missing services or collaboration material samples');assert(styles.filter(item=>item.selector==='service').every(item=>item.backgroundImage!=='none'||item.backgroundColor!=='rgba(0, 0, 0, 0)'),'Service chips have no material surface');
    fs.writeFileSync(path.join(output,'services-collaboration-styles.json'),JSON.stringify({note:'Computed colors and surfaces for visual review; gradient contrast is not reported as an automatic WCAG measurement.',styles},null,2)+'\n');report.artifacts.push('services-collaboration-styles.json');
  });
  await check('Kontakt and Usługi links reach their existing sections',async()=>{
    for(const hash of ['#kontakt','#uslugi']){await mobile.locator(`.hero__commercial-actions a[href="${hash}"]`).click();await mobile.waitForURL(url=>url.hash===hash);assert(await mobile.locator(hash).isVisible(),`${hash} target is hidden`);}
    const mailto=await mobile.locator('a[href^="mailto:"]').first().getAttribute('href');assert(/^mailto:[^@\s?]+@[^@\s?]+\.[^@\s?]+/.test(mailto),'Invalid contact email action');return'Both anchors reached; email inspected without sending';
  });
  await videoContext.close();
  for(const [width,height]of[[1440,900],[1366,768]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();wire(page,`desktop-${width}`);await ready(page);
    await check(`Desktop ${width} first view retains the six-module orbit`,async()=>{
      assert(!await page.locator('[data-showroom]').evaluate(element=>element.classList.contains('showroom-narrow')),'Desktop incorrectly uses narrow layout');assert(await page.locator('.showroom-card:not(.is-orbit-hidden)').count()===6,'Desktop orbit no longer has six visible modules');await screenshot(page,`desktop-${width}x${height}-first-view.png`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'Desktop horizontal overflow');
    });
    await check(`Desktop ${width} hover expansion keeps its existing bounded panel`,async()=>{
      await page.mouse.move(10,120);await active(page).locator('[data-showroom-open]').hover();await opened(page).waitFor();await page.waitForTimeout(350);
      const bounds=await opened(page).evaluate(element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,bodyOverflow:getComputedStyle(element.querySelector('.project-slice__body')).overflowY};});assert(bounds.x>=-1&&bounds.y>=-1&&bounds.right<=bounds.width+1&&bounds.bottom<=bounds.height+1,`Desktop panel outside viewport: ${JSON.stringify(bounds)}`);assert(bounds.bodyOverflow==='auto','Desktop description scroll behavior changed');await screenshot(page,`desktop-${width}-expanded-smoke.png`);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.showroom-card.is-slice-expanded'));
    });await context.close();
  }
  await check('APK bytes, prior full-download proof and range-safe counter are preserved',apkPreserved);
  record('No browser JavaScript errors',report.pageErrors.length===0,`${report.pageErrors.length} errors`);record('No failed browser requests',report.failedRequests.length===0,`${report.failedRequests.length} failures`);record('No browser HTTP errors',report.httpErrors.length===0,`${report.httpErrors.length} errors`);
})().catch(error=>record('Focused harness completed',false,error.stack||error.message)).finally(async()=>{
  await browser?.close();report.finishedAt=new Date().toISOString();report.totals={PASS:report.checks.filter(item=>item.result==='PASS').length,FAIL:report.checks.filter(item=>item.result==='FAIL').length};fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(`REPORT ${path.join(output,'browser-report.json')} ${JSON.stringify(report.totals)}\n`);process.exitCode=report.totals.FAIL?1:0;
});
