'use strict';
const fs=require('node:fs'),path=require('node:path');
const {firefox}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:8201/',out=path.join(__dirname,'firefox-overflow');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await firefox.launch({executablePath:'/tmp/progresskit-finalqa-browsers-20261102/firefox-1538/firefox/firefox',headless:true});
 const context=await browser.newContext({viewport:{width:360,height:844}}),report={engine:browser.version(),viewport:{width:360,height:844},pages:[]};
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin&&route.request().method()==='GET'?route.continue():route.abort());
 try{const page=await context.newPage();for(const slug of ['progresskit-translator','vaeloria']){
  await page.goto(`${base}projekty/${slug}/`,{waitUntil:'networkidle'});
  const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,id:e.id,className:e.className,left:r.left,right:r.right,top:r.top,width:r.width,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,overflow:s.overflow,whiteSpace:s.whiteSpace,wordBreak:s.wordBreak,overflowWrap:s.overflowWrap,minWidth:s.minWidth,maxWidth:s.maxWidth,display:s.display,font:s.fontFamily,text:e.textContent.replace(/\s+/g,' ').trim().slice(0,180),section:e.closest('[id]')?.id};}).filter(e=>(e.right>innerWidth+1||e.scrollWidth>e.clientWidth+1)&&e.width>0).sort((a,b)=>(b.left+b.scrollWidth)-(a.left+a.scrollWidth))}));
  await page.screenshot({path:path.join(out,`${slug}-hero.png`),fullPage:false});
  data.textOverflow=await page.evaluate(()=>{const result=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(!n.textContent.trim()||!n.parentElement.closest('main'))continue;const range=document.createRange();range.selectNodeContents(n);const rect=range.getBoundingClientRect();if(rect.right>innerWidth+1){const e=n.parentElement,s=getComputedStyle(e);result.push({tag:e.tagName,className:e.className,text:n.textContent.trim().slice(0,180),top:rect.top,right:rect.right,width:rect.width,ancestor:[e.parentElement,e.parentElement?.parentElement,e.parentElement?.parentElement?.parentElement].map(a=>a?.tagName+'.'+a?.className),wordBreak:s.wordBreak,overflowWrap:s.overflowWrap,minWidth:s.minWidth});}}return result;});
  const target=data.textOverflow[0]||data.overflow.find(e=>!['SECTION','DIV','UL','ARTICLE','DL'].includes(e.tag))||data.overflow[0];
  if(target){await page.evaluate(top=>scrollTo({top:top-150,behavior:'instant'}),target.top);await page.waitForTimeout(100);await page.screenshot({path:path.join(out,`${slug}-offender.png`),fullPage:false});}
  report.pages.push({slug,...data});
 }}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.pages.map(p=>({slug:p.slug,width:p.width,scrollWidth:p.scrollWidth,topOffenders:p.overflow.slice(0,8),textOverflow:p.textOverflow})),null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
