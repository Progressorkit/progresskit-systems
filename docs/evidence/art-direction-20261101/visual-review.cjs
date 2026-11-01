'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
// Use the installed system encoder through an owned, task-local Playwright cache.
const videoCache='/tmp/progresskit-art-direction-20261101-playwright';
const encoder=path.join(videoCache,'ffmpeg-1011','ffmpeg-linux');
fs.mkdirSync(path.dirname(encoder),{recursive:true});
if(!fs.existsSync(encoder))fs.symlinkSync('/usr/bin/ffmpeg',encoder);
process.env.PLAYWRIGHT_BROWSERS_PATH=videoCache;
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PK_ART_BASE||'http://127.0.0.1:8191/';
const mode=process.argv[2]||'final';
const out=path.join(__dirname,['final-behavior-retry','final-videos-retry','final-mobile-fix'].includes(mode)?'final-fixed':mode);fs.mkdirSync(out,{recursive:true});
const report={base,mode,scope:'Local Chrome viewport emulation; no physical-device or production evidence',checks:[],screenshots:[],runtimeErrors:[],networkFailures:[],videos:[]};
const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok)console.error('FAIL:',name,details);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function startPage(browser,size,extra={}){
 const context=await browser.newContext({viewport:size,isMobile:size.width<701,hasTouch:size.width<701,...extra});const page=await context.newPage();
 page.on('pageerror',error=>report.runtimeErrors.push({size,message:error.message}));
 page.on('console',message=>{if(message.type()==='error')report.runtimeErrors.push({size,message:message.text(),kind:'console.error'});});
 page.on('requestfailed',request=>{if(!request.failure()?.errorText.includes('ERR_ABORTED'))report.networkFailures.push({size,url:request.url(),error:request.failure()?.errorText});});
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
 return {context,page};
}
async function shot(page,prefix,label,selector=null,full=false){
 if(selector&&await page.locator(selector).count()){
  await page.locator(selector).first().evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-88,behavior:'instant'}));await page.waitForTimeout(800);
 }
 await page.waitForFunction(()=>Array.from(document.images).filter(image=>{const r=image.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}).every(image=>image.complete&&image.naturalWidth>0),null,{timeout:10000});
 await page.waitForTimeout(120);
 const hiddenReveal=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-reveal]')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>85&&r.top<innerHeight&&parseFloat(getComputedStyle(el).opacity)<.95;}).map(el=>({tag:el.tagName,id:el.id,class:el.className,opacity:getComputedStyle(el).opacity})));
 check(`${prefix} ${label}: captured content is fully revealed`,hiddenReveal.length===0,hiddenReveal);
 const file=path.join(out,`${prefix}-${label}.png`);await page.screenshot({path:file,fullPage:full});report.screenshots.push(path.relative(__dirname,file));return file;
}
async function overflow(page,label){const d=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));check(`${label}: no horizontal overflow`,d.documentWidth<=d.width+1,d);}
async function clickMoving(page,locator){await locator.evaluate(el=>{const r=el.getBoundingClientRect();if(r.top<90||r.bottom>innerHeight)scrollTo({top:scrollY+r.top-100,behavior:'instant'});});const box=await locator.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
async function openActive(page){await page.locator('.showroom-card.is-active [data-showroom-open]').click();await page.locator('.showroom-card.is-slice-expanded').waitFor();await page.waitForTimeout(750);}
async function capture(browser,size,final=false){
 const {context,page}=await startPage(browser,size),prefix=`${size.width}x${size.height}`;
 try{
 await shot(page,prefix,'first');await overflow(page,prefix);
 const count=await page.locator('.showroom-card').count();check(`${prefix}: all catalogue projects retained`,count===14,{count});
 await shot(page,prefix,'projects','#projekty');
 if(final||mode.startsWith('phase'))await shot(page,prefix,'showroom-stage','.showroom-viewport');
 await openActive(page);await shot(page,prefix,'project-expanded','.showroom-card.is-slice-expanded');await overflow(page,`${prefix} expanded`);
 const media=await page.locator('.is-slice-expanded .project-slice__media img').evaluateAll(images=>images.map(i=>({complete:i.complete,naturalWidth:i.naturalWidth,src:i.getAttribute('src')})));
 check(`${prefix}: expanded real product media loaded`,media.length>0&&media.every(i=>i.complete&&i.naturalWidth>0),media);
 await page.keyboard.press('Escape');await page.waitForTimeout(250);
 if(final){
  for(const [label,selector] of [['services','#uslugi'],['ecosystem','#ekosystem'],['process','#proces'],['about','#o-mnie'],['contact','#kontakt'],['brief','#brief'],['footer','body>footer']]){
   if(await page.locator(selector).count()){await shot(page,prefix,label,selector);await overflow(page,`${prefix} ${label}`);}else check(`${prefix}: ${label} section exists`,false,{selector});
  }
  const email=await page.locator('.contact__email').getAttribute('href');check(`${prefix}: public contact address`,email==='mailto:pawel@progresskit.pl',{email});
  await clickMoving(page,page.locator('[data-ecosystem-select="translator"]'));check(`${prefix}: ecosystem selection`,await page.locator('[data-ecosystem-map]').getAttribute('data-selected-node')==='translator',{});
  await page.locator('[data-ecosystem-select="translator"]').focus();await page.keyboard.press('ArrowRight');check(`${prefix}: ecosystem keyboard traversal`,await page.evaluate(()=>document.activeElement.dataset.ecosystemSelect)==='agents',{});
 }
 }finally{await context.close();}
}
async function behavior(browser){
 const {context,page}=await startPage(browser,{width:1440,height:900});
 try{
 const viewport=page.locator('.showroom-viewport');await viewport.focus();await page.keyboard.press('End');await page.waitForTimeout(700);
 check('Keyboard End reaches last project',await page.locator('.showroom-card.is-active').getAttribute('data-project-id')==='progresskit-infrastructure',{});
 await page.keyboard.press('Home');await page.waitForTimeout(700);await page.keyboard.press('Enter');await page.locator('.is-slice-expanded').waitFor();await page.keyboard.press('Escape');
 check('Enter/Escape restore triggering project focus',await page.evaluate(()=>document.activeElement.dataset.showroomOpen)==='glikemia-premium',{});
 const production=[];
 for(const fraction of [0,.25,.5,.8,1]){
  await page.locator('.production-line').evaluate((el,part)=>{const r=el.getBoundingClientRect(),travel=Math.max(r.height,innerHeight*.42);scrollTo({top:scrollY+r.top-innerHeight*.72+travel*part,behavior:'instant'});},fraction);
  await page.waitForFunction(expected=>{const line=document.querySelector('.production-line'),value=parseFloat(line.style.getPropertyValue('--process-progress'));return Number.isFinite(value)&&Math.abs(value-expected)<.03;},fraction,{timeout:10000});
  production.push(await page.locator('.production-line').evaluate(el=>({progress:parseFloat(el.style.getPropertyValue('--process-progress')),states:Array.from(el.querySelectorAll('[data-production-stage]')).map(stage=>stage.dataset.productionState)})));
 }
 check('Scroll activates engineering stations in order',production.every((row,index)=>Number.isFinite(row.progress)&&row.progress>=0&&row.progress<=1&&row.states.length===6&&row.states.filter(s=>s==='active').length<=1&&(index===0||row.progress>=production[index-1].progress))&&production[4].progress>=.98,production);
 await page.locator('.service-zone').first().scrollIntoViewIfNeeded();const surface=page.locator('.service-zone').first(),surfaceBox=await surface.boundingBox();await page.mouse.move(surfaceBox.x+surfaceBox.width*.25,surfaceBox.y+surfaceBox.height*.75);await page.waitForTimeout(100);
 const pointer=await surface.evaluate(el=>({quality:document.documentElement.dataset.interfaceQuality,x:el.style.getPropertyValue('--world-x'),y:el.style.getPropertyValue('--world-y'),tiltX:el.style.getPropertyValue('--world-tilt-x'),tiltY:el.style.getPropertyValue('--world-tilt-y')}));
 check('Surface reflection follows desktop pointer within its motion budget',pointer.quality==='full'?Boolean(pointer.x&&pointer.y)&&Math.abs(parseFloat(pointer.tiltX))<=1.21&&Math.abs(parseFloat(pointer.tiltY))<=1.21:!pointer.x&&!pointer.y,pointer);
 await page.locator('[data-showroom-motion-toggle]').click();await page.waitForTimeout(100);
 check('User motion pause is shared',await page.locator('html').getAttribute('data-interface-motion')==='paused',{});
 await page.locator('[data-showroom-motion-toggle]').click();
 await page.locator('#brief-problem').fill('Synthetic art-direction QA fixture');
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-download-brief]').click();const download=await downloadPromise;
 const downloaded=fs.readFileSync(await download.path(),'utf8');
 check('Local brief export retains entered text and public contact',downloaded.includes('Synthetic art-direction QA fixture')&&downloaded.includes('pawel@progresskit.pl'),{suggestedFilename:download.suggestedFilename()});
 await page.locator('#brief-problem').fill('');
 const primary=page.locator('#brief a.cta--primary'),mailAction={label:(await primary.innerText()).trim(),href:await primary.getAttribute('href')};
 check('Contact primary action keeps public email and requested label',mailAction.label.replace(/[↗→]/g,'').trim().toLocaleUpperCase('pl-PL')==='WYŚLIJ PROJEKT'&&mailAction.href.startsWith('mailto:pawel@progresskit.pl'),mailAction);
 await page.locator('#brief-problem').focus();
 const focus=await page.locator('#brief-problem').evaluate(el=>({focused:document.activeElement===el,outline:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth)}));
 check('Brief field focus remains clearly styled',focus.focused&&focus.outline!=='none'&&focus.width>=1,focus);
 await shot(page,'1440x900','brief-focused','#brief');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
 check('Reduced motion pauses shared effects',await page.locator('html').getAttribute('data-interface-motion')==='paused',{});
 const staticStages=await page.locator('.production-line').evaluate(el=>({progress:parseFloat(el.style.getPropertyValue('--process-progress')),states:Array.from(el.querySelectorAll('[data-production-stage]')).map(stage=>stage.dataset.productionState)}));
 check('Reduced motion presents all six process stages statically',staticStages.progress===1&&staticStages.states.length===6&&staticStages.states.every(state=>state==='complete'),staticStages);
 const running=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).map(a=>({name:a.animationName,selector:a.effect.target?.className})));
 check('Reduced motion has no running infinite decorative animations',running.length===0,running);
 await shot(page,'1440x900','reduced-motion','#projekty');
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
 await shot(page,'1440x900','forced-colors-hero','#start');
 const contrast=await page.locator('.stone-line').first().evaluate(el=>({fill:getComputedStyle(el).webkitTextFillColor,color:getComputedStyle(el).color,background:getComputedStyle(document.body).backgroundColor}));
 check('Forced colors keeps hero inscription readable',contrast.fill!=='rgba(0, 0, 0, 0)'&&contrast.color!==contrast.background,contrast);
 await shot(page,'1440x900','forced-colors-brief','#brief');
 const field=await page.locator('#brief-problem').evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,visible:el.getBoundingClientRect().height>0}));
 check('Forced colors keeps brief fields visible and contrasting',field.visible&&field.color!==field.background,field);
 await page.emulateMedia({media:'print',forcedColors:'none',reducedMotion:'reduce'});
 await shot(page,'1440x900','print-brief','#brief');
 const print=await page.locator('#brief').evaluate(el=>({display:getComputedStyle(el).display,opacity:getComputedStyle(el).opacity,fields:el.querySelectorAll('textarea').length,visibleFields:Array.from(el.querySelectorAll('textarea')).filter(field=>field.getBoundingClientRect().height>0&&getComputedStyle(field).visibility!=='hidden').length}));
 check('Print layout retains the complete readable local brief',print.display!=='none'&&print.opacity==='1'&&print.fields===6&&print.visibleFields===6,print);
 }finally{await context.close();}
 const mobile=await startPage(browser,{width:390,height:844});
 try{
 const {page}=mobile;
 await openActive(page);await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);await overflow(page,'Mobile orientation with project expanded');await shot(page,'844x390','orientation-expanded','.is-slice-expanded');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await shot(page,'390x844','orientation-return','#projekty');
 await page.locator('.menu-btn').click();check('Mobile menu opens',await page.locator('.menu-btn').getAttribute('aria-expanded')==='true',{});await page.keyboard.press('Escape');check('Mobile menu Escape closes',await page.locator('.menu-btn').getAttribute('aria-expanded')==='false',{});
 await shot(page,'390x844','mobile-navigation');
 const cdp=await mobile.context.newCDPSession(page);
 async function swipe(dx,dy){
  await page.locator('.showroom-viewport').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-90,behavior:'instant'}));
  const r=await page.locator('.showroom-viewport').boundingBox(),x=r.x+r.width*.72,y=Math.min(650,r.y+Math.min(r.height*.6,350));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let step=1;step<=6;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/6,y:y+dy*step/6,id:1}]});await page.waitForTimeout(30);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(750);
 }
 const before=await page.locator('.showroom-card.is-active').getAttribute('data-project-id');await swipe(-160,0);const after=await page.locator('.showroom-card.is-active').getAttribute('data-project-id');
 check('Mobile horizontal touch changes selection without opening a panel',before!==after&&await page.locator('.is-slice-expanded').count()===0,{before,after});
 const scrollBefore=await page.evaluate(()=>scrollY);await swipe(0,-140);const scrollAfter=await page.evaluate(()=>scrollY),selectionAfter=await page.locator('.showroom-card.is-active').getAttribute('data-project-id');
 check('Mobile vertical touch scroll preserves selected project',Math.abs(scrollAfter-scrollBefore)>30&&selectionAfter===after,{scrollBefore,scrollAfter,selection:selectionAfter});
 }finally{await mobile.context.close();}
 const fallback=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
 try{
 const page=await fallback.newPage();await page.goto(base,{waitUntil:'networkidle'});
 check('No-JavaScript catalogue retains all real product routes',await page.locator('.showroom-card [data-showroom-open][href^="projekty/"]').count()===14,{});
 check('No-JavaScript ecosystem descriptions remain available',await page.locator('.ecosystem-node__detail:visible').count()===6,{});
 }finally{await fallback.close();}
}
async function video(browser,size,name){
 const raw=path.join(out,'video-raw',name);fs.mkdirSync(raw,{recursive:true});
 const {context,page}=await startPage(browser,size,{recordVideo:{dir:raw,size}});
 const recording=page.video();
 try{
 await page.waitForTimeout(700);await page.mouse.move(size.width*.58,size.height*.28,{steps:14});await page.waitForTimeout(500);
 await page.locator('#projekty').evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'start'}));await page.waitForTimeout(1100);
 await page.locator('#showroom-next').click();await page.waitForTimeout(750);await openActive(page);await page.waitForTimeout(800);
 await page.locator('.is-slice-expanded .project-slice__actions').scrollIntoViewIfNeeded();await page.waitForTimeout(650);await page.keyboard.press('Escape');
 for(const selector of ['#uslugi','#ekosystem','#proces','#kontakt','#brief','body>footer'])if(await page.locator(selector).count()){
  await page.locator(selector).evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'start'}));await page.waitForTimeout(750);
  if(selector==='#ekosystem'){await clickMoving(page,page.locator('[data-ecosystem-select="translator"]'));await page.waitForTimeout(650);}
 }
 await page.waitForTimeout(600);
 }finally{await context.close();}
 const source=await recording.path(),dest=path.join(out,`${name}.mp4`);
 cp.execFileSync('/usr/bin/ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-crf','24',dest]);
 const probe=JSON.parse(cp.execFileSync('/usr/bin/ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',dest],{encoding:'utf8'}));
 report.videos.push({path:path.relative(__dirname,dest),...probe});
}
(async()=>{
 let browser;
 try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 if(mode==='before'){await capture(browser,{width:1440,height:900});await capture(browser,{width:320,height:568});}
 else if(mode.startsWith('phase')){await capture(browser,{width:1440,height:900});await capture(browser,{width:390,height:844});}
 else {
  if(!['final-behavior-retry','final-videos-retry'].includes(mode))for(const size of (mode==='final-mobile-fix'?[{width:320,height:568},{width:390,height:844}]:[{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080},{width:320,height:568},{width:390,height:844}]))await capture(browser,size,true);
  if(mode!=='final-videos-retry')await behavior(browser);await video(browser,{width:1440,height:900},'desktop-interaction');await video(browser,{width:390,height:844},'mobile-interaction');
  check('Both interaction recordings are H.264 at their requested sizes',report.videos.length===2&&report.videos.every(v=>v.streams.some(s=>s.codec_name==='h264')&&Number(v.format.duration)>5),report.videos);
 }
 }catch(error){report.fatal={message:error.message,stack:error.stack};report.checks.push({name:'Browser execution completed',status:'BLOCKED',details:error.message});console.error(error);process.exitCode=1;}
 finally{
 if(browser)await browser.close();
 check('No browser runtime errors',report.runtimeErrors.length===0,report.runtimeErrors);
 check('No failed local asset requests',report.networkFailures.length===0,report.networkFailures);
 report.totals={PASS:report.checks.filter(c=>c.status==='PASS').length,FAIL:report.checks.filter(c=>c.status==='FAIL').length,BLOCKED:report.checks.filter(c=>c.status==='BLOCKED').length};
 fs.writeFileSync(path.join(out,mode==='final-behavior-retry'?'behavior-retry-report.json':mode==='final-videos-retry'?'videos-retry-report.json':mode==='final-mobile-fix'?'mobile-fix-retry-report.json':'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({mode,...report.totals,screenshots:report.screenshots.length,videos:report.videos.length,fatal:report.fatal?.message}));if(report.totals.FAIL)process.exitCode=1;
 }
})();
