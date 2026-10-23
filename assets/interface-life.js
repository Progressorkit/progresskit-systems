/* Decorative motion shares the existing user control. No animation loop. */
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
  let leaving = false;
  function sync() {
    const paused = motionPaused({
      userPaused: mechanism?.getAttribute('aria-pressed') === 'true',
      scenePaused: scene?.getAttribute('aria-pressed') === 'true',
      reduced: reduced.matches, hidden: document.hidden || leaving
    });
    html.dataset.interfaceQuality = motionQuality({ narrow: narrow.matches,
      saveData: navigator.connection?.saveData, cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory });
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
  navigator.connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => { leaving = true; sync(); });
  addEventListener('pageshow', () => { leaving = false; sync(); });
  sync();
})();
