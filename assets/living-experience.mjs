import {createScene} from './world-scene.mjs';

export const STOPS = [0, 1.45, 2.8, 4, 5.2, 6.4, 7.6, 8.8, 10];
export const clamp = (value, min=0, max=1) => Math.max(min, Math.min(max, value));
export const mix = (a,b,t) => a+(b-a)*t;
export function sampleTimeline(progress) {
  const value = clamp(Number.isFinite(progress) ? progress : 0, 0, 10);
  let from = 0;
  while(from < STOPS.length-2 && value >= STOPS[from+1]) from++;
  const raw = (value-STOPS[from])/(STOPS[from+1]-STOPS[from]);
  // A short hold makes text readable; the transform remains reversible and scroll-bound.
  const t = clamp((raw-.12)/.76);
  return {from, to:from+1, t:t*t*(3-2*t), progress:value};
}
export function nodePose(stage, slot, mobile=false) {
  const positions = mobile ? [[.25,.44],[.75,.44],[.25,.61],[.75,.61],[.25,.78],[.75,.78]] : [[.23,.42],[.50,.29],[.77,.42],[.77,.70],[.50,.79],[.23,.70]];
  const [x,y] = positions[slot];
  if(stage===0 || stage===8) return {x:.5,y:mobile?.30:.43,scale:.1,opacity:0,media:0,spread:0};
  if(stage===1) return {x,y,scale:1,opacity:1,media:0,spread:0};
  if(stage===7) return {x:mobile?(.25+(slot%2)*.5):(.55+(slot%3)*.17),y:mobile?(.44+Math.floor(slot/2)*.18):(.40+Math.floor(slot/3)*.29),scale:mobile?.74:.72,opacity:1,media:slot<5?.9:0,spread:.3};
  const selected = slot===stage-2;
  return {x:selected?(mobile?.5:.69):x,y:selected?(mobile?.64:.49):y,scale:selected?(mobile?2.8:3.0):.35,opacity:selected?1:0,media:selected?1:0,spread:selected?1:0};
}
// The same eight-point physical carrier changes silhouette, position and orientation.
export function portalPose(index) {
  return [
    {x:.69,y:.48,w:.76,h:.9,yaw:-18,roll:-12,cut:.27},
    {x:.5,y:.54,w:.60,h:.68,yaw:0,roll:0,cut:.3},
    {x:.69,y:.49,w:.66,h:.70,yaw:-7,roll:-3,cut:.045},
    {x:.69,y:.49,w:.66,h:.76,yaw:9,roll:7,cut:.09},
    {x:.69,y:.48,w:.54,h:.85,yaw:-14,roll:-11,cut:.34},
    {x:.69,y:.49,w:.74,h:.91,yaw:6,roll:4,cut:.22},
    {x:.69,y:.49,w:.68,h:.71,yaw:-6,roll:-2,cut:.08},
    {x:.70,y:.52,w:.64,h:.72,yaw:12,roll:-6,cut:.18},
    {x:.5,y:.30,w:.5,h:.54,yaw:0,roll:0,cut:.3},
  ][index];
}
export function carrierPath(cut) {
  const c=clamp(cut,.025,.4),x=1000*c,y=800*c;
  return `M${x} 8H${1000-x}L992 ${y}V${800-y}L${1000-x} 792H${x}L8 ${800-y}V${y}Z`;
}
const root = typeof document === 'undefined' ? null : document.querySelector('[data-living-journey]');
if(root) initialize(root);
function initialize(root) {
  const stage = root.querySelector('.living-stage');
  const identity = root.querySelector('.living-identity');
  const canvas = root.querySelector('[data-world-scene]');
  const portal = root.querySelector('.living-portal');
  const portalPaths = [...portal.querySelectorAll('path')];
  const architecture = root.querySelector('.living-architecture');
  const foreground = root.querySelector('.living-foreground');
  const warmed = new Set();
  const nodes = [...root.querySelectorAll('.living-node')];
  const chapters = [...root.querySelectorAll('[data-living-project]')];
  const parts = [...root.querySelectorAll('[data-living-part]')];
  const markers = [...root.querySelectorAll('[data-stop]')];
  const scene = createScene(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  const scope = new AbortController(), options = {signal:scope.signal};
  let width=0,height=0,top=0,coreWidth=0,frame=0,visible=true,pageActive=true,needsMeasure=true;
  let staticMode=false,group=0,point=null,near=-1,pendingFocus=null,progress=0;
  let objectSizes=[];
  let lastCarrierPath='';
  const pageCount = Math.ceil(nodes.length/6);
  const colors = [[168,183,201],[123,159,183],[115,151,187],[219,202,181],[176,194,210],[188,161,104],[111,143,184],[162,173,190],[193,154,129]];
  const markerHomes = markers.map(marker=>{const home=document.createComment('scene-anchor');marker.before(home);return home;});
  const on = (target,type,handler,extra={}) => target.addEventListener(type,handler,{...options,...extra});
  const corePose = i => i===0 ? {x:width<1000?.5:.69,y:width<600&&height<=680?.30:width<1000?.29:.46,scale:1,opacity:1} : i===1 ? {x:.5,y:width<600?.26:.54,scale:width<600?.24:.25,opacity:1} : i===8 ? {x:.5,y:width<600?.27:.27,scale:.56,opacity:1} : i===7 ? {x:width<600?.5:.16,y:width<600?.32:.25,scale:width<600?.12:.15,opacity:.8} : {x:width<1000?.88:.095,y:width<1000?.09:.14,scale:.09,opacity:.7};
  function weight(index,sample){return (sample.from===index?1-sample.t:0)+(sample.to===index?sample.t:0);}
  function visibility(element,amount){
    element.style.opacity=amount.toFixed(4);
    const hidden=amount<.025;
    element.style.visibility=hidden?'hidden':'visible';element.inert=amount<.72;
    element.setAttribute('aria-hidden',String(hidden));
  }
  function schedule(){if(!frame&&visible&&pageActive&&!document.hidden)frame=requestAnimationFrame(render);}
  function measure(){
    width=stage.clientWidth;height=stage.clientHeight;coreWidth=identity.offsetWidth;top=root.getBoundingClientRect().top+scrollY;
    objectSizes=chapters.map((chapter,index)=>{
      const stacked=width<1000,copy=chapter.querySelector('.living-chapter__copy'),caption=chapter.querySelector('.living-provenance');
      const start=copy.offsetTop+copy.offsetHeight+(width<600?15:30),end=caption.offsetTop-18;
      const h=stacked?Math.min(Math.max(80,end-start),width*(index===2?1.25:1.05)):height*([.68,.7,.73,.67,.64][index]);
      return {w:width*(stacked?.84:[.59,.58,.54,.57,.59][index]),h,x:stacked?.5:.675,y:stacked?(start+(end-start)/2)/height:.49};
    });
    nodes.forEach((node,index)=>{if(index<5){const object=objectSizes[index],scale=width<600?2.8:3;node.style.setProperty('--object-w',`${object.w/scale}px`);node.style.setProperty('--object-h',`${object.h/scale}px`);}});
    scene.resize(width,height);needsMeasure=false;
  }
  function setMode(){
    const previousMode=staticMode;
    staticMode = reduced.matches || document.body.dataset.motion==='paused' || innerHeight<450;
    root.classList.toggle('living-ready',!staticMode);root.classList.toggle('living-static',staticMode);
    markers.forEach((marker,index)=>{if(staticMode)markerHomes[index].after(marker);else root.prepend(marker);marker.style.setProperty('--stop',marker.dataset.stop);});
    root.querySelector('[data-map-paging]').hidden=staticMode;
    if(staticMode){
      for(const element of [identity,...nodes,...chapters,...parts]){element.removeAttribute('style');element.inert=false;element.removeAttribute('aria-hidden');}
      root.querySelector('[data-living-state]').textContent='SPOKOJNY WIDOK';
      canvas.style.visibility='hidden';
    }else canvas.style.visibility='';
    needsMeasure=true;schedule();
    if(previousMode!==staticMode&&progress>1){
      const sample=sampleTimeline(progress),index=sample.t>.5?sample.to:sample.from;
      const hash=index===1?'#projekty':index>=2&&index<=6?`#scena-${chapters[index-2].dataset.livingProject}`:index===7?'#warstwy':'#tozsamosc';
      navigate(hash);
    }
  }
  function render(){
    frame=0;if(!visible||!pageActive||document.hidden)return;
    if(needsMeasure)measure();
    if(staticMode)return;
    progress=clamp((scrollY-top)/height,0,10);
    const sample=sampleTimeline(progress),mobile=width<600;
    root.dataset.scene=String(sample.t>.5?sample.to:sample.from);
    document.body.dataset.livingScene=root.dataset.scene;
    root.dataset.progress=progress.toFixed(4);
    const blend=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],sample.t)]));
    const core=blend(corePose(sample.from),corePose(sample.to));
    const presence=point&&!coarse.matches?clamp((point.x/width-.5)*2,-1,1):0;
    const vertical=point&&!coarse.matches?clamp((point.y/height-.5)*2,-1,1):0;
    identity.style.transform=`translate3d(${core.x*width-coreWidth/2+presence*10}px,${core.y*height-coreWidth/2+vertical*6}px,0) perspective(1200px) rotateY(${presence*7}deg) rotateX(${-vertical*4}deg) scale(${core.scale})`;
    identity.style.opacity=core.opacity;
    const intro=weight(0,sample),map=weight(1,sample),reveal=weight(7,sample),finale=weight(8,sample);
    for(const part of parts)visibility(part,{intro,map,reveal,finale}[part.dataset.livingPart]);
    chapters.forEach((chapter,index)=>visibility(chapter,clamp((weight(index+2,sample)-.6)/.4)));
    // Decode the current and next shot before it unfolds; hidden lazy images otherwise
    // may not be requested by the browser until the sticky scene is already visible.
    nodes.slice(0,5).forEach((node,index)=>{
      if(sample.from===0||index+2>sample.to+1||warmed.has(index))return;
      warmed.add(index);
      const images=[...node.querySelectorAll('img')];if(index===3)images.push(root.querySelector('.living-backdrop'));
      images.forEach(img=>{img.loading='eager';img.decode().then(schedule,()=>{});});
    });
    const forest=weight(5,sample),tax=weight(3,sample),phone=weight(4,sample),remote=weight(6,sample);
    root.dataset.forestVisible=String(forest>.001);root.style.setProperty('--forest',forest.toFixed(4));root.style.setProperty('--paper',tax.toFixed(4));root.style.setProperty('--phone',phone.toFixed(4));root.style.setProperty('--remote',remote.toFixed(4));
    const backdrop=root.querySelector('.living-backdrop');backdrop.style.opacity=forest.toFixed(4);
    backdrop.style.transform=`translate3d(${presence*-6}px,${vertical*-3}px,0) scale(${1.08+(1-forest)*.24})`;
    const stageCarrier=index=>{
      const p={...portalPose(index)};
      if(width<1000){
        p.x=.5;p.w=index===1?.86:.94;p.h=index===1?.68:.56;
        p.y=index===0?.29:index===8?.27:index===1?.54:index===7?.63:objectSizes[index-2].y;
        if(index>=2&&index<=6)p.h=Math.min(.63,(objectSizes[index-2].h+50)/height);
      }
      return p;
    };
    const carrier=blend(stageCarrier(sample.from),stageCarrier(sample.to));
    const handover=sample.from>=2&&sample.to<=6?Math.sin(sample.t*Math.PI):0;
    const pw=width*carrier.w,ph=height*carrier.h;
    portal.style.transform=`translate3d(${carrier.x*width-500+presence*18}px,${carrier.y*height-400+vertical*10}px,0) perspective(1400px) rotateY(${carrier.yaw+handover*62+presence*3}deg) rotateZ(${carrier.roll+handover*8}deg) scale(${pw/1000},${ph/800})`;
    const silhouette=carrierPath(Number(carrier.cut.toFixed(4)));
    if(silhouette!==lastCarrierPath){portalPaths.forEach(path=>path.setAttribute('d',silhouette));lastCarrierPath=silhouette;}
    portal.style.opacity=String(1-forest*.65);
    architecture.style.transform=`translate3d(${presence*4+Math.sin(progress*.4)*10}px,${vertical*3-progress*3}px,0) rotate(${mix(-8,5,progress/10)}deg)`;
    foreground.style.transform=`translate3d(${presence*28-Math.sin(progress*.8)*32}px,${vertical*16+Math.sin(progress*.5)*22}px,0) rotate(${Math.sin(progress*.8)*4}deg)`;
    root.style.setProperty('--shine',`${45+presence*18}%`);
    const watermark=root.querySelector('.living-watermark');
    const names=['SYSTEMS','ECOSYSTEM','MAIL','TAX','GLIKEMIA','VAELORIA','REMOTE','SYSTEMS','PROGRESSKIT'];
    watermark.textContent=names[sample.t>.5?sample.to:sample.from];
    watermark.style.opacity=String(1-Math.sin(sample.t*Math.PI)*.9);
    const rgb=colors[sample.from].map((n,i)=>Math.round(mix(n,colors[sample.to][i],sample.t))).join(',');
    // Colour changes are composited overlays. Repainting every full-screen gradient
    // for each RGB interpolation is unnecessarily expensive on integrated GPUs.
    root.style.setProperty('--beam-x',`${Math.sin(progress*.6)*20}%`);
    root.style.setProperty('--scene-progress',progress/10);
    const selectedGroup=map>.5?group:0;
    const poses=nodes.map((node,index)=>{
      const slot=index%6;
      const pose=blend(nodePose(sample.from,slot,mobile),nodePose(sample.to,slot,mobile));
      if(index<5){
        const o=objectSizes[index];
        for(const [key,factor] of [['x',o.x],['y',o.y]]){
          const a=slot===sample.from-2?factor:nodePose(sample.from,slot,mobile)[key];
          const b=slot===sample.to-2?factor:nodePose(sample.to,slot,mobile)[key];pose[key]=mix(a,b,sample.t);
        }
        if(sample.from>=2&&sample.to<=6&&(slot===sample.from-2||slot===sample.to-2)){
          const incoming=slot===sample.to-2,t=sample.t;
          pose.x=o.x+(incoming?.24*(1-t):-.12*t);pose.y=o.y+(incoming?-.10*(1-t):.08*t);
          pose.scale=(mobile?2.8:3)*(incoming?.86+.14*t:1-.12*t);
          pose.media=1;pose.spread=1;pose.opacity=incoming?clamp(t/.22):clamp((1-t)/.22);
        }
      }
      if(mobile && height<=680){
        pose.y-=.085*map;
        pose.x=mix(pose.x,slot%2?.73:.27,reveal);
        pose.y=mix(pose.y,.48+Math.floor(slot/2)*.16,reveal);
        pose.scale=mix(pose.scale,.7,reveal);
      }
      if(!mobile&&width<1000)pose.scale=mix(pose.scale,.55,reveal);
      if(Math.floor(index/6)!==selectedGroup)pose.opacity=0;
      return {...pose,index};
    });
    near=-1;
    if(point&&!coarse.matches&&map>.6){
      let distance=140;
      for(const pose of poses){if(pose.opacity<.5)continue;const d=Math.hypot(pose.x*width-point.x,pose.y*height-point.y);if(d<distance){distance=d;near=pose.index;}}
    }
    const focusIndex=nodes.indexOf(document.activeElement);
    if(focusIndex>=0)near=focusIndex;
    poses.forEach(pose=>{
      const node=nodes[pose.index];
      const size=mobile?(height<=680?[62,70]:[72,82]):width>=1800?[150,174]:[124,144];
      const proximity=pose.index===near&&map>.6?1:0;
      node.style.transform=`translate3d(${pose.x*width-size[0]/2}px,${pose.y*height-size[1]/2-proximity*3}px,0) scale(${pose.scale+proximity*.025})`;
      node.dataset.mediaVisible=String(pose.media>.001);
      node.style.setProperty('--label',mix(1-pose.media,1,reveal).toFixed(4));node.style.setProperty('--media',pose.media.toFixed(4));node.style.setProperty('--spread',pose.spread.toFixed(4));
      const labelOffset=pose.index<5?objectSizes[pose.index].h/(mobile?2.8:3)/2+18:size[1]/2;
      node.style.setProperty('--label-offset',`${mix(size[1]/2,labelOffset,reveal)}px`);
      node.style.setProperty('--turn',`${handover*(pose.index===sample.from-2?-42:42)}deg`);
      const media=node.querySelector('.living-media');
      if(media){
        const unfolding=sample.from===1&&pose.index===0&&pose.media>0&&pose.media<1;
        const cut=(1-pose.media)*35;
        media.style.clipPath=unfolding?`polygon(${cut}% 0,${100-cut}% 0,100% ${cut}%,100% ${100-cut}%,${100-cut}% 100%,${cut}% 100%,0 ${100-cut}%,0 ${cut}%)`:'';
      }
      node.dataset.near=String(Boolean(proximity));
      visibility(node,pose.opacity);
      // Only map links, the current product and the revealed layers can receive focus.
      node.inert=pose.opacity<.72||(handover>.05&&pose.index<5&&weight(pose.index+2,sample)<.85);
    });
    root.querySelector('[data-living-state]').textContent=progress<.8?'INITIALIZATION':progress<2?'ACTIVE':progress<8?'PROCESSING':'STABLE';
    identity.style.filter=`brightness(${1.08+(near>=0?.09:0)+(document.body.dataset.coreState==='active'?.12:0)})`;
    const active=document.body.dataset.coreState==='active';
    scene.draw({core,nodes:poses,energy:mix(.18,1,1-intro)+(active?.3:0),progress,rgb,near});
    if(pendingFocus&&!pendingFocus.closest('[inert]')){pendingFocus.focus({preventScroll:true});pendingFocus=null;}
  }
  function navigate(hash,{focus=false,animate=false}={}){
    const marker=markers.find(m=>`#${m.id}`===hash);
    if(!marker)return false;
    const index=chapters.findIndex(ch=>hash===`#scena-${ch.dataset.livingProject}`);
    const target=index>=0?chapters[index]:hash==='#projekty'?root.querySelector('.living-map-heading'):hash==='#warstwy'?root.querySelector('.living-reveal'):root.querySelector('.living-finale');
    if(staticMode){target.scrollIntoView({behavior:'instant',block:'start'});return true;}
    if(needsMeasure)measure();
    if(focus){pendingFocus=index>=0?target.querySelector('h2'):nodes[group*6];pendingFocus.tabIndex=index>=0?-1:0;}
    scrollTo({top:top+Number(marker.dataset.stop)*height,behavior:animate?'smooth':'instant'});schedule();return true;
  }
  on(root,'click',event=>{
    const paging=event.target.closest('[data-map-step]');
    if(paging){group=(group+Number(paging.dataset.mapStep)+pageCount)%pageCount;root.querySelector('[data-map-position]').textContent=`${group+1} / ${pageCount}`;schedule();return;}
    const link=event.target.closest('a');
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const node=link.closest('.living-node');
    const chapter=node&&chapters.find(ch=>ch.dataset.livingProject===node.dataset.projectId);
    let hash=link.getAttribute('href');
    // The same anchor is a genuine native product link in every fallback and product shot.
    if(node&&chapter&&!staticMode&&sampleTimeline(progress).from<=1)hash=`#scena-${node.dataset.projectId}`;
    if(hash?.startsWith('#')&&navigate(hash,{focus:true,animate:true})){event.preventDefault();if(location.hash!==hash)history.pushState(null,'',hash);}
  });
  on(document,'click',event=>{
    const link=event.target.closest('a');if(!link||root.contains(link)||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const url=new URL(link.href);if(url.origin===location.origin&&url.pathname===location.pathname&&navigate(url.hash,{animate:true})){event.preventDefault();if(location.hash!==url.hash)history.pushState(null,'',url.hash);}
  });
  on(root,'keydown',event=>{
    if(event.key===' '&&event.target.matches('.living-node')){event.preventDefault();event.target.click();}
    if(event.key==='Escape'&&!staticMode&&progress>2&&progress<8){event.preventDefault();navigate('#projekty',{focus:true,animate:true});history.pushState(null,'','#projekty');}
  });
  on(root,'pointermove',event=>{if(event.pointerType==='touch'||coarse.matches||staticMode)return;point={x:event.clientX,y:event.clientY};schedule();},{passive:true});
  on(root,'pointerleave',()=>{point=null;schedule();},{passive:true});
  on(root,'wheel',()=>{pendingFocus=null;},{passive:true});
  on(root,'touchstart',()=>{pendingFocus=null;},{passive:true});
  on(root,'keydown',event=>{if(event.key==='Tab')pendingFocus=null;});
  on(root,'focusin',schedule);on(root,'focusout',schedule);
  on(window,'scroll',()=>{point=null;schedule();},{passive:true});
  on(window,'resize',()=>{if((innerHeight<450)!==staticMode&&!reduced.matches&&document.body.dataset.motion!=='paused')setMode();needsMeasure=true;schedule();},{passive:true});
  on(window,'hashchange',()=>navigate(location.hash));on(window,'popstate',()=>navigate(location.hash));
  on(document,'progresskit:motion',setMode);on(reduced,'change',setMode);on(document,'progresskit:core',schedule);
  on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;canvas.dataset.motion='hidden';point=null;}else schedule();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;canvas.dataset.motion='offscreen';}});
  observer.observe(root);
  const resizer=new ResizeObserver(()=>{needsMeasure=true;schedule();});resizer.observe(stage);
  on(window,'pagehide',event=>{pageActive=false;cancelAnimationFrame(frame);frame=0;canvas.dataset.motion='hidden';if(!event.persisted){scope.abort();observer.disconnect();resizer.disconnect();}});
  on(window,'pageshow',()=>{pageActive=true;needsMeasure=true;schedule();navigate(location.hash);});
  setMode();render();navigate(location.hash);
}
