/* A bounded decorative material field. Product renderers always take priority. */
const main = document.querySelector("body.luxury-world #main");

if (main) {
  const canvas = document.createElement("canvas");
  canvas.className = "luxury-atmosphere";
  canvas.setAttribute("aria-hidden", "true");
  main.prepend(canvas);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    forcedColors = matchMedia("(forced-colors: active)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)"),
    hero = main.querySelector(".hero--monument"),
    heavy = new Set(),
    removers = [];
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
    observer = null,
    heroObserver = null;

  const listen = (target, name, fn, options) => {
    target.addEventListener(name, fn, options);
    removers.push(() => target.removeEventListener(name, fn, options));
  };
  const paused = () => Boolean(
    reduced.matches ||
    document.documentElement.dataset.interfaceMotion === "paused" ||
    (heroVisible && hero?.classList.contains("hero-motion-paused")));
  const visible = () => !dead && !lost && !leaving && present && !document.hidden && !forcedColors.matches;
  const animate = () => visible() && !paused() && !heavy.size;
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
    }, 1000 / (compact ? 12 : 18));
  };
  function sync() {
    if (!animate()) {
      cancel();
      if (paused() || forcedColors.matches || !heroVisible || !fine.matches) resetTilt();
    }
    if (visible()) schedule(true);
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
    uniform vec2 uResolution, uPointer;
    uniform float uTime, uScroll;
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
      for (int i = 0; i < 4; i++) {
        sum += noise(p) * weight;
        p = turn * p * 2.03 + vec3(2.7, 8.1, 3.4);
        weight *= .5;
      }
      return sum;
    }
    void main() {
      vec2 uv = (vUv - .5) * vec2(uResolution.x / uResolution.y, 1.0);
      uv += uPointer * vec2(.014, .009);
      float t = uTime * .024;
      vec3 p = vec3(uv * 1.85 + vec2(.0, uScroll * .035), t);
      float depth = field(p);
      vec2 warp = vec2(depth - .42, field(p * .71 + vec3(4.2, 1.7, -t)) - .42);
      float strata = field(p + vec3(warp * 1.65, .7));
      float ridge = 1.0 - abs(strata * 2.0 - .91);
      float stone = smoothstep(.13, .81, depth * .62 + strata * .38);
      vec3 charcoal = mix(vec3(.012,.012,.013), vec3(.086,.071,.077), stone * .72);
      float side = exp(-length((uv - vec2(.58,-.03)) * vec2(1.35,1.9)) * 1.6);
      float under = exp(-length((uv - vec2(-.36,-.48)) * vec2(1.2,2.0)) * 2.1);
      float ember = pow(max(0.0,ridge), 13.0) * smoothstep(.36,.71,depth);
      vec3 color = charcoal + vec3(.28,.035,.025) *
        (ember * side * .72 + under * strata * .28);
      // Grain belongs to the material, not to an animated particle overlay.
      color += (hash(vec3(gl_FragCoord.xy, 7.0)) - .5) * .003;
      float vignette = 1.0 - smoothstep(.12,1.25,length(uv * vec2(.7,1.0)));
      color = mix(vec3(.011,.010,.011), color, .38 + vignette * .62);
      outColor = vec4(color, 1.0);
    }`;

  function release() {
    if (!gl || lost) return;
    if (program) gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    program = vao = uniforms = null;
  }
  function initialize() {
    gl = canvas.getContext("webgl2", {
      alpha: false,
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
      };
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      canvas.hidden = false;
      main.dataset.luxuryRenderer = "webgl2";
      dirtySize = dirtyStill = true;
    } finally {
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }
  function draw(time) {
    raf = 0;
    if (!visible() || !program) return;
    if (dirtySize) {
      compact = innerWidth <= 700;
      const scale = Math.min(compact ? .6 : .42, (compact ? 300 : 600) / innerWidth);
      canvas.width = Math.max(1, Math.round(innerWidth * scale));
      canvas.height = Math.max(1, Math.round(innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      dirtySize = false;
    }
    const dt = previousTime ? Math.min(.12, Math.max(0, (time - previousTime) / 1000)) : 0;
    previousTime = time;
    if (animate()) {
      elapsed += dt;
      const ease = 1 - Math.exp(-Math.max(dt, .04) * 3.2);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
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
    gl.uniform2f(uniforms.pointer, pointerX, pointerY);
    gl.uniform1f(uniforms.scroll, scroll / Math.max(1, innerHeight));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
      suspendedHeavy: heavy.size > 0,
      reduced: reduced.matches,
      forcedColors: forcedColors.matches,
      paused: paused(),
      lost,
      disposed: dead,
      size: { width: canvas.width, height: canvas.height },
      fpsLimit: compact ? 12 : 18,
      renderer: main.dataset.luxuryRenderer,
    }),
    dispose: destroy,
  };

  try {
    initialize();
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === main) present = entry.isIntersecting;
          else if (entry.target === hero) heroVisible = entry.isIntersecting;
          else if (entry.isIntersecting) heavy.add(entry.target);
          else heavy.delete(entry.target);
        }
        sync();
      });
      observer.observe(main);
      if (hero) observer.observe(hero);
      for (const section of main.querySelectorAll("#projekty, #uslugi")) observer.observe(section);
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
    listen(window, "scroll", () => { scroll = scrollY; }, { passive: true });
    listen(window, "resize", () => { dirtySize = true; schedule(true); }, { passive: true });
    listen(document, "visibilitychange", sync);
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
      dirtySize = dirtyStill = true;
      sync();
    });
    sync();
  } catch {
    fallback();
  }
}
