const {chromium} = require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors = [], results = [], videos = [], ranges = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8207/proof/');
  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href],img[src],source[src]')].map(n=>n.href||n.src))].filter(u=>u.startsWith(location.origin)));
  for(const url of links) {
    const response = await page.request.get(url);
    results.push({url,status:response.status()});
    assert.equal(response.status(),200,url);
    await response.dispose();
  }
  for(const name of ['desktop','mobile']) {
    const response = await page.request.get('http://127.0.0.1:8207/proof/'+name+'.mp4',{headers:{Range:'bytes=200000-200999'}});
    assert.equal(response.status(),206);
    assert.equal((await response.body()).length,1000);
    ranges.push({name,status:response.status(),contentRange:response.headers()['content-range']});
    const video = page.locator('#'+name);
    const info = await video.evaluate(async e => {
      if(e.readyState<1) await new Promise((resolve,reject)=>{e.onloadedmetadata=resolve;e.onerror=reject;});
      const position=e.duration-8;
      const seeked=new Promise((resolve,reject)=>{e.addEventListener('seeked',resolve,{once:true});setTimeout(()=>reject(new Error('seek timeout')),8000);});
      e.currentTime=position;await seeked;await e.play();await new Promise(r=>setTimeout(r,700));e.pause();
      return {source:e.currentSrc,duration:e.duration,width:e.videoWidth,height:e.videoHeight,time:e.currentTime,target:position,error:e.error};
    });
    assert(info.time>info.target&&!info.error,JSON.stringify(info));
    videos.push(info);
  }
  const layouts=[];
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>scrollTo(0,0));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false);
    await page.screenshot({path:path.join(__dirname,`gallery-${width}.png`)});
    layouts.push({width,overflow});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,'gallery-verification.json'),JSON.stringify({status:'PASS',links:results,videos,ranges,layouts,errors},null,2));
  console.log(JSON.stringify({status:'PASS',links:results.length,videos,ranges,layouts,errors},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
