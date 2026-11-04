/* Ambient hot ash belongs behind the objects. Bounded Canvas2D pools, never DOM particles. */
const root = document.querySelector('.hero--installation');
if (root) {
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'), forced=matchMedia('(forced-colors: active)');
  const compact=matchMedia('(max-width: 700px)'), fine=matchMedia('(hover: hover) and (pointer: fine)');
  const listeners=[], pools=[], visible=new Set();
  let raf=0,timer=0,dead=false,leaving=false,frames=0,last=0,charge=0;
  const on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
  const paused=()=>reduce.matches||forced.matches||document.hidden||leaving||document.documentElement.dataset.interfaceMotion==='paused';
  const sprite=document.createElement('canvas');sprite.width=sprite.height=32;const s=sprite.getContext('2d');
  const g=s.createRadialGradient(16,16,0,16,16,15);g.addColorStop(0,'#fff2d8');g.addColorStop(.13,'#f4a174');g.addColorStop(.3,'#c94838b0');g.addColorStop(1,'#9b211d00');s.fillStyle=g;s.fillRect(0,0,32,32);
  for(const section of document.querySelectorAll('#start,#rdzen,#uslugi,#proces,#ekosystem,body.luxury-world>footer')) {
    const canvas=document.createElement('canvas');canvas.className='world-embers';canvas.setAttribute('aria-hidden','true');section.prepend(canvas);
    const core=section.id==='rdzen',hero=section.id==='start',footer=section.tagName==='FOOTER';
    const p={section,canvas,ctx:canvas.getContext('2d',{alpha:true}),w:1,h:1,scale:1,core,hero,footer,particles:[],frames:0};
    let seed=31+pools.length*211;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(let i=0;i<(core?52:hero?22:footer?7:9);i++)p.particles.push({x:rand(),phase:rand(),speed:.018+rand()*.025,z:rand(),wave:rand()*6.28,life:.3+rand()*.65});
    const resize=()=>{const b=section.getBoundingClientRect();p.w=b.width;p.h=b.height;p.scale=Math.min(.75,900/p.w,800/p.h);canvas.width=Math.max(1,Math.round(p.w*p.scale));canvas.height=Math.max(1,Math.round(p.h*p.scale));};
    p.resize=resize;resize();pools.push(p);
  }
  const objects=[...document.querySelectorAll('[data-installation-object]')];
  const observer=new IntersectionObserver(entries=>{for(const e of entries){e.target.dataset.installationVisible=String(e.isIntersecting);const p=pools.find(p=>p.section===e.target);if(p){if(e.isIntersecting)visible.add(p);else visible.delete(p);}}sync();},{threshold:.01});
  [...new Set([...pools.map(p=>p.section),...objects])].forEach(n=>observer.observe(n));
  const ro=new ResizeObserver(entries=>{for(const e of entries)pools.find(p=>p.section===e.target)?.resize();});pools.forEach(p=>ro.observe(p.section));
  function stop(){cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;last=0;}
  function draw(now){raf=0;if(paused()||dead||!visible.size)return;last=now;const time=now/1000;
    for(const p of visible){const {ctx,w,h}=p;ctx.setTransform(p.scale,0,0,p.scale,0,0);ctx.clearRect(0,0,w,h);
      const max=compact.matches?Math.ceil(p.particles.length*.4):p.particles.length;
      const energy=p.core&&now<charge?1.7:1;
      p.particles.slice(0,max).forEach((a,i)=>{const phase=(a.phase+time*a.speed*energy)%1,fade=Math.sin(phase*Math.PI)*a.life;
        const x=p.core?w*(.24+a.x*.52)+Math.sin(time*.22+a.wave)*18:p.hero?w*(.54+a.x*.4):(i%2?w*(.93+a.x*.06):w*(.01+a.x*.07));
        const y=p.core?h*(.82-phase*.58):p.hero?h*(.76-phase*.48):h*(1-phase);
        const size=(p.core?2.5:1.8)+a.z*3.4;ctx.globalAlpha=fade*(p.footer?.4:.6)*energy;ctx.drawImage(sprite,x-size*2,y-size*2,size*4,size*4);
        if(a.z>.78&&p.core){ctx.strokeStyle='#ec9a7170';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y+size*2);ctx.lineTo(x-.6,y-size*.8);ctx.stroke();}
      });ctx.globalAlpha=1;p.frames++;
    }frames++;schedule();
  }
  function schedule(){if(!raf&&!timer&&!dead&&!paused()&&visible.size)timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(draw);},1000/(compact.matches?18:24));}
  function sync(){if(paused()||!visible.size){stop();if(reduce.matches||forced.matches)pools.forEach(p=>p.ctx.clearRect(0,0,p.canvas.width,p.canvas.height));}else schedule();}
  const machine=document.querySelector('.hero-machine');let pointerFrame=0,point=null;
  on(machine,'pointermove',e=>{if(!fine.matches||paused()||e.pointerType==='touch')return;point={x:e.clientX,y:e.clientY};if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;const b=machine.getBoundingClientRect();machine.style.setProperty('--machine-x',`${((point.y-b.top)/b.height-.5)*-7}deg`);machine.style.setProperty('--machine-y',`${((point.x-b.left)/b.width-.5)*9}deg`);});},{passive:true});
  on(machine,'pointerleave',()=>{cancelAnimationFrame(pointerFrame);pointerFrame=0;machine.style.removeProperty('--machine-x');machine.style.removeProperty('--machine-y');});
  on(document,'progresskit:core-charge',()=>{charge=performance.now()+2100;schedule();});
  on(window,'progresskit:motionchange',sync);on(document,'visibilitychange',sync);on(reduce,'change',sync);on(forced,'change',sync);on(compact,'change',sync);
  function dispose(){if(dead)return;dead=true;stop();cancelAnimationFrame(pointerFrame);observer.disconnect();ro.disconnect();listeners.splice(0).forEach(f=>f());pools.forEach(p=>p.canvas.remove());}
  on(window,'pagehide',e=>{leaving=true;sync();if(!e.persisted)dispose();});on(window,'pageshow',()=>{leaving=false;sync();});
  root.installation={metrics:()=>({frames,pending:!!(raf||timer),paused:paused(),visible:visible.size,canvasCount:pools.length,particles:pools.reduce((n,p)=>n+(compact.matches?Math.ceil(p.particles.length*.4):p.particles.length),0),fpsLimit:compact.matches?18:24,disposed:dead,sections:pools.map(p=>({id:p.section.id||'footer',frames:p.frames,visible:visible.has(p)}))}),dispose};sync();
}
