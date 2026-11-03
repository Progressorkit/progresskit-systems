'use strict';
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PK_PROOF_URL || 'http://127.0.0.1:8198/', { waitUntil: 'networkidle' });
    await page.locator('img').evaluateAll(imgs => imgs.forEach(i => i.loading = 'eager'));
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    const video = page.locator('video');
    await video.evaluate(async e => { e.muted = true; await e.play(); });
    await page.waitForTimeout(700);
    const playback = await video.evaluate(e => ({ duration: e.duration, currentTime: e.currentTime, width: e.videoWidth, height: e.videoHeight, error: e.error?.message || null }));
    const result = { images: await page.locator('img').count(), videos: await page.locator('video').count(), playback, errors };
    result.PASS = result.images === 3 && result.videos === 1 && playback.duration === 15 && playback.currentTime > 0 && !playback.error && errors.length === 0;
    fs.writeFileSync(path.join(__dirname, 'final/playback.json'), JSON.stringify(result, null, 2));
    console.log(result);
    if (!result.PASS) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
