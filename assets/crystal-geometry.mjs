/* Original convex lapidary cuts. Coordinates describe a solid, not an outline.
   No external models, textures or generated product imagery are used. */
const radial=(sides,angle=0,stretch=1)=>Array.from({length:sides},(_,i)=>{
  const a=angle+i*Math.PI*2/sides;
  return [Math.cos(a),Math.sin(a)*stretch];
});
const octagon=(x=.38,y=.64)=>[
  [-x,1],[-1,y],[-1,-y],[-x,-1],[x,-1],[1,-y],[1,y],[x,1]
];
const rectangle=(cut=.24)=>[
  [-1+cut,1],[-1,1-cut],[-1,-1+cut],[-1+cut,-1],
  [1-cut,-1],[1,-1+cut],[1,1-cut],[1-cut,1]
];
const profiles={
  'progresskit-mail':{name:'emerald-step',points:rectangle(.26),table:.69,depth:.61,step:.12},
  'progresskit-tax':{name:'asscher-crown',points:rectangle(.42),table:.61,depth:.73,step:.18},
  'glikemia-premium':{name:'shield-eight',points:[[0,1],[-.78,.77],[-1,.18],[-.73,-.62],[0,-1],[.73,-.62],[1,.18],[.78,.77]],table:.66,tableY:.84,depth:.80,step:.08},
  'vaeloria':{name:'spear-six',points:[[0,1],[-.76,.42],[-1,-.23],[0,-1],[1,-.23],[.76,.42]],table:.57,depth:.83,step:.13},
  'taskpet':{name:'cushion-twelve',points:[[.38,1],[-.38,1],[-.78,.78],[-1,.38],[-1,-.38],[-.78,-.78],[-.38,-1],[.38,-1],[.78,-.78],[1,-.38],[1,.38],[.78,.78]],table:.72,tableY:.86,depth:.82,step:.15},
  'echo-worlds':{name:'echo-prism',points:radial(6,Math.PI/6),table:.62,tableY:.84,depth:.92,step:.07},
  'progresskit-translator':{name:'double-terminated',points:[[0,1],[-.71,.61],[-1,0],[-.71,-.61],[0,-1],[.71,-.61],[1,0],[.71,.61]],table:.62,depth:.75,step:.09},
  'progresskit-community':{name:'round-brilliant-ten',points:radial(10,Math.PI/10),table:.59,depth:.81,step:.16},
  'adivara':{name:'trillion',points:[[0,1],[-.88,-.48],[-.64,-.83],[.64,-.83],[.88,-.48]],table:.57,depth:.67,step:.11},
  'gotrans360':{name:'elongated-hexagon',points:[[-.65,1],[-1,.43],[-1,-.43],[-.65,-1],[.65,-1],[1,-.43],[1,.43],[.65,1]],table:.73,depth:.62,step:.06},
  'ignira':{name:'flame-kite',points:[[0,1],[-.66,.37],[-1,-.36],[-.42,-1],[.42,-1],[1,-.36],[.66,.37]],table:.61,depth:.84,step:.12},
  'obserwator':{name:'eye-marquise',points:[[0,1],[-.56,.68],[-.91,.26],[-1,0],[-.91,-.26],[-.56,-.68],[0,-1],[.56,-.68],[.91,-.26],[1,0],[.91,.26],[.56,.68]],table:.62,depth:.59,step:.09},
  'kan-system':{name:'keystone',points:[[-.72,1],[-1,.42],[-.77,-1],[.77,-1],[1,.42],[.72,1]],table:.68,depth:.78,step:.14},
  'progresskit-systems':{name:'monument-octagon',points:octagon(.48,.47),table:.59,depth:.95,step:.16},
  'progresskit-analytics':{name:'rising-radiant',points:[[-.55,1],[-1,.26],[-.76,-.79],[0,-1],[.76,-.79],[1,.26],[.55,1]],table:.65,depth:.71,step:.07},
  'progresskit-infrastructure':{name:'step-baguette',points:rectangle(.12),table:.76,depth:.83,step:.19},
  'progresskit-notes':{name:'tablet-eight',points:[[-.65,1],[-1,.64],[-1,-.60],[-.65,-1],[.65,-1],[1,-.60],[1,.44],[.56,1]],table:.73,depth:.55,step:.12},
  'progresskit-offgrid':{name:'compass-lozenge',points:[[0,1],[-.49,.56],[-1,0],[-.49,-.56],[0,-1],[.49,-.56],[1,0],[.49,.56]],table:.58,depth:.86,step:.06},
  'reel-agent':{name:'projector-radiant',points:radial(12,Math.PI/12),table:.67,depth:.63,step:.11},
  'progresskit-remote':{name:'trapezoid-fan',points:[[-.55,1],[-1,.62],[-.82,-.66],[-.42,-1],[.42,-1],[.82,-.66],[1,.62],[.55,1]],table:.70,depth:.76,step:.10},
  'progresskit-vault-key':{name:'vault-pentagon',points:radial(5,Math.PI/2),table:.56,depth:.96,step:.17},
};

export const CRYSTAL_CUTS=Object.freeze(Object.fromEntries(Object.entries(profiles).map(([id,p])=>[id,Object.freeze({...p,points:Object.freeze(p.points.map(point=>Object.freeze(point)))})])));

/** Flat-shaded, closed crown/girdle/pavilion with a 2 × 2 footprint.
 * Depth controls the existing crown, polished band and pavilion proportions.
 * The per-face vertices deliberately retain separate normals at each facet.
 * Return plain typed arrays so geometry can be checked without a WebGL context.
 */
export function crystalGeometryData(id,index=0){
  const keys=Object.keys(CRYSTAL_CUTS);
  const cut=CRYSTAL_CUTS[id]||CRYSTAL_CUTS[keys[((index%keys.length)+keys.length)%keys.length]];
  let points=cut.points.map(point=>[...point]);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  points=points.map(([x,y])=>[(x-minX)/(maxX-minX)*2-1,(y-minY)/(maxY-minY)*2-1]);
  const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
  if(area<0)points.reverse();
  const depth=cut.depth;
  const rings=[
    {scale:cut.table,scaleY:cut.tableY||cut.table,z:depth*.52},
    {scale:1-cut.step,scaleY:Math.max(1-cut.step,(cut.tableY||cut.table)+.035),z:depth*.285},
    {scale:1,z:depth*.055},
    {scale:.985,z:-depth*.145},
    {scale:.30,z:-depth*.63},
  ].map(ring=>points.map(([x,y])=>[x*ring.scale,y*(ring.scaleY||ring.scale),ring.z]));
  const position=[],normal=[],uv=[],facet=[];
  const exitPlanes=[],planeKeys=new Set();
  function triangle(a,b,c,kind){
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    const length=Math.hypot(...n);
    if(kind>=4){
      const unit=n.map(v=>v/length),offset=-unit.reduce((sum,v,i)=>sum+v*a[i],0);
      const plane=[...unit,offset],key=plane.map(v=>Math.round(v*100000)).join(',');
      if(!planeKeys.has(key)){planeKeys.add(key);exitPlanes.push(...plane);}
    }
    for(const point of [a,b,c]){position.push(...point);normal.push(...n.map(v=>v/length));uv.push(point[0]*.5+.5,point[1]*.5+.5);facet.push(kind);}
  }
  for(let i=0;i<points.length;i++){
    const j=(i+1)%points.length;
    triangle([0,0,rings[0][0][2]],rings[0][i],rings[0][j],0);
    for(let r=0;r<rings.length-1;r++){
      triangle(rings[r][i],rings[r+1][i],rings[r+1][j],r+1);
      triangle(rings[r][i],rings[r+1][j],rings[r][j],r+1);
    }
    triangle([0,0,-depth*.82],rings.at(-1)[j],rings.at(-1)[i],5);
  }
  return {name:cut.name,depth,table:cut.table,tableY:cut.tableY||cut.table,facetCount:position.length/9,position:new Float32Array(position),normal:new Float32Array(normal),uv:new Float32Array(uv),facet:new Float32Array(facet),exitPlanes:new Float32Array(exitPlanes)};
}
