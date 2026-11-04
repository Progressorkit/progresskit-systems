from pathlib import Path
import subprocess,json,time
out=Path(__file__).resolve().parent
commands=[['node',str(out/'browser-proof.cjs'),'checks'],['node',str(out/'interaction-checks.cjs')],['node',str(out/'performance.cjs'),'after'],['node',str(out/'boundary-review.cjs')]]
results=[]
for cmd in commands:
 name=Path(cmd[1]).stem
 with (out/(name+'-run.log')).open('w') as log:
  started=time.time();code=subprocess.call(cmd,stdout=log,stderr=log)
 results.append({'name':name,'exit':code,'seconds':round(time.time()-started,2)})
 (out/'verification-progress.json').write_text(json.dumps(results,indent=2))
 if code:break
