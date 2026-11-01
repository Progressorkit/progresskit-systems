'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the shipped site script against a synthetic page with no optional UI.
// These checks exercise client event delivery without contacting production.
function mount({url = 'https://progresskit.pl/', dnt, beacon = true, referrer = ''} = {}) {
  const listeners = new Map(), requests = [], beacons = [], diagnostics = [];
  const document = {
    referrer,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
  };
  const navigator = {doNotTrack:dnt};
  if (beacon !== null) navigator.sendBeacon = (endpoint, body) => {
    beacons.push({endpoint, body});
    return beacon;
  };
  const context = {
    document, navigator, location:new URL(url), URL, URLSearchParams, Blob,
    window:{matchMedia:() => ({matches:false, addEventListener() {}})},
    console:{debug:(...args) => diagnostics.push(args)},
    fetch(endpoint, options) {
      requests.push({endpoint, ...options});
      return Promise.resolve({ok:true});
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/site-v5.js'), 'utf8'), context);
  return {
    beacons, requests, diagnostics,
    emit(type, target) { for (const listener of listeners.get(type) || []) listener({type, target}); },
    click(href, {showroom = false, drawer = false} = {}) {
      // Implements just the selector forms used by the analytics listener.
      const anchor = {href};
      const target = {closest(selector) {
        return selector.split(',').some(part => {
          part = part.trim();
          if (part === '.project-drawer > summary') return drawer;
          if (part.includes(':not([data-showroom-open])') && showroom) return false;
          const match = part.match(/^a\[href([*^]?)="([^"]*)"\]/);
          return match && (match[1] === '^' ? href.startsWith(match[2])
            : match[1] === '*' ? href.includes(match[2]) : href === match[2]);
        }) ? anchor : null;
      }};
      this.emit('click', target);
    },
    async events() {
      return Promise.all(beacons.map(async item => JSON.parse(await item.body.text())));
    },
  };
}

test('homepage sends one page view with bounded campaign and hostname-only referrer', async () => {
  const ui = mount({
    url:'https://progresskit.pl/?utm_source=merge&utm_medium=private%20text&utm_campaign=v5-check&q=private-search#kontakt',
    referrer:'https://example.org/private/path?secret=value',
  });
  assert.deepEqual(await ui.events(), [{
    event_type:'page_view', path:'/', referrer_host:'example.org',
    utm_source:'merge', utm_medium:null, utm_campaign:'v5-check',
  }]);
  assert.equal(ui.beacons[0].endpoint, '/_analytics/event');
  assert.equal(ui.beacons[0].body.type, 'application/json');
  assert.equal(ui.requests.length, 0);
});

test('tracking is disabled outside the production origin and when DNT is enabled', async () => {
  for (const settings of [{url:'http://127.0.0.1:8092/'}, {url:'https://preview.example/'}, {dnt:'1'}]) {
    const ui = mount(settings);
    ui.click('mailto:contact@example.org');
    ui.emit('progresskit:hologram-open');
    ui.emit('progresskit:slice-open');
    assert.deepEqual(await ui.events(), []);
    assert.equal(ui.requests.length, 0);
  }
});

test('contact and both HTTP external link schemes retain their event coverage', async () => {
  const ui = mount();
  ui.click('mailto:contact@example.org');
  ui.click('http://example.org/');
  ui.click('https://example.org/');
  ui.click('#kontakt');
  assert.deepEqual((await ui.events()).map(event => event.event_type),
    ['page_view', 'contact_click', 'external_click', 'external_click']);
});

test('legacy product links and current catalog links each record one project opening', async () => {
  const ui = mount();
  for (const href of ['glikemia-premium/', '/glikemia-premium/', 'progresskit-mail/', '/progresskit-mail/', 'projekty/vaeloria/']) {
    ui.click(href);
  }
  ui.click('', {drawer:true});
  assert.deepEqual((await ui.events()).map(event => event.event_type),
    ['page_view', ...Array(6).fill('project_open')]);
});

test('showroom activation tracks successful slice or hologram events without counting the trigger click twice', async () => {
  const ui = mount();
  ui.click('projekty/vaeloria/', {showroom:true});
  assert.equal((await ui.events()).length, 1);
  ui.emit('progresskit:slice-open');
  ui.click('projekty/progresskit-tax/', {showroom:true});
  ui.emit('progresskit:hologram-open');
  assert.deepEqual((await ui.events()).map(event => event.event_type),
    ['page_view', 'project_open', 'project_open']);
});

test('rejected or unavailable beacon falls back to a single credential-free keepalive POST', async () => {
  for (const beacon of [false, null]) {
    const ui = mount({beacon, url:'https://progresskit.pl/projekty/vaeloria/'});
    assert.equal(ui.beacons.length, beacon === null ? 0 : 1);
    assert.equal(ui.requests.length, 1);
    const request = ui.requests[0];
    assert.equal(request.endpoint, '/_analytics/event');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['Content-Type'], 'application/json');
    assert.equal(request.credentials, 'omit');
    assert.equal(request.keepalive, true);
    assert.deepEqual(JSON.parse(request.body), {
      event_type:'page_view', path:'/projekty/vaeloria/', referrer_host:null,
      utm_source:null, utm_medium:null, utm_campaign:null,
    });
  }
});

test('invalid referrer and oversized campaign do not leak into events', async () => {
  const ui = mount({referrer:'not a URL', url:`https://progresskit.pl/?utm_source=${'x'.repeat(65)}`});
  const [event] = await ui.events();
  assert.equal(event.referrer_host, null);
  assert.equal(event.utm_source, null);
  assert.equal(ui.diagnostics.length, 1);
});
