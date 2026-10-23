/* Real Chromium review of the existing website. Local synthetic preview only. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PK_PLAYWRIGHT || '/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.argv[2] || 'http://127.0.0.1:8099/';
const out = path.resolve(process.argv[3] || 'docs/evidence/final-website-20261022/browser');
if (new URL(base).hostname !== '127.0.0.1') throw Error('Use only the isolated loopback preview.');
fs.mkdirSync(out, { recursive: true });
const report = { startedAt: new Date().toISOString(), base, checks: [], errors: [], resources: [], screenshots: [], measurements: [] };
const ids = JSON.parse(fs.readFileSync(path.join(__dirname, '../catalog/projects.json'))).projects.map(p => p.id);
const reviewIds = ['progresskit-tax','progresskit-translator','progresskit-mail','glikemia-premium','vaeloria','progresskit-community'];
function uiFingerprint(){
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const inputs=new Set(['index.html','catalog/projects.json','catalog/brand.json',
    'scripts/build-site.py','scripts/stage-public.py','scripts/showroom_markup.py','scripts/delivery_markup.py',
    'scripts/qa-final-website.cjs','templates/site.html','templates/about-contact.html','templates/project-hologram.html']);
  for(const m of html.matchAll(/(?:href|src)="(assets\/[^"?]+\.(?:css|js))"/g))inputs.add(m[1]);
  return [...inputs].sort().map(name=>({path:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')}));
}
const assert = (v, m) => { if (!v) throw Error(m); };
function telemetry(page, scope) {
  page.on('pageerror',e=>report.errors.push({scope,type:'pageerror',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')report.errors.push({scope,type:'console',message:m.text()});});
  page.on('response',r=>{if(r.status()>=400)report.resources.push({scope,url:r.url(),status:r.status()});});
}
async function check(name, work) {
  try { const details = await work(); report.checks.push({ name, status: 'PASS', details }); console.log('PASS', name); }
  catch (e) { report.checks.push({ name, status: 'FAIL', details: e.message }); console.log('FAIL', name, e.message); }
}
async function shot(page, name, locator) {
  if (locator) await locator.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior: 'instant' }));
  // Observe the finished real reveal/transition, preserving sticky navigation.
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, name), fullPage: false });
  report.screenshots.push(name);
}
async function open(page, id) {
  if (await page.locator('.is-slice-expanded').count()) await page.keyboard.press('Escape');
  for (let i = 0; i < ids.length; i++) {
    if (await page.locator('.showroom-card.is-active').getAttribute('data-project-id') === id) break;
    await page.locator('[data-showroom-step="1"]').click();
    await page.waitForTimeout(60);
  }
  await page.locator(`.showroom-card.is-active [data-showroom-open="${id}"]`).click();
  await page.locator(`.showroom-card.is-slice-expanded[data-project-id="${id}"]`).waitFor();
  await page.waitForTimeout(180);
}
async function bounds(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.is-slice-expanded');
    const panel = el?.querySelector('.project-slice__panel');
    const body = el?.querySelector('.project-slice__body');
    const r = el?.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1,
      count: document.querySelectorAll('.is-slice-expanded').length,
      bodyOverflow: body && getComputedStyle(body).overflowY,
      panelOverflow: panel && getComputedStyle(panel).overflowY,
      left: r?.left, right: r?.right, width: innerWidth,
      naturalBody: body && body.scrollHeight <= body.clientHeight + 2,
      pageHeight: document.documentElement.scrollHeight };
  });
}
async function main() {
  report.sourceBefore=uiFingerprint();
  const browser = await chromium.launch({ executablePath: process.env.PK_CHROME || '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browser = browser.version();
  try {
    for (const [width, height] of [[1920,1080], [1440,900], [390,844], [320,568]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      telemetry(page,`${width}:viewport`);
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('.showroom-enhanced').waitFor();
      await shot(page, `${width}-first.png`);
      await check(`${width}: first view and preserved catalog`, async () => {
        assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'Horizontal overflow');
        assert(await page.locator('.showroom-card').count() === 14, 'Catalog must retain fourteen projects');
        assert(await page.locator('h1').count() === 1, 'Exactly one H1');
        for (const id of ['uslugi', 'kontakt', 'ekosystem', 'wydania']) assert(await page.locator(`#${id}`).count() === 1, `Missing ${id}`);
      });
      await check(`${width}: readable rail modules without overlap or circular decoration`, async () => {
        const layout=await page.evaluate(()=>({rings:document.querySelectorAll('.showroom-orbit,.showroom-orbit-front').length,
          modules:[...document.querySelectorAll('.showroom-card:not(.is-orbit-hidden)')].map(card=>{
            const title=card.querySelector('h3'),stage=card.querySelector('.showroom-card__stage'),action=card.querySelector('.showroom-card__action');
            return {id:card.dataset.projectId,rect:card.getBoundingClientRect().toJSON(),title:title.getBoundingClientRect().toJSON(),
              stage:stage.getBoundingClientRect().toJSON(),action:action.getBoundingClientRect().toJSON(),
              fonts:[title,stage,action].map(e=>parseFloat(getComputedStyle(e).fontSize))};
          })}));
        assert(layout.rings===0,'Circular decoration remains in rendered markup');
        assert(layout.modules.length===(width<600?1:6),'Incorrect number of readable modules');
        for(const m of layout.modules){
          assert(m.fonts[0]>=20&&m.fonts[1]>=12&&m.fonts[2]>=14,JSON.stringify(m));
          assert(m.title.left>=m.rect.left-1&&m.title.right<=m.rect.right+1&&m.action.bottom<=m.rect.bottom+1,JSON.stringify(m));
          assert(m.title.bottom<=m.stage.top+1&&m.stage.bottom<=m.action.top+1,'Name, stage or action overlap: '+m.id);
        }
        for(let i=0;i<layout.modules.length;i++)for(let j=i+1;j<layout.modules.length;j++){
          const a=layout.modules[i].rect,b=layout.modules[j].rect;
          assert(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'Module faces overlap');
        }
        return layout;
      });
      // Every real catalog item must remain reachable through the existing mechanism.
      for (const id of ids) {
        await check(`${width}: expand ${id} with natural page scroll`, async () => {
          await open(page, id);
          const b = await bounds(page);
          assert(b.count === 1 && !b.overflow, JSON.stringify(b));
          assert(b.left >= -1 && b.right <= b.width + 1, JSON.stringify(b));
          assert(!['auto','scroll'].includes(b.bodyOverflow) && !['auto','scroll'].includes(b.panelOverflow) && b.naturalBody, JSON.stringify(b));
          const action = page.locator('.is-slice-expanded .project-slice__actions a').first();
          await action.scrollIntoViewIfNeeded();
          assert(await action.isVisible(), 'CTA unreachable by page scroll');
          if (reviewIds.includes(id)) {
            await shot(page, `${width}-${id}-expanded.png`, page.locator('.is-slice-expanded'));
            if (width < 600) {
              await action.scrollIntoViewIfNeeded();
              await shot(page, `${width}-${id}-actions-after-scroll.png`);
            }
          }
          await page.keyboard.press('Escape');
          assert(await page.locator('.is-slice-expanded').count() === 0, 'Escape did not close');
          const focus = await page.evaluate(() => document.activeElement?.getAttribute('data-showroom-open'));
          assert(focus === id, `Focus was not restored: ${focus}`);
          return b;
        });
      }
      for (const id of ['uslugi', 'kontakt', 'ekosystem', 'wydania']) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await shot(page, `${width}-${id}.png`, page.locator(`#${id}`));
      }
      await check(`${width}: one interactive project collection and explicit ecosystem roadmap`,async()=>{
        assert(await page.locator('[data-engineering-select],[data-engineering-case]').count()===0,'Duplicate interactive catalog remains');
        assert(await page.locator('.delivery-flow>li').count()===4,'Expected four connected roadmap roles');
        assert(await page.locator('[data-ecosystem-project]').count()===3,'Existing product map links lost');
        const text=await page.locator('#ekosystem').innerText();
        assert(text.includes('Local AI Agents')&&text.includes('Voice Gateway')&&text.includes('Planowane'),'Roadmap roles or status missing');
        assert(text.includes('nie stanowią dostępnej oferty'),'Roadmap boundary missing');
      });
      await check(`${width}: six selectable ecosystem roles with truthful stages and unique project links`,async()=>{
        const map=page.locator('[data-ecosystem-map]');
        assert(await map.getAttribute('data-ecosystem-ready')==='true','Map enhancement failed');
        assert(await map.locator('[data-ecosystem-select]').count()===6,'Expected six native node buttons');
        assert(await map.locator('[data-ecosystem-edge][data-integration-status="planned"]').count()===5,'Every connection must remain planned');
        const stages={tax:'development',translator:'prototype',agents:'planned',voice:'planned',mail:'development',messenger:'planned'};
        const states=[];
        for(const [id,stage]of Object.entries(stages)){
          const trigger=map.locator(`[data-ecosystem-select="${id}"]`);
          await trigger.click();
          assert(await trigger.getAttribute('aria-expanded')==='true','Selected role not expanded: '+id);
          assert(await map.locator('[data-ecosystem-select][aria-expanded="true"]').count()===1,'More than one selected role');
          assert(await map.locator(`[data-ecosystem-node="${id}"]`).getAttribute('data-ecosystem-stage')===stage,'False development stage: '+id);
          const detail=page.locator('#'+await trigger.getAttribute('aria-controls'));
          assert(await detail.isVisible(),'Selected description hidden: '+id);
          const state=await detail.evaluate(el=>({parent:el.parentElement.id,height:el.clientHeight,scrollHeight:el.scrollHeight,overflowY:getComputedStyle(el).overflowY,
            width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,visibleDescriptions:[...document.querySelectorAll('.ecosystem-node__detail')].filter(x=>!x.hidden).length}));
          assert(state.visibleDescriptions===1&&!state.overflow,'Role state or page overflow: '+id);
          assert(!['auto','scroll'].includes(state.overflowY)&&state.scrollHeight<=state.height+2,'Nested role scroll: '+id);
          assert(width>900?state.parent==='ecosystem-console':state.parent!=='ecosystem-console','Wrong role placement: '+id);
          states.push({id,stage,...state});
        }
        assert(await map.locator('.delivery-project-link').count()===3,'Project links duplicated or removed');
        await map.locator('[data-ecosystem-select="tax"]').click();
        await shot(page,`${width}-ecosystem-map.png`,map);
        await map.locator('[data-ecosystem-select="translator"]').click();
        await shot(page,`${width}-ecosystem-translator.png`,width<600?map.locator('[data-ecosystem-node="translator"]'):map);
        if(width<600)await shot(page,`${width}-ecosystem-communication.png`,map.locator('.delivery-independent'));
        return states;
      });
      await check(`${width}: ecosystem native keyboard activation, arrow focus and Escape`,async()=>{
        const translator=page.locator('[data-ecosystem-select="translator"]');
        await translator.focus();await page.keyboard.press('ArrowRight');
        assert(await page.evaluate(()=>document.activeElement?.dataset.ecosystemSelect)==='agents','Arrow focus failed');
        await page.keyboard.press('Enter');
        assert(await page.locator('[data-ecosystem-select="agents"]').getAttribute('aria-expanded')==='true','Enter failed');
        await page.keyboard.press('End');await page.keyboard.press('Space');
        assert(await page.locator('[data-ecosystem-select="messenger"]').getAttribute('aria-expanded')==='true','Space failed');
        await page.keyboard.press('Escape');
        assert(await page.locator('[data-ecosystem-select][aria-expanded="true"]').count()===0,'Escape did not clear role');
        assert(await page.evaluate(()=>document.activeElement?.dataset.ecosystemSelect)==='messenger','Escape lost focus');
      });
      if (width < 600) {
        await check(`${width}: touch navigation and page scrolling`, async () => {
          await page.evaluate(() => scrollTo(0, 0));
          await page.locator('.menu-btn').tap();
          await shot(page, `${width}-navigation.png`);
          const nav = page.locator('.mobile-panel');
          assert(await nav.isVisible(), 'Mobile navigation hidden');
          await nav.locator('a[href="#kontakt"]').tap();
          await page.waitForTimeout(250);
          assert(await page.evaluate(() => scrollY > 0), 'Contact did not scroll page');
          assert(await page.locator('.menu-btn').getAttribute('aria-expanded') === 'false', 'Menu remains open');
        });
      }
      await check(`${width}: refresh preserves selected project`, async () => {
        await open(page, 'progresskit-tax');
        await page.reload({ waitUntil: 'networkidle' });
        assert(await page.locator('.showroom-card.is-active').getAttribute('data-project-id') === 'progresskit-tax', 'Selected project lost');
        await page.keyboard.press('Escape');
      });
      const metrics = await page.evaluate(() => ({ navigation: performance.getEntriesByType('navigation').map(n => ({ duration: n.duration, domContentLoaded: n.domContentLoadedEventEnd, transferSize: n.transferSize })),
        resources: performance.getEntriesByType('resource').length, domNodes: document.querySelectorAll('*').length,
        heap: performance.memory ? { used: performance.memory.usedJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null }));
      report.measurements.push({ width, height, ...metrics });
      await context.close();
    }
    const reduced = await browser.newContext({ viewport: { width:390,height:844 }, reducedMotion: 'reduce' });
    const page = await reduced.newPage();
    telemetry(page,'reduced-motion');
    await page.goto(base, { waitUntil: 'networkidle' });
    await check('Reduced motion and keyboard', async () => {
      assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'Preference not active');
      await open(page, 'progresskit-mail');
      await page.keyboard.press('Escape');
      const loops=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running' && a.effect?.getTiming().iterations===Infinity).length);
      assert(loops===0,`Reduced motion still has ${loops} running infinite animations`);
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.activeElement !== document.body), 'No keyboard focus');
    });
    await reduced.close();
    for(const width of [1440,390]){
      const fallback=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false});
      const fallbackPage=await fallback.newPage();telemetry(fallbackPage,`${width}:no-js`);await fallbackPage.goto(base,{waitUntil:'networkidle'});
      await check(`${width}: ecosystem descriptions and links remain available without JavaScript`,async()=>{
        assert(await fallbackPage.locator('.ecosystem-node__detail:visible').count()===6,'Fallback hides role descriptions');
        assert(await fallbackPage.locator('#ekosystem .delivery-project-link:visible').count()===3,'Fallback lost project links');
        assert(!await fallbackPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Fallback horizontal overflow');
      });
      await fallback.close();
    }
    const workContext = await browser.newContext({ viewport: { width:1440,height:900 }, acceptDownloads: true });
    const work = await workContext.newPage();
    telemetry(work,'work:interaction-motion-memory');
    await work.goto(base, {waitUntil:'networkidle'});
    await check('Contact brief stays local and downloads actual text', async () => {
      const requests=[];work.on('request',r=>{if(r.method()!=='GET') requests.push(r.url());});
      await work.locator('#brief textarea').first().fill('DEMO local QA brief: no message is sent.');
      const pending=work.waitForEvent('download');await work.locator('[data-download-brief]').click();
      const download=await pending;const file=await download.path();
      assert(fs.readFileSync(file,'utf8').includes('DEMO local QA brief'),'Downloaded text lost input');
      assert((await work.locator('[data-brief-status]').innerText()).includes('lokalny plik'),'Misleading brief result');
      assert(!requests.length,'Brief sent a network mutation');
      assert((await work.locator('#kontakt .contact__email').getAttribute('href')).startsWith('mailto:'),'Missing real contact link');
    });
    await check('Catalog handles malicious search text without HTML execution', async () => {
      await work.goto(base+'projekty/?q='+encodeURIComponent('<img src=x onerror=alert(1)>'),{waitUntil:'networkidle'});
      assert(await work.locator('#catalog-empty').isVisible(),'Search error state missing');
      assert(await work.locator('img[src="x"]').count()===0,'Search injected markup');
    });
    await work.goto(base,{waitUntil:'networkidle'});
    const infinite=()=>work.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).map(a=>({name:a.animationName,target:a.effect?.target?.className?.baseVal??a.effect?.target?.className})));
    await check('V3 hero has bounded visible motion and the shared pause stops pointer light too',async()=>{
      await work.waitForTimeout(300);
      const running=await infinite();assert(running.length>0&&running.length<=10,JSON.stringify(running));
      assert(running.some(a=>a.name==='interface-light'),'Hero directional light is not animating');
      const box=await work.locator('.hero--monument').boundingBox();
      await work.mouse.move(box.x+box.width*.3,box.y+120);await work.waitForTimeout(100);
      const lightBefore=await work.locator('.hero--monument').evaluate(el=>el.style.getPropertyValue('--light-x'));
      await work.mouse.move(box.x+box.width*.65,box.y+200);await work.waitForTimeout(100);
      const lightAfter=await work.locator('.hero--monument').evaluate(el=>el.style.getPropertyValue('--light-x'));
      assert(lightBefore!==''&&lightAfter!==''&&lightBefore!==lightAfter,'Hero pointer light is static');
      const signal=()=>work.locator('.showroom-frame__signal').evaluate(el=>getComputedStyle(el).transform);
      const before=await signal();await work.waitForTimeout(450);const after=await signal();
      assert(before!==after,'Visible rail signal is static');
      const toggle=work.locator('[data-showroom-motion-toggle]');await toggle.click();await work.waitForTimeout(100);
      assert((await infinite()).length===0,'Pause left running infinite motion');
      await work.mouse.move(100,200);await work.mouse.move(300,350);await work.waitForTimeout(100);
      assert(await work.locator('.hero--monument').evaluate(el=>el.style.getPropertyValue('--light-x'))==='','Pointer light still moves while paused');
      await toggle.click();await work.waitForTimeout(100);
      assert((await infinite()).length>0,'Resume did not restore visible motion');
      return {running,before,after,lightBefore,lightAfter};
    });
    await check('V3 ecosystem animates at most two planned paths and stops offscreen or paused',async()=>{
      await work.locator('[data-ecosystem-select="tax"]').click();await work.waitForTimeout(250);
      const flowing=work.locator('[data-ecosystem-edge].is-flowing');
      assert(await flowing.count()===2,'Selected Tax must highlight only its two planned edges');
      const before=await flowing.first().evaluate(el=>getComputedStyle(el).strokeDashoffset);
      await work.waitForTimeout(350);const after=await flowing.first().evaluate(el=>getComputedStyle(el).strokeDashoffset);
      assert(before!==after,'Planned path signal is static');
      assert((await infinite()).filter(a=>a.name==='ecosystem-planned-signal').length===2,'Unexpected graph animation count');
      await work.locator('[data-showroom-motion-toggle]').click();await work.locator('#ekosystem').scrollIntoViewIfNeeded();await work.waitForTimeout(100);
      assert((await infinite()).length===0,'Global pause did not stop map');
      await work.locator('[data-showroom-motion-toggle]').click();await work.locator('#ekosystem').scrollIntoViewIfNeeded();await work.waitForTimeout(100);
      assert((await infinite()).filter(a=>a.name==='ecosystem-planned-signal').length===2,'Global resume did not restore map');
      await work.locator('#kontakt').scrollIntoViewIfNeeded();await work.waitForTimeout(200);
      assert((await infinite()).length===0,'Offscreen hero or map still animates');
      await work.emulateMedia({reducedMotion:'reduce'});await work.locator('#ekosystem').scrollIntoViewIfNeeded();await work.waitForTimeout(100);
      assert((await infinite()).length===0,'Reduced motion did not stop graph');
      await work.emulateMedia({reducedMotion:'no-preference'});
      return {selectedEdges:2,before,after,allConnections:'planned'};
    });
    await check('V3 repeated role selection and desktop/mobile resize retain unique DOM and bounded listeners',async()=>{
      const cdp=await workContext.newCDPSession(work);
      await work.locator('[data-ecosystem-select="tax"]').click();await work.waitForTimeout(200);
      await cdp.send('HeapProfiler.collectGarbage');const cold=await cdp.send('Memory.getDOMCounters');
      // Keep first-use node/style setup separate from recurring growth. Exercise
      // every role and both layouts once, retaining the cold observation too.
      for(const id of ['translator','agents','voice','mail','messenger','tax'])await work.locator(`[data-ecosystem-select="${id}"]`).click();
      await work.setViewportSize({width:600,height:900});
      await work.waitForFunction(()=>document.querySelector('#ecosystem-role-tax').parentElement.dataset.ecosystemNode==='tax');
      await work.setViewportSize({width:1440,height:900});
      await work.waitForFunction(()=>document.querySelector('#ecosystem-role-tax').parentElement.id==='ecosystem-console');
      await work.waitForTimeout(200);await cdp.send('HeapProfiler.collectGarbage');const before=await cdp.send('Memory.getDOMCounters');
      for(let i=0;i<5;i++)for(const id of ['translator','agents','voice','mail','messenger','tax'])await work.locator(`[data-ecosystem-select="${id}"]`).click();
      await work.setViewportSize({width:600,height:900});
      await work.waitForFunction(()=>document.querySelector('#ecosystem-role-tax').parentElement.dataset.ecosystemNode==='tax');
      await work.setViewportSize({width:1440,height:900});
      await work.waitForFunction(()=>document.querySelector('#ecosystem-role-tax').parentElement.id==='ecosystem-console');
      await work.waitForTimeout(200);await cdp.send('HeapProfiler.collectGarbage');const after=await cdp.send('Memory.getDOMCounters');
      assert(after.documents<=before.documents&&after.nodes<=before.nodes&&after.jsEventListeners<=before.jsEventListeners,JSON.stringify({before,after}));
      assert(await work.locator('.ecosystem-node__detail').count()===6&&await work.locator('#ekosystem .delivery-project-link').count()===3,'Resize cloned roles or links');
      return {cold,before,after,warmupRoleSelections:6,warmupViewportCrossings:2,roleSelections:30,viewportCrossings:2};
    });
    await work.goto(base,{waitUntil:'networkidle'});
    const perf=await workContext.newCDPSession(work);await perf.send('Performance.enable');
    await work.waitForTimeout(1000);
    const idleBefore=await perf.send('Performance.getMetrics');await work.waitForTimeout(1000);
    const idleAfter=await perf.send('Performance.getMetrics');
    await perf.send('HeapProfiler.collectGarbage');
    const domCold=await perf.send('Memory.getDOMCounters');
    // Separate first-use setup from recurring growth; retain both observations.
    await open(work,'progresskit-tax');await work.keyboard.press('Escape');
    await work.waitForTimeout(800);await perf.send('HeapProfiler.collectGarbage');
    const domBefore=await perf.send('Memory.getDOMCounters');
    for(let i=0;i<10;i++){await open(work,'progresskit-tax');await work.keyboard.press('Escape');}
    await work.waitForTimeout(800);
    await perf.send('HeapProfiler.collectGarbage');
    const domAfter=await perf.send('Memory.getDOMCounters');
    const values=m=>Object.fromEntries(m.metrics.map(v=>[v.name,v.value]));
    const a=values(idleBefore),b=values(idleAfter);
    report.measurements.push({name:'Desktop CDP sample, not physical phone/FPS',idleSampleSeconds:b.Timestamp-a.Timestamp,
      taskSeconds:b.TaskDuration-a.TaskDuration,scriptSeconds:b.ScriptDuration-a.ScriptDuration,
      domCold,domBefore,domAfter,warmupCycles:1,cycles:10});
    await check('Repeated expansion retains bounded DOM and listeners',async()=>{
      assert(domAfter.documents<=domBefore.documents && domAfter.nodes<=domBefore.nodes && domAfter.jsEventListeners<=domBefore.jsEventListeners,JSON.stringify({domBefore,domAfter}));
    });
    await workContext.close();
    const context = await browser.newContext({ viewport: { width:390,height:844 } });
    const film = await context.newPage();
    telemetry(film,'mobile-recording');
    await film.goto(base, { waitUntil: 'networkidle' });
    const frames = fs.mkdtempSync('/tmp/progresskit-ui-v2-mobile-frames-');
    const cdp = await context.newCDPSession(film); let n = 0;
    cdp.on('Page.screencastFrame', async e => { fs.writeFileSync(path.join(frames, `${String(n++).padStart(6,'0')}.jpg`), Buffer.from(e.data,'base64')); await cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{}); });
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:390,maxHeight:844,everyNthFrame:2});
    await film.locator('.menu-btn').click(); await film.waitForTimeout(500);
    await film.locator('.mobile-panel a[href="#uslugi"]').click(); await film.waitForTimeout(600);
    await open(film,'progresskit-mail');
    for (let i=0;i<5;i++) { await film.mouse.wheel(0,150); await film.waitForTimeout(200); }
    await film.keyboard.press('Escape'); await film.waitForTimeout(400);
    await cdp.send('Page.stopScreencast');
    const encode=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate','12','-i',path.join(frames,'%06d.jpg'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p',path.join(out,'mobile-interaction.mp4')],{encoding:'utf8'});
    report.recording={frames:n,status:encode.status===0?'PASS':'BLOCKED',error:encode.stderr};
    await context.close();
    const desktopContext=await browser.newContext({viewport:{width:1440,height:900}});
    const desktop=await desktopContext.newPage();telemetry(desktop,'desktop-recording');await desktop.goto(base,{waitUntil:'networkidle'});
    const desktopFrames=fs.mkdtempSync('/tmp/progresskit-ui-v2-desktop-frames-');
    const desktopCdp=await desktopContext.newCDPSession(desktop);let dn=0;
    desktopCdp.on('Page.screencastFrame',async e=>{fs.writeFileSync(path.join(desktopFrames,`${String(dn++).padStart(6,'0')}.jpg`),Buffer.from(e.data,'base64'));await desktopCdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
    await desktopCdp.send('Page.startScreencast',{format:'jpeg',quality:82,maxWidth:1440,maxHeight:900,everyNthFrame:2});
    // Choose the visible Tax plate directly, then complete the six requested cycles.
    await desktop.locator('.showroom-card:not(.is-orbit-hidden) [data-showroom-open="progresskit-tax"]').click();
    await desktop.waitForTimeout(550);await desktop.mouse.wheel(0,300);await desktop.waitForTimeout(300);
    await desktop.keyboard.press('Escape');await desktop.waitForTimeout(700);
    for(const id of reviewIds.slice(1)){
      await open(desktop,id);await desktop.waitForTimeout(500);
      await desktop.mouse.wheel(0,240);await desktop.waitForTimeout(200);
      await desktop.keyboard.press('Escape');await desktop.waitForTimeout(700);
    }
    await desktopCdp.send('Page.stopScreencast');
    const desktopEncode=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate','12','-i',path.join(desktopFrames,'%06d.jpg'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p',path.join(out,'desktop-mechanism.mp4')],{encoding:'utf8'});
    report.desktopRecording={frames:dn,status:desktopEncode.status===0?'PASS':'BLOCKED',error:desktopEncode.stderr,projects:reviewIds};
    await desktopContext.close();
    await check('No console errors or failing resources', async () => { assert(!report.errors.length,JSON.stringify(report.errors)); assert(!report.resources.length,JSON.stringify(report.resources)); });
  } finally {
    report.sourceAfter=uiFingerprint();
    await check('UI inputs remained unchanged throughout the complete browser review',async()=>{
      assert(JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter),'UI source changed during review; rerun the complete review');
      return {files:report.sourceBefore.length};
    });
    await browser.close(); report.finishedAt=new Date().toISOString();
    report.totals={PASS:report.checks.filter(c=>c.status==='PASS').length,FAIL:report.checks.filter(c=>c.status==='FAIL').length};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report.totals));
  }
  if(report.checks.some(c=>c.status==='FAIL')) process.exitCode=1;
}
main().catch(e=>{ report.fatal=e.message;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1; });
