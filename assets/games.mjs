/* Browser-only demonstrations: no application storage, account, billing or alarm API. */
export function findMatches(board, size=6) {
  const matched=new Set();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const at=y*size+x,value=board[at];if(value==null)continue;
    if(x<=size-3&&board[at+1]===value&&board[at+2]===value){let n=x;while(n<size&&board[y*size+n]===value)matched.add(y*size+n++);}
    if(y<=size-3&&board[at+size]===value&&board[at+2*size]===value){let n=y;while(n<size&&board[n*size+x]===value)matched.add(n++*size+x);}
  }
  return [...matched];
}
export function swapMatch(board,a,b,size=6) {
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=board.length||b>=board.length||Math.abs(a%size-b%size)+Math.abs(Math.floor(a/size)-Math.floor(b/size))!==1)return null;
  const copy=[...board];[copy[a],copy[b]]=[copy[b],copy[a]];return findMatches(copy,size).length?copy:null;
}
const root=typeof document==='undefined'?null:document.querySelector('[data-game]');
if(root)initialize(root);
function initialize(root) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),pet=root.querySelector('.pet-interaction');
  const emit=(name,detail)=>root.dispatchEvent(new CustomEvent(name,{detail}));
  root.querySelectorAll('[data-realm]').forEach(button=>button.addEventListener('click',()=>{
    root.querySelectorAll('[data-realm]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    root.querySelector('[data-realm-title]').textContent=button.querySelector('strong').textContent;
    root.querySelector('[data-realm-description]').textContent=button.dataset.description||'Plansza z kampanii ECHO WORLDS.';
    const img=root.querySelector('.realm-board');img.src=button.querySelector('img').src;img.alt=button.querySelector('strong').textContent+' — autentyczna plansza';
    emit('game-realm',button.dataset.realm);
  }));
  root.querySelectorAll('[data-species]').forEach(button=>button.addEventListener('click',()=>{
    root.querySelectorAll('[data-species]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    const name=button.querySelector('span').textContent,img=pet.querySelector('img');img.src=button.dataset.portrait||button.querySelector('img').src;img.alt=name;
    root.querySelector('[data-pet-status]').textContent=name+': '+(button.dataset.description||'Twój nowy towarzysz.');
    emit('game-species',button.dataset.species);happy();
  }));
  let happyTimer;
  function happy(){if(!pet)return;pet.classList.remove('is-happy');void pet.offsetWidth;pet.classList.add('is-happy');clearTimeout(happyTimer);happyTimer=setTimeout(()=>pet.classList.remove('is-happy'),850);}
  pet?.addEventListener('click',()=>{happy();root.querySelector('[data-pet-status]').textContent=pet.querySelector('img').alt+' cieszy się z Twojej wizyty.';});
  let turn=0,close=false;
  const updateView=()=>{root.querySelector('.room-fallback')?.style.setProperty('transform',`perspective(900px) rotateY(${turn}deg) rotateX(8deg) scale(${close?1.08:1})`);emit('game-view',{turn,close});};
  root.querySelectorAll('[data-room-turn]').forEach(b=>b.addEventListener('click',()=>{turn=Math.max(-25,Math.min(25,turn+Number(b.dataset.roomTurn)*10));updateView();}));
  root.querySelector('[data-room-view]')?.addEventListener('click',()=>{close=!close;updateView();});
  const room=root.querySelector('.taskpet-room');let drag;
  room?.addEventListener('pointerdown',e=>{if(e.target===room||e.target.classList.contains('room-fallback'))drag={x:e.clientX,y:e.clientY,turn};});
  room?.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dy)>Math.abs(dx)){drag=null;return;}turn=Math.max(-25,Math.min(25,drag.turn+dx*.16));updateView();});
  room?.addEventListener('pointerup',()=>drag=null);room?.addEventListener('pointercancel',()=>drag=null);
  root.querySelectorAll('button[data-room-variant]').forEach(button=>button.addEventListener('click',()=>{
    root.querySelectorAll('button[data-room-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));room.dataset.roomVariant=button.dataset.roomVariant;
    root.querySelector('.room-fallback').style.backgroundImage=`linear-gradient(#24132b33,#100a1a77),url("${button.dataset.roomImage}")`;
    root.querySelector('[data-furniture-status]').textContent='Wariant pokazowy: '+button.textContent;emit('game-room-variant',button.dataset.roomVariant);
  }));
  root.querySelectorAll('[data-furniture]').forEach(button=>button.addEventListener('click',()=>{
    const selected=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(selected));
    let prop=room.querySelector(`[data-prop="${button.dataset.furniture}"]`);
    if(selected&&!prop){prop=document.createElement('img');prop.src=button.querySelector('img').src;prop.alt='';prop.dataset.prop=button.dataset.furniture;prop.className='room-prop';prop.style.left=(8+[...root.querySelectorAll('[data-furniture]')].indexOf(button)*21)+'%';room.append(prop);}else prop?.remove();
    root.querySelector('[data-furniture-status]').textContent=(selected?'Ustawiono: ':'Schowano: ')+button.querySelector('span').textContent+'. Tylko w pokazie.';emit('game-furniture',{id:button.dataset.furniture,selected});
  }));
  const complete=root.querySelector('[data-task-complete]'),taskStatus=root.querySelector('[data-task-status]');
  complete?.addEventListener('click',()=>{complete.disabled=true;complete.textContent='Zadanie ukończone';root.querySelector('progress').value=30;taskStatus.textContent='+10 XP · +5 monet w pokazie. Pupil rośnie: 30 / 100 XP.';happy();});
  root.querySelector('[data-task-reset]')?.addEventListener('click',()=>{complete.disabled=false;complete.textContent='Ukończ zadanie';root.querySelector('progress').value=20;taskStatus.textContent='20 / 100 XP w pokazie';});
  const boardElement=root.querySelector('.match-board');
  if(boardElement){
    const symbols=['◆','●','▲','✦','⬟'];let board,selected=-1,score=0;
    function reset(){board=Array.from({length:36},(_,i)=>(Math.floor(i/6)+i%6)%5);[board[1],board[7]]=[board[7],board[1]];board[0]=0;board[2]=0;board[7]=0;board[1]=1;selected=-1;score=0;render();root.querySelector('[data-match-status]').textContent='Wybierz symbol, a potem jego sąsiada.';}
    function render(){boardElement.replaceChildren(...board.map((value,i)=>{const b=document.createElement('button');b.type='button';b.textContent=symbols[value];b.setAttribute('aria-label',`Wiersz ${Math.floor(i/6)+1}, kolumna ${i%6+1}, symbol ${value+1}`);b.setAttribute('aria-pressed',String(selected===i));b.addEventListener('click',()=>choose(i));return b;}));}
    function choose(i){if(selected<0){selected=i;render();boardElement.children[i].focus();return;}const copy=swapMatch(board,selected,i);if(!copy){selected=i;render();boardElement.children[i].focus();root.querySelector('[data-match-status]').textContent='Zamiana musi utworzyć połączenie trzech symboli.';return;}board=copy;let matches,cascades=0;while((matches=findMatches(board)).length&&cascades++<20){score+=matches.length*10;const gone=new Set(matches);for(let x=0;x<6;x++){const rest=[];for(let y=5;y>=0;y--)if(!gone.has(y*6+x))rest.push(board[y*6+x]);for(let y=5;y>=0;y--)board[y*6+x]=rest[5-y]??Math.floor(Math.random()*5);}}selected=-1;render();boardElement.children[i].focus();root.querySelector('[data-match-status]').textContent=`Połączenie! ${score} punktów · kaskady: ${cascades}.`;}
    root.querySelector('[data-match-reset]').addEventListener('click',reset);reset();
  }
  const canvas=root.querySelector('[data-game-scene]');
  if(canvas){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.disconnect();import('./games-scene.mjs').then(m=>m.mountScene(canvas,root,reduced)).catch(()=>canvas.dataset.sceneState='fallback');}},{rootMargin:'120px'});observer.observe(canvas);}
  const motionObserver=new IntersectionObserver(entries=>root.classList.toggle('is-offscreen',!entries.some(e=>e.isIntersecting)));motionObserver.observe(root);
  document.addEventListener('visibilitychange',()=>root.classList.toggle('is-offscreen',document.hidden));
}
