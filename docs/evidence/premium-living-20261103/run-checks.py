from pathlib import Path
import subprocess,json,time
out=Path(__file__).resolve().parent
jobs=[['node',str(out/'browser-proof.cjs'),'checks'],['node',str(out/'interaction-checks.cjs')],['node',str(out/'world-checks.cjs')],['node',str(out/'performance.cjs'),'after']]
results=[]
for args in jobs:
 name=Path(args[1]).stem
 with (out/(name+'.log')).open('w') as log:
  started=time.time()
  r=subprocess.run(args,stdout=log,stderr=log)
 results.append({'job':name,'exit':r.returncode,'seconds':round(time.time()-started,1)})
 (out/'runner-status.json').write_text(json.dumps({'running':True,'results':results},indent=2))
(out/'runner-status.json').write_text(json.dumps({'running':False,'results':results},indent=2))
