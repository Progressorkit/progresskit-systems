#!/usr/bin/env python3
"""Select unique, applicable browser checks without relabelling historical harness failures."""
from pathlib import Path
import json, datetime, hashlib
FOLDER=Path(__file__).resolve().parent
def read(name):return json.loads((FOLDER/name).read_text())
def ref(file,index,check):return {'file':file,'checkIndex':index,**check}
pre_name='pre-final-chrome-qa-report.json';life_name='lifecycle-chrome-360-390-768-1440-report.json';resume_name='lifecycle-chrome-768-global-resume-report.json';ff_name='qa-firefox-390-1440-report.json'
pre,life,resume,ff=(read(n) for n in (pre_name,life_name,resume_name,ff_name))
selected=[]
for i,c in enumerate(pre['checks']):
    if c['status']=='PASS' and c['scope'] not in ('all','fallback') and not c['name'].startswith(('Luxury ','Existing global ','Actual WebGL')):
        selected.append({'engine':'chrome','provenance':'Unaffected content/geometry/keyboard/renderer checks; later fixes only decorative shader/lifecycle and footer paint',**ref(pre_name,i,c)})
corrected={}
for name,r in ((life_name,life),(resume_name,resume)):
    for i,c in enumerate(r['checks']):corrected[c['scope'],c['name']]=ref(name,i,c)
selected.extend({'engine':'chrome',**c} for c in corrected.values())
selected.extend({'engine':'firefox',**ref(ff_name,i,c)} for i,c in enumerate(ff['checks']))
assert len({(c['engine'],c['scope'],c['name']) for c in selected})==len(selected),'Duplicate selected check'
assert all(c['status']=='PASS' for c in selected),'Unresolved selected browser failure'
capture=read('capture-chrome-report.json');correction=read('idle-proof-correction.json');video=read('video-check/report.json');guard=read('scope-integrity.json')
retained=[]
for name,r in ((pre_name,pre),(life_name,life)):
    for i,c in enumerate(r['checks']):
        if c['status']!='FAIL':continue
        newname='Core raycast and contact hit targets remain operable' if c['name']=='Core and contact hit targets remain operable' else c['name']
        replacement=next(x for x in selected if x['engine']=='chrome' and x['scope']==c['scope'] and x['name']==newname)
        retained.append({'original':ref(name,i,c),'resolution':{k:replacement[k] for k in ('file','checkIndex','scope','name','status')},'interpretation':'Original FAIL remains in its report. New execution verifies the corrected harness; no product fix was made for these assumptions.'})
versions=[]
for name,r in ((life_name,life),(resume_name,resume),(ff_name,ff)):
    versions.append({'report':name,'differencesToCaptureFreeze':[p for p,h in r['sourceAfter'].items() if capture['sourceAfter'].get(p)!=h],
        'interpretation':'Only footer::before gradient paint changed after these checks; content, geometry and behavior were unchanged. Final screenshots/videos load the final footer hash.'})
summary={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'AUTOMATED_CHECKS_PASS_VISUAL_APPROVAL_OPEN','browserChecks':{'PASS':len(selected),'FAIL':0,'BLOCKED':0,'byEngine':{e:sum(c['engine']==e for c in selected) for e in ('chrome','firefox')},'checks':selected},
    'captureChecks':{'report':'capture-chrome-report.json','PASS':capture['PASS'],'FAIL':capture['FAIL']},'framingAndTouchChecks':{'report':'idle-proof-correction.json','PASS':correction['PASS'],'FAIL':correction['FAIL']},
    'retainedHarnessFailures':retained,'sourceVersionReconciliation':versions,'sourceFreeze':capture['sourceAfter'],'scopeGuard':guard,
    'semanticGuardCounts':{k:len(v) for k,v in read('baseline.json')['homepageSemantics'].items()},
    'videoEncoding':video,'artifacts':capture['artifacts'],
    'performance':{'chrome':{'report':pre_name,'observedFPS':pre['performance'][0]['observedFPS'],'sampleSeconds':pre['performance'][0]['elapsedSeconds'],'gpu':pre['performance'][0]['gpu'],'classification':'Local hardware ANGLE sample; not a precise same-scene historical benchmark'},
        'firefox':{'report':ff_name,'observedFPS':ff['performance'][0]['observedFPS'],'sampleSeconds':ff['performance'][0]['elapsedSeconds'],'gpu':ff['performance'][0]['gpu'],'classification':'Low headless Firefox result; functional checks do not establish smooth performance; GPU timing unavailable'}},
    'limitations':['Physical mobile NOT_RUN; viewport/touch emulation only.','Owner visual review remains OPEN.','Firefox headless performance sample is low; do not claim browser-wide smoothness.','No audio enabled, form submission, Mail validation, external requests, commit, push, or publication.'],
    'ownerVisualApproval':'OPEN'}
assert guard['status']=='PASS','Protected source/semantics changed'
assert capture['FAIL']==0 and correction['FAIL']==0 and video['status']=='PASS','Proof check failure'
(FOLDER/'qa-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'browserPASS':summary['browserChecks']['PASS'],'byEngine':summary['browserChecks']['byEngine'],'capturePASS':capture['PASS'],'framingTouchPASS':correction['PASS'],'retainedHarnessFailures':len(retained),'scope':guard['status'],'sourceVersions':versions,'videos':[(v['movie'],v['metadata']['format']['duration']) for v in video['videos']]},ensure_ascii=False,indent=2))
