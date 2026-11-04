from pathlib import Path
import subprocess,json
p=Path(__file__).resolve().parent
results=[]
for cmd in [['node','capture.cjs'],['python3','encode.py'],['python3','build-gallery.py']]:
 name=cmd[1];cmd[1]=str(p/name)
 with (p/(name+'.log')).open('w') as log:r=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 results.append({'script':name,'exit':r.returncode});(p/'media-runner.json').write_text(json.dumps(results,indent=2))
 if r.returncode:break
