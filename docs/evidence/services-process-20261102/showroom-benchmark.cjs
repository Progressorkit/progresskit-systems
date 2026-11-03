'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.join(__dirname, 'final');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=gl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    await page.goto('http://127.0.0.1:8191/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#projekty').dataset.renderer === 'three-webgl2');
    await page.locator('.showroom-viewport').evaluate(e => scrollTo({ top: scrollY + e.getBoundingClientRect().top - 80, behavior: 'instant' }));
    await page.evaluate(()=>{window.__sections=[];window.__sectionTimer=setInterval(()=>{const service=document.querySelector('#uslugi'),process=document.querySelector('#proces'),bounds=service.getBoundingClientRect();window.__sections.push({t:performance.now(),bounds:{top:bounds.top,bottom:bounds.bottom},data:{...service.dataset},service:service.spatialServices.metrics(),process:process.spatialProcess.metrics()});},1000);});
    await page.waitForTimeout(6000);
    await page.evaluate(() => {
      window.__bench = [];
      document.querySelector('[data-showroom-canvas]').addEventListener('showroom:frame', () => {
        const m = document.querySelector('#projekty').showroom3D.metrics();
        window.__bench.push({ t: performance.now(), fps: m.fps, cpu: m.cpuFrameMs, gpu: m.gpuFrameMs, dpr: m.dpr, triangles: m.triangles, calls: m.drawCalls });
      });
    });
    await page.waitForTimeout(6000);
    const core = await page.locator('[data-capsule-toggle]').boundingBox();
    await page.mouse.move(core.x + core.width / 2, core.y + core.height / 2);
    await page.waitForTimeout(4000);
    const mail = await page.locator('.showroom-card[data-project-id="progresskit-mail"]').boundingBox();
    await page.mouse.move(mail.x + mail.width / 2, mail.y + mail.height / 2);
    await page.waitForTimeout(6000);
    const sectionTimeline=await page.evaluate(()=>{clearInterval(window.__sectionTimer);return window.__sections;});fs.writeFileSync(path.join(out,'section-activity.json'),JSON.stringify(sectionTimeline,null,2));
    const frames = await page.evaluate(() => window.__bench), metrics = await page.locator('#projekty').evaluate(e => e.showroom3D.metrics());
    const mean = (frames.length - 1) * 1000 / (frames.at(-1).t - frames[0].t);
    fs.writeFileSync(path.join(__dirname, 'showroom-benchmark-frames.json'), JSON.stringify({ mean, metrics, frames }, null, 2));
    const median = values => { const a = values.slice().sort((a,b) => a-b), m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2; };
    const windows = [];
    for (let i = 0; i < Math.floor((frames.at(-1).t - frames[0].t) / 1000); i++) windows.push(frames.filter(f => f.t >= frames[0].t + i * 1000 && f.t < frames[0].t + (i+1) * 1000).length);
    const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '../showroom-core-final-20261101/final/normal-performance.json'))).averageFps;
    const report = { averageFps: mean, baselineAverageFps: baseline, differenceFps: mean - baseline, differencePercent: (mean / baseline - 1) * 100, oneSecondMin: Math.min(...windows), oneSecondMax: Math.max(...windows), oneSecondWindows: windows, cpuSubmissionMedianMs: median(frames.map(f => f.cpu)), gpuLastAvailableMedianMs: median(frames.map(f => f.gpu).filter(v => v !== null)), DPR: [...new Set(frames.map(f => f.dpr))].sort(), warmupSeconds: 6, measurementSeconds: (frames.at(-1).t - frames[0].t) / 1000, renderer: metrics.renderer };
    fs.writeFileSync(path.join(out, 'showroom-regression.json'), JSON.stringify(report, null, 2));
    console.log(report);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
