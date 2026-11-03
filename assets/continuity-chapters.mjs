/* The last material settles as it enters the viewport. Event-scheduled only:
   no idle animation loop, scene renderer, timer or document content changes. */
const footer = document.querySelector("body.luxury-world > footer");

if (footer) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    forced = matchMedia("(forced-colors: active)"),
    removers = [];
  let frame = 0, frames = 0, leaving = false, dead = false,
    inView = !("IntersectionObserver" in window), observer = null;
  const paused = () => reduced.matches || forced.matches || document.hidden || leaving ||
    document.documentElement.dataset.interfaceMotion === "paused";
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    removers.push(() => target.removeEventListener(type, fn, options));
  };
  function cancel() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function draw() {
    frame = 0;
    if (dead || !inView || paused()) return;
    const bounds = footer.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0,
      (innerHeight * .85 - bounds.top) / (bounds.height + innerHeight * .2)));
    footer.style.setProperty("--continuity-end", progress.toFixed(4));
    frames++;
  }
  function schedule() {
    if (!frame && !dead && inView && !paused()) frame = requestAnimationFrame(draw);
  }
  function sync() {
    const running = !dead && inView && !paused();
    footer.dataset.continuityMotion = running ? "running" : "paused";
    if (running) schedule(); else cancel();
  }
  function dispose() {
    if (dead) return;
    cancel(); observer?.disconnect();
    removers.splice(0).forEach(remove => remove());
    dead = true;
    footer.dataset.continuityMotion = "paused";
  }
  footer.continuity = {
    metrics: () => ({ frames, rafPending: Boolean(frame), inView,
      paused: Boolean(paused()), reduced: reduced.matches,
      forcedColors: forced.matches, disposed: dead }),
    dispose,
  };
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.target === footer);
      if (entry) { inView = entry.isIntersecting; sync(); }
    });
    observer.observe(footer);
  }
  listen(window, "scroll", schedule, { passive: true });
  listen(window, "resize", schedule, { passive: true });
  listen(window, "progresskit:motionchange", sync);
  listen(document, "visibilitychange", sync);
  listen(reduced, "change", sync);
  listen(forced, "change", sync);
  listen(window, "pagehide", event => {
    leaving = true; cancel();
    if (!event.persisted) dispose(); else sync();
  });
  listen(window, "pageshow", event => {
    if (!event.persisted || dead) return;
    leaving = false; sync();
  });
  sync();
}
