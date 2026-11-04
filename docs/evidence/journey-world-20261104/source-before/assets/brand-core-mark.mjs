/* A cached recording of the actual Three.js Core occupies the existing brand
   slot. No audio, frame callback, pointer renderer or second WebGL context. */
const mark = document.querySelector("body.luxury-world > .topbar .brand__mark");
const fallback = mark?.querySelector("img");
if (mark && fallback) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    forced = matchMedia("(forced-colors: active)"),
    printing = matchMedia("print"),
    removers = [];
  const video = document.createElement("video");
  video.className = "brand-core-mark__video";
  video.setAttribute("aria-hidden", "true");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.muted = video.defaultMuted = true;
  video.playsInline = video.loop = true;
  video.preload = "none";
  video.poster = fallback.currentSrc || fallback.src;
  video.tabIndex = -1;
  let dead = false, leaving = false, failed = false, blocked = false,
    visible = !("IntersectionObserver" in window), loaded = false, pending = false, retryRequested = false;
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    removers.push(() => target.removeEventListener(type, fn, options));
  };
  const allowed = () => !dead && !leaving && !failed && !blocked && visible &&
    !document.hidden && !reduced.matches && !forced.matches && !printing.matches &&
    document.documentElement.dataset.interfaceMotion !== "paused";
  const still = () => {
    video.pause();
    mark.classList.remove("is-brand-core-playing");
  };
  function sync() {
    if (!allowed()) { still(); return; }
    if (pending) { retryRequested = true; return; }
    if (!video.paused) return;
    if (!loaded) {
      video.src = new URL("./brand/progresskit-core-mark.webm", import.meta.url).href;
      loaded = true;
    }
    pending = true;
    retryRequested = false;
    void Promise.resolve(video.play()).then(() => {
      if (allowed()) mark.classList.add("is-brand-core-playing");
      else still();
    }).catch(error => {
      if (!dead && error.name === "NotAllowedError") blocked = true;
      else if (!dead && error.name !== "AbortError") failed = true;
      still();
    }).finally(() => {
      pending = false;
      const retry = retryRequested;
      retryRequested = false;
      if (retry && allowed() && video.paused) sync();
    });
  }
  listen(video, "playing", () => {
    if (allowed()) mark.classList.add("is-brand-core-playing");
    else still();
  });
  listen(video, "pause", () => mark.classList.remove("is-brand-core-playing"));
  listen(video, "error", () => { failed = true; still(); });
  listen(document, "visibilitychange", sync);
  listen(window, "progresskit:motionchange", sync);
  for (const media of [reduced, forced, printing]) listen(media, "change", sync);
  listen(document, "pointerdown", () => { if (blocked) { blocked = false; sync(); } }, { passive: true });
  const visibility = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }) : null;
  visibility?.observe(mark);
  const motion = new MutationObserver(sync);
  motion.observe(document.documentElement, { attributes: true, attributeFilter: ["data-interface-motion"] });
  function dispose() {
    if (dead) return;
    dead = true; still();
    visibility?.disconnect(); motion.disconnect();
    removers.splice(0).forEach(remove => remove());
    video.removeAttribute("src"); video.load(); video.remove();
    delete mark.dataset.brandCoreMark;
  }
  listen(window, "pagehide", event => { leaving = true; still(); if (!event.persisted) dispose(); });
  listen(window, "pageshow", event => { if (event.persisted && !dead) { leaving = false; sync(); } });
  mark.dataset.brandCoreMark = "recorded-three-core";
  mark.append(video);
  Object.defineProperty(mark, "brandCoreMark", { configurable: true, value: Object.freeze({
    metrics: () => ({ kind: "recorded-three-core", running: !video.paused && !video.ended,
      loaded, pending, visible, reduced: reduced.matches, forcedColors: forced.matches,
      documentHidden: document.hidden, failed, blocked, disposed: dead,
      currentTime: video.currentTime, webglContextsCreated: 0 }),
    dispose,
  }) });
  sync();
}
