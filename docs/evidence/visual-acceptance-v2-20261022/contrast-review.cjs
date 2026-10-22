const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:8100/',{waitUntil:'networkidle'});
  const report=await page.evaluate(()=>{
   const samples=[['brand','.topbar .brand__title'],['navigation','.topbar .nav a'],['hero title','.hero--monument .stone-line'],['hero motto','.hero__motto'],['secondary CTA','.hero__commercial-actions .cta:nth-child(2)'],['project title','.showroom-card.is-active h3'],['project state','.showroom-card.is-active .showroom-card__stage'],['project action','.showroom-card.is-active .showroom-card__action'],['showroom instructions','.showroom-instructions'],['showroom live status','#showroom-status'],['service','#uslugi .competency-list li'],['ecosystem heading','.delivery-flow__heading'],['ecosystem description','.delivery-flow__description, .delivery-roadmap p'],['ecosystem state','.delivery-state'],['release description','.delivery-channel h3>span'],['about copy','#o-mnie .about-v5__copy p'],['contact small','#kontakt .contact__meta small'],['contact address','#kontakt .contact__email'],['brief label','#brief .brief-grid label'],['brief input','#brief .brief-grid textarea'],['footer link','.footer__links a']];
   function parse(v){const n=v.match(/[\d.]+/g)?.map(Number)||[];return n.length>=3?[n[0],n[1],n[2],n[3]??1]:null}
   function lum(c){const q=c.slice(0,3).map(v=>{const t=v/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4});return q[0]*.2126+q[1]*.7152+q[2]*.0722}
   function over(a,b){const t=a[3]??1;return [a[0]*t+b[0]*(1-t),a[1]*t+b[1]*(1-t),a[2]*t+b[2]*(1-t),1]}
   function bounds(a){a.sort((x,y)=>lum(x)-lum(y));return a.length>1?[a[0],a[a.length-1]]:a}
   function layers(s){let depth=0,from=0,out=[];for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;else if(s[i]===')')depth--;else if(s[i]===','&&!depth){out.push(s.slice(from,i));from=i+1}}out.push(s.slice(from));return out}
   function backing(el){let a=[el],p=el.parentElement;while(p){a.unshift(p);p=p.parentElement}let candidates=[[255,255,255,1]],unknown=[];for(const node of a){const s=getComputedStyle(node),bg=parse(s.backgroundColor);if(bg)candidates=bounds(candidates.map(c=>over(bg,c)));for(const layer of layers(s.backgroundImage).reverse()){if(layer.trim()==='none')continue;const stops=[...layer.matchAll(/rgba?\([^)]*\)/g)].map(x=>parse(x[0])).filter(Boolean);if(stops.length){candidates=bounds(candidates.flatMap(c=>stops.map(x=>over(x,c))))}else unknown.push(layer)} }return{candidates,unknown}}
   const checks=samples.map(([name,selector])=>{
    const el=document.querySelector(selector);if(!el)return{name,selector,status:'BLOCKED',reason:'Selector absent'};
    const s=getComputedStyle(el),foreground=parse(s.color),bg=backing(el),size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight)||400;
    const threshold=size>=24||(size>=18.6667&&weight>=700)?3:4.5;
    const ratios=bg.candidates.map(c=>{const fg=over(foreground,c);const x=lum(fg),y=lum(c);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)});
    const ratio=Math.min(...ratios),visible=s.visibility!=='hidden'&&s.display!=='none'&&el.getClientRects().length>0;
    return{name,selector,text:el.textContent.trim().slice(0,100),foreground:s.color,computedBackgroundColor:s.backgroundColor,computedBackgroundImage:s.backgroundImage,fontSize:s.fontSize,fontWeight:s.fontWeight,backgroundBounds:bg.candidates.map(c=>c.slice(0,3).map(x=>Number(x.toFixed(2)))),ratio:Number(ratio.toFixed(3)),threshold,visible,unknownImages:bg.unknown,status:!visible||bg.unknown.length?'BLOCKED':ratio>=threshold?'PASS':'FAIL'};
   });
   return{base:location.origin,viewport:{width:innerWidth,height:innerHeight},scope:'Computed-style foreground versus ancestor background gradient-stop bounds including alpha overlays. Palette approximation only; not pixel sampling, anti-aliasing/overlap verification, screen-reader testing or a complete WCAG audit.',stylesheets:[...document.styleSheets].map(x=>x.href).filter(Boolean),PASS:checks.filter(x=>x.status==='PASS').length,FAIL:checks.filter(x=>x.status==='FAIL').length,BLOCKED:checks.filter(x=>x.status==='BLOCKED').length,checks};
  });
  fs.writeFileSync('docs/evidence/visual-acceptance-v2-20261022/contrast-review.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({PASS:report.PASS,FAIL:report.FAIL,BLOCKED:report.BLOCKED,minRatio:Math.min(...report.checks.map(x=>x.ratio||100)),issues:report.checks.filter(x=>x.status!=='PASS')},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
