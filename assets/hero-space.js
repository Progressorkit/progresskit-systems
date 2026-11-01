'use strict';

// The complete scene moves as one surface. The wall mark never drifts from it.
(() => {
  const hero = document.querySelector('.hero--monument');
  if (!hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)');
  const desktop = window.matchMedia('(min-width:1101px)');
  const stage = document.querySelector('.project-showroom');
  const toggle = hero.querySelector('[data-hero-motion-toggle]');
  let userPaused = false;
  let inView = true;
  let heroInView = true;
  let stageInView = true;
  let frame = 0;
  let pointer = null;
  const globallyPaused = () => document.documentElement.dataset.interfaceMotion === 'paused';
  const reset = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; pointer = null;
    for (const name of ['--scene-x','--scene-y','--light-x','--light-y','--climber-rise','--climber-opacity']) hero.style.removeProperty(name);
  };
  const sync = () => {
    // Sticky hero can intersect the viewport behind later opaque chapters.
    // The first-row section bounds the actual desktop presentation surface.
    inView = heroInView && (!desktop.matches || !stage || stageInView);
    const enabled = !userPaused && !globallyPaused() && !reduced.matches && !document.hidden;
    hero.classList.toggle('hero-motion-paused', userPaused);
    hero.classList.toggle('hero-motion-enabled', enabled);
    hero.classList.toggle('hero-in-view', inView && enabled);
    if (toggle) {
      toggle.disabled = reduced.matches;
      toggle.setAttribute('aria-pressed', String(userPaused));
      const label = reduced.matches ? 'Ruch sceny wyłączony' : userPaused ? 'Wznów ruch sceny' : 'Wstrzymaj ruch sceny';
      if (toggle.firstChild?.nodeType === 3) toggle.firstChild.nodeValue = label;
      else if (toggle.textContent !== label) toggle.textContent = label;
      toggle.title = reduced.matches ? 'Ruch wyłączony przez ustawienie ograniczenia animacji w systemie.' : '';
    }
    if (!enabled || !inView || !fine.matches) reset();
  };
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || userPaused || globallyPaused() || reduced.matches || !fine.matches || !inView || document.hidden) return;
    pointer = { x:event.clientX, y:event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!pointer || userPaused || globallyPaused() || reduced.matches || !inView || document.hidden) return;
      const box = hero.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointer.x - box.left) / box.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointer.y - box.top) / box.height * 2 - 1));
      hero.style.setProperty('--scene-x', `${(x * -5).toFixed(2)}px`);
      hero.style.setProperty('--scene-y', `${(y * -3).toFixed(2)}px`);
      hero.style.setProperty('--light-x', `${(64 + x * 6).toFixed(2)}%`);
      hero.style.setProperty('--light-y', `${(38 + y * 5).toFixed(2)}%`);
      hero.style.setProperty('--climber-rise', `${(-Math.max(0, x) * 1.2).toFixed(2)}px`);
      hero.style.setProperty('--climber-opacity', (.66 + x * .06).toFixed(2));
    });
  }, {passive:true});
  hero.addEventListener('pointerleave', reset);
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (reduced.matches) return;
      userPaused = !userPaused; sync();
    });
    toggle.hidden = false;
    hero.classList.add('hero-has-motion-toggle');
  }
  reduced.addEventListener('change', sync);
  fine.addEventListener('change', sync);
  desktop.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('progresskit:motionchange', sync);
  window.addEventListener('pagehide', () => { hero.classList.remove('hero-in-view'); reset(); });
  window.addEventListener('pageshow', sync);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) heroInView = entry.isIntersecting;
        if (entry.target === stage) stageInView = entry.isIntersecting;
      }
      sync();
    });
    observer.observe(hero);
    if (stage) observer.observe(stage);
  }
  sync();
})();
