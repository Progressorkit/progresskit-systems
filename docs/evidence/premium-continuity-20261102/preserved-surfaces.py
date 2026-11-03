#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,subprocess,datetime
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
BEFORE=OUT/'source-before'
checks=[]
def check(name,before,after):
    checks.append({'name':name,'status':'PASS' if before==after else 'FAIL','beforeSha256':hashlib.sha256(before.encode()).hexdigest(),'afterSha256':hashlib.sha256(after.encode()).hexdigest()})
def old(name):return (BEFORE/name).read_text()
def current(name):return (ROOT/name).read_text()
for name in ('assets/luxury-world.css','assets/luxury-world.mjs','assets/luxury-chapters.css'):
    check('Approved Hero and existing material base unchanged: '+name,old(name),current(name))
marker='// A light packet consumes the existing Process state.'
check('Services renderer prefix unchanged',old('assets/spatial-chapters.mjs').split(marker)[0],current('assets/spatial-chapters.mjs').split(marker)[0])
marker='    function crystalGeometry(index)'
check('Core geometry, materials, lighting and energy construction unchanged',old('assets/showroom-scene.mjs').split(marker)[0],current('assets/showroom-scene.mjs').split(marker)[0])
def core_motion(source):return source[source.index('      const baseY = compact'):source.index('      const related = crystals.find')]
check('Core motion and product lighting render block unchanged',core_motion(old('assets/showroom-scene.mjs')),core_motion(current('assets/showroom-scene.mjs')))
baseline=json.loads((OUT/'baseline.json').read_text())
for name in ('assets/showroom-3d.mjs','assets/showroom-lifecycle.mjs','assets/project-showroom.js'):
    before=baseline['git']['dirtyFileHashes'].get(name)
    after=hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
    checks.append({'name':'Showroom architecture/control unchanged: '+name,'status':'PASS' if before==after else 'FAIL','beforeSha256':before,'afterSha256':after})
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'PASS':sum(c['status']=='PASS' for c in checks),'FAIL':sum(c['status']=='FAIL' for c in checks),'ownerVisualApproval':'OPEN'}
report['status']='PASS' if not report['FAIL'] else 'FAIL'
(OUT/'preserved-surfaces.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'}))
assert not report['FAIL']
