import * as THREE from "./vendor/three/three.module.js";
import { frameLoop, resourceScope } from "./showroom-lifecycle.mjs";

// One small optical scene, asleep outside Services. Process uses CSS geometry.
async function serviceScene(root) {
  const canvas = root.querySelector("[data-service-canvas]"),
    anchors = [...root.querySelectorAll(".service-object")];
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) throw Error("WebGL2 unavailable");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    alpha: false,
    antialias: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);
  camera.position.z = 1200;
  scene.background = new THREE.Color(0x040303);
  const owned = new Set(),
    own = (x) => (owned.add(x), x),
    mesh = (g, m, parent = scene) => {
      own(g);
      own(m);
      const o = new THREE.Mesh(g, m);
      parent.add(o);
      return o;
    };
  let dead = false,
    reduced = false,
    running = false,
    present = false,
    compact = false,
    dirty = true,
    elapsed = 0,
    frames = 0,
    active = -1;
  const pointer = new THREE.Vector2(),
    cursor = new THREE.Vector2();
  try {
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0.005, 0.004, 0.005);
    for (const [position, size, color] of [
      [
        [-3, 3, 4],
        [0.55, 6],
        [5.2, 5.4, 5.7],
      ],
      [
        [3, 1, 2],
        [0.25, 5],
        [2.4, 2.6, 3],
      ],
      [
        [0, 5, 1],
        [4, 0.2],
        [2.4, 2.4, 2.5],
      ],
      [
        [-2, -2, -3],
        [3, 0.3],
        [1.3, 0.035, 0.065],
      ],
    ]) {
      const o = new THREE.Mesh(
        new THREE.PlaneGeometry(...size),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(...color),
          side: THREE.DoubleSide,
        }),
      );
      o.position.set(...position);
      o.lookAt(0, 0, 0);
      studio.add(o);
    }
    const pmrem = new THREE.PMREMGenerator(renderer),
      environment = own(pmrem.fromScene(studio, 0.05, 0.1, 50, { size: 64 }));
    pmrem.dispose();
    scene.environment = environment.texture;
    studio.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    const key = new THREE.DirectionalLight(0xe2e6ec, 1.05);
    key.position.set(-2, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc0c7d0, 0.48);
    rim.position.set(3, 1, -1);
    scene.add(rim);
    const material = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xf0f1f4,
        transmission: 1,
        thickness: 19,
        ior: 1.43,
        roughness: 0.025,
        clearcoat: 0.8,
        clearcoatRoughness: 0.035,
        attenuationColor: 0xd7dce4,
        attenuationDistance: 480,
        envMap: environment.texture,
        envMapIntensity: 1.25,
        depthWrite: false,
      }),
    );
    const grain = new Uint8Array(64 * 128 * 4);
    let grainSeed = 19;
    for (let y = 0; y < 128; y++) {
      grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0;
      const row = (grainSeed / 4294967296 - 0.5) * 25;
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        grain[i] = 128;
        grain[i + 1] = 128 + row;
        grain[i + 2] = 254;
        grain[i + 3] = 255;
      }
    }
    const brushed = own(new THREE.DataTexture(grain, 64, 128));
    brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
    brushed.repeat.set(1, 5);
    brushed.needsUpdate = true;
    const metal = own(
      new THREE.MeshStandardMaterial({
        normalMap: brushed,
        normalScale: new THREE.Vector2(0.075, 0.15),
        color: 0xaaa9a5,
        metalness: 1,
        roughness: 0.28,
        envMap: environment.texture,
        envMapIntensity: 1.1,
      }),
    );
    const objects = anchors.map((anchor, index) => {
      const group = new THREE.Group();
      scene.add(group);
      const pieces = [];
      for (let i = 0; i < 3; i++) {
        const piece = mesh(
          new THREE.SphereGeometry(
            1,
            28,
            20,
            (i * Math.PI * 2) / 3,
            (Math.PI * 2) / 3,
            0,
            Math.PI,
          ),
          material,
          group,
        );
        pieces.push(piece);
      }
      const ring = mesh(
        new THREE.TorusGeometry(1.01, 0.008, 5, 80, Math.PI * 1.15),
        metal,
        group,
      );
      ring.rotation.z = index ? 1.2 : -0.65;
      const inner = mesh(
        new THREE.TorusGeometry(0.89, 0.003, 4, 72, Math.PI * 0.55),
        metal,
        group,
      );
      inner.position.z = 0.18;
      inner.rotation.z = index ? -0.8 : 1.1;
      return {
        anchor,
        group,
        pieces,
        index,
        split: 0,
        position: new THREE.Vector3(),
        scale: new THREE.Vector3(),
      };
    });
    const landscape = own(
      await new THREE.TextureLoader().loadAsync(
        new URL("./brand/cinematic-valley-v1.webp", import.meta.url).href,
      ),
    );
    landscape.colorSpace = THREE.SRGBColorSpace;
    const background = mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: landscape } },
        vertexShader:
          "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `uniform sampler2D uMap;varying vec2 vUv;void main(){vec3 t=texture2D(uMap,vUv).rgb;float l=dot(t,vec3(.21,.72,.07));float fade=pow(max(0.,16.*vUv.x*(1.-vUv.x)*vUv.y*(1.-vUv.y)),1.2);float ember=exp(-dot((vUv-vec2(.8,.37))*vec2(2.4,1.8),(vUv-vec2(.8,.37))*vec2(2.4,1.8))*4.);vec3 c=vec3(.0012,.0009,.001)+vec3(1.,.62,.58)*l*.021*fade+vec3(.014,.0005,.0015)*ember*fade;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
      }),
    );
    background.position.z = -350;
    const telemetry = {
      frames: 0,
      drawCalls: 0,
      triangles: 0,
      disposed: false,
    };
    function layout() {
      dirty = false;
      const rect = canvas.getBoundingClientRect(),
        unit =
          (2 * 1200 * Math.tan(THREE.MathUtils.degToRad(35 / 2))) /
          Math.max(1, rect.height);
      objects.forEach((o) => {
        const b = o.anchor.getBoundingClientRect();
        o.position.set(
          (b.x + b.width / 2 - rect.x - rect.width / 2) * unit,
          (rect.height / 2 - (b.y + b.height / 2 - rect.y)) * unit,
          o.index ? -16 : 10,
        );
        o.scale.set(
          b.width * 0.5 * unit,
          b.height * 0.5 * unit,
          b.width * 0.12 * unit,
        );
        o.group.visible = b.bottom > 0 && b.top < innerHeight;
      });
    }
    function resize() {
      if (dead || !canvas.clientWidth || !canvas.clientHeight) return;
      compact = innerWidth <= 700;
      loop.setFPS(compact ? 24 : 30);
      renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 0.7 : 0.85));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      renderer.transmissionResolutionScale = 0.5;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      const height = 2 * 1550 * Math.tan(THREE.MathUtils.degToRad(35 / 2));
      background.scale.set(height * camera.aspect, height, 1);
      dirty = true;
      if (!running && present) loop.still();
    }
    function draw(dt) {
      if (dead) return;
      elapsed += dt;
      if (dirty) layout();
      if (!running || reduced) cursor.set(0, 0);
      else cursor.lerp(pointer, dt ? 1 - Math.exp(-dt * 3) : 1);
      key.position.x = -2 + cursor.x * 0.3;
      for (const o of objects) {
        if (!o.group.visible) continue;
        const hovered = o.index === active && !reduced && running;
        o.split = THREE.MathUtils.damp(o.split, hovered ? 1 : 0, 4, dt || 1);
        o.group.position.copy(o.position);
        o.group.position.y += reduced
          ? 0
          : Math.sin(elapsed * 0.35 + o.index * 2) * 3;
        o.group.scale.copy(o.scale);
        o.group.rotation.set(
          0.035 + (reduced ? 0 : Math.sin(elapsed * 0.12) * 0.012),
          o.index ? 0.21 : -0.27,
          (o.index ? 0.16 : -0.16) + cursor.x * 0.014,
        );
        o.pieces.forEach((p, i) => {
          const a = (i * Math.PI * 2) / 3;
          p.position.set(
            Math.cos(a) * o.split * 0.045,
            Math.sin(a) * o.split * 0.035,
            o.split * (i - 1) * 0.025,
          );
          p.rotation.z = o.split * (i - 1) * 0.012;
        });
      }
      renderer.render(scene, camera);
      telemetry.frames = ++frames;
      telemetry.drawCalls = renderer.info.render.calls;
      telemetry.triangles = renderer.info.render.triangles;
      telemetry.geometries = renderer.info.memory.geometries;
      telemetry.textures = renderer.info.memory.textures;
    }
    const loop = frameLoop(draw, { fps: 30 });
    resize();
    return {
      state(next) {
        reduced = next.reduced;
        present = next.present;
        running = next.running && !reduced;
        if (running) loop.start();
        else {
          loop.stop();
          if (present) loop.still();
        }
      },
      resize,
      scroll() {
        dirty = true;
        if (!running && present) loop.still();
      },
      hover(index, x = 0, y = 0) {
        active = index;
        pointer.set(x, y);
      },
      metrics() {
        return {
          ...telemetry,
          rafPending: loop.pending,
          objects: objects.filter((o) => o.group.visible).length,
          dpr: renderer.getPixelRatio(),
          buffer: { width: canvas.width, height: canvas.height },
        };
      },
      dispose(lose = true) {
        if (dead) return;
        dead = true;
        loop.destroy();
        owned.forEach((r) => r.dispose());
        owned.clear();
        renderer.renderLists.dispose();
        renderer.dispose();
        if (lose) renderer.forceContextLoss();
        scene.clear();
        telemetry.remainingGeometries = renderer.info.memory.geometries;
        telemetry.remainingTextures = renderer.info.memory.textures;
        telemetry.disposed = true;
      },
    };
  } catch (error) {
    owned.forEach((r) => r.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
}

const root = document.querySelector("#uslugi");
if (root) {
  const scope = resourceScope(),
    reduce = matchMedia("(prefers-reduced-motion:reduce)"),
    forced = matchMedia("(forced-colors:active)"),
    articles = [...root.querySelectorAll(".service-zone")];
  let engine = null,
    visible = false,
    starting = false,
    disposed = false,
    lost = false,
    restoreTimer = 0;
  const allowed = () =>
    visible &&
    !document.hidden &&
    !lost &&
    !forced.matches &&
    document.documentElement.dataset.interfaceMotion === "running";
  function sync() {
    engine?.state({
      running: allowed(),
      reduced: reduce.matches,
      present: visible && !document.hidden && !lost && !forced.matches,
    });
    root.dataset.spatialMotion =
      allowed() && !reduce.matches ? "running" : "paused";
  }
  async function boot() {
    if (starting || disposed || engine || forced.matches) return;
    starting = true;
    try {
      const next = await serviceScene(root);
      if (disposed) {
        next.dispose();
        return;
      }
      engine = next;
      root.dataset.serviceRenderer = "webgl2";
      sync();
    } catch (error) {
      root.dataset.serviceRenderer = "fallback";
      root.dataset.serviceFailure = error.message;
    } finally {
      starting = false;
    }
  }
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) void boot();
      sync();
    },
    { rootMargin: "0px", threshold: 0.01 },
  );
  io.observe(root);
  scope.add(() => io.disconnect());
  articles.forEach((article, index) => {
    scope.listen(article, "pointerenter", () => {
      article.classList.add("is-spatial-active");
      root.dataset.spatialActive = String(index);
      engine?.hover(index);
    });
    scope.listen(
      article,
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        const b = article.getBoundingClientRect();
        engine?.hover(
          index,
          ((e.clientX - b.x) / b.width) * 2 - 1,
          1 - ((e.clientY - b.y) / b.height) * 2,
        );
      },
      { passive: true },
    );
    scope.listen(article, "pointerleave", () => {
      article.classList.remove("is-spatial-active");
      delete root.dataset.spatialActive;
      engine?.hover(-1);
    });
    scope.listen(article, "focusin", () => engine?.hover(index));
    scope.listen(article, "focusout", () => engine?.hover(-1));
  });
  scope.listen(window, "scroll", () => engine?.scroll(), { passive: true });
  scope.listen(window, "resize", () => engine?.resize(), { passive: true });
  scope.listen(document, "visibilitychange", sync);
  scope.listen(reduce, "change", sync);
  scope.listen(forced, "change", () => {
    if (!forced.matches && visible) void boot();
    sync();
  });
  scope.listen(window, "progresskit:motionchange", sync);
  const ro = new ResizeObserver(() => engine?.resize());
  ro.observe(root);
  scope.add(() => ro.disconnect());
  const canvas = root.querySelector("[data-service-canvas]");
  scope.listen(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    root.dataset.serviceRenderer = "fallback";
    sync();
  });
  scope.listen(canvas, "webglcontextrestored", () => {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      if (disposed) return;
      engine?.dispose(false);
      engine = null;
      lost = false;
      void boot();
    }, 0);
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    scope.dispose();
    clearTimeout(restoreTimer);
    engine?.dispose();
    root.dataset.spatialDisposed = "true";
  }
  scope.listen(window, "pagehide", (e) => {
    if (e.persisted) {
      visible = false;
      sync();
    } else dispose();
  });
  scope.listen(window, "pageshow", () => {
    const b = root.getBoundingClientRect();
    visible = b.bottom > 0 && b.top < innerHeight;
    sync();
  });
  Object.defineProperty(root, "spatialServices", {
    value: Object.freeze({
      metrics: () => engine?.metrics() || { initialized: false },
      dispose,
    }),
  });
}
// A light packet consumes the existing Process state. It never owns scroll progress.
function bootProcessEnergy() {
  const root = document.querySelector("#proces");
  const line = root?.querySelector(".production-line");
  const canvas = root?.querySelector("[data-process-canvas]");
  const stages = [...(line?.querySelectorAll("[data-production-stage]") || [])];
  const context = canvas?.getContext("2d", { alpha: true });
  if (
    !root ||
    !line ||
    !canvas ||
    !context ||
    !stages.length ||
    root.spatialProcess
  )
    return;
  const scope = resourceScope();
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const compact = matchMedia("(max-width:700px)");
  const forcedColors = matchMedia("(forced-colors:active)");
  const stageSet = new Set(stages);
  let dead = false,
    visible = false,
    leaving = false,
    running = false;
  let progress = 0,
    activeIndex = -1,
    elapsed = 0,
    frames = 0,
    width = 0,
    height = 0,
    dpr = 1,
    centers = [],
    surfaceState = "",
    lastHandoff = -99;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const motionAllowed = () =>
    visible &&
    !document.hidden &&
    !leaving &&
    !reduced.matches &&
    !forcedColors.matches &&
    document.documentElement.dataset.interfaceMotion === "running";

  function readState() {
    const value = parseFloat(line.style.getPropertyValue("--process-progress"));
    progress = clamp(Number.isFinite(value) ? value : 0);
    const selected = stages.findIndex(
      (stage) => stage.dataset.productionState === "active",
    );
    const nextActive =
      selected >= 0 ? selected : progress >= 1 ? stages.length - 1 : -1;
    if (nextActive !== activeIndex) lastHandoff = elapsed;
    activeIndex = nextActive;
    const nextSurfaceState = `${Math.round(progress * 1000)}:${compact.matches}:${reduced.matches}`;
    if (nextSurfaceState === surfaceState) return;
    surfaceState = nextSurfaceState;
    // The existing scroll state also moves the grazing light across each chamber.
    // No layout reads and no additional frame loop are needed for this depth.
    stages.forEach((stage, index) => {
      const local = clamp(progress * stages.length - index);
      const still = reduced.matches || compact.matches;
      stage.style.setProperty("--process-light-x", `${(24 + local * 48).toFixed(1)}%`);
      stage.style.setProperty("--process-light-y", `${(12 + local * 48).toFixed(1)}%`);
      stage.style.setProperty("--process-light-angle", `${(108 + local * 18).toFixed(1)}deg`);
      stage.style.setProperty("--process-scroll-z", `${(still ? 0 : -6 + (index % 3) * 5 + Math.sin(local * Math.PI) * 8).toFixed(1)}px`);
      stage.style.setProperty("--process-scroll-yaw", `${(still ? 0 : (local - .5) * 2).toFixed(2)}deg`);
    });
  }
  function resize() {
    if (dead) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    dpr = Math.min(devicePixelRatio || 1, compact.matches ? 0.65 : 0.85);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Canvas and stations share their scroll coordinate system. Cache only on resize.
    centers = stages.map((stage) => {
      const station = stage.querySelector(".production-station") || stage;
      const box = station.getBoundingClientRect();
      return {
        x: box.x + box.width / 2 - rect.x,
        y: box.y + box.height / 2 - rect.y,
        radius: Math.max(12, Math.min(box.width, box.height) * 0.3),
      };
    });
    if (visible && !document.hidden && !leaving && !running) loop.still();
  }
  function glow(point, intensity = 1) {
    const radius = compact.matches ? 4 : 8;
    const gradient = context.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      radius,
    );
    gradient.addColorStop(0, `rgba(255,239,219,${0.68 * intensity})`);
    gradient.addColorStop(0.18, `rgba(255,172,151,${0.45 * intensity})`);
    gradient.addColorStop(0.5, `rgba(202,38,67,${0.16 * intensity})`);
    gradient.addColorStop(1, "rgba(151,15,45,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  function draw(dt) {
    if (dead || !width || !height) return;
    elapsed += dt;
    context.clearRect(0, 0, width, height);
    const current = centers[activeIndex];
    if (!current) {
      frames++;
      return;
    }
    const shimmer = 0.7 + 0.3 * Math.sin(elapsed * 0.9 + activeIndex * 1.7);
    const handoff = reduced.matches ? 0 : Math.exp(-Math.max(0, elapsed - lastHandoff) * 2.2);
    if (activeIndex === 0) {
      glow(
        { x: current.x - current.radius * 0.3, y: current.y - current.radius },
        0.2 * shimmer,
      );
      frames++;
      return;
    }
    const previous = centers[activeIndex - 1];
    if (!previous) {
      frames++;
      return;
    }
    const dx = current.x - previous.x,
      dy = current.y - previous.y,
      length = Math.max(1, Math.hypot(dx, dy));
    const direction = { x: dx / length, y: dy / length },
      normal = { x: -direction.y, y: direction.x };
    const start = {
      x: previous.x + direction.x * previous.radius,
      y: previous.y + direction.y * previous.radius,
    };
    const end = {
      x: current.x - direction.x * current.radius,
      y: current.y - direction.y * current.radius,
    };
    const middle = { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5 };
    const phase = clamp(progress * stages.length - activeIndex);
    const tail = Math.max(0, phase - (progress >= 1 ? 0.035 : 0.2));
    const bow =
      Math.min(64, Math.max(16, length * 0.11)) * (activeIndex % 2 ? 1 : -1);
    const point = (t, trail = 0) => {
      const envelope = Math.sin(Math.PI * t);
      // A shallow Z arc changes apparent depth; local turbulence never moves the head.
      const z = envelope * (30 + (activeIndex % 3) * 7);
      const perspective = 650 / (650 + z);
      const displacement =
        bow * envelope +
        Math.sin(t * 17 + elapsed * 0.65 + trail * 2) *
          envelope *
          (compact.matches ? 0.45 : 0.9) +
        trail * 1.2 * envelope;
      const x = start.x + (end.x - start.x) * t + normal.x * displacement;
      const y =
        start.y + (end.y - start.y) * t + normal.y * displacement - z * 0.2;
      return {
        x: middle.x + (x - middle.x) * perspective,
        y: middle.y + (y - middle.y) * perspective,
      };
    };
    const head = point(phase);
    // A short contact glint gives the departing stage a physical handoff.
    if (handoff > .03) glow(start, handoff * .12);
    if (phase > .78) glow(end, (phase - .78) * .32);
    const trails = compact.matches ? 2 : 3,
      segments = compact.matches ? 9 : 16;
    if (phase - tail > 0.002) {
      for (let trail = 0; trail < trails; trail++) {
        const first = point(tail, trail - 1),
          last = point(phase, trail - 1);
        const gradient = context.createLinearGradient(
          first.x,
          first.y,
          last.x,
          last.y,
        );
        const strength =
          (trail === 0 ? 0.8 : trail === 1 ? 0.3 : 0.16) * shimmer;
        gradient.addColorStop(0, "rgba(174,26,55,0)");
        gradient.addColorStop(0.45, `rgba(205,45,69,${strength * 0.45})`);
        gradient.addColorStop(0.85, `rgba(239,124,117,${strength * 0.8})`);
        gradient.addColorStop(1, `rgba(255,223,204,${strength})`);
        context.strokeStyle = gradient;
        context.lineWidth = trail === 0 ? 1.2 : 0.6;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(first.x, first.y);
        for (let segment = 1; segment <= segments; segment++) {
          const p = point(
            tail + ((phase - tail) * segment) / segments,
            trail - 1,
          );
          context.lineTo(p.x, p.y);
        }
        context.stroke();
      }
      const sparks = compact.matches ? 1 : 3;
      for (let spark = 0; spark < sparks; spark++) {
        const t = Math.max(tail, phase - 0.025 - spark * 0.045),
          p = point(t, spark - 1);
        const brightness =
          Math.pow(Math.max(0, Math.sin(elapsed * 1.3 + spark * 2.1)), 6) *
          0.45;
        context.fillStyle = `rgba(255,215,193,${brightness})`;
        context.beginPath();
        context.arc(p.x, p.y, 0.6, 0, Math.PI * 2);
        context.fill();
      }
    }
    glow(head, (progress >= 1 ? 0.2 : 0.5) * shimmer);
    frames++;
  }
  const loop = frameLoop(draw, { fps: 24 });
  function sync() {
    if (dead) return;
    readState();
    running = motionAllowed();
    if (running) loop.start();
    else {
      loop.stop();
      if (visible && !document.hidden && !leaving) loop.still();
    }
    root.dataset.processEnergyMotion = running ? "running" : "paused";
  }
  function dispose() {
    if (dead) return;
    dead = true;
    running = false;
    scope.dispose();
    loop.destroy();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    root.dataset.processEnergyMotion = "disposed";
  }
  const mutation = new MutationObserver((records) => {
    if (
      dead ||
      !records.some(
        (record) =>
          (record.target === line && record.attributeName === "style") ||
          (stageSet.has(record.target) &&
            record.attributeName === "data-production-state"),
      )
    )
      return;
    readState();
    if (visible && !document.hidden && !leaving && !running) loop.still();
  });
  mutation.observe(line, {
    attributes: true,
    subtree: true,
    attributeFilter: ["style", "data-production-state"],
  });
  scope.add(() => mutation.disconnect());
  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.01 },
  );
  visibility.observe(canvas);
  scope.add(() => visibility.disconnect());
  const layoutObserver = new ResizeObserver(resize);
  layoutObserver.observe(canvas);
  scope.add(() => layoutObserver.disconnect());
  scope.listen(window, "resize", resize, { passive: true });
  scope.listen(compact, "change", resize);
  scope.listen(window, "progresskit:motionchange", sync);
  scope.listen(reduced, "change", sync);
  scope.listen(forcedColors, "change", sync);
  scope.listen(document, "visibilitychange", sync);
  scope.listen(window, "pagehide", (event) => {
    if (event.persisted) {
      leaving = true;
      sync();
    } else dispose();
  });
  scope.listen(window, "pageshow", () => {
    leaving = false;
    sync();
  });
  Object.defineProperty(root, "spatialProcess", {
    value: Object.freeze({
      metrics: () => ({
        frames,
        rafPending: loop.pending,
        progress,
        active: stages[activeIndex]?.dataset.productionStage || null,
        activeIndex,
        visible,
        running,
        dpr,
        buffer: { width: canvas.width, height: canvas.height },
        disposed: dead,
      }),
      dispose,
    }),
  });
  readState();
  resize();
  sync();
}
if (document.querySelector("#proces [data-process-canvas]"))
  bootProcessEnergy();
