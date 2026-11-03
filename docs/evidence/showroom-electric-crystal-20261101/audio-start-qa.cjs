'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'final'),report={checks:[],errors:[],notes:['Focused follow-up of an intermittent first opt-in suspension; each case uses a fresh page/audio context.']};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [label,wakeDelay,hoverMail] of [['Dormant core',null,false],['During materialization',150,false],['Original late-hover scenario',1600,true],['Settled collection',2100,true]]){
   const page=await browser.newPage({viewport:{width:1440,height:1050}});
   page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
   await page.addInitScript(()=>{
    window.__audioStart={contexts:[],events:[]};const Native=window.AudioContext;
    window.AudioContext=class extends Native{constructor(){super();this.gains=[];window.__audioStart.contexts.push(this);this.addEventListener('statechange',()=>window.__audioStart.events.push({t:performance.now(),state:this.state,classes:document.querySelector('#projekty')?.className,motion:document.documentElement.dataset.interfaceMotion,hidden:document.hidden}));}createGain(){const gain=super.createGain();this.gains.push(gain);return gain;}};
   });
   await page.goto('http://127.0.0.1:8191/',{waitUntil:'networkidle'});
   await page.locator('.showroom-viewport').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:'instant'}));await page.waitForTimeout(650);
   if(wakeDelay!==null){await page.locator('[data-capsule-toggle]').hover();await page.waitForTimeout(wakeDelay);if(hoverMail){await page.locator('[data-showroom-open="progresskit-mail"]').hover();await page.waitForTimeout(400);}}
   const untouched=await page.evaluate(()=>window.__audioStart.contexts.length===0);const beforeClick=await page.locator('#projekty').evaluate(e=>({phase:e.dataset.matterPhase,awake:e.classList.contains('is-awake')}));
   await page.locator('[data-capsule-audio]').click();await page.waitForTimeout(800);
   const snapshot=()=>page.evaluate(()=>({contexts:window.__audioStart.contexts.length,state:window.__audioStart.contexts[0]?.state,level:window.__audioStart.contexts[0]?.gains[0].gain.value,events:window.__audioStart.events.slice(),classes:document.querySelector('#projekty').className,motion:document.documentElement.dataset.interfaceMotion}));
   const after800ms=await snapshot();let ready=true;
   try{await page.waitForFunction(()=>window.__audioStart.contexts[0]?.state==='running'&&window.__audioStart.contexts[0]?.gains[0].gain.value>.001,undefined,{timeout:2200});}catch(error){if(error.name!=='TimeoutError')throw error;ready=false;}
   const final=await snapshot();report.checks.push({name:label+' first explicit hum opt-in is running at 800 ms',status:untouched&&after800ms.state==='running'&&after800ms.level>0&&after800ms.level<.05&&final.contexts===1?'PASS':'FAIL',details:{untouched,beforeClick,after800ms,readyWithinThreeSeconds:ready,final}});
   await page.close();
  }
  report.checks.push({name:'No JavaScript or CSP errors',status:report.errors.length?'FAIL':'PASS',details:report.errors});
 }catch(error){report.errors.push(error.stack);report.checks.push({name:'Focused audio QA completed',status:'FAIL',details:error.message});}
 finally{await browser.close();report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(path.join(out,'qa-audio-start.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,errors:report.errors}));if(report.FAIL)process.exitCode=1;}
})().catch(error=>{console.error(error);process.exitCode=1;});
