/* Real WebGL geometry, rendered only when the shared installation requests it. */
export function createScene(canvas) {
  let width=1,height=1,frames=0,scene,camera,renderer,core,rings=[],links=[],last;
  let started=false,disposed=false;
  canvas.dataset.sceneState='deferred';
  async function load() {
    if(started || disposed)return; started=true;canvas.dataset.sceneState='loading';
    try {
      const T=await import('./vendor/three/three.module.js');
      if(disposed)return;
      renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,width<600?1:1.5));
      renderer.setSize(width,height,false);
      scene=new T.Scene();camera=new T.PerspectiveCamera(38,width/height,.1,100);camera.position.z=12;
      scene.add(new T.HemisphereLight(0xdce8f3,0x08090d,2));
      const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,5,6);scene.add(light);
      const red=new T.PointLight(0x9b263c,18,15);red.position.set(3,-2,3);scene.add(red);
      core=new T.Group();scene.add(core);
      core.add(new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x35404b,metalness:.9,roughness:.34,wireframe:true,transparent:true,opacity:.48})));
      for(let i=0;i<3;i++) {
        const ring=new T.Mesh(new T.TorusGeometry(1.35+i*.18,.025,5,64),new T.MeshStandardMaterial({color:i===1?0x8e3043:0xa2b1bd,metalness:.9,roughness:.3}));
        ring.rotation.set(i*.55,.3+i*.6,.3);core.add(ring);rings.push(ring);
      }
      for(let i=0;i<6;i++) {
        const group=new T.Group();scene.add(group);
        const mesh=new T.Mesh(new T.CylinderGeometry(.34,.34,.13,6),new T.MeshStandardMaterial({color:0x566573,metalness:.8,roughness:.35,transparent:true,opacity:.6}));
        mesh.rotation.x=Math.PI/2;group.add(mesh);
        const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
        const line=new T.Line(geometry,new T.LineBasicMaterial({color:0x667480,transparent:true,opacity:.24}));scene.add(line);
        links.push({group,mesh,line});
      }
      canvas.dataset.sceneState='ready';canvas.dataset.renderer='Three.js / WebGL / on demand';
      if(last)draw(last);
    } catch {
      canvas.dataset.sceneState='fallback';renderer?.dispose();renderer=null;
    }
  }
  function draw(state) {
    last=state;if(!renderer){if(state.progress>.1||state.energy>.3)load();return;}
    const span=2*Math.tan(19*Math.PI/180)*camera.position.z;
    const place=(obj,x,y,z=0)=>obj.position.set((x-.5)*span*width/height,(.5-y)*span,z);
    place(core,state.core.x,state.core.y,-.9);
    core.rotation.set(.18+state.progress*.12,state.progress*.22,.16);
    core.scale.setScalar(width<600?.65:1.05);
    rings.forEach((ring,i)=>ring.rotation.z=.3+state.progress*(i%2?-.3:.25));
    links.forEach((link,i)=>{
      const node=state.nodes[i];link.group.visible=!!node&&node.opacity>.02;link.line.visible=link.group.visible;
      if(!link.group.visible)return;
      place(link.group,node.x,node.y,(i%3-1)*.2);
      link.group.rotation.y=(node.x-.5)*.6;link.mesh.material.opacity=node.opacity*.7;
      link.mesh.material.emissive.setHex(state.near===node.index?0x96263b:0x000000);
      const a=link.line.geometry.attributes.position;
      a.setXYZ(0,core.position.x,core.position.y,-.9);a.setXYZ(1,link.group.position.x,link.group.position.y,link.group.position.z);a.needsUpdate=true;
      link.line.geometry.computeBoundingSphere();link.line.material.color.setHex(state.near===node.index?0xed8294:0x667480);
      link.line.material.opacity=node.opacity*(state.near===node.index?.7:.2);
    });
    renderer.render(scene,camera);canvas.dataset.frames=String(++frames);canvas.dataset.motion='settled';
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();canvas.dataset.sceneState='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{if(renderer&&last){canvas.dataset.sceneState='ready';draw(last);}});
  addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;scene?.traverse(object=>{object.geometry?.dispose();if(object.material)object.material.dispose();});renderer?.dispose();},{once:true});
  return {resize(w,h){width=w;height=h;if(renderer){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}},draw};
}
