/* Real Chromium review of the existing website. Local synthetic preview only. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PK_PLAYWRIGHT || '/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.argv[2] || 'http://127.0.0.1:8099/';
const out = path.resolve(process.argv[3] || 'docs/evidence/final-website-20261022/browser');
if (new URL(base).hostname !== '127.0.0.1') throw Error('Use only the isolated loopback preview.');
fs.mkdirSync(out, { recursive: true });
const report = { startedAt: new Date().toISOString(), base, checks: [], errors: [], resources: [], screenshots: [], measurements: [] };
const ids = JSON.parse(fs.readFileSync(path.join(__dirname, '../catalog/projects.json'))).projects.map(p => p.id);
const assert = (v, m) => { if (!v) throw Error(m); };
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
  const browser = await chromium.launch({ executablePath: process.env.PK_CHROME || '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browser = browser.version();
  try {
    for (const [width, height] of [[1920,1080], [1440,900], [390,844], [320,568]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on('pageerror', e => report.errors.push({ width, type: 'pageerror', message: e.message }));
      page.on('console', m => { if (m.type() === 'error') report.errors.push({ width, type: 'console', message: m.text() }); });
      page.on('response', r => { if (r.status() >= 400) report.resources.push({ width, url: r.url(), status: r.status() }); });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('.showroom-enhanced').waitFor();
      await shot(page, `${width}-first.png`);
      await check(`${width}: first view and preserved catalog`, async () => {
        assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'Horizontal overflow');
        assert(await page.locator('.showroom-card').count() === 14, 'Catalog must retain fourteen projects');
        assert(await page.locator('h1').count() === 1, 'Exactly one H1');
        for (const id of ['uslugi', 'kontakt', 'ekosystem', 'wydania']) assert(await page.locator(`#${id}`).count() === 1, `Missing ${id}`);
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
          if (['progresskit-tax','progresskit-mail','progresskit-translator'].includes(id)) {
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
    const workContext = await browser.newContext({ viewport: { width:1440,height:900 }, acceptDownloads: true });
    const work = await workContext.newPage();
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
    await film.goto(base, { waitUntil: 'networkidle' });
    const frames = '/tmp/progresskit-final-20261022/frames'; fs.mkdirSync(frames,{recursive:true});
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
    await check('No console errors or failing resources', async () => { assert(!report.errors.length,JSON.stringify(report.errors)); assert(!report.resources.length,JSON.stringify(report.resources)); });
  } finally {
    await browser.close(); report.finishedAt=new Date().toISOString();
    report.totals={PASS:report.checks.filter(c=>c.status==='PASS').length,FAIL:report.checks.filter(c=>c.status==='FAIL').length};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report.totals));
  }
  if(report.checks.some(c=>c.status==='FAIL')) process.exitCode=1;
}
main().catch(e=>{ report.fatal=e.message;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1; });
