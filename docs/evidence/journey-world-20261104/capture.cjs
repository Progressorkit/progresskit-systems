process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/pk-hero-playwright';
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const out=__dirname,base='http://127.0.0.1:8214/';
const report={ownerVisualApproval:'OPEN',mobile:'Chrome touch emulation; physical device NOT_RUN',pointer:'Recording-only normal arrow follows actual pointer events. Product cursor is unchanged.',errors:[],timeline:[],screens:[],idleStops:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
try{for(const mobile of [false,true]){
 const name=mobile?'mobile':'desktop',width=mobile?390:1440,height=mobile?844:900;
 const ctx=await b.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,recordVideo:{dir:path.join(out,'raw-video'),size:{width,height}}});
 const p=await ctx.newPage(),start=Date.now();p.on('pageerror',e=>report.errors.push({video:name,message:e.message}));
 const mark=chapter=>report.timeline.push({video:name,seconds:+((Date.now()-start)/1000).toFixed(2),chapter});
 const shot=async label=>{const file=`${name}-${label}.png`;await p.screenshot({path:path.join(out,file)});report.screens.push(file);};
 const go=async(sel,block='center')=>{await p.mouse.move(5,80);await p.locator(sel).first().evaluate((e,block)=>e.scrollIntoView({block,behavior:'smooth'}),block);await p.waitForTimeout(1600);};
 const idle=async label=>{mark(label);const duration=mobile?2200:5500;await p.waitForTimeout(duration);report.idleStops.push({video:name,chapter:label,durationMs:duration});};
 const approach=async sel=>{if(mobile)return;const r=await p.locator(sel).first().boundingBox();if(!r)return;const y=Math.max(95,Math.min(height-30,r.y+r.height*.5)),x=Math.min(width-20,r.x+r.width+18);await p.mouse.move(Math.min(width-10,x+150),y,{steps:30});await p.waitForTimeout(650);await p.mouse.move(x,y,{steps:35});await p.waitForTimeout(1700);};
 await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');
 if(!mobile)await p.evaluate(()=>{const e=document.createElement('div');e.style.cssText='position:fixed;left:-100px;top:-100px;z-index:2147483647;pointer-events:none';e.innerHTML='<svg width="17" height="23" viewBox="0 0 17 23"><path d="M1 1v18l4-4 3 7 3-1-3-7h7Z" fill="#e9e5e0" stroke="#171316" stroke-width="1.2"/></svg>';document.body.append(e);document.addEventListener('pointermove',p=>{e.style.left=p.clientX+'px';e.style.top=p.clientY+'px';});});
 await idle('HERO — atmosfera w bezruchu');await shot('hero');
 if(!mobile){mark('HERO — reakcja światła na kursor');await p.mouse.move(400,260,{steps:45});await p.waitForTimeout(1200);await p.mouse.move(1190,510,{steps:55});await p.waitForTimeout(1400);await approach('#start .cta--primary');await shot('hero-proximity');}
 mark('Wejście do Core');await p.locator('.hero-machine').click();await p.waitForTimeout(1800);await p.mouse.move(5,80);await idle('CORE — oddech materiału i żar');await shot('core');await approach('[data-hero-enter]');await shot('core-proximity');
 mark('CORE → SHOWROOM — ciągłe przejście');await p.locator('[data-hero-enter]').click();await p.waitForTimeout(450);await shot('transition');await p.waitForFunction(()=>document.querySelector('#rdzen').dataset.entryState==='showroom');await p.waitForFunction(()=>document.querySelector('#projekty').showroom3D.metrics().phases.every(c=>c.phase==='ready'));await p.mouse.move(5,80);await idle('SHOWROOM — różne szlify, grubość i głębia');await shot('showroom');
 if(!mobile){await approach('.showroom-card.is-active');await shot('crystal-proximity');const r=await p.locator('.showroom-card.is-active').boundingBox();await p.mouse.move(r.x+r.width*.5,r.y+r.height*.35,{steps:25});await p.waitForTimeout(1600);await shot('project-guide');if(await p.locator('.guide-close').isVisible())await p.locator('.guide-close').click();}
 mark('SHOWROOM — fizyczne selektory');await go('.showroom-gates');await p.waitForTimeout(mobile?1800:2800);await shot('selectors');await approach('[data-showroom-category="saas"]');await p.locator('[data-showroom-category="saas"]').click();await p.waitForTimeout(350);await shot('selector-active');await p.waitForTimeout(1500);await p.locator('.showroom-all').click();await p.waitForTimeout(1700);
 mark('USŁUGI — obiekty i płynne opuszczenie strefy');await go('.service-zone--systems');await p.waitForTimeout(mobile?1800:3500);await shot('services');await go('#uslugi .services-actions');await p.waitForTimeout(1800);await shot('services-process-handoff');
 await go('[data-production-stage="design"]');await idle('PROCESS — połączone mechaniczne etapy');if(!mobile){await p.mouse.move(310,490,{steps:35});await p.waitForTimeout(800);await p.mouse.move(1110,440,{steps:40});await p.waitForTimeout(1200);}await shot('process');
 await go('[data-production-stage="security"]');await p.waitForTimeout(mobile?1800:3500);await shot('process-security');
 await go('.ecosystem-system');await idle('ECOSYSTEM — przewody i różne plany');if(!mobile){await p.locator('[data-ecosystem-node="translator"] .ecosystem-node__trigger').hover();await p.waitForTimeout(1800);}await shot('ecosystem');
 mark('TECHNOLOGIES — komora laboratoryjna');await go('[data-technology-family="data"] summary');await p.waitForTimeout(mobile?1700:3000);await shot('technology');await p.locator('[data-technology-family="data"] summary').click();await p.waitForTimeout(1400);await go('[data-technology-family="data"] .technology-chips');await p.waitForTimeout(1700);await shot('technology-details');
 await go('#kontakt');await idle('CONTACT — spokojna konsola optyczna');if(!mobile){await p.mouse.move(400,480,{steps:35});await p.waitForTimeout(900);await p.mouse.move(1030,550,{steps:40});await p.waitForTimeout(1000);}await shot('contact');
 mark('BRIEF — zagłębione pola i focus');await go('#brief .brief-grid label');await p.locator('#brief textarea').first().focus();await p.waitForTimeout(2300);await shot('brief-focus');
 report.timeline.push({video:name,seconds:+((Date.now()-start)/1000).toFixed(2),chapter:'Koniec'});
 const video=p.video();await ctx.close();await video.saveAs(path.join(out,name+'.webm'));fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2));console.log(name,'captured');
}}finally{await b.close();fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2));}if(report.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
