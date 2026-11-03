/* One bounded transparent atmosphere. Product renderers retain the larger GPU
   budget; cached text masks keep the vapor out of copy and controls. */
const main = document.querySelector("body.luxury-world #main");

if (main) {
  const canvas = document.createElement("canvas");
  canvas.className = "luxury-atmosphere";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.visibility = "hidden";
  document.body.append(canvas);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    forcedColors = matchMedia("(forced-colors: active)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)"),
    hero = main.querySelector(".hero--monument"),
    showroom = main.querySelector("#projekty"),
    coreToggle = main.querySelector("[data-capsule-toggle]"),
    heavy = new Set(),
    visibleMasks = new Set(),
    removers = [];
  const protectedNodes = [...new Set(document.querySelectorAll([
    ".section-title", ".section-copy", ".section-kicker", "#showroom-status",
    ".hero__stone-title", ".hero__explore", ".hero__motion-toggle",
    ".showroom-heading", ".showroom-gates", ".showroom-filterbar",
    ".showroom-controls", ".showroom-instructions", ".showroom-catalog-link",
    ".capsule-audio", ".showroom-card", ".scene-core-toggle span", ".project-slice__panel",
    ".service-zone h3", ".service-zone__focus", ".competency-list",
    ".services-technologies", ".services-actions", ".production-heading",
    "[data-production-stage] h3", ".production-number",
    "#ekosystem .section-title", "#ekosystem .section-copy",
    ".ecosystem-node__trigger", ".ecosystem-node__detail", ".delivery-flow__relationship", ".delivery-independent > h3", ".ecosystem-console", ".delivery-roadmap",
    "#wydania .section-title", ".delivery-channels", ".delivery-release-note",
    ".about-v5__grid", "#wyzwania .section-title", "#wyzwania .section-copy",
    "#wyzwania > .shell > a", "#technologie .section-title",
    "#technologie .section-copy", ".technology-group__title", ".technology-chips",
    "#technologie .catalog-link", "#kontakt .contact", "#brief", ".footer__inner",
  ].join(",")))];
  const maskNodes = new Set(protectedNodes), maskData = new Float32Array(20 * 4);
  let gl = null,
    program = null,
    vao = null,
    uniforms = null,
    dead = false,
    lost = false,
    leaving = false,
    present = true,
    heroVisible = true,
    raf = 0,
    timer = 0,
    dirtySize = true,
    dirtyStill = true,
    dirtyMasks = true,
    masksReady = false,
    maskCount = 0,
    maskReads = 0,
    frames = 0,
    elapsed = 0,
    previousTime = 0,
    compact = innerWidth <= 700,
    scroll = scrollY,
    targetX = 0,
    targetY = 0,
    pointerX = 0,
    pointerY = 0,
    appliedX = 0,
    appliedY = 0,
    targetLightX = 0,
    targetLightY = 0,
    lightX = 0,
    lightY = 0,
    coreX = .5,
    coreY = .5,
    corePower = 0,
    coreAwake = coreToggle?.getAttribute("aria-expanded") === "true",
    observer = null,
    heroObserver = null,
    coreObserver = null,
    maskResizeObserver = null;

  const listen = (target, name, fn, options) => {
    target.addEventListener(name, fn, options);
    removers.push(() => target.removeEventListener(name, fn, options));
  };
  const paused = () => Boolean(
    reduced.matches ||
    document.documentElement.dataset.interfaceMotion === "paused" ||
    (heroVisible && hero?.classList.contains("hero-motion-paused")));
  const visible = () => !dead && !lost && !leaving && present && !document.hidden && !forcedColors.matches;
  const animate = () => visible() && !paused();
  const fpsLimit = () => heavy.size ? (compact ? 4 : 5) : (compact ? 12 : 15);
  const bufferLimit = () => heavy.size ? (compact ? 128 : 192) : (compact ? 192 : 384);
  const cancel = () => {
    if (raf) cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
    raf = timer = 0;
    previousTime = 0;
  };
  const resetTilt = () => {
    targetX = targetY = pointerX = pointerY = appliedX = appliedY = 0;
    hero?.style.setProperty("--lux-tilt-x", "0deg");
    hero?.style.setProperty("--lux-tilt-y", "0deg");
  };
  const schedule = (immediate = false) => {
    if (raf || timer || !visible()) return;
    if (!animate() && !dirtySize && !dirtyStill) return;
    if (immediate) raf = requestAnimationFrame(draw);
    else timer = setTimeout(() => {
      timer = 0;
      if (visible()) raf = requestAnimationFrame(draw);
    }, 1000 / fpsLimit());
  };
  const invalidateMasks = () => {
    dirtyMasks = dirtyStill = true;
    // Scroll can move text further than a low-FPS frame's protective margin.
    // Never composite the previous mask while new viewport bounds are pending.
    canvas.style.visibility = "hidden";
    schedule();
  };
  function sync() {
    if (!animate()) {
      cancel();
      if (paused() || forcedColors.matches || !heroVisible || !fine.matches) resetTilt();
    }
    if (!heroVisible || !fine.matches) resetTilt();
    if (visible()) schedule(true);
  }

  // Rectangles are measured only after geometry/visibility changes, never on
  // the idle animation path. The last mask conservatively merges any overflow.
  function readMasks() {
    const boxes = [];
    for (const node of visibleMasks) {
      if (node.matches(".showroom-card") && node.classList.contains("is-orbit-hidden")) continue;
      const box = node.getBoundingClientRect();
      maskReads++;
      if (box.width <= 0 || box.height <= 0 || box.bottom <= 0 ||
          box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) continue;
      boxes.push([
        Math.max(0, box.left - 20) / innerWidth,
        Math.max(0, box.top - 20) / innerHeight,
        Math.min(innerWidth, box.right + 20) / innerWidth,
        Math.min(innerHeight, box.bottom + 20) / innerHeight,
      ]);
    }
    maskCount = Math.min(20, boxes.length);
    maskData.fill(0);
    boxes.forEach((box, index) => {
      if (index < 20) maskData.set(box, index * 4);
      else {
        const offset = 19 * 4;
        maskData[offset] = Math.min(maskData[offset], box[0]);
        maskData[offset + 1] = Math.min(maskData[offset + 1], box[1]);
        maskData[offset + 2] = Math.max(maskData[offset + 2], box[2]);
        maskData[offset + 3] = Math.max(maskData[offset + 3], box[3]);
      }
    });
    corePower = 0;
    if (showroom && heavy.has(showroom) && coreToggle) {
      const box = coreToggle.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight) {
        coreX = (box.left + box.width * .5) / innerWidth;
        coreY = (box.top + box.height * .5) / innerHeight;
        corePower = .35 + (coreAwake ? .45 : 0) + (showroom.dataset.relatedProject ? .15 : 0);
      }
    }
    dirtyMasks = false;
  }

  const vertex = `#version 300 es
    precision highp float;
    out vec2 vUv;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUv = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
  const fragment = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform vec2 uResolution, uPointer, uViewport;
    uniform vec3 uCore;
    uniform float uTime, uScroll, uIntensity;
    uniform int uMaskCount;
    uniform vec4 uMasks[20];
    float hash(vec3 p) {
      p = fract(p * .1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }
    float noise(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float field(vec3 p) {
      const mat3 turn = mat3(.00,.80,.60, -.80,.36,-.48, -.60,-.48,.64);
      float sum = 0.0, weight = .5;
      for (int i = 0; i < 3; i++) {
        sum += noise(p) * weight;
        p = turn * p * 2.03 + vec3(2.7, 8.1, 3.4);
        weight *= .5;
      }
      return sum;
    }
    void main() {
      vec2 screen = vec2(vUv.x, 1.0 - vUv.y);
      float protection = 1.0;
      for (int i = 0; i < 20; i++) {
        if (i >= uMaskCount) break;
        vec4 r = uMasks[i];
        vec2 outside = max(max(r.xy - screen, screen - r.zw), vec2(0.0));
        protection *= smoothstep(0.0, 14.0, length(outside * uViewport));
      }
      if (protection < .001) { outColor = vec4(0.0); return; }
      vec2 uv = (screen - .5) * vec2(uResolution.x / uResolution.y, 1.0);
      // Travel changes the sampled depth of two differently moving volumes,
      // rather than translating a flat background texture down the document.
      vec3 drift = vec3(uTime * .013, -uTime * .007, uTime * .009);
      vec3 p = vec3(uv * 1.8, uScroll * .063) + drift;
      float nearField = field(p);
      float farField = field(vec3(uv * .84, uScroll * .021) - drift * .43 + vec3(4.2,1.7,2.3));
      vec2 warp = vec2(nearField - .4, farField - .4);
      float fold = field(p + vec3(warp * 1.9, .7));
      float ribbon = 1.0 - smoothstep(.025,.13,abs(fold - .43));
      float opening = smoothstep(.23,.57,farField);
      float vapor = max(0.0, ribbon * opening - .16) * 1.2;
      float edge = smoothstep(.0,.1,screen.y) * (1.0 - smoothstep(.9,1.0,screen.y));
      float alpha = clamp(vapor * .12 * uIntensity * protection * edge, 0.0, .12 * uIntensity);
      float warm = smoothstep(.25,.64,nearField + uv.x * .05);
      vec3 color = mix(vec3(.18,.205,.235),vec3(.34,.075,.09),warm * .64);
      vec2 coreDelta = (screen - uCore.xy) * vec2(uViewport.x / uViewport.y, 1.0);
      float coreLight = exp(-dot(coreDelta,coreDelta) * 5.0) * uCore.z;
      float localLight = exp(-length((uv - uPointer * vec2(.45,.35)) * vec2(1.4,1.8)) * 3.2);
      color += vec3(.12,.016,.023) * coreLight + vec3(.025,.026,.033) * localLight;
      // The alpha framebuffer is premultiplied; transparent pixels add no veil.
      outColor = vec4(color * alpha, alpha);
    }`;

  function release() {
    if (!gl || lost) return;
    if (program) gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    program = vao = uniforms = null;
  }
  function initialize() {
    gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("Decorative WebGL2 unavailable");
    const shaders = [];
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error("Decorative material shader unavailable");
      }
      program = gl.createProgram();
      shaders.forEach((shader) => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Decorative material program unavailable");
      vao = gl.createVertexArray();
      uniforms = {
        resolution: gl.getUniformLocation(program, "uResolution"),
        time: gl.getUniformLocation(program, "uTime"),
        pointer: gl.getUniformLocation(program, "uPointer"),
        scroll: gl.getUniformLocation(program, "uScroll"),
        viewport: gl.getUniformLocation(program, "uViewport"),
        core: gl.getUniformLocation(program, "uCore"),
        intensity: gl.getUniformLocation(program, "uIntensity"),
        maskCount: gl.getUniformLocation(program, "uMaskCount"),
        masks: gl.getUniformLocation(program, "uMasks[0]"),
      };
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      canvas.hidden = false;
      canvas.style.visibility = "hidden";
      main.dataset.luxuryRenderer = "webgl2";
      dirtySize = dirtyStill = dirtyMasks = true;
    } finally {
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }
  function draw(time) {
    raf = 0;
    if (!visible() || !program) return;
    if (dirtySize) {
      compact = innerWidth <= 700;
      const scale = Math.min(compact ? .5 : .34, bufferLimit() / innerWidth);
      canvas.width = Math.max(1, Math.round(innerWidth * scale));
      canvas.height = Math.max(1, Math.round(innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      dirtySize = false;
    }
    if (dirtyMasks) readMasks();
    const dt = previousTime ? Math.min(.12, Math.max(0, (time - previousTime) / 1000)) : 0;
    previousTime = time;
    if (animate()) {
      elapsed += dt;
      const ease = 1 - Math.exp(-Math.max(dt, .04) * 3.2);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      lightX += (targetLightX - lightX) * ease;
      lightY += (targetLightY - lightY) * ease;
      if (heroVisible && hero &&
          (Math.abs(pointerX - appliedX) > .0002 || Math.abs(pointerY - appliedY) > .0002)) {
        hero.style.setProperty("--lux-tilt-x", `${(-pointerY * 1.6).toFixed(3)}deg`);
        hero.style.setProperty("--lux-tilt-y", `${(pointerX * 1.8).toFixed(3)}deg`);
        appliedX = pointerX;
        appliedY = pointerY;
      }
    }
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform2f(uniforms.pointer, lightX, lightY);
    gl.uniform1f(uniforms.scroll, paused() ? 0 : scroll / Math.max(1, innerHeight));
    gl.uniform2f(uniforms.viewport, innerWidth, innerHeight);
    gl.uniform3f(uniforms.core, coreX, coreY, corePower);
    gl.uniform1f(uniforms.intensity, (masksReady ? 1 : 0) * (compact ? .43 : 1.0) * (heavy.size ? .7 : 1.0));
    gl.uniform1i(uniforms.maskCount, maskCount);
    gl.uniform4fv(uniforms.masks, maskData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.style.visibility = "";
    frames++;
    dirtyStill = false;
    schedule();
  }
  function fallback() {
    cancel();
    release();
    canvas.hidden = true;
    main.dataset.luxuryRenderer = "fallback";
  }
  function destroy() {
    if (dead) return;
    cancel();
    resetTilt();
    observer?.disconnect();
    heroObserver?.disconnect();
    coreObserver?.disconnect();
    maskResizeObserver?.disconnect();
    removers.splice(0).forEach((remove) => remove());
    release();
    canvas.remove();
    dead = true;
  }

  main.luxuryWorld = {
    metrics: () => ({
      frames,
      rafPending: Boolean(raf || timer),
      timerPending: Boolean(timer),
      present,
      suspendedHeavy: false,
      throttledHeavy: heavy.size > 0,
      reduced: reduced.matches,
      forcedColors: forcedColors.matches,
      paused: paused(),
      lost,
      disposed: dead,
      size: { width: canvas.width, height: canvas.height },
      fpsLimit: fpsLimit(),
      bufferLimit: bufferLimit(),
      maskCount,
      masksReady,
      maskReads,
      masksPending: dirtyMasks,
      composited: !canvas.hidden && canvas.style.visibility !== "hidden",
      masks: Array.from(maskData.slice(0, maskCount * 4)),
      alphaMax: (masksReady ? .12 : 0) * (compact ? .43 : 1) * (heavy.size ? .7 : 1),
      alpha: true,
      canvasCount: document.querySelectorAll(".luxury-atmosphere").length,
      renderer: main.dataset.luxuryRenderer,
    }),
    dispose: destroy,
  };

  try {
    initialize();
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        const wasHeavy = heavy.size > 0;
        for (const entry of entries) {
          if (entry.target === document.body) present = entry.isIntersecting;
          else if (entry.target === hero) heroVisible = entry.isIntersecting;
          else if (maskNodes.has(entry.target)) {
            if (entry.isIntersecting) visibleMasks.add(entry.target);
            else visibleMasks.delete(entry.target);
          }
          else if (entry.isIntersecting) heavy.add(entry.target);
          else heavy.delete(entry.target);
        }
        if (wasHeavy !== (heavy.size > 0)) { dirtySize = true; cancel(); }
        masksReady = true;
        dirtyMasks = dirtyStill = true;
        canvas.style.visibility = "hidden";
        sync();
      });
      observer.observe(document.body);
      if (hero) observer.observe(hero);
      for (const section of main.querySelectorAll("#projekty, #uslugi")) observer.observe(section);
      protectedNodes.forEach(node => observer.observe(node));
    } else {
      protectedNodes.forEach(node => visibleMasks.add(node));
      masksReady = true;
    }
    if ("ResizeObserver" in window) {
      maskResizeObserver = new ResizeObserver(invalidateMasks);
      protectedNodes.forEach(node => maskResizeObserver.observe(node));
    }
    if (hero) {
      heroObserver = new MutationObserver(sync);
      heroObserver.observe(hero, { attributes: true, attributeFilter: ["class"] });
      listen(hero, "pointermove", (event) => {
        if (event.pointerType === "touch" || !fine.matches || !heroVisible || !animate()) return;
        const box = hero.getBoundingClientRect();
        targetX = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
        targetY = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
      }, { passive: true });
      listen(hero, "pointerleave", () => { targetX = targetY = 0; });
    }
    if (showroom) {
      coreObserver = new MutationObserver(invalidateMasks);
      coreObserver.observe(showroom, { attributes: true, attributeFilter: ["data-related-project", "data-scene-phases"] });
    }
    listen(document, "progresskit:showroom-wake", event => {
      coreAwake = Boolean(event.detail?.awake); invalidateMasks();
    });
    listen(window, "pointermove", event => {
      if (event.pointerType === "touch" || !fine.matches || !animate()) return;
      targetLightX = event.clientX / innerWidth * 2 - 1;
      targetLightY = event.clientY / innerHeight * 2 - 1;
    }, { passive: true });
    listen(window, "blur", () => { targetLightX = targetLightY = 0; });
    for (const type of ["focusin", "focusout", "pointerover", "pointerout"])
      listen(document, type, invalidateMasks, { passive: true });
    listen(window, "scroll", () => {
      scroll = scrollY; invalidateMasks();
    }, { passive: true });
    listen(window, "resize", () => { dirtySize = true; invalidateMasks(); }, { passive: true });
    listen(document, "visibilitychange", () => { invalidateMasks(); sync(); });
    listen(window, "progresskit:motionchange", sync);
    listen(reduced, "change", () => { dirtyStill = true; sync(); });
    listen(forcedColors, "change", () => { dirtyStill = true; sync(); });
    listen(fine, "change", sync);
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      cancel();
      lost = true;
      main.dataset.luxuryRenderer = "context-lost";
      canvas.hidden = true;
      program = vao = uniforms = null;
    });
    listen(canvas, "webglcontextrestored", () => {
      lost = false;
      try { initialize(); sync(); }
      catch { fallback(); }
    });
    listen(window, "pagehide", (event) => {
      leaving = true;
      cancel();
      if (!event.persisted) destroy();
    });
    listen(window, "pageshow", (event) => {
      if (!event.persisted || dead) return;
      leaving = false;
      dirtySize = dirtyStill = dirtyMasks = true;
      sync();
    });
    sync();
  } catch {
    fallback();
  }
}
