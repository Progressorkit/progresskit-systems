/* Local evidence only. Invoke --preflight now; --record requires the final UI signal. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');

function resolvePlaywright() {
  if (process.env.PK_PLAYWRIGHT) return require.resolve(process.env.PK_PLAYWRIGHT);
  try {
    return require.resolve('playwright');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require.resolve(path.join(os.homedir(), '.cache', 'codex-runtimes',
      'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
  }
}

const pwEntry = resolvePlaywright();
const core = path.dirname(require.resolve('playwright-core/package.json',
  {paths: [path.dirname(pwEntry)]}));
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/evidence/crystal-world-20261125');
const mode = process.argv[2];
const recording = process.argv.includes('--record');
const rehearsing = process.argv.includes('--rehearse');
assert(['preflight', 'desktop', 'mobile', 'hero'].includes(mode),
  'Use preflight or desktop/mobile/hero --record');
assert(!recording || !rehearsing, 'A rehearsal cannot record a movie');
assert(mode === 'preflight' || rehearsing || (recording && process.env.PK_CRYSTAL_RECORD === '1'),
  'Final recordings require explicit --record and PK_CRYSTAL_RECORD=1');
assert(mode !== 'preflight' || !recording, 'Preflight never records a movie');
fs.mkdirSync(out, {recursive: true});
const base = new URL(process.env.PK_QA_URL || 'http://127.0.0.1:8277').origin;
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local origin only');
const isolated = JSON.parse(fs.readFileSync(path.join(out, 'isolated-preview.json')));
assert.equal(base, isolated.url, 'Use the dedicated isolated preview, never production');
assert(isolated.database.startsWith('/tmp/pk-crystal-counter-preview-20261125-'));
const names = {desktop: 'desktop-navigation', mobile: 'mobile-navigation-counter', hero: 'hero-idle'};
const name = (rehearsing ? 'rehearsal-' : '') + (names[mode] || 'preflight');
const movie = path.join(out, name + '.mp4');
if (recording) assert(!fs.existsSync(movie), 'Preserve the existing movie before an explicit replacement');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-crystal-films-20261125-'));
const ffmpeg = process.env.PK_FFMPEG || '/usr/bin/ffmpeg';
const ffprobe = process.env.PK_FFPROBE || '/usr/bin/ffprobe';
if (recording) {
  const revision = JSON.parse(fs.readFileSync(path.join(core, 'browsers.json')))
    .browsers.find(item => item.name === 'ffmpeg').revision;
  const codec = path.join(scratch, 'ffmpeg-' + revision);
  fs.mkdirSync(codec);
  fs.symlinkSync(ffmpeg, path.join(codec, 'ffmpeg-linux'));
  process.env.PLAYWRIGHT_BROWSERS_PATH = scratch;
}
const {chromium} = require(pwEntry);
const viewport = mode === 'mobile' ? {width: 390, height: 844} : {width: 1366, height: 768};
const report = {
  started: new Date().toISOString(), mode, rehearsing, viewport, base,
  generation: isolated.generation || 'initial-crystal-world-recordings',
  publicReadsInThisRecordingGeneration: 0,
  eventClockDefinition: 'seconds is wall time since tool start; videoSeconds is approximate wall time since page creation, not guaranteed encoded MP4 presentation time. Extracted frame samples use actual ffmpeg seek timestamps.',
  scope: 'Real local UI and original rendered video. No synthetic DOM, overlays, counters or production browser traffic.',
  isolatedDatabase: isolated.database, events: [], inputs: [], returns: [],
  errors: [], csp: [], httpFailures: [], external: [], blockedWrites: [],
};
let browser, context, page, video;
const start = Date.now();
const implementationInputs = [
  '/index.html', '/catalog/projects.json', '/catalog/product-showcases.json',
  '/assets/world-scene.mjs', '/assets/crystal-geometry.mjs', '/assets/forge-atmosphere.mjs',
  '/assets/brand/foundry-gallery.webp', '/assets/brand/foundry-gallery-small.webp',
  '/assets/brand/core-collar.webp', '/assets/brand/core-collar-small.webp',
  '/assets/brand/engraved-nameplate.webp',
  '/assets/world/crystal-artefact.webp', '/assets/world/cut-sheet.webp',
];

function fingerprints(paths) {
  const hashes = {};
  for (const item of paths) {
    const file = path.join(root, item);
    if (fs.existsSync(file)) hashes[item] = crypto.createHash('sha256')
      .update(fs.readFileSync(file)).digest('hex');
  }
  return hashes;
}

function note(label, extra = {}) {
  report.events.push({label, seconds: (Date.now() - start) / 1000,
    videoSeconds: report.videoClockStart ? (Date.now() - Date.parse(report.videoClockStart)) / 1000 : null,
    url: page?.url(), ...extra});
  console.log(label);
}

async function setup() {
  browser = await chromium.launch({
    executablePath: process.env.PK_CHROME || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--enable-gpu', '--use-gl=angle', '--use-angle=gl',
      '--ozone-platform=x11', '--ignore-gpu-blocklist', '--disable-background-networking'],
  });
  context = await browser.newContext({
    viewport, hasTouch: mode === 'mobile', isMobile: mode === 'mobile',
    acceptDownloads: true,
    ...(recording ? {recordVideo: {dir: path.join(scratch, 'video'), size: viewport}} : {}),
  });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      console.debug('[PK-QA-CSP]' + JSON.stringify({
        directive: event.effectiveDirective, blocked: event.blockedURI,
      }));
    });
  });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base) {
      report.external.push({origin: url.origin, method: request.method()});
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.blockedWrites.push({path: url.pathname, method: request.method()});
      return route.abort();
    }
    return route.continue();
  });
  page = await context.newPage();
  video = page.video();
  report.videoClockStart = new Date().toISOString();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.text().startsWith('[PK-QA-CSP]')) {
      report.csp.push(JSON.parse(message.text().slice('[PK-QA-CSP]'.length)));
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) report.httpFailures.push({
      path: new URL(response.url()).pathname, status: response.status(),
    });
  });
}

async function openHome() {
  const response = await page.goto(base + '/', {waitUntil: 'networkidle'});
  assert.equal(response.status(), 200);
  await page.waitForSelector('.living-ready');
  await page.locator('.living-identity .core-brand,.living-identity>img').first().evaluate(e => e.decode());
  report.sources = await page.evaluate(() => ({
    scripts: [...document.scripts].filter(e => e.src).map(e => new URL(e.src).pathname),
    styles: [...document.querySelectorAll('link[rel=stylesheet]')].map(e => new URL(e.href).pathname),
  }));
  report.sourceHashes = fingerprints([
    ...report.sources.scripts, ...report.sources.styles, ...implementationInputs,
  ]);
  if (isolated.finalCssServedSha256) {
    assert.equal(report.sourceHashes['/assets/living-experience.css'],
      isolated.finalCssServedSha256, 'Use the verified final context-loss CSS');
  }
}

async function activate(selector, label) {
  const control = page.locator(selector).first();
  if (mode === 'mobile') {
    const box = await control.boundingBox();
    assert(box, 'Missing mobile control: ' + selector);
    const point = {x: box.x + box.width / 2, y: box.y + box.height / 2};
    assert(point.x > 0 && point.x < viewport.width && point.y > 0 && point.y < viewport.height,
      'Touch target must already be in the viewport: ' + selector);
    const hit = await control.evaluate((element, p) => {
      const target = document.elementFromPoint(p.x, p.y);
      return element === target || element.contains(target);
    }, point);
    assert(hit, 'Touch target covered: ' + selector);
    report.inputs.push({type: 'Chrome touch tap', selector, ...point});
    await page.touchscreen.tap(point.x, point.y);
  } else {
    await wheelIntoView(selector);
    report.inputs.push({type: 'mouse click', selector});
    await control.click();
  }
  note(label || selector);
}

async function wheelIntoView(selector) {
  assert.notEqual(mode, 'mobile');
  for (let i = 0; i < 15; i++) {
    const box = await page.locator(selector).first().boundingBox();
    assert(box, 'Missing native wheel target: ' + selector);
    const center = box.y + box.height / 2;
    if (center > 1 && center < viewport.height - 1) return;
    const delta = Math.max(-500, Math.min(500, center - viewport.height / 2));
    report.inputs.push({type: 'native Chrome wheel', delta, selector});
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(420);
  }
  throw new Error('Native wheel did not reveal target: ' + selector);
}

async function gesture(delta) {
  assert.equal(mode, 'mobile');
  const session = await context.newCDPSession(page);
  const before = await page.evaluate(() => scrollY);
  const x = 195, from = delta > 0 ? 650 : 250, to = from - delta;
  assert(to >= 80 && to <= 760);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{x, y: from}],
  });
  for (let i = 1; i <= 16; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{x, y: from + (to - from) * i / 16}],
    });
    await page.waitForTimeout(25);
  }
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await session.detach();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => scrollY);
  report.inputs.push({type: 'Chrome CDP touchStart/move/end', delta, before, after});
  assert(Math.abs(after - before) > 80, 'Gesture did not move native page content');
  note('Rzeczywisty gest przewijania', {before, after});
}

async function mapReady() {
  await page.waitForFunction(() => {
    const journey = document.querySelector('[data-living-journey]');
    const nodes = [...document.querySelectorAll('.living-node:not([inert])')];
    return journey?.dataset.scene === '1' && nodes.length === 6 && nodes.every(element => {
      const box = element.getBoundingClientRect();
      const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.width > 0 && box.height > 0 && (element === target || element.contains(target));
    });
  });
  report.returns.push(await page.evaluate(() => ({
    progress: document.querySelector('[data-living-journey]').dataset.progress, scrollY,
    nodes: [...document.querySelectorAll('.living-node:not([inert])')].map(e => e.dataset.projectId),
  })));
  await page.waitForFunction(() =>
    ['ready', 'fallback'].includes(document.querySelector('[data-world-scene]')?.dataset.sceneState));
  report.renderer = await page.locator('[data-world-scene]').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return {state: canvas.dataset.sceneState, description: canvas.dataset.renderer,
      device: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
      crystals: canvas.dataset.crystals};
  });
  assert.equal(report.renderer.state, 'ready', 'Real crystal renderer must be ready');
  await page.waitForTimeout(450);
}

async function project(id) {
  await activate('.living-node[data-project-id="' + id + '"]', 'Kryształ: ' + id);
  await page.waitForFunction(value => {
    const element = document.querySelector('[data-living-project="' + value + '"]');
    return element && !element.inert && Number(getComputedStyle(element).opacity) > .96;
  }, id);
  await page.waitForTimeout(650);
}

async function returnMap() {
  await activate('[data-living-project]:not([inert]) [data-return-map]', 'Powrót do mapy');
  await mapReady();
}

async function counterValue() {
  const response = await page.request.get(base + '/api/glikemia/downloads');
  assert.equal(response.status(), 200);
  const data = await response.json();
  assert(Number.isSafeInteger(data.downloads) && data.downloads >= 0);
  return data.downloads;
}

async function desktop() {
  await openHome();
  note('Hero nowej iteracji');
  await page.waitForTimeout(1700);
  await activate('[data-core-activate]', 'Aktywacja rdzenia');
  await mapReady();
  await project('progresskit-tax');
  await page.waitForTimeout(1200);
  await returnMap();
  await project('vaeloria');
  await page.waitForTimeout(1200);
  await returnMap();
  await activate('.living-node[data-project-id="echo-worlds"]', 'Kryształ ECHO WORLDS');
  await page.waitForURL('**/echo-worlds/');
  await page.waitForLoadState('networkidle');
  await wheelIntoView('[data-realm="storm"]');
  await page.waitForTimeout(550);
  await activate('[data-realm="storm"]', 'Wybór krainy ECHO');
  await page.locator('.realm-board').evaluate(e => e.decode());
  await page.waitForTimeout(1000);
  await activate('.nav a[href$="#projekty"]', 'Nawigacja do mapy');
  await page.waitForURL('**/#projekty');
  await mapReady();
  await project('taskpet');
  await activate('[data-living-project="taskpet"] .world-control', 'Pełna prezentacja TaskPet');
  await page.waitForURL('**/projekty/taskpet/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await activate('[data-drone-toggle]', 'Asystent kontekstowy');
  await page.locator('[data-guide-project]').selectOption('taskpet');
  await activate('[data-guide-topic="feature"]', 'Zweryfikowane funkcje TaskPet');
  await page.waitForTimeout(1400);
}

async function mobile() {
  await openHome();
  note('Mobilny hero');
  await page.waitForTimeout(1500);
  await activate('.menu-btn', 'Mobilne menu');
  assert.equal(await page.locator('.menu-btn').getAttribute('aria-expanded'), 'true');
  await page.waitForTimeout(650);
  await activate('.menu-btn', 'Zamknięcie menu dotykiem');
  await activate('[data-core-activate]', 'Dotykowa aktywacja rdzenia');
  await mapReady();
  await project('progresskit-tax');
  await page.waitForTimeout(900);
  await returnMap();
  await project('glikemia-premium');
  await activate('[data-living-project="glikemia-premium"] .world-control', 'Prezentacja Glikemii');
  await page.waitForURL('**/projekty/glikemia-premium/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-download-state="ready"]');
  await gesture(260);
  await page.waitForTimeout(700);
  await gesture(-260);
  // A second native downward gesture is allowed if momentum leaves the hero clipped.
  if (await page.evaluate(() => scrollY > 80)) await gesture(-200);
  const before = await counterValue();
  const counter = page.locator('[data-download-count]').first();
  const expected = number => new Intl.NumberFormat('pl-PL').format(number) + ' pobrań APK';
  assert.equal(await counter.textContent(), expected(before));
  const box = await counter.boundingBox();
  assert(box && box.y >= 0 && box.y + box.height <= viewport.height, 'Initial counter must be visible');
  note('Widoczny rzeczywisty licznik przed transferem', {downloads: before, bounds: box});
  await page.screenshot({path: path.join(out, (rehearsing ? 'rehearsal-' : '') + 'mobile-counter-before.png')});
  await page.waitForTimeout(2000);
  if (rehearsing) {
    report.counterRehearsal = {downloads: before, realTransfer: 'Not performed before final recording signal'};
    return;
  }
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    activate('a[href="/download/glikemia-premium"]', 'Rzeczywiste pobranie pełnego APK lokalnie'),
  ]);
  const file = await download.path();
  assert.equal(await download.failure(), null);
  const bytes = fs.readFileSync(file);
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'downloads/glikemia-premium.json')));
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(bytes.length, metadata.bytes);
  assert.equal(digest, metadata.sha256);
  let after = before;
  for (let i = 0; i < 30 && after === before; i++) {
    await page.waitForTimeout(100);
    after = await counterValue();
  }
  assert.equal(after, before + 1, 'Only one completed full response must increment the isolated DB');
  report.apk = {bytes: bytes.length, sha256: digest, version: metadata.version,
    suggestedFilename: download.suggestedFilename(), before, after,
    downloadFailure: null, productionRequests: 0};
  note('Pełny transfer ukończony, zgodny SHA-256', report.apk);
  await page.waitForTimeout(1000);
  // Native reload is a normal user action; no client-side counter injection.
  await page.reload({waitUntil: 'networkidle'});
  await page.waitForSelector('[data-download-state="ready"]');
  assert.equal(await counter.textContent(), expected(after));
  const afterBox = await counter.boundingBox();
  assert(afterBox && afterBox.y >= 0 && afterBox.y + afterBox.height <= viewport.height);
  note('Widoczny rzeczywisty licznik +1 po odświeżeniu', {downloads: after, bounds: afterBox});
  await page.screenshot({path: path.join(out, 'mobile-counter-after.png')});
  await page.waitForTimeout(2600);
  await download.delete();
}

function decodeRGBA(file, width, height) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', file,
    '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], {maxBuffer: width * height * 5 + 4096});
  assert.equal(result.status, 0, String(result.stderr));
  assert.equal(result.stdout.length, width * height * 4);
  return result.stdout;
}

function pixelChange(a, b, width, height, roi) {
  const left = Math.floor(roi.x * width), top = Math.floor(roi.y * height);
  const right = Math.floor((roi.x + roi.w) * width), bottom = Math.floor((roi.y + roi.h) * height);
  let changed = 0, total = 0, absolute = 0, maxDelta = 0;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const i = (y * width + x) * 4;
    let delta = 0;
    for (let channel = 0; channel < 3; channel++) {
      // Premultiply alpha: invisible RGB noise is not visible atmosphere motion.
      const difference = Math.abs(a[i + channel] * a[i + 3] / 255 - b[i + channel] * b[i + 3] / 255);
      absolute += difference;
      delta = Math.max(delta, difference);
    }
    total++;
    if (delta >= 8) changed++;
    maxDelta = Math.max(maxDelta, delta);
  }
  return {roi, pixels: total, changedPixelsAtDelta8: changed,
    changedFraction: changed / total, meanAbsoluteRGB: absolute / total / 3, maxDelta};
}

async function hero() {
  await openHome();
  const atmosphere = page.locator('canvas[data-forge-atmosphere]');
  await atmosphere.waitFor({state: 'visible'});
  await page.waitForTimeout(700);
  report.idleStarted = new Date().toISOString();
  note('Początek 12 sekund bez inputu');
  const captures = [];
  const prefix = mode === 'preflight' ? 'preflight-' : rehearsing ? 'rehearsal-' : '';
  for (const seconds of [0, 6, 12]) {
    if (seconds) await page.waitForTimeout(6000);
    const sample = await atmosphere.evaluate(canvas => ({
      width: canvas.width, height: canvas.height, png: canvas.toDataURL('image/png'),
      bounds: canvas.getBoundingClientRect().toJSON(),
    }));
    assert(sample.width > 0 && sample.height > 0);
    const file = path.join(out, prefix + 'hero-atmosphere-' + seconds + 's.png');
    fs.writeFileSync(file, Buffer.from(sample.png.split(',')[1], 'base64'));
    const sceneFile = path.join(out, prefix + 'hero-still-' + seconds + 's.png');
    await page.screenshot({path: sceneFile});
    captures.push({seconds, file, sceneFile, width: sample.width, height: sample.height,
      bounds: sample.bounds, time: new Date().toISOString()});
  }
  const rois = process.env.PK_IDLE_ROIS ? JSON.parse(process.env.PK_IDLE_ROIS) : {
    smoke: {x: .91, y: .08, w: .075, h: .48},
    fire: {x: .89, y: .47, w: .095, h: .23},
  };
  for (const roi of Object.values(rois)) {
    assert(roi.x >= 0 && roi.y >= 0 && roi.w > 0 && roi.h > 0);
    assert(roi.x + roi.w <= 1 && roi.y + roi.h <= 1);
  }
  const first = captures[0], buffers = captures.map(sample => {
    assert.equal(sample.width, first.width);
    assert.equal(sample.height, first.height);
    return decodeRGBA(sample.file, sample.width, sample.height);
  });
  report.idleMotion = {durationMs: Date.parse(captures[2].time) - Date.parse(captures[0].time),
    method: 'Actual atmosphere canvas and separately composited page pixels. Alpha-premultiplied RGB. ROIs at visible smoke and furnace opening outside the central core and CTA.',
    inputEvents: report.inputs.length, threshold: 'At least 25 visible pixels and 0.1% ROI pixels differ by >=8/255 in each six-second interval.',
    captures: captures.map(({file, sceneFile, ...sample}) =>
      ({file: path.basename(file), sceneFile: path.basename(sceneFile), ...sample})),
    intervals: [], visiblePageIntervals: []};
  for (let i = 0; i < 2; i++) for (const [region, roi] of Object.entries(rois)) {
    const measured = pixelChange(buffers[i], buffers[i + 1], first.width, first.height, roi);
    report.idleMotion.intervals.push({from: i * 6, to: (i + 1) * 6, region, ...measured});
  }
  assert(report.idleMotion.intervals.every(item =>
    item.changedPixelsAtDelta8 >= 25 && item.changedFraction >= .001),
  'No meaningful visible idle change in one or more atmosphere ROIs');
  const scenes = captures.map(sample => decodeRGBA(sample.sceneFile, viewport.width, viewport.height));
  for (let i = 0; i < 2; i++) for (const [region, roi] of Object.entries(rois)) {
    const bounds = first.bounds;
    const screenROI = {x: (bounds.x + roi.x * bounds.width) / viewport.width,
      y: (bounds.y + roi.y * bounds.height) / viewport.height,
      w: roi.w * bounds.width / viewport.width, h: roi.h * bounds.height / viewport.height};
    const measured = pixelChange(scenes[i], scenes[i + 1], viewport.width, viewport.height, screenROI);
    report.idleMotion.visiblePageIntervals.push({from: i * 6, to: (i + 1) * 6, region, ...measured});
  }
  assert(report.idleMotion.visiblePageIntervals.every(item =>
    item.changedPixelsAtDelta8 >= 25 && item.changedFraction >= .001),
  'Atmosphere movement must also be visible in actual composited page pixels');
  assert(report.idleMotion.durationMs >= 12000);
  assert.equal(report.inputs.length, 0);
  note('Zmiana pikseli atmosfery potwierdzona bez inputu');
}

async function preflight() {
  try {
    await hero();
    report.preflightAtmosphereStatus = 'PASS';
  } catch (error) {
    report.preflightAtmosphereStatus = 'FAIL';
    report.preflightAtmosphereError = error.stack;
  }
  assert.equal(await page.locator('[data-core-activate]').count(), 1);
  assert.equal(await page.locator('.living-node').count(),
    JSON.parse(fs.readFileSync(path.join(root, 'catalog/projects.json'))).projects.length);
  report.counterBefore = await counterValue();
  await page.screenshot({path: path.join(out, 'preflight-hero-desktop.png')});
  await activate('[data-core-activate]', 'Próbna aktywacja kryształów');
  await mapReady();
  await page.screenshot({path: path.join(out, 'preflight-map-desktop.png')});
  for (const id of ['progresskit-tax', 'vaeloria', 'taskpet']) {
    await project(id);
    await page.screenshot({path: path.join(out, 'preflight-' + id + '-desktop.png')});
    await returnMap();
  }
  const response = await page.goto(base + '/projekty/glikemia-premium/', {waitUntil: 'networkidle'});
  assert.equal(response.status(), 200);
  await page.waitForSelector('[data-download-state="ready"]');
  assert(await page.locator('a[href="/download/glikemia-premium"]').count() > 0);
  report.counterAfter = await counterValue();
  assert.equal(report.counterAfter, report.counterBefore);
  await page.setViewportSize({width: 390, height: 844});
  await page.waitForTimeout(200);
  report.mobileCounter = await page.locator('[data-download-count]').first().evaluate(element => ({
    text: element.textContent, bounds: element.getBoundingClientRect().toJSON(),
  }));
  await page.screenshot({path: path.join(out, 'preflight-glikemia-mobile.png')});
  assert.equal(report.preflightAtmosphereStatus, 'PASS', report.preflightAtmosphereError);
}

async function exportMovie() {
  await context.close();
  context = null;
  await browser.close();
  browser = null;
  const source = await video.path();
  const encoded = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', source,
    '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', movie], {encoding: 'utf8', timeout: 180000});
  assert.equal(encoded.status, 0, encoded.stderr);
  const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries',
    'format=duration,size:stream=codec_name,width,height,pix_fmt,r_frame_rate',
    '-of', 'json', movie], {encoding: 'utf8', timeout: 15000});
  assert.equal(probe.status, 0, probe.stderr);
  report.movie = {file: path.basename(movie), sha256: crypto.createHash('sha256')
    .update(fs.readFileSync(movie)).digest('hex'), ...JSON.parse(probe.stdout)};
}

(async () => {
  try {
    await setup();
    await ({desktop, mobile, hero, preflight}[mode])();
    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
    assert.equal(report.csp.length, 0, JSON.stringify(report.csp));
    assert.equal(report.external.length, 0, JSON.stringify(report.external));
    assert.equal(report.blockedWrites.length, 0, JSON.stringify(report.blockedWrites));
    const unexpected = report.httpFailures.filter(item =>
      !(item.path === '/api/project-inquiries/token' && item.status === 503));
    assert.equal(unexpected.length, 0, JSON.stringify(unexpected));
    assert.deepEqual(fingerprints(Object.keys(report.sourceHashes)), report.sourceHashes,
      'Implementation changed during this capture; preserve this attempt as an intermediate stage');
    if (recording) await exportMovie();
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.stack;
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await context?.close();
    await browser?.close();
    report.finished = new Date().toISOString();
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(report, null, 2));
    fs.rmSync(scratch, {recursive: true, force: true});
    console.log(report.status);
  }
})();
