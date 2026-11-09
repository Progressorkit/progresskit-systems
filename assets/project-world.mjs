/* Shared project interaction: chapter location, source disclosure and one
   lightweight physical display. No render loop or WebGL context is created. */
const project = document.querySelector('.project-world');
if (project) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const rail = project.querySelector('[data-project-chapters]');
  const links = [...(rail?.querySelectorAll('a[href^="#"]') || [])];
  const chapters = links.map(link => project.querySelector(link.getAttribute('href'))).filter(Boolean);
  let active = null;
  let flashTimer;
  const activate = (id, flash = false) => {
    if (!id) return;
    for (const link of links) {
      if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    active = id;
    if (flash && !reducedMotion.matches) {
      const target = document.getElementById(id);
      clearTimeout(flashTimer);
      project.querySelector('.is-chapter-activating')?.classList.remove('is-chapter-activating');
      target?.classList.add('is-chapter-activating');
      flashTimer = setTimeout(() => target?.classList.remove('is-chapter-activating'), 260);
    }
  };
  rail?.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) activate(link.getAttribute('href').slice(1), true);
  });
  if ('IntersectionObserver' in window) {
    const visibility = new Map();
    let locationFrame = 0;
    const updateLocation = () => {
      locationFrame = 0;
      const visible = chapters.filter(chapter => visibility.get(chapter));
      const nearest = visible.sort((a, b) => Math.abs(a.getBoundingClientRect().top - 180) - Math.abs(b.getBoundingClientRect().top - 180))[0];
      if (nearest && nearest.id !== active) activate(nearest.id);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) visibility.set(entry.target, entry.isIntersecting);
      updateLocation();
    }, { rootMargin: '-18% 0px -48% 0px', threshold: 0 });
    chapters.forEach(chapter => observer.observe(chapter));
    // Two adjacent chapters can stay intersecting throughout smooth scrolling.
    // Refresh their relative positions on scroll, without a continuous loop.
    addEventListener('scroll', () => {
      if (!locationFrame) locationFrame = requestAnimationFrame(updateLocation);
    }, {passive:true});
  }
  const revealHash = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); }
    catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target || !project.contains(target)) return;
    let parent = target.parentElement;
    while (parent && parent !== project) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    if (id.startsWith('source-')) requestAnimationFrame(() => target.scrollIntoView({block:'center'}));
    if (chapters.includes(target)) activate(id);
  };
  addEventListener('hashchange', revealHash);
  revealHash();
  const artifact = project.querySelector('[data-project-artifact]');
  if (artifact && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let frame = 0;
    let point = null;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0; point = null;
      artifact.style.removeProperty('--artifact-rotate-x');
      artifact.style.removeProperty('--artifact-rotate-y');
    };
    artifact.addEventListener('pointermove', event => {
      if (reducedMotion.matches) return;
      point = {x:event.clientX,y:event.clientY};
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!point) return;
        const rect = artifact.getBoundingClientRect();
        const x = (point.x - rect.left) / rect.width - .5;
        const y = (point.y - rect.top) / rect.height - .5;
        artifact.style.setProperty('--artifact-rotate-y', `${-9 + x * 8}deg`);
        artifact.style.setProperty('--artifact-rotate-x', `${2 - y * 4}deg`);
      });
    }, {passive:true});
    artifact.addEventListener('pointerleave', reset);
    reducedMotion.addEventListener('change', reset);
    addEventListener('pagehide', reset, {once:true});
  }
}
