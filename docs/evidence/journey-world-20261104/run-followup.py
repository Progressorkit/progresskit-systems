from pathlib import Path
import subprocess,json
p=Path(__file__).resolve().parent
results=[]
for name in ['controls-checks.cjs','journey-checks.cjs']:
 with (p/(name+'.log')).open('w') as log:r=subprocess.run(['node',str(p/name)],stdout=log,stderr=subprocess.STDOUT)
 results.append({'script':name,'exit':r.returncode});(p/'followup-runner.json').write_text(json.dumps(results,indent=2))
