const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const results=process.env.PK_PILOT_RESULTS;assert(results,'PK_PILOT_RESULTS must point to local test output');
const allowed=['index.html','styles.css','pilot.js','assets/brand.png','assets/mail-synthetic.png'];
const sharedStylesheet='/assets/materials.css';
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const name=pathname.replace(/^\/progresskit-mail\//,'')||'index.html';const shared=pathname===sharedStylesheet;if(!shared&&!allowed.includes(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'application/javascript');res.end(fs.readFileSync(shared?path.join(root,sharedStylesheet.slice(1)):path.join(root,'progresskit-mail',name)));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});let checks=0;
try{for(const js of [true,false]){const context=await browser.newContext({javaScriptEnabled:js});const page=await context.newPage(),requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status());});
await page.goto(base+'/progresskit-mail/');assert.equal(await page.locator('form,input,textarea,script').count(),0);checks++;
assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://progresskit.pl/progresskit-mail/');checks++;
const mailLinks=await page.locator('a[href^="mailto:"]').evaluateAll(a=>a.map(x=>({href:x.href,text:x.textContent})));
const ctas=mailLinks.filter(x=>x.text.includes('Zgłoś firmę do pilotażu'));assert.equal(ctas.length,2);
for(const link of ctas){const u=new URL(link.href);assert.equal(u.pathname,'pawel@progresskit.pl');assert.equal(u.searchParams.get('subject'),'Zgłoszenie firmy do pilotażu ProgressKit Mail');assert.match(u.searchParams.get('body'),/Nazwa firmy:[\s\S]*Liczba potrzebnych skrzynek:[\s\S]*Potrzeby lub pytania:/);checks++;}
assert.match(await page.locator('#email-help').innerText(),/Samo kliknięcie nie wysyła/);assert.equal(await page.locator('.contact-address').innerText(),'pawel@progresskit.pl');checks++;
for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('.contact-cta').isVisible());if(js&&[390,1440].includes(width))await page.screenshot({path:path.join(results,'page-'+width+'.png'),fullPage:true});checks++;}
for(const href of await page.locator('a[href^="#"]').evaluateAll(a=>a.map(x=>x.getAttribute('href')))){assert.equal(await page.locator(href).count(),1);checks++;}
await page.locator('.nav-cta').click();assert.equal(new URL(page.url()).hash,'#pilot');checks++;
assert(await page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));checks++;
assert(requests.every(u=>u.startsWith(base+'/progresskit-mail/')||u===base+sharedStylesheet));assert(!requests.some(u=>/\/api\/|\/internal\//.test(u)));assert.deepEqual(errors,[]);checks++;
await context.close();}
console.log(JSON.stringify({status:'PASS',checks,viewports:[320,390,768,1440],javascript:['enabled','disabled'],mailto:'recipient, decoded subject/body, visible fallback verified; no email sent',network:'local static assets only, no API requests',production:'NOT TESTED',email_delivery:'NOT TESTED'},null,2));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
