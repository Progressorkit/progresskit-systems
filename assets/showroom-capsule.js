/* Showroom-only presentation. Selection, content and routing stay in project-showroom.js. */
(() => {
  'use strict';
  const root=document.querySelector('[data-showroom]');
  const trigger=root?.querySelector('[data-capsule-toggle]');
  const viewport=root?.querySelector('[data-showroom-viewport]');
  if(!trigger||!viewport||!root.classList.contains('showroom-enhanced'))return;
  const html=document.documentElement, cards=[...root.querySelectorAll('.showroom-card')];
  const canvas=root.querySelector('.capsule-matter');
  const matter=canvas&&window.ProgressKitMatter?.create(canvas);
  const audioToggle=root.querySelector('[data-capsule-audio]');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const narrow=matchMedia('(max-width:700px)');
  const contrast=matchMedia('(forced-colors:active)');
  let awake=false, related='', hovered='', ignoreFocus=false, leaving=false;
  let paused=true, frame=0, deadline=0, previous=0;
  let x=0,y=0,vx=0,vy=0,tx=0,ty=0;
  let lastLayout=null, pressureEpoch=0, soundSurge=false, charged='', matterTarget=null;
  const timers=new Set(),pending=new Map();
  const full=()=>!narrow.matches&&fine.matches&&html.dataset.interfaceQuality!=='compact';
  const clamp=value=>Math.max(-1,Math.min(1,value));
  const wake=value=>document.dispatchEvent(new CustomEvent('progresskit:showroom-wake',{detail:{awake:value}}));
  const visible=()=>lastLayout?.items||[];
  const cardFor=id=>cards.find(card=>card.dataset.projectId===id);
  const effectsAllowed=()=>!reduced.matches&&!contrast.matches&&!document.hidden&&!leaving&&
    html.dataset.interfaceMotion==='running'&&root.classList.contains('showroom-in-view')&&
    !['is-energy-paused','is-slice-open','is-dragging','is-page-hidden'].some(name=>root.classList.contains(name));

  // Tiny variations belong to the glass, never to the controller's orbital transforms.
  cards.forEach((card,index)=>{
    const surface=card.querySelector('.project-slice');
    ['crystal-shell','crystal-facets','crystal-reflection'].forEach(name=>{
      const layer=document.createElement('span');layer.className=name;layer.setAttribute('aria-hidden','true');surface.prepend(layer);
    });
    const angle=[-2.2,1.6,-1.1,2.1,-1.7,.8][index%6];
    card.style.setProperty('--lens-roll',`${angle}deg`);
    card.style.setProperty('--lens-yaw',`${[-5,4,-3,5,-4,2][index%6]}deg`);
    card.style.setProperty('--lens-depth',`${[-4,3,-2,4,0,2][index%6]}px`);
    card.style.setProperty('--lens-reflect',`${[23,64,36,71,29,58][index%6]}%`);
  });
  function targetProject(id=related||charged) {
    const card=cardFor(id);
    if(!card||!canvas){matterTarget=null;return;}
    // Read only on target/layout changes, never in the renderer's frame loop.
    const object=card.getBoundingClientRect(),field=canvas.getBoundingClientRect();
    matterTarget=field.width&&field.height?{x:((object.left+object.width/2-field.left)/field.width)*2-1,y:((object.top+object.height/2-field.top)/field.height)*2-1}:null;
  }
  function updateMatter() {
    matter?.setState({running:effectsAllowed(),compact:!full(),reduced:reduced.matches,x,y,active:Boolean(related||charged),target:matterTarget});
  }
  function syncMatter() {
    const mode=matter?.mode||'fallback';
    if(root.dataset.matterRenderer!==mode)root.dataset.matterRenderer=mode;
    root.dataset.matterMotion=effectsAllowed()?'running':'paused';
    updateMatter();
  }
  canvas?.addEventListener('progresskit:matter-fallback',()=>{root.dataset.matterRenderer='fallback';});
  canvas?.addEventListener('progresskit:matter-ready',syncMatter);
  function relation(id) {
    if(!awake||root.classList.contains('is-slice-open'))id='';
    if(id===related)return;
    related=id;root.classList.toggle('has-relation',Boolean(id));root.dataset.relatedProject=id;
    cards.forEach(card=>card.classList.toggle('is-related',card.dataset.projectId===id));
    targetProject();updateMatter();syncAudio();
  }
  function focusedRelation() {
    const card=document.activeElement?.closest('.showroom-card');
    relation(card&&root.contains(card)?card.dataset.projectId:hovered);
  }
  function later(fn,delay) {
    const timer=setTimeout(()=>{timers.delete(timer);fn();},delay);timers.add(timer);return timer;
  }
  function cancelSequence(id) {
    pending.get(id)?.forEach(timer=>{clearTimeout(timer);timers.delete(timer);});pending.delete(id);
  }
  function materialize(id) {
    cancelSequence(id);
    const card=cardFor(id);if(!card)return;
    card.classList.add('is-energized');card.dataset.matterState='ready';
  }
  function cancelReveals() {
    timers.forEach(clearTimeout);timers.clear();pending.clear();pressureEpoch++;soundSurge=false;charged='';targetProject();updateMatter();
    root.dataset.matterPhase='idle';
  }
  function pressure(strength=1) {
    if(!effectsAllowed())return;
    const epoch=++pressureEpoch;matter?.activate(strength);
    root.dataset.matterPhase='compressing';soundSurge=true;syncAudio();
    later(()=>{if(epoch===pressureEpoch)root.dataset.matterPhase='releasing';},270);
    later(()=>{if(epoch===pressureEpoch){root.dataset.matterPhase='idle';soundSurge=false;charged='';targetProject();updateMatter();syncAudio();}},1750);
  }
  function syncReveals() {
    if(!awake||lastLayout?.open||!effectsAllowed()) {
      if(timers.size)cancelReveals();
      if(awake)visible().forEach(item=>materialize(item.id));
      return;
    }
    const waiting=visible().filter(item=>!cardFor(item.id).classList.contains('is-energized')&&!pending.has(item.id));
    if(!waiting.length)return;
    if(!pending.size)pressure(1);
    waiting.sort((a,b)=>Number(b.selected)-Number(a.selected)).forEach((item,index)=>{
      const card=cardFor(item.id),sequence=[];card.dataset.matterState='waiting';pending.set(item.id,sequence);
      const stagger=full()?index*90:0;
      [['reflection',320],['contour',520],['refracting',760],['ready',1250]].forEach(([state,delay])=>{
        sequence.push(later(()=>{
          if(pending.get(item.id)!==sequence||!awake||lastLayout?.open||!visible().some(current=>current.id===item.id))return;
          card.dataset.matterState=state;
          if(state==='reflection'&&item.selected){charged=item.id;targetProject();updateMatter();}
          if(state==='refracting')card.classList.add('is-energized');
          if(state==='ready')pending.delete(item.id);
        },delay+stagger));
      });
    });
  }
  // Optional local synthesis. No audio context, media request or sound until explicit opt-in.
  let sound=null, soundWanted=false, soundTimer=0, soundFailed=false;
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  function createSound() {
    const context=new AudioEngine(),master=context.createGain(),filter=context.createBiquadFilter();
    master.gain.value=0;filter.type='lowpass';filter.frequency.value=360;filter.Q.value=.45;
    filter.connect(master);master.connect(context.destination);
    const voices=[54,108.2,162].map((frequency,index)=>{
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=[.32,.13,.035][index];
      oscillator.connect(gain);gain.connect(filter);oscillator.start();return {oscillator,gain};
    });
    return {context,master,voices};
  }
  function soundUnavailable() {
    soundWanted=false;soundFailed=true;
    if(sound){sound.master.gain.value=0;void sound.context.close().catch(()=>{});sound=null;}
    syncAudio();
  }
  function syncAudio() {
    if(!audioToggle)return;
    if(reduced.matches)soundWanted=false;
    const running=soundWanted&&effectsAllowed();
    audioToggle.disabled=Boolean(reduced.matches||soundFailed);
    audioToggle.setAttribute('aria-pressed',String(soundWanted));
    audioToggle.textContent=soundFailed?'Hum niedostępny':soundWanted?(running?'Wyłącz hum':'Hum: pauza · wyłącz'):'Włącz hum';
    audioToggle.title=reduced.matches?'Hum wyłączony przy ograniczeniu ruchu':'Opcjonalny dźwięk rdzenia';
    if(!sound)return;
    const {context,master,voices}=sound;
    clearTimeout(soundTimer);soundTimer=0;
    const now=context.currentTime;
    master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(running?(related ? .040 : soundSurge ? .037 : .034):0,now,.12);
    voices[2].gain.gain.setTargetAtTime(related ? .045 : .035,now,.25);
    if(running) {
      if(context.state==='suspended')void context.resume().catch(soundUnavailable);
    }else if(context.state==='running')soundTimer=setTimeout(()=>{soundTimer=0;if(sound&&!(soundWanted&&effectsAllowed()))void context.suspend().catch(soundUnavailable);},350);
  }
  if(audioToggle && AudioEngine) {
    audioToggle.hidden=false;
    audioToggle.addEventListener('click',()=>{
      if(reduced.matches||soundFailed)return;
      soundWanted=!soundWanted;
      if(soundWanted && !sound) {
        try {sound=createSound();}catch {soundUnavailable();return;}
      }
      syncAudio();
    });
  }
  document.addEventListener('progresskit:showroom-charge',event=>{
    if(!effectsAllowed()||!awake)return;
    charged=event.detail.id;targetProject();updateMatter();
    pressure(.55);event.detail.delay=215;
  });
  document.addEventListener('progresskit:showroom-layout',event=>{
    lastLayout=event.detail;awake=lastLayout.awake;
    // Orbit/filter changes must not leave an abandoned reveal blocking a later return.
    for(const id of pending.keys())if(!visible().some(item=>item.id===id)){
      cancelSequence(id);const card=cardFor(id);
      if(card.classList.contains('is-energized'))card.dataset.matterState='ready';else delete card.dataset.matterState;
    }
    root.classList.toggle('is-awake',awake);
    trigger.setAttribute('aria-expanded',String(awake));trigger.disabled=lastLayout.open;
    trigger.querySelector('[data-capsule-caption]').textContent=awake?'Wybierz projekt':'Odkryj projekty';
    if(lastLayout.open||!awake||!lastLayout.items.some(item=>item.id===related))relation('');
    if(!awake){cancelReveals();cards.forEach(card=>{card.classList.remove('is-energized');delete card.dataset.matterState;});}
    targetProject();syncMotion();
  });
  function resetLight() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; x = y = vx = vy = tx = ty = 0; deadline = previous = 0;
    ['--core-x','--core-y','--core-light-x','--core-light-y'].forEach(key => root.style.removeProperty(key));
    updateMatter();
  }
  function syncMotion() {
    paused = reduced.matches || document.hidden || leaving || html.dataset.interfaceMotion !== 'running' ||
      !root.classList.contains('showroom-in-view') || ['is-energy-paused','is-slice-open','is-projecting','is-dragging','is-page-hidden'].some(name => root.classList.contains(name));
    const state = paused ? 'paused' : 'running';
    if (root.dataset.capsuleMotion !== state) root.dataset.capsuleMotion = state;
    const quality = full() ? 'full' : 'compact';
    if (root.dataset.capsuleQuality !== quality) root.dataset.capsuleQuality = quality;
    if (paused || !full()) resetLight();
    syncReveals();
    syncMatter();
    syncAudio();
  }
  function render(now) {
    frame = 0;
    if (paused || !full()) return;
    const dt = previous ? Math.max(.5, Math.min(2, (now-previous)/16.667)) : 1;
    previous = now;
    const damping = Math.pow(.76, dt);
    vx = (vx + (tx-x)*.065*dt)*damping; vy = (vy + (ty-y)*.065*dt)*damping;
    x = clamp(x + vx*dt); y = clamp(y + vy*dt);
    if (now >= deadline || Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(vx)+Math.abs(vy)<.001) {
      x=tx; y=ty; vx=vy=0; deadline=previous=0;
    }
    root.style.setProperty('--core-x', x.toFixed(4)); root.style.setProperty('--core-y', y.toFixed(4));
    root.style.setProperty('--core-light-x', `${(45+x*30).toFixed(2)}%`);
    root.style.setProperty('--core-light-y', `${(30+y*25).toFixed(2)}%`);
    updateMatter();
    if (deadline) frame = requestAnimationFrame(render);
  }
  function settle() { deadline = performance.now()+900; if (!frame) frame=requestAnimationFrame(render); }
  viewport.addEventListener('pointermove', event => {
    if (paused || !full() || event.pointerType === 'touch') return;
    const box = viewport.getBoundingClientRect();
    tx=clamp((event.clientX-box.left)/box.width*2-1); ty=clamp((event.clientY-box.top)/box.height*2-1); settle();
    const card=event.target.closest('.showroom-card');
    if(card&&!card.inert){
      const face=card.getBoundingClientRect(),lx=clamp((event.clientX-face.left)/face.width*2-1),ly=clamp((event.clientY-face.top)/face.height*2-1);
      card.style.setProperty('--crystal-light-x',`${(50+lx*45).toFixed(2)}%`);card.style.setProperty('--crystal-light-y',`${(50+ly*45).toFixed(2)}%`);
      card.style.setProperty('--crystal-tilt-x',lx.toFixed(3));card.style.setProperty('--crystal-tilt-y',ly.toFixed(3));
    }
  }, {passive:true});
  viewport.addEventListener('pointerleave', () => {
    hovered=''; focusedRelation();
    if (paused || !full()) return;
    tx=ty=0; settle();
  });
  viewport.addEventListener('pointerover', event => {
    if (event.pointerType==='touch') return;
    const card=event.target.closest('.showroom-card');
    hovered=card && !card.inert ? card.dataset.projectId : '';
    focusedRelation();
  });
  viewport.addEventListener('focusin', event => {
    const card=event.target.closest('.showroom-card');
    if(card && awake)materialize(card.dataset.projectId); // Never leave keyboard focus on hidden text.
    focusedRelation();
  });
  viewport.addEventListener('focusout', () => queueMicrotask(focusedRelation));
  trigger.addEventListener('pointerenter', event => { if (fine.matches && event.pointerType!=='touch') wake(true); });
  trigger.addEventListener('focus', () => { if (!ignoreFocus && trigger.matches(':focus-visible')) wake(true); });
  trigger.addEventListener('click', () => wake(true));
  viewport.addEventListener('keydown', event => {
    if (event.key!=='Escape' || event.defaultPrevented || !awake || root.classList.contains('is-slice-open')) return;
    event.preventDefault(); ignoreFocus=true; trigger.focus({preventScroll:true}); wake(false); ignoreFocus=false;
  });
  addEventListener('resize', () => { resetLight(); cancelReveals(); matter?.resize(); if(awake)visible().forEach(item=>materialize(item.id)); targetProject();syncMotion(); });
  addEventListener('pagehide', () => { leaving=true; syncMotion(); });
  addEventListener('pageshow', () => { leaving=false; syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  [reduced,fine,narrow,contrast].forEach(media => media.addEventListener('change', syncMotion));
  const observer = new MutationObserver(syncMotion);
  observer.observe(root,{attributes:true,attributeFilter:['class']});
  observer.observe(html,{attributes:true,attributeFilter:['data-interface-motion','data-interface-quality']});
  root.classList.add('capsule-ready'); trigger.hidden=false;
  wake(root.classList.contains('is-slice-open') || new URL(location.href).searchParams.has('projekt'));
  syncMotion();
})();
