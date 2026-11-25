/* Read-only analysis of a genuine browser take; no page/video modifications. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const input = process.argv[2];
assert(input, 'Pass take-report.json');
const take = JSON.parse(fs.readFileSync(input, 'utf8'));
const q = take.telemetry;
assert(q?.samples?.length, 'Missing source telemetry');
const samples = q.samples;
const finite = values => values.map(Number).filter(Number.isFinite);
const range = values => {
  const numbers = finite(values);
  return numbers.length ? {min:Math.min(...numbers),max:Math.max(...numbers),
    delta:Math.max(...numbers)-Math.min(...numbers),samples:numbers.length} : null;
};
const quantile = (numbers, fraction) => {
  const sorted = [...numbers].sort((a,b)=>a-b);
  return sorted.length ? sorted[Math.floor((sorted.length-1)*fraction)] : null;
};
const cadence = (start=-Infinity,end=Infinity) => {
  const values = q.cadence.filter(e=>typeof e==='number'||e.time>=start&&e.time<=end)
    .map(e=>typeof e==='number'?e:e.dt);
  return {samples:values.length,medianMs:quantile(values,.5),p95Ms:quantile(values,.95),
    maximumMs:values.length?Math.max(...values):null,
    framesAbove50ms:values.filter(v=>v>50).length,
    note:'Browser requestAnimationFrame cadence, distinct from native screencast frame rate.'};
};
const matrix = value => value?.startsWith('matrix(') ? value.slice(7,-1).split(',').map(Number) : null;
const matrixComponent11 = value => /^matrix(?:3d)?\(/.test(value??'') ? Number(value.slice(value.indexOf('(')+1).split(',')[0]) : NaN;
const click = q.inputs.find(i=>i.kind==='core-click'&&i.trusted);
const firstMotion = samples.find(s=>s.time>click?.time&&s.opening>.001);
const completed = samples.find(s=>s.time>click?.time&&s.opening>=.998);
const opening = click ? samples.filter(s=>s.time>=click.time&&s.time<=(completed?.time??Infinity)) : [];
const levitation = samples.filter(s=>s.time>=take.levitationStartedPageMs&&s.time<=take.levitationEndedPageMs);
const hover = samples.filter(s=>s.time>=take.hoverStartedPageMs&&s.time<=take.hoverEndedPageMs);
const final = samples.at(-1);
const summary = {
  mode:take.mode,takeStatus:take.status,sourceOriginEpochMs:q.origin,
  inputSourceClock:'performance.now() milliseconds relative to sourceOriginEpochMs',
  trustedCoreClick:click??null,
  heroBeforeClickMs:click?click.time-take.heroSeenAtPageMs:null,
  openingCompletedPageMs:completed?.time??null,
  firstOpticalMotionPageMs:firstMotion?.time??null,
  preparationAfterClickMs:click&&firstMotion?firstMotion.time-click.time:null,
  opticalMotionMs:firstMotion&&completed?completed.time-firstMotion.time:null,
  observedOpeningMs:completed&&click?completed.time-click.time:null,
  openingRange:range(samples.map(s=>s.opening)),
  sigilOpacity:range(samples.map(s=>s.sigil?.opacity)),
  glassOpacity:range(samples.map(s=>s.glass?.opacity)),
  wellOpacity:range(samples.map(s=>s.well?.opacity)),
  furnaceFilters:[...new Set(samples.map(s=>s.furnace?.filter).filter(Boolean))],
  furnaceBrightness:range(samples.map(s=>s.furnace?.filter.match(/brightness\(([^)]+)\)/)?.[1])),
  cameraVisibleMatrixComponent11:range(samples.filter(s=>Number(s.identity?.opacity)>.01)
    .map(s=>matrixComponent11(s.identity?.transform))),
  cameraDistinctTransforms:new Set(samples.map(s=>s.identity?.transform)).size,
  blades:Array.from({length:6},(_,index)=>{
    const values=samples.map(s=>s.blades?.[index]?.local?.transform).filter(Boolean);
    const matrices=values.map(matrix).filter(Boolean);
    return {index,distinctLocalTransforms:new Set(values).size,
      localTranslationX:range(matrices.map(m=>m[4])),localTranslationY:range(matrices.map(m=>m[5]))};
  }),
  independentBladePosesAtCompletion:completed?.blades.map(b=>b.local.transform)??[],
  levitationSourceDurationMs:take.levitationEndedPageMs-take.levitationStartedPageMs,
  crystals:(final.crystals??[]).map((c,index)=>({id:c.id,
    emergence:range(samples.map(s=>s.crystals?.[index]?.data.meshEmergence)),
    depth:range(samples.map(s=>s.crystals?.[index]?.data.depth)),
    meshDepth:range(samples.map(s=>s.crystals?.[index]?.data.meshZ)),
    idleScreenX:range(levitation.map(s=>s.crystals?.[index]?.box.x)),
    idleScreenY:range(levitation.map(s=>s.crystals?.[index]?.box.y)),
    idleMeshX:range(levitation.map(s=>s.crystals?.[index]?.data.meshX)),
    idleMeshY:range(levitation.map(s=>s.crystals?.[index]?.data.meshY)),
    finalInteractive:!c.inert})),
  bot:{flightStates:[...new Set(hover.map(s=>s.bot?.dock?.flight))].filter(Boolean),
    flightKinds:[...new Set(hover.map(s=>s.bot?.dock?.flightKind))].filter(Boolean),
    flightProgress:range(hover.map(s=>s.bot?.dock?.flightProgress)),
    screenX:range(hover.map(s=>s.bot?.box?.x)),screenY:range(hover.map(s=>s.bot?.box?.y)),
    projectionSeen: hover.some(s=>s.projection==='true'&&s.projectionProject==='taskpet'),
    openingPoses:opening.map(s=>({time:s.time,x:s.bot?.box?.x,y:s.bot?.box?.y,
      flight:s.bot?.dock?.flight,progress:s.bot?.dock?.flightProgress})),
    note:'100ms sampling measures positions and intervals; visual continuity requires inspection of the uninterrupted film.'},
  horizontalOverflow:samples.filter(s=>s.viewport?.documentWidth>s.viewport?.width).map(s=>({time:s.time,...s.viewport})),
  cadence:{all:cadence(),opening:cadence(click?.time,completed?.time),
    levitation:cadence(take.levitationStartedPageMs,take.levitationEndedPageMs)},
  telemetryReadCostMs:{median:quantile(finite(samples.map(s=>s.readCostMs)),.5),
    p95:quantile(finite(samples.map(s=>s.readCostMs)),.95)},
  noCuts:take.video?.uninterruptedProof??null,
  noUnwantedTraffic:{external:take.external.length,downloads:take.blockedDownloads.length,writes:take.writes.length},
  visualAssessment:'PENDING genuine MP4 phase-frame inspection; numeric metrics do not establish aesthetic quality.'
};
const output=path.join(path.dirname(input),'source-analysis.json');
fs.writeFileSync(output,JSON.stringify(summary,null,2));
console.log(output);
