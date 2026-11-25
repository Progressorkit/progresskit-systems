/* Original cut-glass solids. DOM links own hit testing; this renderer owns their
   matched physical volume. No loop: scroll, resize and texture completion draw. */
import {crystalGeometryData} from './crystal-geometry.mjs';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const vertexShader=`
  varying vec3 vLocalPosition;
  varying vec3 vLocalNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  attribute float facet;
  varying float vFacet;
  void main(){
    vLocalPosition=position;
    vLocalNormal=normal;
    vViewNormal=normalize(normalMatrix*normal);
    vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
    vViewPosition=viewPosition.xyz;
    vWorldPosition=(modelMatrix*vec4(position,1.0)).xyz;
    vFacet=facet;
    gl_Position=projectionMatrix*viewPosition;
  }
`;
const fragmentShader=`
  precision highp float;
  uniform sampler2D uImage;
  uniform sampler2D uEnvironment;
  uniform vec3 uEye;
  uniform vec3 uMetric;
  uniform vec3 uTint;
  uniform vec3 uChamber;
  uniform vec2 uViewport;
  uniform vec2 uResolution;
  uniform vec2 uPlate;
  uniform vec2 uCenter;
  uniform float uEnvironmentReady;
  uniform float uImageAspect;
  uniform float uBodyAspect;
  uniform float uHasImage;
  uniform float uOpacity;
  uniform float uThickness;
  uniform vec2 uWindow;
  uniform float uFocus;
  uniform float uIor;
  uniform float uEmergence;
  uniform vec3 uForgeLight;
  uniform vec3 uColdLight;
  uniform mat3 uModelBasis;
  uniform mat3 uNormalBasis;
  uniform float uBackdropDistance;
  uniform vec4 uExitPlanes[24];
  uniform int uExitPlaneCount;
  varying vec3 vLocalPosition;
  varying vec3 vLocalNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vFacet;

  vec3 surroundings(vec2 uv){
    return mix(vec3(.065,.045,.035),texture2D(uEnvironment,clamp(uv,vec2(.001),vec2(.999))).rgb,uEnvironmentReady);
  }
  vec3 roomLight(vec3 ray,vec3 point){
    vec3 reflected=surroundings(vec2(.5)+ray.xy*vec2(.43,.38));
    vec3 cold=normalize(uColdLight-point),hot=normalize(uForgeLight-point);
    float coldGlint=pow(max(0.0,dot(ray,cold)),42.0);
    float hotGlint=pow(max(0.0,dot(ray,hot)),25.0);
    float coldFalloff=clamp(uViewport.y*uViewport.y/max(1.0,dot(uColdLight-point,uColdLight-point)),.35,1.1);
    float hotFalloff=clamp(uViewport.y*uViewport.y/max(1.0,dot(uForgeLight-point,uForgeLight-point)),.30,1.0);
    // A finite, split studio source crosses only normals which actually
    // reflect it. Its narrow interrupted image is never a silhouette stroke.
    vec3 boxDirection=normalize(vec3(-.95,0.0,-.30));
    vec3 boxLong=vec3(0.0,1.0,0.0);
    vec3 boxShort=normalize(cross(boxDirection,boxLong));
    float projection=max(.001,dot(ray,boxDirection));
    vec2 source=vec2(dot(ray,boxLong),dot(ray,boxShort))/projection;
    float softbox=(1.0-smoothstep(.035,.070,abs(source.y)))*(1.0-smoothstep(.52,.64,abs(source.x)));
    softbox*=smoothstep(.035,.058,abs(source.x))*step(.12,dot(ray,boxDirection));
    // At finite distance the source also has a footprint on the crown. The
    // narrow reflected panel crosses the facet interior; it is not an edge
    // detector, silhouette, wireframe or a continuous surrounding border.
    float panel=(1.0-smoothstep(.022,.060,abs(vLocalPosition.x+.80)))*(1.0-smoothstep(.56,.77,abs(vLocalPosition.y)));
    panel*=smoothstep(.055,.105,abs(vLocalPosition.y+.10))*smoothstep(.84,.97,dot(ray,boxDirection));
    softbox=max(softbox,panel);
    softbox*=step(.5,vFacet)*(1.0-step(3.5,vFacet));
    return reflected*.48+vec3(.88,.94,1.0)*(coldGlint*1.7+softbox*2.8)*coldFalloff+
      vec3(1.0,.29,.065)*hotGlint*1.55*hotFalloff;
  }
  void main(){
    vec3 normal=normalize(vLocalNormal/uMetric);
    vec3 incident=normalize((vLocalPosition-uEye)*uMetric);
    vec3 ray=refract(incident,normal,1.0/uIor)/uMetric;
    // Intersect the physically scaled transmitted ray with the embedded image.
    float distanceInside=max(0.0,(vLocalPosition.z+uThickness*.18)/max(.00001,-ray.z));
    vec2 transmitted=(vLocalPosition.xy+ray.xy*distanceInside)/uWindow*.5+.5;
    float aspect=uImageAspect/max(.1,uBodyAspect*uWindow.x/uWindow.y);
    vec2 imageUV=transmitted;
    if(aspect>1.0)imageUV.y=(imageUV.y-.5)*aspect+.5;
    else imageUV.x=(imageUV.x-.5)/max(aspect,.05)+.5;
    float inPicture=step(0.0,imageUV.x)*step(imageUV.x,1.0)*step(0.0,imageUV.y)*step(imageUV.y,1.0);
    vec4 image=texture2D(uImage,clamp(imageUV,vec2(.001),vec2(.999)));
    float picture=inPicture*uHasImage*image.a;
    // Intersect the transmitted ray with the existing pavilion's actual
    // convex planes. Thickness is a real distance through this individual cut.
    float exitTravel=max(0.0,(vLocalPosition.z+uThickness*.82)/max(.00001,-ray.z));
    vec3 exitNormal=vec3(0.0,0.0,-1.0);
    if(picture<.95||vFacet>.5){
      for(int i=0;i<24;i++){
        if(i>=uExitPlaneCount)break;
        vec4 plane=uExitPlanes[i];float denominator=dot(plane.xyz,ray);
        if(denominator>.00001){
          float travel=-(dot(plane.xyz,vLocalPosition)+plane.w)/denominator;
          if(travel>.00001&&travel<exitTravel){exitTravel=travel;exitNormal=plane.xyz;}
        }
      }
    }
    vec3 viewNormal=normalize(vViewNormal);
    vec3 viewDirection=normalize(-vViewPosition);
    float facing=clamp(dot(viewNormal,viewDirection),0.0,1.0);
    float f0=pow((uIor-1.0)/(uIor+1.0),2.0);
    float fresnel=f0+(1.0-f0)*pow(1.0-facing,5.0);

    // The very same self-hosted chamber plate is projected under each pixel.
    // Its transform matches the CSS plate. A thick crystal magnifies and bends
    // that environment rather than covering it with a flat coloured polygon.
    vec2 screen=gl_FragCoord.xy/uResolution;
    vec2 plateSize=uPlate*uChamber.z;
    vec2 environmentUV=(screen-.5-vec2(uChamber.x,-uChamber.y))*uViewport/plateSize+.5;
    vec2 centreUV=(uCenter-.5-vec2(uChamber.x,-uChamber.y))*uViewport/plateSize+.5;
    vec3 transmittedView=refract(-viewDirection,viewNormal,1.0/uIor);
    vec2 bend=transmittedView.xy/max(.16,-transmittedView.z)*uThickness*uMetric.z*1.25/plateSize;
    float magnification=1.13+uThickness*.11;
    vec2 lensUV=centreUV+(environmentUV-centreUV)/magnification+bend;
    vec3 insideRay=normalize(uModelBasis*ray);
    vec3 exitNormalView=normalize(uNormalBasis*exitNormal);
    vec3 outsideRay=refract(insideRay,-exitNormalView,uIor);
    float internal=1.0-step(.0001,dot(outsideRay,outsideRay));
    internal=max(internal,step(-.08,outsideRay.z));
    vec3 exitWorld=vWorldPosition+uModelBasis*(ray*exitTravel);
    float backdropGap=max(32.0,exitWorld.z+uBackdropDistance);
    vec2 pavilionShift=(exitWorld.xy-vWorldPosition.xy+outsideRay.xy/max(.30,-outsideRay.z)*backdropGap)/plateSize;
    lensUV+=clamp(pavilionShift,vec2(-.15),vec2(.15))*.24*(1.0-internal);
    vec2 dispersion=viewNormal.xy*.00125*(1.0-facing);
    vec3 through=vec3(surroundings(lensUV+dispersion).r,surroundings(lensUV).g,surroundings(lensUV-dispersion).b);
    vec3 absorption=exp(-vec3(.09,.105,.115)*exitTravel/max(uMetric.x,uMetric.y));
    through*=absorption*.96;
    vec3 reflection=roomLight(reflect(-viewDirection,viewNormal),vWorldPosition);
    float table=1.0-step(.5,vFacet);
    float girdle=step(2.5,vFacet)*(1.0-step(3.5,vFacet));
    float side=step(1.5,vFacet);
    vec3 hotDirection=normalize(uForgeLight-vWorldPosition),coldDirection=normalize(uColdLight-vWorldPosition);
    float warmSide=max(0.0,dot(viewNormal,hotDirection));
    float brightSide=max(0.0,dot(viewNormal,coldDirection));
    float reflectionMix=clamp(fresnel*.86+(1.0-table)*.10+girdle*.25+internal*.13,0.0,.84);
    vec3 glass=mix(through,reflection,reflectionMix);
    // Narrow opposite polished walls catch ivory and ruby/amber source light.
    glass+=girdle*(vec3(.12,.145,.17)*pow(brightSide,3.0)+vec3(.22,.060,.012)*pow(warmSide,2.0));
    glass*=1.0-side*pow(max(0.0,dot(viewNormal,-coldDirection)),2.0)*.18;
    glass=mix(glass,image.rgb*mix(vec3(1.0),absorption,.35)*(1.01+uFocus*.03),picture*(table*.965+(1.0-table)*.14));
    glass+=reflection*picture*table*fresnel*.18;
    float specular=pow(max(0.0,dot(reflect(normalize(vec3(.5,-.8,-1.0)),viewNormal),viewDirection)),110.0);
    glass+=vec3(.90,.87,.77)*specular*.40+uTint*.007;
    glass*=mix(.64,1.0,uEmergence);
    glass+=vec3(.22,.075,.013)*(1.0-uEmergence)*(girdle*.85+(1.0-table)*pow(warmSide,2.0)*.55);
    gl_FragColor=vec4(glass,uOpacity*(.93+fresnel*.07));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * createScene(canvas) -> {resize(cssWidth,cssHeight), setActive(bool), draw(state)}
 * state.nodes: [{index,id?,x,y,width?,height?,scale?,opacity,media?}].
 * x/y are 0..1 stage centres. width/height are FINAL CSS pixels, never rescaled.
 * The legacy scale is used only when explicit dimensions are absent.
 * state.crystalVisibility is the controller's 0..1 map/transition visibility.
 * A zero value clears the stage; product cards never receive a glass backdrop.
 */
export function createScene(canvas){
  let width=1,height=1,frames=0,renderer,scene,camera,T,last;
  let started=false,disposed=false,active=true,contextLost=false,renderFailed=false;
  let environmentImage,environmentUniform,environmentReady;
  let vendorPromise,warmStarted=false;
  let warmPromise,rendererPromise,preparationPromise,preparing=false,nativeOpening=false;
  let nativeWaiting=false,permanentFallback=false,retryTimer=0,lastGesture=0,backgroundAttempt=false;
  const warmedImages=new Map();
  const crystals=new Map(),scope=new AbortController();
  const root=canvas.closest('[data-living-journey]')||document;
  const links=[...root.querySelectorAll('.living-node')];
  const pixelRatio=()=>Math.max(.5,Math.min(devicePixelRatio||1,width<600?1:1.25,Math.sqrt(1650000/(width*height))));
  canvas.dataset.sceneState='deferred';canvas.dataset.crystals='deferred';
  canvas.dataset.crystalCount='0';canvas.dataset.activeCut='';canvas.dataset.crystalSources='';
  const renderable=()=>active&&!disposed&&!contextLost&&!renderFailed&&!nativeOpening&&!document.hidden;
  function fallback(){
    canvas.dataset.sceneState='fallback';canvas.dataset.crystals='fallback';
    canvas.dataset.crystalCount='0';
  }
  function makeSymbolTexture(link){
    const source=link?.querySelector('.crystal-inscription svg');
    const plate=document.createElement('canvas');plate.width=plate.height=256;
    const context=plate.getContext('2d');
    if(context&&source){
      const box=(source.getAttribute('viewBox')||'0 0 32 32').split(/[ ,]+/).map(Number);
      context.save();context.translate(30,30);context.scale(196/box[2],196/box[3]);context.translate(-box[0],-box[1]);
      context.strokeStyle='#e5d6c3';context.lineWidth=Number(source.getAttribute('stroke-width'))||1.5;
      context.lineCap='round';context.lineJoin='round';
      for(const path of source.querySelectorAll('path')){
        const shape=new Path2D(path.getAttribute('d')||'');
        if(path.getAttribute('fill')&&path.getAttribute('fill')!=='none'){context.fillStyle='#e5d6c3';context.fill(shape);}
        context.stroke(shape);
      }
      context.restore();
    }
    const texture=new T.CanvasTexture(plate);texture.colorSpace=T.SRGBColorSpace;
    return {texture,hasImage:source?1:0,kind:source?'original-symbol':'unavailable',source:source?'inline product symbol':''};
  }
  function refresh(){if(last&&renderable())draw(last);}
  function warmedImage(source){
    const url=new URL(source,location.href);
    if(url.origin!==location.origin)return null;
    if(warmedImages.has(url.href))return warmedImages.get(url.href);
    const image=new Image();image.decoding='async';image.src=url.href;
    warmedImages.set(url.href,image);image.decode().catch(()=>{});
    return image;
  }
  function prewarm(){
    if(warmStarted||disposed)return warmPromise||Promise.resolve();
    warmStarted=true;
    vendorPromise=import('./vendor/three/three.module.js').catch(()=>null);
    for(const link of links.slice(0,6)){
      const image=link.querySelector('.crystal-image');
      if(image)warmedImage(image.currentSrc||image.getAttribute('src'));
    }
    warmedImage(new URL('./brand/foundry-gallery.webp',import.meta.url).href);
    canvas.dataset.crystalWarmup='requested';
    warmPromise=Promise.all([...warmedImages.values()].map(image=>image.decode().catch(()=>null)).concat(vendorPromise)).then(results=>{
      if(!disposed)canvas.dataset.crystalWarmup=[...warmedImages.values()].every(image=>image.complete&&image.naturalWidth>0)&&results.at(-1)?'ready':'partial';
      if(!disposed&&!nativeOpening&&!preparationPromise){
        const prepare=()=>{if(active&&!document.hidden&&!nativeOpening)void prepareOpening();};
        if(typeof requestIdleCallback==='function')requestIdleCallback(prepare,{timeout:400});else setTimeout(prepare,0);
      }
    });
    return warmPromise;
  }
  function useNativeOpening(){
    nativeOpening=true;
    canvas.dataset.openingPrepared='fallback';
    canvas.dataset.openingPreparation='native-only';
    fallback();
  }
  function queueOpeningRetry(){
    if(retryTimer||!nativeWaiting||!nativeOpening||permanentFallback||preparing||!active||document.hidden||contextLost||!last?.openingSettled)return;
    retryTimer=setTimeout(()=>{
      retryTimer=0;
      const retry=()=>{
        if(!nativeWaiting||!nativeOpening||permanentFallback||preparing||disposed||!active||document.hidden||contextLost||!last?.openingSettled)return;
        if(performance.now()-lastGesture<500){queueOpeningRetry();return;}
        nativeOpening=false;nativeWaiting=false;preparationPromise=null;backgroundAttempt=true;
        prepareOpening().then(result=>{
          backgroundAttempt=false;
          if(result.status==='deferred'){nativeOpening=true;nativeWaiting=true;queueOpeningRetry();}
        });
      };
      if(typeof requestIdleCallback==='function')requestIdleCallback(retry,{timeout:1800});else retry();
    },550);
  }
  function finishOpening(){
    if(!nativeOpening||disposed||permanentFallback)return;
    nativeWaiting=true;queueOpeningRetry();
  }
  function prepareOpening(){
    if(nativeOpening||disposed||contextLost)return Promise.resolve({status:'fallback',crystals:0,milliseconds:0});
    if(preparationPromise)return preparationPromise;
    if(!active||document.hidden)return Promise.resolve({status:'deferred',crystals:0,milliseconds:0});
    const began=performance.now();
    const inBackground=backgroundAttempt;
    preparationPromise=(async()=>{
      let target,previousTarget,saved=[];
      const result=status=>({status,crystals:status==='ready'?6:0,milliseconds:Math.round(performance.now()-began)});
      const gestureDeferred=()=>{
        if(inBackground&&performance.now()-lastGesture<500){nativeOpening=true;nativeWaiting=true;return true;}
        return false;
      };
      try{
        preparing=true;canvas.dataset.openingPrepared='preparing';
        await prewarm();
        if(nativeOpening||disposed||contextLost)return result('fallback');
        if(!active||document.hidden||gestureDeferred())return result('deferred');
        await load();
        if(nativeOpening||disposed||contextLost||!renderer)return result('fallback');
        if(!active||document.hidden||gestureDeferred())return result('deferred');
        const first=[...crystals.values()].slice(0,6);
        for(const item of first){item.loadImage();renderer.initTexture(item.texture);}
        renderer.initTexture(environmentUniform.value);
        saved=[...crystals.values()].map(item=>({mesh:item.mesh,visible:item.mesh.visible,position:item.mesh.position.clone(),rotation:item.mesh.rotation.clone(),scale:item.mesh.scale.clone()}));
        for(const item of crystals.values())item.mesh.visible=item.index<6;
        for(const item of first){
          item.mesh.position.set((item.index%3-1)*1.7,(item.index<3?.8:-.8),0);item.mesh.rotation.set(.1,.2,0);item.mesh.scale.setScalar(.55);item.mesh.updateMatrixWorld(true);
          item.uniforms.uOpacity.value=1;item.uniforms.uEmergence.value=1;
        }
        const warmCamera=new T.OrthographicCamera(-3,3,2,-2,.1,50);warmCamera.position.z=12;
        await renderer.compileAsync(scene,warmCamera);
        if(nativeOpening||disposed||contextLost)return result('fallback');
        if(!active||document.hidden||gestureDeferred())return result('deferred');
        previousTarget=renderer.getRenderTarget();target=new T.WebGLRenderTarget(32,32,{depthBuffer:true});
        renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,warmCamera);
        // A render target uses a linear output program in Three. Exercise the
        // exact SRGB canvas pipeline too, in a hidden 32px scissor, then clear it
        // before the browser can present anything. Otherwise a driver can still
        // perform its first real pipeline compilation during the opening.
        renderer.setRenderTarget(null);
        const viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest(),visibility=canvas.style.visibility;
        canvas.style.visibility='hidden';
        try{
          renderer.setViewport(0,0,32,32);renderer.setScissor(0,0,32,32);renderer.setScissorTest(true);renderer.render(scene,warmCamera);
          renderer.getContext().finish();
        }finally{
          renderer.setScissorTest(scissorTest);renderer.setScissor(scissor);renderer.setViewport(viewport);renderer.clear();canvas.style.visibility=visibility;
        }
        const gl=renderer.getContext();gl.finish();
        if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw new Error('Opening GPU preparation unavailable');
        const ready=result('ready');
        canvas.dataset.openingPrepared='ready';canvas.dataset.openingPreparation='GPU textures / programs / six meshes / offscreen and SRGB canvas pipelines';
        canvas.dataset.openingPrepareMs=String(ready.milliseconds);canvas.dataset.openingPreparedCount='6';
        return ready;
      }catch(error){
        renderFailed=true;permanentFallback=true;fallback();canvas.dataset.openingPrepared='fallback';
        return result('fallback');
      }finally{
        if(renderer&&target){renderer.setRenderTarget(previousTarget||null);target.dispose();}
        for(const state of saved){state.mesh.visible=state.visible;state.mesh.position.copy(state.position);state.mesh.rotation.copy(state.rotation);state.mesh.scale.copy(state.scale);}
        preparing=false;
        if(!nativeOpening&&last&&renderable())draw(last);
        else if(nativeWaiting)queueOpeningRetry();
      }
    })().then(result=>{
      if(result.status==='deferred')preparationPromise=null;
      else if(result.status==='fallback')canvas.dataset.openingPrepared='fallback';
      return result;
    });
    return preparationPromise;
  }
  function makeCrystal(index){
    const link=links[index],id=link?.dataset.projectId||`project-${index}`;
    const data=crystalGeometryData(id,index);
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(data.position,3));
    geometry.setAttribute('normal',new T.BufferAttribute(data.normal,3));
    geometry.setAttribute('uv',new T.BufferAttribute(data.uv,2));
    geometry.setAttribute('facet',new T.BufferAttribute(data.facet,1));
    geometry.computeBoundingSphere();geometry.computeBoundingBox();
    const symbol=makeSymbolTexture(link);
    const tint=new T.Color().setHSL(.60+(index%5)*.018,.16,.28+(index%3)*.025);
    const uniforms={
      uImage:{value:symbol.texture},uEye:{value:new T.Vector3(0,0,20)},uMetric:{value:new T.Vector3(1,1,1)},uTint:{value:tint},
      uEnvironment:environmentUniform,uEnvironmentReady:environmentReady,
      uChamber:{value:new T.Vector3(0,0,1.07)},uViewport:{value:new T.Vector2(width,height)},
      uResolution:{value:new T.Vector2(width,height)},uPlate:{value:new T.Vector2(width,height)},
      uCenter:{value:new T.Vector2(.5,.5)},
      uImageAspect:{value:1},uBodyAspect:{value:1},uHasImage:{value:symbol.hasImage},
      uOpacity:{value:1},uThickness:{value:data.depth},uWindow:{value:new T.Vector2(data.table*.97,data.tableY*.97)},
      uFocus:{value:0},uIor:{value:1.46},uEmergence:{value:1},
      uForgeLight:{value:new T.Vector3(500,-100,-300)},uColdLight:{value:new T.Vector3(-500,500,600)},
      uModelBasis:{value:new T.Matrix3()},uNormalBasis:{value:new T.Matrix3()},uBackdropDistance:{value:600},
      uExitPlanes:{value:Array.from({length:24},(_,i)=>new T.Vector4(...(i<data.exitPlanes.length/4?data.exitPlanes.slice(i*4,i*4+4):[0,0,0,0])))},
      uExitPlaneCount:{value:data.exitPlanes.length/4},
    };
    const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:true,side:T.FrontSide});
    const mesh=new T.Mesh(geometry,material);mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
    const item={id,index,link,mesh,uniforms,cut:data.name,depth:data.depth,kind:symbol.kind,source:symbol.source,texture:symbol.texture};
    crystals.set(index,item);
    if(link){link.dataset.crystalCut=data.name;link.dataset.crystalFaces=String(data.facetCount);}
    // Load only the original reviewed image already assigned to this DOM link.
    // Image is self-origin; no data/blob URL, API, new asset or CORS bypass.
    const original=link?.querySelector('.crystal-image');
    item.loadImage=()=>{
      if(!original||item.image||disposed)return;
      const url=new URL(original.currentSrc||original.getAttribute('src'),location.href);
      if(url.origin!==location.origin)return;
      const image=warmedImages.get(url.href)||new Image();image.decoding='async';
      const accept=redraw=>{
        if(disposed)return;
        const texture=new T.Texture(image);texture.colorSpace=T.SRGBColorSpace;
        texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
        item.texture.dispose();item.texture=texture;item.uniforms.uImage.value=texture;
        item.uniforms.uImageAspect.value=image.naturalWidth/image.naturalHeight;
        item.uniforms.uHasImage.value=1;item.kind='original-image';item.source=image.currentSrc||image.src;
        if(link)link.dataset.crystalTexture='original-image';if(redraw)refresh();
      };
      image.onload=()=>accept(true);
      image.onerror=()=>{if(link)link.dataset.crystalTexture=symbol.kind;refresh();};
      item.image=image;
      if(image.complete&&image.naturalWidth)accept(false);else if(!image.src)image.src=url.href;
    };
    if(!original&&link)link.dataset.crystalTexture=symbol.kind;
    return item;
  }
  function load(){
    if(!rendererPromise)rendererPromise=createRenderer();
    return rendererPromise;
  }
  async function createRenderer(){
    if(started||disposed)return;
    started=true;canvas.dataset.sceneState='loading';canvas.dataset.crystals='loading';
    try{
      T=await (vendorPromise||import('./vendor/three/three.module.js'));
      if(!T)throw new Error('WebGL module unavailable');
      if(disposed)return;
      renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.debug.onShaderError=()=>{throw new Error('Crystal shader compilation failed');};
      renderer.setPixelRatio(pixelRatio());renderer.setSize(width,height,false);
      renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
      const empty=new T.DataTexture(new Uint8Array([25,16,12,255]),1,1);empty.needsUpdate=true;
      environmentUniform={value:empty};environmentReady={value:0};
      const environmentURL=new URL('./brand/foundry-gallery.webp',import.meta.url).href;
      environmentImage=warmedImages.get(environmentURL)||new Image();environmentImage.decoding='async';
      const acceptEnvironment=()=>{
        if(disposed)return;
        const texture=new T.Texture(environmentImage);texture.colorSpace=T.SRGBColorSpace;
        texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
        environmentUniform.value.dispose();environmentUniform.value=texture;environmentReady.value=1;
        canvas.dataset.crystalEnvironment='original-foundry-gallery';refresh();
      };
      environmentImage.onload=acceptEnvironment;
      if(environmentImage.complete&&environmentImage.naturalWidth)queueMicrotask(acceptEnvironment);
      else if(!environmentImage.src)environmentImage.src=environmentURL;
      scene=new T.Scene();
      // CSS pixel coordinates remove perspective-size drift from hit targets.
      // Depth remains in real side faces, facet normals and the optical ray
      // path. A fixed orthographic camera keeps every link aligned.
      camera=new T.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,4000);
      camera.position.z=1600;
      for(let index=0;index<links.length;index++)makeCrystal(index);
      canvas.dataset.renderer='Three.js / WebGL / faceted refractive solids / on demand';
      if(last&&renderable())draw(last);
    }catch(error){
      permanentFallback=true;
      fallback();renderer?.dispose();renderer=null;
      canvas.dataset.sceneError=error?.name||'WebGL unavailable';
    }
  }
  function draw(state){
    last=state;if(nativeWaiting)queueOpeningRetry();if(!renderable()||preparing)return;
    const visibility=clamp(state.crystalVisibility??(state.progress<2.8?1:0));
    const visibleNodes=(state.nodes||[]).filter(node=>node.opacity>.015&&visibility>.005&&(node.media||0)<.985);
    if(!renderer){if(visibleNodes.length)load();return;}
    for(const item of crystals.values())item.mesh.visible=false;
    const cuts=[],sources=[];
    for(const node of visibleNodes){
      const item=crystals.get(node.index);if(!item)continue;
      item.loadImage();
      const explicit=Number.isFinite(node.width)&&Number.isFinite(node.height);
      const legacyScale=explicit?1:(node.scale??1);
      const cssWidth=explicit?node.width:(item.link?.offsetWidth||124)*legacyScale;
      const cssHeight=explicit?node.height:(item.link?.offsetHeight||144)*legacyScale;
      const opacity=clamp(node.opacity*visibility*(1-clamp(node.media||0)));
      if(opacity<.015||cssWidth<1||cssHeight<1)continue;
      const focus=state.near===node.index?1:0;
      const firstCuts=[[-.11,-.29,-.055],[.13,.23,.04],[-.08,-.34,.075],[.14,.28,-.075],[-.10,-.21,.055],[.12,.34,-.025]];
      const orientation=firstCuts[node.index]||[(node.index%2?1:-1)*(.075+node.index%3*.03),(node.index%2?1:-1)*(.18+node.index%4*.045),Math.sin(node.index*1.37)*.08];
      const yaw=Number.isFinite(node.yaw)?node.yaw:orientation[1]+Math.sin(state.progress*.34+node.index)*.018;
      const pitch=Number.isFinite(node.pitch)?node.pitch:orientation[0]+Math.cos(state.progress*.27+node.index)*.012;
      const roll=Number.isFinite(node.roll)?node.roll:orientation[2];
      // The link's measured box includes the full silhouette. Rotation margins
      // leave the volume within it, including the pavilion and side wall.
      const depthPx=Math.min(cssWidth,cssHeight)*.48;
      const mesh=item.mesh;
      mesh.visible=true;mesh.position.set((node.x-.5)*width,(.5-node.y)*height+(focus?3:0),Number.isFinite(node.z)?node.z:0);
      mesh.rotation.set(pitch,yaw,roll);
      mesh.scale.set(cssWidth*.455,cssHeight*.455,depthPx);
      // Measure the rotated volume, including its pavilion, within the exact
      // accessible link footprint rather than letting depth overhang a label.
      const bounds=item.mesh.geometry.boundingBox.clone();
      const rotation=new T.Matrix4().makeRotationFromEuler(mesh.rotation);
      rotation.scale(mesh.scale);bounds.applyMatrix4(rotation);
      const fit=Math.min(cssWidth*.96/(bounds.max.x-bounds.min.x),cssHeight*.96/(bounds.max.y-bounds.min.y));
      mesh.scale.multiplyScalar(fit);
      mesh.position.x-=(bounds.max.x+bounds.min.x)*fit*.5;
      mesh.position.y-=(bounds.max.y+bounds.min.y)*fit*.5;
      item.uniforms.uMetric.value.copy(mesh.scale);
      mesh.updateMatrixWorld(true);
      item.uniforms.uModelBasis.value.setFromMatrix4(mesh.matrixWorld);
      item.uniforms.uNormalBasis.value.getNormalMatrix(mesh.matrixWorld);
      item.uniforms.uEye.value.copy(camera.position);mesh.worldToLocal(item.uniforms.uEye.value);
      item.uniforms.uBodyAspect.value=cssWidth/cssHeight;
      item.uniforms.uCenter.value.set(node.x,1-node.y+(focus?3/height:0));
      const chamber=state.chamber||{x:0,y:0,zoom:1.07};
      item.uniforms.uChamber.value.set(chamber.x,chamber.y,chamber.zoom);
      item.uniforms.uViewport.value.set(width,height);
      renderer.getDrawingBufferSize(item.uniforms.uResolution.value);
      const plateWidth=Math.max(width,height*1.5);
      item.uniforms.uPlate.value.set(plateWidth,plateWidth/1.5);
      const plateHeight=plateWidth/1.5,minimum=Math.min(width,height);
      item.uniforms.uForgeLight.value.set(chamber.x*width+.312*plateWidth*chamber.zoom,-chamber.y*height-.065*plateHeight*chamber.zoom,-minimum*.40);
      item.uniforms.uColdLight.value.set(-width*.42,height*.64,minimum*.78);
      item.uniforms.uBackdropDistance.value=Math.max(450,minimum*.65);
      item.uniforms.uOpacity.value=opacity;item.uniforms.uFocus.value=focus;
      item.uniforms.uEmergence.value=clamp(node.emergence??1);
      if(item.link){
        item.link.dataset.meshX=node.x.toFixed(5);item.link.dataset.meshY=node.y.toFixed(5);
        item.link.dataset.meshZ=mesh.position.z.toFixed(2);
        item.link.dataset.meshWidth=cssWidth.toFixed(2);item.link.dataset.meshHeight=cssHeight.toFixed(2);
        item.link.dataset.meshYaw=yaw.toFixed(4);item.link.dataset.meshEmergence=clamp(node.emergence??1).toFixed(3);
      }
      cuts.push(item.cut);sources.push(`${item.id}:${item.kind}`);
    }
    try{
      renderer.render(scene,camera);
      // Only a completed real render suppresses the accessible DOM fallback.
      canvas.dataset.sceneState='ready';canvas.dataset.crystals='ready';
      canvas.dataset.crystalCount=String(cuts.length);canvas.dataset.activeCut=cuts.join(' ');
      canvas.dataset.crystalSources=sources.join(' ');
      canvas.dataset.crystalDepths=visibleNodes.map(node=>`${node.index}:${(node.z||0).toFixed(1)}`).join(' ');
      canvas.dataset.frames=String(++frames);canvas.dataset.motion='settled';
    }catch(error){renderFailed=true;fallback();canvas.dataset.sceneError=error?.name||'Render unavailable';}
  }
  function dispose(){
    if(disposed)return;disposed=true;scope.abort();
    if(retryTimer)clearTimeout(retryTimer);
    for(const item of crystals.values()){
      if(item.image){item.image.onload=null;item.image.onerror=null;}
      item.mesh.geometry.dispose();item.mesh.material.dispose();item.texture.dispose();
    }
    crystals.clear();renderer?.dispose();
    if(environmentImage){environmentImage.onload=null;environmentImage.onerror=null;}
    environmentUniform?.value.dispose();
  }
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;preparationPromise=null;fallback();
  },{signal:scope.signal});
  canvas.addEventListener('webglcontextrestored',()=>{
    contextLost=false;renderFailed=false;preparationPromise=null;
    for(const item of crystals.values()){item.texture.needsUpdate=true;item.mesh.material.needsUpdate=true;}
    if(environmentUniform)environmentUniform.value.needsUpdate=true;
    // Three's restore listener runs in this same event. Draw after all restore
    // listeners have rebuilt GPU state; an early render would silently no-op.
    if(renderer&&last)requestAnimationFrame(()=>{if(renderable())draw(last);});
  },{signal:scope.signal});
  addEventListener('pagehide',event=>{if(!event.persisted)dispose();},{signal:scope.signal});
  const gesture=event=>{
    if(event.type==='pointermove'&&!event.buttons)return;
    lastGesture=performance.now();
    if(retryTimer){clearTimeout(retryTimer);retryTimer=0;}
    if(nativeWaiting)queueOpeningRetry();
  };
  for(const type of ['pointerdown','pointermove','touchstart','touchmove','wheel','keydown'])root.addEventListener(type,gesture,{passive:true,signal:scope.signal});
  return {
    prewarm,
    prepareOpening,
    useNativeOpening,
    finishOpening,
    setActive(value){active=Boolean(value);},
    resize(w,h){
      width=Math.max(1,w);height=Math.max(1,h);
      if(renderer){
        renderer.setPixelRatio(pixelRatio());renderer.setSize(width,height,false);
        camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
      }
    },
    draw,
  };
}
