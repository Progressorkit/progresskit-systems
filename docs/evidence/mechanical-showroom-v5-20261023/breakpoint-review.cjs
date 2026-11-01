'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
try{for(const width of [700,701,768,900,1024,1100,1101,1280]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:8130/',{waitUntil:'networkidle'});
 const result=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,cards:[...document.querySelectorAll('.showroom-card:not(.is-orbit-hidden)')].map(el=>{const r=el.getBoundingClientRect(),open=el.querySelector('.showroom-card__open'),title=el.querySelector('h3').getBoundingClientRect(),stage=el.querySelector('.showroom-card__stage').getBoundingClientRect(),action=el.querySelector('.showroom-card__action').getBoundingClientRect();return{id:el.dataset.projectId,rect:r.toJSON(),readable:title.top>=r.top&&action.bottom<=r.bottom&&title.bottom<=stage.top+1&&stage.bottom<=action.top+1,contentHeight:open.scrollHeight,clientHeight:open.clientHeight,statusClient:el.querySelector('.showroom-card__stage').clientHeight,statusScroll:el.querySelector('.showroom-card__stage').scrollHeight,controlsClear:r.bottom<=document.querySelector('.showroom-controls').getBoundingClientRect().top+1}})}));
 result.pass=!result.overflow&&result.cards.every(c=>c.readable&&c.contentHeight<=c.clientHeight+1&&c.statusScroll<=c.statusClient+1&&c.controlsClear);results.push(result);
 if([700,701,1101,1280].includes(width)){await page.locator('.showroom-viewport').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,`${width}-breakpoint.png`)})}
 await page.close();
} }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'breakpoint-review.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.map(r=>({width:r.width,pass:r.pass,overflow:r.overflow,failures:r.cards.filter(c=>!c.readable||c.contentHeight>c.clientHeight+1||c.statusScroll>c.statusClient+1||!c.controlsClear)}))));if(results.some(r=>!r.pass))process.exitCode=1}
})();
