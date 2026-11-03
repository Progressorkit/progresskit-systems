/* Scoped Workshop browser QA. Baseline is source-before, never HEAD. No source writes.
   Run only after the GPU profiling owner releases the browser. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const runtime = '/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const pw = require(path.join(runtime, 'playwright')), { PNG } = require(path.join(runtime, 'pngjs'));
const out = __dirname, root = path.resolve(out, '../../..');
const base = process.env.PK_VISUAL_BASE || 'http://127.0.0.1:8201/';
const origin = new URL(base).origin;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Only loopback preview is authorized');
const reportFile = path.join(out, 'functional-qa.json');
if (fs.existsSync(reportFile)) {
  const prior = JSON.parse(fs.readFileSync(reportFile));
  fs.copyFileSync(reportFile, path.join(out, `functional-qa-prior-${prior.startedAt.replace(/[:.]/g, '-')}.json`));
}
const report = { startedAt: new Date().toISOString(), base, checks: [], errors: [], missing: [],
  ownerVisualApproval: 'OPEN', physicalMobile: 'NOT_RUN', browserMode: 'standalone local Chrome',
  publication: 'NOT_RUN', formsSubmitted: false, externalRequestsAllowed: false,
  note: 'DOM/CSS and emulated input checks are not owner visual approval or physical-device proof.' };
const files = ['index.html', 'assets/technology-field.css', 'assets/technology-field.mjs',
  'assets/material-finish.css', 'assets/luxury-world.mjs', 'assets/showroom-3d.mjs', 'assets/showroom-scene.mjs', 'catalog/projects.json'];
const fingerprint = () => Object.fromEntries(files.map(name => [name,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')]));
const assert = (value, message) => { if (!value) throw Error(message); };
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
async function at(page, selector, delay = 250) {
  await page.locator(selector).first().evaluate(e => scrollTo({ top: Math.max(0, scrollY + e.getBoundingClientRect().top - 140), behavior: 'instant' }));
  if (delay) await page.waitForTimeout(delay);
}
async function contextFor(browser, width, baseline = false) {
  const scope = `${baseline ? 'before' : 'after'}:${width}`;
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 1000 },
    deviceScaleFactor: 1, hasTouch: width < 500, isMobile: width < 500, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const request = route.request(), u = new URL(request.url());
    if (u.origin !== origin || !['GET', 'HEAD'].includes(request.method())) {
      report.errors.push({ scope, type: 'blocked-request', method: request.method(), url: request.url() }); return route.abort();
    }
    const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1));
    const saved = path.join(out, 'source-before', rel);
    if (baseline && fs.existsSync(saved) && fs.statSync(saved).isFile()) return route.fulfill({ status: 200,
      contentType: rel.endsWith('.html') ? 'text/html' : rel.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(saved) });
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__qaContexts = [];
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...rest) {
      const value = get.call(this, type, ...rest);
      if (value && /webgl/i.test(type) && !window.__qaContexts.some(x => x.canvas === this)) window.__qaContexts.push({ canvas: this, type });
      return value;
    };
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function (...args) {
      const result = draw.apply(this, args);
      if (this.canvas.matches('.luxury-atmosphere') && window.__crystalAlphaRequest) {
        const points = window.__crystalAlphaRequest; window.__crystalAlphaRequest = null;
        const width = this.drawingBufferWidth, height = this.drawingBufferHeight;
        const rgba = new Uint8Array(width * height * 4);
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, rgba);
        window.__crystalAlphaResult = points.map(point => {
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
  await page.goto(base, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready); await at(page, '#technologie');
  return { context, page, scope };
}
async function snapshot(page) {
  return page.evaluate(() => {
    const groups = [...document.querySelectorAll('#technologie .technology-group')];
    const nodes = [...document.querySelectorAll('#technologie .technology-group, #technologie .technology-group__title, #technologie .technology-chip, #technologie .technology-chip span')];
    return { documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
      groupTransforms: groups.map(e => getComputedStyle(e).transform),
      reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
      webglContexts: window.__qaContexts.map(x => ({ type: x.type, className: x.canvas.className, showroom: x.canvas.hasAttribute('data-showroom-canvas') })),
      groups: groups.length,
      labels: [...document.querySelectorAll('#technologie .technology-chip')].map(e => ({ text: e.textContent.trim(), href: e.getAttribute('href') })),
      baselineClips: groups.map(e => getComputedStyle(e, '::before').clipPath),
      elements: nodes.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return { tag: e.tagName, className: [...e.classList].filter(c => !/^is-field-/.test(c)).join(' '),
          x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height,
          fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing };
      }) };
  });
}
const field = page => page.locator('#technologie').evaluate(e => e.technologyField.metrics());
async function noPending(page, predicate, name) {
  await page.waitForTimeout(180); const before = await field(page);
  const animations = await page.locator('#technologie').evaluate(e => e.getAnimations({ subtree: true })
    .filter(a => a.animationName?.startsWith('technology-crystal')).map(a => ({ name: a.animationName, state: a.playState })));
  await page.waitForTimeout(180); const after = await field(page);
  assert(predicate(after), `${name}: unexpected state ${JSON.stringify(after)}`);
  assert(!after.rafPending && !after.timerPending && !after.settlingTimerPending && !after.busy && after.frames === before.frames, `${name}: pending/continuing technology work`);
  assert(animations.every(a => a.state !== 'running'), `${name}: running crystal animation ${JSON.stringify(animations)}`);
  return { before, after, animations };
}
async function rasterClip(page, clip) {
  await page.evaluate(value => {
    const probe = document.createElement('div'); probe.id = 'qa-crystal-rim-probe';
    probe.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:200px;z-index:2147483647;background:#000;pointer-events:none;contain:strict';
    const edge = document.createElement('div'); edge.style.cssText = 'position:absolute;inset:0;background:#fff'; edge.style.clipPath = value;
    probe.append(edge); document.body.append(probe);
  }, clip);
  try {
    const png = PNG.sync.read(await page.locator('#qa-crystal-rim-probe').screenshot({ animations: 'disabled' }));
    let centerMax = 0, brightPixels = 0;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      const o = (y * png.width + x) * 4, value = Math.max(png.data[o], png.data[o + 1], png.data[o + 2]);
      if (value > 180) brightPixels++;
      if (x > png.width * .4 && x < png.width * .6 && y > png.height * .4 && y < png.height * .6) centerMax = Math.max(centerMax, value);
    }
    return { centerMax, brightPixels, width: png.width, height: png.height };
  } finally { await page.locator('#qa-crystal-rim-probe').evaluate(e => e.remove()); }
}
async function optics(page) {
  return page.locator('#technologie .technology-group').first().evaluate(e => {
    const energy = e.querySelector('.technology-crystal__energy'), front = getComputedStyle(e, '::after'), bevel = getComputedStyle(e, '::before');
    return { active: e.classList.contains('is-field-active'), energyOpacity: Number(getComputedStyle(energy).opacity), emberOpacity: Number(getComputedStyle(e.querySelector('.technology-crystal__ember')).opacity),
      frontBackground: front.backgroundImage, frontColor: front.backgroundColor, frontShadow: front.boxShadow,
      frontFilter: front.filter, frontBackdropFilter: front.backdropFilter, bevelClip: bevel.clipPath,
      bevelInset: [bevel.top, bevel.right, bevel.bottom, bevel.left],
      labelColor: getComputedStyle(e.querySelector('a')).color, transform: getComputedStyle(e).transform };
  });
}
async function qaWidth(browser, width) {
  const before = await contextFor(browser, width, true); const expected = await snapshot(before.page); await before.context.close();
  const { context, page, scope } = await contextFor(browser, width);
  try {
    await check(scope, 'Exact document-space geometry, fonts and all 110 technology filter links stay unchanged', async () => {
      const actual = await snapshot(page);
      assert(expected.reduced && actual.reduced && [...expected.groupTransforms, ...actual.groupTransforms].every(t => t === 'none'), 'Geometry comparison must exclude transforms');
      const changes = actual.elements.flatMap((e, i) => JSON.stringify(e) === JSON.stringify(expected.elements[i]) ? [] : [{ index: i, before: expected.elements[i], after: e }]);
      report[`geometry:${width}`] = { before: expected.elements, after: actual.elements, changes };
      assert(actual.elements.length === expected.elements.length && !changes.length, `Geometry/font changed ${JSON.stringify(changes.slice(0, 3))}`);
      assert(actual.documentWidth === expected.documentWidth && actual.documentWidth <= width && actual.documentHeight === expected.documentHeight, 'Document dimensions changed/overflow');
      assert(actual.groups === 6 && actual.labels.length === 110 && JSON.stringify(actual.labels) === JSON.stringify(expected.labels), 'Names/counts/filter hrefs changed');
      assert(JSON.stringify(actual.webglContexts) === JSON.stringify(expected.webglContexts), 'Additional WebGL context added');
      return { elements: actual.elements.length, groups: actual.groups, links: actual.labels.length, documentWidth: actual.documentWidth, documentHeight: actual.documentHeight, rectanglePrecision: 'exact DOMRect doubles, no rounding/tolerance', webglContexts: actual.webglContexts };
    });
    await check(scope, 'Decorative crystal layers preserve interaction and accessibility', async () => {
      const result = await page.locator('#technologie').evaluate(root => [...root.querySelectorAll('.technology-group')].map(group => {
        const optics = group.querySelector('.technology-crystal');
        return { layers: group.querySelectorAll('.technology-crystal').length, energy: optics?.querySelectorAll('.technology-crystal__energy').length,
          reflection: optics?.querySelectorAll('.technology-crystal__reflection').length, ember: optics?.querySelectorAll('.technology-crystal__ember').length, hidden: optics?.getAttribute('aria-hidden'),
          pointerEvents: optics ? getComputedStyle(optics).pointerEvents : null, focusable: optics?.querySelectorAll('a,button,input,[tabindex]').length };
      }));
      assert(result.length === 6 && result.every(x => x.layers === 1 && x.energy === 1 && x.reflection === 1 && x.ember === 1 && x.hidden === 'true' && x.pointerEvents === 'none' && x.focusable === 0), 'Crystal layer blocks/duplicates content'); return result;
    });
    await check(scope, 'Wide hollow bevel is thicker than the previous thin rim and front remains smoked', async () => {
      const current = await optics(page), old = await rasterClip(page, expected.baselineClips[0]), thick = await rasterClip(page, current.bevelClip);
      assert(thick.centerMax < 3 && thick.brightPixels > old.brightPixels * 2, `Bevel is filled or not thicker ${JSON.stringify({ old, thick })}`);
      assert(current.frontFilter === 'none' && current.frontBackdropFilter === 'none', 'Costly panel filter added');
      assert(current.frontColor === 'rgba(0, 0, 0, 0)' && /inset/.test(current.frontShadow) && /radial-gradient/.test(current.frontBackground), 'Missing dark convex material layers');
      return { previousRim: old, bevel: thick, optics: current, note: 'Raster proves a wider sidewall silhouette; perceived material quality remains owner review.' };
    });
    await check(scope, 'Reduced motion stops moving reflections and both computed rim transitions', async () => {
      const state = await noPending(page, m => m.reduced && m.paused, 'reduced motion');
      const rims = await page.locator('#technologie .technology-group').first().evaluate(e => ({
        sidewall: getComputedStyle(e, '::before').transitionDuration,
        returnRim: getComputedStyle(e.querySelector('.technology-chips'), '::before').transitionDuration,
        reflection: getComputedStyle(e.querySelector('.technology-crystal__reflection')).animationName }));
      assert(rims.sidewall === '0s' && rims.returnRim === '0s' && rims.reflection === 'none', 'Reduced motion retains a computed rim transition');
      return { ...state, rims };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await at(page, '#technologie .technology-group', 400);
    await page.mouse.move(4, 80); await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(350);
    const idle = await optics(page);
    await check(scope, 'Real keyboard Tab powers the crystal while retaining visible focus', async () => {
      await page.locator('#technologie .technology-chip').first().focus(); await page.keyboard.press('Tab'); await page.waitForTimeout(350);
      const result = await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return {
        text: e.textContent.trim(), href: e.getAttribute('href'), link: e.matches('#technologie .technology-chip'), focusVisible: e.matches(':focus-visible'),
        outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, activeGroup: e.closest('.technology-group')?.classList.contains('is-field-active') };
      });
      const active = await optics(page);
      assert(result.link && result.focusVisible && result.activeGroup && result.outlineStyle !== 'none' && parseFloat(result.outlineWidth) >= 1, 'Keyboard focus missing');
      assert(active.energyOpacity > idle.energyOpacity + .3 && active.emberOpacity > idle.emberOpacity + .3 && active.labelColor !== idle.labelColor, 'Focus does not power inner surface and improve text contrast');
      assert(active.frontBackground === idle.frontBackground, 'Activation rewrites static front gradients');
      await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(350); return { focus: result, idle, active };
    });
    await check(scope, width < 500 ? 'Trusted touch powers empty glass body and a second tap releases it' : 'Trusted hover powers inner glass while cursor tilt writes no gradient variables', async () => {
      const first = page.locator('#technologie .technology-group').first(); await at(page, '#technologie .technology-group', 350);
      if (width < 500) {
        // A title is non-interactive body content, so tapping it must never navigate or filter.
        const title = first.locator('h3'), framesBeforeTap = (await field(page)).frames; await title.tap(); await page.waitForTimeout(350);
        const active = await optics(page), state = await field(page);
        assert(active.active && active.energyOpacity > idle.energyOpacity + .3 && active.emberOpacity > idle.emberOpacity + .3, 'Touch did not power crystal');
        assert(state.frames === framesBeforeTap, 'Coarse pointer starts tilt work');
        await title.tap(); await page.waitForTimeout(350); assert(!(await optics(page)).active, 'Second body tap does not release');
        return { input: 'Playwright touchscreen trusted tap on non-interactive title', active, state };
      }
      await first.locator('h3').hover(); await page.waitForTimeout(350);
      const box = await first.boundingBox();
      for (const p of [.3, .45, .6, .7]) { await page.mouse.move(box.x + box.width * p, Math.min(750, box.y + box.height * .4)); await page.waitForTimeout(50); }
      const active = await optics(page), state = await field(page);
      const styles = await first.getAttribute('style');
      assert(active.active && active.energyOpacity > idle.energyOpacity + .3 && active.emberOpacity > idle.emberOpacity + .3, 'Hover does not power inner glass');
      assert(state.frames > 0 && state.gradientUpdates === 0 && !/--field-(x|y|scan)\s*:/.test(styles || ''), 'Pointer updates gradients or never responds');
      assert(active.frontBackground === idle.frontBackground, 'Pointer changes rasterized front gradient');
      const busyAnimations = await first.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.animationName?.startsWith('technology-crystal')).map(a => ({ name: a.animationName, state: a.playState })));
      assert(state.busy && state.settlingTimerPending && busyAnimations.every(a => a.state === 'paused'), 'Moving pointer does not yield reflection work');
      await page.waitForTimeout(220); const settled = await field(page);
      const resumed = await first.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.animationName?.startsWith('technology-crystal')).map(a => ({ name: a.animationName, state: a.playState })));
      assert(!settled.busy && !settled.settlingTimerPending && resumed.some(a => a.state === 'running'), 'Reflection does not resume after input settles');
      await page.waitForTimeout(250);
      const steady = await first.evaluate(e => { const m = new DOMMatrix(getComputedStyle(e).transform); return { transform: getComputedStyle(e).transform, scale: Math.hypot(m.m11, m.m12, m.m13), energyTransform: getComputedStyle(e.querySelector('.technology-crystal__energy')).transform, emberTransform: getComputedStyle(e.querySelector('.technology-crystal__ember')).transform }; });
      assert(steady.scale >= 1.01 && steady.scale <= 1.02 && steady.energyTransform !== 'none' && steady.emberTransform !== 'none', 'Settled cursor lacks restrained lift or moving internal light');
      return { idle, active, metrics: state, busyAnimations, settled, resumed, steady, inlineStyle: styles };
    });
    if (width >= 1000) await check(scope, 'Changing keyboard focus releases the previous heavy glass and its two light transforms', async () => {
      const first = page.locator('#technologie .technology-group').first();
      const initial = await first.evaluate(e => ({ group: e.style.transform, energy: e.querySelector('.technology-crystal__energy').style.transform, ember: e.querySelector('.technology-crystal__ember').style.transform }));
      assert(initial.group && initial.energy && initial.ember, 'Cleanup fixture lacks a previously settled cursor transform');
      await page.locator('#technologie .technology-group').nth(1).locator('a').first().focus(); await page.waitForTimeout(250);
      const result = await first.evaluate(e => ({ group: e.style.transform, energy: e.querySelector('.technology-crystal__energy').style.transform, ember: e.querySelector('.technology-crystal__ember').style.transform, active: e.classList.contains('is-field-active') }));
      assert(!result.group && !result.energy && !result.ember && !result.active && (await field(page)).active === 1, 'Previous glass retains pointer transform after keyboard focus changes');
      await page.evaluate(() => document.activeElement.blur()); return { initial, result };
    });
    await check(scope, 'Crystal keyframes change only transform/opacity and idle is confined to visible specimens', async () => {
      await page.mouse.move(4, 80); await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(350);
      const result = await page.locator('#technologie').evaluate(root => {
        const keyframes = [];
        const scan = rules => { for (const rule of rules) {
          if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name.startsWith('technology-crystal')) keyframes.push({ name: rule.name, properties: [...new Set([...rule.cssRules].flatMap(x => [...x.style]))] });
          else if (rule.cssRules) scan(rule.cssRules);
        } };
        for (const sheet of document.styleSheets) { try { scan(sheet.cssRules); } catch {} }
        const specimens = [...root.querySelectorAll('.technology-group')].map(group => ({ visible: group.classList.contains('is-field-visible'),
          animations: group.getAnimations({ subtree: true }).filter(a => a.animationName?.startsWith('technology-crystal')).map(a => ({ name: a.animationName, state: a.playState })) }));
        return { keyframes, specimens, motion: root.dataset.fieldMotion };
      });
      assert(result.keyframes.length >= 2 && result.keyframes.every(x => x.properties.length && x.properties.every(p => ['transform', 'opacity'].includes(p))), 'Paint properties animated in crystal keyframes');
      assert(result.specimens.some(x => x.visible && x.animations.some(a => a.state === 'running')), 'No live reflection in visible idle specimens');
      assert(result.specimens.filter(x => !x.visible).every(x => !x.animations.some(a => a.state === 'running')), 'Offscreen specimen runs idle reflection');
      return result;
    });
    await check(scope, 'Haze remains transparent over visible technology labels during active material state', async () => {
      await at(page, '#technologie .technology-group', 450);
      const first = page.locator('#technologie .technology-group').first();
      if (width < 500) await first.locator('h3').tap(); else await first.locator('h3').hover(); await page.waitForTimeout(400);
      const count = await page.evaluate(() => {
        const points = [...document.querySelectorAll('#technologie .technology-group:first-child h3, #technologie .technology-group:first-child a')].map(e => {
          const r = e.getBoundingClientRect(); return { text: e.textContent.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom };
        }).filter(p => p.x > 0 && p.x < innerWidth && p.top > 85 && p.bottom < innerHeight);
        window.__crystalAlphaResult = null; window.__crystalAlphaRequest = points; return points.length;
      });
      assert(count >= 2, 'Too few visible label points'); await page.waitForFunction(() => window.__crystalAlphaResult !== null);
      const result = await page.evaluate(() => window.__crystalAlphaResult);
      assert(result.length === count && result.every(x => x.alphaByte === 0), `Haze overlays labels ${JSON.stringify(result)}`); return { points: result };
    });
    await check(scope, 'Scroll schedules no technology pointer frames and no dynamic gradient writes', async () => {
      await page.mouse.move(4, 80); await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(150);
      const before = await field(page), start = await page.evaluate(() => scrollY);
      for (const d of [15, 30, 45, 60, 75, 90]) { await page.evaluate(y => scrollTo(0, y), start + d); await page.waitForTimeout(20); }
      const after = await field(page), styles = await page.locator('#technologie').evaluate(e => [e, ...e.querySelectorAll('.technology-group')].map(x => x.getAttribute('style') || ''));
      assert(before.frames === after.frames && !after.rafPending && !after.timerPending, 'Scroll schedules pointer work');
      assert(styles.every(s => !/--field-(scan|x|y)\s*:/.test(s)), 'Dynamic gradient properties written');
      await page.waitForTimeout(220); const settled = await field(page);
      assert(!settled.settlingTimerPending && !settled.busy && settled.frames === before.frames, 'Scroll settling timer leaks or schedules pointer frames');
      return { before, duringSettle: after, settled };
    });
    await check(scope, 'Global pause stops moving crystal light and cancels pointer work', async () => {
      await page.locator('[data-hero-motion-toggle]').evaluate(e => e.click());
      await page.waitForFunction(() => document.documentElement.dataset.interfaceMotion === 'paused');
      await at(page, '#technologie .technology-group'); const state = await noPending(page, m => m.paused, 'global pause');
      await page.locator('[data-hero-motion-toggle]').evaluate(e => e.click());
      await page.waitForFunction(() => document.documentElement.dataset.interfaceMotion === 'running'); return state;
    });
    await check(scope, 'Offscreen Workshop stops reflections and queued pointer work', async () => {
      await at(page, 'footer', 300); await page.waitForFunction(() => !document.querySelector('#technologie').technologyField.metrics().visible);
      return noPending(page, m => !m.visible, 'offscreen');
    });
    await check(scope, 'Forced colors keeps links readable with no crystal animation', async () => {
      await page.emulateMedia({ forcedColors: 'active' }); await at(page, '#technologie .technology-group');
      const state = await noPending(page, m => m.forcedColors && m.paused, 'forced colors');
      const result = await page.locator('#technologie .technology-group').first().evaluate(e => ({ glass: getComputedStyle(e.querySelector('.technology-crystal')).display, link: getComputedStyle(e.querySelector('a')).color, opacity: getComputedStyle(e).opacity }));
      assert(result.glass === 'none' && result.opacity === '1', 'Forced colors keeps decorative interference');
      await page.emulateMedia({ forcedColors: 'none' }); return { ...state, computed: result };
    });
    await check(scope, 'Printing an active crystal keeps labels and counts dark and all 110 links present', async () => {
      await at(page, '#technologie .technology-group'); await page.locator('#technologie .technology-chip').first().focus();
      await page.emulateMedia({ media: 'print' });
      try {
        const result = await page.locator('#technologie').evaluate(root => ({ links: root.querySelectorAll('.technology-chip').length,
          active: root.querySelector('.technology-group').classList.contains('is-field-active'),
          colors: [...root.querySelectorAll('.technology-group:first-child h3, .technology-group:first-child a, .technology-group:first-child a span')].map(e => getComputedStyle(e).color),
          optics: getComputedStyle(root.querySelector('.technology-crystal')).display }));
        assert(result.links === 110 && result.active && result.optics === 'none' && result.colors.every(c => c === 'rgb(17, 17, 17)'), 'Print loses readability or links'); return result;
      } finally { await page.emulateMedia({ media: 'screen' }); await page.evaluate(() => document.activeElement.blur()); }
    });
    if (width >= 1000) await check(scope, 'Disposing the Workshop clears optical layers, active state and all pending work', async () => {
      await at(page, '#technologie .technology-group'); await page.locator('#technologie .technology-group h3').first().hover();
      const initial = await field(page); await page.locator('#technologie').evaluate(e => e.technologyField.dispose());
      const stopped = await noPending(page, m => m.disposed, 'dispose');
      const contents = await page.locator('#technologie').evaluate(e => ({ groups: e.querySelectorAll('.technology-group').length, links: e.querySelectorAll('.technology-chip').length, decorativeLayers: e.querySelectorAll('.technology-crystal').length }));
      assert(contents.groups === 6 && contents.links === 110 && contents.decorativeLayers === 0 && stopped.after.active === null, 'Dispose removes content or leaves active optics');
      return { initial, stopped, contents };
    });
    if (width < 500) await check(scope, 'Trusted tap on technology anchor retains native catalog navigation and filter selection', async () => {
      await at(page, '#technologie .technology-group'); const first = page.locator('#technologie .technology-chip').first(), href = await first.getAttribute('href');
      const expectedURL = new URL(href, base); await Promise.all([page.waitForURL(url => url.pathname === expectedURL.pathname && url.search === expectedURL.search), first.tap()]);
      await page.waitForLoadState('networkidle'); const selected = await page.locator('#technology-filter').inputValue();
      assert(selected === expectedURL.searchParams.get('technologia'), `Native technology filter selection wrong: ${selected}`);
      return { input: 'trusted touchscreen tap', URL: page.url(), selected };
    });
  } finally { await context.close(); }
}
async function main() {
  report.sourceBefore = fingerprint(); save();
  const browser = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=gl'] });
  try { report.browserVersion = browser.version(); for (const width of [390, 1440]) await qaWidth(browser, width); }
  finally { await browser.close(); }
  await check('all', 'No page errors, missing resources or external requests', async () => {
    assert(!report.errors.length && !report.missing.length, JSON.stringify({ errors: report.errors, missing: report.missing }));
    return { pageErrors: 0, missingResources: 0, externalRequests: 0 };
  });
  report.sourceAfter = fingerprint();
  await check('all', 'All eight product sources remain byte-identical throughout QA', async () => {
    assert(JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter), 'Source changed during QA'); return { files: files.length };
  });
  report.finishedAt = new Date().toISOString(); report.status = report.FAIL ? 'FAIL' : 'AUTOMATED_CHECKS_PASS_VISUAL_APPROVAL_OPEN'; save();
  console.log(JSON.stringify({ status: report.status, PASS: report.PASS, FAIL: report.FAIL, report: path.relative(root, reportFile) }));
  if (report.FAIL) process.exitCode = 1;
}
main().catch(e => { report.status = 'BLOCKED_OR_ABORTED'; report.failure = e.stack; report.finishedAt = new Date().toISOString(); save(); console.error(e); process.exitCode = 1; });
