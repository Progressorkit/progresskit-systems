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


;
(async()=>{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});try{const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const page=await context.newPage();wire(page,'mobile-final-video');await ready(page);await choose(page,'glikemia-premium');await align(page);const details=await clip(page);fs.writeFileSync(path.join(output,'video-refresh.json'),JSON.stringify({result:'PASS',details,recordedAt:new Date().toISOString()},null,2)+'\n');console.log(details);}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
