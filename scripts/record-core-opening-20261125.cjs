/* One uninterrupted real local take. No injected scroll, overlays or UI changes. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'docs/evidence/core-opening-20261125');
const session = JSON.parse(fs.readFileSync(path.join(evidence, 'preview-session.json')));
const preservePath = process.env.PK_CORE_OPEN_PRESERVE || path.join(evidence, 'preserve-accepted.json');
const accepted = JSON.parse(fs.readFileSync(preservePath));
const mode = process.argv[2];
assert(['baseline', 'probe', 'record', 'mobile', 'reduced', 'idle'].includes(mode));
const base = session.url;
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const take = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-core-opening-take-20261125-'));
const viewport = mode === 'mobile' ? {width:390, height:844} : {width:1920, height:1080};
const recording = ['probe', 'record', 'idle'].includes(mode);
const report = {mode, started:new Date().toISOString(), take, base, viewport,
  sourceRoot:session.sourceRoot, sourceOrigin:session.sourceOrigin,
  scope:'Single native browser viewport stream; one initial navigation and real input only. No scrollTo, wheel, reload, synthetic UI, overlays, trim or montage in harness.',
  events:[], errors:[], csp:[], external:[], http:[], blockedDownloads:[], writes:[],
  actions:[], navigations:[], frames:[]};
const hashBuffer = Buffer.allocUnsafe(1024 * 1024);
function digest(file) {
  const hash = crypto.createHash('sha256'), descriptor = fs.openSync(file, 'r');
  try { let bytes; while ((bytes = fs.readSync(descriptor, hashBuffer, 0, hashBuffer.length, null))) {
    hash.update(hashBuffer.subarray(0, bytes));
  } } finally { fs.closeSync(descriptor); }
  return hash.digest('hex');
}
report.acceptedManifest = {path:preservePath,sha256:digest(preservePath),files:Object.keys(accepted).length};
const stamp = (label, detail={}) => {
  report.events.push({label,at:new Date().toISOString(),...detail});
  console.log(label);
};
function resolvePlaywright() {
  if(process.env.PK_PLAYWRIGHT) return require.resolve(process.env.PK_PLAYWRIGHT);
  try { return require.resolve('playwright'); }
  catch(error) {
    if(error.code!=='MODULE_NOT_FOUND') throw error;
    return require.resolve(path.join(os.homedir(),'.cache','codex-runtimes',
      'codex-primary-runtime','dependencies','node','node_modules','playwright'));
  }
}
function sourceHashes(folder=session.sourceRoot) {
  const code = ['import sys,json,importlib.util','from pathlib import Path',
    'sys.dont_write_bytecode=True','r=Path(sys.argv[1])',
    's=importlib.util.spec_from_file_location("qa_stage",r/"scripts/stage-public.py")',
    'm=importlib.util.module_from_spec(s);s.loader.exec_module(m)',
    'print(json.dumps(m.public_files()))'].join('\n');
  const result=spawnSync(path.join(root,'.venv/bin/python'),['-B','-c',code,folder],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  return Object.fromEntries(JSON.parse(result.stdout).map(name=>[name,digest(path.join(folder,name))]));
}
function preservation() {
  const changed=[];
  for(const[name,hash]of Object.entries(accepted)) {
    if(!fs.existsSync(path.join(root,name))||digest(path.join(root,name))!==hash) changed.push(name);
  }
  const protectedChanged=changed.filter(name=>name.startsWith('analytics/')||
    name.startsWith('downloads/')||(name.startsWith('catalog/')&&name!=='catalog/brand.json')||
    name.startsWith('projekty/')&&name.endsWith('/index.html')||
    ['taskpet/index.html','echo-worlds/index.html','glikemia-premium/index.html',
      'progresskit-mail/index.html'].includes(name));
  return {acceptedFiles:Object.keys(accepted).length,changed,protectedChanged};
}
const pwEntry=resolvePlaywright();
const core=path.dirname(require.resolve('playwright-core/package.json',{paths:[path.dirname(pwEntry)]}));
const codec=fs.mkdtempSync(path.join(os.tmpdir(),'pk-core-opening-codec-'));
if(recording) {
  const revision=JSON.parse(fs.readFileSync(path.join(core,'browsers.json'))).browsers.find(x=>x.name==='ffmpeg').revision;
  const location=path.join(codec,'ffmpeg-'+revision);fs.mkdirSync(location);
  const nativeEncoderLog=path.join(take,'native-encoder-arguments.json');
  const wrapper=['#!/usr/bin/python3','import json,os,sys',
    'original=sys.argv[1:];effective=list(original)',
    'if "-c:v" in effective and effective[effective.index("-c:v")+1]=="vp8":',
    ' for option,value in [("-b:v","18M"),("-qmax","24"),("-crf","4"),("-threads","4")]:',
    '  effective[effective.index(option)+1]=value',
    ` with open(${JSON.stringify(nativeEncoderLog)},"w") as stream:json.dump({"original":original,"effective":effective},stream,indent=2)`,
    'os.execv("/usr/bin/ffmpeg",["/usr/bin/ffmpeg",*effective])',''].join('\n');
  fs.writeFileSync(path.join(location,'ffmpeg-linux'),wrapper,{mode:0o700});
  report.nativeEncoder={implementation:'Owned local ffmpeg wrapper; only quality/bitrate/thread options differ from native Playwright recorder.',
    librarySource:'playwright-core/lib/coreBundle.js FfmpegVideoRecorder',
    librarySha256:digest(path.join(core,'lib/coreBundle.js')),wrapperSha256:crypto.createHash('sha256').update(wrapper).digest('hex')};
  process.env.PLAYWRIGHT_BROWSERS_PATH=codec;
}
const {chromium}=require(pwEntry);
let browser,context,page,video;
async function screenshot(name) {
  const file=path.join(take,name);await page.screenshot({path:file,animations:'allow'});
  report.frames.push({file:name,sha256:digest(file),sourceState:await page.evaluate(()=>({
    time:performance.now(),opening:document.querySelector('[data-living-journey]')?.dataset.opening,
    progress:document.querySelector('[data-living-journey]')?.dataset.progress,scrollY,
  }))});
}
async function installTelemetry() {
  await page.evaluate(()=>{
    const q=window.__coreOpeningQA={origin:performance.timeOrigin,samples:[],cadence:[],inputs:[],last:0,lastSample:0,active:true};
    const box=e=>e?.getBoundingClientRect().toJSON()||null;
    const style=e=>e?{opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,
      filter:getComputedStyle(e).filter}:null;
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-core-activate]')) q.inputs.push({
        kind:'core-click',trusted:event.isTrusted,time:performance.now(),eventTime:event.timeStamp,
        pointerType:event.pointerType||'mouse',detail:event.detail,
      });
    },true);
    document.addEventListener('wheel',event=>q.inputs.push({kind:'wheel',trusted:event.isTrusted,time:performance.now()}),true);
    document.addEventListener('touchmove',event=>q.inputs.push({kind:'touchmove',trusted:event.isTrusted,time:performance.now()}),true);
    document.addEventListener('pointermove',event=>q.inputs.push({kind:'pointermove',trusted:event.isTrusted,
      time:performance.now(),x:event.clientX,y:event.clientY}),true);
    function frame(now) {
      if(!q.active)return;
      if(q.last)q.cadence.push({time:now,dt:now-q.last});q.last=now;
      if(now-q.lastSample>=100) {
        const begin=performance.now(),journey=document.querySelector('[data-living-journey]'),
          canvas=document.querySelector('[data-world-scene]'),dock=document.querySelector('.inspection-bot-dock'),
          bot=document.querySelector('[data-inspection-bot]');
        q.samples.push({time:now,origin:performance.timeOrigin,scrollY,opening:Number(journey?.dataset.opening||0),
          progress:Number(journey?.dataset.progress||0),scene:journey?.dataset.scene,
          front:journey?.dataset.crystalsFront,stage:box(document.querySelector('.living-stage')),
          viewport:{width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth},
          architecture:style(document.querySelector('.living-architecture')),
          identity:style(document.querySelector('.living-identity')),
          sigil:style(document.querySelector('.core-sigil')),glass:style(document.querySelector('.core-smoked-glass')),
          well:style(document.querySelector('.core-well')),furnace:style(document.querySelector('.core-furnace')),
          blades:[...document.querySelectorAll('[data-iris-blade]')].map((e,index)=>({index,
            local:style(e),box:box(e)})),
          crystals:[...document.querySelectorAll('.living-node')].slice(0,6).map(e=>({id:e.dataset.projectId,
            data:{...e.dataset},inert:e.inert,box:box(e)})),
          renderer:canvas?{state:canvas.dataset.crystals,frames:canvas.dataset.frames,
            depths:canvas.dataset.crystalDepths,warmup:canvas.dataset.crystalWarmup}:null,
          bot:{dock:dock?{...dock.dataset}:null,box:box(bot)},
          projection:document.querySelector('[data-bot-hologram]')?.dataset.visible,
          projectionProject:document.querySelector('[data-bot-hologram]')?.dataset.project,
          readCostMs:performance.now()-begin});
        q.lastSample=now;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
async function nativeCore() {
  const button=page.locator('[data-core-activate]');
  const bounds=await button.boundingBox();assert(bounds);
  const point={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  if(mode==='reduced'&&!(point.x>0&&point.x<viewport.width&&point.y>0&&point.y<viewport.height)) {
    for(let i=0;i<60;i++) {
      if(await page.evaluate(()=>document.activeElement?.matches('[data-core-activate]')))break;
      await page.keyboard.press('Tab');
    }
    assert(await page.evaluate(()=>document.activeElement?.matches('[data-core-activate]')));
    report.actions.push({kind:'native-keyboard-enter',target:'[data-core-activate]'});
    await page.keyboard.press('Enter');stamp('Dostępna aktywacja klawiaturą');return;
  }
  assert(point.x>0&&point.x<viewport.width&&point.y>0&&point.y<viewport.height);
  assert(await button.evaluate((e,p)=>{const hit=document.elementFromPoint(p.x,p.y);return hit===e||e.contains(hit);},point));
  report.actions.push({kind:mode==='mobile'?'native-touch':'native-mouse',target:'[data-core-activate]',point});
  if(mode==='mobile')await page.touchscreen.tap(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
  stamp('Prawdziwa aktywacja rdzenia');
}
async function mapReady() {
  await page.waitForFunction(()=>{
    const active=[...document.querySelectorAll('.living-node:not([inert])')];
    const root=document.querySelector('[data-living-journey]');
    return (Number(root?.dataset.opening)>=.998||root?.classList.contains('living-static'))&&
      active.length>=6&&active.slice(0,6).every(e=>{
        const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return hit===e||e.contains(hit);
      });
  });
}
function probeMedia(file) {
  const result=spawnSync('/usr/bin/ffprobe',['-v','error','-count_frames','-select_streams','v:0',
    '-show_entries','stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames:format=duration,size',
    '-of','json',file],{encoding:'utf8',timeout:60000});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
async function exportVideo() {
  await context.close();context=null;await browser.close();browser=null;
  stamp('Przeglądarka zamknięta; pozostaje tylko kodowanie CPU');
  const raw=path.join(take,'raw-uninterrupted.webm');fs.copyFileSync(await video.path(),raw);
  const movie=path.join(take,mode==='idle'?'hero-bez-ruchu.mp4':'otwarcie-rdzenia.mp4');
  const args=['-hide_banner','-loglevel','error','-i',raw,'-an','-c:v','libx264','-preset','fast',
    '-crf','16','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',movie];
  const result=spawnSync('/usr/bin/ffmpeg',args,{encoding:'utf8',timeout:180000});
  assert.equal(result.status,0,result.stderr);
  const source=probeMedia(raw),final=probeMedia(movie);
  assert.equal(source.streams[0].nb_read_frames,final.streams[0].nb_read_frames,'Transcode changed frame count');
  assert(Math.abs(Number(source.format.duration)-Number(final.format.duration))<=.081);
  const ptsResult=spawnSync('/usr/bin/ffprobe',['-v','error','-select_streams','v:0','-show_frames',
    '-show_entries','frame=best_effort_timestamp_time','-of','json',movie],{encoding:'utf8',timeout:60000});
  assert.equal(ptsResult.status,0,ptsResult.stderr);
  const pts=JSON.parse(ptsResult.stdout).frames.map(f=>Number(f.best_effort_timestamp_time));
  assert(pts.every((v,i)=>i===0||v>pts[i-1]),'Non-monotonic final presentation timestamps');
  report.video={file:movie,sha256:digest(movie),raw:{file:raw,sha256:digest(raw),...source},
    final,pts,encodeArguments:args,uninterruptedProof:{
      nativeStreams:1,initialNavigations:1,samePage:true,trim:false,concatenation:false,
      injectedScroll:false,overlay:false,frameCountsEqual:true}};
  report.nativeEncoder.arguments=JSON.parse(fs.readFileSync(path.join(take,'native-encoder-arguments.json')));
}
(async()=>{
  try {
    report.preservation=preservation();
    assert.equal(report.preservation.protectedChanged.length,0,JSON.stringify(report.preservation.protectedChanged));
    report.sourceHashes=sourceHashes();
    if(session.sourceRoot!==session.sourceOrigin) {
      report.originSourceHashes=sourceHashes(session.sourceOrigin);
      report.snapshotMismatches=Object.keys({...report.sourceHashes,...report.originSourceHashes}).filter(name=>
        report.sourceHashes[name]!==report.originSourceHashes[name]);
      assert.equal(report.snapshotMismatches.length,0,JSON.stringify(report.snapshotMismatches));
    }
    browser=await chromium.launch({executablePath:process.env.PK_CHROME||'/usr/bin/google-chrome',
      headless:true,args:['--no-sandbox','--enable-gpu','--use-gl=angle','--use-angle=gl',
        '--ozone-platform=x11','--ignore-gpu-blocklist','--disable-background-networking']});
    context=await browser.newContext({viewport,hasTouch:mode==='mobile',isMobile:mode==='mobile',
      reducedMotion:mode==='reduced'?'reduce':'no-preference',serviceWorkers:'block',
      ...(recording?{recordVideo:{dir:path.join(codec,'video'),size:viewport}}:{})});
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==base){report.external.push(url.origin);return route.abort();}
      if(url.pathname.startsWith('/download/')||/\.apk$/i.test(url.pathname)){report.blockedDownloads.push(url.pathname);return route.abort();}
      if(!['GET','HEAD'].includes(request.method())){report.writes.push(request.method());return route.abort();}
      return route.continue();
    });
    await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>
      console.debug('[CORE-QA-CSP]'+JSON.stringify({directive:e.effectiveDirective,blocked:e.blockedURI}))));
    page=await context.newPage();video=page.video();
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.text().startsWith('[CORE-QA-CSP]'))report.csp.push(JSON.parse(m.text().slice(13)));});
    page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())report.navigations.push({url:frame.url(),at:new Date().toISOString()});});
    const response=await page.goto(base+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
    await page.waitForSelector('.living-ready,.living-static');
    if(mode==='baseline') {
      await screenshot('baseline-hero.png');await nativeCore();
      await page.waitForFunction(()=>document.querySelector('[data-world-scene]')?.dataset.crystals==='ready');
      await page.waitForTimeout(700);await screenshot('baseline-map.png');
    } else {
      await page.waitForSelector('.core-sigil');
      await page.locator('.core-sigil').evaluate(async e=>{if(e.tagName==='IMG')await e.decode();});
      const heroSeenAt=await page.evaluate(()=>performance.now());
      report.heroSeenAtPageMs=heroSeenAt;
      await installTelemetry();
      if(mode==='mobile'||mode==='reduced')await screenshot(mode+'-hero.png');
      if(mode!=='reduced')await page.waitForSelector('[data-crystal-warmup="ready"]',{state:'attached'});
      if(mode==='idle') {
        report.idleStartedPageMs=await page.evaluate(()=>performance.now());
        await page.waitForTimeout(11000);
        report.idleEndedPageMs=await page.evaluate(()=>performance.now());
        stamp('Co najmniej 11 sekund hero bez inputu');
      } else {
        const waited=await page.evaluate(start=>performance.now()-start,heroSeenAt);
        await page.waitForTimeout(recording?Math.max(0,2600-waited):500);
        await nativeCore();
        if(recording) {
          await page.mouse.move(35,35,{steps:8});
          report.actions.push({kind:'native-pointer-park',point:{x:35,y:35}});
        }
        if(mode==='mobile') {
          await page.waitForFunction(()=>{const n=Number(document.querySelector('[data-living-journey]').dataset.opening);return n>.35&&n<.85;});
          await screenshot('mobile-opening.png');
        }
        if(mode==='reduced') {
          await page.waitForFunction(()=>document.querySelector('[data-living-journey]')?.classList.contains('living-static')&&
            document.querySelectorAll('.living-node:not([inert])').length>=6);
          await page.waitForTimeout(200);
        } else await mapReady();
        stamp('Mapa osiągnięta bez scrolla harnessu');
        if(mode==='mobile'||mode==='reduced')await screenshot(mode+'-map.png');
        if(recording) {
          report.levitationStartedPageMs=await page.evaluate(()=>performance.now());
          await page.waitForTimeout(4300);
          report.levitationEndedPageMs=await page.evaluate(()=>performance.now());
          stamp('Ponad cztery sekundy swobodnej lewitacji');
          const target=await page.locator('.living-node[data-project-id="taskpet"]').boundingBox();assert(target);
          const point={x:target.x+target.width/2,y:target.y+target.height/2};
          assert(point.x>0&&point.x<viewport.width&&point.y>0&&point.y<viewport.height);
          report.actions.push({kind:'native-hover',target:'taskpet',point});
          report.hoverStartedPageMs=await page.evaluate(()=>performance.now());
          await page.mouse.move(point.x,point.y,{steps:20});
          await page.waitForTimeout(2300);
          const projection=page.locator('[data-bot-hologram][data-visible="true"][data-project="taskpet"]');
          await projection.waitFor({state:'visible'});
          report.taskPetProjection=await projection.evaluate(e=>({text:e.textContent,box:e.getBoundingClientRect().toJSON(),
            opacity:getComputedStyle(e).opacity,visible:e.dataset.visible,project:e.dataset.project}));
          assert(/TaskPet/i.test(report.taskPetProjection.text));
          report.hoverEndedPageMs=await page.evaluate(()=>performance.now());
          stamp('Rzeczywisty hover i widoczna projekcja TaskPet');
          await page.mouse.move(40,40,{steps:15});await page.waitForTimeout(1300);
        }
      }
      report.telemetry=await page.evaluate(()=>{window.__coreOpeningQA.active=false;return window.__coreOpeningQA;});
      assert.equal(report.telemetry.inputs.filter(i=>i.kind==='core-click'&&i.trusted).length,mode==='idle'?0:1);
      assert.equal(report.telemetry.inputs.filter(i=>['wheel','touchmove'].includes(i.kind)).length,0);
      if(mode==='idle')assert.equal(report.telemetry.inputs.length,0);
      assert(report.telemetry.samples.every(s=>s.origin===report.telemetry.origin),'Document changed during take');
    }
    assert.equal(report.errors.length,0,JSON.stringify(report.errors));
    assert.equal(report.csp.length,0,JSON.stringify(report.csp));
    assert.equal(report.external.length,0,JSON.stringify(report.external));
    assert.equal(report.blockedDownloads.length,0);
    assert.equal(report.writes.length,0);
    assert.equal(report.http.filter(r=>!(r.path==='/api/project-inquiries/token'&&r.status===503)).length,0,JSON.stringify(report.http));
    report.sourceHashesAfter=sourceHashes();
    report.sourceChanged=Object.keys({...report.sourceHashes,...report.sourceHashesAfter}).filter(k=>
      report.sourceHashes[k]!==report.sourceHashesAfter[k]);
    if(mode==='record')assert.equal(report.sourceChanged.length,0,JSON.stringify(report.sourceChanged));
    if(session.sourceRoot!==session.sourceOrigin) {
      report.originSourceHashesAfter=sourceHashes(session.sourceOrigin);
      report.originChanged=Object.keys({...report.originSourceHashes,...report.originSourceHashesAfter}).filter(name=>
        report.originSourceHashes[name]!==report.originSourceHashesAfter[name]);
      assert.equal(report.originChanged.length,0,JSON.stringify(report.originChanged));
    }
    if(recording)await exportVideo();
    report.status='PASS';
  }catch(error){report.status='FAIL';report.error=error.stack;console.error(error.stack);process.exitCode=1;}
  finally {
    if(recording&&video&&!report.video) {
      await context?.close();context=null;await browser?.close();browser=null;
      try { const raw=path.join(take,'failed-uninterrupted-source.webm');
        fs.copyFileSync(await video.path(),raw);report.failedRawSource={file:raw,sha256:digest(raw)};
      } catch(error) { report.rawPreservationError=error.message; }
    }
    await context?.close();await browser?.close();
    report.finished=new Date().toISOString();
    fs.writeFileSync(path.join(take,'take-report.json'),JSON.stringify(report,null,2));
    fs.rmSync(codec,{recursive:true,force:true});
    console.log(JSON.stringify({mode,status:report.status,take,video:report.video?.file}));
  }
})();
