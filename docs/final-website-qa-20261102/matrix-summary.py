"""Combine split QA coverage without treating interrupted/historical attempts as a full pass."""
import hashlib
import json
import pathlib
import sys

HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[1]
FOLDER=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else HERE/'matrix'
catalog=json.loads((ROOT/'catalog/projects.json').read_text())
ids=[p['id'] for p in catalog['projects']]
engines=['chrome','firefox'];widths=[360,390,768,1440]
summary={'status':'INCOMPLETE','catalogCount':len(ids),'catalogFeatureCount':sum(len(p['features']) for p in catalog['projects']),'catalogAsOf':catalog['asOf'],'catalogIds':ids,'expectedCaseVisits':len(ids)*len(engines)*len(widths),'runs':[],'missing':[],'sourceDifferences':[],'coverage':[],'ownerVisualApproval':'OPEN','physicalMobile':'NOT_RUN','releaseReady':False}
all_complete=True;reference=None;seen=set()
for engine in engines:
 for width in widths:
  scope=f'{engine}:{width}';file=FOLDER/f'{engine}-{width}'/'report.json'
  if not file.is_file():summary['missing'].append(str(file.relative_to(HERE)));all_complete=False;continue
  run=json.loads(file.read_text());before=run.get('sourceBefore');after=run.get('sourceAfter')
  stable=bool(before and after and before==after)
  if reference is None and stable:reference=before
  coherent=stable and before==reference
  passed=run.get('status')=='AUTOMATED_CHECKS_PASS_VISUAL_REVIEW_OPEN' and coherent
  all_complete &= passed
  entries=[c for c in run.get('checks',[]) if c.get('scope')==scope and c.get('name','').startswith('Case ')]
  for entry in entries:
   key=(engine,width,entry['name'][5:])
   if key in seen:all_complete=False
   seen.add(key);summary['coverage'].append({'engine':engine,'width':width,'id':key[2],'status':entry['status']})
  showroom=[c.get('details',{}).get('mode') for c in run.get('checks',[]) if c.get('scope')==scope and c.get('name')=='Showroom keyboard, disclosure and reduced motion']
  summary['runs'].append({'scope':scope,'artifact':str(file.relative_to(HERE)),'status':run.get('status'),'PASS':run.get('PASS'),'FAIL':run.get('FAIL'),'BLOCKED':run.get('BLOCKED'),'caseVisits':len(entries),'passedCaseVisits':sum(c['status']=='PASS' for c in entries),'sourceStable':stable,'sameFreeze':coherent,'browsers':run.get('browsers'),'showroomModes':showroom,'signals':run.get('signals',[])})
  if run.get('performance'):summary.setdefault('runtimeLimitSmoke',[]).extend(run['performance'])
expected={(engine,width,id_) for engine in engines for width in widths for id_ in ids}
summary['missingCoverage']=[{'engine':e,'width':w,'id':i} for e,w,i in sorted(expected-seen)]
summary['unexpectedCoverage']=[list(key) for key in sorted(seen-expected)]
summary['actualCaseVisits']=len(seen)
if reference:
 for file,expected_hash in reference.items():
  path=ROOT/file;actual=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
  if actual!=expected_hash:summary['sourceDifferences'].append(file)
summary['allCasesPassed']=len(seen)==len(expected) and not summary['missingCoverage'] and not summary['unexpectedCoverage'] and all(c['status']=='PASS' for c in summary['coverage'])
summary['status']='AUTOMATED_MATRIX_PASS_VISUAL_REVIEW_OPEN' if all_complete and summary['allCasesPassed'] and not summary['sourceDifferences'] else 'FAIL_OR_BLOCKED_OR_INCOMPLETE'
summary['interpretation']='Per-run totals stay separate. Only unique engine/width/project case coverage is combined; earlier interrupted attempts and historical product tests are excluded.'
(HERE/'matrix-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print({k:summary[k] for k in ['status','expectedCaseVisits','actualCaseVisits','allCasesPassed','missing','sourceDifferences']})
if summary['status']!='AUTOMATED_MATRIX_PASS_VISUAL_REVIEW_OPEN':raise SystemExit(1)
