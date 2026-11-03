#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,datetime
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
BEFORE=OUT/'source-before'
allowed={'assets/luxury-world.mjs','scripts/build-site.py','scripts/stage-public.py','package.json','index.html'}
checks=[]
for file in sorted(p for p in BEFORE.rglob('*') if p.is_file()):
    name=str(file.relative_to(BEFORE))
    if name in allowed:continue
    current=ROOT/name
    a=hashlib.sha256(file.read_bytes()).hexdigest();b=hashlib.sha256(current.read_bytes()).hexdigest()
    checks.append({'name':name,'status':'PASS' if a==b else 'FAIL','beforeSha256':a,'afterSha256':b})
result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'PASS':sum(c['status']=='PASS' for c in checks),'FAIL':sum(c['status']=='FAIL' for c in checks),'scope':'Approved section architecture, scene geometry, materials/controllers and base styles remain byte-identical; allowed atmosphere and new finishing layer are separate.','ownerVisualApproval':'OPEN'}
result['status']='PASS' if not result['FAIL'] else 'FAIL'
(OUT/'preserved-surfaces.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('checks','scope')}))
assert not result['FAIL']
