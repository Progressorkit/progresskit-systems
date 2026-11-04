'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH='/tmp/pk-hero-playwright';
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const mobile=process.argv[2]==='mobile',name=mobile?'mobile':'desktop',width=mobile?390:1440,height=mobile?844:900;
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
 const ctx=await b.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,recordVideo:{dir:__dirname+'/raw-video',size:{width,height}}});
 const p=await ctx.newPage(),report={name,width,height,ownerVisualApproval:'OPEN',capture:'Actual Chrome viewport; continuous timed scroll and native core activation, no cuts or accelerated footage.',timeline:[],errors:[]};let start=Date.now();
 const mark=chapter=>{const m={seconds:+((Date.now()-start)/1000).toFixed(2),chapter};report.timeline.push(m);console.log(m);};
 const dwell=ms=>p.waitForTimeout(ms);
 const move=async(target,speed=mobile?250:105)=>p.evaluate(({target,speed})=>new Promise(resolve=>{const from=scrollY,to=Math.max(0,Math.min(target,document.documentElement.scrollHeight-innerHeight));const duration=Math.abs(to-from)/speed*1000,start=performance.now();function tick(now){const t=duration?Math.min(1,(now-start)/duration):1;scrollTo({top:from+(to-from)*t,behavior:'instant'});if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);}),{target,speed});
 const top=selector=>p.locator(selector).first().evaluate(e=>e.getBoundingClientRect().top+scrollY);
 p.on('pageerror',e=>report.errors.push(e.message));
 try{
  await p.goto('http://127.0.0.1:8211/');await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');await p.evaluate(()=>document.fonts.ready);await p.mouse.move(8,80);mark('Hero — wspólna komnata, światło i atmosfera');await dwell(4500);
  const core=await top('#rdzen'),showroom=await top('#projekty');
  mark('HERO → CORE — powolny przejazd do granicy');await move(core-height/2);mark('HERO → CORE — kadr na granicy');await dwell(mobile?3000:5500);
  await move(core-50);mark('Core — puls');await dwell(4000);
  mark('Kliknięcie logo — ciągłe przejście i materializacja');await p.locator('[data-hero-enter]').click();await p.waitForFunction(()=>document.querySelector('#rdzen').dataset.entryState==='showroom');await dwell(5000);
  mark('CORE → showroom — powrót do granicy');await move(showroom-height/2,mobile?280:180);await dwell(mobile?3000:5500);
  const viewport=await top('.showroom-viewport');await move(viewport-80,mobile?250:150);mark('Showroom — ciemne szkło w tym samym świecie');await dwell(5000);
  const edges=await p.evaluate(()=>[...document.querySelectorAll('#main>section,#main>.installation-console,body>footer')].map(e=>({id:e.id||(e.tagName==='FOOTER'?'footer':'kontakt'),y:e.getBoundingClientRect().top+scrollY})).filter(x=>!['start','rdzen','projekty'].includes(x.id)));
  let previous='showroom';
  for(const edge of edges){mark(previous+' → '+edge.id+' — ciągły scroll');await move(edge.y-height/2);mark(previous+' → '+edge.id+' — kadr graniczny');await dwell(mobile?2200:5000);previous=edge.id;
   if(edge.id==='technologie'&&!mobile){
    await move(edge.y+50);await dwell(2500);mark('Technologie → Ekosystem — powrót przez zachowany układ treści');await move(await top('#ekosystem')-80,200);await dwell(4000);mark('Powrót w głąb instalacji do Technologii');await move(edge.y+50,330);await dwell(2500);
   }
  }
  await move(await top('body>footer')+height/3,mobile?180:95);mark('Footer — wspólne światło i cząstki');await dwell(4500);
  report.final=await p.evaluate(()=>({ambient:document.querySelector('#start').installation.metrics(),scene:document.querySelector('#projekty').showroom3D.metrics(),scrollWidth:document.documentElement.scrollWidth}));assert.equal(report.final.scrollWidth,width);assert.deepEqual(report.errors,[]);report.status='CAPTURED';
 }finally{const video=p.video();await ctx.close();await video.saveAs(path.join(__dirname,name+'.webm'));report.durationSeconds=+((Date.now()-start)/1000).toFixed(2);await b.close();fs.writeFileSync(__dirname+'/walkthrough-'+name+'.json',JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
