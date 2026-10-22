import json,urllib.request,urllib.error,concurrent.futures,datetime
from pathlib import Path
urls=['https://vaeloria.progresskit.pl/','https://github.com/Progressorkit/Maria-Salon','https://github.com/Progressorkit/marekzaworski.github.io','https://www.tiktok.com/@progresskit']
def check(url):
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 ProgressKit public-link-review'}),timeout=25) as r:
   r.read(1024); return {'url':url,'code':r.status,'finalUrl':r.url,'status':'PASS' if r.status==200 else 'FAIL'}
 except urllib.error.HTTPError as e: return {'url':url,'code':e.code,'finalUrl':e.url,'status':'BLOCKED' if e.code in (403,429) else 'FAIL'}
 except Exception as e: return {'url':url,'error':type(e).__name__,'status':'BLOCKED'}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: rows=list(pool.map(check,urls))
report={'scope':'Read-only GET of four public destinations only; HTTP reachability, not product acceptance or authentication verification','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'PASS':sum(x['status']=='PASS' for x in rows),'FAIL':sum(x['status']=='FAIL' for x in rows),'BLOCKED':sum(x['status']=='BLOCKED' for x in rows),'checks':rows}
Path('docs/evidence/visual-acceptance-v2-20261022/external-links.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
