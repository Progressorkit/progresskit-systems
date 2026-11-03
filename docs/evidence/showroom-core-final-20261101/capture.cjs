'use strict';
process.env.PLAYWRIGHT_BROWSERS_PATH = '/tmp/progresskit-art-direction-20261101-playwright';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.join(__dirname, 'final');
const size = { width: 1440, height: 1080 };
const launch = { executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=gl'] };
const point = (page, id) => page.locator(id === 'core' ? '[data-capsule-toggle]' : `.showroom-card[data-project-id="${id}"]`).evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
async function coreCrop(page, name) {
  const p = await point(page, 'core');
  await page.screenshot({ path: path.join(out, name), clip: { x: Math.max(0, p.x - 280), y: Math.max(0, p.y - 300), width: 560, height: 600 } });
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(launch);
  let context;
  try {
    context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: path.join(out, 'raw'), size } });
    const page = await context.newPage(), videoStart = Date.now(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:8191/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#projekty').dataset.renderer === 'three-webgl2');
    await page.locator('.showroom-viewport').evaluate(e => scrollTo({ top: scrollY + e.getBoundingClientRect().top - 80, behavior: 'instant' }));
    await page.waitForTimeout(6000);
    await page.evaluate(() => {
      window.__recordFrames = [];
      document.querySelector('[data-showroom-canvas]').addEventListener('showroom:frame', () => {
        const m = document.querySelector('#projekty').showroom3D.metrics();
        window.__recordFrames.push({ t: performance.now(), frames: m.frames, cpuFrameMs: m.cpuFrameMs, gpuFrameMs: m.gpuFrameMs, drawCalls: m.drawCalls, triangles: m.triangles, dpr: m.dpr, quality: m.quality });
      });
    });
    const started = Date.now(), readyOffset = (started - videoStart) / 1000, events = [];
    const mark = event => events.push({ seconds: (Date.now() - started) / 1000, event });
    const until = async seconds => { const ms = started + seconds * 1000 - Date.now(); if (ms > 0) await page.waitForTimeout(ms); };
    mark('idle');
    await until(6.1);
    await coreCrop(page, 'core-idle.png');
    const core = await point(page, 'core');
    mark('core activation');
    await page.mouse.move(core.x, core.y);
    await page.waitForFunction(() => document.querySelector('#projekty').showroom3D.metrics().phases.every(p => p.phase === 'ready'));
    await coreCrop(page, 'core-active.png');
    await until(11.6);
    const crystal = await point(page, 'progresskit-mail');
    mark('Mail crystal hover');
    await page.mouse.move(crystal.x, crystal.y, { steps: 15 });
    await page.waitForTimeout(400);
    const b = await page.locator('.showroom-card[data-project-id="progresskit-mail"]').boundingBox();
    await page.screenshot({ path: path.join(out, 'crystal.png'), clip: { x: b.x - 60, y: b.y - 60, width: b.width + 120, height: b.height + 120 } });
    await until(13.5);
    mark('micro perspective / lighting');
    await page.mouse.move(core.x - 55, core.y + 65, { steps: 18 });
    await until(16.5); // Closing margin keeps a full 15s native clip after trim.
    const metrics = await page.locator('#projekty').evaluate(e => e.showroom3D.metrics());
    const frames = await page.evaluate(() => window.__recordFrames), video = page.video();
    await context.close(); context = null;
    const report = { name: 'desktop', readyOffset, duration: 15, events, metrics, frames, errors, raw: await video.path() };
    fs.writeFileSync(path.join(out, 'recording-metrics.json'), JSON.stringify(report, null, 2));
    console.log({ renderer: metrics.renderer, fps: metrics.fps, errors, raw: report.raw });
  } finally { if (context) await context.close(); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
