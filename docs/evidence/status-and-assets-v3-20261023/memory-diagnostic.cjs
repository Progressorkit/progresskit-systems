'use strict';
// Read-only diagnostic of the exact graph lifecycle gate. Never adjusts its tolerance.
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..');
const base='http://127.0.0.1:8111/';
const out=path.join(__dirname,'memory-diagnostic.json');
const roles=['translator','agents','voice','mail','messenger','tax'];
const digest=raw=>createHash('sha256').update(raw).digest('hex');
function fingerprint(){return ['index.html','assets/ecosystem-system.js','assets/ecosystem-system.css','assets/interface-life.js','assets/interface-life.css','assets/hero-space.js','assets/visual-acceptance.css','scripts/qa-final-website.cjs'].map(name=>({path:name,sha256:digest(fs.readFileSync(path.join(root,name)))}));}
const report={startedAt:new Date().toISOString(),base,scope:'Local synthetic preview; source and QA assertions remain unchanged.',sourceBefore:fingerprint(),runs:[]};
let browser;
function finalize(){
 report.finding={status:'UNRESOLVED_MEASUREMENT',originalFullGUI:{report:'browser/report.json',pass:92,fail:1,before:{documents:1,nodes:2025,jsEventListeners:172},after:{documents:1,nodes:2026,jsEventListeners:172},unchanged:'The original full-GUI FAIL remains unchanged.'},conclusion:'The isolated interaction sequence did not reproduce growth above its warmed baseline. Counts oscillate by one node downward and back. Live DOM, snapshot types and pseudo-element totals remain constant. The original +1 cannot be assigned conclusively to a pseudo-element, font, background or detached node.',assertion:'Every block keeps exact documents/nodes/listeners <= warm-before, without tolerance.',limitations:['Prefix reproduces the motion/scroll/media interactions and waits; read-only assertions and sampled computed-style reads from the full GUI are omitted. Absolute counters can consequently differ.','DOMSnapshot and exploratory heap collection are separated into the third run; the first two runs do not add DOM introspection between counter samples.','This is bounded local Chrome evidence, not proof against every possible memory leak or production behavior.']};
 report.method={browser:'/usr/bin/google-chrome',command:'node docs/evidence/status-and-assets-v3-20261023/memory-diagnostic.cjs',sequence:'Motion pause/resume and pointer interactions; graph Tax and planned-path phase; offscreen; reduced-motion reduce then no-preference; Tax click+200ms+GC cold; six roles+1440→600→1440+200ms+GC warm; four blocks of 30 role clicks + the same 2 resizes + 200ms + GC.',cleanup:'Each browser context and the standalone browser are closed in finally. No product files, source assertions, production/private endpoints or existing browser profile are modified.'};
 for(const run of report.runs){
  for(const s of run.samples){
   for(const key of ['addedSnapshotNodes','removedSnapshotNodes'])if(s[key]){const counts={};for(const n of s[key]){const k=n.type+':'+n.name;counts[k]=(counts[k]||0)+1;}s[key+'ByType']=counts;delete s[key];}
  }
  for(const key of ['heapBefore','heapAfter'])if(run[key]?.native){const n=run[key].native;run[key].selectedNativeCounts=Object.fromEntries(['Attr','NamedNodeMap','Text','Comment','HTMLDocument','DocumentType','SVGPathElement','CSSStyleDeclaration'].map(k=>[k,n[k]||0]));delete run[key].native;run[key].retainedOutsideRepository=true;}
 }
 report.sourcesUnchanged=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
 report.probeScriptSha256=digest(fs.readFileSync(__filename));
}
async function prefix(page){
  await page.waitForTimeout(300);
  const hero=await page.locator('.hero--monument').boundingBox();
  await page.mouse.move(hero.x+hero.width*.3,hero.y+120);await page.waitForTimeout(100);
  await page.mouse.move(hero.x+hero.width*.65,hero.y+200);await page.waitForTimeout(100);
  await page.waitForTimeout(450);
  const toggle=page.locator('[data-showroom-motion-toggle]');
  await toggle.click();await page.waitForTimeout(100);
  await page.mouse.move(100,200);await page.mouse.move(300,350);await page.waitForTimeout(100);
  await toggle.click();await page.waitForTimeout(100);
  await page.locator('[data-ecosystem-select="tax"]').click();await page.waitForTimeout(250);
  await page.waitForTimeout(350);
  await toggle.click();await page.locator('#ekosystem').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  await toggle.click();await page.locator('#ekosystem').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  await page.locator('#kontakt').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#ekosystem').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  await page.emulateMedia({reducedMotion:'no-preference'});
}
async function clicks(page,blocks){for(let i=0;i<blocks;i++)for(const id of roles)await page.locator(`[data-ecosystem-select="${id}"]`).click();}
async function resize(page){
  await page.setViewportSize({width:600,height:900});
  await page.waitForFunction(()=>document.querySelector('#ecosystem-role-tax').parentElement.dataset.ecosystemNode==='tax');
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(()=>document.querySelector('#ecosystem-role-tax').parentElement.id==='ecosystem-console');
  await page.waitForTimeout(200);
}
function snapshotSummary(snapshot){
 const strings=snapshot.strings;const docs=snapshot.documents.map(doc=>{
   const n=doc.nodes,types={},names={},pseudos={};
   n.nodeType.forEach((v,i)=>{types[v]=(types[v]||0)+1;const name=strings[n.nodeName[i]];names[name]=(names[name]||0)+1;});
   (n.pseudoType?.index||[]).forEach((index,j)=>{const type=strings[n.pseudoType.value[j]];pseudos[type]=(pseudos[type]||0)+1;});
   const records=n.backendNodeId.map((id,i)=>({id,type:n.nodeType[i],name:strings[n.nodeName[i]],value:strings[n.nodeValue[i]],parent:n.parentIndex[i]>=0?n.backendNodeId[n.parentIndex[i]]:null,pseudo:null}));
   (n.pseudoType?.index||[]).forEach((index,j)=>{records[index].pseudo=strings[n.pseudoType.value[j]];});
   return {nodeCount:n.nodeType.length,types,names,pseudos,records};
 });return docs;
}
async function heap(cdp,label){
 const dest=path.join('/tmp',`progresskit-memory-20261023-${label}.heapsnapshot`);const stream=fs.createWriteStream(dest);
 const onChunk=x=>stream.write(x.chunk);cdp.on('HeapProfiler.addHeapSnapshotChunk',onChunk);
 await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});cdp.off('HeapProfiler.addHeapSnapshotChunk',onChunk);await new Promise(resolve=>stream.end(resolve));
 const raw=fs.readFileSync(dest);const h=JSON.parse(raw),fields=h.snapshot.meta.node_fields,step=fields.length,typeIndex=fields.indexOf('type'),nameIndex=fields.indexOf('name'),idIndex=fields.indexOf('id'),types=h.snapshot.meta.node_types[typeIndex],native={};
 for(let i=0;i<h.nodes.length;i+=step){if(types[h.nodes[i+typeIndex]]!=='native')continue;const name=h.strings[h.nodes[i+nameIndex]];native[name]=(native[name]||0)+1;}
 return {path:dest,bytes:raw.length,sha256:digest(raw),native};
}
async function run(name,{instrumented=false,prefixMotion=true,blocks=4}={}){
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(8000);const cdp=await context.newCDPSession(page);
 const run={name,instrumented,prefixMotion,samples:[],errors:[]};report.runs.push(run);page.on('pageerror',e=>run.errors.push(e.message));
 try{
  await page.goto(base,{waitUntil:'networkidle'});if(prefixMotion)await prefix(page);
  async function snap(label){
   await cdp.send('HeapProfiler.collectGarbage');const counters=await cdp.send('Memory.getDOMCounters');
   const sample={label,counters};run.samples.push(sample);console.log(name,label,JSON.stringify(counters));
   if(instrumented){
    const s=snapshotSummary(await cdp.send('DOMSnapshot.captureSnapshot',{computedStyles:[],includePaintOrder:false,includeDOMRects:false}));
    sample.domSnapshot=s.map(({records,...rest})=>rest);
    const prior=run.lastRecords;const current=s.flatMap(d=>d.records);const byId=new Map(current.map(n=>[n.id,n]));
    if(prior){const old=new Map(prior.map(n=>[n.id,n]));sample.addedSnapshotNodes=current.filter(n=>!old.has(n.id));sample.removedSnapshotNodes=prior.filter(n=>!byId.has(n.id));}
    run.lastRecords=current;
    sample.live=await page.evaluate(()=>{let treeNodes=0;const w=document.createTreeWalker(document,NodeFilter.SHOW_ALL);while(w.nextNode())treeNodes++;return{elements:document.querySelectorAll('*').length,treeNodes,details:document.querySelectorAll('.ecosystem-node__detail').length,links:document.querySelectorAll('#ekosystem .delivery-project-link').length,selected:document.querySelector('[data-ecosystem-map]').dataset.selectedNode,scrollY};});
    sample.afterSnapshotCounters=await cdp.send('Memory.getDOMCounters');
   }return sample;
  }
  await page.locator('[data-ecosystem-select="tax"]').click();await page.waitForTimeout(200);await snap('cold');
  await clicks(page,1);await resize(page);const before=await snap('warm-before');
  if(instrumented)run.heapBefore=await heap(cdp,name+'-before');
  for(let i=1;i<=blocks;i++){
   await clicks(page,5);await resize(page);const after=await snap('block'+i+'-30clicks-2resize');
   after.exactGate={documents:after.counters.documents<=before.counters.documents,nodes:after.counters.nodes<=before.counters.nodes,listeners:after.counters.jsEventListeners<=before.counters.jsEventListeners};
  }
  if(instrumented){run.heapAfter=await heap(cdp,name+'-after');delete run.lastRecords;}
  run.strictPASS=run.samples.filter(s=>s.exactGate).every(s=>Object.values(s.exactGate).every(Boolean));
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});report.browser=browser.version();
 try{await run('exact-uninstrumented-1');await run('exact-uninstrumented-2');await run('exact-snapshot',{instrumented:true});}
 finally{await browser.close();report.sourceAfter=fingerprint();report.finishedAt=new Date().toISOString();finalize();fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
})().catch(e=>{report.error=e.stack;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1;});
