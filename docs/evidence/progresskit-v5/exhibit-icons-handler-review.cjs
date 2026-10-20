'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const sourcePath = path.resolve('assets/engineering-exhibit.js');
const source = fs.readFileSync(sourcePath, 'utf8');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function mount(horizontal = true, reduced = false) {
  const state = {focus:null};
  const classList = () => ({values:new Set(),add(x){this.values.add(x);},remove(x){this.values.delete(x);}});
  const controls = {hidden:true,attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const buttons=[], panels=[], media=[];
  for (let index=0; index<6; index++) {
    const id='project-'+index;
    const summary={focus(){state.focus=summary;}};
    const analysis={open:false,querySelector(selector){return selector==='summary'?summary:null;}};
    const disclosure={open:index===0};
    const panel={id:'panel-'+id,dataset:{engineeringCase:id},classList:classList(),hidden:false,attrs:{},
      querySelector(selector){return selector==='[data-engineering-disclosure]'?disclosure:selector==='[data-engineering-analysis]'?analysis:null;},
      setAttribute(k,v){this.attrs[k]=v;},closest(selector){return selector==='[data-engineering-case]'?panel:null;}};
    const button={id:'tab-'+id,dataset:{engineeringSelect:id},attrs:{},listeners:{},
      setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},
      focus(){state.focus=button;},scrollIntoView(){state.scrolled=button;}};
    panel.analysis=analysis;panel.summary=summary;panel.disclosure=disclosure;
    buttons.push(button);panels.push(panel);
  }
  const root={classList:classList(),listeners:{},querySelector(){return controls;},
    querySelectorAll(selector){return selector==='[data-engineering-select]'?buttons:panels;},
    addEventListener(k,fn){this.listeners[k]=fn;}};
  const doc={readyState:'complete',querySelectorAll(){return [root];}};
  const win={matchMedia(query){const m={matches:query.includes('max-width')?horizontal:reduced,listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}};media.push(m);return m;}};
  vm.runInNewContext(source,{document:doc,window:win});
  const selected=()=>buttons.findIndex(b=>b.attrs['aria-selected']==='true');
  const key=(index,key,extra={})=>{const event={key,prevented:false,preventDefault(){this.prevented=true;},...extra};buttons[index].listeners.keydown(event);return event;};
  const invariant=(index)=>{
    assert.equal(selected(),index);
    assert.equal(buttons.filter(b=>b.tabIndex===0).length,1);
    assert.equal(panels.filter(p=>!p.hidden).length,1);
    assert.equal(panels.filter(p=>p.disclosure.open).length,1);
    assert.equal(panels[index].hidden,false);
    assert.equal(panels[index].disclosure.open,true);
  };
  return {state,controls,buttons,panels,root,media,selected,key,invariant};
}
check('horizontal ignored Up/Down keep selection and native defaults',()=>{
 const h=mount(true);for(const k of ['ArrowUp','ArrowDown'])assert.equal(h.key(0,k).prevented,false);h.invariant(0);
});
check('vertical ignored Left/Right keep selection and native defaults',()=>{
 const h=mount(false);for(const k of ['ArrowLeft','ArrowRight'])assert.equal(h.key(0,k).prevented,false);h.invariant(0);
});
check('horizontal Right/Left changes selection, wraps, and focuses its tab',()=>{
 const h=mount(true);assert.equal(h.key(0,'ArrowLeft').prevented,true);h.invariant(5);assert.equal(h.state.focus,h.buttons[5]);h.key(5,'ArrowRight');h.invariant(0);
});
check('vertical Down/Up changes selection, wraps, and focuses its tab',()=>{
 const h=mount(false);assert.equal(h.key(0,'ArrowUp').prevented,true);h.invariant(5);assert.equal(h.state.focus,h.buttons[5]);h.key(5,'ArrowDown');h.invariant(0);
});
check('Home/End work in both orientations',()=>{
 for(const orientation of [false,true]){const h=mount(orientation);h.key(0,'End');h.invariant(5);h.key(5,'Home');h.invariant(0);}
});
check('modified arrows keep native defaults',()=>{
 const h=mount();for(const option of ['altKey','ctrlKey','metaKey'])assert.equal(h.key(0,'ArrowRight',{[option]:true}).prevented,false);h.invariant(0);
});
check('click activates exactly its panel and focuses the selected tab',()=>{
 const h=mount();h.buttons[3].listeners.click();h.invariant(3);assert.equal(h.state.focus,h.buttons[3]);
});
check('Escape closes nested analysis and focuses its native summary',()=>{
 const h=mount();h.buttons[2].listeners.click();const panel=h.panels[2];panel.analysis.open=true;let prevented=false;
 h.root.listeners.keydown({key:'Escape',target:panel,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(panel.analysis.open,false);assert.equal(h.state.focus,panel.summary);h.invariant(2);
});
check('second Escape returns to the selected tab',()=>{
 const h=mount();h.buttons[4].listeners.click();const panel=h.panels[4];h.state.focus=panel;
 h.root.listeners.keydown({key:'Escape',target:panel,preventDefault(){}});assert.equal(h.state.focus,h.buttons[4]);h.invariant(4);
});
check('Escape in a hidden panel leaves focus and state alone',()=>{
 const h=mount();let prevented=false;h.root.listeners.keydown({key:'Escape',target:h.panels[3],preventDefault(){prevented=true;}});assert.equal(prevented,false);h.invariant(0);
});
check('orientation change updates ARIA and keyboard contract without selecting a project',()=>{
 const h=mount(true);h.buttons[2].listeners.click();const m=h.media.find(m=>m.matches===true);m.matches=false;m.listeners.change();
 assert.equal(h.controls.attrs['aria-orientation'],'vertical');h.invariant(2);assert.equal(h.key(2,'ArrowRight').prevented,false);h.key(2,'ArrowDown');h.invariant(3);
});
check('reduced motion suppresses entry class and clears an existing entry class',()=>{
 const reduced=mount(true,true);reduced.buttons[2].listeners.click();assert.equal(reduced.panels[2].classList.values.has('is-entering'),false);
 const moving=mount(true,false);moving.buttons[2].listeners.click();assert.equal(moving.panels[2].classList.values.has('is-entering'),true);
 const motion=moving.media.find(m=>m.matches===false);motion.matches=true;motion.listeners.change();assert.equal(moving.panels[2].classList.values.has('is-entering'),false);
});
check('ARIA tabs and panels retain all labels and control relationships',()=>{
 const h=mount();assert.equal(h.controls.attrs.role,'tablist');assert.equal(h.controls.hidden,false);
 for(let i=0;i<6;i++){assert.equal(h.buttons[i].attrs.role,'tab');assert.equal(h.panels[i].attrs.role,'tabpanel');assert.equal(h.panels[i].attrs['aria-labelledby'],h.buttons[i].id);}
});
console.log(JSON.stringify({checks,failures:0,source:sourcePath,sha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),scope:'actual production handlers in synthetic DOM; not browser focus/render/touch proof'}));
