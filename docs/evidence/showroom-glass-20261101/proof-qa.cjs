'use strict';
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(pathToFileURL(path.join(__dirname,'gallery.html')).href);
 const report=await page.evaluate(async()=>{
  const images=[...document.images];await Promise.all(images.map(async image=>{image.loading='eager';await image.decode();}));
  const videos=[];
  for(const video of document.querySelectorAll('video')){
   video.muted=true;await video.play();await new Promise(resolve=>setTimeout(resolve,400));
   videos.push({duration:video.duration,playing:video.currentTime>0,width:video.videoWidth,height:video.videoHeight,error:video.error?.message||null});video.pause();
  }
  return {images:images.length,imagesLoaded:images.every(i=>i.naturalWidth>0),videos};
 });
 report.errors=errors;report.PASS=report.imagesLoaded&&report.videos.length===2&&report.videos.every(v=>v.playing&&!v.error&&v.duration>=10&&v.duration<=15)&&!errors.length;
 fs.writeFileSync(path.join(__dirname,'final','qa-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();if(!report.PASS)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
