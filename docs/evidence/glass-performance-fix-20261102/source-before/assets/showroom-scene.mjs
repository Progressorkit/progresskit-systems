import * as THREE from "./vendor/three/three.module.js";
import { frameLoop, qualityProfile } from "./showroom-lifecycle.mjs";

export async function createShowroomScene(canvas, projects, onProject) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("WebGL2 unavailable");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    alpha: false,
    antialias: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  const depthBuffer = gl.getContextAttributes().depth;
  renderer.setClearColor(0x050505, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  scene.background = new THREE.Color(0x050505);
  camera.position.set(0.25, 0.45, 11.8);
  camera.lookAt(0, 0, 0);
  const owned = new Set(),
    own = (r) => (owned.add(r), r),
    mesh = (geometry, material, parent = scene) => {
      own(geometry);
      own(material);
      const m = new THREE.Mesh(geometry, material);
      parent.add(m);
      return m;
    };
  try {
    const profile = () =>
      qualityProfile(window.innerWidth, devicePixelRatio, quality);
    let quality = 0,
      compact = false,
      dead = false,
      lost = false,
      awake = false,
      open = false,
      paused = true,
      reduced = false,
      elapsed = 0,
      activation = -20,
      active = "",
      pointer = new THREE.Vector2(),
      cursor = new THREE.Vector2(),
      lastItems = [];
    let frames = 0,
      windowFrames = 0,
      windowStart = 0,
      slow = 0;
    const samples = [],
      raycaster = new THREE.Raycaster(),
      projected = new THREE.Vector3(),
      target = new THREE.Vector3();
    const metrics = {
      revision: THREE.REVISION,
      frames: 0,
      quality: 0,
      fps: 0,
      cpuFrameMs: 0,
      gpuFrameMs: null,
      gpuTiming: "unavailable",
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      rafPending: false,
    };
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    metrics.renderer = debug
      ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    metrics.vendor = debug
      ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    const timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    let gpuQuery = null,
      pendingQuery = null;
    if (timerExt) metrics.gpuTiming = "EXT_disjoint_timer_query_webgl2";

    // A local studio environment, convolved once. The white cards reflect in real glass/metal.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0.006, 0.006, 0.007);
    const softboxCanvas = document.createElement("canvas");
    softboxCanvas.width = 64;
    softboxCanvas.height = 128;
    const softContext = softboxCanvas.getContext("2d"),
      softGradient = softContext.createLinearGradient(0, 0, 64, 0);
    softGradient.addColorStop(0, "#000");
    softGradient.addColorStop(0.38, "#8f9da9");
    softGradient.addColorStop(0.5, "#fff");
    softGradient.addColorStop(0.62, "#8f9da9");
    softGradient.addColorStop(1, "#000");
    softContext.fillStyle = softGradient;
    softContext.fillRect(0, 0, 64, 128);
    const softboxTexture = own(new THREE.CanvasTexture(softboxCanvas));
    softboxTexture.colorSpace = THREE.SRGBColorSpace;
    for (const [position, size, color] of [
      [
        [-4, 3, 3],
        [0.9, 6],
        [4.6, 4.9, 5.3],
      ],
      [
        [4, 1, 1],
        [0.65, 5],
        [1.6, 2.0, 2.5],
      ],
      [
        [0, 5, -1],
        [3, 0.35],
        [2.4, 2.7, 3],
      ],
      [
        [0, 0, -5],
        [2.2, 3.5],
        [1.45, 0.018, 0.026],
      ],
      [
        [0, 1.5, 5],
        [1, 3],
        [0.55, 0.6, 0.7],
      ],
      [
        [-3, -1, 5],
        [0.45, 3],
        [3.5, 4.3, 5],
      ],
      [
        [2, -2, 2],
        [0.2, 4],
        [2.5, 3.2, 4],
      ],
      [
        [3, 1, 5],
        [0.15, 6],
        [3.2, 3.5, 4],
      ],
    ]) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(...size),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(...color),
          map: softboxTexture,
          side: THREE.DoubleSide,
        }),
      );
      m.position.set(...position);
      m.lookAt(0, 0, 0);
      studio.add(m);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    let env = own(pmrem.fromScene(studio, 0.06, 0.1, 50, { size: 128 }));
    scene.environment = env.texture;
    scene.environmentIntensity = 0.35;
    pmrem.dispose();
    studio.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    const key = new THREE.DirectionalLight(0xe6ecf3, 0.78);
    key.position.set(-4.5, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.intensity = 0.35;
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const fill = new THREE.HemisphereLight(0xaebdcb, 0x100607, 0.085);
    scene.add(fill);
    const rim = new THREE.PointLight(0xb7cee0, 15, 15, 2);
    rim.position.set(3, 2, -1);
    scene.add(rim);
    const red = new THREE.PointLight(0xe82032, 6, 10, 2);
    red.position.set(-0.2, 0, -0.6);
    scene.add(red);
    scene.fog = new THREE.Fog(0x050505, 13, 24);
    const profilePoints = [
      [12, -3.85],
      [-3.2, -3.85],
    ];
    for (let i = 1; i <= 24; i++) {
      const a = ((i / 24) * Math.PI) / 2;
      profilePoints.push([-3.2 - 2.8 * Math.sin(a), -1.05 - 2.8 * Math.cos(a)]);
    }
    profilePoints.push([-6, 14]);
    const backdropVertices = [],
      backdropIndices = [],
      backdropUVs = [];
    let surfaceDistance = 0;
    profilePoints.forEach(([z, y], index) => {
      if (index) {
        const previous = profilePoints[index - 1];
        surfaceDistance += Math.hypot(z - previous[0], y - previous[1]);
      }
      backdropVertices.push(-30, y, z, 30, y, z);
      backdropUVs.push(0, surfaceDistance / 36, 1, surfaceDistance / 36);
    });
    for (let i = 0; i < profilePoints.length - 1; i++) {
      const a = i * 2;
      backdropIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const backdropGeometry = new THREE.BufferGeometry();
    backdropGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(backdropVertices, 3),
    );
    backdropGeometry.setIndex(backdropIndices);
    backdropGeometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(backdropUVs, 2),
    );
    backdropGeometry.computeVertexNormals();
    // Baked once onto the existing cyclorama: quiet onyx strata, not a wallpaper
    // plane or a time-dependent full-screen effect. The material still receives
    // the real core shadow and the local red bounce.
    const onyxPixels = new Uint8Array(512 * 256 * 4);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 512; x++) {
        const u = x / 512,
          v = y / 256,
          warp = Math.sin(u * 12.1 + v * 3.2) * 0.38 +
            Math.sin(u * 25.7 - v * 8.3) * 0.12,
          strata = Math.sin(v * 20.5 + u * 6.2 + warp * 3.7),
          vein = Math.pow(Math.max(0, 1 - Math.abs(strata)), 9),
          bed = 0.5 + 0.5 * Math.sin(u * 7.3 - v * 3.7 + warp),
          grain = Math.sin(x * 71.3 + y * 37.1) * 0.65,
          i = (y * 512 + x) * 4;
        onyxPixels[i] = 11 + bed * 8 + vein * 13 + grain;
        onyxPixels[i + 1] = 10 + bed * 5 + vein * 2 + grain;
        onyxPixels[i + 2] = 11 + bed * 5 + vein * 2 + grain;
        onyxPixels[i + 3] = 255;
      }
    }
    const onyxMap = own(new THREE.DataTexture(onyxPixels, 512, 256));
    onyxMap.colorSpace = THREE.SRGBColorSpace;
    onyxMap.wrapS = onyxMap.wrapT = THREE.RepeatWrapping;
    onyxMap.minFilter = THREE.LinearFilter;
    onyxMap.magFilter = THREE.LinearFilter;
    onyxMap.needsUpdate = true;
    const floor = mesh(
      backdropGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x757075,
        map: onyxMap,
        roughness: 0.36,
        metalness: 0.24,
        envMapIntensity: 0.65,
      }),
    );
    floor.receiveShadow = true;

    function rounded(w, h, r) {
      const s = new THREE.Shape(),
        x = -w / 2,
        y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    function extrusion(w, h, depth, r, bevel = 0.055) {
      const g = new THREE.ExtrudeGeometry(rounded(w, h, r), {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 6,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    }
    const brushed = new Uint8Array(256 * 128 * 4);
    let seed = 27;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let y = 0; y < 128; y++) {
      const grain = (rnd() - 0.5) * 32;
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        brushed[i] = 128 + (rnd() - 0.5) * 3;
        brushed[i + 1] = 128 + grain;
        brushed[i + 2] = 254;
        brushed[i + 3] = 255;
      }
    }
    const normalMap = own(new THREE.DataTexture(brushed, 256, 128));
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(3, 9);
    normalMap.needsUpdate = true;
    const aluminium = own(
      new THREE.MeshPhysicalMaterial({
        color: 0x87919a,
        metalness: 1,
        roughness: 0.2,
        anisotropy: 0.72,
        anisotropyRotation: Math.PI / 2,
        normalMap,
        normalScale: new THREE.Vector2(0.09, 0.16),
        envMapIntensity: 0.95,
        envMap: env.texture,
      }),
    );
    const glass = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xf2f7fa,
        metalness: 0,
        roughness: 0.012,
        transmission: 1,
        thickness: 0.23,
        ior: 1.44,
        clearcoat: 0.5,
        clearcoatRoughness: 0.035,
        attenuationColor: 0xc0d7e2,
        attenuationDistance: 15,
        envMapIntensity: 1.35,
        envMap: env.texture,
        dispersion: 0,
      }),
    );
    const core = new THREE.Group();
    scene.add(core);
    core.position.set(0, 0.12, 0.85);
    core.rotation.set(0.045, -0.25, 0.1);
    const shell = mesh(extrusion(1.85, 2.68, 0.86, 0.42, 0.055), glass, core);
    shell.userData.id = "core";
    shell.castShadow = false;
    glass.depthWrite = false;
    const lipPoints = rounded(1.85, 2.68, 0.42)
      .getPoints(48)
      .map((p) => new THREE.Vector3(p.x, p.y, 0.49));
    const lipMaterial = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xa8b7c2,
        metalness: 0.96,
        roughness: 0.17,
        envMap: env.texture,
        envMapIntensity: 1.25,
      }),
    );
    const lip = mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(lipPoints, true),
        100,
        0.009,
        5,
        true,
      ),
      lipMaterial,
      core,
    );
    const innerMaterial = own(glass.clone());
    innerMaterial.thickness = 0.11;
    innerMaterial.transmission = 0;
    innerMaterial.transparent = true;
    innerMaterial.opacity = 0.025;
    innerMaterial.depthWrite = false;
    innerMaterial.ior = 1.18;
    innerMaterial.roughness = 0.04;
    const inner = mesh(
      extrusion(1.58, 2.37, 0.16, 0.32, 0.025),
      innerMaterial,
      core,
    );
    inner.position.z = -0.22;
    for (const y of [-1.41, 1.41]) {
      const lid = mesh(
        extrusion(1.72, 0.027, 0.4, 0.014, 0.008),
        aluminium,
        core,
      );
      lid.position.y = y;
      lid.castShadow = true;
    }
    const loader = new THREE.TextureLoader();
    const logoTexture = own(
      await loader.loadAsync(
        new URL("./brand/progressorkit-stamp.png", import.meta.url).href,
      ),
    );
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    logoTexture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy(),
    );
    const logo = mesh(
      new THREE.PlaneGeometry(1.65, 1.65, 10, 10),
      new THREE.MeshStandardMaterial({
        map: logoTexture,
        metalness: 0.64,
        roughness: 0.2,
        envMap: env.texture,
        envMapIntensity: 1.8,
        normalMap,
        normalScale: new THREE.Vector2(0.035, 0.055),
        transparent: true,
        depthWrite: false,
        alphaTest: 0.03,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
      core,
    );
    const logoVertices = logo.geometry.getAttribute("position");
    for (let i = 0; i < logoVertices.count; i++) {
      const x = logoVertices.getX(i),
        y = logoVertices.getY(i);
      logoVertices.setZ(i, -0.045 * (x * x + y * y));
    }
    logo.geometry.computeVertexNormals();
    logo.position.set(0, 0.04, -0.03);
    logo.castShadow = true;
    logo.renderOrder = 2;
    // Recessed interior baffle: logo and its shadow sit in front of this deep,
    // narrow chamber. There is no circular plate attached to the emblem.
    const baffle = mesh(
      extrusion(0.86, 1.86, 0.025, 0.14, 0.008),
      new THREE.MeshStandardMaterial({
        color: 0x030304,
        metalness: 0.6,
        roughness: 0.35,
      }),
      core,
    );
    baffle.position.set(0.035, -0.02, -0.4);
    baffle.rotation.z = -0.035;
    baffle.receiveShadow = true;
    // Energy is a shaded sphere and one batched buffer of branching XYZ filaments.
    const energyCenter = new THREE.Vector3(0, 0.1, -1.65),
      energy = new THREE.Group();
    energy.position.copy(energyCenter);
    scene.add(energy);
    const energyMaterial = own(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPower: { value: 0 } },
        vertexShader: `varying vec3 vPosition;varying vec3 vNormal;varying vec3 vView;void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `
    uniform float uTime,uPower;varying vec3 vPosition,vNormal,vView;
    float field(vec3 p){return sin(p.x*2.7+sin(p.z*2.3+uTime*.16))*sin(p.y*2.9+sin(p.x*2.4-uTime*.13));}
    void main(){
      vec3 p=vPosition+vec3(sin(vPosition.y*2.2+uTime*.12),sin(vPosition.z*2.7-uTime*.09),cos(vPosition.x*2.1))*.24;
      float coarse=field(p*.83+vec3(.7,-.2,1.3)),fine=field(p*2.6+3.4);
      float density=coarse*.72+fine*.28;
      float facing=max(0.,dot(normalize(vNormal),normalize(vView)));
      // Sparse opaque islands keep real depth and appear in glass refraction.
      // The missing surface exposes the separate inner energy layer.
      if(density<.36 || facing<.06)discard;
      float mass=smoothstep(.36,.9,density),vein=pow(1.-abs(field(p*1.7+.8)),14.);
      vec3 col=vec3(.014,.0003,.001)*mass;
      col+=vec3(2.1,.022,.032)*(vein*.56+pow(mass,4.)*.39)*(.8+uPower*.5);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
      }),
    );
    const sphere = mesh(
      new THREE.SphereGeometry(1.78, 40, 24),
      energyMaterial,
      energy,
    );

    const innerEnergy = mesh(sphere.geometry, energyMaterial, energy);
    innerEnergy.scale.set(0.66, 0.74, 0.65);
    innerEnergy.position.set(0.12, -0.11, -0.14);
    innerEnergy.rotation.set(0.7, 0.45, -0.35);

    // Thin, transparent plasma skin: local glow only, no full-frame blur/composer.
    const skinMaterial = own(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: energyMaterial.uniforms,
        vertexShader: energyMaterial.vertexShader,
        fragmentShader: `uniform float uTime,uPower;varying vec3 vPosition,vNormal,vView;
      float field(vec3 p){return sin(p.x*2.7+sin(p.z*2.3+uTime*.16))*sin(p.y*2.9+sin(p.x*2.4-uTime*.13));}
      void main(){vec3 p=vPosition;float facing=abs(dot(normalize(vNormal),normalize(vView)));float density=smoothstep(.05,.8,field(p*.83+vec3(.7,-.2,1.3))*.7+field(p*2.6+3.4)*.3);float edgeless=smoothstep(.02,.35,facing);float hot=pow(1.-abs(field(p*1.7+.8)),12.);float alpha=density*(.018+hot*.145)*edgeless*(1.+uPower*.3);if(alpha<.008)discard;gl_FragColor=vec4(1.,.014,.023,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
      }),
    );
    const skin = mesh(
      new THREE.SphereGeometry(1.84, 32, 20),
      skinMaterial,
      energy,
    );
    const dustPositions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) {
      const a = rnd() * Math.PI * 2,
        y = rnd() * 2 - 1,
        r = 1.8 + rnd() * 0.65;
      dustPositions.set(
        [
          Math.cos(a) * Math.sqrt(1 - y * y) * r,
          y * r,
          Math.sin(a) * Math.sqrt(1 - y * y) * r,
        ],
        i * 3,
      );
    }
    const dustGeometry = own(new THREE.BufferGeometry());
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3),
    );
    const dustMaterial = own(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: energyMaterial.uniforms,
        vertexShader: `uniform float uTime;varying float vLife;void main(){vec3 p=position;float s=dot(position,vec3(23.1,17.7,9.2));vLife=pow(.5+.5*sin(uTime*.7+s),8.);p.y+=sin(uTime*.2+s)*.035;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(25./-mv.z,1.,3.);}`,
        fragmentShader: `varying float vLife;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.1,.12,exp(-d*d*24.)*vLife*.45);}`,
      }),
    );
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    energy.add(dust);

    const farPositions = new Float32Array(18 * 3);
    for (let i = 0; i < 18; i++)
      farPositions.set(
        [(rnd() - 0.5) * 14, (rnd() - 0.5) * 9, -3 - rnd() * 4],
        i * 3,
      );
    const farGeometry = own(new THREE.BufferGeometry());
    farGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(farPositions, 3),
    );
    const farDust = new THREE.Points(
      farGeometry,
      own(
        new THREE.PointsMaterial({
          color: 0x9b9da3,
          size: 0.018,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        }),
      ),
    );
    scene.add(farDust);

    const filamentUniforms = {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uTarget: { value: new THREE.Vector3(0, 0, 0) },
      uActive: { value: 0 },
      uCursor: { value: new THREE.Vector2() },
    };
    function filamentGeometry(roots) {
      const positions = [],
        prev = [],
        next = [],
        rootsData = [],
        info = [];
      const append = (points, times, root, s, index, side, branch) => {
        positions.push(...points[index], times[index]);
        prev.push(
          ...points[Math.max(0, index - 1)],
          times[Math.max(0, index - 1)],
        );
        next.push(
          ...points[Math.min(points.length - 1, index + 1)],
          times[Math.min(points.length - 1, index + 1)],
        );
        rootsData.push(...root);
        info.push(s, side, branch);
      };
      for (let i = 0; i < roots; i++) {
        const y = 1 - (2 * (i + 0.5)) / roots,
          a = i * 2.399963,
          r = Math.sqrt(1 - y * y),
          n = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          base = n.clone().multiplyScalar(1.78),
          tan = new THREE.Vector3(-n.y, n.x, 0.1).normalize(),
          seed = rnd(),
          length = 0.12 + Math.pow(rnd(), 2) * 0.65;

        for (let branch = 0; branch < 3; branch++) {
          const points = [],
            times = [],
            start = branch ? (branch === 1 ? 0.3 : 0.6) : 0,
            count = branch ? 8 : 24;
          for (let j = 0; j <= count; j++) {
            const t = start + ((1 - start) * j) / count;
            const p = base
              .clone()
              .addScaledVector(n, Math.sin(t * Math.PI * 0.85) * length)
              .addScaledVector(
                tan,
                t * 0.35 + Math.sin(t * 8 + seed * 21) * length * 0.18,
              );
            if (branch)
              p.addScaledVector(
                new THREE.Vector3(n.z, -n.x, n.y),
                Math.sin(((t - start) / (1 - start)) * Math.PI * 0.5) *
                  length *
                  0.45 *
                  (branch === 1 ? 1 : -1),
              );
            points.push(p.toArray());
            times.push(t);
          }
          for (let j = 0; j < count; j++)
            for (const [index, side] of [
              [j, -1],
              [j, 1],
              [j + 1, -1],
              [j + 1, -1],
              [j, 1],
              [j + 1, 1],
            ])
              append(points, times, base.toArray(), seed, index, side, branch);
        }
      }
      const g = new THREE.BufferGeometry();
      for (const [name, data, size] of [
        ["aPosition", positions, 4],
        ["aPrevious", prev, 4],
        ["aNext", next, 4],
        ["aRoot", rootsData, 3],
        ["aInfo", info, 3],
      ])
        g.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          positions.filter((_, i) => i % 4 !== 3),
          3,
        ),
      );
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
      return own(g);
    }
    const filamentMaterial = own(
      new THREE.ShaderMaterial({
        uniforms: filamentUniforms,
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        vertexShader: `
    attribute vec4 aPosition,aPrevious,aNext;attribute vec3 aRoot,aInfo;uniform float uTime,uPower,uActive;uniform vec3 uTarget;uniform vec2 uCursor;varying float vSide,vLight,vAlong;
    vec3 bend(vec4 node){float t=node.w,s=aInfo.x;vec3 n=normalize(aRoot),p=node.xyz;vec3 tangent=normalize(vec3(-n.y,n.x,.1));vec3 binormal=normalize(cross(n,tangent));float envelope=sin(t*3.14159);p+=tangent*(sin(t*11.+s*31.+uTime*.29)*.065+sin(t*27.-uTime*.47+s*19.)*.025)*envelope;p+=binormal*(sin(t*17.+s*43.-uTime*.24)*.075)*envelope;p=aRoot+(p-aRoot)*(1.+uPower*.7);float sector=smoothstep(.25,.91,dot(n,normalize(uTarget+vec3(.001))));vec3 end=uTarget+vec3(sin(s*91.),cos(s*62.),sin(s*73.))*.16;vec3 guided=mix(aRoot,end,t);guided+=tangent*sin(t*3.14159)*(.46+sin(s*53.)*.22);guided+=tangent*(sin(t*14.+uTime*.3+s*37.)*.13+sin(t*31.-uTime*.5+s*11.)*.04)*envelope;guided+=binormal*sin(t*19.-uTime*.2+s*29.)*.16*envelope;p=mix(p,guided,sector*uActive*smoothstep(.02,.97,t));p.xy+=uCursor*pow(max(0.,dot(normalize(n.xy),normalize(uCursor+vec2(.001)))),5.)*t*.08;return p;}
    void main(){vec4 mv=modelViewMatrix*vec4(bend(aPosition),1.);vec3 before=(modelViewMatrix*vec4(bend(aPrevious),1.)).xyz,after=(modelViewMatrix*vec4(bend(aNext),1.)).xyz;vec2 d=normalize(after.xy-before.xy+vec2(.00001));float taper=pow(1.-aPosition.w,.85);mv.xy+=vec2(-d.y,d.x)*aInfo.y*(.1-aInfo.z*.028)*taper*(.45+aInfo.x*.65);gl_Position=projectionMatrix*mv;vSide=aInfo.y;vAlong=aPosition.w;float life=fract(uTime*(.046+aInfo.x*.027)+aInfo.x*19.+aInfo.z*.03);vLight=smoothstep(.06,.21,life)*(1.-smoothstep(.38,.6,life))*(.5+aInfo.x*.5)*(aInfo.z<.5?1.:.23);float guide=smoothstep(.4,.9,dot(normalize(aRoot),normalize(uTarget+vec3(.001))))*uActive;vLight=max(vLight,guide*(aInfo.z<.5?.85:.12));}`,
        fragmentShader: `
    varying float vSide,vLight,vAlong;void main(){float edge=abs(vSide);float taper=pow(1.-vAlong,.6);float glow=exp(-edge*edge*5.);float core=exp(-edge*edge*36.);float alpha=(glow*.45+core*.8)*vLight*taper;if(alpha<.006)discard;vec3 col=mix(vec3(.8,.004,.015),vec3(3.2,.13,.18),core);gl_FragColor=vec4(col,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
      }),
    );
    let filament = mesh(filamentGeometry(24), filamentMaterial, energy);
    filament.frustumCulled = false;

    // Micro-corona: short, irregular surface discharges, one additive GPU draw.
    // Each root occupies exactly 72 vertices (6 main segments + two 3-segment twigs).
    // After resize(): corona.geometry.setDrawRange(0, (compact ? 16 : 48) * 72);
    // All geometry/material ownership stays with the existing scene disposer.
    const coronaRootCount = 48;
    const coronaVerticesPerRoot = 72;
    const coronaPositions = [],
      coronaPrevious = [],
      coronaNext = [],
      coronaSeeds = [];
    const coronaAppend = (points, along, index, side, seed, branch) => {
      const p = points[index],
        prev = points[Math.max(0, index - 1)],
        next = points[Math.min(points.length - 1, index + 1)];
      coronaPositions.push(p.x, p.y, p.z, along[index]);
      coronaPrevious.push(
        prev.x,
        prev.y,
        prev.z,
        along[Math.max(0, index - 1)],
      );
      coronaNext.push(
        next.x,
        next.y,
        next.z,
        along[Math.min(points.length - 1, index + 1)],
      );
      coronaSeeds.push(seed, side, branch);
    };
    for (let rootIndex = 0; rootIndex < coronaRootCount; rootIndex++) {
      // A permutation keeps the first 16 roots spatially distributed on mobile.
      const ordinal = (rootIndex * 17) % coronaRootCount;
      const y = 1 - (2 * (ordinal + 0.5)) / coronaRootCount;
      const angle = ordinal * 2.399963;
      const horizontal = Math.sqrt(1 - y * y);
      const normal = new THREE.Vector3(
        Math.cos(angle) * horizontal,
        y,
        Math.sin(angle) * horizontal,
      );
      const tangent = new THREE.Vector3(-normal.z, 0, normal.x).normalize();
      const bitangent = new THREE.Vector3()
        .crossVectors(normal, tangent)
        .normalize();
      const seed = rnd();
      const base = normal.clone().multiplyScalar(1.74 + rnd() * 0.075);
      const length = 0.065 + rnd() * 0.16;
      const mainPoint = (t) =>
        base
          .clone()
          .addScaledVector(normal, length * t)
          .addScaledVector(
            tangent,
            Math.sin(t * 8.7 + seed * 11) * 0.018 * t +
              t * 0.025 * Math.sin(seed * 29),
          )
          .addScaledVector(
            bitangent,
            Math.sin(t * 13.1 + seed * 23) * 0.014 * t,
          );
      for (let branch = 0; branch < 3; branch++) {
        const segmentCount = branch ? 3 : 6;
        const points = [],
          along = [];
        const attachment = branch === 1 ? 0.32 : 0.62;
        const twigBase = mainPoint(attachment);
        const twigLength = 0.025 + seed * 0.055;
        for (let pointIndex = 0; pointIndex <= segmentCount; pointIndex++) {
          const t = pointIndex / segmentCount;
          const p = branch
            ? twigBase
                .clone()
                .addScaledVector(normal, twigLength * t * 0.35)
                .addScaledVector(
                  tangent,
                  twigLength * t * (branch === 1 ? -1 : 1),
                )
                .addScaledVector(
                  bitangent,
                  Math.sin(t * 5.4 + seed * 17) * 0.012 * t,
                )
            : mainPoint(t);
          points.push(p);
          along.push(t);
        }
        for (let segment = 0; segment < segmentCount; segment++) {
          for (const [index, side] of [
            [segment, -1],
            [segment, 1],
            [segment + 1, -1],
            [segment + 1, -1],
            [segment, 1],
            [segment + 1, 1],
          ]) {
            coronaAppend(points, along, index, side, seed, branch);
          }
        }
      }
    }
    const coronaGeometry = own(new THREE.BufferGeometry());
    coronaGeometry.setAttribute(
      "aPoint",
      new THREE.Float32BufferAttribute(coronaPositions, 4),
    );
    coronaGeometry.setAttribute(
      "aPrevious",
      new THREE.Float32BufferAttribute(coronaPrevious, 4),
    );
    coronaGeometry.setAttribute(
      "aNext",
      new THREE.Float32BufferAttribute(coronaNext, 4),
    );
    coronaGeometry.setAttribute(
      "aSeed",
      new THREE.Float32BufferAttribute(coronaSeeds, 3),
    );
    // A conventional position attribute lets Three track the draw/resource normally.
    coronaGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        coronaPositions.filter((_, i) => i % 4 !== 3),
        3,
      ),
    );
    coronaGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.3);
    const coronaUniforms = filamentUniforms;
    const coronaMaterial = own(
      new THREE.ShaderMaterial({
        uniforms: coronaUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
        attribute vec4 aPoint,aPrevious,aNext;
        attribute vec3 aSeed;
        uniform float uTime,uPower,uActive;
        uniform vec3 uTarget;
        varying float vSide,vAlong,vPulse,vTwig;
        vec3 flicker(vec4 p){
          vec3 n=normalize(p.xyz);
          vec3 tangent=normalize(vec3(-n.z,.01,n.x));
          vec3 bitangent=cross(n,tangent);
          float phase=uTime*(2.4+aSeed.x)+aSeed.x*43.;
          return p.xyz+tangent*sin(p.w*22.+phase)*.006*p.w
            +bitangent*sin(p.w*31.-phase*1.3)*.004*p.w;
        }
        void main(){
          vec4 mv=modelViewMatrix*vec4(flicker(aPoint),1.);
          vec3 previous=(modelViewMatrix*vec4(flicker(aPrevious),1.)).xyz;
          vec3 next=(modelViewMatrix*vec4(flicker(aNext),1.)).xyz;
          vec2 direction=normalize(next.xy-previous.xy+vec2(.00001));
          float twig=aSeed.z>.5?1.:0.;
          float width=(.018+aSeed.x*.009)*(1.-twig*.45)*pow(1.-aPoint.w,1.1);
          mv.xy+=vec2(-direction.y,direction.x)*aSeed.y*width;
          gl_Position=projectionMatrix*mv;
          float life=fract(uTime*(.55+aSeed.x*.65)+aSeed.x*19.);
          float burst=smoothstep(.015,.085,life)*(1.-smoothstep(.2,.48,life));
          float sector=smoothstep(.2,.85,dot(normalize(aPoint.xyz),normalize(uTarget+vec3(.001))));
          vPulse=burst*(.55+aSeed.x*.45)*(1.+uPower*.2+sector*uActive*.25);
          vSide=aSeed.y;vAlong=aPoint.w;vTwig=twig;
        }`,
        fragmentShader: `
        varying float vSide,vAlong,vPulse,vTwig;
        void main(){
          float edge=abs(vSide);
          float core=exp(-edge*edge*25.);
          float glow=exp(-edge*edge*4.);
          float alpha=(core*.75+glow*.18)*vPulse*pow(1.-vAlong,.65)*(1.-vTwig*.35);
          if(alpha<.006)discard;
          vec3 color=mix(vec3(.7,.002,.012),vec3(2.6,.13,.17),core);
          gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      }),
    );
    const corona = mesh(coronaGeometry, coronaMaterial, energy);
    corona.frustumCulled = false;

    function crystalGeometry(index) {
      const count = 14 + (index % 3),
        verts = [],
        indices = [],
        rings = [
          [0.74, 0.31],
          [0.98, 0.12],
          [1, -0.035],
          [0.55, -0.46],
        ];
      for (const [scale, z] of rings)
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + Math.PI / 8,
            // Precision-cut shoulders, rather than the uneven silhouette of rock.
            variation = 1 + 0.022 * Math.sin(i * 3.7 + index);
          verts.push(
            Math.cos(angle) * scale * variation,
            Math.sin(angle) * scale * 0.82 * variation,
            z,
          );
        }
      for (let layer = 0; layer < 3; layer++)
        for (let i = 0; i < count; i++) {
          const a = layer * count + i,
            b = layer * count + ((i + 1) % count),
            c = (layer + 1) * count + i,
            d = (layer + 1) * count + ((i + 1) % count);
          indices.push(a, c, b, b, c, d);
        }
      const center = verts.length / 3;
      verts.push(0, 0, 0.328);
      for (let i = 0; i < count; i++) indices.push(center, i, (i + 1) % count);
      for (let i = 1; i < count - 1; i++)
        indices.push(3 * count, 3 * count + i + 1, 3 * count + i);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(indices);
      const flat = g.toNonIndexed();
      g.dispose();
      flat.computeVertexNormals();
      // The polished table is a continuous convex surface; only the cut shoulders
      // keep flat normals. This prevents a fan of opaque-looking grey triangles.
      const tablePositions = flat.getAttribute("position"),
        tableNormals = flat.getAttribute("normal"),
        normal = new THREE.Vector3();
      for (let i = 0; i < tablePositions.count; i++)
        if (tablePositions.getZ(i) >= 0.309 && tableNormals.getZ(i) > 0.9) {
          normal
            .set(
              tablePositions.getX(i) * 0.04,
              tablePositions.getY(i) * 0.06,
              1,
            )
            .normalize();
          tableNormals.setXYZ(i, normal.x, normal.y, normal.z);
        }
      return flat;
    }
    function label(project) {
      const c = document.createElement("canvas");
      c.width = 768;
      c.height = 512;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, 768, 512);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e5edf0";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 5;
      ctx.font = "600 70px system-ui";
      const words = project.title.split(" "),
        lines = [""];
      for (const word of words) {
        const i = lines.length - 1;
        if (ctx.measureText(lines[i] + word).width > 540)
          lines.push(word + " ");
        else lines[i] += word + " ";
      }
      lines.forEach((line, i) => ctx.fillText(line.trim(), 384, 140 + i * 76));
      ctx.font = "38px ui-monospace,monospace";
      ctx.fillStyle = "#b7c9d3";
      ctx.fillText(project.stage, 384, 290 + (lines.length - 1) * 64);
      ctx.font = "36px system-ui";
      ctx.fillStyle = "#d4acb4";
      ctx.fillText(project.action, 384, 365 + (lines.length - 1) * 60);
      const texture = own(new THREE.CanvasTexture(c));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    }
    const crystals = projects.map((p, index) => {
      const group = new THREE.Group();
      scene.add(group);
      const material = own(glass.clone());
      material.color.set(0xc2ced8);
      material.roughness = 0.009;
      material.thickness = 0.54;
      material.ior = 1.68;
      material.attenuationColor.set(0x5d6977);
      material.attenuationDistance = 2.7;
      material.envMapIntensity = 2.45;
      material.dispersion = 0;
      material.specularIntensity = 1.45;
      material.clearcoat = 1;
      material.clearcoatRoughness = 0.018;
      const body = mesh(crystalGeometry(index), material, group);
      const innerCoatMaterial = own(
        new THREE.MeshPhysicalMaterial({
          color: 0x6b7180,
          metalness: 0.8,
          roughness: 0.055,
          transparent: true,
          opacity: 0.018,
          depthWrite: false,
          envMap: env.texture,
          envMapIntensity: 1.9,
        }),
      );
      const innerCoat = mesh(body.geometry.clone(), innerCoatMaterial, group);
      innerCoat.scale.setScalar(0.88);
      innerCoat.position.z = -0.08;
      body.userData.id = p.id;
      body.castShadow = false;
      const edgeGeometry = own(new THREE.EdgesGeometry(body.geometry, 12));
      const edgeMaterial = own(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uReveal: { value: 0 },
            uTime: { value: 0 },
            uActive: { value: 0 },
            uEnergy: { value: new THREE.Vector3(0, 0, -1) },
          },
          vertexShader: `
            uniform vec3 uEnergy;
            varying float vGlint,vEnergy;
            varying vec3 vPosition;
            void main(){
              vPosition=position;
              vec3 radial=normalize(position);
              vec3 n=normalize(normalMatrix*radial);
              vGlint=pow(abs(dot(n,normalize(vec3(-.4,.8,.3)))),9.);
              vEnergy=pow(max(0.,dot(radial,normalize(uEnergy))),6.);
              gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
            }`,
          fragmentShader: `
            uniform float uReveal,uTime,uActive;
            varying float vGlint,vEnergy;
            varying vec3 vPosition;
            void main(){
              float trace=smoothstep(-1.1,1.1,uReveal*2.3-vPosition.y);
              float idle=uReveal<.03?pow(max(0.,sin(vPosition.y*4.+vPosition.x*3.)),14.)*.15:1.;
              float sweep=.46+.54*pow(.5+.5*sin(vPosition.y*3.+vPosition.x*5.+uTime*.3),5.);
              vec3 reflection=mix(vec3(1.3,1.48,1.6),vec3(1.75,.32,.36),vEnergy*(.32+uActive*.2));
              gl_FragColor=vec4(reflection,idle*trace*(.027+vGlint*.42)*sweep*(1.+uActive*.2));
            }`,
        }),
      );
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      group.add(edges);
      const content = mesh(
        new THREE.PlaneGeometry(1.6, 1.06),
        new THREE.MeshBasicMaterial({
          map: label(p),
          alphaTest: 0.03,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
        group,
      );
      content.position.z = 0.18;
      material.depthWrite = false;
      content.renderOrder = 2;
      return {
        id: p.id,
        index,
        group,
        body,
        content,
        edges,
        edgeMaterial,
        innerCoat,
        material,
        at: new THREE.Vector3(),
        start: -99,
        shown: false,
        phase: "dormant",
      };
    });
    const pickable = [shell, ...crystals.map((c) => c.body)];
    function setLayout(detail) {
      awake = detail.awake;
      open = detail.open;
      lastItems = detail.items;
      const ids = new Set(lastItems.map((item) => item.id));
      for (const c of crystals) {
        const item = lastItems.find((p) => p.id === c.id);
        c.shown = Boolean(item);
        if (!item) {
          c.group.visible = false;
          c.start = -99;
          continue;
        }
        c.at.set(
          compact ? 0 : item.point.x * 3.55,
          compact ? -2.15 : -item.point.y * 2.9,
          compact ? 0.6 : 0.2 + Math.sin(c.index * 2.3) * 0.45,
        );
        if (awake && c.start === -99)
          c.start = reduced
            ? elapsed - 3
            : elapsed + lastItems.indexOf(item) * 0.085;
        if (!awake) c.start = -99;
      }
      if (!ids.has(active)) active = "";
      if (!loop.running) loop.still();
    }
    function setActive(id) {
      active = id || "";
      onProject?.(active);
      if (paused) loop.still();
    }
    function activate() {
      activation = elapsed;
      if (paused) loop.still();
    }
    function hit(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        {
          x: ((clientX - rect.left) / rect.width) * 2 - 1,
          y: (-(clientY - rect.top) / rect.height) * 2 + 1,
        },
        camera,
      );
      scene.updateMatrixWorld(true);
      return (
        raycaster.intersectObjects(
          pickable.filter(
            (o) =>
              o.parent.visible &&
              (o === shell ||
                (awake &&
                  crystals.find((c) => c.body === o).phase === "ready")),
          ),
          false,
        )[0]?.object.userData.id || ""
      );
    }
    function location(id) {
      const object =
        id === "core" ? core : crystals.find((c) => c.id === id)?.group;
      if (!object) return null;
      object.getWorldPosition(projected);
      projected.project(camera);
      return {
        x: ((projected.x + 1) * canvas.clientWidth) / 2,
        y: ((1 - projected.y) * canvas.clientHeight) / 2,
        z: projected.z,
      };
    }
    function resize() {
      if (dead || lost || !canvas.clientWidth || !canvas.clientHeight) return;
      const p = profile(),
        changed = compact !== p.compact;
      compact = p.compact;
      loop.setFPS(p.fps);
      renderer.setPixelRatio(p.dpr);
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      renderer.transmissionResolutionScale = p.transmission;
      camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      camera.position.z = compact ? 9.9 : 11.8;
      camera.fov = compact ? 47 : 42;
      camera.updateProjectionMatrix();
      if (changed || metrics.filaments !== p.roots * 3) {
        filament.geometry.dispose();
        owned.delete(filament.geometry);
        filament.geometry = filamentGeometry(p.roots);
        inner.visible = !compact;
        rim.visible = !compact;
        floor.visible = true;
        glass.dispersion = 0;
        crystals.forEach((c) => {
          c.material.dispersion = 0;
        });
      }
      metrics.filaments = p.roots * 3;
      corona.geometry.setDrawRange(0, (compact ? 16 : 48) * 72);
      metrics.coronaRoots = compact ? 16 : 48;
      metrics.dpr = p.dpr;
      metrics.transmissionResolutionScale = p.transmission;
      metrics.buffer = { width: canvas.width, height: canvas.height };
      metrics.quality = quality;
      if (lastItems.length) setLayout({ awake, open, items: lastItems });
      else loop.still();
    }
    function render(dt, time) {
      if (dead || lost) return;
      const started = performance.now();
      elapsed += dt;
      cursor.lerp(pointer, 1 - Math.exp(-dt * 3.5));
      const power = Math.max(0, 1 - (elapsed - activation) / 2);
      const baseY = compact ? 1.0 : 0.12;
      camera.position.x = cursor.x * 0.13;
      camera.position.y = 0.45 + cursor.y * 0.09;
      camera.lookAt(0, compact ? -0.3 : 0, 0);
      core.position.y =
        baseY + (reduced ? 0 : Math.sin(elapsed * 0.65) * 0.035);
      core.position.x = reduced ? 0 : Math.sin(elapsed * 0.137) * 0.018;
      core.rotation.y =
        -0.36 +
        cursor.x * 0.045 +
        (reduced ? 0 : Math.sin(elapsed * 0.113) * 0.018);
      core.rotation.x =
        0.045 +
        cursor.y * 0.025 +
        (reduced ? 0 : Math.cos(elapsed * 0.097) * 0.012);
      core.rotation.z = 0.1 + (reduced ? 0 : Math.sin(elapsed * 0.081) * 0.012);
      logo.position.y =
        0.04 + (reduced ? 0 : Math.sin(elapsed * 0.23 + 0.8) * 0.01);
      logo.position.z =
        -0.03 + (reduced ? 0 : Math.cos(elapsed * 0.17) * 0.012);
      rim.position.x = 3 + (reduced ? 0 : Math.sin(elapsed * 0.12) * 0.16);
      const breath = reduced ? 0 : 0.5 + Math.sin(elapsed * 0.58) * 0.5;
      core.scale.setScalar((compact ? 0.9 : 1.12) + breath * 0.008);
      energy.position.set(0, baseY, -1.65);
      energy.scale.setScalar((compact ? 0.76 : 1.04) + power * 0.025 + breath * 0.008);
      energy.rotation.y = reduced ? 0.15 : elapsed * 0.022;
      energyMaterial.uniforms.uTime.value = elapsed;
      energyMaterial.uniforms.uPower.value = power;
      red.position.set(-0.55, baseY + 0.1, -1.45);
      red.intensity = 2.8 + breath * 0.2 + power * 2 + (active ? 1.1 : 0);
      innerEnergy.visible = !compact;
      skin.visible = !compact;
      dust.visible = !compact;
      if (reduced || dt === 0 || frames % 8 === 0)
        renderer.shadowMap.needsUpdate = true;
      filamentUniforms.uTime.value = elapsed;
      filamentUniforms.uPower.value = power;
      filamentUniforms.uCursor.value.copy(cursor);
      const related = crystals.find((c) => c.id === active && c.shown);
      if (related) {
        target.copy(related.group.position);
        energy.worldToLocal(target);
        filamentUniforms.uTarget.value.lerp(
          target,
          dt ? 1 - Math.exp(-dt * 5) : 1,
        );
      }
      filamentUniforms.uActive.value = THREE.MathUtils.damp(
        filamentUniforms.uActive.value,
        related ? 1 : 0,
        5,
        dt || 1,
      );
      for (const c of crystals) {
        if (!c.shown) continue;
        const age = elapsed - c.start;
        let progress = awake ? THREE.MathUtils.clamp(age / 2.1, 0, 1) : 0;
        if (reduced && awake) progress = 1;
        c.phase = !awake
          ? "dormant"
          : progress < 0.17
            ? "charge"
            : progress < 0.38
              ? "highlight"
              : progress < 0.68
                ? "forming"
                : progress < 1
                  ? "transmitting"
                  : "ready";
        c.group.visible = awake || c.shown;
        c.group.position.copy(c.at);
        c.group.position.z += c.id === active ? 0.16 : active ? -0.15 : 0;
        c.group.rotation.set(
          0.12 + Math.sin(c.index) * 0.06,
          -0.25 + Math.sin(c.index * 2) * 0.18 + cursor.x * 0.02,
          Math.sin(c.index * 3) * 0.1,
        );
        c.group.position.y += reduced
          ? 0
          : Math.sin(elapsed * 0.6 + c.index) * 0.025;
        const scale = awake
          ? 0.82 + 0.18 * THREE.MathUtils.smoothstep(progress, 0.15, 0.8)
          : 0.96;
        c.group.scale.setScalar(scale * (compact ? 1.25 : 1.12));
        c.body.visible = awake && progress > 0.4;
        c.innerCoat.visible = awake && progress > 0.7;
        const formed = THREE.MathUtils.smoothstep(progress, 0.38, 0.9);
        c.body.scale.setScalar(Math.max(0.025, formed));
        c.innerCoat.scale.setScalar(0.88 * Math.max(0.025, formed));
        c.material.thickness = 0.06 + 0.48 * formed;
        c.edges.visible = true;
        c.edgeMaterial.uniforms.uReveal.value = awake
          ? Math.max(0.04, progress * 1.6)
          : 0.025;
        c.edgeMaterial.uniforms.uTime.value = elapsed + c.index;
        c.edgeMaterial.uniforms.uActive.value = c.id === active ? 1 : 0;
        c.edgeMaterial.uniforms.uEnergy.value.copy(c.group.position).negate();
        c.content.visible = progress >= 0.98;
        c.material.transmission = 0.85 + 0.15 * formed;
        c.material.roughness = 0.009 + (1 - progress) * 0.03;
        c.material.emissive.setHex(c.id === active ? 0x0b0001 : 0x000000);
        c.material.emissiveIntensity = c.id === active ? 0.22 : 0;
      }
      if (
        pendingQuery &&
        gl.getQueryParameter(pendingQuery, gl.QUERY_RESULT_AVAILABLE)
      ) {
        if (!gl.getParameter(timerExt.GPU_DISJOINT_EXT))
          metrics.gpuFrameMs =
            gl.getQueryParameter(pendingQuery, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(pendingQuery);
        pendingQuery = null;
      }
      if (timerExt && !pendingQuery) {
        gpuQuery = gl.createQuery();
        gl.beginQuery(timerExt.TIME_ELAPSED_EXT, gpuQuery);
      }
      renderer.info.reset();
      renderer.render(scene, camera);
      if (gpuQuery) {
        gl.endQuery(timerExt.TIME_ELAPSED_EXT);
        pendingQuery = gpuQuery;
        gpuQuery = null;
      }
      frames++;
      const cpu = performance.now() - started;
      metrics.frames = frames;
      metrics.cpuFrameMs = cpu;
      metrics.drawCalls = renderer.info.render.calls;
      metrics.triangles = renderer.info.render.triangles;
      metrics.geometries = renderer.info.memory.geometries;
      metrics.textures = renderer.info.memory.textures;
      if (dt > 0) {
        if (!windowStart) windowStart = time;
        windowFrames++;
        if (time - windowStart >= 1000) {
          metrics.fps = (windowFrames * 1000) / (time - windowStart);
          samples.push({
            t: time,
            fps: metrics.fps,
            cpuFrameMs: cpu,
            gpuFrameMs: metrics.gpuFrameMs,
            drawCalls: metrics.drawCalls,
            triangles: metrics.triangles,
            dpr: metrics.dpr,
          });
          if (samples.length > 90) samples.shift();
          if (metrics.fps < (compact ? 26 : 43)) slow++;
          else slow = 0;
          windowFrames = 0;
          windowStart = time;
          if (slow >= 3 && quality < 2) {
            quality++;
            slow = 0;
            queueMicrotask(resize);
          }
        }
      }
      canvas.dispatchEvent(
        new CustomEvent("showroom:frame", {
          detail: {
            phases: crystals
              .filter((c) => c.shown)
              .map((c) => ({ id: c.id, phase: c.phase })),
            core: location("core"),
            projects: crystals
              .filter((c) => c.shown)
              .map((c) => ({ id: c.id, ...location(c.id) })),
          },
        }),
      );
    }
    const loop = frameLoop(render, { fps: 60 });
    function state(next) {
      const previousPause = paused;
      if ("reduced" in next) reduced = next.reduced;
      if ("running" in next) paused = !next.running;
      if (previousPause !== paused) {
        windowStart = 0;
        windowFrames = 0;
        slow = 0;
      }
      if (paused || reduced || lost) loop.stop();
      else loop.start();
      if (!lost && (paused || reduced)) loop.still();
      metrics.rafPending = loop.pending;
    }
    function dispose() {
      if (dead) return;
      dead = true;
      loop.destroy();
      if (pendingQuery && !lost) gl.deleteQuery(pendingQuery);
      owned.forEach((r) => r.dispose());
      owned.clear();
      key.shadow.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      metrics.remainingGeometries = renderer.info.memory.geometries;
      metrics.remainingTextures = renderer.info.memory.textures;
      metrics.disposed = true;
      metrics.rafPending = false;
    }
    resize();
    return {
      state,
      setLayout,
      setActive,
      activate,
      resize,
      hit,
      location,
      pointer(x, y) {
        pointer.set(x, y);
      },
      metrics() {
        return {
          ...metrics,
          rafPending: loop.pending,
          samples: samples.slice(),
          phases: crystals
            .filter((c) => c.shown)
            .map((c) => ({ id: c.id, phase: c.phase })),
          camera: "PerspectiveCamera",
          depth: depthBuffer,
        };
      },
      contextLost() {
        lost = true;
        pendingQuery = null;
        gpuQuery = null;
        loop.stop();
      },
      contextRestored() {
        lost = false;
        const oldEnv = env;
        owned.delete(env);
        env.dispose();
        const generator = new THREE.PMREMGenerator(renderer);
        env = own(generator.fromScene(studio, 0.06, 0.1, 50, { size: 128 }));
        scene.environment = env.texture;
        owned.forEach((resource) => {
          if (resource.isMaterial && resource.envMap === oldEnv.texture) {
            resource.envMap = env.texture;
            resource.needsUpdate = true;
          }
        });
        generator.dispose();
        studio.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        resize();
        if (!paused && !reduced) loop.start();
      },
      dispose,
      renderer,
    };
  } catch (error) {
    owned.forEach((resource) => resource.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
}
