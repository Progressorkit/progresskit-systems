/* Event-driven optical response; no timer, continuous RAF or WebGL renderer. */
const root = document.querySelector("body.luxury-world #technologie");
if (root) {
  const groups = [...root.querySelectorAll(".technology-group")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const forced = matchMedia("(forced-colors: active)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const compact = matchMedia("(max-width: 700px)");
  const removers = [];
  let visible = false, dead = false, leaving = false, frame = 0, frames = 0;
  let active = null, pointer = null, scrollDirty = true;
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    removers.push(() => target.removeEventListener(type, fn, options));
  };
  const paused = () => reduced.matches || forced.matches || document.hidden || leaving ||
    document.documentElement.dataset.interfaceMotion === "paused";
  const cancel = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
  const reset = () => {
    pointer = null;
    for (const group of groups) {
      for (const property of ["--field-x", "--field-y", "--field-tilt-x", "--field-tilt-y"])
        group.style.removeProperty(property);
    }
  };
  function select(group) {
    if (active === group) return;
    active = group;
    root.dataset.fieldActive = String(Boolean(group));
    groups.forEach(item => item.classList.toggle("is-field-active", item === group));
  }
  function draw() {
    frame = 0;
    if (dead || !visible || paused()) return;
    const bounds = scrollDirty ? root.getBoundingClientRect() : null;
    const box = pointer?.group.getBoundingClientRect();
    if (bounds) {
      const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
      root.style.setProperty("--field-scan", `${(15 + progress * 70).toFixed(2)}%`);
    }
    if (pointer && box?.width > 0 && box.height > 0) {
      const x = Math.max(0, Math.min(1, (pointer.x - box.left) / box.width));
      const y = Math.max(0, Math.min(1, (pointer.y - box.top) / box.height));
      pointer.group.style.setProperty("--field-x", `${(x * 100).toFixed(2)}%`);
      pointer.group.style.setProperty("--field-y", `${(y * 100).toFixed(2)}%`);
      pointer.group.style.setProperty("--field-tilt-x", `${((.5 - y) * 2.4).toFixed(2)}deg`);
      pointer.group.style.setProperty("--field-tilt-y", `${((x - .5) * 2.4).toFixed(2)}deg`);
    }
    pointer = null; scrollDirty = false; frames++;
  }
  function schedule() {
    if (!dead && visible && !paused() && !frame) frame = requestAnimationFrame(draw);
  }
  function sync() {
    root.dataset.fieldMotion = !paused() && visible ? "running" : "paused";
    if (paused() || !visible || compact.matches || !fine.matches) { cancel(); reset(); }
    scrollDirty = true;
    schedule();
  }
  for (const group of groups) {
    listen(group, "pointerenter", event => { if (event.pointerType !== "touch" && fine.matches) select(group); });
    listen(group, "pointermove", event => {
      if (event.pointerType === "touch" || !fine.matches || compact.matches || paused()) return;
      pointer = { group, x: event.clientX, y: event.clientY }; schedule();
    }, { passive: true });
    listen(group, "pointerleave", () => {
      if (!group.contains(document.activeElement)) select(null);
      reset();
    });
    listen(group, "focusin", () => select(group));
    listen(group, "focusout", event => { if (!group.contains(event.relatedTarget)) select(null); });
  }
  listen(window, "scroll", () => { scrollDirty = true; schedule(); }, { passive: true });
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
    metrics: () => ({ frames, rafPending: Boolean(frame), visible, paused: paused(),
      reduced: reduced.matches, forcedColors: forced.matches, disposed: dead,
      groups: groups.length, active: active ? groups.indexOf(active) : null }),
    dispose,
  };
  sync();
}
