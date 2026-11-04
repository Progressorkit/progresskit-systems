const {chromium}=require('/home/pawe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=gl']});
 try {
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto('http://127.0.0.1:8207/');
  await p.waitForFunction(()=>document.querySelector('#projekty').dataset.renderer==='three-webgl2');
  await p.locator('[data-hero-enter]').click();
  await p.waitForFunction(()=>document.querySelector('#rdzen').dataset.entryState==='showroom');
  await p.waitForTimeout(5000);
  console.log(JSON.stringify(await p.evaluate(()=>document.querySelector('.showroom-scene canvas').__physicalDebug.crystals.filter(c=>c.shown).map(c=>({id:c.id,matrix:c.body.matrixWorld.elements,sphere:c.body.geometry.boundingSphere}))),null,2));
  await p.evaluate(async()=>{
   const THREE=await import('/assets/vendor/three/three.module.js');
   for(const c of document.querySelector('.showroom-scene canvas').__physicalDebug.crystals){
    c.body.material=new THREE.MeshBasicMaterial({color:0xff0066,depthTest:false,side:THREE.DoubleSide});
    c.body.frustumCulled=false;c.content.frustumCulled=false;
    c.content.material.transparent=true;c.content.material.depthWrite=false;c.content.material.depthTest=false;c.content.material.needsUpdate=true;c.content.renderOrder=7;
   }
  });
  await p.waitForTimeout(500);
  const data=await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const a=document.querySelector('.showroom-scene canvas'),c=document.createElement('canvas');c.width=a.width;c.height=a.height;c.getContext('2d').drawImage(a,0,0);resolve(c.toDataURL());})));
  require('fs').writeFileSync(__dirname+'/debug-raw-canvas.png',Buffer.from(data.split(',')[1],'base64'));
  console.log(await p.locator('.showroom-scene canvas').evaluate(e=>{const rows=[];for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);rows.push({node:n.className,mask:s.mask,clip:s.clipPath,filter:s.filter,backdrop:s.backdropFilter,transform:s.transform,contain:s.contain,overflow:s.overflow,visibility:s.contentVisibility});}return rows;}));
  for(const [name,style] of Object.entries({mask:'#projekty .showroom-scene {mask:none!important;-webkit-mask:none!important;}',composite:'#projekty .showroom-scene canvas {transform:translateZ(0);will-change:transform;}',flat:'#projekty,#projekty * {transform-style:flat!important;backdrop-filter:none!important;}',overlays:'#projekty .showroom-viewport>*:not(.showroom-scene),#projekty .showroom-viewport::before,#projekty .showroom-viewport::after {display:none!important;}' })){
   await p.addStyleTag({content:style});await p.waitForTimeout(300);await p.locator('.showroom-viewport').screenshot({path:__dirname+'/debug-'+name+'.png'});
  }
 }finally{await b.close();}
})();
