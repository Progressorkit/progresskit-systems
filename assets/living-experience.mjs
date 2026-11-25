import {createScene} from './world-scene.mjs';
import {createAtmosphere} from './forge-atmosphere.mjs';

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
  if(stage===7) return {x:mobile?(.25+(slot%2)*.5):(.55+(slot%3)*.17),y:mobile?(.44+Math.floor(slot/2)*.18):(.40+Math.floor(slot/3)*.29),scale:mobile?.74:.72,opacity:1,media:0,spread:.3};
  const selected = slot===stage-2;
  return {x:selected?(mobile?.5:.69):x,y:selected?(mobile?.64:.49):y,scale:selected?(mobile?2.8:3.0):.35,opacity:selected?1:0,media:selected?1:0,spread:selected?1:0};
}
// Far architecture and the nearer basalt lip travel at different rates.
const TRACK = [
  [0, 0, 1.07], [-.045, -.035, 1.19], [.025, .025, 1.27],
  [.073, -.018, 1.38], [-.054, .024, 1.22], [-.095, .068, 1.48],
  [.046, .048, 1.32], [.012, -.04, 1.18], [-.03, -.02, 1.08],
];
export function chamberPose(sample) {
  const a = TRACK[sample.from], b = TRACK[sample.to];
  return {x:mix(a[0],b[0],sample.t), y:mix(a[1],b[1],sample.t), zoom:mix(a[2],b[2],sample.t)};
}

export function sceneExposure(index, sample) {
  const weight = (sample.from === index ? 1 - sample.t : 0) + (sample.to === index ? sample.t : 0);
  return clamp((weight - .51) / .42);
}

const root = typeof document === 'undefined' ? null : document.querySelector('[data-living-journey]');
if(root) initialize(root);
function initialize(root) {
  const stage = root.querySelector('.living-stage');
  const identity = root.querySelector('.living-identity');
  const canvas = root.querySelector('[data-world-scene]');
  const atmosphere = createAtmosphere(root.querySelector('[data-forge-atmosphere]'));
  const architecture = root.querySelector('.living-architecture');
  const foreground = root.querySelector('.living-foreground');
  const warmed = new Set();
  const nodes = [...root.querySelectorAll('.living-node')];
  const chapters = [...root.querySelectorAll('[data-living-project]')];
  const titles = chapters.map(chapter => chapter.querySelector('h2').textContent.trim());
  const parts = [...root.querySelectorAll('[data-living-part]')];
  const markers = [...root.querySelectorAll('[data-stop]')];
  const scene = createScene(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  const scope = new AbortController(), options = {signal:scope.signal};
  let width=0,height=0,top=0,frame=0,visible=true,pageActive=true,needsMeasure=true;
  let staticMode=false,group=0,point=null,near=-1,pendingFocus=null,progress=0;
  let objectSizes=[];
  let housingWidth=0,housingHeight=0;
  const coreStatus=root.querySelector('[data-core-status]'),coreLabel=root.querySelector('[data-core-label]');
  let focusStop=0, flightFrame=0, flightTicket=0, preparingFlight=false, mapTimer=0, lastMapFrame=0, mapClock=0;
  const easeRange=(value,a,b)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
  function stopFlight(){
    if(!flightFrame&&!preparingFlight)return;
    flightTicket++;preparingFlight=false;
    cancelAnimationFrame(flightFrame);flightFrame=0;
    scene.finishOpening?.();
    root.removeAttribute('data-preparing');
    coreStatus.textContent='Aktywacja otwiera mapę projektów.';coreLabel.textContent='Pokaż projekty';
  }
  function stopFloat(){
    clearTimeout(mapTimer);mapTimer=0;lastMapFrame=0;
  }
  let crystalSize={width:124,height:144};
  let mapSlots=[];
  const pageCount = Math.ceil(nodes.length/6);
  const markerHomes = markers.map(marker=>{const home=document.createComment('scene-anchor');marker.before(home);return home;});
  const on = (target,type,handler,extra={}) => target.addEventListener(type,handler,{...options,...extra});
  // The initial position is owned by CSS, including before this module starts.
  let origin={x:.71,y:.48};
  const corePose = i => i===0 ? {...origin,scale:1,opacity:1} : i===1 ? {x:.5,y:.5,scale:.23,opacity:0} : i===8 ? {x:.5,y:.27,scale:.44,opacity:1} : {x:.5,y:.52,scale:.14,opacity:0};
  function weight(index,sample){return (sample.from===index?1-sample.t:0)+(sample.to===index?sample.t:0);}
  function visibility(element,amount){
    element.style.opacity=amount.toFixed(4);
    const hidden=amount<.025;
    element.style.visibility=hidden?'hidden':'visible';element.inert=amount<.72;
    element.setAttribute('aria-hidden',String(hidden));
  }
  function sceneActivity(){
    const active = !staticMode && visible && pageActive && !document.hidden;
    if(!active){stopFlight();stopFloat();if(!visible||staticMode)root.removeAttribute('data-pinned');}
    scene.setActive(active);
    atmosphere.setActive(active);
  }
  function schedule(){if(!frame&&visible&&pageActive&&!document.hidden)frame=requestAnimationFrame(render);}
  const crystalEase=value=>{const t=clamp(value);return t*t*(3-2*t);};
  function crystalArc(a,b,c,d,t){
    const q=1-t;
    return {x:q*q*q*a.x+3*q*q*t*b.x+3*q*t*t*c.x+t*t*t*d.x,y:q*q*q*a.y+3*q*q*t*b.y+3*q*t*t*c.y+t*t*t*d.y};
  }
  function layoutPose(index,slot,mobile){
    const pose=nodePose(index,slot,mobile);
    const cluster=mapSlots[slot]||{};
    return {...pose,size:1,z:0,pitch:cluster.pitch||0,yaw:cluster.yaw||0,roll:cluster.roll||0,...(index===1?cluster:{})};
  }
  function measure(){
    const viewportChanged=width!==stage.clientWidth||height!==stage.clientHeight;
    width=stage.clientWidth;height=stage.clientHeight;top=root.getBoundingClientRect().top+scrollY;
    housingWidth=identity.offsetWidth/width;housingHeight=identity.offsetHeight/height;
    const style=getComputedStyle(root);
    origin={x:parseFloat(style.getPropertyValue('--core-x')),y:parseFloat(style.getPropertyValue('--core-y'))};
    objectSizes=chapters.map((chapter,index)=>{
      const stacked=width<1000,copy=chapter.querySelector('.living-chapter__copy'),caption=chapter.querySelector('.living-provenance');
      const start=stacked ? copy.offsetTop+copy.offsetHeight+20 : height*.12;
      const end=caption.offsetTop-22;
      const available=Math.max(24,end-start);
      const h=Math.min(available,stacked ? width*1.10 : height*.7);
      return {w:width*(stacked?.85:.48),h,x:stacked?.5:.697,y:(start+available/2)/height};
    });
    nodes.forEach((node,index)=>{if(index<5){const object=objectSizes[index],scale=width<600?2.8:3;node.style.setProperty('--object-w',`${object.w/scale}px`);node.style.setProperty('--object-h',`${object.h/scale}px`);}});
    // Fit the existing six-link map between its real heading and controls.
    // Labels are part of each cell, so enlarging glass cannot cover navigation.
    const mobile=width<600,columns=mobile?2:3,rows=mobile?3:2;
    const gutter=Math.max(8,width*(mobile?.025:.055));
    const cellWidth=(width-2*gutter)/columns,labelGap=mobile?7:10;
    const labelWidth=Math.floor(mobile?Math.min(cellWidth-4,156):Math.min(cellWidth-12,220));
    root.style.setProperty('--map-label-w',`${labelWidth}px`);
    const labelHeight=Math.max(...nodes.map(node=>node.querySelector('.living-node__name').offsetHeight));
    const heading=root.querySelector('.living-map-heading'),controls=root.querySelector('.living-map-controls');
    const start=heading.offsetTop+heading.offsetHeight+(mobile?14:20);
    const end=controls.offsetTop-(mobile?12:18);
    const cellHeight=Math.max(1,end-start)/rows,aspect=mobile?(innerHeight<=680?1.35:1.22):1.28;
    const crystalWidth=Math.max(1,Math.floor(Math.min(cellWidth*(mobile?.98:.92),(cellHeight-labelHeight-labelGap-10)*aspect,420)));
    const crystalHeight=Math.max(1,Math.floor(crystalWidth/aspect));
    root.style.setProperty('--map-crystal-w',`${crystalWidth}px`);
    root.style.setProperty('--map-crystal-h',`${crystalHeight}px`);
    // Six independent anchors form a cloud rather than two horizontal rows.
    // Mobile retains two readable lanes with deliberately staggered masses.
    const constellation=mobile?[
      [-.015,-.045,1.03,100], [.020,.040,.91,-80], [-.010,-.020,.95,10],
      [.008,.015,1.02,70], [-.020,.035,1.01,25], [.012,-.015,.90,-110],
    ]:[
      [.16,.32,.94,155], [.52,.08,1.06,-130], [.84,.28,.90,55],
      [.24,.79,.98,-185], [.58,.60,1.03,205], [.86,.78,.96,-45],
    ];
    const rotations=[[-.13,-.30,-.07],[.16,.25,.07],[-.09,-.35,.10],[.18,.30,-.10],[-.12,-.24,.08],[.13,.36,-.04]];
    mapSlots=constellation.map(([dx,dy,size,z],slot)=>({
      x:mobile?(gutter+(slot%columns+.5+dx)*cellWidth)/width:dx,
      y:(mobile?start+(Math.floor(slot/columns)+.5+dy)*cellHeight-(labelHeight+labelGap)/2:start+dy*(end-start)-(labelHeight+labelGap)/2)/height,
      size,z,pitch:rotations[slot][0],yaw:rotations[slot][1],roll:rotations[slot][2],
    }));
    // Relax only actual collisions, preserving the authored constellation.
    // The envelope includes captions, hover and the full idle-motion range.
    const reserve=mobile?(innerHeight<=680?3:5):10;
    const limits=slot=>({
      halfW:Math.max(crystalWidth*slot.size,labelWidth)/2+reserve,
      above:crystalHeight*slot.size/2+reserve,
      below:crystalHeight*slot.size/2+labelHeight+labelGap+reserve,
    });
    const bound=slot=>{
      const r=limits(slot);
      slot.x=clamp(slot.x,(r.halfW+3)/width,1-(r.halfW+3)/width);
      const overlapHeading=slot.x*width+r.halfW>heading.offsetLeft-8&&slot.x*width-r.halfW<heading.offsetLeft+heading.offsetWidth+8;
      const ceiling=mobile||overlapHeading?start:height*.09;
      slot.y=clamp(slot.y,(ceiling+r.above)/height,(end-r.below)/height);
    };
    mapSlots.forEach(bound);
    for(let iteration=0;iteration<22;iteration++){
      let changed=false;
      for(let i=0;i<mapSlots.length;i++)for(let j=i+1;j<mapSlots.length;j++){
        const a=mapSlots[i],b=mapSlots[j],ra=limits(a),rb=limits(b);
        const x=Math.min(a.x*width+ra.halfW,b.x*width+rb.halfW)-Math.max(a.x*width-ra.halfW,b.x*width-rb.halfW);
        const y=Math.min(a.y*height+ra.below,b.y*height+rb.below)-Math.max(a.y*height-ra.above,b.y*height-rb.above);
        if(x<=.1||y<=.1)continue;
        changed=true;
        if(x<y*1.15){const push=(x+.5)/width/2,sign=a.x<b.x?-1:1;a.x+=sign*push;b.x-=sign*push;}
        else {const push=(y+.5)/height/2,sign=a.y<b.y?-1:1;a.y+=sign*push;b.y-=sign*push;}
        bound(a);bound(b);
      }
      if(!changed)break;
    }
    crystalSize = {width:crystalWidth,height:crystalHeight};
    if(viewportChanged){
      scene.resize(width,height);
      atmosphere.resize(width,height);
    }
    if(!staticMode)scene.prewarm?.();
    needsMeasure=false;
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
    sceneActivity();needsMeasure=true;schedule();
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
    const cameraTravel=(scrollY-top)/height;
    root.toggleAttribute('data-pinned',cameraTravel>=0&&cameraTravel<10);
    progress=clamp(cameraTravel,0,10);
    const sample=sampleTimeline(progress),mobile=width<600;
    // The document may settle half a CSS pixel short on fractional stops.
    const openingShot=progress<STOPS[1]-.55/height;
    const opening=openingShot?clamp(progress/STOPS[1]):1;
    const sceneNumber=String(sample.t>.5?sample.to:sample.from);
    if(root.dataset.scene!==sceneNumber)root.dataset.scene=sceneNumber;
    const openingText=opening.toFixed(4);
    if(root.dataset.opening!==openingText)root.dataset.opening=openingText;
    if(progress>STOPS[1]*.88 && progress<STOPS[1]+.63){
      const now=performance.now();
      if(lastMapFrame)mapClock+=Math.min(.2,(now-lastMapFrame)/1000);
      lastMapFrame=now;
      if(!mapTimer)mapTimer=setTimeout(()=>{mapTimer=0;schedule();},48);
    }else if(mapTimer||lastMapFrame)stopFloat();
    root.style.setProperty('--intro-light',weight(0,sample).toFixed(3));
    document.body.dataset.livingScene=root.dataset.scene;
    const progressText=progress.toFixed(4);
    if(root.dataset.progress!==progressText)root.dataset.progress=progressText;
    root.toggleAttribute('data-leaving-foundry',progress>9.45);
    root.style.setProperty('--floor-edge',(1-easeRange(progress,9.45,10)).toFixed(3));
    const blend=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],sample.t)]));
    const core=blend(corePose(sample.from),corePose(sample.to));
    const presence=point&&!coarse.matches?clamp((point.x/width-.5)*2,-1,1):0;
    const vertical=point&&!coarse.matches?clamp((point.y/height-.5)*2,-1,1):0;
    // Optical centre in the photographic source (765,476 in 1536x1024).
    const boreX=(765/1536-.5)*housingWidth,boreY=(476/1024-.5)*housingHeight;
    const approach=easeRange(opening,.07,.76);
    const openingOrigin={x:mix(origin.x+boreX,.495,approach),y:mix(origin.y+boreY,.485,approach)};
    const iris=easeRange(opening,.06,.64),glass=easeRange(opening,.12,.51);
    const heat=Math.sin(Math.PI*easeRange(opening,.03,.87));
    // Retain the near bearing as a physical occluder until its clear opening
    // encloses the entire viewport. Perspective magnification is reciprocal
    // in camera distance. This also works for a tall, narrow phone.
    const cameraAdvance=easeRange(opening,.07,.97);
    let passedBearing=false;
    if(openingShot){
      const corner=Math.hypot(Math.max(openingOrigin.x,1-openingOrigin.x)*width,Math.max(openingOrigin.y,1-openingOrigin.y)*height);
      const clearRadius=housingWidth*width*(388/1536);
      const endScale=(corner+34)/clearRadius;
      core.scale=1/(1-cameraAdvance*(1-1/endScale));
      passedBearing=core.scale*clearRadius>corner+12;
      core.x=openingOrigin.x-core.scale*boreX;
      core.y=openingOrigin.y-core.scale*boreY;
    }
    const openingState=openingShot?opening:0;
    const setOptics=(key,value)=>identity.style.setProperty(key,value.toFixed(4));
    setOptics('--iris-open',openingShot?iris:0);
    setOptics('--glass-lift',openingShot?glass:0);
    setOptics('--sigil-alpha',1-easeRange(openingState,.17,.49));
    setOptics('--sigil-scale',1-.70*easeRange(openingState,.09,.50));
    setOptics('--well-alpha',1-easeRange(openingState,.23,.55));
    setOptics('--wall-light',openingShot?iris*(1-easeRange(opening,.74,.93)):0);
    setOptics('--port-alpha',1-easeRange(openingState,.07,.35));
    setOptics('--heat',openingShot?heat:0);
    const offsetX=(core.x-origin.x)*width+presence*3*(1-approach);
    const offsetY=(core.y-origin.y)*height+vertical*2*(1-approach);
    const roll=openingShot?-3*Math.sin(opening*Math.PI):0;
    identity.style.transform=`translate(-50%,-50%) translate3d(${offsetX}px,${offsetY}px,0) perspective(1400px) rotateY(${presence*1.2+roll}deg) rotateZ(${roll*.48}deg) scale(${core.scale})`;
    const housingLight=openingShot?Number(!passedBearing):sceneExposure(8,sample);
    identity.style.opacity=housingLight.toFixed(4);
    identity.style.visibility=housingLight>.0001?'visible':'hidden';
    const intro=weight(0,sample),map=weight(1,sample),reveal=weight(7,sample),finale=weight(8,sample);
    // Clear the outgoing copy before the next text plane becomes visible.
    for(const part of parts){
      const key=part.dataset.livingPart;
      const amount=openingShot&&key==='intro'?1-easeRange(opening,.06,.32)
        :openingShot&&key==='map'?easeRange(opening,.78,.96):clamp(({intro,map,reveal,finale}[key]-.52)/.48);
      visibility(part,amount);
    }
    chapters.forEach((chapter,index)=>visibility(chapter,clamp((weight(index+2,sample)-.6)/.4)));
    // Decode the current and next shot before it unfolds; hidden lazy images otherwise
    // may not be requested by the browser until the sticky scene is already visible.
    nodes.slice(0,5).forEach((node,index)=>{
      if(sample.from===0||index+2>sample.to+1||warmed.has(index))return;
      warmed.add(index);
      const images=[...node.querySelectorAll('img')];if(index===3)images.push(root.querySelector('.living-backdrop'));
      images.forEach(img=>{img.loading='eager';img.decode().then(schedule,()=>{});});
    });
    const forest=sceneExposure(5,sample);
    root.dataset.forestVisible=String(forest>.001);
    root.style.setProperty('--forest',forest.toFixed(4));
    const backdrop=root.querySelector('.living-backdrop');
    backdrop.style.opacity=forest.toFixed(4);
    backdrop.style.transform=`translate3d(${presence*-6}px,${vertical*-3}px,0) scale(${1.08+(1-forest)*.24})`;
    const camera=chamberPose(sample);
    if(openingShot){
      const [entry,room]=TRACK;
      camera.zoom=mix(entry[2],room[2],cameraAdvance);
      camera.x=mix(entry[0],room[0],approach);
      camera.y=mix(entry[1],room[1],cameraAdvance);
    }
    architecture.style.transform=`translate(-50%,-50%) translate3d(${camera.x*width+presence*4}px,${camera.y*height}px,0) scale(${camera.zoom})`;
    foreground.style.transform=`translate(-50%,-50%) translate3d(${camera.x*width*1.8+presence*13}px,${camera.y*height*1.6+vertical*6}px,0) scale(${1+(camera.zoom-1)*1.6})`;
    const plateW = Math.max(width, height*1.5), plateH=plateW/1.5;
    atmosphere.compose({
      ventX:.5+camera.x+.312*plateW*camera.zoom/width,
      floor:.5+camera.y+.065*plateH*camera.zoom/height,
      coreX:openingShot?openingOrigin.x:core.x, coreY:openingShot?openingOrigin.y:core.y,
      machineX:core.x,machineY:core.y,housingWidth:housingWidth*core.scale,housingHeight:housingHeight*core.scale,
      travel:progress/10,hero:openingShot?1-easeRange(opening,.60,.88):0,heat:openingShot?heat:0,
    });
    const handover=sample.from>=2&&sample.to<=6?Math.sin(sample.t*Math.PI):0;
    const mapLight=sceneExposure(1,sample), revealLight=sceneExposure(7,sample);
    root.style.setProperty('--scene-progress',progress/10);
    const selectedGroup=map>.5?group:0;
    const poses=nodes.map((node,index)=>{
      if(Math.floor(index/6)!==selectedGroup)return {index,opacity:0};
      const slot=index%6;
      const pose=blend(layoutPose(sample.from,slot,mobile),layoutPose(sample.to,slot,mobile));
      if(index<5){
        const o=objectSizes[index];
        for(const [key,factor] of [['x',o.x],['y',o.y]]){
          const a=slot===sample.from-2?factor:layoutPose(sample.from,slot,mobile)[key];
          const b=slot===sample.to-2?factor:layoutPose(sample.to,slot,mobile)[key];pose[key]=mix(a,b,sample.t);
        }
        if(sample.from>=2&&sample.to<=6&&(slot===sample.from-2||slot===sample.to-2)){
          const incoming=slot===sample.to-2,t=sample.t;
          pose.x=o.x+(incoming?.24*(1-t):-.12*t);pose.y=o.y+(incoming?-.10*(1-t):.08*t);
          pose.scale=(mobile?2.8:3)*(incoming?.86+.14*t:1-.12*t);
          pose.spread=1;
        }
      }
      if(mobile && innerHeight<=680){
        pose.x=mix(pose.x,slot%2?.73:.27,reveal);
        pose.y=mix(pose.y,.48+Math.floor(slot/2)*.16,reveal);
        pose.scale=mix(pose.scale,.7,reveal);
      }
      if(!mobile&&width<1000)pose.scale=mix(pose.scale,.55,reveal);
      const productLight=index<chapters.length ? sceneExposure(index+2,sample) : 0;
      pose.media=productLight>0 ? 1 : 0;
      pose.opacity=Math.max(mapLight,revealLight,productLight);
      const target=mapSlots[slot];
      let release=1,emergence=1;
      if(openingShot){
        const born=.30+slot*.012;
        pose.opacity=crystalEase((opening-born)/.065);
        emergence=crystalEase((opening-.30)/.64);
        const nearDepth=clamp((target.z+185)/390);
        const crossing=mix(.552,.462,nearDepth);
        release=easeRange(opening,crossing,.95);
        const bend=(slot%2?1:-1)*(mobile?.035:.055);
        const seedGrowth=crystalEase((opening-.30)/.23);
        const boreDiameter=housingWidth*width*core.scale*.3625;
        const seedAngle=Math.atan2((target.y-openingOrigin.y)*height,(target.x-openingOrigin.x)*width)+(1-release)*.26;
        const seedRadius=boreDiameter*(.09+.045*nearDepth)*crystalEase((opening-.30)/.12);
        const seed={x:openingOrigin.x+Math.cos(seedAngle)*seedRadius/width,y:openingOrigin.y+Math.sin(seedAngle)*seedRadius/height};
        const path=crystalArc(seed,
          {x:openingOrigin.x+(target.x-openingOrigin.x)*.07+bend*.35,y:openingOrigin.y-.045},
          {x:target.x+bend,y:target.y-(mobile?.025:.055)},target,release);
        pose.x=path.x;pose.y=path.y;pose.size=target.size;
        const inAperture=Math.min(mix(.055,.18,seedGrowth),boreDiameter*.10/(crystalSize.width*target.size));
        // Far faces cover less of the field of view until they approach the lip.
        const projectedTravel=release/(1+(.66-.22*nearDepth)*(1-release));
        pose.scale=mix(inAperture,1,projectedTravel);
        pose.z=mix(-285+slot*18,target.z,release);
        pose.pitch=target.pitch-(1-release)*.30;
        pose.yaw=target.yaw+(1-release)*(slot%2?.66:-.66);
        pose.roll=target.roll+(1-release)*(slot-2.5)*.09;
      }
      // This shared pose moves the native link and its actual WebGL solid.
      // mapClock belongs to the controller and freezes offscreen or on pause.
      const drift=openingShot?release:mapLight;
      const tight=mobile&&innerHeight<=680;
      const amplitude=tight?1.25:mobile?2.7:4.4,phase=index*.91;
      pose.x+=(Math.sin(mapClock*.57)*amplitude*.64+Math.sin(mapClock*.71+phase)*amplitude*.36)*drift/width;
      pose.y+=Math.sin(mapClock*(.62+(slot%3)*.065)+phase)*amplitude*drift/height;
      pose.z+=Math.sin(mapClock*.43+phase)*6*drift;
      pose.pitch+=Math.sin(mapClock*.37+phase)*.022*drift;
      pose.yaw+=Math.sin(mapClock*.31+phase)*.028*drift;
      return {...pose,index,release,emergence};
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
      if(pose.opacity===0){
        if (node.getAttribute('aria-hidden') !== 'true') {
          visibility(node,0);
          node.dataset.mediaVisible='false';
          node.style.setProperty('--media','0');
        }
        return;
      }
      const size=[crystalSize.width*(pose.size||1),crystalSize.height*(pose.size||1)];
      const proximity=pose.index===near&&map>.6?1:0;
      node.style.width=`${size[0]}px`;node.style.height=`${size[1]}px`;
      node.style.transform=`translate3d(${pose.x*width-size[0]/2}px,${pose.y*height-size[1]/2-proximity*3}px,0) scale(${pose.scale+proximity*.025})`;
      node.style.zIndex=String(Math.round(1000+(pose.z||0)));
      node.dataset.depth=(pose.z||0).toFixed(2);
      node.dataset.crystalX=pose.x.toFixed(5);node.dataset.crystalY=pose.y.toFixed(5);
      node.dataset.mediaVisible=String(pose.media>.001);
      const caption=openingShot?crystalEase((opening-.82)/.14):1;
      node.style.setProperty('--label',(mix(1-pose.media,1,reveal)*caption).toFixed(4));node.style.setProperty('--media',pose.media.toFixed(4));node.style.setProperty('--spread',pose.spread.toFixed(4));
      node.style.setProperty('--label-offset',`${size[1]/2}px`);
      node.style.setProperty('--turn',`${handover*(pose.index===sample.from-2?-32:32)}deg`);
      node.dataset.near=String(Boolean(proximity));
      visibility(node,pose.opacity);
      // Only map links, the current product and the revealed layers can receive focus.
      node.inert=pose.opacity<.72||(openingShot&&opening<.94)||(handover>.05&&pose.index<5&&weight(pose.index+2,sample)<.85);
    });
    const stateLabel=root.querySelector('[data-living-state]'),title=['Rdzeń','Mapa projektów',...titles,'Warstwy','Kontakt'][Number(root.dataset.scene)];
    if(stateLabel.textContent!==title)stateLabel.textContent=title;
    const mapNodes = poses.slice(selectedGroup*6,selectedGroup*6+6).map(pose=>{
      const hover=pose.index===near&&map>.6?.025:0;
      return {...pose,width:crystalSize.width*(pose.size||1)*(pose.scale+hover),height:crystalSize.height*(pose.size||1)*(pose.scale+hover)};
    });
    scene.draw({nodes:mapNodes,crystalVisibility:openingShot?1:Math.max(mapLight,revealLight),openingSettled:!openingShot&&Math.abs(progress-STOPS[1])<.075,chamber:camera,viewport:{width,height},progress,near});
    if(pendingFocus&&Math.abs(progress-focusStop)<.035&&!pendingFocus.closest('[inert]')){pendingFocus.focus({preventScroll:true});pendingFocus=null;}
  }
  function navigate(hash,{focus=false,animate=false}={}){
    stopFlight();
    const marker=markers.find(m=>`#${m.id}`===hash);
    if(!marker)return false;
    const index=chapters.findIndex(ch=>hash===`#scena-${ch.dataset.livingProject}`);
    const target=index>=0?chapters[index]:hash==='#projekty'?root.querySelector('.living-map-heading'):hash==='#warstwy'?root.querySelector('.living-reveal'):root.querySelector('.living-finale');
    if(staticMode){target.scrollIntoView({behavior:'instant',block:'start'});if(focus){target.tabIndex=-1;target.focus({preventScroll:true});}return true;}
    if(needsMeasure)measure();
    if(focus){focusStop=Number(marker.dataset.stop);pendingFocus=index>=0?target.querySelector('h2'):hash==='#projekty'?nodes[group*6]:target;pendingFocus.tabIndex=hash==='#projekty'?0:-1;}
    const stop=Number(marker.dataset.stop);
    const adjacent=Math.abs(stop-progress)<1.56;
    scrollTo({top:top+stop*height,behavior:animate&&adjacent?'smooth':'instant'});
    if (animate&&!adjacent) {
      // A shortcut goes straight to the selected exhibit. Scrolling by hand still
      // moves the camera through every room on the timeline.
      cancelAnimationFrame(frame);
      render();
      const surface=index>=0 ? nodes[index].querySelector('.living-media') : root.querySelector('.living-map-heading');
      surface?.animate([{opacity:.22},{opacity:1}],{duration:220,easing:'ease-out'});
    }
    schedule();return true;
  }
  async function activateCore(event){
    if(flightFrame||preparingFlight)return;
    if(location.hash!=='#projekty')history.pushState(null,'','#projekty');
    const keyboard=event.detail?.keyboard??root.querySelector('[data-core-activate]').matches(':focus-visible');
    if(staticMode){navigate('#projekty',{focus:keyboard});coreStatus.textContent='Mapa otwarta. Wybierz projekt.';return;}
    if(needsMeasure)measure();
    coreStatus.textContent='Otwieranie rdzenia.';coreLabel.textContent='Otwieranie…';
    const ticket=++flightTicket;
    preparingFlight=true;root.setAttribute('data-preparing','');
    let deadline;
    try{
      const ready=await Promise.race([scene.prepareOpening?.(),new Promise(resolve=>{deadline=setTimeout(()=>resolve({status:'timeout'}),2200);})]);
      if(ticket===flightTicket&&ready&&ready.status!=='ready')scene.useNativeOpening?.();
    }catch{ /* The HTML crystals already share the same camera path. */ }finally{clearTimeout(deadline);}
    if(ticket!==flightTicket||staticMode||!visible||!pageActive||document.hidden)return;
    preparingFlight=false;root.removeAttribute('data-preparing');
    const start=scrollY;
    let elapsed=0,lastPaint=performance.now();
    if(keyboard){focusStop=STOPS[1];pendingFocus=nodes[group*6];}
    function travel(now){
      // Retain each optical phase even if a slow GPU takes a long frame.
      elapsed+=Math.min(55,Math.max(0,now-lastPaint));lastPaint=now;
      const time=clamp(elapsed/3200);
      scrollTo({top:mix(start,top+height*STOPS[1],time*time*(3-2*time)),behavior:'instant'});
      schedule();
      flightFrame=time<1?requestAnimationFrame(travel):0;
      if(!flightFrame){scene.finishOpening?.();coreStatus.textContent='Mapa otwarta. Wybierz projekt.';coreLabel.textContent='Pokaż projekty';}
    }
    flightFrame=requestAnimationFrame(travel);
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
    // Keyboard and assistive activation restore map focus. A pointer return
    // should not highlight or summon the guide for a different crystal.
    const focus=!link.hasAttribute('data-return-map')||event.detail===0;
    if(hash?.startsWith('#')&&navigate(hash,{focus,animate:true})){event.preventDefault();if(location.hash!==hash)history.pushState(null,'',hash);}
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
  on(window,'wheel',()=>{pendingFocus=null;stopFlight();},{passive:true});
  on(window,'touchstart',()=>{pendingFocus=null;stopFlight();},{passive:true});
  on(window,'keydown',event=>{if(event.key==='Tab'||((flightFrame||preparingFlight)&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Escape',' '].includes(event.key))){pendingFocus=null;stopFlight();}});
  on(root,'focusin',schedule);on(root,'focusout',schedule);
  on(root,'progresskit:robot-layout',()=>{needsMeasure=true;schedule();});
  on(window,'scroll',()=>{point=null;schedule();},{passive:true});
  on(window,'resize',()=>{if((innerHeight<450)!==staticMode&&!reduced.matches&&document.body.dataset.motion!=='paused')setMode();needsMeasure=true;schedule();},{passive:true});
  on(window,'hashchange',()=>navigate(location.hash));on(window,'popstate',()=>navigate(location.hash));
  on(document,'progresskit:motion',setMode);on(reduced,'change',setMode);on(document,'progresskit:core',activateCore);
  on(document,'visibilitychange',()=>{sceneActivity();if(document.hidden){cancelAnimationFrame(frame);frame=0;canvas.dataset.motion='hidden';point=null;}else schedule();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sceneActivity();root.toggleAttribute('data-offscreen',!visible);if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;canvas.dataset.motion='offscreen';}});
  observer.observe(root);
  const resizer=new ResizeObserver(()=>{needsMeasure=true;schedule();});resizer.observe(stage);
  on(window,'pagehide',event=>{pageActive=false;sceneActivity();cancelAnimationFrame(frame);frame=0;canvas.dataset.motion='hidden';if(!event.persisted){scope.abort();observer.disconnect();resizer.disconnect();}});
  on(window,'pageshow',event=>{pageActive=true;sceneActivity();needsMeasure=true;if(!event.persisted)navigate(location.hash);schedule();});
  setMode();
  navigate(location.hash);
  render();
}
