const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulePromise=import('../assets/living-experience.mjs');

test('Scroll samples clamp invalid and restored positions to usable endpoints',async()=>{
  const {sampleTimeline}=await modulePromise;
  assert.equal(sampleTimeline(-100).progress,0);
  assert.equal(sampleTimeline(NaN).progress,0);
  assert.equal(sampleTimeline(999).progress,10);
  assert.equal(sampleTimeline(10).t,1);
});
test('Every scene anchor is a settled keyframe, including reverse navigation',async()=>{
  const {sampleTimeline,STOPS}=await modulePromise;
  for(const stop of [...STOPS,...STOPS.toReversed()]){
    const s=sampleTimeline(stop),index=STOPS.indexOf(stop);
    assert.equal(s.t===1?s.to:s.from,index);
    assert(s.t===0||s.t===1);
  }
});
test('Scroll transform is continuous at boundaries and has no direction or clock state',async()=>{
  const {sampleTimeline,STOPS,mix}=await modulePromise;
  const effective=p=>{const s=sampleTimeline(p);return mix(s.from,s.to,s.t);};
  for(const stop of STOPS.slice(1,-1))assert(Math.abs(effective(stop-1e-6)-effective(stop+1e-6))<1e-4);
  const forward=Array.from({length:1001},(_,i)=>sampleTimeline(i/100));
  const reverse=Array.from({length:1001},(_,i)=>sampleTimeline((1000-i)/100)).reverse();
  assert.deepEqual(forward,reverse);
});
test('Map keeps six distinct targets in both desktop and mobile choreography',async()=>{
  const {nodePose}=await modulePromise;
  for(const mobile of [false,true]){
    const poses=Array.from({length:6},(_,slot)=>nodePose(1,slot,mobile));
    assert.equal(new Set(poses.map(p=>`${p.x},${p.y}`)).size,6);
    assert(poses.every(p=>p.opacity===1&&p.scale>=1&&p.x>.1&&p.x<.9&&p.y>.1&&p.y<.9));
  }
});
test('Each immersion expands its own map object and exposes one readable media surface',async()=>{
  const {nodePose}=await modulePromise;
  for(const mobile of [false,true])for(let stage=2;stage<=6;stage++){
    const poses=Array.from({length:6},(_,slot)=>nodePose(stage,slot,mobile));
    assert.equal(poses.filter(p=>p.opacity>=.72).length,1);
    assert(poses[stage-2].scale>2);
    assert.equal(poses[stage-2].media,1);
  }
});
test('Reveal restores clickable objects before finale folds them into the core',async()=>{
  const {nodePose}=await modulePromise;
  for(const mobile of [false,true])for(let slot=0;slot<6;slot++){
    assert.equal(nodePose(7,slot,mobile).opacity,1);
    assert.equal(nodePose(8,slot,mobile).opacity,0);
  }
});

test('The shared physical carrier has continuous numeric geometry and eight matching corners',async()=>{
 const {portalPose,carrierPath,mix}=await modulePromise;
 for(let stage=0;stage<8;stage++){
  const a=portalPose(stage),b=portalPose(stage+1);
  for(let i=0;i<=20;i++){
   const t=i/20,p=Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],t)]));
   assert(Object.values(p).every(Number.isFinite));assert(p.w>0&&p.h>0);
   const path=carrierPath(p.cut);assert(path.startsWith('M'));assert(path.endsWith('Z'));assert(!path.includes('NaN'));
  }
 }
 assert.notEqual(carrierPath(portalPose(1).cut),carrierPath(portalPose(2).cut));
});
