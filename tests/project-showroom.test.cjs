const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const showroom=require('../assets/project-showroom.js');
const records=Array.from({length:14},(_,i)=>({id:`project-${i}`,name:`Synthetic project ${i}`,category:i<3?'mobile':i===3?'games':'saas'}));

// A deliberately small synthetic DOM exercises the actual shipped handlers.
// It proves state transitions and event contracts, not browser layout or touch hardware.
function mount(projects=records,{slices=false,narrow=false}={}){
  let focused=null,url=new URL('http://preview.local/?q=keep&utm_source=review#projekty'),clock=1000,sequence=0;
  const timers=new Map(),frames=new Map(),documentEvents={},windowEvents={},opened=[],openedPoses=[],intersections=[];
  function element(){return{events:{},dataset:{},properties:new Map(),classes:new Set(),hidden:false,inert:false,
    addEventListener(key,fn){(this.events[key]??=[]).push(fn)},setAttribute(key,value){this[key]=value},focus(){focused=this},closest(){return null},
    get classList(){const node=this;return{toggle(key,on){on?node.classes.add(key):node.classes.delete(key)},add(key){node.classes.add(key)},remove(key){node.classes.delete(key)}}},
    get style(){const node=this;return{setProperty(key,value){node.properties.set(key,value)},removeProperty(key){node.properties.delete(key)},set zIndex(value){node.zIndex=value},get display(){return node.properties.get('display')||''},set display(value){node.properties.set('display',value)}}}};}
  const cards=projects.map(project=>{
    const card=element(),link=element(),panel=element(),body=element(),close=element();
    card.dataset={projectId:project.id,category:project.category};link.dataset.showroomOpen=project.id;
    link.closest=query=>query==='[data-showroom-open]'?link:query.includes('aria-hidden')&&(card.inert||card['aria-hidden']==='true')?card:null;
    link.focus=()=>{if(!card.inert)focused=link};
    panel.hidden=true;panel.querySelector=query=>query==='.project-slice__body'?body:close;
    panel.closest=query=>query==='[data-slice-panel]'?panel:null;
    body.closest=panel.closest;close.closest=query=>query==='[data-slice-close]'?close:query==='[data-slice-panel]'?panel:null;
    card.querySelector=query=>slices&&query==='[data-slice-panel]'?panel:link;
    card.contains=node=>[card,link,panel,body,close].includes(node);
    card.rectangle={left:400,top:180,width:220,height:170,right:620,bottom:350};
    card.getBoundingClientRect=()=>card.rectangle;card.scrollIntoView=options=>{card.scrolled=options};
    Object.assign(card,{link,panel,body,close});return card;
  });
  const gates=['',...new Set(projects.map(project=>project.category))].map(category=>Object.assign(element(),{dataset:{showroomCategory:category}}));
  const orbitNodes=Array.from({length:5},(_,index)=>{
    const node=element(),link=element(),spark=element(),circles=[element(),element()];node.dataset.orbitNode=String(index-2);
    node.querySelector=query=>query==='.showroom-orbit__spark'?spark:link;node.querySelectorAll=()=>[...circles,spark];node.link=link;node.circles=circles;node.spark=spark;return node;
  });
  const buttons=[-1,1].map(step=>Object.assign(element(),{dataset:{showroomStep:String(step)}}));
  const root=element(),viewport=element(),status=element(),position=element(),energyToggle=element();
  root.hasAttribute=name=>slices&&name==='data-showroom-slices';
  viewport.rectangle={left:0,top:80,width:1000,height:560,right:1000,bottom:640};
  viewport.getBoundingClientRect=()=>viewport.rectangle;viewport.matches=()=>false;
  viewport.clientWidth=1000;let captured=null;
  viewport.setPointerCapture=id=>{captured=id};viewport.hasPointerCapture=id=>captured===id;viewport.releasePointerCapture=()=>{captured=null};
  root.querySelector=query=>({'[data-showroom-viewport]':viewport,'#showroom-status':status,'[data-showroom-position]':position,'[data-showroom-motion-toggle]':energyToggle}[query]||null);
  root.querySelectorAll=query=>({'.showroom-card':cards,'[data-showroom-category]':gates,'[data-showroom-step]':buttons,'[data-showroom-enhancement]':[],'[data-orbit-node]':orbitNodes}[query]||[]);
  root.contains=node=>node===viewport||cards.some(card=>card.contains(node))||gates.includes(node)||buttons.includes(node);
  const reduced={matches:false,events:{},addEventListener(key,fn){(this.events[key]??=[]).push(fn)}};
  const narrowMedia={matches:narrow,events:{},addEventListener(key,fn){(this.events[key]??=[]).push(fn)}};
  const document={readyState:'complete',hidden:false,get activeElement(){return focused},querySelector(query){return query==='[data-showroom]'?root:query==='#showroom-data'?{textContent:JSON.stringify(projects)}:query==='.topbar'?{getBoundingClientRect:()=>({bottom:64})}:null},
    addEventListener(key,fn){(documentEvents[key]??=[]).push(fn)},dispatchEvent(event){(documentEvents[event.type]||[]).forEach(fn=>fn(event));return true}};
  const location={get href(){return url.href},get search(){return url.search},get origin(){return url.origin}};
  const notify=(type,detail)=>document.dispatchEvent({type,detail});
  document.addEventListener('progresskit:open-project',event=>{opened.push(event.detail.id);openedPoses.push(cards.find(card=>card.dataset.projectId===event.detail.id).properties.get('--showroom-y'));notify('progresskit:hologram-open',{id:event.detail.id});});
  document.addEventListener('progresskit:close-project',event=>notify('progresskit:hologram-close',{id:event.detail.id}));
  const window={innerHeight:900,innerWidth:1440,matchMedia(query){return query.includes('reduced-motion')?reduced:query.includes('max-width')?narrowMedia:{matches:true,addEventListener(){}}},addEventListener(key,fn){(windowEvents[key]??=[]).push(fn)}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/project-showroom.js'),'utf8'),{
    document,location,history:{replaceState(a,b,value){url=new URL(value)}},window,
    performance:{now:()=>clock},URL,console,CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},
    setTimeout(fn,ms){timers.set(++sequence,{fn,time:clock+ms});return sequence},clearTimeout(id){timers.delete(id)},
    requestAnimationFrame(fn){frames.set(++sequence,fn);return sequence},cancelAnimationFrame(id){frames.delete(id)},
    IntersectionObserver:class{constructor(callback){intersections.push(callback)}observe(){}},
  });
  function fire(node,type,extra={}){const event={type,target:node,prevented:false,preventDefault(){this.prevented=true},...extra};(node.events[type]||[]).forEach(fn=>fn(event));return event;}
  function tick(ms=0){clock+=ms;for(const[id,value]of[...timers])if(value.time<=clock){timers.delete(id);value.fn();}for(const[id,fn]of[...frames]){frames.delete(id);fn();}}
  return{root,viewport,status,position,cards,gates,buttons,orbitNodes,energyToggle,document,window,reduced,opened,openedPoses,frames,timers,fire,tick,notify,
    gate:category=>gates.find(gate=>gate.dataset.showroomCategory===category),active:()=>cards.find(card=>card.classes.has('is-active')),
    intersect(visible){intersections.forEach(fn=>fn([{isIntersecting:visible}]))},windowNotify(type){(windowEvents[type]||[]).forEach(fn=>fn())},
    get url(){return url},pop(value){url=new URL(value);(windowEvents.popstate||[]).forEach(fn=>fn());},
    setNarrow(value){narrowMedia.matches=value;(narrowMedia.events.change||[]).forEach(fn=>fn({matches:value}));}};
}

test('Circular indexes wrap in both directions for 14, 4, 3, 2 and 1 project',()=>{
  for(const n of [14,4,3,2,1]) { assert.equal(showroom.wrap(n,n),0);assert.equal(showroom.wrap(-1,n),n-1);assert.equal(showroom.wrap(n*3+1,n),1%n); }
  assert.equal(showroom.wrap(10,0),0);
});
test('Every circular project has a unique signed offset and the selected one is centered',()=>{
  for(const n of [14,4,3,2,1]) for(let active=0;active<n;active++){
    const offsets=Array.from({length:n},(_,i)=>showroom.offset(i,active,n));
    assert.equal(new Set(offsets).size,n);assert.equal(offsets[active],0);
  }
});
test('Orbital positions remain distinct on the perspective projection for every real filter size',()=>{
  for(const n of [1,2,3,4,14]) for(let active=0;active<n;active++){
    const points=Array.from({length:n},(_,index)=>showroom.orbit(showroom.offset(index,active,n),n));
    const visible=points.filter(point=>point.visible);
    assert.equal(visible.length,Math.min(n,5));
    const keys=new Set();
    for(const point of visible){
      for(const key of ['x','y','scale','angle'])assert.ok(Number.isFinite(point[key]),`${n}: ${key}`);
      assert.ok(point.scale>=.76/1.24&&point.scale<=1);assert.ok(Math.abs(point.angle)<=16);
      assert.ok(Math.abs(point.x)<=1.031&&Math.abs(point.y)<=1.316);
      assert.ok(point.light>=.8&&point.light<=1);
      if(n>1){const camera=1+.24*point.y;assert.ok(Math.abs((point.x/camera)**2+(point.y/camera)**2-1)<1e-9);}
      keys.add(`${point.x.toFixed(6)},${point.y.toFixed(6)}`);
    }
    assert.equal(keys.size,visible.length);
    assert.ok(Math.abs(points[active].x)<1e-9);
    assert.equal(points[active].y,n===1?0:1/.76);assert.equal(points[active].scale,1);
    assert.ok(visible.every(point=>point.y<=points[active].y));
    assert.deepEqual(points,Array.from({length:n},(_,index)=>showroom.orbit(showroom.offset(index,active+n,n),n)));
  }
});
test('Actual catalog filters wire only occupied nodes and preserve hologram open, close and rotation',()=>{
  const actual=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalog/projects.json'),'utf8')).projects;
  for(const category of ['',...new Set(actual.map(project=>project.category))]){
    const ui=mount(actual);
    ui.fire(ui.gate(category),'click');
    const count=actual.filter(project=>!category||project.category===category).length;
    assert.equal(ui.position.textContent,`1 / ${count}`);
    const visible=ui.cards.filter(card=>!card.classes.has('is-orbit-hidden'));
    assert.equal(visible.length,Math.min(5,count));
    const wires=ui.orbitNodes.filter(node=>node.style.display!=='none');
    assert.equal(wires.length,count===1?0:Math.min(5,count));
    for(const card of visible){
      const node=wires.find(node=>node.dataset.projectId===card.dataset.projectId);
      if(count===1){assert.equal(card.properties.get('--showroom-y'),'0.000000');continue;}
      assert.ok(node);
      const x=Number(card.properties.get('--showroom-x')),y=Number(card.properties.get('--showroom-y'));
      assert.ok(Math.abs(Number(node.link.x2)-(500+x*500))<.001);
      assert.ok(Math.abs(Number(node.link.y2)-(250+y*250))<.001);
      assert.ok(node.circles.every(circle=>circle.cx===node.link.x2&&circle.cy===node.link.y2));
      assert.equal(node.spark.cx,'500');assert.equal(node.spark.cy,'250');
      assert.ok(Math.abs(parseFloat(node.spark.properties.get('--spark-x'))-(Number(node.link.x2)-500))<.001);
      assert.ok(Math.abs(parseFloat(node.spark.properties.get('--spark-y'))-(Number(node.link.y2)-250))<.001);
    }
    ui.fire(ui.buttons[1],'click');
    assert.equal(ui.position.textContent,`${count===1?1:2} / ${count}`);
    const id=ui.active().dataset.projectId;
    ui.fire(ui.root,'click',{target:ui.active().link});
    if(count>1){assert.equal(ui.opened.length,0);ui.tick(650);}
    assert.equal(ui.opened.at(-1),id);
    assert.ok(ui.root.classes.has('is-hologram-open'));
    ui.notify('progresskit:hologram-close',{id});assert.equal(ui.root.classes.has('is-hologram-open'),false);
    assert.equal(ui.url.searchParams.get('kategoria'),category||null);
    assert.equal(ui.url.searchParams.has('projekt'),false);
  }
});
test('Energy pause survives category changes and reduced motion cannot be overridden',()=>{
  const ui=mount();
  ui.fire(ui.energyToggle,'click');assert.ok(ui.root.classes.has('is-energy-paused'));
  assert.equal(ui.energyToggle['aria-pressed'],'true');assert.equal(ui.energyToggle.textContent,'Wznów efekty orbity');
  ui.fire(ui.gate('mobile'),'click');assert.ok(ui.root.classes.has('is-energy-paused'));
  ui.fire(ui.energyToggle,'click');assert.equal(ui.root.classes.has('is-energy-paused'),false);
  ui.reduced.matches=true;ui.reduced.events.change.forEach(fn=>fn({matches:true}));
  assert.equal(ui.energyToggle.disabled,true);assert.equal(ui.energyToggle['aria-pressed'],'true');
  ui.reduced.matches=false;ui.reduced.events.change.forEach(fn=>fn({matches:false}));
  assert.equal(ui.energyToggle.disabled,false);assert.equal(ui.energyToggle['aria-pressed'],'false');
});
test('Fractional phases preserve a unique five-node window across both wrap directions',()=>{
  for(const count of [1,2,3,4,14])for(const active of [0,count-1])for(const fraction of [0,.25,.5,.75,1,-.25,-.5,-.75,-1]){
    const phase=active+fraction;
    const visible=Array.from({length:count},(_,index)=>showroom.orbit(showroom.relative(index,phase,count),count)).filter(point=>point.visible);
    assert.ok(visible.length<=Math.min(5,count));
    assert.ok(visible.length>=Math.min(4,count));
    const positions=visible.map(point=>`${point.x.toFixed(6)},${point.y.toFixed(6)}`);
    assert.equal(new Set(positions).size,positions.length,`${count}/${phase}: duplicate back-node`);
    for(const point of visible)for(const key of ['x','y','scale','opacity'])assert.ok(Number.isFinite(point[key]));
  }
});
test('Actual animation frames follow a curved trajectory and wire the same live positions',()=>{
  const ui=mount();
  const prior=ui.cards[0],target=ui.cards[1];
  ui.fire(ui.buttons[1],'click');assert.equal(ui.frames.size,1);
  ui.tick(310);
  const point=showroom.orbit(.5,14);
  assert.ok(Math.abs(Number(target.properties.get('--showroom-x'))-point.x)<1e-6);
  assert.ok(Math.abs(Number(target.properties.get('--showroom-y'))-point.y)<1e-6);
  const front=showroom.orbit(0,14),side=showroom.orbit(1,14);
  assert.ok(Math.abs(point.y-(front.y+side.y)/2)>.05,'must not interpolate straight screen coordinates');
  for(const card of ui.cards.filter(card=>!card.classes.has('is-orbit-hidden'))){
    const node=ui.orbitNodes.find(node=>node.style.display!=='none'&&node.dataset.projectId===card.dataset.projectId);
    assert.ok(node);
    assert.ok(Math.abs(Number(node.link.x2)-(500+Number(card.properties.get('--showroom-x'))*500))<.001);
    assert.ok(Math.abs(Number(node.link.y2)-(250+Number(card.properties.get('--showroom-y'))*250))<.001);
  }
  assert.ok(Number(target.properties.get('--showroom-scale'))>Number(ui.cards[3].properties.get('--showroom-scale')));
  ui.tick(310);assert.equal(ui.frames.size,0);assert.equal(target.properties.get('--showroom-y'),(1/.76).toFixed(6));
  assert.ok(Number(target.zIndex)>8);assert.ok(Number(prior.zIndex)>8);
  const back=mount(records.slice(0,2));assert.ok(Number(back.cards[0].zIndex)>8);assert.ok(Number(back.cards[1].zIndex)<8);
});
test('Interrupted rotation continues from its current phase without a snap or duplicated seam',()=>{
  const ui=mount();ui.fire(ui.buttons[1],'click');ui.tick(310);
  const previous=ui.cards[0].properties.get('--showroom-x');
  ui.fire(ui.buttons[1],'click');assert.equal(ui.cards[0].properties.get('--showroom-x'),previous);assert.equal(ui.frames.size,1);
  ui.tick(310);assert.ok(Math.abs(Number(ui.cards[2].properties.get('--showroom-offset'))-.75)<1e-6);
  ui.tick(310);assert.equal(ui.frames.size,0);
  for(const step of [-1,-1,-1,1]){
    ui.fire(step<0?ui.buttons[0]:ui.buttons[1],'click');
    for(let frame=0;frame<4;frame++){
      ui.tick(155);
      const visible=ui.cards.filter(card=>Number(card.properties.get('--showroom-opacity'))>0);
      const points=visible.map(card=>card.properties.get('--showroom-x')+','+card.properties.get('--showroom-y'));
      assert.equal(new Set(points).size,points.length);assert.ok(points.length<=5);
    }
    assert.equal(ui.frames.size,0);
  }
});
test('Filter, visibility and reduced-motion changes cancel geometry frames at a consistent final pose',()=>{
  const ui=mount();ui.fire(ui.buttons[1],'click');ui.tick(155);assert.equal(ui.frames.size,1);
  ui.fire(ui.gate('games'),'click');assert.equal(ui.frames.size,0);
  const pose=ui.active().properties.get('--showroom-y');ui.tick(1000);assert.equal(ui.active().properties.get('--showroom-y'),pose);
  ui.fire(ui.gate(''),'click');ui.fire(ui.buttons[1],'click');ui.tick(155);
  ui.document.hidden=true;ui.notify('visibilitychange',{});assert.equal(ui.frames.size,0);
  assert.equal(ui.active().properties.get('--showroom-y'),(1/.76).toFixed(6));
  ui.document.hidden=false;ui.notify('visibilitychange',{});assert.equal(ui.frames.size,0);
  ui.fire(ui.buttons[1],'click');assert.equal(ui.frames.size,1);
  ui.reduced.matches=true;ui.reduced.events.change.forEach(fn=>fn({matches:true}));
  assert.equal(ui.frames.size,0);assert.equal(ui.active().properties.get('--showroom-y'),(1/.76).toFixed(6));
  ui.reduced.matches=false;ui.reduced.events.change.forEach(fn=>fn({matches:false}));
  ui.fire(ui.buttons[1],'click');assert.equal(ui.frames.size,1);
  ui.intersect(false);assert.equal(ui.frames.size,0);assert.equal(ui.root.classes.has('showroom-in-view'),false);
  ui.fire(ui.buttons[1],'click');assert.equal(ui.frames.size,0);assert.equal(ui.root.classes.has('is-orbit-moving'),false);
  ui.intersect(true);ui.fire(ui.buttons[1],'click');assert.equal(ui.frames.size,1);
  ui.windowNotify('pagehide');assert.equal(ui.frames.size,0);assert.ok(ui.root.classes.has('is-page-hidden'));
  ui.windowNotify('pageshow');assert.equal(ui.root.classes.has('is-page-hidden'),false);assert.equal(ui.frames.size,0);
});
test('Leaving the viewport cancels a pending neighbor projection and releases its motion work',()=>{
  const ui=mount();ui.fire(ui.root,'click',{target:ui.cards[1].link});
  assert.equal(ui.frames.size,1);ui.intersect(false);
  assert.equal(ui.frames.size,0);assert.equal(ui.timers.size,0);
  ui.tick(1000);assert.equal(ui.opened.length,0);
  ui.intersect(true);ui.tick(1000);assert.equal(ui.opened.length,0);
});
test('A delayed projection commits the final module pose before emitting even with dropped frames',()=>{
  const ui=mount();ui.fire(ui.root,'click',{target:ui.cards[1].link});
  assert.notEqual(ui.cards[1].properties.get('--showroom-y'),(1/.76).toFixed(6));
  ui.tick(650);
  assert.deepEqual(ui.opened,['project-1']);
  assert.deepEqual(ui.openedPoses,[(1/.76).toFixed(6)]);
  assert.equal(ui.frames.size,0);
});
test('Horizontal drag shares the projected phase with cables and a canceled gesture returns on the arc',()=>{
  const ui=mount();
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:45,clientX:200,clientY:20});
  ui.fire(ui.viewport,'pointermove',{pointerId:45,clientX:60,clientY:20});ui.tick();
  const phase=.5;
  assert.ok(Math.abs(Number(ui.cards[0].properties.get('--showroom-x'))-showroom.orbit(-phase,14).x)<1e-6);
  for(const node of ui.orbitNodes.filter(node=>node.style.display!=='none')){
    const card=ui.cards.find(card=>card.dataset.projectId===node.dataset.projectId);
    assert.ok(Math.abs(Number(node.link.x2)-(500+Number(card.properties.get('--showroom-x'))*500))<.001);
    assert.ok(Math.abs(Number(node.link.y2)-(250+Number(card.properties.get('--showroom-y'))*250))<.001);
  }
  ui.document.dispatchEvent({type:'pointercancel',pointerId:45});
  assert.equal(ui.position.textContent,'1 / 14');assert.equal(ui.frames.size,1);
  ui.tick(310);assert.ok(Math.abs(Number(ui.cards[0].properties.get('--showroom-x'))-showroom.orbit(-.25,14).x)<1e-6);
  ui.tick(310);assert.equal(ui.frames.size,0);assert.equal(ui.cards[0].properties.get('--showroom-x'),'0.000000');
});
test('Rapid keyboard steps keep focus on a visible, interactive selected module',()=>{
  const ui=mount();ui.cards[0].link.focus();
  for(let step=0;step<3;step++){
    ui.fire(ui.viewport,'keydown',{key:'ArrowRight'});
    assert.equal(ui.document.activeElement,ui.active().link);
    assert.equal(ui.active().inert,false);assert.equal(ui.active()['aria-hidden'],'false');
    assert.ok(Number(ui.active().properties.get('--showroom-opacity'))>0);
    assert.equal(ui.cards.filter(card=>card.link.tabIndex===0).length,1);
  }
  assert.equal(ui.active().dataset.projectId,'project-3');
  assert.equal(ui.frames.size,0);
});
test('Moving state spans the settle interval and repeated steps do not restore wires early',()=>{
  const ui=mount();
  assert.equal(ui.root.classes.has('is-orbit-moving'),false);
  ui.fire(ui.buttons[1],'click');assert.ok(ui.root.classes.has('is-orbit-moving'));
  ui.tick(400);ui.fire(ui.buttons[1],'click');ui.tick(250);
  assert.ok(ui.root.classes.has('is-orbit-moving'));
  ui.tick(400);assert.equal(ui.root.classes.has('is-orbit-moving'),false);
  ui.fire(ui.root,'click',{target:ui.cards[1].link});
  assert.ok(ui.root.classes.has('is-projecting'));
  ui.fire(ui.gate('games'),'click');assert.equal(ui.root.classes.has('is-projecting'),false);
  ui.tick(1000);assert.equal(ui.opened.length,0);
  ui.fire(ui.gate('mobile'),'click');ui.tick(1000);
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:20,clientX:200,clientY:20});
  ui.fire(ui.viewport,'pointermove',{pointerId:20,clientX:150,clientY:20});ui.tick();
  ui.document.dispatchEvent({type:'pointercancel',pointerId:20});
  assert.ok(ui.root.classes.has('is-orbit-moving'));
  ui.tick(649);assert.ok(ui.root.classes.has('is-orbit-moving'));
  ui.tick(1);assert.equal(ui.root.classes.has('is-orbit-moving'),false);
});
test('Ring neighbors center fully before opening, with immediate reduced-motion opening',()=>{
  assert.equal(showroom.offset(13,0,14),-1);assert.equal(showroom.offset(0,13,14),1);
  assert.equal(showroom.offset(2,0,3),-1);assert.equal(showroom.offset(0,2,3),1);
  const cssDuration=fs.readFileSync(path.join(__dirname,'../assets/project-showroom.css'),'utf8').match(/--showroom-center-duration:(\d+)ms/);
  assert.ok(cssDuration);const centerDuration=Number(cssDuration[1]);
  const ui=mount();
  ui.fire(ui.root,'click',{target:ui.cards[1].link});
  assert.equal(ui.active().dataset.projectId,'project-1');assert.equal(ui.opened.length,0);
  ui.tick(centerDuration);assert.equal(ui.opened.length,0);
  ui.tick(649-centerDuration);assert.equal(ui.opened.length,0);
  ui.tick(1);assert.equal(ui.opened.at(-1),'project-1');
  const reduced=mount();reduced.reduced.matches=true;
  reduced.fire(reduced.root,'click',{target:reduced.cards[1].link});
  assert.equal(reduced.opened.at(-1),'project-1');assert.equal(reduced.timers.size,0);
});
test('Category filter is persistent data selection without clones or source mutation',()=>{
  const original=JSON.stringify(records),selection=showroom.select(records,'mobile','project-2');
  assert.deepEqual(selection.items.map(x=>x.id),['project-0','project-1','project-2']);
  assert.equal(selection.index,2);assert.equal(selection.category,'mobile');assert.equal(JSON.stringify(records),original);
  const ui=mount();ui.fire(ui.gate('mobile'),'click');ui.fire(ui.buttons[1],'click');
  const prior=ui.active().dataset.projectId,priorUrl=ui.url.href;
  ui.fire(ui.gate('saas'),'pointerenter',{pointerType:'mouse'});
  assert.equal(ui.position.textContent,'1 / 10');assert.equal(ui.url.href,priorUrl);
  assert.equal(ui.gate('mobile')['aria-pressed'],'true');
  ui.fire(ui.gate('saas'),'pointerleave');
  assert.equal(ui.active().dataset.projectId,prior);assert.equal(ui.position.textContent,'2 / 3');assert.equal(ui.url.href,priorUrl);
  ui.fire(ui.gate('saas'),'pointerenter',{pointerType:'mouse'});ui.fire(ui.gate('saas'),'click');ui.fire(ui.gate('saas'),'pointerleave');
  assert.equal(ui.url.searchParams.get('kategoria'),'saas');assert.equal(ui.position.textContent,'1 / 10');
  ui.fire(ui.gate('mobile'),'pointerenter',{pointerType:'touch'});assert.equal(ui.position.textContent,'1 / 10');
  ui.active().link.focus();ui.fire(ui.gate('mobile'),'pointerenter',{pointerType:'mouse'});
  assert.equal(ui.position.textContent,'1 / 10');assert.equal(ui.document.activeElement,ui.active().link);
});
test('All and invalid-category recovery restore all 14 real identities',()=>{
  for(const category of ['', 'missing']){
    const selection=showroom.select(records,category,'project-13');
    assert.equal(selection.items.length,14);assert.equal(selection.index,13);assert.equal(selection.category,'');
  }
});
test('A one-project category stays valid and missing selected identity falls back safely',()=>{
  const selection=showroom.select(records,'games','missing');
  assert.equal(selection.items.length,1);assert.equal(selection.index,0);assert.equal(showroom.wrap(selection.index+1,1),0);
  const ui=mount();ui.fire(ui.gate('games'),'click');assert.ok(ui.buttons.every(button=>button.disabled));
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:1,clientX:200,clientY:10});
  ui.fire(ui.viewport,'pointermove',{pointerType:'touch',pointerId:1,clientX:20,clientY:10});
  ui.fire(ui.viewport,'pointerup',{pointerId:1});assert.equal(ui.viewport.properties.get('--showroom-drag'),'0px');
  ui.fire(ui.root,'click',{target:ui.active().link});assert.equal(ui.opened.length,0);
  ui.tick(500);
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:2,clientX:200,clientY:10});
  const vertical=ui.fire(ui.viewport,'pointermove',{pointerId:2,clientX:201,clientY:190});
  assert.equal(vertical.prevented,false);ui.fire(ui.viewport,'pointerup',{pointerId:2});
  ui.fire(ui.root,'click',{target:ui.active().link});assert.equal(ui.opened.length,0);
  ui.tick(500);
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:3,clientX:200,clientY:10});
  ui.fire(ui.viewport,'pointermove',{pointerId:3,clientX:20,clientY:10});
  ui.document.dispatchEvent({type:'pointercancel',pointerId:3});
  ui.fire(ui.root,'click',{target:ui.active().link});assert.equal(ui.opened.length,0);
  assert.equal(ui.position.textContent,'1 / 1');assert.equal(ui.frames.size,0);
  ui.tick(500);ui.fire(ui.root,'click',{target:ui.active().link});assert.equal(ui.opened.length,1);
});
test('Drag intent suppresses accidental click while leaving vertical gestures to scrolling',()=>{
  assert.deepEqual(showroom.drag(2,3),{horizontal:false,suppressClick:false,steps:0});
  assert.deepEqual(showroom.drag(4,90),{horizontal:false,suppressClick:true,steps:0});
  assert.equal(showroom.drag(-95,4).steps,1);assert.equal(showroom.drag(95,4).steps,-1);
  const ui=mount();
  ui.fire(ui.viewport,'pointerdown',{pointerType:'mouse',button:0,pointerId:2,clientX:100,clientY:10});
  ui.document.dispatchEvent({type:'pointerup',pointerId:2});
  ui.fire(ui.viewport,'pointermove',{pointerId:2,clientX:20,clientY:10});assert.equal(ui.frames.size,0);
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:3,clientX:200,clientY:10});
  ui.fire(ui.viewport,'pointermove',{pointerId:3,clientX:50,clientY:11});assert.equal(ui.frames.size,1);
  ui.document.dispatchEvent({type:'pointercancel',pointerId:3});assert.equal(ui.frames.size,0);assert.equal(ui.root.classes.has('is-dragging'),false);
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:4,clientX:200,clientY:10});
  ui.fire(ui.viewport,'pointermove',{pointerId:4,clientX:50,clientY:11});
  ui.notify('progresskit:hologram-open',{id:'project-0'});assert.equal(ui.frames.size,0);assert.equal(ui.root.classes.has('is-dragging'),false);
  ui.notify('progresskit:hologram-close',{id:'project-0'});
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:5,clientX:200,clientY:10});
  ui.fire(ui.viewport,'pointermove',{pointerId:5,clientX:50,clientY:11});ui.document.hidden=true;ui.notify('visibilitychange',{});assert.equal(ui.frames.size,0);
});
test('Inertia is bounded and a deliberate horizontal movement cannot produce an unbounded spin',()=>{
  assert.equal(showroom.drag(-1000,0,-20).steps,2);assert.equal(showroom.drag(1000,0,20).steps,-2);
  assert.equal(showroom.drag(-20,0,-1).steps,1);assert.equal(showroom.drag(-15,0,0).steps,0);
});
test('Wheel ignores vertical and diagonal page scrolling, accepting only horizontal intent',()=>{
  assert.equal(showroom.wheel(0,120),0);assert.equal(showroom.wheel(25,80),0);
  assert.equal(showroom.wheel(80,5),1);assert.equal(showroom.wheel(-80,5),-1);assert.equal(showroom.wheel(.5,0),0);
  const ui=mount(),prior=ui.active().dataset.projectId;
  assert.equal(ui.fire(ui.viewport,'wheel',{deltaX:0,deltaY:120}).prevented,false);assert.equal(ui.active().dataset.projectId,prior);
  assert.equal(ui.fire(ui.viewport,'wheel',{deltaX:80,deltaY:0}).prevented,true);assert.notEqual(ui.active().dataset.projectId,prior);
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:6,clientX:200,clientY:10});
  ui.fire(ui.viewport,'pointermove',{pointerId:6,clientX:50,clientY:11});ui.fire(ui.viewport,'pointerup',{pointerId:6});
  ui.fire(ui.root,'click',{target:ui.active().link});assert.equal(ui.opened.length,0);
  ui.tick(500);ui.fire(ui.root,'click',{target:ui.active().link});ui.tick(200);assert.equal(ui.opened.length,1);
  assert.ok(ui.root.classes.has('is-hologram-open'));const locked=ui.active().dataset.projectId;ui.fire(ui.buttons[1],'click');assert.equal(ui.active().dataset.projectId,locked);
});
test('Deep links roundtrip category/project without rewriting search, UTM or deployment path',()=>{
  const value='https://example.org/progresskit/?q=C%23&utm_source=review#projekty';
  const next=showroom.url(value,'mobile','project-1');
  assert.deepEqual(showroom.read(next.href),{category:'mobile',project:'project-1'});
  assert.equal(next.searchParams.get('q'),'C#');assert.equal(next.searchParams.get('utm_source'),'review');
  assert.equal(next.pathname,'/progresskit/');assert.equal(next.hash,'#projekty');
  const reset=showroom.url(next.href,'');assert.equal(reset.searchParams.get('q'),'C#');assert.equal(reset.searchParams.has('projekt'),false);
  const ui=mount();ui.pop('http://preview.local/?kategoria=saas&projekt=project-8&q=keep&utm_source=review#projekty');
  assert.equal(ui.active().dataset.projectId,'project-8');assert.equal(ui.opened.at(-1),'project-8');assert.equal(ui.url.searchParams.get('kategoria'),'saas');
  ui.notify('progresskit:hologram-close',{id:'project-8'});
  assert.equal(ui.url.searchParams.has('projekt'),false);assert.equal(ui.url.searchParams.get('kategoria'),'saas');assert.equal(ui.url.searchParams.get('q'),'keep');
  ui.pop('http://preview.local/?kategoria=mobile&projekt=project-2&q=keep&utm_source=review#projekty');
  ui.pop('http://preview.local/?kategoria=games&q=keep&utm_source=review#projekty');
  assert.equal(ui.root.classes.has('is-hologram-open'),false);assert.equal(ui.position.textContent,'1 / 1');
  assert.equal(ui.url.searchParams.has('projekt'),false);assert.equal(ui.url.searchParams.get('kategoria'),'games');assert.equal(ui.url.searchParams.get('utm_source'),'review');
});

test('Six-slice wheel keeps six distinct usable modules and all real filter sizes',()=>{
  for(const length of [1,2,3,4,6,14]) for(let active=0;active<length;active++) {
    const points=Array.from({length},(_,index)=>showroom.orbit(showroom.relative(index,active,length),length,6));
    const visible=points.filter(point=>point.visible);
    assert.equal(visible.length,Math.min(6,length));
    assert.equal(new Set(visible.map(point=>`${point.x.toFixed(6)}:${point.y.toFixed(6)}`)).size,visible.length);
    for(const point of visible) {
      for(const key of ['x','y','scale','angle','opacity']) assert.ok(Number.isFinite(point[key]),`${length}:${key}`);
      assert.ok(point.scale>0&&point.scale<=1);
      assert.ok(point.opacity>=0&&point.opacity<=1);
    }
    assert.deepEqual(points,Array.from({length},(_,index)=>showroom.orbit(showroom.relative(index,active+length,length),length,6)));
  }
  for(let phase=0;phase<14;phase+=.125) {
    const visible=Array.from({length:14},(_,index)=>showroom.orbit(showroom.relative(index,phase,14),14,6)).filter(point=>point.visible);
    assert.ok(visible.length>=5&&visible.length<=6);
  }
});

test('A child losing implicit touch capture does not cancel the viewport swipe',()=>{
  const ui=mount();
  ui.fire(ui.viewport,'pointerdown',{pointerType:'touch',pointerId:7,clientX:290,clientY:100});
  ui.fire(ui.viewport,'pointermove',{pointerId:7,clientX:266,clientY:100});
  ui.fire(ui.viewport,'lostpointercapture',{target:ui.active().link,pointerId:7});
  ui.fire(ui.viewport,'pointermove',{pointerId:7,clientX:74,clientY:100});
  ui.fire(ui.viewport,'pointerup',{pointerId:7,clientX:74,clientY:100});
  assert.notEqual(ui.active().dataset.projectId,'project-0');
  assert.equal(ui.opened.length,0);
});

test('An expanded desktop drawer uses the reading stage and leaves vertical wheel scrolling to the page',()=>{
  const ui=mount(records,{slices:true});
  const card=ui.active();
  const pose=ui.cards.map(node=>node.properties.get('--showroom-y'));
  ui.fire(ui.root,'click',{target:card.link});
  assert.equal(card.panel.hidden,false);
  assert.equal(card.link['aria-expanded'],'true');
  assert.equal(ui.viewport.properties.get('--slice-stage-top'),'16.00px');
  assert.equal(ui.url.searchParams.get('projekt'),card.dataset.projectId);
  assert.deepEqual(ui.cards.map(node=>node.properties.get('--showroom-y')),pose);
  // A longer document or shorter browser must not reposition the reading stage.
  ui.viewport.rectangle.height=1400;ui.window.innerHeight=400;
  ui.windowNotify('resize');
  assert.equal(ui.viewport.properties.get('--slice-stage-top'),'16.00px');
  assert.equal(card.properties.has('--slice-height'),false);
  assert.equal(ui.fire(ui.viewport,'wheel',{target:card.body,deltaX:0,deltaY:240}).prevented,false);
  assert.equal(card.panel.hidden,false);
  assert.equal(ui.frames.size,0);
});

test('Closing a desktop module after page scrolling restores visible focus and navigation releases its flow reservation',()=>{
  const ui=mount(records,{slices:true}),card=ui.active();
  ui.fire(ui.root,'click',{target:card.link});
  assert.equal(ui.document.activeElement,card.close);
  card.rectangle={...card.rectangle,top:-800,bottom:-630};
  ui.fire(ui.root,'click',{target:card.close});
  assert.equal(card.panel.hidden,true);
  assert.equal(ui.root.classes.has('is-slice-open'),false);
  assert.equal(ui.viewport.properties.has('--slice-stage-top'),false);
  assert.equal(ui.document.activeElement,card.link);
  assert.equal(card.scrolled.block,'start');
  assert.equal(ui.url.searchParams.has('projekt'),false);
  assert.equal(ui.url.searchParams.get('q'),'keep');
  assert.equal(ui.url.hash,'#projekty');
  card.rectangle={...card.rectangle,top:180,bottom:350};
  ui.fire(ui.root,'click',{target:card.link});
  ui.fire(ui.viewport,'keydown',{target:card.close,key:'ArrowRight'});
  assert.equal(card.panel.hidden,true);
  assert.equal(ui.viewport.properties.has('--slice-stage-top'),false);
  assert.equal(ui.document.activeElement,ui.active().link);
  assert.equal(ui.cards.filter(node=>node.link.tabIndex===0).length,1);
});

test('Breakpoint changes and browser Back keep one disclosure and return focus outside closed content',()=>{
  const ui=mount(records,{slices:true}),card=ui.cards[1];
  ui.fire(ui.root,'click',{target:card.link});
  ui.setNarrow(true);
  assert.equal(ui.active(),card);
  assert.equal(ui.cards.filter(node=>node.classes.has('is-slice-expanded')).length,1);
  assert.equal(ui.viewport.properties.has('--slice-stage-top'),false);
  assert.equal(card.panel.hidden,false);
  ui.setNarrow(false);
  assert.equal(ui.active(),card);
  assert.equal(ui.viewport.properties.get('--slice-stage-top'),'16.00px');
  ui.pop('http://preview.local/?q=keep&utm_source=review#projekty');
  ui.tick();
  assert.equal(card.panel.hidden,true);
  assert.equal(ui.viewport.properties.has('--slice-stage-top'),false);
  assert.equal(ui.cards.filter(node=>node.classes.has('is-slice-expanded')).length,0);
  assert.equal(ui.document.activeElement,ui.viewport);
});

test('Manual rotation cannot open a moving neighbor through hover before a settled module is chosen',()=>{
  const ui=mount(records,{slices:true});
  ui.fire(ui.buttons[1],'click');
  assert.equal(ui.frames.size,1);
  const card=ui.active();
  ui.fire(card,'pointerenter',{pointerType:'mouse'});
  ui.fire(card,'pointermove',{pointerType:'mouse'});
  ui.tick(130);
  assert.equal(ui.cards.some(node=>node.classes.has('is-slice-expanded')),false);
  ui.tick(620);
  assert.equal(ui.frames.size,0);
  ui.fire(card,'pointerenter',{pointerType:'mouse'});
  ui.fire(card,'pointermove',{pointerType:'mouse'});
  ui.tick(130);
  assert.equal(card.classes.has('is-slice-expanded'),true);
  assert.equal(ui.cards.filter(node=>node.classes.has('is-slice-expanded')).length,1);
});

test('A module passing under a stationary pointer during page scrolling does not open until the pointer moves',()=>{
  const ui=mount(records,{slices:true}),card=ui.active();
  ui.fire(card,'pointerenter',{pointerType:'mouse'});
  ui.tick(500);
  assert.equal(card.panel.hidden,true);
  assert.equal(ui.url.searchParams.has('projekt'),false);
  ui.fire(card,'pointermove',{pointerType:'mouse',clientX:450,clientY:220});
  ui.tick(130);
  assert.equal(card.panel.hidden,false);
  assert.equal(ui.url.searchParams.get('projekt'),card.dataset.projectId);
});

test('Straight-guide sockets retain six unique readable faces for every actual collection size',()=>{
  for(const length of [1,2,3,4,6,14])for(let active=0;active<length;active++){
    const points=Array.from({length},(_,i)=>showroom.mechanism(showroom.relative(i,active,length),length));
    const visible=points.filter(p=>p.visible);
    assert.equal(visible.length,Math.min(6,length));
    assert.equal(new Set(visible.map(p=>`${p.x}:${p.y}`)).size,visible.length);
    assert.deepEqual(points[active],showroom.mechanism(0,length));
    for(const p of visible){assert.equal(p.opacity,1);assert.equal(p.scale,1);assert.ok(Math.abs(p.angle)<=1.5)}
  }
});

test('A drawer changes sockets only while fully retracted, without a circular crossing path',()=>{
  for(let phase=0;phase<14;phase+=.125){
    const points=Array.from({length:14},(_,i)=>showroom.mechanism(showroom.relative(i,phase,14),14));
    const visible=points.filter(p=>p.visible&&p.opacity>0);
    assert.ok(visible.length<=6);
    assert.equal(new Set(visible.map(p=>`${p.x}:${p.y}`)).size,visible.length);
    for(const p of points)for(const k of ['x','y','scale','opacity','angle'])assert.ok(Number.isFinite(p[k]));
  }
  assert.equal(showroom.mechanism(.5,14).opacity,0);
  const before=showroom.mechanism(.49,14),after=showroom.mechanism(.51,14);
  assert.notEqual(before.y,after.y);assert.ok(before.opacity<.021&&after.opacity<.021);
});

test('The shipped inline controller presents the first six projects on rails and reaches all fourteen',()=>{
  const ui=mount(records,{slices:true});
  assert.deepEqual(ui.cards.filter(c=>!c.classes.has('is-orbit-hidden')).map(c=>c.dataset.projectId),records.slice(0,6).map(p=>p.id));
  for(let i=0;i<14;i++){
    const active=ui.active();
    assert.equal(active.dataset.projectId,records[i].id);
    assert.equal(active.properties.get('--showroom-y'),showroom.mechanism(0,14).y.toFixed(6));
    assert.equal(active.inert,false);
    ui.fire(ui.buttons[1],'click');ui.tick(650);
  }
  assert.equal(ui.active().dataset.projectId,records[0].id);
  assert.equal(ui.frames.size,0);
});

test('Selecting a visible neighboring drawer freezes the mechanism and reduced motion opens immediately',()=>{
  const ui=mount(records,{slices:true});
  ui.fire(ui.buttons[1],'click');ui.tick(155);
  const card=ui.cards[2];ui.fire(ui.root,'click',{target:card.link});
  assert.equal(ui.frames.size,0);assert.equal(card.panel.hidden,false);
  const pose=ui.cards.map(c=>c.properties.get('--showroom-y'));ui.tick(1000);
  assert.deepEqual(ui.cards.map(c=>c.properties.get('--showroom-y')),pose);
  assert.equal(ui.cards.filter(c=>c.classes.has('is-slice-expanded')).length,1);
  const reduced=mount(records,{slices:true});reduced.reduced.matches=true;
  reduced.fire(reduced.buttons[1],'click');assert.equal(reduced.frames.size,0);
  reduced.fire(reduced.root,'click',{target:reduced.active().link});
  assert.equal(reduced.active().panel.hidden,false);
});
