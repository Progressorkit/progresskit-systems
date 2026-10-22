import urllib.request,urllib.error,json,hashlib,importlib.util,time
from pathlib import Path
r=Path.cwd();out=r/'docs/evidence/final-website-20261022';base='http://127.0.0.1:8099';rows=[]
def fetch(path,headers=None,method=None):
 try:
  with urllib.request.urlopen(urllib.request.Request(base+path,headers=headers or {},method=method),timeout=30) as z:return z.status,z.read(),dict(z.headers)
 except urllib.error.HTTPError as z:return z.code,z.read(),dict(z.headers)
def record(name,okay,details=''):rows.append({'name':name,'status':'PASS' if okay else 'FAIL','details':details})
spec=importlib.util.spec_from_file_location('stage',r/'scripts/stage-public.py');stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage)
for file in stage.public_files():
 code,body,h=fetch('/'+file);record('public bytes '+file,code==200 and hashlib.sha256(body).digest()==hashlib.sha256((r/file).read_bytes()).digest())
for path in ['/.git/config','/analytics/app.py','/catalog/projects.json','/.env','/templates/site.html','/docs/PROGRESSKIT_V5_MASTER_REPORT.md','/summary','/health','/api/unknown','/projekty/unknown/']:
 code,body,h=fetch(path);record('private or missing '+path,code==404,code)
for file in stage.public_files():
 if file.endswith('index.html'):
  code,body,h=fetch('/'+file[:-10]);record('directory '+file,code==200)
code,body,h=fetch('/');record('security headers',all(key in {k.lower() for k in h} for key in ['content-security-policy','x-content-type-options','x-frame-options','referrer-policy','permissions-policy']),h)
before=json.loads(fetch('/api/glikemia/downloads')[1])['downloads'];metadata=json.loads((r/'downloads/glikemia-premium.json').read_text())
code,body,h=fetch('/downloads/glikemia-premium.apk',{'Range':'bytes=0-31'});record('APK range206 without count',code==206 and len(body)==32 and json.loads(fetch('/api/glikemia/downloads')[1])['downloads']==before)
record('APK prefetch no count',fetch('/download/glikemia-premium',{'Sec-Purpose':'prefetch'})[0]==204 and json.loads(fetch('/api/glikemia/downloads')[1])['downloads']==before)
request=urllib.request.Request(base+'/download/glikemia-premium');digest=hashlib.sha256();size=0
with urllib.request.urlopen(request,timeout=30) as z:
 code=z.status
 while chunk:=z.read(1024*1024):digest.update(chunk);size+=len(chunk)
for _ in range(30):
 after=json.loads(fetch('/api/glikemia/downloads')[1])['downloads']
 if after==before+1:break
 time.sleep(.1)
record('real APK complete bytes/hash',code==200 and size==metadata['bytes'] and digest.hexdigest()==metadata['sha256'],{'bytes':size,'sha256':digest.hexdigest()})
record('real APK counter increments exactly once',after==before+1,{'before':before,'after':after})
report={'base':base,'checks':rows,'PASS':sum(x['status']=='PASS' for x in rows),'FAIL':sum(x['status']=='FAIL' for x in rows)}
(out/'http-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['PASS','FAIL']}))
raise SystemExit(report['FAIL']>0)
