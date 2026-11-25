/* One local QA entry point; never edits frontend/runtime or contacts production. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'docs/evidence/original-machines-20261125');
const baseline = JSON.parse(fs.readFileSync(path.join(evidence, 'baseline-provenance.json')));
const accepted = JSON.parse(fs.readFileSync(path.join(baseline.privateBaselineRoot, 'baseline-hashes.json')));
const session = JSON.parse(fs.readFileSync(path.join(evidence, 'preview-session.json')));
const mode = process.argv[2];
const goals = (process.env.PK_QA_GOALS || 'mechanism,robot,map,mobile').split(',');
assert(goals.every(g => ['mechanism', 'robot', 'map', 'mobile'].includes(g)));
const override = process.env.PK_QA_URL;
assert(!override || mode === 'rehearse', 'URL override is only for explicit local rehearsal');
const runtimeRoot = override ? root : session.sourceRoot;
assert(['baseline', 'rehearse', 'final', 'compare', 'promote'].includes(mode),
  'Use baseline, rehearse, compare, final or promote');
const mergedCopy = session.sourceOrigin === root && session.role === 'merged-materials-candidate-copy';
if (mode === 'final' || mode === 'promote') {
  assert(process.env.PK_ORIGINAL_MACHINES_FREEZE === 'confirmed',
    'Final files require the coordinator and all implementers to confirm merged/frozen source');
  assert(session.sourceRoot === root || mergedCopy, 'Final capture must use current merged runtime');
}
if (mode === 'rehearse' && !override) assert.equal(session.sourceRoot, root,
  'Switch the dedicated preview from baseline snapshot to the merged current source first');
const base = new URL(override || session.url).origin;
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const target = mode === 'baseline' ? path.join(baseline.privateBaselineRoot, 'captures') :
  mode === 'rehearse' ? fs.mkdtempSync(path.join(os.tmpdir(), 'pk-original-machines-rehearsal-20261125-')) :
  mode === 'compare' ? path.join(evidence, 'hash-check-' + Date.now()) :
  mode === 'promote' ? evidence :
  fs.mkdtempSync(path.join(os.tmpdir(), 'pk-original-machines-final-capture-20261125-'));
fs.mkdirSync(target, {recursive: true});
const finalOutputs = ['01-mechanizm.png', '02-robot.png', '03-krysztaly.png', '04-mobile.png',
  '05-ruch-00.png', '05-ruch-01.png', '05-ruch-02.png', 'preservation.json', 'capture-report.json'];
if (mode === 'final') for (const name of finalOutputs) {
  assert(!fs.existsSync(path.join(evidence, name)), 'Preserve any previous final capture before replacement');
}
if (mode === 'final') assert.equal([...new Set(goals)].sort().join(','), 'map,mechanism,mobile,robot');
const report = {mode, goals, started: new Date().toISOString(), base, sourceRoot: runtimeRoot,
  sourceOrigin: session.sourceOrigin || session.sourceRoot,
  holdForAllImplementers: process.env.PK_QA_HOLD === '1',
  scope: 'Real local screenshots only. No CSS/DOM injection, production requests, APK transfer or git action.',
  errors: [], csp: [], external: [], blockedDownloads: [], blockedWrites: [],
  http: [], captures: [], geometry: {}};
let browser;

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function runtimeFingerprint(sourceRoot = runtimeRoot) {
  const python = [
    'import importlib.util,json,sys',
    'from pathlib import Path',
    'sys.dont_write_bytecode=True',
    'root=Path(sys.argv[1])',
    'spec=importlib.util.spec_from_file_location("qa_stage",root/"scripts/stage-public.py")',
    'stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage)',
    'print(json.dumps(stage.public_files()))',
  ].join('\n');
  const result = spawnSync(path.join(root, '.venv/bin/python'),
    ['-B', '-c', python, sourceRoot], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return Object.fromEntries(JSON.parse(result.stdout).map(name =>
    [name, hash(path.join(sourceRoot, name))]));
}

function publish(stage, candidate) {
  for (const name of finalOutputs) assert(!fs.existsSync(path.join(evidence, name)),
    'Preserve prior final outputs before publishing a replacement');
  candidate.holdForAllImplementers = false;
  candidate.finalizedAt = new Date().toISOString();
  fs.writeFileSync(path.join(stage, 'capture-report.json'), JSON.stringify(candidate, null, 2));
  for (const name of finalOutputs) {
    const source = path.join(stage, name);
    fs.copyFileSync(source, path.join(evidence, name), fs.constants.COPYFILE_EXCL);
    assert.equal(hash(source), hash(path.join(evidence, name)));
  }
  fs.rmSync(stage, {recursive: true, force: true});
}

function mainText(html) {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!match) return null;
  return match[1].replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function preservation() {
  const result = {baselineAt: accepted.capturedAt, checkedAt: new Date().toISOString(),
    baselineFiles: Object.keys(accepted.files).length, files: {}, changed: [],
    protectedChanged: [], productMainChanged: [], missing: []};
  for (const [name, before] of Object.entries(accepted.files)) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) { result.missing.push(name); continue; }
    const digest = hash(file);
    result.files[name] = {before: before.sha256, after: digest,
      unchanged: before.sha256 === digest, bytes: fs.statSync(file).size};
    if (digest !== before.sha256) result.changed.push(name);
    const protectedFile = name.startsWith('analytics/') || name.startsWith('downloads/') ||
      (name.startsWith('catalog/') && name !== 'catalog/brand.json');
    if (protectedFile && digest !== before.sha256) result.protectedChanged.push(name);
    const productHTML = name.endsWith('/index.html') && (
      name.startsWith('projekty/') && name !== 'projekty/index.html' ||
      ['taskpet/index.html', 'echo-worlds/index.html', 'glikemia-premium/index.html',
        'progresskit-mail/index.html'].includes(name));
    if (productHTML) {
      const beforeText = mainText(fs.readFileSync(path.join(baseline.snapshotRoot, name), 'utf8'));
      const afterText = mainText(fs.readFileSync(file, 'utf8'));
      if (beforeText !== afterText) result.productMainChanged.push(name);
    }
  }
  result.status = result.protectedChanged.length || result.productMainChanged.length ||
    result.missing.length ? 'FAIL' : 'PASS';
  result.productMethod = 'Static normalized main text, separately from allowed shared header/material changes; catalogue JSON, distribution and analytics hashes protected exactly.';
  return result;
}

function resolvePlaywright() {
  if (process.env.PK_PLAYWRIGHT) return require.resolve(process.env.PK_PLAYWRIGHT);
  try { return require.resolve('playwright'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require.resolve(path.join(os.homedir(), '.cache', 'codex-runtimes',
      'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
  }
}

async function context(width, height, mobile = false) {
  const c = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1,
    hasTouch: mobile, isMobile: mobile, reducedMotion: 'no-preference', serviceWorkers: 'block'});
  await c.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base) {
      report.external.push({origin: url.origin, method: request.method()});
      return route.abort();
    }
    if (url.pathname.startsWith('/download/') || /\.apk$/i.test(url.pathname)) {
      report.blockedDownloads.push(url.pathname);
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.blockedWrites.push({path: url.pathname, method: request.method()});
      return route.abort();
    }
    return route.continue();
  });
  await c.addInitScript(() => document.addEventListener('securitypolicyviolation', e =>
    console.debug('[ORIGINAL-QA-CSP]' + JSON.stringify({directive: e.effectiveDirective, blocked: e.blockedURI}))));
  const p = await c.newPage();
  p.on('pageerror', e => report.errors.push(e.message));
  p.on('console', message => {
    if (message.text().startsWith('[ORIGINAL-QA-CSP]')) {
      report.csp.push(JSON.parse(message.text().slice('[ORIGINAL-QA-CSP]'.length)));
    }
  });
  p.on('response', response => {
    if (response.status() >= 400) report.http.push({
      path: new URL(response.url()).pathname, status: response.status(),
    });
  });
  return {c, p};
}

async function open(p, suffix = '/') {
  const response = await p.goto(base + suffix, {waitUntil: 'networkidle'});
  assert.equal(response.status(), 200);
  await p.waitForSelector('.living-ready');
  const width = await p.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
  }));
  assert(width.document <= width.viewport + 1, 'Horizontal overflow');
}

async function capture(p, name) {
  const file = path.join(target, name);
  await p.screenshot({path: file, animations: 'allow'});
  report.captures.push({file: name, at: new Date().toISOString(),
    viewport: p.viewportSize(), sha256: hash(file), bytes: fs.statSync(file).size});
}

async function localCounter() {
  const response = await fetch(base + '/api/glikemia/downloads', {
    redirect: 'error', signal: AbortSignal.timeout(4000),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert(Number.isSafeInteger(data.downloads) && data.downloads >= 0);
  return data.downloads;
}

async function map(p) {
  await open(p, '/#projekty');
  await p.waitForFunction(() => {
    const canvas = document.querySelector('[data-world-scene]');
    const nodes = [...document.querySelectorAll('.living-node:not([inert])')];
    return canvas?.dataset.crystals === 'ready' && nodes.length === 6 &&
      nodes.every(e => { const r = e.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return r.width > 0 && r.height > 0 && (hit === e || e.contains(hit)); });
  });
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(900);
  return p.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    crystals: document.querySelector('[data-world-scene]').dataset.crystals,
    count: document.querySelector('[data-world-scene]').dataset.crystalCount,
    nodes: [...document.querySelectorAll('.living-node:not([inert])')].map(e => ({
      id: e.dataset.projectId, ...e.getBoundingClientRect().toJSON(),
    })),
  }));
}

async function mechanismState(p) {
  return p.evaluate(() => {
    const element = document.querySelector('[data-original-mechanism]');
    const rotor = element?.querySelector('.core-rotor');
    const combustion = element?.querySelector('.core-combustion');
    const transform = rotor ? getComputedStyle(rotor).transform : null;
    const matrix = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform) : null;
    return {time: performance.now(), bounds: element?.getBoundingClientRect().toJSON(),
      housing: element?.querySelector('.core-housing')?.getBoundingClientRect().toJSON(),
      transform, angleDegrees: matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : null,
      opacity: combustion ? getComputedStyle(combustion).opacity : null,
      pseudoBeforeOpacity: combustion ? getComputedStyle(combustion, '::before').opacity : null,
      pseudoAfterOpacity: combustion ? getComputedStyle(combustion, '::after').opacity : null,
      centralLogoElements: element?.querySelectorAll('.core-brand,img[src*="progresskit-mark"]').length,
      images: element ? [...element.querySelectorAll('img')].map(i => ({
        src: new URL(i.currentSrc || i.src).pathname, complete: i.complete,
        width: i.naturalWidth, height: i.naturalHeight,
      })) : []};
  });
}

function rawRGBA(file, width, height) {
  const result = spawnSync(process.env.PK_FFMPEG || '/usr/bin/ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'rawvideo',
      '-pix_fmt', 'rgba', 'pipe:1'], {maxBuffer: width * height * 5 + 4096});
  assert.equal(result.status, 0, String(result.stderr));
  assert.equal(result.stdout.length, width * height * 4);
  return result.stdout;
}

async function mechanism(p) {
  await open(p);
  if (mode === 'baseline') {
    await p.locator('.living-identity .core-brand,.living-identity>img').first().evaluate(i => i.decode());
    report.geometry.mechanism = await p.locator('.living-identity').evaluate(e => e.getBoundingClientRect().toJSON());
    await capture(p, '01-mechanizm.png');
    return;
  }
  await p.waitForSelector('[data-original-mechanism]');
  await p.waitForFunction(() => {
    const image = document.querySelector('.core-housing img[src*="optical-core"]');
    return image?.complete && image.naturalWidth > 0;
  });
  await p.waitForTimeout(400);
  await capture(p, '01-mechanizm.png');
  const states = [], images = [];
  for (const [index, wait] of [0, 1500, 1700].entries()) {
    if (wait) await p.waitForTimeout(wait);
    states.push(await mechanismState(p));
    const name = '05-ruch-0' + index + '.png';
    await capture(p, name);
    images.push(path.join(target, name));
  }
  assert(states.every(s => s.images.every(i => i.complete && i.width > 0)));
  assert(states.every(s => s.centralLogoElements === 0), 'Central brand image remains inside mechanism');
  const angularDelta = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  const angles = states.map(s => s.angleDegrees);
  assert(angles.every(Number.isFinite), 'Rotor transform cannot be measured');
  const rotation = Math.max(...angles.map(v => angularDelta(v, angles[0])));
  assert(rotation > 1, 'Rotor does not rotate independently');
  const spans = ['opacity', 'pseudoBeforeOpacity', 'pseudoAfterOpacity'].map(key => {
    const values = states.map(s => Number(s[key]));
    return Math.max(...values) - Math.min(...values);
  });
  assert(Math.max(...spans) > .005, 'Combustion opacity does not change');
  const viewport = p.viewportSize(), decoded = images.map(f => rawRGBA(f, viewport.width, viewport.height));
  const box = states[0].housing || states[0].bounds;
  assert(box && box.width > 0 && box.height > 0);
  const left = Math.max(0, Math.floor(box.x + box.width * .2));
  const right = Math.min(viewport.width, Math.floor(box.x + box.width * .8));
  const top = Math.max(0, Math.floor(box.y + box.height * .2));
  const bottom = Math.min(viewport.height, Math.floor(box.y + box.height * .8));
  let changed = 0, total = 0;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const i = (y * viewport.width + x) * 4;
    if (Math.max(...[0, 1, 2].map(c => Math.abs(decoded[0][i + c] - decoded[2][i + c]))) >= 8) changed++;
    total++;
  }
  assert(changed >= 100 && changed / total >= .001, 'No visible material motion in rotor region');
  report.motion = {inputEvents: 0, states, rotationDegrees: rotation, combustionOpacitySpans: spans,
    region: {left, top, right, bottom}, changedPixelsAtDelta8: changed,
    pixels: total, changedFraction: changed / total,
    method: 'Actual screenshot pixels in housing centre plus independent computed rotor transform and combustion opacity. No pointer movement during sequence.'};
  report.geometry.mechanism = states[0];
}

async function robot(p) {
  if (mode === 'baseline') {
    await open(p);
    await p.locator('[data-drone-toggle]').click();
    await p.locator('[data-guide-project]').selectOption('taskpet');
    await p.locator('[data-guide-topic="feature"]').click();
    await p.waitForTimeout(500);
    report.robot = {project: 'taskpet', text: await p.locator('#guide-panel').innerText(),
      baseline: 'Existing guide panel before articulated robot and hologram changes'};
  } else {
    await map(p);
    await p.waitForSelector('[data-inspection-bot][data-ready="true"]');
    report.bot = await p.locator('[data-inspection-bot]').evaluate(e => ({
      ready: e.dataset.ready, bounds: e.getBoundingClientRect().toJSON(),
      images: [...e.querySelectorAll('img')].map(i => ({
        src: new URL(i.currentSrc || i.src).pathname, complete: i.complete,
        naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight,
      })),
    }));
    await p.locator('.living-node[data-project-id="taskpet"]').hover();
    const hologram = p.locator('[data-bot-hologram][data-project="taskpet"][data-visible="true"]');
    await hologram.waitFor({state: 'visible'});
    await p.waitForTimeout(550);
    report.robot = await hologram.evaluate(e => ({
      project: e.dataset.project, visible: e.dataset.visible,
      text: e.innerText, bounds: e.getBoundingClientRect().toJSON(),
    }));
    assert.equal(report.robot.project, 'taskpet');
  }
  await capture(p, '02-robot.png');
}

(async () => {
  if (mode === 'promote') {
    try {
      const pending = JSON.parse(fs.readFileSync(path.join(evidence, 'pending-final.json')));
      const candidate = JSON.parse(fs.readFileSync(path.join(pending.target, 'capture-report.json')));
      assert.equal(candidate.status, 'PASS');
      assert.deepEqual(runtimeFingerprint(root), candidate.runtimeStartHashes,
        'Candidate predates the final merged source; capture it again');
      assert.equal(preservation().status, 'PASS');
      for (const item of candidate.captures) assert.equal(hash(path.join(pending.target, item.file)), item.sha256);
      publish(pending.target, candidate);
      fs.unlinkSync(path.join(evidence, 'pending-final.json'));
      console.log('PASS: candidate promoted only after common freeze; source hashes still identical');
    } catch (error) { console.error(error.stack); process.exitCode = 1; }
    return;
  }
  try {
    if (mode !== 'baseline') {
      report.preservation = preservation();
      fs.writeFileSync(path.join(target, 'preservation.json'), JSON.stringify(report.preservation, null, 2));
      assert.equal(report.preservation.status, 'PASS', JSON.stringify({
        protected: report.preservation.protectedChanged,
        products: report.preservation.productMainChanged, missing: report.preservation.missing,
      }));
    }
    if (mode === 'compare') { report.status = 'PASS'; return; }
    report.runtimeStartHashes = runtimeFingerprint();
    report.localCounterBefore = await localCounter();
    const {chromium} = require(resolvePlaywright());
    browser = await chromium.launch({executablePath: process.env.PK_CHROME || '/usr/bin/google-chrome',
      headless: true, args: ['--no-sandbox', '--enable-gpu', '--use-gl=angle', '--use-angle=gl',
        '--ozone-platform=x11', '--ignore-gpu-blocklist', '--disable-background-networking']});
    for (const goal of ['mechanism', 'robot', 'map']) {
      if (!goals.includes(goal)) continue;
      const {c, p} = await context(1920, 1080);
      try {
        if (goal === 'mechanism') await mechanism(p);
        if (goal === 'robot') await robot(p);
        if (goal === 'map') {
          report.geometry.map = await map(p);
          if (mode !== 'baseline') {
            const prior = JSON.parse(fs.readFileSync(path.join(baseline.privateBaselineRoot,
              'captures/capture-report.json'))).geometry.map.nodes;
            const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
            const before = median(prior.map(e => e.width));
            const after = median(report.geometry.map.nodes.map(e => e.width));
            report.mapScaleComparison = {beforeMedianWidth: before, afterMedianWidth: after,
              factor: after / before, increasePercent: (after / before - 1) * 100};
            assert(after > before * 1.2, 'Desktop map is not meaningfully enlarged');
          }
          await capture(p, '03-krysztaly.png');
        }
      } finally { await c.close(); }
    }
    if (goals.includes('mobile')) {
      const {c, p} = await context(390, 844, true);
      try { await open(p); await p.waitForTimeout(500); await capture(p, '04-mobile.png'); }
      finally { await c.close(); }
    }
    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
    assert.equal(report.csp.length, 0, JSON.stringify(report.csp));
    assert.equal(report.external.length, 0, JSON.stringify(report.external));
    assert.equal(report.blockedDownloads.length, 0, 'Unexpected APK request');
    assert.equal(report.blockedWrites.length, 0, 'Unexpected write request');
    const bad = report.http.filter(r => !(r.path === '/api/project-inquiries/token' && r.status === 503));
    assert.equal(bad.length, 0, JSON.stringify(bad));
    report.localCounterAfter = await localCounter();
    assert.equal(report.localCounterAfter, report.localCounterBefore,
      'Read-only visual QA must leave its local APK counter unchanged');
    assert.deepEqual(runtimeFingerprint(), report.runtimeStartHashes,
      'Runtime changed during capture; preserve this attempt as an intermediate stage');
    if (mode === 'final' && mergedCopy) assert.deepEqual(runtimeFingerprint(root), report.runtimeStartHashes,
      'Live source changed after candidate isolation; do not finalize this batch');
    if (mode !== 'baseline') {
      const after = preservation();
      assert.equal(after.status, 'PASS', 'Protected data or product text changed during capture');
      report.preservationAfter = after;
    }
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack;
    console.error(error.stack); process.exitCode = 1;
  } finally {
    await browser?.close();
    report.finished = new Date().toISOString();
    fs.writeFileSync(path.join(target, 'capture-report.json'), JSON.stringify(report, null, 2));
    if (mode === 'final' && report.status === 'PASS') {
      if (report.holdForAllImplementers) {
        fs.writeFileSync(path.join(evidence, 'pending-final.json'),
          JSON.stringify({target, capturedAt: report.finished, sourceRoot: runtimeRoot}, null, 2));
      } else {
        publish(target, report);
      }
    }
    console.log(JSON.stringify({mode, status: report.status, target, captures: report.captures.length}));
  }
})();
