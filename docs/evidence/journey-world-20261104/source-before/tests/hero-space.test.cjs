const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// The actual asset runs against a small event adapter. This checks controller
// state and queued work; it does not establish browser appearance or motion.
function mount({reduced=false,world=false}={}) {
  const frames=new Map(),classes=new Set(),properties=new Map();
  let sequence=0,intersection;
  function events(node={}) {
    node.listeners={};
    node.addEventListener=(type,listener)=>(node.listeners[type]??=[]).push(listener);
    node.fire=(type,extra={})=>(node.listeners[type]||[]).forEach(listener=>listener({type,...extra}));
    return node;
  }
  const button=events({hidden:true,attributes:{},setAttribute(name,value){this.attributes[name]=value;}});
  const hero=events({
    dataset:world?{heroLayout:'world'}:{},
    querySelector:()=>button,
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),toggle(name,on){on?classes.add(name):classes.delete(name);}},
    style:{setProperty:(name,value)=>properties.set(name,value),removeProperty:name=>properties.delete(name)},
    getBoundingClientRect:()=>({left:0,top:0,width:1000,height:600}),
  });
  const reduce=events({matches:reduced}),fine=events({matches:true}),desktop=events({matches:true});
  const stage={};
  const document=events({hidden:false,documentElement:{dataset:{}},querySelector:selector=>selector==='.project-showroom'?stage:hero});
  class Observer {constructor(callback){intersection=callback;}observe(){}}
  const window=events({IntersectionObserver:Observer,matchMedia:query=>query.includes('reduced-motion')?reduce:query.includes('1101px')?desktop:fine});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/hero-space.js'),'utf8'),{
    document,window,IntersectionObserver:Observer,
    requestAnimationFrame(callback){frames.set(++sequence,callback);return sequence;},
    cancelAnimationFrame(id){frames.delete(id);},
  });
  return{hero,stage,button,document,window,reduce,fine,desktop,frames,classes,properties,
    pointer(extra={}){hero.fire('pointermove',{pointerType:'mouse',clientX:800,clientY:200,...extra});},
    intersect(isIntersecting,target=hero){intersection([{isIntersecting,target}]);},
    flush(){for(const[id,callback]of[...frames]){frames.delete(id);callback();}},
  };
}

test('Local pause clears queued parallax and blocks later pointer updates',()=>{
  const ui=mount();ui.pointer();assert.equal(ui.frames.size,1);
  ui.button.fire('click');
  assert.equal(ui.frames.size,0);assert.equal(ui.properties.size,0);
  assert.ok(ui.classes.has('hero-motion-paused'));assert.equal(ui.classes.has('hero-motion-enabled'),false);
  assert.equal(ui.button.attributes['aria-pressed'],'true');assert.equal(ui.button.textContent,'Wznów ruch sceny');
  ui.pointer();ui.flush();assert.equal(ui.frames.size,0);assert.equal(ui.properties.size,0);
});

test('Resume enables fresh pointer work while touch remains native',()=>{
  const ui=mount();ui.button.fire('click');ui.button.fire('click');
  assert.equal(ui.button.attributes['aria-pressed'],'false');assert.equal(ui.button.textContent,'Wstrzymaj ruch sceny');
  assert.ok(ui.classes.has('hero-motion-enabled'));assert.ok(ui.classes.has('hero-in-view'));
  ui.pointer({pointerType:'touch'});assert.equal(ui.frames.size,0);
  ui.pointer();ui.flush();assert.ok(ui.properties.has('--scene-x'));assert.ok(ui.properties.has('--climber-rise'));
  ui.hero.fire('pointerleave');assert.equal(ui.properties.size,0);
});

test('Reduced motion cannot be overridden by the scene button',()=>{
  const ui=mount({reduced:true});assert.equal(ui.button.disabled,true);
  assert.equal(ui.button.textContent,'Ruch sceny wyłączony');
  ui.button.fire('click');ui.pointer();ui.flush();
  assert.equal(ui.button.attributes['aria-pressed'],'false');assert.equal(ui.classes.has('hero-motion-enabled'),false);
  assert.equal(ui.properties.size,0);
  ui.reduce.matches=false;ui.reduce.fire('change');ui.button.fire('click');
  ui.reduce.matches=true;ui.reduce.fire('change');ui.button.fire('click');
  ui.reduce.matches=false;ui.reduce.fire('change');
  assert.equal(ui.button.attributes['aria-pressed'],'true');assert.ok(ui.classes.has('hero-motion-paused'));
  assert.equal(ui.classes.has('hero-motion-enabled'),false);
});

test('Visibility, intersection and page restoration preserve an explicit pause',()=>{
  const ui=mount();ui.button.fire('click');
  ui.intersect(false);ui.document.hidden=true;ui.document.fire('visibilitychange');
  ui.window.fire('pagehide');ui.document.hidden=false;ui.document.fire('visibilitychange');
  ui.intersect(true);ui.window.fire('pageshow');ui.pointer();ui.flush();
  assert.ok(ui.classes.has('hero-motion-paused'));assert.equal(ui.classes.has('hero-in-view'),false);
  assert.equal(ui.classes.has('hero-motion-enabled'),false);assert.equal(ui.properties.size,0);
  assert.equal(ui.button.attributes['aria-pressed'],'true');
});

test('Offscreen, hidden and coarse-pointer transitions cancel queued work',()=>{
  const ui=mount();
  ui.pointer();ui.intersect(false);assert.equal(ui.frames.size,0);ui.pointer();assert.equal(ui.frames.size,0);
  ui.intersect(true);ui.pointer();assert.equal(ui.frames.size,1);
  ui.document.hidden=true;ui.document.fire('visibilitychange');assert.equal(ui.frames.size,0);
  ui.document.hidden=false;ui.document.fire('visibilitychange');ui.pointer();assert.equal(ui.frames.size,1);
  ui.fine.matches=false;ui.fine.fire('change');assert.equal(ui.frames.size,0);assert.equal(ui.properties.size,0);
  ui.pointer();assert.equal(ui.frames.size,0);
  ui.fine.matches=true;ui.fine.fire('change');ui.pointer();assert.equal(ui.frames.size,1);
  ui.reduce.matches=true;ui.reduce.fire('change');assert.equal(ui.frames.size,0);assert.equal(ui.properties.size,0);
});

test('Shared mechanism pause cancels queued hero light and blocks pointer updates until resumed',()=>{
  const ui=mount();ui.pointer();assert.equal(ui.frames.size,1);
  ui.document.documentElement.dataset.interfaceMotion='paused';
  ui.window.fire('progresskit:motionchange',{detail:{paused:true}});
  assert.equal(ui.frames.size,0);assert.equal(ui.properties.size,0);
  assert.equal(ui.classes.has('hero-motion-enabled'),false);
  ui.pointer();ui.flush();assert.equal(ui.properties.size,0);
  ui.document.documentElement.dataset.interfaceMotion='running';
  ui.window.fire('progresskit:motionchange',{detail:{paused:false}});
  ui.pointer();ui.flush();assert.ok(ui.properties.has('--light-x'));
});

test('Desktop hero stops behind later chapters while mobile hero has its own visibility',()=>{
  const ui=mount();ui.pointer();assert.equal(ui.frames.size,1);
  ui.intersect(false,ui.stage);
  assert.equal(ui.classes.has('hero-in-view'),false);assert.equal(ui.frames.size,0);
  ui.pointer();assert.equal(ui.frames.size,0);
  ui.desktop.matches=false;ui.desktop.fire('change');
  assert.equal(ui.classes.has('hero-in-view'),true);
  ui.pointer();ui.flush();assert.ok(ui.properties.has('--light-x'));
  ui.intersect(false);assert.equal(ui.classes.has('hero-in-view'),false);assert.equal(ui.properties.size,0);
});

test('Independent world hero remains responsive before the showroom enters view and stops offscreen',()=>{
  const ui=mount({world:true});ui.intersect(false,ui.stage);
  assert.ok(ui.classes.has('hero-in-view'));
  ui.pointer();ui.flush();assert.ok(ui.properties.has('--light-x'));
  ui.intersect(false);assert.equal(ui.classes.has('hero-in-view'),false);
  assert.equal(ui.properties.size,0);ui.pointer();assert.equal(ui.frames.size,0);
});
