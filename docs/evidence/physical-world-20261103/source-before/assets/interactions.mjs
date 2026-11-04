/* Local material interactions. No audio, storage, network or chat service. */
const installation = document.querySelector('.hero--installation');
if (installation) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const compact = matchMedia('(max-width: 700px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const listeners = [];
  let leaving = false, disposed = false;
  const on = (node, type, fn, options) => {
    if (!node) return;
    node.addEventListener(type, fn, options);
    listeners.push(() => node.removeEventListener(type, fn, options));
  };
  const paused = () => reduce.matches || forced.matches || document.hidden || leaving || document.documentElement.dataset.interfaceMotion === 'paused';
  const release = () => document.querySelectorAll('.is-mechanically-pressed').forEach(e => e.classList.remove('is-mechanically-pressed'));
  on(document, 'keydown', event => {
    if (['Enter', ' '].includes(event.key) && event.target.matches('.cta,.showroom-controls button,.showroom-all,.guide-trigger')) event.target.classList.add('is-mechanically-pressed');
  });
  on(document, 'keyup', release);
  on(window, 'blur', release);

  // B / Three proximity surfaces. One bounded pool and one inert Canvas2D layer.
  const targets = [
    document.querySelector('#start .cta--primary'),
    document.querySelector('[data-hero-enter]'),
    document.querySelector('[data-technology-family="security"] > summary'),
  ].filter(Boolean).map((node, i) => ({node, id: ['contact', 'core', 'security'][i], circle: i === 1, bounds: null, visible: false}));
  targets.forEach(t => t.node.dataset.proximityObject = t.id);
  const canvas = document.createElement('canvas');
  canvas.className = 'material-sparks'; canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: true});
  const pool = Array.from({length: 24}, () => ({life: 0}));
  let raf = 0, timer = 0, frames = 0, previous = 0, lastEmission = 0, lastArc = 0;
  let point = null, active = null, intensity = 0, edge = null, touchUntil = 0, touchAnchor = null;
  let emitted = 0, arcs = 0, scale = 1;
  function resize() {
    scale = Math.min(1, 1440 / innerWidth);
    canvas.width = Math.round(innerWidth * scale); canvas.height = Math.round(innerHeight * scale);
    bounds();
  }
  function bounds() { targets.forEach(t => { t.bounds = t.node.getBoundingClientRect(); }); }
  function surface(t) {
    const b = t.bounds, x = point.x, y = point.y;
    if (t.circle) {
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2, radius = b.width / 2;
      const angle = Math.atan2(y - cy, x - cx), distance = Math.hypot(x - cx, y - cy);
      return {x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, distance: Math.max(0, distance - radius), gap: Math.abs(distance - radius), tangent: angle + Math.PI / 2};
    }
    let ex = Math.max(b.left, Math.min(b.right, x)), ey = Math.max(b.top, Math.min(b.bottom, y));
    if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
      const sides = [x - b.left, b.right - x, y - b.top, b.bottom - y], nearest = sides.indexOf(Math.min(...sides));
      if (nearest === 0) ex = b.left; else if (nearest === 1) ex = b.right; else if (nearest === 2) ey = b.top; else ey = b.bottom;
    }
    return {x: ex, y: ey, distance: Math.hypot(Math.max(b.left - x, 0, x - b.right), Math.max(b.top - y, 0, y - b.bottom)), gap: Math.hypot(ex - x, ey - y), tangent: ex === b.left || ex === b.right ? Math.PI / 2 : 0};
  }
  function choose() {
    active = null; intensity = 0; edge = null;
    if (point && !paused()) {
      // Keep a tap attached to its surface when native details expands/reflows.
      // A touch has no hovering cursor; the finite charge follows that object.
      if (touchAnchor && performance.now() < touchUntil && touchAnchor.target.visible) {
        const b = touchAnchor.target.bounds;
        point = {x: b.left + b.width * touchAnchor.x, y: b.top + b.height * touchAnchor.y};
        active = touchAnchor.target; edge = surface(active); intensity = .85;
      }
      let best = 116;
      for (const t of active ? [] : targets) {
        if (!t.visible || t.node.closest('#rdzen')?.dataset.entryState === 'entering') continue;
        const e = surface(t);
        if (e.distance < best) { best = e.distance; active = t; edge = e; intensity = Math.pow(1 - best / 116, 1.7); }
      }
    }
    targets.forEach(t => {
      const value = active === t ? intensity : 0;
      t.node.style.setProperty('--proximity', value.toFixed(3));
      t.node.dataset.proximity = value.toFixed(3);
    });
    if (active) schedule();
  }
  function emit(now) {
    if (!active || !edge || now - lastEmission < 190 - intensity * 130) return;
    const max = compact.matches ? 8 : 24;
    const p = pool.slice(0, max).find(p => p.life <= 0);
    if (!p) return;
    const spread = (Math.random() - .5) * 24, tangent = edge.tangent;
    Object.assign(p, {x: edge.x + Math.cos(tangent) * spread, y: edge.y + Math.sin(tangent) * spread,
      vx: Math.cos(tangent) * (Math.random() - .5) * 58 + (Math.random() - .5) * 22,
      vy: Math.sin(tangent) * (Math.random() - .5) * 58 - 14 - Math.random() * 16,
      life: .24 + Math.random() * .32, total: .56, hot: Math.random() > .55});
    emitted++; lastEmission = now;
  }
  function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  function stop(clearPool = false) {
    cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0; previous = 0;
    if (clearPool) { pool.forEach(p => p.life = 0); clear(); }
  }
  function draw(now) {
    raf = 0;
    if (paused() || disposed) { stop(true); return; }
    if (touchUntil && now > touchUntil) { point = null; touchUntil = 0; touchAnchor = null; choose(); }
    const dt = Math.min(.05, previous ? (now - previous) / 1000 : .033); previous = now;
    clear(); ctx.setTransform(scale, 0, 0, scale, 0, 0); emit(now);
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const alpha = Math.max(0, p.life / p.total);
      ctx.globalAlpha = alpha; ctx.lineWidth = 1.2; ctx.strokeStyle = '#c9304d';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .055, p.y - p.vy * .055); ctx.stroke();
      if (p.hot) { ctx.fillStyle = '#ffe0d7'; ctx.fillRect(p.x, p.y, .9, .9); }
    }
    // A very short surface-to-pointer discharge; sparse and confined to 38px.
    if (active && edge && edge.gap > 3 && edge.gap < 38 && intensity > .55 && now - lastArc > 650) {
      ctx.globalAlpha = .7; ctx.strokeStyle = '#d94b61'; ctx.lineWidth = .65; ctx.beginPath(); ctx.moveTo(edge.x, edge.y);
      ctx.lineTo((edge.x + point.x) / 2 + 2.5, (edge.y + point.y) / 2 - 2); ctx.lineTo(point.x, point.y); ctx.stroke();
      ctx.fillStyle = '#ffe9df'; ctx.fillRect(edge.x, edge.y, 1.2, 1.2); lastArc = now; arcs++;
    }
    ctx.globalAlpha = 1; frames++;
    if (active || pool.some(p => p.life > 0)) schedule(); else previous = 0;
  }
  function schedule() {
    if (!raf && !timer && !disposed && !paused()) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(draw); }, 1000 / (compact.matches ? 24 : 30));
  }
  function sync() { if (paused()) { point = null; touchAnchor = null; touchUntil = 0; choose(); stop(true); } }
  const observer = new IntersectionObserver(entries => {
    for (const e of entries) { const t = targets.find(t => t.node === e.target); t.visible = e.isIntersecting; }
    bounds(); choose();
  }, {threshold: .01});
  targets.forEach(t => observer.observe(t.node));
  const ro = new ResizeObserver(() => { bounds(); choose(); });
  targets.forEach(t => ro.observe(t.node));
  on(document, 'pointermove', e => { if (!fine.matches || e.pointerType === 'touch' || paused()) return; point = {x: e.clientX, y: e.clientY}; choose(); }, {passive: true});
  on(document, 'pointerleave', e => {
    // Touch releases implicit pointer capture immediately after a tap. Keep the
    // finite charge alive until its deadline instead of cancelling before frame 1.
    if (e.pointerType === 'touch' && performance.now() < touchUntil) return;
    point = null; choose();
  });
  on(document, 'pointerdown', e => {
    if (e.pointerType !== 'touch' || paused() || !targets.some(t => t.node.contains(e.target))) return;
    bounds(); const target = targets.find(t => t.node.contains(e.target));
    touchAnchor = {target, x: (e.clientX - target.bounds.left) / target.bounds.width, y: (e.clientY - target.bounds.top) / target.bounds.height};
    point = {x: e.clientX, y: e.clientY}; touchUntil = performance.now() + 620; choose();
  }, {passive: true});
  on(window, 'scroll', () => { if (performance.now() >= touchUntil) point = null; bounds(); choose(); }, {passive: true});
  on(window, 'resize', resize, {passive: true});
  on(window, 'blur', () => { point = null; choose(); stop(true); });
  on(window, 'progresskit:motionchange', sync); on(document, 'visibilitychange', sync);
  on(reduce, 'change', sync); on(forced, 'change', sync);
  // C / A local signal disturbance, only on activation; never an idle overlay.
  let signalCount = 0, lastSignal = -Infinity;
  const signals = new Map();
  function clearSignals() {
    for (const [node, record] of signals) {
      clearTimeout(record.timer); record.film.remove(); delete node.dataset.signalActive;
    }
    signals.clear();
  }
  function signal(node) {
    const now = performance.now();
    if (!node || paused() || now - lastSignal < 1800) return;
    lastSignal = now; signalCount++;
    const film = document.createElement('span'); film.className = 'signal-film'; film.setAttribute('aria-hidden', 'true');
    node.dataset.signalActive = 'true'; node.append(film);
    const timer = setTimeout(() => { film.remove(); delete node.dataset.signalActive; signals.delete(node); }, 280);
    signals.set(node, {film, timer});
  }
  on(document, 'progresskit:core-charge', () => signal(document.querySelector('.hero-core-flight')));
  on(document, 'progresskit:slice-open', e => signal(document.getElementById(`slice-panel-${e.detail.id}`)));
  on(document, 'toggle', e => {
    if (!e.target.matches('.technology-group') || !e.target.open) return;
    const summary = e.target.querySelector('summary');
    if (e.target.dataset.technologyFamily === 'media') signal(summary);
    // A two-column mobile instrument expands to full width. Keep its heading
    // visible when grid reflow moves it below the finger's original position.
    if (compact.matches) {
      const box = summary.getBoundingClientRect();
      if (box.top > innerHeight * .6 || box.bottom > innerHeight) summary.scrollIntoView({block: 'start', behavior: paused() ? 'instant' : 'smooth'});
    }
  }, true);
  on(window, 'progresskit:motionchange', () => { if (paused()) clearSignals(); });
  on(document, 'visibilitychange', () => { if (paused()) clearSignals(); });
  on(reduce, 'change', () => { if (paused()) clearSignals(); });
  on(forced, 'change', () => { if (paused()) clearSignals(); });
  // D / Three contextual explanations, placed in document flow beside their object.
  const guide = document.createElement('aside');
  guide.className = 'context-guide'; guide.id = 'progresskit-guide'; guide.hidden = true;
  guide.setAttribute('aria-label', 'Przewodnik ProgressKit');
  guide.innerHTML = '<span class="guide-drone" aria-hidden="true"><i class="guide-drone__fin guide-drone__fin--left"></i><i class="guide-drone__fin guide-drone__fin--right"></i><i class="guide-drone__body"><i class="guide-drone__eye"></i></i><i class="guide-drone__keel"></i></span><div class="context-guide__copy"><span class="context-guide__eyebrow">PROGRESSKIT / PRZEWODNIK</span><strong class="context-guide__title"></strong><p aria-live="polite"></p><button class="guide-disable" type="button">Wyłącz przewodnika</button></div><button class="guide-close" type="button" aria-label="Zamknij podpowiedź">×</button>';
  let guideDisabled = false, guideContext = '', guideTimer = 0;
  const guideVisibility = new IntersectionObserver(entries => entries.forEach(e => { e.target.dataset.guideVisible = String(e.isIntersecting); }));
  guideVisibility.observe(guide);
  const contexts = new Map(), guideNodes = [], dismissed = new Set();
  const security = document.querySelector('[data-production-stage="security"]');
  const postgres = [...document.querySelectorAll('#technologie .technology-chip')].find(n => n.getAttribute('href').endsWith('technologia=PostgreSQL'));
  const showroom = document.querySelector('[data-showroom]');
  const projectLink = document.querySelector('[data-showroom-open="glikemia-premium"]');
  const project = JSON.parse(document.querySelector('#showroom-data').textContent).find(p => p.id === 'glikemia-premium');
  function dock(className) {
    const node = document.createElement('div'); node.className = `guide-dock ${className}`; guideNodes.push(node); return node;
  }
  function trigger(title) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'guide-trigger';
    button.setAttribute('aria-label', `Objaśnij: ${title}`); button.setAttribute('aria-controls', guide.id); button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span aria-hidden="true">i</span>'; return button;
  }
  function hideGuide(returnFocus = false) {
    clearTimeout(guideTimer); guideTimer = 0;
    const previous = contexts.get(guideContext), hadFocus = guide.contains(document.activeElement);
    guide.hidden = true; guideContext = '';
    contexts.forEach(c => c.button.setAttribute('aria-expanded', 'false'));
    if (returnFocus && hadFocus) previous?.button.focus({preventScroll: true});
  }
  function showGuide(key, explicit = false) {
    clearTimeout(guideTimer); guideTimer = 0;
    if (guideDisabled || (!explicit && dismissed.has(key))) return;
    const c = contexts.get(key); if (!c || guideContext === key) return;
    hideGuide(); dismissed.delete(key); guideContext = key;
    c.host.append(guide); guide.hidden = false; guide.dataset.context = key;
    guide.querySelector('strong').textContent = c.title; guide.querySelector('p').textContent = c.text;
    c.button.setAttribute('aria-expanded', 'true'); signal(guide);
  }
  function delayedGuide(key) {
    clearTimeout(guideTimer);
    if (fine.matches && !guideDisabled && !dismissed.has(key)) guideTimer = setTimeout(() => showGuide(key), 550);
  }
  function context(key, title, text, target, host, parent) {
    const button = trigger(title); parent.append(button); contexts.set(key, {button, target, host, title, text});
    on(target, 'pointerenter', e => { if (e.pointerType !== 'touch') delayedGuide(key); });
    on(target, 'pointerleave', () => { clearTimeout(guideTimer); guideTimer = 0; dismissed.delete(key); });
    on(button, 'focus', () => { if (fine.matches) showGuide(key); });
    on(button, 'click', () => showGuide(key, true));
    if (target.matches('a')) on(target, 'focus', () => showGuide(key));
  }
  if (security) {
    const host = dock('guide-dock--security'); security.closest('.production-space').after(host);
    context('security', 'Security', 'Ta warstwa obejmuje kontrolę dostępu i testy negatywne. Zakres weryfikacji znajdziesz przy konkretnym projekcie.', security, host, security.querySelector('h3'));
  }
  if (postgres) {
    const host = dock('guide-dock--technology'), item = document.createElement('div'), row = document.createElement('div');
    item.className = 'technology-guide-item'; row.className = 'technology-guide-row'; postgres.before(item); row.append(postgres); item.append(row, host);
    context('postgres', 'PostgreSQL', 'Warstwa danych używana w systemach, które wymagają trwałości i spójności.', row, host, row);
    on(postgres, 'focus', () => showGuide('postgres'));
  }
  if (project && projectLink) {
    const host = dock('guide-dock--project'), line = document.createElement('div'), label = document.createElement('span');
    line.className = 'project-guide-label'; label.textContent = project.name; line.append(label);
    showroom.querySelector('.showroom-controls').after(host); host.append(line);
    context('glikemia', project.name, project.summary.split('. ')[0] + '.', projectLink, host, line);
  }
  const guideToggle = document.createElement('button'); guideToggle.type = 'button'; guideToggle.className = 'guide-global-toggle';
  guideToggle.textContent = 'Wyłącz przewodnika'; guideToggle.setAttribute('aria-pressed', 'false');
  document.querySelector('footer .footer__links').append(guideToggle);
  function disableGuide(value) {
    guideDisabled = value; hideGuide();
    contexts.forEach(c => { c.button.disabled = value; });
    guideToggle.setAttribute('aria-pressed', String(value));
    guideToggle.textContent = value ? 'Włącz przewodnika' : 'Wyłącz przewodnika';
  }
  on(guideToggle, 'click', () => disableGuide(!guideDisabled));
  on(guide.querySelector('.guide-close'), 'click', () => { dismissed.add(guideContext); hideGuide(true); });
  on(guide.querySelector('.guide-disable'), 'click', () => { disableGuide(true); guideToggle.focus({preventScroll: true}); });
  on(document, 'keydown', e => { if (e.key === 'Escape' && guideContext) { dismissed.add(guideContext); hideGuide(true); } });
  const guideObserver = new MutationObserver(() => {
    if (showroom.dataset.relatedProject === 'glikemia-premium') delayedGuide('glikemia');
    else { clearTimeout(guideTimer); guideTimer = 0; dismissed.delete('glikemia'); }
  });
  if (showroom) guideObserver.observe(showroom, {attributes: true, attributeFilter: ['data-related-project']});
  on(document, 'visibilitychange', () => { if (document.hidden) { clearTimeout(guideTimer); hideGuide(); } });
  on(document, 'toggle', e => { if (e.target.matches('[data-technology-family="data"]') && !e.target.open && guideContext === 'postgres') hideGuide(); }, true);

  function dispose() {
    if (disposed) return; disposed = true; hideGuide(); guideVisibility.disconnect(); guideObserver.disconnect(); guide.remove(); guideToggle.remove(); contexts.forEach(c => c.button.remove()); guideNodes.forEach(n => n.remove()); clearSignals(); stop(true); observer.disconnect(); ro.disconnect();
    listeners.splice(0).forEach(f => f()); canvas.remove();
  }
  on(window, 'pagehide', e => { leaving = true; sync(); if (!e.persisted) dispose(); });
  on(window, 'pageshow', () => { leaving = false; sync(); });
  installation.interactions = {metrics: () => ({frames, pending: !!(raf || timer), active: active?.id || null, intensity, alive: pool.filter(p => p.life > 0).length, poolSize: pool.length, emitted, arcs, signalCount, signalsActive: signals.size, guideContext, guideDisabled, guideContexts: contexts.size, paused: paused(), disposed}), dispose};
  resize();
}
