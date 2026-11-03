/* Static optical material; pointer response changes only the compositor transform.
   Scroll never repaints panel gradients or cascades custom properties to links. */
const root = document.querySelector("body.luxury-world #technologie");
if (root) {
  const groups = [...root.querySelectorAll(".technology-group")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const forced = matchMedia("(forced-colors: active)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const compact = matchMedia("(max-width: 700px)");
  const removers = [];
  let visible = false, dead = false, leaving = false, frame = 0, timer = 0, frames = 0;
  let active = null, tapped = null, pointer = null, bounds = null, lastFrame = 0;
  const groupSet = new Set(groups);
  for (const group of groups) {
    const crystal = document.createElement("span");
    crystal.className = "technology-crystal";
    crystal.setAttribute("aria-hidden", "true");
    for (const layer of ["energy", "reflection"]) {
      const surface = document.createElement("span");
      surface.className = `technology-crystal__${layer}`;
      crystal.append(surface);
    }
    group.prepend(crystal);
  }
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    removers.push(() => target.removeEventListener(type, fn, options));
  };
  const paused = () => reduced.matches || forced.matches || document.hidden || leaving ||
    document.documentElement.dataset.interfaceMotion === "paused";
  const canRespond = () => !dead && visible && !paused() && fine.matches && !compact.matches;
  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    frame = timer = 0;
  };
  const reset = () => {
    pointer = bounds = null;
    groups.forEach(group => group.style.removeProperty("transform"));
  };
  function select(group) {
    if (active === group) return;
    active = group; bounds = null;
    root.dataset.fieldActive = String(Boolean(group));
    groups.forEach(item => item.classList.toggle("is-field-active", item === group));
  }
  function draw(time) {
    frame = 0;
    if (!canRespond() || !pointer) return;
    const point = pointer;
    if (!bounds || bounds.group !== point.group)
      bounds = { group: point.group, rect: point.group.getBoundingClientRect() };
    const box = bounds.rect;
    if (box.width > 0 && box.height > 0) {
      const x = Math.max(0, Math.min(1, (point.x - box.left) / box.width));
      const y = Math.max(0, Math.min(1, (point.y - box.top) / box.height));
      // Transform is not inherited: no style cascade through 110 filter links.
      point.group.style.transform = `translateZ(var(--field-z)) rotate(var(--field-turn)) scale(var(--field-scale,1)) rotateX(${((.5-y)*2.4).toFixed(2)}deg) rotateY(${((x-.5)*2.4).toFixed(2)}deg)`;
      frames++; lastFrame = time;
    }
    pointer = null;
  }
  function queueFrame() {
    if (!canRespond() || !pointer || frame) return;
    frame = requestAnimationFrame(draw);
  }
  function schedule() {
    if (!canRespond() || !pointer || frame || timer) return;
    const delay = 1000 / 24 - (performance.now() - lastFrame);
    if (delay > 1) timer = setTimeout(() => { timer = 0; queueFrame(); }, delay);
    else queueFrame();
  }
  function sync() {
    const motion = !paused() && visible ? "running" : "paused";
    if (root.dataset.fieldMotion !== motion) root.dataset.fieldMotion = motion;
    bounds = null;
    if (!canRespond()) { cancel(); reset(); }
  }
  for (const group of groups) {
    listen(group, "pointerenter", event => { if (event.pointerType !== "touch" && fine.matches) select(group); });
    listen(group, "pointermove", event => {
      if (event.pointerType === "touch" || !canRespond()) return;
      pointer = { group, x: event.clientX, y: event.clientY }; schedule();
    }, { passive: true });
    listen(group, "pointerleave", event => {
      cancel(); reset();
      if (event.pointerType !== "touch" && !group.contains(document.activeElement)) select(tapped);
    });
    listen(group, "focusin", () => select(group));
    listen(group, "focusout", event => { if (!group.contains(event.relatedTarget)) select(tapped); });
    listen(group, "click", event => {
      // Native filter links retain their navigation; empty glass supports tap.
      if (fine.matches && !compact.matches) return;
      if (event.target.closest("a,button,input,textarea,select,summary")) return;
      tapped = tapped === group ? null : group;
      select(tapped);
    });
  }
  listen(document, "pointerdown", event => {
    if (!tapped || tapped.contains(event.target)) return;
    tapped = null;
    if (!root.contains(document.activeElement)) select(null);
  }, { passive: true });
  // Native scrolling needs no material animation or gradient repaint.
  listen(window, "scroll", () => { bounds = pointer = null; cancel(); }, { passive: true });
  listen(window, "resize", sync, { passive: true });
  listen(window, "progresskit:motionchange", sync);
  listen(document, "visibilitychange", sync);
  for (const media of [reduced, forced, fine, compact]) listen(media, "change", sync);
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === root) visible = entry.isIntersecting;
      else if (groupSet.has(entry.target))
        entry.target.classList.toggle("is-field-visible", entry.isIntersecting);
    }
    if (root.dataset.fieldVisible !== String(visible)) root.dataset.fieldVisible = String(visible);
    sync();
  }) : null;
  if (observer) {
    observer.observe(root);
    groups.forEach(group => observer.observe(group));
  } else {
    visible = true;
    groups.forEach(group => group.classList.add("is-field-visible"));
  }
  function dispose() {
    if (dead) return;
    dead = true; cancel(); reset(); tapped = null; select(null); observer?.disconnect();
    groups.forEach(group => {
      group.classList.remove("is-field-visible");
      group.querySelector(".technology-crystal")?.remove();
    });
    root.dataset.fieldMotion = "paused";
    removers.splice(0).forEach(remove => remove());
  }
  listen(window, "pagehide", event => { leaving = true; sync(); if (!event.persisted) dispose(); });
  listen(window, "pageshow", event => { if (event.persisted && !dead) { leaving = false; sync(); } });
  root.technologyField = {
    metrics: () => ({ frames, rafPending: Boolean(frame || timer), timerPending: Boolean(timer),
      visible, paused: paused(), reduced: reduced.matches, forcedColors: forced.matches,
      disposed: dead, pointerFpsLimit: 24, gradientUpdates: 0,
      groups: groups.length, visibleGroups: groups.filter(group => group.classList.contains("is-field-visible")).length,
      active: active ? groups.indexOf(active) : null, tapped: tapped ? groups.indexOf(tapped) : null }),
    dispose,
  };
  sync();
}
