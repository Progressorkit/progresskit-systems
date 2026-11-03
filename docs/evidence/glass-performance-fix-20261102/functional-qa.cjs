/* Narrow local browser QA. Run only after the owner of GPU profiling releases it.
   Baseline responses come from source-before; no product files are written. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const runtime = '/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const pw = require(path.join(runtime, 'playwright')), { PNG } = require(path.join(runtime, 'pngjs'));
const out = __dirname, root = path.resolve(out, '../../..');
const base = process.env.PK_VISUAL_BASE || 'http://127.0.0.1:8201/';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Only loopback preview is authorized');
const origin = new URL(base).origin, widths = (process.env.PK_VISUAL_WIDTHS || '390,1440').split(',').map(Number);
const subpixelOnly = process.argv[2] === 'layout-subpixels';
const reportFile = path.join(out, subpixelOnly ? 'functional-layout-subpixels.json' : 'functional-qa.json');
const report = { startedAt: new Date().toISOString(), base, widths, checks: [], errors: [], missing: [],
  ownerVisualApproval: 'OPEN', physicalMobile: 'NOT_RUN', browserMode: 'standalone local Chrome',
  publication: 'NOT_RUN', formsSubmitted: false, externalRequestsAllowed: false };
const assert = (value, message) => { if (!value) throw Error(message); };
const files = ['index.html', 'assets/technology-field.css', 'assets/technology-field.mjs',
  'assets/material-finish.css', 'assets/luxury-world.mjs', 'catalog/projects.json'];
const fingerprint = () => Object.fromEntries(files.map(name => [name,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')]));
function save() {
  report.PASS = report.checks.filter(c => c.status === 'PASS').length;
  report.FAIL = report.checks.filter(c => c.status === 'FAIL').length;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
}
async function check(scope, name, fn) {
  try { report.checks.push({ scope, name, status: 'PASS', details: await fn() }); console.log('PASS', scope, name); }
  catch (e) { report.checks.push({ scope, name, status: 'FAIL', details: e.stack }); console.log('FAIL', scope, name, e.message); }
  save();
}
async function contextFor(browser, width, baseline = false) {
  const scope = `${baseline ? 'baseline' : 'after'}:${width}`;
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 1000 },
    deviceScaleFactor: 1, hasTouch: width < 500, isMobile: width < 500, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const request = route.request(), u = new URL(request.url());
    if (u.origin !== origin || !['GET', 'HEAD'].includes(request.method())) {
      report.errors.push({ scope, type: 'blocked-request', method: request.method(), url: request.url() });
      return route.abort();
    }
    const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1));
    const saved = path.join(out, 'source-before', rel);
    if (baseline && fs.existsSync(saved) && fs.statSync(saved).isFile()) return route.fulfill({ status: 200,
      contentType: rel.endsWith('.html') ? 'text/html' : rel.endsWith('.css') ? 'text/css' : 'text/javascript',
      body: fs.readFileSync(saved) });
    return route.continue();
  });
  await context.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function (...args) {
      const result = draw.apply(this, args);
      if (this.canvas.matches('.luxury-atmosphere') && window.__glassAlphaRequest) {
        const points = window.__glassAlphaRequest; window.__glassAlphaRequest = null;
        const width = this.drawingBufferWidth, height = this.drawingBufferHeight;
        const rgba = new Uint8Array(width * height * 4);
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, rgba);
        window.__glassAlphaResult = points.map(point => {
          const x = Math.max(0, Math.min(width - 1, Math.floor(point.x / innerWidth * width)));
          const y = Math.max(0, Math.min(height - 1, Math.floor((1 - point.y / innerHeight) * height)));
          return { ...point, alphaByte: rgba[(y * width + x) * 4 + 3] };
        });
      }
      return result;
    };
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', e => report.errors.push({ scope, type: 'pageerror', message: e.message }));
  page.on('response', response => { if (response.status() >= 400) report.missing.push({ scope, url: response.url(), status: response.status() }); });
  await page.goto(base, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
  await at(page, '#technologie', 250);
  return { context, page, scope };
}
async function at(page, selector, delay = 200) {
  await page.locator(selector).first().evaluate(e => scrollTo({ top: Math.max(0, scrollY + e.getBoundingClientRect().top - 130), behavior: 'instant' }));
  if (delay) await page.waitForTimeout(delay);
}
async function snapshot(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('#technologie .technology-group, #technologie .technology-group__title, #technologie .technology-chip, #technologie .technology-chip span')];
    return { documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
      groups: document.querySelectorAll('#technologie .technology-group').length,
      labels: [...document.querySelectorAll('#technologie .technology-chip')].map(e => ({ text: e.textContent.trim(), href: e.getAttribute('href') })),
      elements: nodes.map(e => { const s = getComputedStyle(e); let x = 0, y = 0;
        for (let p = e; p; p = p.offsetParent) { x += p.offsetLeft; y += p.offsetTop; }
        return { tag: e.tagName, className: e.className, x, y, width: e.offsetWidth, height: e.offsetHeight,
          fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing };
      }) };
  });
}
const field = page => page.locator('#technologie').evaluate(e => e.technologyField.metrics());
const haze = page => page.locator('#main').evaluate(e => e.luxuryWorld.metrics());
async function noPending(page, expected, name) {
  await page.waitForTimeout(180); const before = await field(page);
  await page.waitForTimeout(180); const after = await field(page);
  assert(expected(after), `${name}: unexpected state ${JSON.stringify(after)}`);
  assert(!after.rafPending && !after.timerPending && after.frames === before.frames, `${name}: queued/continuing technology animation`);
  return { before, after };
}
async function material(page, width) {
  const result = await page.locator('#technologie').evaluate(root => [...root.querySelectorAll('.technology-group')].map(e => {
    const face = getComputedStyle(e, '::after'), rim = getComputedStyle(e, '::before');
    const inner = getComputedStyle(e.querySelector('.technology-chips'), '::before');
    const colors = [...face.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map(match => {
      const parts = match[1].split(',').map(Number); return parts.length === 4 ? parts[3] : 1;
    });
    return { title: e.querySelector('h3').textContent.trim(), faceBackground: face.backgroundImage,
      maximumFaceStopAlpha: Math.max(...colors), faceColor: face.backgroundColor, filter: face.filter,
      backdropFilter: face.backdropFilter, rimClip: rim.clipPath, innerClip: inner.clipPath,
      rimSupported: CSS.supports('clip-path', rim.clipPath), innerSupported: CSS.supports('clip-path', inner.clipPath) };
  }));
  assert(result.length === 6, 'Expected six material groups');
  for (const group of result) {
    assert(Number.isFinite(group.maximumFaceStopAlpha) && group.maximumFaceStopAlpha < .17, `Opaque face stops: ${group.title}`);
    assert(group.faceColor === 'rgba(0, 0, 0, 0)', `Opaque face color: ${group.title}`);
    assert(group.rimSupported && group.innerSupported && group.rimClip.includes('evenodd') && group.innerClip.includes('evenodd'), `Cut glass rim unsupported: ${group.title}`);
    assert(group.filter === 'none' && group.backdropFilter === 'none', `Added expensive face filter: ${group.title}`);
  }
  const pixelProof = [];
  if (width >= 1000) for (const group of result) {
    // A temporary isolated probe rasterizes the actual computed CSS clip. It is
    // removed immediately; screenshot bytes are inspected, not published as UI.
    await page.evaluate(clip => {
      const probe = document.createElement('div'); probe.id = 'qa-glass-rim-probe';
      probe.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:200px;z-index:2147483647;background:#000;pointer-events:none;contain:strict';
      const edge = document.createElement('div'); edge.style.cssText = 'position:absolute;inset:0;background:#fff'; edge.style.clipPath = clip;
      probe.append(edge); document.body.append(probe);
    }, group.rimClip);
    try {
      const png = PNG.sync.read(await page.locator('#qa-glass-rim-probe').screenshot({ animations: 'disabled' }));
      let centerMax = 0, brightPixels = 0;
      for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        const offset = (y * png.width + x) * 4, value = Math.max(png.data[offset], png.data[offset + 1], png.data[offset + 2]);
        if (value > 180) brightPixels++;
        if (x > png.width * .4 && x < png.width * .6 && y > png.height * .4 && y < png.height * .6) centerMax = Math.max(centerMax, value);
      }
      assert(centerMax < 3 && brightPixels > 100, `Rim is filled or invisible: ${group.title}, centre=${centerMax}, edge pixels=${brightPixels}`);
      pixelProof.push({ title: group.title, centerMax, brightPixels, width: png.width, height: png.height });
    } finally { await page.locator('#qa-glass-rim-probe').evaluate(e => e.remove()); }
  }
  return { computed: result, rasterizedHollowRims: pixelProof, note: 'CSS transparency and cut edges are verified; this does not claim physical optical refraction.' };
}
async function qaWidth(browser, width) {
  const before = await contextFor(browser, width, true); const expected = await snapshot(before.page); await before.context.close();
  const { context, page, scope } = await contextFor(browser, width);
  try {
    await check(scope, 'Layout, fonts, six groups and every technology link label match the pre-fix source', async () => {
      const actual = await snapshot(page); assert(actual.documentWidth <= width, 'Horizontal page overflow');
      const changes = actual.elements.flatMap((e, i) => JSON.stringify(e) === JSON.stringify(expected.elements[i]) ? [] : [{ index: i, before: expected.elements[i], after: e }]);
      assert(actual.elements.length === expected.elements.length && !changes.length, `Workshop geometry/font changed: ${JSON.stringify(changes.slice(0, 3))}`);
      assert(JSON.stringify(actual.labels) === JSON.stringify(expected.labels), 'Technology names, counts or links changed');
      assert(actual.documentHeight === expected.documentHeight && actual.groups === 6, 'Document height or group count changed');
      return { elements: actual.elements.length, labels: actual.labels.length, groups: actual.groups, documentWidth: actual.documentWidth, documentHeight: actual.documentHeight, exactBaselineMatch: true };
    });
    await check(scope, 'Clear face and supported hollow double glass edges', () => material(page, width));
    await check(scope, 'Reduced motion has no queued timer or animation', () => noPending(page, m => m.reduced && m.paused, 'reduced motion'));
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await at(page, '#technologie .technology-group', 400);
    await check(scope, 'Real keyboard navigation keeps a visible technology focus and active group', async () => {
      const first = page.locator('#technologie .technology-chip').first(); await first.focus(); await page.keyboard.press('Tab');
      const result = await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return {
        text: e.textContent.trim(), link: e.matches('#technologie .technology-chip'), focusVisible: e.matches(':focus-visible'),
        outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, activeGroup: e.closest('.technology-group')?.classList.contains('is-field-active') };
      });
      assert(result.link && result.focusVisible && result.activeGroup && result.outlineStyle !== 'none' && parseFloat(result.outlineWidth) >= 1, 'Keyboard focus is missing');
      await page.evaluate(() => document.activeElement.blur()); return result;
    });
    await check(scope, 'Technology hover keeps haze alpha exactly zero over visible labels', async () => {
      await at(page, '#technologie .technology-group', 450);
      const link = page.locator('#technologie .technology-group').first().locator('a').first();
      if (width >= 1000) await link.hover(); else await link.focus();
      await page.waitForTimeout(400);
      const armed = await page.evaluate(() => {
        const points = [...document.querySelectorAll('#technologie .technology-group:first-child h3, #technologie .technology-group:first-child a')].map(e => {
          const r = e.getBoundingClientRect(); return { text: e.textContent.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom };
        }).filter(p => p.x > 0 && p.x < innerWidth && p.top > 85 && p.bottom < innerHeight);
        window.__glassAlphaResult = null; window.__glassAlphaRequest = points; return points.length;
      });
      assert(armed >= 2, 'No visible label points');
      await page.waitForFunction(() => window.__glassAlphaResult !== null);
      const points = await page.evaluate(() => window.__glassAlphaResult);
      assert(points.length === armed && points.every(p => p.alphaByte === 0), `Haze covers text: ${JSON.stringify(points)}`);
      return { points, state: await haze(page), pointerMode: width >= 1000 ? 'real hover' : 'keyboard focus, mobile pointer model' };
    });
    await check(scope, 'Scroll creates no technology animation frames or gradient writes', async () => {
      await page.mouse.move(4, 80); await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(100);
      const before = await field(page); const start = await page.evaluate(() => scrollY);
      for (const delta of [15, 30, 45, 60, 75, 90]) { await page.evaluate(y => scrollTo(0, y), start + delta); await page.waitForTimeout(20); }
      const after = await field(page), styles = await page.locator('#technologie').evaluate(e => [e, ...e.querySelectorAll('.technology-group')].map(x => x.getAttribute('style') || ''));
      assert(before.frames === after.frames && !after.rafPending && !after.timerPending, 'Scroll schedules technology animation');
      assert(styles.every(s => !/--field-(scan|x|y)\s*:/.test(s)), 'Scroll/pointer writes gradient variables');
      return { before, after, inlineStyles: styles };
    });
    await check(scope, 'Global pause cancels queued optical work', async () => {
      await page.locator('[data-hero-motion-toggle]').evaluate(e => e.click());
      await page.waitForFunction(() => document.documentElement.dataset.interfaceMotion === 'paused');
      await at(page, '#technologie .technology-group', 350);
      const paused = await noPending(page, m => m.paused, 'global pause'); const atmosphere = await haze(page);
      assert(atmosphere.paused && !atmosphere.rafPending && !atmosphere.timerPending, 'Paused atmosphere keeps scheduling');
      await page.locator('[data-hero-motion-toggle]').evaluate(e => e.click());
      await page.waitForFunction(() => document.documentElement.dataset.interfaceMotion === 'running');
      return { technology: paused, atmosphere };
    });
    await check(scope, 'Offscreen Workshop stops all queued technology work', async () => {
      await at(page, 'footer', 300); await page.waitForFunction(() => !document.querySelector('#technologie').technologyField.metrics().visible);
      return noPending(page, m => !m.visible, 'offscreen');
    });
  } finally { await context.close(); }
}
async function subpixelLayout(browser, width) {
  async function measured(page) {
    return page.evaluate(() => {
      const groupTransforms = [...document.querySelectorAll('#technologie .technology-group')].map(e => getComputedStyle(e).transform);
      const elements = [...document.querySelectorAll('#technologie .technology-group, #technologie .technology-group__title, #technologie .technology-chip, #technologie .technology-chip span')].map(e => {
        const rect = e.getBoundingClientRect(), style = getComputedStyle(e);
        return { tag: e.tagName, className: e.className, text: e.textContent.trim(), href: e.getAttribute('href'),
          x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height,
          fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight,
          lineHeight: style.lineHeight, letterSpacing: style.letterSpacing };
      });
      return { elements, groupTransforms, reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
        documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight };
    });
  }
  const before = await contextFor(browser, width, true); const expected = await measured(before.page); await before.context.close();
  const after = await contextFor(browser, width);
  try { await check(after.scope, 'Actual subpixel document-space rectangles and fonts exactly match baseline', async () => {
    const actual = await measured(after.page);
    assert(expected.reduced && actual.reduced && [...expected.groupTransforms, ...actual.groupTransforms].every(v => v === 'none'), 'Measurement must exclude CSS transforms');
    const changes = actual.elements.flatMap((e, i) => JSON.stringify(e) === JSON.stringify(expected.elements[i]) ? [] : [{ index: i, before: expected.elements[i], after: e }]);
    const result = { elements: actual.elements.length, precision: 'exact DOMRect double values; no rounding or tolerance', changes,
      document: { before: { width: expected.documentWidth, height: expected.documentHeight }, after: { width: actual.documentWidth, height: actual.documentHeight } },
      baseline: expected.elements, actual: actual.elements,
      originalOffsetParentReport: 'functional-qa.json: 17 PASS / 1 FAIL retained without alteration' };
    report.subpixelEvidence = result;
    assert(actual.elements.length === expected.elements.length && !changes.length, `Actual visual rectangles changed: ${JSON.stringify(changes.slice(0, 3))}`);
    assert(actual.documentWidth === expected.documentWidth && actual.documentHeight === expected.documentHeight && actual.documentWidth <= width, 'Actual document dimensions changed/overflow');
    return { elements: result.elements, precision: result.precision, changes: changes.length, document: result.document, originalOffsetParentReport: result.originalOffsetParentReport };
  }); } finally { await after.context.close(); }
}
async function main() {
  report.sourceBefore = fingerprint(); save();
  const browser = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=gl'] });
  try { report.browserVersion = browser.version(); for (const width of (subpixelOnly ? [1440] : widths)) {
    if (subpixelOnly) await subpixelLayout(browser, width); else await qaWidth(browser, width);
  } }
  finally { await browser.close(); }
  await check('all', 'No page errors, missing local resources or external requests', async () => {
    assert(!report.errors.length && !report.missing.length, JSON.stringify({ errors: report.errors, missing: report.missing }));
    return { pageErrors: 0, missingResources: 0, externalRequests: 0 };
  });
  report.sourceAfter = fingerprint();
  await check('all', 'Product source remained unchanged during QA', async () => {
    assert(JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter), 'Source changed during QA'); return { files: files.length };
  });
  report.finishedAt = new Date().toISOString(); report.status = report.FAIL ? 'FAIL' : 'AUTOMATED_CHECKS_PASS_VISUAL_APPROVAL_OPEN'; save();
  console.log(JSON.stringify({ status: report.status, PASS: report.PASS, FAIL: report.FAIL, report: path.relative(root, reportFile) }));
  if (report.FAIL) process.exitCode = 1;
}
main().catch(e => { report.status = 'BLOCKED_OR_ABORTED'; report.failure = e.stack; report.finishedAt = new Date().toISOString(); save(); console.error(e); process.exitCode = 1; });
