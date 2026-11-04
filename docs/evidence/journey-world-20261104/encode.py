from pathlib import Path
import subprocess,json
p=Path(__file__).resolve().parent
result=[]
for name in ['desktop','mobile']:
 with (p/('encode-'+name+'.log')).open('w') as log:
  r=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-y','-i',str(p/(name+'.webm')),'-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2',str(p/(name+'.mp4'))],stdout=log,stderr=log)
 result.append({'video':name,'exit':r.returncode})
(p/'encode-status.json').write_text(json.dumps(result,indent=2))

if any(r["exit"] for r in result):raise SystemExit(1)
