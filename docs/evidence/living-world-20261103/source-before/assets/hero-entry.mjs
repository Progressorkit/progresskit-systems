/* A measured handoff from the hero image to the existing Three.js emblem.
   No duplicate renderer, catalog, project state or persistent visit state. */
const hero = document.querySelector('[data-hero-enter]');
const showroom = document.querySelector('[data-showroom]');
if (hero && showroom) {
  const stage = showroom.querySelector('[data-showroom-viewport]');
  const toggle = showroom.querySelector('[data-capsule-toggle]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let flight = null, frame = 0, busy = false;
  const wake = () => document.dispatchEvent(new CustomEvent('progresskit:showroom-wake', {detail: {awake: true}}));
  const destination = () => {
    const box = stage.getBoundingClientRect();
    const size = Number.parseFloat(toggle.style.getPropertyValue('--core-size')) || (innerWidth <= 700 ? 190 : 240);
    return {x: box.left + (parseFloat(toggle.style.left) || box.width / 2) - size / 2,
      y: box.top + (parseFloat(toggle.style.top) || box.height / 2) - size / 2, size};
  };
  const clear = () => {
    cancelAnimationFrame(frame);
    flight?.remove(); flight = null; busy = false;
    hero.closest('section').classList.remove('hero-entry-flying');
    showroom.classList.remove('hero-entry-landing');
  };
  const finish = (focus = true) => {
    clear(); wake();
    hero.closest('section').dataset.entryState = 'showroom';
    if (focus) stage.focus({preventScroll: true});
  };
  function enter(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    showroom.dataset.heroEntryRequested = 'true';
    const still = reduce.matches || matchMedia('(forced-colors: active)').matches || document.documentElement.dataset.interfaceMotion === 'paused';
    // WebGL failure retains the native project list and an immediate accessible entry.
    if (still || !showroom.classList.contains('showroom-3d-ready')) {
      stage.scrollIntoView({block: 'center', behavior: 'instant'}); finish(); return;
    }
    busy = true;
    const mark = hero.querySelector('img'), from = mark.getBoundingClientRect();
    const startScroll = scrollY;
    const box = stage.getBoundingClientRect();
    const topbar = document.querySelector('.topbar').getBoundingClientRect().height;
    const targetScroll = startScroll + box.top - topbar - Math.max(12, (innerHeight - topbar - box.height) / 2);
    flight = mark.cloneNode(); flight.className = 'hero-core-flight'; flight.alt = ''; flight.setAttribute('aria-hidden', 'true');
    Object.assign(flight.style, {left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, filter: getComputedStyle(mark).filter});
    document.body.append(flight);
    hero.closest('section').classList.add('hero-entry-flying');
    hero.closest('section').dataset.entryState = 'entering';
    showroom.classList.add('hero-entry-landing');
    const start = performance.now(), duration = 1650;
    const ease = t => t * t * (3 - 2 * t);
    const tick = now => {
      if (!busy) return;
      if (reduce.matches || document.documentElement.dataset.interfaceMotion === 'paused') {
        window.scrollTo({top: targetScroll, behavior: 'instant'}); finish(); return;
      }
      const t = Math.min(1, (now - start) / duration), k = ease(t);
      window.scrollTo({top: startScroll + (targetScroll - startScroll) * k, behavior: 'instant'});
      const to = destination();
      // Destination is measured in the moving viewport; compensate the
      // remaining scroll so the emblem never dives below the screen mid-flight.
      const finalY = to.y - (targetScroll - scrollY);
      const x = from.left + (to.x - from.left) * k, y = from.top + (finalY - from.top) * k;
      const size = from.width + (to.size - from.width) * k;
      flight.style.transform = `translate(${x - from.left}px, ${y - from.top}px) scale(${size / from.width})`;
      flight.style.transformOrigin = '0 0';
      if (t < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
  }
  hero.addEventListener('click', enter);
  document.querySelector('.hero__explore')?.addEventListener('click', enter);
  // User scrolling/navigation can interrupt safely; there is never a scroll lock.
  for (const type of ['wheel', 'touchstart']) window.addEventListener(type, () => {if (busy) finish(false);}, {passive: true});
  window.addEventListener('keydown', e => {if (busy && ['Escape','Tab','PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(e.key)) finish(false);});
  window.addEventListener('resize', () => {if (busy) finish(false);});
  window.addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', () => {if (document.hidden && busy) finish(false);});
}
