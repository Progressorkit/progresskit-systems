#!/usr/bin/env node
'use strict';

// Local-only review harness. Run after the implementation and HTTP server are ready.
// node /tmp/progresskit-slices-20261020/browser-check.cjs [url] [artifact-directory]
const { chromium } = require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const base = process.argv[2] || 'http://127.0.0.1:8098/';
const out = path.resolve(process.argv[3] || '/tmp/progresskit-slices-20261020/artifacts');
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('This harness only permits a local site.');
fs.mkdirSync(out, { recursive:true });
const report = { startedAt:new Date().toISOString(), base, checks:[], errors:[], failedRequests:[], httpFailures:[], artifacts:[] };
let browser;
let activeReviewPage;
const seenErrors = new Set();
const seenRequests = new Set();

function record(name, passed, details = '') {
  report.checks.push({ name, result:passed ? 'PASS' : 'FAIL', details });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}${details ? `: ${details}` : ''}\n`);
}
async function check(name, work) {
  try { const details = await work(); record(name, true, details || ''); }
  catch (error) {
    record(name, false, error.message);
    if (activeReviewPage && !activeReviewPage.isClosed()) {
      try {
        await activeReviewPage.keyboard.press('Escape');
        await activeReviewPage.mouse.move(10, 120);
        if (new URL(activeReviewPage.url()).pathname !== new URL(base).pathname) await activeReviewPage.goto(base, { waitUntil:'networkidle' });
      } catch { /* Preserve the original failure and continue independent cases. */ }
    }
  }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function wire(page, label) {
  activeReviewPage = page;
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(10000);
  page.on('pageerror', error => { const key = error.message; if (!seenErrors.has(key)) { seenErrors.add(key); report.errors.push({ label, message:key }); } });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || '';
    if (failure === 'net::ERR_ABORTED') return; // Navigation intentionally cancels old resources.
    const key = `${request.url()}:${failure}`;
    if (!seenRequests.has(key)) { seenRequests.add(key); report.failedRequests.push({ label, url:request.url(), failure }); }
  });
  page.on('response', response => {
    if (response.status() >= 400) report.httpFailures.push({ label, url:response.url(), status:response.status() });
  });
}
async function ready(page) {
  await page.goto(base, { waitUntil:'networkidle' });
  await page.locator('[data-showroom].showroom-enhanced').waitFor();
}
async function centerShowroom(page) {
  await page.locator('[data-showroom-viewport]').evaluate(element => window.scrollTo({ top:window.scrollY + element.getBoundingClientRect().top - Math.max(86, (innerHeight - element.clientHeight) / 2), behavior:'instant' }));
  await page.waitForTimeout(100);
}
function card(page) { return page.locator('.showroom-card.is-active'); }
function openCard(page) { return page.locator('.showroom-card.is-slice-expanded'); }
function panel(page) { return openCard(page).locator('[data-slice-panel]'); }
async function expanded(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('.showroom-card.is-slice-expanded')));
  await panel(page).waitFor({ state:'visible' });
}
async function collapsed(page) {
  await page.waitForFunction(() => !document.querySelector('.showroom-card.is-slice-expanded'));
}
async function ensureOpen(page) {
  if (!await openCard(page).count()) {
    await page.mouse.move(10,120);
    await centerShowroom(page);
    await card(page).locator('[data-showroom-open]').hover();
  }
  await expanded(page);
  await page.waitForTimeout(350);
}
async function geometry(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const points = [[.1,.1],[.5,.1],[.9,.1],[.1,.5],[.5,.5],[.9,.5],[.1,.9],[.5,.9],[.9,.9]];
    const blocked = points.map(([x,y]) => {
      const hit = document.elementFromPoint(rect.x + rect.width*x, rect.y + rect.height*y);
      return hit && (hit === element || element.contains(hit)) ? null : hit?.outerHTML.slice(0,180) || 'outside viewport';
    }).filter(Boolean);
    return { tag:element.tagName, text:element.innerText.trim().slice(0,90), rect:{ x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom }, viewport:{width:innerWidth,height:innerHeight}, blocked, visible:rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden' };
  }));
}
function assertVisibleGeometry(entries, label) {
  assert(entries.length > 0, `${label}: no elements`);
  for (const entry of entries) {
    const r = entry.rect, v = entry.viewport;
    assert(entry.visible && r.x >= -1 && r.y >= -1 && r.right <= v.width+1 && r.bottom <= v.height+1, `${label} is outside viewport: ${JSON.stringify(entry)}`);
    assert(!entry.blocked.length, `${label} is occluded: ${JSON.stringify(entry)}`);
  }
}
async function assertOpenBounds(page) {
  await expanded(page);
  await page.waitForTimeout(350);
  const data = await openCard(page).evaluate(element => {
    const read = node => { const r=node.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
    return { stage:read(element.closest('[data-showroom-viewport]')), slab:read(element), panel:read(element.querySelector('[data-slice-panel]')), viewport:{width:innerWidth,height:innerHeight} };
  });
  for (const [label,r] of [['slab',data.slab],['panel',data.panel]]) {
    assert(r.x >= data.stage.x-1 && r.y >= data.stage.y-1 && r.right <= data.stage.right+1 && r.bottom <= data.stage.bottom+1, `${label} extends beyond stage: ${JSON.stringify(data)}`);
    assert(r.x >= -1 && r.y >= -1 && r.right <= data.viewport.width+1 && r.bottom <= data.viewport.height+1, `${label} extends beyond viewport: ${JSON.stringify(data)}`);
  }
  const controls = await geometry(page, '.showroom-card.is-slice-expanded .project-slice__close, .showroom-card.is-slice-expanded .project-slice__actions a');
  assertVisibleGeometry(controls, 'Expanded slice controls');
  return { ...data,controls };
}
async function frozenPose(page) {
  return page.locator('[data-showroom]').evaluate(root => ({
    sliceOpen:root.classList.contains('is-slice-open'),
    support:[...root.querySelectorAll('.showroom-card:not(.is-slice-expanded):not(.is-orbit-hidden)')].map(element => ({id:element.dataset.projectId,transform:getComputedStyle(element).transform})),
    svg:[...root.querySelectorAll('.showroom-orbit *, .showroom-orbit-front *')].map((element,index) => { const style=getComputedStyle(element); return {index,name:style.animationName,playState:style.animationPlayState,transform:style.transform,dash:style.strokeDashoffset}; }).filter(item => item.name !== 'none'),
  }));
}
async function screenshot(page, name, options = {}) {
  await page.waitForTimeout(350);
  const destination = path.join(out, name);
  await page.screenshot({ path:destination, ...options });
  report.artifacts.push(name);
}
async function source(page) { return page.locator('#showroom-data').evaluate(element => { const data = JSON.parse(element.textContent); return Array.isArray(data) ? data : data.projects; }); }
async function summaryMatches(page) {
  const id = await openCard(page).getAttribute('data-project-id');
  const projects = await source(page);
  const selected = projects.find(project => project.id === id);
  assert(selected, `Missing source project ${id}`);
  const text = await panel(page).innerText();
  assert(text.includes(selected.summary), `${id}: panel does not contain its source summary`);
  assert((await panel(page).locator('a[href]').count()) > 0, `${id}: no ordinary link in expanded panel`);
  return selected;
}

async function recordClip(page) {
  const scratch = '/tmp/progresskit-slices-20261020/screencast-frames';
  fs.mkdirSync(scratch, { recursive:true });
  const session = await page.context().newCDPSession(page);
  const frames = [];
  session.on('Page.screencastFrame', event => {
    const file = path.join(scratch, `frame-${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(event.data, 'base64'));
    frames.push({ file, time:performance.now() });
    session.send('Page.screencastFrameAck', { sessionId:event.sessionId }).catch(() => {});
  });
  await session.send('Page.startScreencast', { format:'jpeg', quality:88, maxWidth:1440, maxHeight:900, everyNthFrame:1 });
  await page.mouse.move(20, 200);
  await page.waitForTimeout(500);
  await page.locator('[data-showroom-step="1"]').click();
  await page.mouse.move(20, 200);
  await page.waitForTimeout(850);
  await card(page).locator('[data-showroom-open]').hover();
  await expanded(page);
  await page.waitForTimeout(500);
  const body = await panel(page).boundingBox();
  await page.mouse.move(body.x + body.width * .5, body.y + body.height * .45, { steps:24 });
  await page.waitForTimeout(400);
  const action = panel(page).locator('a[href]').first();
  await action.hover();
  await page.waitForTimeout(900);
  await page.mouse.move(20, 200, { steps:30 });
  await page.waitForTimeout(650);
  await page.keyboard.press('Escape');
  await collapsed(page);
  await page.waitForTimeout(500);
  const stopped = performance.now();
  await session.send('Page.stopScreencast');
  await session.detach();
  assert(frames.length >= 8, `Only ${frames.length} frames were captured`);
  const concat = frames.flatMap((frame, index) => [`file '${frame.file.replaceAll("'", "'\\''")}'`, `duration ${Math.max(.02, ((frames[index + 1]?.time || stopped) - frame.time) / 1000).toFixed(4)}`]);
  concat.push(`file '${frames.at(-1).file.replaceAll("'", "'\\''")}'`);
  const manifest = path.join(scratch, 'frames.txt');
  fs.writeFileSync(manifest, concat.join('\n') + '\n');
  const destination = path.join(out, 'desktop-interaction.mp4');
  const encoded = spawnSync('/usr/bin/ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', manifest, '-vf', 'fps=24,pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { encoding:'utf8' });
  assert(encoded.status === 0, encoded.stderr || 'ffmpeg failed');
  assert(fs.statSync(destination).size > 10000, 'Encoded clip unexpectedly small');
  report.artifacts.push('desktop-interaction.mp4');
  return `${frames.length} actual browser frames, ${((stopped - frames[0].time) / 1000).toFixed(2)} seconds`;
}

async function performanceDiagnostics() {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const measured = await context.newPage(); wire(measured,'performance-cpu4');
  const session = await context.newCDPSession(measured);
  try {
    await session.send('Emulation.setCPUThrottlingRate',{rate:4});
    await session.send('Performance.enable');
    await ready(measured);
    await centerShowroom(measured);
    await measured.mouse.move(10,120);
    await measured.evaluate(() => {
      window.__slicePerf={samples:[],longTasks:[],active:true,last:0};
      const tick = time => { const p=window.__slicePerf; if (!p.active) return; if(p.last)p.samples.push(time-p.last); p.last=time; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        window.__slicePerfObserver=new PerformanceObserver(list => window.__slicePerf.longTasks.push(...list.getEntries().map(entry=>({start:entry.startTime,duration:entry.duration}))));
        window.__slicePerfObserver.observe({type:'longtask',buffered:false});
      }
    });
    const before=await session.send('Performance.getMetrics');
    const started=performance.now();
    const turns=[];
    for(let i=0;i<5;i++) {
      const prior=await card(measured).getAttribute('data-project-id');
      await measured.locator('[data-showroom-step="1"]').click();
      await measured.mouse.move(10,120);
      await measured.waitForTimeout(700);
      const next=await card(measured).getAttribute('data-project-id');
      assert(prior!==next,'Performance turn failed to change selected project');
      turns.push({prior,next});
    }
    await ensureOpen(measured);
    await measured.waitForTimeout(600);
    await measured.keyboard.press('Escape');
    await collapsed(measured);
    const after=await session.send('Performance.getMetrics');
    const durationMs=performance.now()-started;
    const sample=await measured.evaluate(() => {window.__slicePerf.active=false; window.__slicePerfObserver?.disconnect(); return window.__slicePerf;});
    const metricMap=value=>Object.fromEntries(value.metrics.map(metric=>[metric.name,metric.value]));
    const a=metricMap(before),b=metricMap(after);
    const deltas=Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize','Nodes','Frames'].filter(key=>key in a&&key in b).map(key=>[key,b[key]-a[key]]));
    const sorted=[...sample.samples].sort((x,y)=>x-y);
    const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]:null;
    const diagnostic={
      measuredAt:new Date().toISOString(),browser:browser.version(),cpuThrottlingRate:4,viewport:{width:1440,height:900},durationMs,turns,openCloseCycles:1,
      caveat:'Local headless Chrome diagnostics with emulated CPU throttling. RAF intervals and CDP metrics describe this run and do not establish hardware FPS or physical Android performance.',
      rafIntervalsMs:{count:sorted.length,min:sorted[0]??null,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:sorted.at(-1)??null,above33ms:sorted.filter(value=>value>33).length,above50ms:sorted.filter(value=>value>50).length},
      longTasks:sample.longTasks,cdpMetrics:{before:a,after:b,deltas},
    };
    fs.writeFileSync(path.join(out,'local-perf-diagnostics.json'),JSON.stringify(diagnostic,null,2)+'\n');
    report.artifacts.push('local-perf-diagnostics.json');
    assert(sorted.length>5&&'TaskDuration' in deltas,'Insufficient RAF or CDP measurements');
    return `CPU rate 4, ${turns.length} turns, ${sorted.length} sampled RAF intervals; no hardware FPS threshold`;
  } finally {
    await session.send('Emulation.setCPUThrottlingRate',{rate:1}).catch(()=>{});
    await session.detach();
    await context.close();
  }
}

(async () => {
  browser = await chromium.launch({ executablePath:'/usr/bin/google-chrome', headless:true, args:['--no-sandbox', '--disable-dev-shm-usage'] });
  const desktop = await browser.newContext({ viewport:{ width:1440, height:900 }, reducedMotion:'no-preference', deviceScaleFactor:1 });
  const page = await desktop.newPage(); wire(page, 'desktop');
  await ready(page);
  await check('Desktop first view at 1440x900', async () => {
    await page.evaluate(() => window.scrollTo({ top:0, behavior:'instant' }));
    await screenshot(page, 'desktop-1440x900-first-view.png');
    assert(await page.locator('h1').isVisible(), 'Main heading missing');
  });
  await check('Desktop first view at 1366x768', async () => {
    await page.setViewportSize({ width:1366, height:768 });
    await page.evaluate(() => window.scrollTo({ top:0, behavior:'instant' }));
    await page.waitForTimeout(150);
    await screenshot(page, 'desktop-1366x768-first-view.png');
  });
  report.geometry = [];
  for (const [width,height] of [[320,568],[390,844],[768,844],[1366,768],[1440,900]]) {
    await check(`First-view Kontakt and Usługi actions are visible and usable at ${width}x${height}`, async () => {
      await page.keyboard.press('Escape');
      await page.mouse.move(10,120);
      await page.setViewportSize({width,height});
      await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForTimeout(150);
      const entries = await geometry(page, '.hero__commercial-actions a[href="#kontakt"], .hero__commercial-actions a[href="#uslugi"]');
      assert(entries.length === 2, `Expected 2 primary commercial actions, found ${entries.length}`);
      report.geometry.push({case:'commercial-first-view',width,height,entries});
      assertVisibleGeometry(entries, 'Hero commercial action');
      if (width >= 1366) assertVisibleGeometry(await geometry(page, '.topbar .nav a[href="#kontakt"], .topbar .nav a[href="#uslugi"]'), 'Desktop commercial navigation');
      await screenshot(page, `first-view-cta-${width}x${height}.png`);
    });
    await check(`Open slice and every action fit the stage and browser at ${width}x${height}`, async () => {
      await page.keyboard.press('Escape');
      await page.setViewportSize({width,height});
      await page.mouse.move(10,120);
      await centerShowroom(page);
      await ensureOpen(page);
      const bounds = await assertOpenBounds(page);
      report.geometry.push({case:'expanded-bounds',width,height,...bounds});
      await screenshot(page, `slice-bounds-${width}x${height}.png`);
      await page.keyboard.press('Escape');
      await collapsed(page);
    });
  }
  await page.setViewportSize({ width:1440, height:900 });
  await centerShowroom(page);
  await check('Hover opens a slice with its real source summary and actions', async () => {
    await page.mouse.move(10,120);
    await card(page).locator('[data-showroom-open]').hover();
    await expanded(page);
    const selected = await summaryMatches(page);
    assert(await page.locator('dialog[open]').count() === 0, 'Hover opened a modal');
    await screenshot(page, 'desktop-slice-expanded.png');
    return selected.name;
  });
  await check('Expanded body and action remain stable during pointer travel', async () => {
    await ensureOpen(page);
    const box = await panel(page).boundingBox();
    assert(box && box.width > 100 && box.height > 50, 'Panel has no usable dimensions');
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5, { steps:24 });
    await page.waitForTimeout(450);
    await expanded(page);
    await panel(page).locator('a[href]').first().hover();
    await page.waitForTimeout(450);
    await expanded(page);
  });
  await check('Escape closes the expanded slice', async () => {
    await ensureOpen(page);
    await page.keyboard.press('Escape');
    await collapsed(page);
    await page.mouse.move(15, 180);
  });
  await check('Hovering a visible neighboring slice preserves its body and action', async () => {
    const neighbor = page.locator('.showroom-card:not(.is-active):not(.is-orbit-hidden)').first();
    const expectedId = await neighbor.getAttribute('data-project-id');
    await page.mouse.move(10,120);
    await neighbor.locator('[data-showroom-open]').hover();
    await expanded(page);
    assert(await openCard(page).getAttribute('data-project-id') === expectedId, 'A different slice opened');
    await summaryMatches(page);
    const body = await panel(page).boundingBox();
    await page.mouse.move(body.x + body.width * .5, body.y + body.height * .5, { steps:24 });
    await panel(page).locator('a[href]').first().hover();
    await page.waitForTimeout(500);
    assert(await openCard(page).getAttribute('data-project-id') === expectedId, 'Slice switched during CTA travel');
    await screenshot(page, 'desktop-neighbor-expanded.png');
    await page.keyboard.press('Escape');
    await collapsed(page);
    await page.mouse.move(15, 180);
  });
  await check('Keyboard Enter opens the selected project', async () => {
    const viewport = page.locator('[data-showroom-viewport]');
    await viewport.focus();
    await page.keyboard.press('Enter');
    await expanded(page);
    await summaryMatches(page);
    await page.keyboard.press('Escape');
    await collapsed(page);
  });
  await check('Browser Back closes keyboard-open details and restores focus outside hidden content', async () => {
    try {
      await page.goto(new URL('#start',base).href,{waitUntil:'networkidle'});
      await page.locator('[data-showroom].showroom-enhanced').waitFor();
      await page.mouse.move(10,120);
      await page.locator('.hero__explore[href="#projekty"]').click();
      await page.waitForURL(url=>url.hash==='#projekty');
      await page.mouse.move(10,120);
      await page.locator('[data-showroom-viewport]').focus();
      await page.keyboard.press('Enter');
      await expanded(page);
      assert(await openCard(page).locator('[data-slice-close]').evaluate(element=>document.activeElement===element),'Keyboard open did not focus the close control');
      await Promise.all([page.waitForURL(url=>url.hash==='#start'),page.goBack({waitUntil:'domcontentloaded'})]);
      await collapsed(page);
      await page.waitForFunction(()=>document.activeElement.matches('[data-showroom-viewport],[data-showroom-open]'));
      const focus=await page.evaluate(()=>{
        const element=document.activeElement;
        return {tag:element.tagName,project:element.getAttribute('data-showroom-open'),viewport:element.matches('[data-showroom-viewport]'),blocked:!!element.closest('[hidden],[inert],[aria-hidden="true"]')};
      });
      assert(!focus.blocked&&(focus.viewport||!!focus.project),`Back left focus outside usable showroom controls: ${JSON.stringify(focus)}`);
      assert(!new URL(page.url()).searchParams.has('projekt'),'Back retained an opened project URL parameter');
      report.historyFocus=focus;
    } finally {
      await ready(page);
      await page.mouse.move(10,120);
      await centerShowroom(page);
    }
  });
  await check('Moving keyboard focus into hover-open details cancels delayed pointer-leave closure', async () => {
    await page.keyboard.press('Escape');
    await centerShowroom(page);
    await page.mouse.move(10,120);
    await page.locator('[data-showroom-viewport]').focus();
    await card(page).locator('[data-showroom-open]').hover();
    await expanded(page);
    assert(!await openCard(page).evaluate(element=>element.contains(document.activeElement)),'Focus was already inside hover-open details before pointer leave');
    await page.mouse.move(10,120);
    const started=performance.now();
    await page.waitForTimeout(40);
    await openCard(page).locator('[data-slice-close]').evaluate(element=>element.focus({preventScroll:true}));
    const focusAfterLeaveMs=performance.now()-started;
    assert(focusAfterLeaveMs<100,`Close control focused after ${focusAfterLeaveMs.toFixed(1)}ms`);
    await page.waitForTimeout(400);
    await expanded(page);
    assert(await openCard(page).locator('[data-slice-close]').evaluate(element=>document.activeElement===element),'Close control lost keyboard focus');
    report.pointerLeaveFocus={focusAfterLeaveMs,waitAfterFocusMs:400};
    await page.keyboard.press('Enter');
    await collapsed(page);
    return `Focus moved into details after ${focusAfterLeaveMs.toFixed(1)}ms; details stayed open for 400ms`;
  });
  await check('Arrow navigation from the expanded panel restores focus to the selected module', async () => {
    await page.mouse.move(10,120);
    await page.locator('[data-showroom-viewport]').focus();
    await page.keyboard.press('Enter');
    await expanded(page);
    const before=await card(page).getAttribute('data-project-id');
    await openCard(page).locator('[data-slice-close]').focus();
    await page.keyboard.press('ArrowRight');
    await collapsed(page);
    await page.waitForTimeout(680);
    const after=await card(page).getAttribute('data-project-id');
    const focused=await page.evaluate(()=>({project:document.activeElement.getAttribute('data-showroom-open'),blocked:!!document.activeElement.closest('[hidden],[inert],[aria-hidden="true"]')}));
    assert(after!==before,'ArrowRight did not select another module');
    assert(focused.project===after&&!focused.blocked,`Panel arrow left focus outside selected module: ${JSON.stringify(focused)}`);
    assert(!new URL(page.url()).searchParams.has('projekt'),'Panel arrow retained an opened project URL parameter');
    return `${before} → ${after}; focus restored to ${focused.project}`;
  });
  await check('Support modules and SVG energy remain frozen while details are open', async () => {
    await ensureOpen(page);
    const before = await frozenPose(page);
    const energy = page.locator('[data-showroom-motion-toggle]');
    const originalPressed = await energy.getAttribute('aria-pressed');
    await energy.evaluate(element => element.focus({preventScroll:true}));
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    const afterToggle = await frozenPose(page);
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    const afterRestore = await frozenPose(page);
    report.frozenPose = {before,afterToggle,afterRestore};
    assert(before.sliceOpen && afterToggle.sliceOpen && afterRestore.sliceOpen, 'Energy toggle closed the slice');
    assert(before.support.length > 0, 'No supporting modules sampled');
    assert(JSON.stringify(before.support) === JSON.stringify(afterToggle.support) && JSON.stringify(before.support) === JSON.stringify(afterRestore.support), 'Supporting module transforms moved while slice was open');
    for (const snapshot of [before,afterToggle,afterRestore]) {
      assert(snapshot.svg.length > 0, 'No animated SVG energy elements sampled');
      assert(snapshot.svg.every(item => item.playState.split(',').every(value => value.trim() === 'paused')), 'SVG animation continued while slice was open');
    }
    assert(JSON.stringify(before.svg) === JSON.stringify(afterToggle.svg) && JSON.stringify(before.svg) === JSON.stringify(afterRestore.svg), 'SVG energy pose changed during pause');
    assert(await energy.getAttribute('aria-pressed') === originalPressed, 'Energy toggle state was not restored');
    await page.keyboard.press('Escape');
    await collapsed(page);
  });
  await check('Desktop navigation and commercial hero actions remain usable with a slice open', async () => {
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.mouse.move(10,120);
    await card(page).locator('[data-showroom-open]').hover();
    await expanded(page);
    await page.waitForTimeout(350);
    assertVisibleGeometry(await geometry(page, '.hero__commercial-actions a[href="#kontakt"], .hero__commercial-actions a[href="#uslugi"]'), 'Hero commercial action while slice is open');
    assertVisibleGeometry(await geometry(page, '.topbar .nav a[href="#kontakt"], .topbar .nav a[href="#uslugi"]'), 'Navigation while slice is open');
    await page.keyboard.press('Escape');
    await collapsed(page);
  });
  await check('Turning to the next project removes the opened project from the URL', async () => {
    await ensureOpen(page);
    const originalId = await card(page).getAttribute('data-project-id');
    const openedId = await openCard(page).getAttribute('data-project-id');
    assert(new URL(page.url()).searchParams.get('projekt') === openedId, 'Opened project URL state missing');
    await page.locator('[data-showroom-step="1"]').click();
    await page.mouse.move(10,120);
    await page.waitForTimeout(680);
    assert(!new URL(page.url()).searchParams.has('projekt'), 'Closed project remains in URL after next');
    assert(await card(page).getAttribute('data-project-id') !== originalId, 'Next did not select another project');
    await collapsed(page);
  });
  await check('Ordinary project action navigates to its local project page', async () => {
    await page.mouse.move(10,120);
    await card(page).locator('[data-showroom-open]').hover();
    await expanded(page);
    const action = panel(page).locator('a[href]').filter({ hasText:/Zobacz|Poznaj|projekt|aplikacj/i }).first();
    const actual = await action.count() ? action : panel(page).locator('a[href]').first();
    const target = new URL(await actual.getAttribute('href'), base);
    assert(target.origin === new URL(base).origin && target.pathname.startsWith('/projekty/'), `Unexpected project link ${target.href}`);
    await Promise.all([page.waitForURL(url => url.pathname === target.pathname), actual.click()]);
    assert(await page.locator('main').isVisible(), 'Project page main content missing');
    await page.goBack({ waitUntil:'networkidle' });
    await page.locator('[data-showroom].showroom-enhanced').waitFor();
    await centerShowroom(page);
    await page.mouse.move(15, 180);
    return target.pathname;
  });
  await check('Fourteen source projects and category totals are preserved', async () => {
    const projects = await source(page);
    assert(projects.length === 14, `Expected 14 projects, got ${projects.length}`);
    assert(new Set(projects.map(project => project.id)).size === 14, 'Duplicate source project IDs');
    for (const category of [...new Set(projects.map(project => project.category))]) {
      const expected = projects.filter(project => project.category === category).length;
      const gate = page.locator(`[data-showroom-category="${category}"]`);
      await gate.click();
      await page.mouse.move(15, 180);
      await page.waitForTimeout(680);
      assert(await gate.getAttribute('aria-pressed') === 'true', `${category}: filter is not selected`);
      assert(new URL(page.url()).searchParams.get('kategoria') === category, `${category}: URL state missing`);
      assert((await page.locator('[data-showroom-position]').innerText()).endsWith(`/ ${expected}`), `${category}: wrong total`);
      assert(await card(page).getAttribute('data-category') === category, `${category}: selected project is outside filter`);
    }
    await page.locator('[data-showroom-category=""]').click();
    await page.mouse.move(15, 180);
    await page.waitForTimeout(680);
    assert((await page.locator('[data-showroom-position]').innerText()).endsWith('/ 14'), 'All filter did not restore 14 entries');
  });
  await check('All fourteen projects remain reachable through next navigation', async () => {
    const expected = (await source(page)).map(project => project.id).sort();
    const reached = new Set();
    for (let i = 0; i < 14; i++) {
      reached.add(await card(page).getAttribute('data-project-id'));
      await page.locator('[data-showroom-step="1"]').click();
      await page.mouse.move(15, 180);
      await page.waitForTimeout(680);
    }
    assert(JSON.stringify([...reached].sort()) === JSON.stringify(expected), `Only reached ${reached.size} projects`);
  });
  await check('Contact and services anchors resolve on the page', async () => {
    for (const target of ['#kontakt', '#uslugi']) {
      const link = page.locator(`a[href="${target}"]`).first();
      assert(await link.count() > 0, `No ${target} link`);
      assert(await page.locator(target).count() === 1, `Missing or duplicate ${target} destination`);
      await link.click();
      await page.waitForTimeout(250);
      assert(new URL(page.url()).hash === target, `${target} navigation failed`);
    }
  });
  await check('Contact email uses a valid mailto URL', async () => {
    const links = await page.locator('a[href^="mailto:"]').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    assert(links.length > 0, 'No mailto action');
    for (const href of links) assert(/^mailto:[^@\s?]+@[^@\s?]+\.[^@\s?]+(?:\?.*)?$/.test(href), `Invalid mailto link ${href}`);
    return `${links.length} mailto links inspected; no email sent`;
  });
  for (const width of [320,390,768,1366,1440]) {
    await check(`No horizontal overflow at ${width}px`, async () => {
      await page.setViewportSize({ width, height:width < 800 ? 844 : 900 });
      await page.evaluate(() => window.scrollTo({ top:0, behavior:'instant' }));
      await page.waitForTimeout(150);
      const dimensions = await page.evaluate(() => ({ client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth, body:document.body.scrollWidth }));
      assert(dimensions.scroll <= dimensions.client + 1 && dimensions.body <= dimensions.client + 1, JSON.stringify(dimensions));
    });
  }
  await page.setViewportSize({ width:1440, height:900 });
  await centerShowroom(page);
  await check('Actual desktop interaction clip', async () => recordClip(page));
  await desktop.close();

  const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 }, screen:{ width:390, height:844 }, deviceScaleFactor:1, isMobile:true, hasTouch:true });
  const mobile = await mobileContext.newPage(); wire(mobile, 'mobile');
  await ready(mobile);
  await screenshot(mobile, 'mobile-390x844-first-view.png');
  await centerShowroom(mobile);
  await check('Mobile tap opens details without navigating', async () => {
    const before = new URL(mobile.url()).pathname;
    await card(mobile).locator('[data-showroom-open]').tap();
    await expanded(mobile);
    await summaryMatches(mobile);
    assert(new URL(mobile.url()).pathname === before, 'Mobile tap navigated away');
    await screenshot(mobile, 'mobile-slice-expanded.png');
  });
  await check('Mobile close control closes details', async () => {
    await openCard(mobile).locator('.project-slice__close').tap();
    await collapsed(mobile);
  });
  await check('Coarse touch horizontal swipe turns the orbit without opening details', async () => {
    await centerShowroom(mobile);
    const bounds=await mobile.locator('[data-showroom-viewport]').boundingBox();
    const y=Math.max(130,Math.min(680,bounds.y+bounds.height*.45));
    const before=await card(mobile).getAttribute('data-project-id');
    const beforeScroll=await mobile.evaluate(()=>window.scrollY);
    const touch=await mobileContext.newCDPSession(mobile);
    try {
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:290,y}]});
      for(let i=1;i<=9;i++) {
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:290-i*24,y}]});
        await mobile.waitForTimeout(30);
      }
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await mobile.waitForTimeout(750);
    } finally {await touch.detach();}
    const after=await card(mobile).getAttribute('data-project-id');
    assert(after!==before,`Horizontal touch gesture did not turn ${before}`);
    assert(Math.abs(await mobile.evaluate(()=>window.scrollY)-beforeScroll)<3,'Horizontal swipe scrolled the page vertically');
    await collapsed(mobile);
    return `${before} → ${after}; coarse touch browser emulation`;
  });
  await check('Mobile vertical touch gesture keeps native page scrolling', async () => {
    const viewport = await mobile.locator('[data-showroom-viewport]').boundingBox();
    const x = Math.max(50, Math.min(340, viewport.x + viewport.width * .5));
    const y = Math.max(300, Math.min(700, viewport.y + viewport.height * .6));
    const before = await mobile.evaluate(() => window.scrollY);
    const touch = await mobileContext.newCDPSession(mobile);
    await touch.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    for (let i = 1; i <= 8; i++) {
      await touch.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x, y:y - i * 25 }] });
      await mobile.waitForTimeout(30);
    }
    await touch.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await mobile.waitForTimeout(300);
    await touch.detach();
    const after = await mobile.evaluate(() => window.scrollY);
    assert(after > before + 50, `Scroll position ${before} → ${after}`);
    return `${before} → ${after}px; touch browser emulation`;
  });
  await mobileContext.close();

  const reducedContext = await browser.newContext({ viewport:{ width:1440, height:900 }, reducedMotion:'reduce' });
  const reduced = await reducedContext.newPage(); wire(reduced, 'reduced-motion');
  await ready(reduced);
  await centerShowroom(reduced);
  await check('Reduced motion is respected and slice interaction remains available', async () => {
    assert(await reduced.locator('[data-showroom]').evaluate(element => element.classList.contains('showroom-reduced-motion')), 'Reduced motion state missing');
    assert(await reduced.locator('[data-showroom-motion-toggle]').isDisabled(), 'Decorative motion toggle remains active');
    await reduced.mouse.move(10,120);
    await card(reduced).locator('[data-showroom-open]').hover();
    await expanded(reduced);
    await summaryMatches(reduced);
    const maximum = await card(reduced).evaluate(element => Math.max(...getComputedStyle(element).transitionDuration.split(',').map(value => parseFloat(value) || 0)));
    assert(maximum < .1, `Card transition still ${maximum}s with reduced motion`);
    await screenshot(reduced, 'reduced-motion-slice.png');
    await reduced.keyboard.press('Escape');
    await collapsed(reduced);
  });
  await reducedContext.close();
  await check('Catalogue keeps all fourteen ordinary project links usable without JavaScript', async () => {
    const context=await browser.newContext({viewport:{width:1440,height:900},javaScriptEnabled:false});
    const plain=await context.newPage(); wire(plain,'no-javascript');
    try {
      await plain.goto(base,{waitUntil:'networkidle'});
      assert(await plain.locator('[data-showroom].showroom-enhanced').count()===0,'JavaScript enhancement unexpectedly active');
      const links=plain.locator('.showroom-card [data-showroom-open]');
      assert(await links.count()===14,`Expected 14 catalogue links, found ${await links.count()}`);
      const hrefs=await links.evaluateAll(elements=>elements.map(element=>element.getAttribute('href')));
      assert(new Set(hrefs).size===14,'No-JavaScript catalogue links are duplicated');
      for(let i=0;i<14;i++) {
        const link=links.nth(i);
        assert(await link.isVisible(),`Project link ${i+1} is hidden without JavaScript`);
        await link.scrollIntoViewIfNeeded();
        const usable=await link.evaluate(element=>{
          const r=element.getBoundingClientRect(),x=r.x+r.width*.5,y=r.y+r.height*.5;
          const hit=document.elementFromPoint(x,y);
          return x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&(hit===element||element.contains(hit));
        });
        assert(usable,`Project link ${i+1} is clipped or occluded without JavaScript`);
      }
      const first=links.first(),target=new URL(await first.getAttribute('href'),base);
      await Promise.all([plain.waitForURL(url=>url.pathname===target.pathname),first.click()]);
      assert(await plain.locator('main').isVisible(),'No-JavaScript project navigation failed');
      return '14 unique visible and hit-testable links; ordinary navigation verified';
    } finally {await context.close();}
  });
  await check('Local CPU-throttled performance diagnostics are captured',performanceDiagnostics);
  record('No browser JavaScript errors', report.errors.length === 0, `${report.errors.length} errors`);
  record('No failed network requests', report.failedRequests.length === 0, `${report.failedRequests.length} failures`);
  record('No HTTP error responses', report.httpFailures.length === 0, `${report.httpFailures.length} responses`);
})().catch(error => { record('Harness completed', false, error.stack || error.message); }).finally(async () => {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  report.totals = { PASS:report.checks.filter(check => check.result === 'PASS').length, FAIL:report.checks.filter(check => check.result === 'FAIL').length };
  fs.writeFileSync(path.join(out, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`REPORT ${path.join(out, 'browser-report.json')} ${JSON.stringify(report.totals)}\n`);
  process.exitCode = report.totals.FAIL ? 1 : 0;
});
