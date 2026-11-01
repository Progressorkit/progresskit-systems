const test = require('node:test');
const assert = require('node:assert/strict');
const { motionQuality, motionPaused } = require('../assets/interface-life.js');

test('decorative quality respects narrow viewport, data saving and small device budgets', () => {
  assert.equal(motionQuality({}), 'full');
  assert.equal(motionQuality({ cores: 8, memory: 8 }), 'full');
  for (const input of [{ narrow: true }, { saveData: true }, { cores: 4 }, { cores: 1 }, { memory: 4 }, { memory: 2 }]) {
    assert.equal(motionQuality(input), 'compact');
  }
  assert.equal(motionQuality({ cores: 0, memory: 0 }), 'full');
});

test('user controls, accessibility and page lifecycle each stop decorative motion', () => {
  assert.equal(motionPaused({}), false);
  for (const input of [{ userPaused: true }, { scenePaused: true }, { reduced: true }, { hidden: true }]) {
    assert.equal(motionPaused(input), true);
  }
  assert.equal(motionPaused({ userPaused: false, scenePaused: false, reduced: false, hidden: false }), false);
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function mount(options = {}) {
  const frames = new Map(), intersections = [], mutations = [], media = new Map();
  let nextFrame = 0;
  function target(extra = {}) {
    const listeners = new Map();
    return Object.assign({listeners,
      addEventListener(name, handler, settings) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push({handler, settings});
      },
      fire(name, event = {}) {
        for (const {handler} of listeners.get(name) || []) handler({type:name, ...event});
      },
    }, extra);
  }
  function element(rect) {
    const properties = new Map();
    return target({dataset:{}, properties,
      style:{setProperty:(key,value) => properties.set(key,value), removeProperty:key => properties.delete(key)},
      getBoundingClientRect:() => ({...rect, right:rect.left + rect.width, bottom:rect.top + rect.height}),
    });
  }
  const surfaceRect = {left:100, top:100, width:200, height:200};
  const lineRect = {left:20, top:1000, width:1000, height:600};
  const surface = element(surfaceRect), chapter = element({left:0,top:80,width:1200,height:600});
  const stages = Array.from({length:6}, () => element({left:0,top:0,width:100,height:120}));
  const line = element(lineRect);
  line.querySelectorAll = selector => selector === '[data-production-stage]' ? stages : [];
  const html = {dataset:{}};
  const mechanism = target({getAttribute:() => String(Boolean(options.userPaused))});
  const scene = target({getAttribute:() => String(Boolean(options.scenePaused))});
  const document = target({documentElement:html, hidden:false,
    querySelector(selector) {
      if (selector === '[data-showroom-motion-toggle]') return mechanism;
      if (selector === '[data-hero-motion-toggle]') return scene;
      if (selector === '.production-line') return line;
      return null;
    },
    querySelectorAll(selector) {
      return [...new Set(selector.split(',').flatMap(part => {
        if (part.trim() === '.world-surface') return [surface];
        if (part.trim() === '.home-chapter') return [chapter];
        if (part.trim() === '.production-line') return [line];
        if (part.trim() === '[data-production-stage]') return stages;
        return [];
      }))];
    },
  });
  const window = target({innerHeight:900, innerWidth:1440});
  const matchMedia = query => {
    if (!media.has(query)) {
      const matches = query.includes('reduced') ? Boolean(options.reduced)
        : query.includes('max-width') ? Boolean(options.narrow) : true;
      media.set(query, target({matches}));
    }
    return media.get(query);
  };
  window.matchMedia = matchMedia;
  const connection = target({saveData:Boolean(options.saveData)});
  const context = {document,window,navigator:{connection,hardwareConcurrency:8,deviceMemory:8},
    matchMedia,
    addEventListener:window.addEventListener.bind(window),
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id,callback); return id; },
    cancelAnimationFrame:id => frames.delete(id),
    MutationObserver:class {constructor(callback) {this.callback=callback;mutations.push(this);} observe() {}},
    IntersectionObserver:class {constructor(callback) {this.callback=callback;this.targets=[];intersections.push(this);} observe(item) {this.targets.push(item);}},
    CustomEvent:class {constructor(type,init) {this.type=type;Object.assign(this,init);}},
    console,
  };
  window.dispatchEvent = event => window.fire(event.type,event);
  window.IntersectionObserver = context.IntersectionObserver;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/interface-life.js'),'utf8'),context);
  return {surface,surfaceRect,line,lineRect,stages,chapter,document,window,html,frames,media,connection,mechanism,scene,
    see(item,visible) {for (const observer of intersections) if(observer.targets.includes(item)) observer.callback([{target:item,isIntersecting:visible}]);},
    flush() {const queued=[...frames.values()];frames.clear();for(const callback of queued) callback();},
    changed() {for(const observer of mutations) observer.callback([]);},
  };
}

test('visible desktop surface batches pointer work and clamps physical response', () => {
  const ui=mount();ui.see(ui.surface,true);ui.flush();
  assert.equal(ui.surface.dataset.worldVisible,'true');
  for(let i=0;i<25;i++) ui.surface.fire('pointermove',{pointerType:'mouse',clientX:500+i,clientY:-100});
  assert.equal(ui.frames.size,1);
  ui.flush();
  assert.equal(ui.surface.properties.get('--world-x'),'100.00%');
  assert.equal(ui.surface.properties.get('--world-y'),'0.00%');
  assert.ok(Math.abs(parseFloat(ui.surface.properties.get('--world-tilt-x')))<=1.2);
  assert.ok(Math.abs(parseFloat(ui.surface.properties.get('--world-tilt-y')))<=1.2);
  assert.equal(ui.frames.size,0);
});

test('offscreen, compact and touch surfaces do not queue pointer motion', () => {
  for(const settings of [{},{narrow:true},{saveData:true}]) {
    const ui=mount(settings);ui.flush();
    if(settings.narrow||settings.saveData)ui.see(ui.surface,true);
    ui.surface.fire('pointermove',{pointerType:'mouse',clientX:250,clientY:250});
    assert.equal(ui.frames.size,0);
    assert.equal(ui.surface.properties.size,0);
  }
  const ui=mount();ui.see(ui.surface,true);ui.flush();
  ui.surface.fire('pointermove',{pointerType:'touch',clientX:250,clientY:250});
  assert.equal(ui.frames.size,0);
});

test('leaving or hiding the surface cancels queued work and removes residual tilt', () => {
  const ui=mount();ui.see(ui.surface,true);ui.flush();
  ui.surface.fire('pointermove',{pointerType:'mouse',clientX:250,clientY:250});ui.flush();
  assert.ok(ui.surface.properties.size>0);
  ui.surface.fire('pointermove',{pointerType:'mouse',clientX:260,clientY:260});
  ui.surface.fire('pointerleave');
  assert.equal(ui.frames.size,0);assert.equal(ui.surface.properties.size,0);
  ui.surface.fire('pointermove',{pointerType:'mouse',clientX:250,clientY:250});
  ui.see(ui.surface,false);
  assert.equal(ui.frames.size,0);assert.equal(ui.surface.properties.size,0);
  assert.equal(ui.surface.dataset.worldVisible,'false');
});

test('reduced motion and user pause stop pending decoration and restore static production', () => {
  const ui=mount();ui.see(ui.surface,true);ui.see(ui.line,true);ui.flush();
  ui.surface.fire('pointermove',{pointerType:'mouse',clientX:250,clientY:250});
  const reduced=[...ui.media.entries()].find(([query])=>query.includes('reduced'))[1];
  reduced.matches=true;reduced.fire('change');
  assert.equal(ui.html.dataset.interfaceMotion,'paused');
  assert.equal(ui.frames.size,0);assert.equal(ui.surface.properties.size,0);
  assert.equal(ui.line.properties.get('--process-progress'),'1');
  assert.ok(ui.stages.every(stage=>stage.dataset.productionState==='complete'));
  reduced.matches=false;reduced.fire('change');ui.flush();
  ui.surface.fire('pointermove',{pointerType:'mouse',clientX:250,clientY:250});
  ui.mechanism.getAttribute=()=> 'true';ui.changed();
  assert.equal(ui.html.dataset.interfaceMotion,'paused');
  assert.equal(ui.frames.size,0);assert.equal(ui.surface.properties.size,0);
  ui.mechanism.getAttribute=()=> 'false';ui.changed();ui.flush();
  assert.equal(ui.html.dataset.interfaceMotion,'running');
  ui.window.fire('pagehide');
  assert.equal(ui.html.dataset.interfaceMotion,'paused');
  assert.equal(ui.frames.size,0);
  ui.window.fire('pageshow');ui.flush();
  assert.equal(ui.html.dataset.interfaceMotion,'running');
});

test('scroll advances one physical stage at a time without keeping animation frames alive', () => {
  const ui=mount();ui.see(ui.line,true);ui.flush();
  const progress=[];
  for(const top of [1000,550,300,-100,-700]) {
    ui.lineRect.top=top;
    for(let i=0;i<20;i++)ui.window.fire('scroll');
    assert.equal(ui.frames.size,1);ui.flush();
    progress.push(Number(ui.line.properties.get('--process-progress')));
    const states=ui.stages.map(stage=>stage.dataset.productionState);
    assert.ok(states.filter(state=>state==='active').length<=1);
    assert.equal(ui.frames.size,0);
    const order={complete:0,active:1,pending:2};
    assert.deepEqual(states.map(state=>order[state]),states.map(state=>order[state]).sort((a,b)=>a-b));
  }
  assert.equal(progress[0],0);assert.equal(progress.at(-1),1);
  assert.deepEqual(progress,[...progress].sort((a,b)=>a-b));
});

test('hidden production line and hidden page ignore scroll work until visible again', () => {
  const ui=mount();ui.flush();ui.window.fire('scroll');assert.equal(ui.frames.size,0);
  ui.see(ui.line,true);ui.flush();
  ui.window.fire('scroll');assert.equal(ui.frames.size,1);
  ui.document.hidden=true;ui.document.fire('visibilitychange');assert.equal(ui.frames.size,0);
  ui.window.fire('scroll');assert.equal(ui.frames.size,0);
  ui.document.hidden=false;ui.document.fire('visibilitychange');ui.flush();
  ui.window.fire('scroll');assert.equal(ui.frames.size,1);
  ui.see(ui.line,false);assert.equal(ui.frames.size,0);
});
