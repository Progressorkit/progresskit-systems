const { test } = require('node:test');
const assert = require('node:assert/strict');
const filters = require('../assets/site-v5.js');
const projects = [
  { category:'mobile',stage:'W rozwoju',technologies:['C#','SQLite'],search:'Glikemia Premium osobisty dziennik pomiarów aplikacje mobilne C# SQLite' },
  { category:'saas',stage:'Prototyp',technologies:['TypeScript','PostgreSQL'],search:'GoTransport360 przewoźnicy przesyłki SaaS i biznes TypeScript PostgreSQL' },
  { category:'web',stage:'',technologies:[],search:'Materiały źródłowe realizacje WWW' },
];
test('Polish search ignores accents, letter case and redundant whitespace', () => {
  assert.equal(filters.matches(projects[0],{q:'  GLIKEMIA   POMIAROW '}),true);
  assert.equal(filters.matches(projects[1],{q:'przesylki'}),true);
  assert.equal(filters.normalize('ŹRÓDŁO'), 'zrodlo');
});
test('Every search word must match; unknown query returns an empty result', () => {
  assert.equal(projects.filter(p => filters.matches(p,{q:'glikemia przewozy'})).length,0);
  assert.equal(filters.matches(projects[1],{q:'TypeScript przewoźnicy'}),true);
});
test('Category, technology and stage combine, and technology matching is exact', () => {
  assert.equal(filters.matches(projects[0],{category:'mobile',technology:'SQLite',stage:'W rozwoju'}),true);
  assert.equal(filters.matches(projects[0],{category:'saas'}),false);
  assert.equal(filters.matches(projects[0],{technology:'SQL'}),false);
  assert.equal(filters.matches(projects[0],{stage:'Prototyp'}),false);
});
test('Unknown stage is distinct from implemented maturity levels', () => {
  assert.equal(filters.matches(projects[2],{stage:'unverified'}),true);
  assert.equal(filters.matches(projects[0],{stage:'unverified'}),false);
});
test('Share links preserve deployment subpath, campaign and anchor while roundtripping filters', () => {
  const state={q:'glikemia C#',category:'mobile',technology:'C#',stage:'W rozwoju',project:'glikemia-premium'};
  const url=filters.url('https://example.org/progresskit-systems/?utm_source=test#projekty',state);
  assert.equal(url.pathname,'/progresskit-systems/');
  assert.equal(url.hash,'#projekty');
  assert.equal(url.searchParams.get('utm_source'),'test');
  assert.deepEqual(filters.read(url.href),state);
});
test('Reset removes filter parameters without losing campaign context', () => {
  const url=filters.url('https://example.org/?q=test&kategoria=saas&etap=Beta&projekt=a&utm_source=release',{});
  assert.equal(url.search,'?utm_source=release');
});
test('Search treats markup as text and limits restored query length', () => {
  assert.equal(filters.matches(projects[0],{q:'<script>alert(1)</script>'}),false);
  assert.equal(filters.read('https://example.org/?q='+ 'x'.repeat(500)).q.length,160);
});
test('Opening another drawer and then closing it leaves a restorable single project state', () => {
  const cards = ['a','b'].map(id => ({ id, node:{hidden:false}, details:{open:false} }));
  filters.setOpenProject(cards,'a');
  assert.deepEqual(cards.map(c => c.details.open),[true,false]);
  filters.setOpenProject(cards,'b');
  assert.deepEqual(cards.map(c => c.details.open),[false,true]);
  filters.setOpenProject(cards,'');
  assert.deepEqual(cards.map(c => c.details.open),[false,false]);
});
test('Filtering a project closes its drawer and clearing filters does not resurrect an unlinked drawer', () => {
  const cards = [{id:'a',node:{hidden:false},details:{open:false}}];
  filters.setOpenProject(cards,'a');
  cards[0].node.hidden=true;
  filters.setOpenProject(cards,'');
  assert.equal(cards[0].details.open,false);
  cards[0].node.hidden=false;
  filters.setOpenProject(cards,'');
  assert.equal(cards[0].details.open,false);
});
test('Hover cannot switch category while crossing another row or tapping a touchscreen', () => {
  assert.equal(filters.categoryHover({finePointer:true,rows:1,pointerType:'mouse'}),true);
  assert.equal(filters.categoryHover({finePointer:true,rows:2,pointerType:'mouse'}),false);
  assert.equal(filters.categoryHover({finePointer:true,rows:1,pointerType:'touch'}),false);
  assert.equal(filters.categoryHover({finePointer:false,rows:1,pointerType:'mouse'}),false);
  assert.equal(filters.categoryHover({finePointer:true,rows:1,pointerType:'mouse',focusedOther:true}),false);
});
test('Keyboard activation retains native disclosure behavior after a mouse hover', () => {
  assert.equal(filters.categoryClick({detail:0,hoverOpened:true,isOpen:true}),'native');
  assert.equal(filters.categoryClick({detail:1,hoverOpened:true,isOpen:true}),'pin');
  assert.equal(filters.categoryClick({detail:1,hoverOpened:false,isOpen:true}),'native');
  assert.equal(filters.categoryClick({detail:1,hoverOpened:false,isOpen:false}),'native');
});
test('A touch pointer leaving on a hybrid laptop cannot trigger the mouse close timer', () => {
  assert.equal(filters.categoryPointerAllowed({finePointer:true,pointerType:'touch'}),false);
  assert.equal(filters.categoryPointerAllowed({finePointer:true,pointerType:'mouse'}),true);
  assert.equal(filters.categoryPointerAllowed({finePointer:false,pointerType:'mouse'}),false);
});

test('Product kind stays independent from maturity and restores through shared URLs', () => {
  const product={...projects[0],classification:'product'};
  const concept={...projects[0],classification:'concept',stage:'Koncepcja'};
  assert.equal(filters.matches(product,{classification:'product'}),true);
  assert.equal(filters.matches(concept,{classification:'product'}),false);
  assert.equal(filters.matches(concept,{classification:'concept',stage:'Koncepcja'}),true);
  const url=filters.url('https://example.org/?utm_source=test',{classification:'concept'});
  assert.equal(filters.read(url.href).classification,'concept');
  assert.equal(filters.url(url.href,{}).search,'?utm_source=test');
});
