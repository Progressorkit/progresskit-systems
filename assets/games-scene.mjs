import * as T from './vendor/three/three.module.js';
export function mountScene(canvas,root,reduced) {
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});}catch{canvas.dataset.sceneState='fallback';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<600?1:1.5));
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,60),group=new T.Group();scene.add(group);
  scene.add(new T.HemisphereLight(0xe2c6ff,0x21132e,3));const key=new T.DirectionalLight(0xefdcff,4);key.position.set(-3,5,6);scene.add(key);
  const lamp=new T.PointLight(0x9c5be8,30,15);lamp.position.set(1,2,1);scene.add(lamp);
  const material=(color,metalness=.25)=>new T.MeshStandardMaterial({color,metalness,roughness:.38});
  function box(w,h,d,x,y,z,color){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);group.add(m);return m;}
  const isRoom=root.dataset.game==='taskpet';let portals=[];
  if(isRoom){
    box(8,.18,6,0,-1.2,0,0x432a60);box(8,4,.16,0,.7,-2.7,0x281b3e);box(.16,4,6,-4,.7,0,0x352346);
    box(2.5,.3,1.3,-2,-.65,-1.1,0x966dba);box(2.5,.65,.2,-2,-.2,-1.65,0x714e8d);
    for(const x of [-2.9,-1.1])box(.12,.5,.8,x,-.9,-1.1,0x3b284f);
    box(1.35,2.3,.3,2.6,.05,-2.3,0x6d4c82);for(let i=0;i<3;i++)box(1.5,.12,.6,2.6,-.8+i*.8,-2.15,0xa385b2);
    const crystal=new T.Mesh(new T.OctahedronGeometry(.38),material(0xbe97f5,.65));crystal.position.set(1.2,.4,-1.7);group.add(crystal);
    const rug=new T.Mesh(new T.CylinderGeometry(1.6,1.6,.025,32),material(0x744779));rug.position.set(0,-1.08,.5);group.add(rug);
    for(let i=0;i<5;i++){const arch=new T.Mesh(new T.TorusGeometry(.38,.025,5,24,Math.PI),material(0xbd9cca,.8));arch.position.set(-2.5+i*1.2,1.4,-2.58);group.add(arch);}
  } else {
    const colors=[0x98d5b2,0x8b9af1,0xab83dd,0xd58bba,0x66c9bf,0xc9c8ed];
    colors.forEach((color,i)=>{const ring=new T.Mesh(new T.TorusGeometry(.65,.08,6,40),material(color,.7));ring.position.set((i%3-1)*2.2,Math.floor(i/3)*1.8-.6,-1);ring.rotation.y=(i-2.5)*.08;group.add(ring);portals.push(ring);});
    box(8,.15,5,0,-1.5,-1,0x152b34);
  }
  camera.position.set(0,isRoom?2.4:.5,isRoom?10:9);camera.lookAt(0,0,0);
  let turn=0,close=false,visible=true,raf=0,last=0,frames=0,ended=false;
  function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);camera.updateProjectionMatrix();render();}
  function render(time=0){if(ended||!visible||document.hidden)return;group.rotation.y=turn*Math.PI/180;camera.position.z=close?8.5:isRoom?10:9;
    if(!reduced.matches){lamp.intensity=27+Math.sin(time*.001)*3;portals.forEach((p,i)=>p.rotation.z=Math.sin(time*.0002+i)*.03);}renderer.render(scene,camera);canvas.dataset.frames=String(++frames);}
  function tick(time){raf=0;if(ended||!visible||document.hidden||reduced.matches)return;if(time-last>=(innerWidth<600?65:40)){render(time);last=time;}raf=requestAnimationFrame(tick);}
  function start(){cancelAnimationFrame(raf);raf=0;render();if(visible&&!document.hidden&&!reduced.matches&&!ended)raf=requestAnimationFrame(tick);}
  const io=new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting);start();});io.observe(canvas);
  const ro=new ResizeObserver(resize);ro.observe(canvas);
  document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
  root.addEventListener('game-view',e=>{turn=e.detail.turn;close=e.detail.close;render();});
  root.addEventListener('game-room-variant',e=>{lamp.color.setHex(e.detail==='starlit'?0x6d8bea:e.detail==='moonlit'?0xd79bdf:0x9c5be8);group.children[0].material.color.setHex(e.detail==='starlit'?0x2d365e:e.detail==='moonlit'?0x614263:0x432a60);render();});
  root.addEventListener('game-realm',e=>{const buttons=[...root.querySelectorAll('[data-realm]')];const at=buttons.findIndex(b=>b.dataset.realm===e.detail);portals.forEach((p,i)=>p.material.emissive.setHex(i===at?0x354a61:0));render();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);canvas.dataset.sceneState='fallback';if(isRoom)canvas.parentElement.dataset.webgl='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{canvas.dataset.sceneState='ready';if(isRoom)canvas.parentElement.dataset.webgl='ready';start();});
  addEventListener('pagehide',e=>{if(e.persisted)return;ended=true;cancelAnimationFrame(raf);io.disconnect();ro.disconnect();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.dispose();},{once:true});
  canvas.dataset.sceneState='ready';canvas.dataset.renderer='Three.js / WebGL';if(isRoom)canvas.parentElement.dataset.webgl='ready';resize();start();
}
