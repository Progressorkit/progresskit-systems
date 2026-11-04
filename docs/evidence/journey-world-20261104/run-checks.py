from pathlib import Path
import subprocess,json
p=Path(__file__).resolve().parent
results=[]
for name,args in [('browser-proof.cjs',['checks']),('interaction-checks.cjs',[]),('world-checks.cjs',[]),('controls-checks.cjs',[]),('performance.cjs',['after'])]:
 with (p/(name+'.log')).open('w') as log:
  r=subprocess.run(['node',str(p/name),*args],stdout=log,stderr=subprocess.STDOUT)
 results.append({'script':name,'exit':r.returncode});(p/'runner.json').write_text(json.dumps(results,indent=2))
