import * as THREE from "./vendor/three/three.module.js";
import { frameLoop, qualityProfile, coreAwakening } from "./showroom-lifecycle.mjs";

export async function createShowroomScene(canvas, projects, onProject, options = {}) {
  const logoOnly = options.corePresentation === "logo";
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("WebGL2 unavailable");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    alpha: true,
    antialias: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  const depthBuffer = gl.getContextAttributes().depth;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  scene.background = null;
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
      lastItems = [],
      scrollOffset = 0, rendering = false;
    const awakening = coreAwakening();
    let sequence = awakening.sample();
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
      contextLosses: 0, contextRestores: 0, detailChanges: [], coreSegments: 3, links: 0,
    };
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    metrics.renderer = debug
      ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    metrics.vendor = debug
      ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    let timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");
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
    const key = new THREE.DirectionalLight(0xe6ecf3, 1.05);
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
    const fill = new THREE.HemisphereLight(0xaebdcb, 0x100607, 0.16);
    scene.add(fill);
    const rim = new THREE.PointLight(0xb7cee0, 15, 15, 2);
    rim.position.set(3, 2, -1);
    scene.add(rim);
    const red = new THREE.PointLight(0xe82032, 6, 10, 2);
    red.position.set(2.8, -0.4, -1.45);
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
    // Three r187 clears its transmission target to premultiplied white / .5
    // whenever the main canvas has alpha. Recover the actual covered colour
    // and alpha before refraction; otherwise that fallback becomes milky glass.
    // Opaque samples (a=1) stay unchanged. Empty samples (.5,.5,.5,.5) become
    // transparent black and reveal the one CSS world, without a second plate.
    function worldTransmission(material) {
      material.onBeforeCompile = shader => {
        const chunk = THREE.ShaderChunk.transmission_pars_fragment.replace(
          'return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',
          `vec4 sampleColor = textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
           sampleColor.rgb = max(vec3(0.0), sampleColor.rgb - vec3(1.0 - sampleColor.a));
           sampleColor.a = clamp(2.0 * sampleColor.a - 1.0, 0.0, 1.0);
           return sampleColor;`,
        );
        shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_pars_fragment>', chunk);
      };
      material.customProgramCacheKey = () => 'pk-world-transmission-r187';
      return material;
    }
    const glass = own(worldTransmission(
      new THREE.MeshPhysicalMaterial({
        // Transmission outputs coverage alpha when it sees the CSS world.
        // Match the canvas' premultiplied alpha, including specular RGB, so
        // low-coverage facets cannot composite as opaque white rectangles.
        premultipliedAlpha: true,
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
    ));
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
    // Architecture and atmosphere belong to the single DOM world behind this
    // transparent canvas. Keeping a scene background here recreates a banner.
    if (logoOnly) floor.visible = false;
    const opticTexture = own(await loader.loadAsync(new URL('./world/optical-core.webp',import.meta.url).href));
    opticTexture.colorSpace = THREE.SRGBColorSpace;
    opticTexture.anisotropy = 4;


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
      logoOnly ? new THREE.MeshBasicMaterial({
        map: logoTexture,
        transparent: true,
        depthWrite: false,
        alphaTest: 0.03,
        side: THREE.DoubleSide,
        toneMapped: false,
      }) : new THREE.MeshStandardMaterial({
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
    if (logoOnly) logo.material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,coreUniforms);
      shader.fragmentShader='uniform float uTime,uScan,uPulse,uOnline;\n'+shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
        `#include <map_fragment>
         diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),.85);
         diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.87,.97,1.08),uOnline*.3);
         float scan=exp(-pow((vMapUv.y-uScan)*65.,2.))*uPulse;
         diffuseColor.rgb+=vec3(.08,.1,.13)*scan*.3;`);
    };
    const coreOrb = new THREE.Group();
    core.add(coreOrb);
    const coreUniforms = { uTime:{value:0}, uScan: {value:0}, uPulse:{value:0}, uOnline:{value:0} };
    const faceMaterial = own(new THREE.MeshBasicMaterial({map:opticTexture,transparent:true,alphaTest:.01,
      depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
    faceMaterial.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,coreUniforms);
      shader.fragmentShader='uniform float uTime,uScan,uPulse,uOnline;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float scan=exp(-pow((vMapUv.y-uScan)*55.,2.))*uPulse;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),.45);
        vec2 radial=vMapUv-.5;
        float radius=length(radial),angle=atan(radial.y,radial.x);
        float path=smoothstep(.014,.0,abs(radius-.38));
        float signal=pow(max(0.,cos(angle-uTime*.6)),18.)*uOnline;
        diffuseColor.rgb+=vec3(.13,.22,.27)*(scan+path*signal*.65);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.93,.98,1.05),uOnline*.2);`);
    };
    faceMaterial.customProgramCacheKey=()=>'pk-core-segment-scan-v1';
    const collarMaterial=own(worldTransmission(new THREE.MeshPhysicalMaterial({premultipliedAlpha:true,
      color:0x777077,roughness:.045,metalness:0,transmission:.97,thickness:.4,ior:1.62,
      attenuationColor:0x40363a,attenuationDistance:2,envMap:env.texture,envMapIntensity:1.85})));
    // Repartition the same optical square/UV map and the same 16-sided annulus.
    // There is one coreOrb, not a second model or a duplicate closed-ring mesh.
    const segments=[];
    for(let index=0;index<3;index++){
      const start=index*Math.PI*2/3,end=(index+1)*Math.PI*2/3,mid=(start+end)/2;
      const part=new THREE.Group();coreOrb.add(part);
      const angles=[start,end];
      for(let k=0;k<64;k++){const angle=k*Math.PI/32;if(angle>start&&angle<end)angles.push(angle);}
      angles.sort((a,b)=>a-b);
      const positions=[],uv=[];
      const squarePoint=angle=>{const x=Math.cos(angle),y=Math.sin(angle),r=1.3/Math.max(Math.abs(x),Math.abs(y));return[x*r,y*r];};
      const vertex=(x,y)=>{positions.push(x,y,0);uv.push(x/2.6+.5,y/2.6+.5);};
      for(let k=0;k<angles.length-1;k++){
        vertex(0,0);vertex(...squarePoint(angles[k]));vertex(...squarePoint(angles[k+1]));
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
      const face=mesh(geometry,faceMaterial,part);face.position.z=.16;face.renderOrder=6;
      const shape=new THREE.Shape(),outer=[];
      const perimeter=[start,end];
      for(let k=0;k<=16;k++){const angle=k*Math.PI/8;if(angle>start&&angle<end)perimeter.push(angle);}
      perimeter.sort((a,b)=>a-b);
      for(const angle of perimeter){const step=Math.PI/8,local=((angle%step)+step)%step-step/2;
        const r=1.16*Math.cos(step/2)/Math.cos(local);outer.push([Math.cos(angle)*r,Math.sin(angle)*r]);}
      shape.moveTo(...outer[0]);outer.slice(1).forEach(point=>shape.lineTo(...point));
      shape.lineTo(Math.cos(end)*.97,Math.sin(end)*.97);shape.absarc(0,0,.97,end,start,true);shape.closePath();
      const side=mesh(new THREE.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelSize:.045,
        bevelThickness:.045,bevelSegments:1,steps:1,curveSegments:32}),collarMaterial,part);
      side.position.z=-.43;
      segments.push({part,direction:new THREE.Vector2(Math.cos(mid),Math.sin(mid))});
    }
    // Independent invisible pick target: opening gaps never break logo tapping.
    const coreFace=mesh(new THREE.PlaneGeometry(2.6,2.6),new THREE.MeshBasicMaterial({visible:false}),coreOrb);
    coreFace.userData.id='core';
    const logoVertices = logo.geometry.getAttribute("position");
    for (let i = 0; i < logoVertices.count; i++) {
      const x = logoVertices.getX(i),
        y = logoVertices.getY(i);
      const edgeWarp = Math.max(0, Math.hypot(x,y) - .48);
      logoVertices.setXY(i, x * (1 + edgeWarp * .055), y * (1 + edgeWarp * .025));
      logoVertices.setZ(i, -0.07 * (x * x + y * y));
    }
    logo.geometry.computeVertexNormals();
    logo.position.set(0, 0.04, -0.03);
    logo.castShadow = true;
    logo.renderOrder = logoOnly ? 5 : 2;
    if (logoOnly) logo.material.depthTest = false;
    logo.userData.id = "core";
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
        vertexShader: `uniform float uTime;varying float vLife;void main(){vec3 p=position;float s=dot(position,vec3(23.1,17.7,9.2));float phase=fract(uTime*(.045+fract(s)*.04)+fract(s));vLife=sin(phase*3.14159);p.y=-2.4+phase*4.8;p.x+=sin(uTime*.25+s)*.13;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((22.+fract(s)*35.)/-mv.z,1.,5.);}`,
        fragmentShader: `varying float vLife;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(mix(vec3(1.,.12,.06),vec3(1.,.77,.56),exp(-d*d*65.)),exp(-d*d*22.)*vLife*.88);}`,
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

    // Holographic sockets share the existing scene and canonical DOM cards.
    // Text stays in HTML: crisp at every pixel ratio, selectable and accessible.
    const nodes = projects.map((p,index) => {
      const group=new THREE.Group();scene.add(group);
      const material=own(new THREE.MeshBasicMaterial({color:0xabcbd8,transparent:true,opacity:.12,depthWrite:false}));
      const body=mesh(new THREE.PlaneGeometry(.16,.16),material,group);
      body.userData.id=p.id;
      const edgeMaterial=own(new THREE.LineBasicMaterial({color:0xabcbd8,transparent:true,opacity:.5,depthWrite:false}));
      const edges=new THREE.LineSegments(own(new THREE.EdgesGeometry(new THREE.PlaneGeometry(.26,.26))),edgeMaterial);group.add(edges);
      return {id:p.id,index,group,body,edges,material,at:new THREE.Vector3(),start:-99,shown:false,phase:'dormant'};
    });
    const maxLinkSegments=16,maxLinkVertices=projects.length*maxLinkSegments*2;
    const linkPositions=new Float32Array(maxLinkVertices*3),linkHighlight=new Float32Array(maxLinkVertices);
    const linkGeometry=own(new THREE.BufferGeometry());
    linkGeometry.setAttribute('position',new THREE.BufferAttribute(linkPositions,3).setUsage(THREE.DynamicDrawUsage));
    linkGeometry.setAttribute('aHighlight',new THREE.BufferAttribute(linkHighlight,1).setUsage(THREE.DynamicDrawUsage));
    linkGeometry.setDrawRange(0,0);
    const links=new THREE.LineSegments(linkGeometry,own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      vertexShader:'attribute float aHighlight;varying float vHighlight;void main(){vHighlight=aHighlight;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      uniforms:{uTime:{value:0}},
      fragmentShader:'uniform float uTime;varying float vHighlight;void main(){gl_FragColor=vec4(mix(vec3(.38,.55,.63),vec3(.72,.89,.95),vHighlight),.38+vHighlight*.4);}',
    })));
    links.frustumCulled=false;links.renderOrder=1;scene.add(links);
    const linkStart=new THREE.Vector3();
    const coreHit = logoOnly ? coreFace : shell;
    const pickable = [coreHit, ...nodes.map((c) => c.body)];
    function setLayout(detail) {
      awake = detail.awake;
      open = detail.open;
      lastItems = detail.items;
      const ids = new Set(lastItems.map((item) => item.id));
      for (const c of nodes) {
        const item = lastItems.find((p) => p.id === c.id);
        c.shown = Boolean(item);
        if (!item) {
          c.group.visible = false;
          c.start = -99;
          continue;
        }
        c.slot=item.slot ?? lastItems.indexOf(item);
        if (awake && c.start === -99)
          c.start = reduced
            ? elapsed - 3
            : elapsed + lastItems.indexOf(item) * 0.085;
        if (!awake) c.start = -99;
      }
      if (!ids.has(active)) active = "";
      if (!loop.running && !rendering) loop.still();
    }
    function setActive(id) {
      active = id || "";
      onProject?.(active);
      if (paused && !rendering) loop.still();
    }
    function activate() {
      activation = elapsed;
      if (paused && !rendering) loop.still();
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
              (o === coreHit ||
                (awake &&
                  nodes.find((c) => c.body === o).phase === "ready")),
          ),
          false,
        )[0]?.object.userData.id || ""
      );
    }
    function location(id) {
      const object =
        id === "core" ? core : nodes.find((c) => c.id === id)?.group;
      if (!object) return null;
      object.getWorldPosition(projected);
      projected.project(camera);
      return {
        x: ((projected.x + 1) * canvas.clientWidth) / 2,
        y: ((1 - projected.y) * canvas.clientHeight) / 2,
        z: projected.z,
        width: id === "core" ? (logoOnly ? 2.6 : 1.85) * core.scale.x * canvas.clientHeight /
          (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(core.position)) : undefined,
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
      camera.position.z = compact ? 10.3 : 11.8;
      camera.fov = compact ? 47 : 44;
      camera.updateProjectionMatrix();
      if (changed || metrics.filaments !== p.roots * 3) {
        filament.geometry.dispose();
        owned.delete(filament.geometry);
        filament.geometry = filamentGeometry(p.roots);
        inner.visible = !compact;
        rim.visible = !compact;
        floor.visible = !logoOnly;
        glass.dispersion = 0;
        nodes.forEach((c) => {
          c.material.dispersion = 0;
        });
      }
      metrics.filaments = p.roots * 3;
      corona.geometry.setDrawRange(0,p.coronaRoots*coronaVerticesPerRoot);
      dustGeometry.setDrawRange(0,p.dust);farGeometry.setDrawRange(0,p.farDust);
      renderer.shadowMap.enabled=p.shadows&&!logoOnly;
      metrics.coronaRoots=p.coronaRoots;metrics.dust=p.dust;metrics.farDust=p.farDust;
      metrics.linkSegments=p.linkSegments;metrics.shadows=renderer.shadowMap.enabled;metrics.facets=false;
      metrics.targetFPS=p.fps;
      metrics.dpr = p.dpr;
      metrics.transmissionResolutionScale = p.transmission;
      metrics.buffer = { width: canvas.width, height: canvas.height };
      metrics.quality = quality;
      if (lastItems.length) setLayout({ awake, open, items: lastItems });
      else loop.still();
    }
    const screenRay=new THREE.Vector3();
    function screenAnchor(x,y,z,target){
      screenRay.set(x*2-1,1-y*2,.5).unproject(camera).sub(camera.position).normalize();
      return target.copy(camera.position).addScaledVector(screenRay,(z-camera.position.z)/screenRay.z);
    }
    function render(dt, time) {
      if (dead || lost || rendering) return;
      rendering=true;
      try {
      const started = performance.now(),detail=profile();
      elapsed += dt;
      sequence=awakening.sample(time);
      const pulse=sequence.phase==='pulse'?Math.sin(Math.min(1,sequence.seconds/.6)*Math.PI):0;
      cursor.lerp(pointer, 1 - Math.exp(-dt * 3.5));
      const power=Math.max(0,1-(elapsed-activation)/2,pulse);
      const baseY=compact ? 2.25 : 0.12;
      camera.position.x=cursor.x*.08;
      camera.position.y=.45+cursor.y*.06+scrollOffset*.04;
      camera.position.z=(compact?10.3:11.8)-sequence.opening*.1;
      camera.lookAt(0,compact?-.3:0,0);camera.updateMatrixWorld();
      screenAnchor(.5,compact?.21:.49,.85,core.position);
      core.rotation.set(.045+cursor.y*.025,-.36+cursor.x*.045,.1);
      core.scale.setScalar(compact ? 0.9 : 1.12);
      logo.position.set(0,.04,-.03);
      const breath=reduced ? 0 : 0.5+Math.sin(elapsed*.07)*.2+Math.sin(elapsed*.113+2)*.15;
      energy.position.set(0,baseY,-1.65);
      energy.scale.setScalar((compact ? 0.76 : 1.04)+power*.015);
      energy.rotation.y=.15+cursor.x*.025;
      energyMaterial.uniforms.uTime.value=elapsed;energyMaterial.uniforms.uPower.value=power;
      red.position.set(2.8,baseY-.4,-1.45);red.intensity=.5+breath*.08+power*.15;
      innerEnergy.visible=!compact;skin.visible=!compact;
      dust.visible=detail.dust>0&&!reduced;farDust.visible=detail.farDust>0&&!reduced;
      if(logoOnly){
        core.children.forEach(part=>{part.visible=part===logo||part===coreOrb;});
        core.rotation.set(cursor.y*.025,cursor.x*.035,0);
        core.scale.setScalar((compact?.86:1.62)+((compact?.72:Math.min(1.12,canvas.clientWidth*.00112))-(compact?.86:1.62))*sequence.opening);
        logo.position.set(0,0,0);
        energy.visible=true;
        energy.children.forEach(part=>{part.visible=(part===dust&&detail.dust>0&&!reduced)||
          false;});
      }
      for(const segment of segments){
        const distance=sequence.opening*.035;
        segment.part.position.set(segment.direction.x*distance,segment.direction.y*distance,-sequence.opening*.025);
      }
      coreUniforms.uTime.value=reduced?0:elapsed;
      coreUniforms.uScan.value=Math.min(1,sequence.seconds/.6);
      coreUniforms.uPulse.value=pulse;
      coreUniforms.uOnline.value=sequence.reveal;
      if(renderer.shadowMap.enabled&&(reduced||dt===0||frames%16===0))renderer.shadowMap.needsUpdate=true;
      filamentUniforms.uTime.value = elapsed;
      filamentUniforms.uPower.value = power;
      filamentUniforms.uCursor.value.copy(cursor);
      const related = nodes.find((c) => c.id === active && c.shown);
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
      for (const c of nodes) {
        if (!c.shown) continue;
        const age = elapsed - c.start;
        let progress = awake ? (awakening.wanted ? sequence.reveal : THREE.MathUtils.clamp(age/2.1,0,1)) : 0;
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
        c.group.visible = awake && c.shown;
        const arrival=reduced?1:THREE.MathUtils.smoothstep(progress,0,.96);
        const row=compact?c.slot:Math.floor(c.slot/2);
        const x=compact?.54:(c.slot%2===0?.185:.815);
        const y=compact?.47+row*.20:.28+row*.225;
        screenAnchor(x,y,.3,c.at);
        c.group.position.copy(c.at);
        c.group.position.z-=(1-arrival)*.3;
        c.group.scale.setScalar(.6+.4*arrival);
        c.body.visible=false;
        c.edges.visible=false;
        c.material.opacity=arrival*(c.id===active?.75:.22);
        c.edges.material.opacity=arrival*(c.id===active?.9:.5);
      }
      let linkVertices=0,linkCount=0;
      if(awake&&sequence.reveal>0){
        for(const node of nodes){
          if(!node.shown)continue;
          const end=node.group.position;
          const dx=end.x-core.position.x,dy=end.y-core.position.y,length=Math.hypot(dx,dy)||1;
          linkStart.set(core.position.x+dx/length*core.scale.x*1.16,core.position.y+dy/length*core.scale.x*1.16,.62);
          if(compact)linkStart.set(core.position.x-core.scale.x*.8,core.position.y-core.scale.x*.7,.62);
          for(let step=0;step<detail.linkSegments;step++)for(const corner of [0,1]){
            const t=(step+corner)/detail.linkSegments*sequence.reveal,offset=linkVertices*3;
            if(compact){
              screenAnchor(.07,.33,.45,target);
              const elbowY=end.y;
              if(t<.22){linkPositions[offset]=linkStart.x+(target.x-linkStart.x)*t/.22;linkPositions[offset+1]=linkStart.y+(target.y-linkStart.y)*t/.22;}
              else if(t<.78){linkPositions[offset]=target.x;linkPositions[offset+1]=target.y+(elbowY-target.y)*(t-.22)/.56;}
              else {linkPositions[offset]=target.x+(end.x-target.x)*(t-.78)/.22;linkPositions[offset+1]=elbowY;}
            }else{
              linkPositions[offset]=linkStart.x+(end.x-linkStart.x)*t;
              linkPositions[offset+1]=linkStart.y+(end.y-linkStart.y)*t+Math.sin(t*Math.PI)*.05;
            }
            linkPositions[offset+2]=linkStart.z+(end.z-linkStart.z)*t+Math.sin(t*Math.PI)*.16;
            linkHighlight[linkVertices]=Math.max(node.id===active?.8:0, reduced?0:Math.pow(Math.max(0,Math.cos((t-elapsed*.18)*Math.PI*2)),24)*.6);linkVertices++;
          }
          linkCount++;
        }
      }
      linkGeometry.setDrawRange(0,linkVertices);links.visible=linkVertices>0;
      linkGeometry.attributes.position.needsUpdate=true;linkGeometry.attributes.aHighlight.needsUpdate=true;
      metrics.links=linkCount;metrics.linkVertices=linkVertices;metrics.maxLinkVertices=maxLinkVertices;
      metrics.awakening={...sequence};
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
            metrics.detailChanges.push({level:quality,fps:metrics.fps,cpuFrameMs:cpu,gpuFrameMs:metrics.gpuFrameMs});
            if(metrics.detailChanges.length>8)metrics.detailChanges.shift();
            slow = 0;
            queueMicrotask(resize);
          }
        }
      }
      canvas.dispatchEvent(
        new CustomEvent("showroom:frame", {
          detail: {
            awakening: {...sequence},
            phases: nodes
              .filter((c) => c.shown)
              .map((c) => ({ id: c.id, phase: c.phase,facets:0,thickness:0,z:c.group.position.z })),
            core: location("core"),
            projects: nodes
              .filter((c) => c.shown)
              .map((c) => ({ id: c.id, reveal: sequence.reveal, ...location(c.id) })),
          },
        }),
      );
      } finally { rendering=false; }
    }
    const loop = frameLoop(render, { fps: 60 });
    function state(next) {
      const previousPause = paused;
      awakening.suspend(Boolean(next.clockPaused || document.hidden));
      if ("reduced" in next) reduced = next.reduced;
      if ("running" in next) paused = !next.running;
      if (previousPause !== paused) {
        windowStart = 0;
        windowFrames = 0;
        slow = 0;
      }
      if (paused || reduced || lost) loop.stop();
      else loop.start();
      if (!lost && !rendering && (paused || reduced)) loop.still();
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
      awaken(value,{immediate=false,startedAt=performance.now()}={}) {
        sequence=awakening.set(value,{immediate,startedAt});
        if(!value){awake=false;active='';nodes.forEach(c=>{c.group.visible=false;c.start=-99;});links.visible=false;linkGeometry.setDrawRange(0,0);}
        if(!lost&&!rendering&&!loop.running)loop.still();
        return {...sequence};
      },
      visibility(hidden){awakening.suspend(Boolean(hidden));},
      scroll(value){scrollOffset=THREE.MathUtils.clamp(value,-1,1);if(paused&&!rendering)loop.still();},
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
          phases: nodes
            .filter((c) => c.shown)
            .map((c) => ({ id: c.id, phase: c.phase,facets:0,thickness:0,z:c.group.position.z })),
          camera: "PerspectiveCamera",
          depth: depthBuffer,
          corePresentation: logoOnly ? "logo" : "capsule",
          awakening: awakening.sample(),contextLost:lost,clockSuspended:awakening.suspended,
          projectLabels:projects.map(project=>({id:project.id,title:project.title,development:project.development||'Etap do potwierdzenia'})),
        };
      },
      contextLost() {
        lost = true;
        metrics.contextLosses++;metrics.gpuFrameMs=null;metrics.gpuTiming='context-lost';
        pendingQuery = null;
        gpuQuery = null;
        loop.stop();
      },
      contextRestored() {
        lost = false;
        metrics.contextRestores++;
        timerExt=gl.getExtension('EXT_disjoint_timer_query_webgl2');
        metrics.gpuTiming=timerExt?'EXT_disjoint_timer_query_webgl2':'unavailable';
        metrics.gpuFrameMs=null;pendingQuery=null;gpuQuery=null;
        windowStart=0;windowFrames=0;slow=0;
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
