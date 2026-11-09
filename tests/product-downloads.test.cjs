const test = require('node:test');
const assert = require('node:assert/strict');

const modulePromise = import('../assets/product-downloads.mjs');
const slot = () => ({dataset: {}, textContent: 'Licznik pobrań: ładowanie…'});
const flush = () => new Promise(resolve => setImmediate(resolve));

test('all visible counter slots use the same real backend value', async () => {
  const {createDownloadCounter} = await modulePromise;
  const nodes = [slot(), slot()];
  const paths = [];
  const counter = createDownloadCounter({nodes, fetchJSON: async path => {
    paths.push(path);
    return {downloads: 1287};
  }});
  assert.equal(await counter.refresh(), 1287);
  assert.deepEqual(paths, ['/api/glikemia/downloads']);
  for (const node of nodes) {
    assert.equal(node.dataset.downloadState, 'ready');
    assert.equal(node.textContent, `${new Intl.NumberFormat('pl-PL').format(1287)} pobrań APK`);
  }
});

test('overlapping refreshes share a request and later refreshes read the backend again', async () => {
  const {createDownloadCounter} = await modulePromise;
  let resolve, calls = 0;
  const node = slot();
  const counter = createDownloadCounter({nodes: [node], fetchJSON: () => {
    calls++;
    return new Promise(done => { resolve = done; });
  }});
  const first = counter.refresh();
  assert.equal(counter.refresh(), first);
  await flush();
  assert.equal(calls, 1);
  assert.equal(node.dataset.downloadState, 'loading');
  resolve({downloads: 19});
  await first;
  const second = counter.refresh();
  await flush();
  assert.equal(calls, 2);
  resolve({downloads: 20});
  assert.equal(await second, 20);
});

test('zero is shown only when the backend actually reports zero', async () => {
  const {createDownloadCounter} = await modulePromise;
  const node = slot();
  const counter = createDownloadCounter({nodes: [node], fetchJSON: async () => ({downloads: 0})});
  assert.equal(await counter.refresh(), 0);
  assert.equal(node.textContent, '0 pobrań APK');
  assert.equal(node.dataset.downloadState, 'ready');
});

test('invalid, missing and unsafe counts never become a fake zero or a ready value', async () => {
  const {createDownloadCounter} = await modulePromise;
  for (const value of [null, {}, {downloads: '80'}, {downloads: -1}, {downloads: 0.5},
    {downloads: Number.MAX_SAFE_INTEGER + 1}, {downloads: NaN}, {downloads: Infinity}]) {
    const node = slot();
    const counter = createDownloadCounter({nodes: [node], fetchJSON: async () => value});
    assert.equal(await counter.refresh(), null);
    assert.equal(node.dataset.downloadState, 'error');
    assert.equal(node.textContent, 'Licznik pobrań chwilowo niedostępny');
  }
});

test('an unavailable counter recovers on the next successful backend read', async () => {
  const {createDownloadCounter} = await modulePromise;
  let available = false;
  const node = slot();
  const counter = createDownloadCounter({nodes: [node], fetchJSON: async () => {
    if (!available) throw new Error('network unavailable');
    return {downloads: 41};
  }});
  assert.equal(await counter.refresh(), null);
  assert.equal(node.dataset.downloadState, 'error');
  available = true;
  assert.equal(await counter.refresh(), 41);
  assert.equal(node.dataset.downloadState, 'ready');
});

test('download clicks schedule read-only refreshes without optimistic increments', async () => {
  const {mountDownloadCounters} = await modulePromise;
  const target = extra => Object.assign({
    listeners: new Map(),
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    removeEventListener(name) { this.listeners.delete(name); },
    fire(name, event = {}) { this.listeners.get(name)?.(event); },
  }, extra);
  const node = slot(), timers = new Map(), calls = [];
  let now = 0, total = 17, nextTimer = 0;
  const view = target({
    performance: {now: () => now},
    AbortSignal: {timeout: ms => ({timeout: ms})},
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, {callback, delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    async fetch(path, options) {
      calls.push({path, options});
      return {ok: true, json: async () => ({downloads: total})};
    },
  });
  const root = target({defaultView: view, hidden: false, querySelectorAll: () => [node]});
  const mounted = mountDownloadCounters(root);
  await flush();
  assert.equal(node.textContent, '17 pobrań APK');
  root.fire('click', {target: {closest: () => null}});
  assert.equal(timers.size, 0);
  root.fire('click', {target: {closest: selector => selector.includes('/download/glikemia-premium') ? {} : null}});
  assert.deepEqual([...timers.values()].map(timer => timer.delay), [4000, 12000, 30000]);
  assert.equal(node.textContent, '17 pobrań APK');
  assert.equal(calls.length, 1);
  // Only the server can supply a new count after a completed download.
  total = 18;
  now = 4000;
  const [elapsedId, elapsedTimer] = [...timers.entries()][0];
  timers.delete(elapsedId);
  elapsedTimer.callback();
  await flush();
  assert.equal(node.textContent, '18 pobrań APK');
  for (const {path, options} of calls) {
    assert.equal(path, '/api/glikemia/downloads');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
  }
  view.fire('pagehide');
  assert.equal(timers.size, 0);
  mounted.dispose();
  assert.equal(view.listeners.size, 0);
  assert.equal(root.listeners.size, 0);
});
