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
  let active = null, pointer = null, bounds = null, lastFrame = 0;
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
      point.group.style.transform = `translateZ(var(--field-z)) rotate(var(--field-turn)) rotateX(${((.5-y)*2.4).toFixed(2)}deg) rotateY(${((x-.5)*2.4).toFixed(2)}deg)`;
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
    root.dataset.fieldMotion = !paused() && visible ? "running" : "paused";
    bounds = null;
    if (!canRespond()) { cancel(); reset(); }
  }
  for (const group of groups) {
    listen(group, "pointerenter", event => { if (event.pointerType !== "touch" && fine.matches) select(group); });
    listen(group, "pointermove", event => {
      if (event.pointerType === "touch" || !canRespond()) return;
      pointer = { group, x: event.clientX, y: event.clientY }; schedule();
    }, { passive: true });
    listen(group, "pointerleave", () => {
      cancel(); reset();
      if (!group.contains(document.activeElement)) select(null);
    });
    listen(group, "focusin", () => select(group));
    listen(group, "focusout", event => { if (!group.contains(event.relatedTarget)) select(null); });
  }
  // Native scrolling needs no material animation or gradient repaint.
  listen(window, "scroll", () => { bounds = pointer = null; cancel(); }, { passive: true });
  listen(window, "resize", sync, { passive: true });
  listen(window, "progresskit:motionchange", sync);
  listen(document, "visibilitychange", sync);
  for (const media of [reduced, forced, fine, compact]) listen(media, "change", sync);
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.target === root && entry.isIntersecting);
    root.dataset.fieldVisible = String(visible); sync();
  }) : null;
  if (observer) observer.observe(root);
  else visible = true;
  function dispose() {
    if (dead) return;
    dead = true; cancel(); reset(); select(null); observer?.disconnect();
    removers.splice(0).forEach(remove => remove());
  }
  listen(window, "pagehide", event => { leaving = true; sync(); if (!event.persisted) dispose(); });
  listen(window, "pageshow", event => { if (event.persisted && !dead) { leaving = false; sync(); } });
  root.technologyField = {
    metrics: () => ({ frames, rafPending: Boolean(frame || timer), timerPending: Boolean(timer),
      visible, paused: paused(), reduced: reduced.matches, forcedColors: forced.matches,
      disposed: dead, pointerFpsLimit: 24, gradientUpdates: 0,
      groups: groups.length, active: active ? groups.indexOf(active) : null }),
    dispose,
  };
  sync();
}
