from pathlib import Path
import subprocess,json,time
out=Path(__file__).resolve().parent
results=[]
for mode in ['desktop','mobile']:
 with (out/('walkthrough-'+mode+'-run.log')).open('w') as log:
  started=time.time();code=subprocess.call(['node',str(out/'walkthrough.cjs'),mode],stdout=log,stderr=log)
 results.append({'name':mode,'exit':code,'seconds':round(time.time()-started,2)})
 (out/'walkthrough-progress.json').write_text(json.dumps(results,indent=2))
 if code:break
