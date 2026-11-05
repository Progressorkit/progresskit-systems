import { createShowroomScene } from "./showroom-scene.mjs";
import { resourceScope } from "./showroom-lifecycle.mjs";
const root = document.querySelector("[data-showroom]"),
  canvas = root?.querySelector("[data-showroom-canvas]");
if (root && canvas) {
  const viewport = root.querySelector("[data-showroom-viewport]"),
    toggle = root.querySelector("[data-capsule-toggle]"),
    audioButton = root.querySelector("[data-capsule-audio]"),
    closeButton = root.querySelector("[data-core-close]"),
    coreStatus = root.querySelector("[data-core-status]"),
    cards = [...root.querySelectorAll(".showroom-card")],
    scope = resourceScope();
  const reduce = matchMedia("(prefers-reduced-motion:reduce)"),
    forced = matchMedia("(forced-colors:active)");
  let engine = null,
    layout = null,
    awake = false,
    requested = false,
    startedAt = 0,
    sequencePhase = "idle",
    viewMode = "",
    related = "",
    destroyed = false,
    lost = false,
    inView = false,
    pointerDown = null,
    hum = null,
    wanted = false,
    suspendTimer = 0,
    restoreTimer = 0;
  const projects = cards.map((card) => ({
    id: card.dataset.projectId,
    title: card.querySelector("h3").textContent.trim(),
    stage: card.querySelector(".showroom-card__stage").textContent.trim(),
    development: card.querySelector("[data-confirmed-stage]")?.dataset.confirmedStage || "Etap do potwierdzenia",
    action: card.querySelector(".showroom-card__action").textContent.trim(),
  }));
  const wake = (value) =>
    document.dispatchEvent(
      new CustomEvent("progresskit:showroom-wake", {
        detail: { awake: value },
      }),
    );
  const allowed = () =>
    !destroyed &&
    !lost &&
    !document.hidden &&
    inView &&
    !layout?.open &&
    !root.classList.contains("is-energy-paused") &&
    !root.classList.contains("is-dragging") &&
    document.documentElement.dataset.interfaceMotion === "running";
  function relation(id) {
    if (!awake || layout?.open) id = "";
    if (id === related) return;
    related = id;
    root.dataset.relatedProject = id;
    cards.forEach((c) =>
      c.classList.toggle("is-related", c.dataset.projectId === id),
    );
    engine?.setActive(id);
    syncAudio();
  }
  const still = () => reduce.matches || forced.matches ||
    root.classList.contains("is-energy-paused") ||
    document.documentElement.dataset.interfaceMotion === "paused";
  const is2D = () => !engine || lost || reduce.matches || forced.matches;
  function sequenceUI(phase) {
    sequencePhase = phase;
    root.dataset.awakening = phase;
    root.classList.toggle("is-awake", requested);
    toggle.setAttribute("aria-expanded", String(requested));
    toggle.setAttribute("aria-label", requested ? "Zamknij rdzeń ProgressKit" : "Odkryj projekty ProgressKit");
    toggle.querySelector("[data-capsule-caption]").textContent = requested
      ? phase === "online" ? "Kliknij logo, aby zamknąć" : "Uruchamianie rdzenia"
      : "Odkryj projekty";
    if (closeButton) closeButton.hidden = !requested || Boolean(layout?.open);
    const label = phase === "online" ? (is2D() ? "Projekty — widok 2D" : "PROGRESSKIT CORE ONLINE")
      : phase === "pulse" ? "Inicjalizacja rdzenia"
      : phase === "opening" ? "Łączenie ekosystemu"
      : phase === "reveal" ? "Projekty gotowe do odkrycia" : "";
    if (coreStatus && coreStatus.textContent !== label) coreStatus.textContent = label;
  }
  function present() {
    const mode = is2D() ? "2d" : "3d";
    if (mode === viewMode) return;
    viewMode = mode;
    root.classList.toggle("showroom-3d-ready", mode === "3d");
    root.classList.toggle("showroom-3d-fallback", mode === "2d");
    root.dataset.renderer = mode === "3d" ? "three-webgl2" : "fallback";
    toggle.hidden = mode === "2d";
    if (mode === "3d") engine.resize();
    // All projects remain reachable through the semantic carousel without GPU.
    // Returning from context loss preserves the user's open/closed intention.
    wake(mode === "2d" || (requested && ["reveal", "online"].includes(sequencePhase)));
    sequenceUI(sequencePhase);
  }
  function sync() {
    present();
    if (requested && still() && sequencePhase !== "online") {
      engine?.awaken(true, { immediate: true });
      sequenceUI("online");
      wake(true);
    }
    engine?.state({ running: allowed() && !is2D(), reduced: still() || is2D(), clockPaused: document.hidden });
    root.dataset.sceneMotion = allowed() && !still() && !is2D() ? "running" : "paused";
    syncAudio();
  }
  function fallback() {
    present();
    sync();
  }
  function requestAwakening(value, { immediate = false, at = performance.now() } = {}) {
    if (destroyed || layout?.open) return;
    if (value === requested) return;
    requested = value;
    startedAt = at;
    const instant = immediate || is2D() || still();
    if (!value) {
      relation("");
      if (document.activeElement?.closest(".showroom-card"))
        (toggle.hidden ? viewport : toggle).focus({ preventScroll: true });
    }
    // Collapse semantic targets immediately on close; the metal can settle in
    // the same existing render loop without leaving an invisible hit target.
    wake(is2D() || (value && instant));
    sequenceUI(value ? instant ? "online" : "pulse" : "idle");
    engine?.awaken(value, { immediate: instant, startedAt: at });
    sync();
  }
  scope.listen(document, "progresskit:core-request", event => {
    requestAwakening(event.detail?.awake ?? !requested, { at: event.detail?.startedAt });
  });
  scope.listen(closeButton, "click", () => {
    requestAwakening(false);
    (toggle.hidden ? viewport : toggle).focus({ preventScroll: true });
  });
  function makeHum() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    const context = new Audio(),
      master = context.createGain(),
      filter = context.createBiquadFilter(),
      pan = context.createPanner();
    pan.panningModel = "equalpower";
    pan.distanceModel = "inverse";
    pan.refDistance = 2;
    pan.rolloffFactor = 0.25;
    pan.positionZ.value = -2;
    filter.type = "lowpass";
    filter.frequency.value = 360;
    master.gain.value = 0;
    const oscillators = [54, 108.2, 162].map((frequency, i) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = [0.32, 0.13, 0.035][i];
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.start();
      return oscillator;
    });
    filter.connect(master);
    master.connect(pan);
    pan.connect(context.destination);
    return { context, master, filter, pan, oscillators };
  }
  function syncAudio() {
    if (!audioButton) return;
    if (reduce.matches) wanted = false;
    const running = wanted && allowed() && !is2D();
    audioButton.setAttribute("aria-pressed", String(wanted));
    audioButton.textContent = wanted ? "Wyłącz hum" : "Włącz hum";
    audioButton.disabled = reduce.matches;
    clearTimeout(suspendTimer);
    if (!hum) return;
    hum.master.gain.setTargetAtTime(
      running ? (related ? 0.04 : 0.034) : 0,
      hum.context.currentTime,
      0.15,
    );
    hum.filter.frequency.setTargetAtTime(
      related ? 395 : 360,
      hum.context.currentTime,
      0.3,
    );
    if (running)
      void hum.context.resume().catch(() => {
        wanted = false;
        syncAudio();
      });
    else
      suspendTimer = setTimeout(() => {
        if (hum && (!wanted || !allowed() || is2D())) void hum.context.suspend();
      }, 450);
  }
  scope.listen(document, "progresskit:showroom-layout", (event) => {
    layout = event.detail;
    awake = layout.awake;
    sequenceUI(sequencePhase);
    if (!awake || layout.open) relation("");
    engine?.setLayout(layout);
    sync();
  });
  scope.listen(document, "progresskit:showroom-charge", (event) => {
    engine?.activate();
    if (engine && allowed() && !reduce.matches) event.detail.delay = 160;
  });
  scope.listen(toggle, "click", () => requestAwakening(!requested));
  scope.listen(viewport, "focusin", (event) => {
    const card = event.target.closest(".showroom-card");
    if (card) {
      relation(card.dataset.projectId);
      sync();
    }
  });
  scope.listen(document, "keydown", (event) => {
    if (
      event.key === "Escape" &&
      !event.defaultPrevented &&
      requested &&
      !layout?.open
    ) {
      event.preventDefault();
      (toggle.hidden ? viewport : toggle).focus({ preventScroll: true });
      requestAwakening(false);
    }
  });
  scope.listen(viewport, "pointermove", (event) => {
    if (!engine || is2D() || still() || layout?.open) return;
    const b = canvas.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return;
    engine.pointer(
      ((event.clientX - b.left) / b.width) * 2 - 1,
      1 - ((event.clientY - b.top) / b.height) * 2,
    );
    if (event.pointerType !== "touch") {
      const id = engine.hit(event.clientX, event.clientY);
      canvas.style.cursor = id ? "pointer" : "default";
      relation(id === "core" ? "" : id);
    }
  });
  scope.listen(viewport, "pointerleave", () => {
    engine?.pointer(0, 0);
    if (
      !root.contains(document.activeElement) ||
      !document.activeElement.closest(".showroom-card")
    )
      relation("");
  });
  scope.listen(canvas, "pointerdown", (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  });
  scope.listen(canvas, "pointerup", (event) => {
    if (
      !engine ||
      !pointerDown ||
      Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) >
        10
    )
      return;
    pointerDown = null;
    const id = engine.hit(event.clientX, event.clientY);
    if (id === "core") {
      requestAwakening(!requested);
    } else if (id && awake && sequencePhase === "online") {
      relation(id);
      engine.activate();
      cards
        .find((c) => c.dataset.projectId === id)
        ?.querySelector("[data-showroom-open]")
        .click();
    }
  });
  scope.listen(canvas, "showroom:frame", (event) => {
    const f = event.detail;
    if (f.awakening) {
      const phase = f.awakening.phase;
      if ((requested || phase === "idle") && phase !== sequencePhase) sequenceUI(phase);
      if (requested && !awake && ["reveal", "online"].includes(phase)) wake(true);
    }
    const phases = f.phases.map((p) => `${p.id}:${p.phase}`).join(",");
    if (root.dataset.scenePhases !== phases) root.dataset.scenePhases = phases;
    if (f.core) {
      toggle.style.setProperty("--core-size", `${f.core.width}px`);
      const x = Math.round(f.core.x * 2) / 2 + "px",
        y = Math.round(f.core.y * 2) / 2 + "px";
      if (toggle.style.left !== x) toggle.style.left = x;
      if (toggle.style.top !== y) toggle.style.top = y;
      if (hum) {
        hum.pan.positionX.setTargetAtTime(
          (f.core.x / canvas.clientWidth - 0.5) * 2,
          hum.context.currentTime,
          0.2,
        );
        hum.pan.positionY.value = 0.1;
      }
    }
    f.projects.forEach((p) => {
      const c = cards.find((c) => c.dataset.projectId === p.id);
      c.style.setProperty("--node-reveal", String(p.reveal ?? 1));
      const x = Math.round(p.x) + "px",
        y = Math.round(p.y) + "px";
      if (c.style.getPropertyValue("--three-x") !== x)
        c.style.setProperty("--three-x", x);
      if (c.style.getPropertyValue("--three-y") !== y)
        c.style.setProperty("--three-y", y);
    });
  });
  scope.listen(canvas, "webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    engine?.contextLost();
    fallback();
    sync();
  });
  scope.listen(canvas, "webglcontextrestored", () => {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      if (destroyed) return;
      lost = false;
      engine?.contextRestored();
      engine?.awaken(requested, { immediate: true });
      sequenceUI(requested ? "online" : "idle");
      sync();
    }, 0);
  });
  scope.listen(document, "visibilitychange", () => {
    engine?.visibility?.(document.hidden);
    sync();
  });
  scope.listen(reduce, "change", sync);
  scope.listen(forced, "change", sync);
  scope.listen(window, "scroll", () => {
    if (!allowed() || is2D() || still()) return;
    const box = viewport.getBoundingClientRect();
    engine?.scroll?.(Math.max(-1, Math.min(1, (innerHeight / 2 - box.top - box.height / 2) / innerHeight)));
  }, { passive: true });
  scope.listen(window, "resize", () => {
    engine?.resize();
    sync();
  });
  let dprMedia;
  const dprChanged = () => {
    dprMedia?.removeEventListener("change", dprChanged);
    dprMedia = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    dprMedia.addEventListener("change", dprChanged);
    engine?.resize();
  };
  dprChanged();
  scope.add(() => dprMedia.removeEventListener("change", dprChanged));
  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.03 },
  );
  observer.observe(viewport);
  scope.add(() => observer.disconnect());
  const mutation = new MutationObserver(sync);
  mutation.observe(root, { attributes: true, attributeFilter: ["class"] });
  mutation.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-interface-motion"],
  });
  scope.add(() => mutation.disconnect());
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    scope.dispose();
    clearTimeout(restoreTimer);
    engine?.dispose();
    clearTimeout(suspendTimer);
    if (hum) {
      hum.oscillators.forEach((o) => o.stop());
      void hum.context.close();
      hum = null;
    }
    root.dataset.sceneDisposed = "true";
  }
  scope.listen(window, "pagehide", (event) => {
    if (event.persisted) {
      engine?.state({ running: false, reduced: true });
      wanted = false;
      syncAudio();
    } else destroy();
  });
  scope.listen(window, "pageshow", sync);
  // Exposes read-only diagnostics and explicit teardown for integration tests, not a second control API.
  Object.defineProperty(root, "showroom3D", {
    configurable: true,
    value: Object.freeze({
      metrics: () => engine?.metrics() || { renderer: "fallback" },
      destroy,
    }),
  });
  if (window.AudioContext || window.webkitAudioContext) {
    audioButton.hidden = false;
    scope.listen(audioButton, "click", () => {
      wanted = !wanted;
      if (wanted && !hum) {
        try {
          hum = makeHum();
        } catch {
          wanted = false;
          audioButton.hidden = true;
        }
      }
      syncAudio();
    });
  }
  try {
    engine = await createShowroomScene(canvas, projects, undefined, {
      corePresentation: "logo",
    });
    if (destroyed) {
      engine.dispose();
    } else {
      engine.resize();
      const fromHistory = root.classList.contains("is-slice-open") || new URL(location.href).searchParams.has("projekt");
      if (requested || fromHistory) {
        requested = true;
        engine.awaken(true, { immediate: fromHistory || still(), startedAt: startedAt || performance.now() });
        sequenceUI(fromHistory || still() ? "online" : "pulse");
      }
      present();
      sync();
    }
  } catch (error) {
    root.dataset.sceneFailure = String(error.message);
    fallback();
  }
}
