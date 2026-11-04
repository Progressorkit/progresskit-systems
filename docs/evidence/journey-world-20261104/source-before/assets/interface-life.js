/* Shared physical response: visible surfaces only, with event-scheduled frames. */
(function () {
  'use strict';
  function motionQuality(input) {
    return input.narrow || input.saveData ||
      (input.cores > 0 && input.cores <= 4) ||
      (input.memory > 0 && input.memory <= 4) ? 'compact' : 'full';
  }
  function motionPaused(input) {
    return Boolean(input.userPaused || input.scenePaused || input.reduced || input.hidden);
  }
  if (typeof module === 'object' && module.exports) module.exports = { motionQuality, motionPaused };
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const mechanism = document.querySelector('[data-showroom-motion-toggle]');
  const scene = document.querySelector('[data-hero-motion-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 700px)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const surfaces = [...document.querySelectorAll('.world-surface')];
  const chapters = [...document.querySelectorAll('.home-chapter')];
  const production = document.querySelector('.production-line');
  const stages = [...(production?.querySelectorAll('[data-production-stage]') || [])];
  const observed = [...new Set([...surfaces, ...chapters, ...(production ? [production] : [])])];
  const hasVisibilityObserver = typeof IntersectionObserver !== 'undefined';
  const visible = new Set(hasVisibilityObserver ? [] : observed);
  const pointerWork = new Map();
  const pointerProperties = ['--world-x', '--world-y', '--world-tilt-x', '--world-tilt-y'];
  let leaving = false, paused = true, quality = 'compact', frame = 0;
  let productionInView = Boolean(production) && !hasVisibilityObserver;
  let productionDirty = false;

  const clamp = value => Math.max(0, Math.min(1, value));
  const resetSurface = surface => pointerProperties.forEach(name => surface.style.removeProperty(name));
  const canRespond = surface => !paused && quality === 'full' && fine.matches && visible.has(surface);

  function cancelUnusedFrame() {
    if (frame && !pointerWork.size && !productionDirty) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function renderProduction(progress) {
    if (!production || !stages.length) return;
    production.style.setProperty('--process-progress', String(Number(progress.toFixed(4))));
    const active = Math.min(stages.length - 1, Math.floor(progress * stages.length));
    stages.forEach((stage, index) => {
      const state = progress >= 1 || index < active ? 'complete'
        : progress > 0 && index === active ? 'active' : 'pending';
      if (stage.dataset.productionState !== state) stage.dataset.productionState = state;
    });
  }

  function renderFrame() {
    frame = 0;
    if (paused) { pointerWork.clear(); productionDirty = false; return; }
    for (const [surface, pointer] of pointerWork) {
      if (!canRespond(surface)) continue;
      const bounds = surface.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) continue;
      const x = clamp((pointer.x - bounds.left) / bounds.width);
      const y = clamp((pointer.y - bounds.top) / bounds.height);
      surface.style.setProperty('--world-x', `${(x * 100).toFixed(2)}%`);
      surface.style.setProperty('--world-y', `${(y * 100).toFixed(2)}%`);
      surface.style.setProperty('--world-tilt-x', `${((.5 - y) * 2.4).toFixed(2)}deg`);
      surface.style.setProperty('--world-tilt-y', `${((x - .5) * 2.4).toFixed(2)}deg`);
    }
    pointerWork.clear();
    if (productionDirty && productionInView && production) {
      const bounds = production.getBoundingClientRect();
      // A short horizontal assembly and a tall mobile line cross the same
      // viewport inspection point; no section is pinned or scroll intercepted.
      const travel = Math.max(bounds.height, window.innerHeight * .42);
      renderProduction(clamp((window.innerHeight * .72 - bounds.top) / travel));
    }
    productionDirty = false;
  }

  function scheduleFrame() {
    if (!frame) frame = requestAnimationFrame(renderFrame);
  }

  function scheduleProduction() {
    if (paused || !productionInView || !stages.length) return;
    productionDirty = true;
    scheduleFrame();
  }

  function sync() {
    paused = motionPaused({
      userPaused: mechanism?.getAttribute('aria-pressed') === 'true',
      scenePaused: scene?.getAttribute('aria-pressed') === 'true',
      reduced: reduced.matches, hidden: document.hidden || leaving
    });
    quality = motionQuality({ narrow: narrow.matches,
      saveData: navigator.connection?.saveData, cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory });
    html.dataset.interfaceQuality = quality;
    if (paused || quality !== 'full' || !fine.matches) {
      pointerWork.clear();
      surfaces.forEach(resetSurface);
    }
    if (paused) {
      productionDirty = false;
      cancelUnusedFrame();
      // Reduced motion presents the entire engineering line statically.
      if (reduced.matches) renderProduction(1);
    } else {
      cancelUnusedFrame();
      scheduleProduction();
    }
    const state = paused ? 'paused' : 'running';
    if (html.dataset.interfaceMotion !== state) {
      html.dataset.interfaceMotion = state;
      window.dispatchEvent(new CustomEvent('progresskit:motionchange', { detail: { paused } }));
    }
  }
  const observer = new MutationObserver(sync);
  for (const control of [mechanism, scene]) {
    if (control) observer.observe(control, { attributes: true, attributeFilter: ['aria-pressed'] });
  }
  reduced.addEventListener('change', sync);
  narrow.addEventListener('change', sync);
  fine.addEventListener('change', sync);
  navigator.connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => { leaving = true; sync(); });
  addEventListener('pageshow', () => { leaving = false; sync(); });
  addEventListener('scroll', scheduleProduction, { passive: true });
  addEventListener('resize', scheduleProduction, { passive: true });

  surfaces.forEach(surface => {
    surface.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || !canRespond(surface)) return;
      pointerWork.set(surface, { x: event.clientX, y: event.clientY });
      scheduleFrame();
    }, { passive: true });
    const reset = () => { pointerWork.delete(surface); resetSurface(surface); cancelUnusedFrame(); };
    surface.addEventListener('pointerleave', reset);
    surface.addEventListener('pointercancel', reset);
  });
  observed.forEach(element => { element.dataset.worldVisible = String(!hasVisibilityObserver); });
  if (hasVisibilityObserver) {
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const element = entry.target;
        element.dataset.worldVisible = String(entry.isIntersecting);
        if (entry.isIntersecting) visible.add(element);
        else {
          visible.delete(element);
          pointerWork.delete(element);
          if (surfaces.includes(element)) resetSurface(element);
        }
        if (element === production) {
          productionInView = entry.isIntersecting;
          if (productionInView) scheduleProduction();
          else productionDirty = false;
        }
      });
      cancelUnusedFrame();
    }, { threshold: [0, .08] });
    observed.forEach(element => visibility.observe(element));
  }
  sync();
})();
