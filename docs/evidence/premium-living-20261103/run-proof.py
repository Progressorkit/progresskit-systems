from pathlib import Path
import subprocess,json,time,shutil
out=Path(__file__).resolve().parent
shutil.copy2(out/'performance-after.json',out/'performance-first-pass.json')
results=[]
for name,args in [('performance',['node',str(out/'performance.cjs'),'after']),('world-checks',['node',str(out/'world-checks.cjs')]),('capture',['node',str(out/'capture.cjs')])]:
 with (out/(name+'.log')).open('w') as log:
  started=time.time();r=subprocess.run(args,stdout=log,stderr=log)
 results.append({'job':name,'exit':r.returncode,'seconds':round(time.time()-started,1)})
 (out/'proof-status.json').write_text(json.dumps({'running':True,'results':results},indent=2))
 if r.returncode:break
(out/'proof-status.json').write_text(json.dumps({'running':False,'results':results},indent=2))
