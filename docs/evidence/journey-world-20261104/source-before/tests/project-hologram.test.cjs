'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {safeLocalUrl, normalizeProjects, initProjectHologram} = require('../assets/project-hologram.js');

const base = 'https://progresskit.example/';
const project = (id, overrides = {}) => ({
  id, name:id === 'alpha' ? 'Projekt Alpha' : 'Projekt Beta', category:'mobile', categoryLabel:'Aplikacje',
  summary:'Opis rzeczywistego projektu.', problem:'Porządkowanie danych.', stage:'W rozwoju',
  technologies:['Kotlin', 'SQLite'], gallery:[], url:'projekty/' + id + '/', ...overrides
});

// A small event/DOM adapter exercises the production handlers, not native browser rendering.
class Node {
  constructor(doc) {
    this.doc = doc;
    this.listeners = new Map();
    this.attributes = new Map();
    this.styleProperties = new Map();
    this.style = {setProperty:(name, value) => this.styleProperties.set(name, value)};
    this.children = [];
    this.textContent = '';
    this.hidden = false;
    this.isConnected = true;
    this.visible = true;
    const values = new Set();
    this.classList = {
      add:(...names) => names.forEach(name => values.add(name)),
      remove:(...names) => names.forEach(name => values.delete(name)),
      contains:name => values.has(name)
    };
  }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== callback));
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    for (const callback of [...(this.listeners.get(event.type) || [])]) callback(event);
    return !event.defaultPrevented;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  querySelector(selector) { return this.selectors?.get(selector) || null; }
  append(child) { child.parentElement = this; this.children.push(child); }
  replaceChildren(...children) { this.children = []; children.forEach(child => this.append(child)); }
  contains(node) {
    for (let current = node; current; current = current.parentElement) if (current === this) return true;
    return false;
  }
  closest() {
    for (let current = this; current; current = current.parentElement) {
      if (current.hidden || current.attributes?.has('inert')) return current;
    }
    return null;
  }
  getClientRects() { return this.visible ? [{}] : []; }
  getBoundingClientRect() { return {left:100, top:100, right:800, bottom:700}; }
  focus() { this.doc.activeElement = this; }
  set innerHTML(_) { throw new Error('Raw HTML must never be used for project data'); }
}

function event(type, properties = {}) {
  return {type, defaultPrevented:false, preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; }, ...properties};
}

function harness({reduced = false, rows = [project('alpha'), project('beta')], modal = true} = {}) {
  const doc = new Node();
  doc.doc = doc;
  doc.baseURI = base;
  doc.visibilityState = 'visible';
  doc.documentElement = new Node(doc);
  doc.selectors = new Map();
  doc.createElement = name => Object.assign(new Node(doc), {tagName:name});
  const data = new Node(doc);
  data.textContent = JSON.stringify(rows);
  doc.selectors.set('#showroom-data', data);
  const dialog = new Node(doc);
  dialog.selectors = new Map();
  dialog.open = false;
  dialog.showModal = modal ? () => { dialog.open = true; } : undefined;
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(event('close')); };
  doc.selectors.set('#project-hologram', dialog);
  const fields = ['surface', 'close', 'category', 'name', 'summary', 'problem', 'stage', 'technologies',
    'technology-list', 'project-link', 'figure', 'image-slot', 'caption', 'identity', 'identity-category', 'identity-name'];
  const nodes = {};
  for (const field of fields) {
    const node = new Node(doc);
    node.parentElement = dialog;
    nodes[field] = node;
    dialog.selectors.set('[data-hologram-' + field + ']', node);
  }
  nodes.problem.parentElement = new Node(doc);
  const viewport = new Node(doc);
  doc.selectors.set('[data-showroom-viewport]', viewport);
  const trigger = new Node(doc);
  trigger.setAttribute('href', 'projekty/alpha/');
  doc.activeElement = trigger;
  const motion = Object.assign(new Node(doc), {matches:reduced});
  let sequence = 0;
  const timers = new Map();
  const frames = new Map();
  const navigations = [];
  const win = {
    location:{href:base, assign:url => navigations.push(url)},
    CustomEvent:class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    matchMedia:() => motion,
    setTimeout:callback => { const id = ++sequence; timers.set(id, callback); return id; },
    clearTimeout:id => timers.delete(id),
    requestAnimationFrame:callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame:id => frames.delete(id)
  };
  const opened = [];
  const closed = [];
  doc.addEventListener('progresskit:hologram-open', e => opened.push(e.detail.id));
  doc.addEventListener('progresskit:hologram-close', e => closed.push(e.detail.id));
  const controller = initProjectHologram(doc, win);
  const flush = queue => {
    const work = [...queue.values()];
    queue.clear();
    work.forEach(callback => callback());
  };
  return {doc, dialog, nodes, trigger, viewport, motion, timers, frames, navigations, opened, closed, controller,
    open:(id = 'alpha', target = trigger) => doc.dispatchEvent(event('progresskit:open-project', {detail:{id, trigger:target}})),
    flushTimers:() => flush(timers), flushFrames:() => flush(frames)};
}

test('only same-origin catalogue routes and local raster media become URLs', () => {
  assert.equal(safeLocalUrl('projekty/alpha/', base, 'project'), base + 'projekty/alpha/');
  assert.equal(safeLocalUrl('assets/projects/alpha/screen.webp', base, 'image'), base + 'assets/projects/alpha/screen.webp');
  for (const bad of ['javascript:alert(1)', 'data:text/html,test', 'https://other.example/projekty/alpha/',
    '//other.example/projekty/alpha/', 'projekty/alpha/?redirect=remote', 'projekty/alpha/#x',
    'https://user:password@progresskit.example/projekty/alpha/', 'assets/private.txt']) {
    assert.equal(safeLocalUrl(bad, base, 'project'), null, bad);
  }
  assert.equal(safeLocalUrl('assets/projects/alpha/icon.svg', base, 'image'), null);
  assert.equal(safeLocalUrl('https://other.example/screen.png', base, 'image'), null);
});
test('projection starts from the triggering module with bounded fallback coordinates', () => {
  const h=harness();
  h.trigger.getBoundingClientRect=()=>({left:420,right:480,top:1000,bottom:1100});
  h.open();
  assert.equal(h.dialog.styleProperties.get('--projection-origin'),'50.00% 100.00%');
  h.open('beta',null);
  assert.equal(h.dialog.styleProperties.get('--projection-origin'),'50.00% 100.00%');
  h.trigger.getBoundingClientRect=()=>({left:-800,right:-700,top:-500,bottom:-400});
  h.open('alpha');
  assert.equal(h.dialog.styleProperties.get('--projection-origin'),'5.00% 5.00%');
});

test('normalization handles wrappers, duplicates and invalid media without invented stages', () => {
  const rows = normalizeProjects({projects:[project('alpha', {stage:'PRODUCTION READY',
    technologies:['Kotlin', 'Kotlin', null], gallery:[{src:'assets/projects/alpha/a.webp', width:0, height:100}]}),
    project('alpha'), project('../bad'), project('beta', {url:'https://other.example/projekty/beta/'})]}, base);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stage, null);
  assert.deepEqual(rows[0].technologies, ['Kotlin']);
  assert.deepEqual(rows[0].gallery, []);
});

test('approved factual stages survive normalization and render unchanged as text', () => {
  for (const stage of ['Wersja testowa', 'Finalizacja', 'Dostępny APK']) {
    const rows = normalizeProjects([project('alpha', {stage})], base);
    assert.equal(rows[0].stage, stage);
    const h = harness({rows, reduced:true});
    h.open();
    assert.equal(h.nodes.stage.textContent, stage);
  }
});

test('unknown, case-altered and executable stages keep the unconfirmed fallback', () => {
  for (const stage of ['Stable', 'Commercial', 'wersja testowa', 'WERSJA TESTOWA',
    'Wersja testowa ', 'Dostepny APK', '<img src=x onerror=alert(1)>']) {
    const rows = normalizeProjects([project('alpha', {stage})], base);
    assert.equal(rows[0].stage, null);
    const h = harness({rows, reduced:true});
    h.open();
    assert.equal(h.nodes.stage.textContent, 'Etap do potwierdzenia');
  }
});

test('unknown IDs never populate or open a dialog; safe real anchors remain a fallback', () => {
  const h = harness();
  h.open('unknown', null);
  assert.equal(h.dialog.open, false);
  assert.deepEqual(h.opened, []);
  assert.deepEqual(h.navigations, []);
  h.open('unknown');
  assert.deepEqual(h.navigations, [base + 'projekty/alpha/']);
});

test('data is rendered as text, with a safe case-study CTA and neutral presentation without media', () => {
  const h = harness({rows:[project('alpha', {name:'<img src=x onerror=alert(1)>', technologies:['<script>bad</script>']})]});
  h.open();
  assert.equal(h.nodes.name.textContent, '<img src=x onerror=alert(1)>');
  assert.equal(h.nodes['technology-list'].children[0].textContent, '<script>bad</script>');
  assert.equal(h.nodes['project-link'].href, base + 'projekty/alpha/');
  assert.equal(h.nodes.identity.hidden, false);
  assert.equal(h.nodes.figure.hidden, true);
  assert.equal(h.doc.activeElement, h.nodes.close);
  assert.equal(h.doc.documentElement.classList.contains('project-hologram-active'), true);
});

test('native cancel handler prevents immediate close, reverses presentation and returns focus', () => {
  const h = harness();
  h.open();
  const cancel = event('cancel');
  h.dialog.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(h.dialog.open, true);
  assert.equal(h.controller.getState().phase, 'closing');
  h.flushTimers();
  assert.equal(h.dialog.open, false);
  assert.deepEqual(h.closed, ['alpha']);
  assert.equal(h.doc.activeElement, h.trigger);
  assert.equal(h.doc.documentElement.classList.contains('project-hologram-active'), false);
});

test('reopen invalidates a closing timer and stale close event, preserving the new project', () => {
  const h = harness();
  h.open();
  h.controller.close();
  const staleTimer = [...h.timers.values()][0];
  const nextTrigger = new Node(h.doc);
  h.open('beta', nextTrigger);
  staleTimer();
  h.dialog.dispatchEvent(event('close'));
  assert.deepEqual(h.controller.getState(), {id:'beta', phase:'open'});
  assert.equal(h.dialog.open, true);
  assert.deepEqual(h.opened, ['alpha', 'beta']);
  assert.deepEqual(h.closed, []);
  h.controller.close();
  h.flushTimers();
  assert.deepEqual(h.closed, ['beta']);
  assert.equal(h.doc.activeElement, nextTrigger);
  assert.equal(h.frames.size, 0);
});

test('reduced motion closes immediately and restores focus to the showroom if its trigger disappeared', () => {
  const h = harness({reduced:true});
  h.open();
  h.trigger.isConnected = false;
  h.controller.close();
  assert.equal(h.dialog.open, false);
  assert.equal(h.timers.size, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.doc.activeElement, h.viewport);
});

test('changing to reduced motion completes a pending close immediately', () => {
  const h = harness();
  h.open();
  h.controller.close();
  h.motion.matches = true;
  h.motion.dispatchEvent(event('change', {matches:true}));
  assert.equal(h.dialog.open, false);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.closed, ['alpha']);
});

test('backdrop drag and inside-to-outside gestures do not dismiss; a short outside click does', () => {
  const h = harness();
  h.open();
  const pointer = (type, x, y) => h.dialog.dispatchEvent(event(type, {pointerId:1, isPrimary:true, button:0, clientX:x, clientY:y}));
  pointer('pointerdown', 50, 50);
  pointer('pointerup', 90, 50);
  assert.equal(h.controller.getState().phase, 'open');
  pointer('pointerdown', 200, 200);
  pointer('pointerup', 50, 50);
  assert.equal(h.controller.getState().phase, 'open');
  pointer('pointerdown', 50, 50);
  pointer('pointerup', 51, 51);
  assert.equal(h.controller.getState().phase, 'closing');
});

test('missing native modal support uses normal catalogue navigation', () => {
  const h = harness({modal:false});
  h.open('alpha');
  assert.deepEqual(h.navigations, [base + 'projekty/alpha/']);
  assert.deepEqual(h.opened, []);
  assert.equal(h.dialog.open, false);
});

test('external close request targets the active project and destroy releases handlers', () => {
  const h = harness({reduced:true});
  h.open();
  h.doc.dispatchEvent(event('progresskit:close-project', {detail:{id:'beta'}}));
  assert.equal(h.dialog.open, true);
  h.doc.dispatchEvent(event('progresskit:close-project', {detail:{id:'alpha'}}));
  assert.equal(h.dialog.open, false);
  h.controller.destroy();
  h.open();
  assert.equal(h.dialog.open, false);
  assert.equal(h.timers.size, 0);
});

test('an obsolete image error cannot hide the next project image', () => {
  const media = {src:'assets/projects/alpha/a.webp', width:1080, height:2400, alt:'Autentyczny ekran'};
  const h = harness({rows:[project('alpha', {gallery:[media]}), project('beta', {gallery:[media]})]});
  h.open();
  const previousImage = h.nodes['image-slot'].children[0];
  h.open('beta');
  const currentImage = h.nodes['image-slot'].children[0];
  previousImage.dispatchEvent(event('error'));
  assert.equal(h.nodes.figure.hidden, false);
  assert.equal(h.nodes.identity.hidden, true);
  currentImage.dispatchEvent(event('error'));
  assert.equal(h.nodes.figure.hidden, true);
  assert.equal(h.nodes.identity.hidden, false);
});

test('a close listener may open another project without focus returning behind the modal', () => {
  const h = harness({reduced:true});
  h.doc.addEventListener('progresskit:hologram-close', e => {
    if (e.detail.id === 'alpha') h.open('beta');
  });
  h.open();
  h.controller.close();
  assert.deepEqual(h.controller.getState(), {id:'beta', phase:'open'});
  assert.equal(h.dialog.open, true);
  assert.equal(h.doc.activeElement, h.nodes.close);
  assert.equal(h.doc.documentElement.classList.contains('project-hologram-active'), true);
});

test('reopening and switching projects reset the shared scroller before focus enters the presentation', () => {
  const h = harness({reduced:true});
  const scrollAtFocus = [];
  h.nodes.close.focus = () => { scrollAtFocus.push(h.nodes.surface.scrollTop); h.doc.activeElement = h.nodes.close; };
  h.open('alpha');
  h.nodes.surface.scrollTop = 600;
  h.controller.close();
  h.open('beta');
  assert.equal(h.nodes.surface.scrollTop, 0);
  h.nodes.surface.scrollTop = 420;
  h.open('alpha');
  assert.equal(h.nodes.surface.scrollTop, 0);
  assert.deepEqual(scrollAtFocus, [0, 0, 0]);
  assert.equal(h.dialog.open, true);
  assert.deepEqual(h.opened, ['alpha', 'beta', 'alpha']);
  assert.deepEqual(h.closed, ['alpha']);
});
