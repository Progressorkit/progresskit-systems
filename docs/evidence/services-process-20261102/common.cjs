'use strict';
const fs = require('node:fs');
const {chromium} = require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.PK_PREVIEW_ORIGIN || 'http://127.0.0.1:8191';
const launch = () => chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=gl']});
const norm = text => text.replace(/\s+/g,' ').trim();
async function at(page, selector, top=90) {
  await page.locator(selector).evaluate((e,t)=>scrollTo({top:scrollY+e.getBoundingClientRect().top-t,behavior:'instant'}),top);
  await page.waitForTimeout(700);
}
async function ready(page) {
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#uslugi')&&document.querySelectorAll('#uslugi .service-zone').length===2);
}
async function snapshot(page,selector,file,{mobile=false}={}) {
  await at(page,selector);
  const b=await page.locator(selector).boundingBox(),size=page.viewportSize();
  const x=Math.max(0,b.x),y=Math.max(0,b.y);
  const right=Math.min(size.width,b.x+b.width),bottom=Math.min(size.height-12,b.y+b.height);
  const clip={x,y,width:right-x,height:bottom-y};
  if(clip.width<=0||clip.height<=0)throw new Error('Section has no visible viewport area: '+selector);
  await page.screenshot({path:file,clip,fullPage:false});
  return {selector,section:b,viewport:size,mobile,clip,clipped:clip.width<b.width-1||clip.height<b.height-1};
}
async function active(page,index=0) {
  return page.locator('#uslugi .service-zone').nth(index).evaluate(e=>({
    active:e.matches('.is-spatial-active,[data-spatial-active]:not([data-spatial-active="false"])'),
    className:e.className,data:{...e.dataset},sectionData:{...e.closest('#uslugi').dataset}
  }));
}
async function sections(page) {
 return page.locator('main>section').evaluateAll(items=>items.map(e=>({id:e.id,top:e.offsetTop,height:e.offsetHeight})));
}
async function serviceChecks(page,record) {
 const check=(name,pass,details)=>record.checks.push({name,status:pass?'PASS':'FAIL',details});
 const text=await page.locator('#uslugi').evaluate(e=>e.innerText.replace(/\s+/g,' ').trim());
 const expected=['Usługi','Dla Ciebie /','małego biznesu','Strony · sklepy · aplikacje','Aplikacje mobilne','Platformy internetowe','Gry i 3D','Dla firmy /','systemu','Backend .NET i API','SaaS i bazy danych','Infrastruktura','Testy i wdrożenia','Automatyzacja i integracje'];
 const normalizedText=norm(text).toLocaleLowerCase('pl-PL');
 check('Original Services copy remains readable',expected.every(s=>normalizedText.includes(norm(s).toLocaleLowerCase('pl-PL'))),text);
 const links=await page.locator('#uslugi a').evaluateAll(items=>items.map(e=>({text:e.textContent.trim(),href:e.getAttribute('href'),visible:!!e.getClientRects().length})));
 const hrefs=['projekty/?technologia=C%23','projekty/?technologia=.NET','projekty/?technologia=ASP.NET%20Core','projekty/?technologia=PostgreSQL','projekty/?technologia=Android','#kontakt','#brief'];
 check('Seven original link targets and accessible names retained',links.length===7&&links.every((e,i)=>e.href===hrefs[i]&&e.text.length&&e.visible),links);
 check('No horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth})));
 const canvas=await page.locator('#uslugi canvas').evaluateAll(items=>items.map(e=>({hidden:!!e.closest('[aria-hidden="true"]'),tabindex:e.getAttribute('tabindex')})));
 check('Decorative Services canvas stays outside accessibility tree',canvas.length<=1&&canvas.every(c=>c.hidden&&c.tabindex!=='0'),canvas);
 const link=page.locator('#uslugi .services-actions a').first();await link.focus();
 check('Original CTA remains keyboard focusable',await link.evaluate(e=>e===document.activeElement));
 return {text,links};
}
function save(file,report) { report.PASS=report.checks.filter(c=>c.status==='PASS').length;report.FAIL=report.checks.filter(c=>c.status==='FAIL').length;fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,artifacts:report.artifacts,errors:report.errors},null,2));if(report.FAIL)process.exitCode=1; }
module.exports={fs,origin,launch,ready,at,snapshot,active,serviceChecks,sections,save,norm};
