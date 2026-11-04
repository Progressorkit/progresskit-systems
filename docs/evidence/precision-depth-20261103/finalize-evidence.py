from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,subprocess,statistics
out=Path(__file__).resolve().parent
root=out.parents[2]
for f,h in json.loads((out/'source-final-hashes.json').read_text()).items():
 assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f
for f,h in json.loads((out/'protected-hashes.json').read_text()).items():
 assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f
subprocess.run(['git','diff','--check'],cwd=root,check=True)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==(out/'head-before.txt').read_text().strip()
subprocess.run(['python3',str(out/'build-proof.py')],cwd=root,check=True)
qa=json.loads((out/'QA.json').read_text());assert qa['FAIL']==0 and qa['PASS']==47
videoLines=['','KOŃCOWE FILMY']
for name in ['desktop','mobile']:
 data=next(v for v in qa['videos'] if v['file']==name+'.mp4');stream=data['streams'][0]
 videoLines.append(f"{name}.mp4 — {float(data['format']['duration']):.3f} s, {stream['width']}×{stream['height']}, H.264, {stream['r_frame_rate']}.")
with (out/'ODBIOR.txt').open('a') as f:f.write('\n'.join(videoLines)+'\nKontrole przeglądarkowe: 47 PASS / 0 FAIL.\n')
names={'index.html','desktop.webm','mobile.webm','depth-review.json','source-final-hashes.json','preservation.json','QA-desktop.json','QA-mobile.json','QA-checks.json','interaction-checks.json','material-checks.json','performance-before.json','performance-after.json','performance-final.json','QA-NOTES.txt'}
class Files(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('href','src') and v and '/' not in v and (out/v).is_file():names.add(v)
Files().feed((out/'index.html').read_text())
for n in ['gallery-verification.json','video-review-desktop.png','video-review-mobile.png']:
 if (out/n).is_file():names.add(n)
names.discard('SHA256SUMS.txt')
(out/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256((out/n).read_bytes()).hexdigest()}  {n}\n' for n in sorted(names)))
(out/'git-final.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=root,text=True))
print('Verified sources, HEAD, protected hashes, QA and',len(names),'proof artifacts')
