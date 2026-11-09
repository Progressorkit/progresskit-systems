/* Shared installation behavior. Native links remain navigable without JavaScript. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const body = document.body;
let pulseTimer, pulseFrame=0, manualPause=false, pageActive=true;
const effectsPaused=()=>manualPause||reduce.matches||document.hidden||!pageActive;
function cancelPulse(){clearTimeout(pulseTimer);cancelAnimationFrame(pulseFrame);pulseFrame=0;body.classList.remove('world-pulse');}
export function pulse() {
  if (effectsPaused()) return;
  cancelPulse();
  pulseFrame=requestAnimationFrame(() => { pulseFrame=0;if(effectsPaused())return;body.classList.add('world-pulse'); pulseTimer = setTimeout(() => body.classList.remove('world-pulse'), 220); });
}
const activate = document.querySelector('[data-core-activate]');
activate?.addEventListener('click', () => {
  const active = body.dataset.coreState !== 'active';
  body.dataset.coreState = active ? 'active' : 'idle';
  activate.setAttribute('aria-pressed', String(active));
  activate.querySelector('span:nth-child(2)').innerHTML = active ? 'Rdzeń aktywny<small>Wejdź w ekosystem poniżej</small>' : 'Aktywuj rdzeń<small>Odkryj, co jest w środku</small>';
  document.querySelector('[data-core-status]').textContent = active ? 'Połączenie otwarte. Wybierz artefakt projektu poniżej.' : 'Zbliż się. Każdy projekt zaczyna się tutaj.';
  document.dispatchEvent(new CustomEvent('progresskit:core', {detail:{active}}));
  pulse();
});
const motion = document.querySelector('[data-motion-toggle]');
function updateMotion() {
  const paused = manualPause || reduce.matches;
  body.dataset.motion = paused ? 'paused' : 'running';
  motion?.setAttribute('aria-pressed', String(paused));
  if (motion) motion.textContent = reduce.matches ? 'Ograniczony ruch' : paused ? 'Wznów ruch' : 'Wstrzymaj ruch';
  if(paused){cancelPulse();resetProximity();}
  document.dispatchEvent(new CustomEvent('progresskit:motion', {detail:{paused}}));
}
motion?.addEventListener('click', () => { if (!reduce.matches) { manualPause = !manualPause; updateMotion(); } });
// One event-driven proximity pass for visible controls; no idle layout polling.
const targets = [...document.querySelectorAll('[data-proximity],.world-control,.cta,.artifact-card,.category,summary')];
const visible = new Set();
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) visible.add(entry.target);
  else { visible.delete(entry.target); entry.target.style.removeProperty('--proximity'); }
}), {rootMargin:'80px'});
targets.forEach(node => observer.observe(node));
let point = null, frame = 0;
function resetProximity(){
  point=null;cancelAnimationFrame(frame);frame=0;
  targets.forEach(node=>{node.style.removeProperty('--proximity');node.style.removeProperty('--px');node.style.removeProperty('--py');node.dataset.proximity='far';});
}
function proximity() {
  frame = 0;
  if (!point || !fine.matches || effectsPaused()) return;
  for (const node of visible) {
    const r = node.getBoundingClientRect();
    const dx = Math.max(r.left - point.x, 0, point.x - r.right);
    const dy = Math.max(r.top - point.y, 0, point.y - r.bottom);
    const distance = Math.hypot(dx,dy);
    const energy = Math.max(0,1-distance/100);
    node.style.setProperty('--proximity',energy.toFixed(2));
    node.dataset.proximity = distance===0 ? 'surface' : distance<14 ? 'edge' : distance<60 ? 'near' : 'far';
    if (energy) {
      node.style.setProperty('--px',`${Math.max(0,Math.min(100,(point.x-r.left)/r.width*100))}%`);
      node.style.setProperty('--py',`${Math.max(0,Math.min(100,(point.y-r.top)/r.height*100))}%`);
    }
  }
}
document.addEventListener('pointermove', event => {
  if (event.pointerType==='touch' || !fine.matches || effectsPaused()) return;
  point={x:event.clientX,y:event.clientY};
  if (!frame) frame=requestAnimationFrame(proximity);
},{passive:true});
document.addEventListener('pointerleave', resetProximity);
document.addEventListener('pointerdown', event => {
  if (event.pointerType!=='touch'||effectsPaused()) return;
  const target = event.target.closest('[data-proximity],.world-control,.artifact-card');
  if (target) { target.dataset.proximity='surface'; setTimeout(()=>{target.dataset.proximity='far';},220); }
},{passive:true});
reduce.addEventListener('change', updateMotion);fine.addEventListener('change',resetProximity);updateMotion();
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPulse();resetProximity();}});
window.addEventListener('pagehide',()=>{pageActive=false;cancelPulse();resetProximity();},{passive:true});
window.addEventListener('pageshow',()=>{pageActive=true;updateMotion();},{passive:true});
// The same ambient field stays alive while scrolling between zones.
const zoneObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    body.dataset.worldZone = entry.target.dataset.worldZone;
    const zones={core:['57%','32%'],projects:['25%','50%'],engineering:['80%','40%'],ecosystem:['30%','65%'],contact:['65%','65%']};
    const values=zones[entry.target.dataset.worldZone]||zones.core;
    body.style.setProperty('--world-light-x',values[0]); body.style.setProperty('--world-light-y',values[1]);
  }
},{rootMargin:'-20% 0px -45% 0px'});
document.querySelectorAll('[data-world-zone]').forEach(zone=>zoneObserver.observe(zone));
const navLinks=[...document.querySelectorAll('.nav a')].filter(link => { const target=new URL(link.href); return target.origin===location.origin && target.pathname===location.pathname; });
const navObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  navLinks.forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
}),{rootMargin:'-15% 0px -65% 0px'});
navLinks.forEach(link=>{const node=document.getElementById(link.hash.slice(1));if(node)navObserver.observe(node);});
// Small context guide: curated explanations, never a simulated chat.
const guide=document.querySelector('[data-guide-toggle]');
const panel=document.querySelector('#guide-panel');
const copy=document.querySelector('[data-guide-copy]');
const isGlikemia=location.pathname.includes('glikemia-premium');
const topics={projects:isGlikemia?'Glikemia Premium: pomiary, historia, wykresy i eksport PDF. Dane pozostają lokalnie na urządzeniu.':'Każdy artefakt otwiera projekt: jego możliwości, architekturę i rzeczywisty etap rozwoju.',technology:isGlikemia?'Android i .NET MAUI. SQLite przechowuje wpisy lokalnie; raport PDF możesz wyeksportować z aplikacji.':'Poznaj technologie w katalogu i ich użycie w konkretnych projektach. Zakres potwierdzają źródła na stronach produktów.',security:isGlikemia?'Dane glikemii pozostają na urządzeniu. Aplikacja nie zastępuje konsultacji medycznej.':'Security jest etapem procesu pracy. Dowody, zakres testów i otwarte kwestie znajdziesz w prezentacji każdego projektu.'};
if(copy)copy.textContent=topics.projects;
function closeGuide(){if(!guide)return;guide.setAttribute('aria-expanded','false');panel.hidden=true;}
guide?.addEventListener('click',()=>{const open=guide.getAttribute('aria-expanded')!=='true';guide.setAttribute('aria-expanded',String(open));panel.hidden=!open;if(open)pulse();});
document.querySelectorAll('[data-guide-topic]').forEach(button=>button.addEventListener('click',()=>{copy.textContent=topics[button.dataset.guideTopic];}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel?.hidden){closeGuide();guide.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.world-guide'))closeGuide();});
// Progressive enhancement of existing roadmap buttons; no invented integration states.
document.querySelectorAll('[data-ecosystem-select]').forEach(button=>button.addEventListener('click',()=>{
  const region=document.getElementById(button.getAttribute('aria-controls'));
  const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));region.hidden=!open;pulse();
}));
// Keep real links and native history; arrival effects live in the shared CSS.
// Cross-document ViewTransition is not required for navigation or continuity.
document.addEventListener('click', event => {
  if (event.target.closest('.artifact-card,.project-chapter-rail a')) pulse();
});
