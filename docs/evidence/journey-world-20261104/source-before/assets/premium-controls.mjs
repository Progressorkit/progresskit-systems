/* One delegated, event-driven reflection. No idle loop, layout polling,
   per-control listeners, network or changes to native control behaviour. */
const selector='.cta,.plain-button,.category,.hero__motion-toggle,.showroom-gate,.showroom-all,.showroom-controls button,.capsule-audio,.project-slice__close,.project-hologram__close,.menu-btn,.guide-trigger,.guide-close,.guide-disable,.guide-global-toggle,[data-gallery-close],[data-gallery-prev],[data-gallery-next],.nav a[href$="#kontakt"]';
const fine=matchMedia('(hover:hover) and (pointer:fine)');
const reduce=matchMedia('(prefers-reduced-motion:reduce)');
const forced=matchMedia('(forced-colors:active)');
let frame=0,current=null,rect=null,point=null,dead=false,leaving=false,updates=0;
const listeners=[];
const on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
const paused=()=>!fine.matches||reduce.matches||forced.matches||document.hidden||leaving||document.documentElement.dataset.interfaceMotion==='paused';
const release=()=>document.querySelectorAll('.is-mechanically-pressed').forEach(e=>e.classList.remove('is-mechanically-pressed'));
function clear(){cancelAnimationFrame(frame);frame=0;if(current){current.style.removeProperty('--control-light-x');current.style.removeProperty('--control-light-y');}current=null;rect=point=null;}
function update(){frame=0;if(dead||paused()||!current?.isConnected)return clear();rect??=current.getBoundingClientRect();current.style.setProperty('--control-light-x',`${Math.max(0,Math.min(100,(point.x-rect.left)/rect.width*100)).toFixed(1)}%`);current.style.setProperty('--control-light-y',`${Math.max(0,Math.min(100,(point.y-rect.top)/rect.height*100)).toFixed(1)}%`);updates++;}
on(document,'pointermove',e=>{
  if(dead||paused()||e.pointerType==='touch')return;
  const next=e.target.closest?.(selector);
  if(next!==current){clear();current=next;}
  if(!current||current.matches(':disabled,[aria-disabled="true"]'))return clear();
  point={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(update);
},{passive:true});
on(document,'pointerout',e=>{if(current&&!current.contains(e.relatedTarget))clear();},{passive:true});
on(document,'keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches(selector)&&!e.target.matches(':disabled,[aria-disabled="true"]'))e.target.classList.add('is-mechanically-pressed');});
on(document,'keyup',release);
on(window,'scroll',clear,{passive:true});on(window,'resize',clear,{passive:true});on(window,'blur',()=>{clear();release();});
on(window,'progresskit:motionchange',()=>{clear();release();});on(document,'visibilitychange',()=>{clear();release();});on(fine,'change',clear);on(reduce,'change',clear);on(forced,'change',clear);
function dispose(){if(dead)return;dead=true;clear();release();listeners.splice(0).forEach(remove=>remove());}
on(window,'pagehide',e=>{leaving=true;clear();release();if(!e.persisted)dispose();});on(window,'pageshow',()=>{leaving=false;clear();});
document.documentElement.premiumControls={metrics:()=>({pending:!!frame,updates,paused:paused(),disposed:dead,active:current?.className||''}),dispose};
