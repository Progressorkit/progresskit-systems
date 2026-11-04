/* One continuous camera path through the retained installation. These are
   camera/light keyframes, never section-sized wallpaper layers. */
const room=(id,scale,x,y,portal,network,lab,heat,core=0)=>({id,scale,x,y,portal,network,lab,heat,core});
export const rooms=[
 room('start',1,0,0,.06,0,0,.48),
 room('rdzen',1.23,-.10,-.045,.4,0,0,.92,1),
 room('projekty',1.08,.045,-.015,.08,.1,0,.56),
 room('uslugi',1.24,.09,-.06,.26,0,.08,.51),
 room('proces',1.48,-.13,-.13,1,0,.05,.73),
 room('ekosystem',1.3,.11,-.07,.18,1,.1,.62),
 room('wydania',1.38,.04,-.09,.35,.55,.2,.47),
 room('o-mnie',1.2,-.06,-.04,.25,.22,.2,.35),
 room('wyzwania',1.35,-.09,-.08,.4,.1,.35,.48),
 room('technologie',1.54,.10,-.12,.55,.25,1,.64),
 room('kontakt',1.19,-.035,-.03,.22,.08,.22,.27),
 room('brief',1.23,-.06,-.035,.28,.08,.34,.23),
];
export function sampleJourney(stops,y){
 if(!stops.length)return {...rooms[0],mix:0};
 let i=0;while(i<stops.length-2&&y>stops[i+1].at)i++;
 const a=stops[i],b=stops[Math.min(i+1,stops.length-1)];
 const u=Math.max(0,Math.min(1,(y-a.at)/Math.max(1,b.at-a.at))),t=u*u*(3-2*u),value={id:t<.5?a.id:b.id,mix:t};
 for(const k of ['scale','x','y','portal','network','lab','heat','core'])value[k]=a[k]+(b[k]-a[k])*t;
 return value;
}
/* Solid architectural ribs, with front/side faces and a light received on
   the edge. Drawn in the existing low-resolution ambient canvas. */
export function drawArchitecture(ctx,w,h,state,t,px,py){
 const polygon=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();ctx.fill();};
 const phase=state.portal,shift=state.x*.2+px*.012,aperture=.05*Math.sin(t*.08);
 ctx.globalAlpha=phase*.9;
 for(const side of [-1,1]){
  const x=side<0?-.075+shift:.94+shift,dir=side<0?1:-1;
  const grad=ctx.createLinearGradient(x*w,0,(x+dir*.14)*w,0);grad.addColorStop(0,'#020306');grad.addColorStop(.5,'#1d2026');grad.addColorStop(.72,'#54525a');grad.addColorStop(.76,'#13121a');grad.addColorStop(1,'#08070c');
  polygon([[x,-.1],[x+dir*.10,-.1],[x+dir*(.16+aperture),.22],[x+dir*.12,.74],[x+dir*.24,1.1],[x+dir*.03,1.1],[x-dir*.02,.72]],grad);
  polygon([[x+dir*.10,.18],[x+dir*.112,.24],[x+dir*.075,.70],[x+dir*.064,.72]],'#a1414a70');
  polygon([[x+dir*.04,.1],[x+dir*.075,.18],[x+dir*.04,.74],[x+dir*.01,.7]],'#949bab18');
 }
 // Overhead service girders share the room's perspective. They stay behind
 // content; a deliberate dark sidewall removes the floating-card impression.
 ctx.globalAlpha=phase*.65;
 polygon([[-.2,-.1],[1.1,-.1],[.92,.11],[.59,.18],[.42,.12],[-.2,.04]],'#08090dd9');
 polygon([[.02,.035],[.42,.12],[.59,.18],[.92,.11],[.93,.12],[.59,.193],[.42,.133],[.02,.05]],'#73727e45');
 // Recessed network conduits, fading into depth. No HUD grid over the copy.
 for(let i=0;i<5;i++){
  const x=.04+i*.235+shift,y=.18+(i%2)*.16;
  ctx.globalAlpha=state.network*.38;
  polygon([[x,y],[x+.004,y],[x+.08,.72],[x+.078,.75]],'#74818a');
  const u=(t*.045+i*.19)%1,fx=x+.08*u,fy=y+(.72-y)*u;
  ctx.globalAlpha=state.network*(.32+Math.sin(u*Math.PI)*.5);ctx.fillStyle='#dd7e76';ctx.fillRect(fx*w,fy*h,2,4);
 }
 // Thick staggered laboratory housings at the two sides of the chamber.
 for(let i=0;i<3;i++)for(const side of [-1,1]){
  const x=side<0?-.05+i*.028:1.02-i*.035,y=.16+i*.19,dx=side<0?.16:-.16;
  ctx.globalAlpha=state.lab*(.75-i*.12);
  const grad=ctx.createLinearGradient(0,y*h,0,(y+.16)*h);grad.addColorStop(0,'#62616b');grad.addColorStop(.06,'#14151c');grad.addColorStop(.7,'#06070d');grad.addColorStop(1,'#27202a');
  polygon([[x,y],[x+dx,y+.025],[x+dx*.9,y+.16],[x,y+.19]],grad);
  polygon([[x+dx*.18,y+.13],[x+dx*.8,y+.12],[x+dx*.8,y+.124],[x+dx*.18,y+.135]],'#9b3c4d');
 }
 ctx.globalAlpha=1;
}
