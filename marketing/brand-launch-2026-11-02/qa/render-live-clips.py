"""Encode actual browser recordings; never synthesizes a product interface."""
from pathlib import Path
import json,importlib.util,subprocess,hashlib
HERE=Path(__file__).resolve().parent;KIT=HERE.parent;ROOT=KIT.parent.parent
spec=importlib.util.spec_from_file_location('clip_render',HERE/'render-clips.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads((HERE/'live-captures.json').read_text());captures={x['name']:x for x in r['captures']}
results=[]
def inputs(name):
 c=captures[name];return [['-ss',str(c['startSeconds']),'-threads','2','-i',str(ROOT/c['raw'])]]
results.append(m.encode(1,inputs('01-core'),'[1:v]crop=836:702:32:100,fps=30,scale=960:806:flags=lanczos,setsar=1,setpts=PTS-STARTPTS[screen];[0:v][screen]overlay=60:500[composed]','ProgressKit Systems','Żywy rdzeń ekosystemu','Rzeczywista scena Three.js'))
results.append(m.encode(4,inputs('04-adivara-api'),'[1:v]crop=900:640:0:320,fps=30,setsar=1,setpts=PTS-STARTPTS[screen];[0:v][screen]overlay=90:620[composed]','Adivara','API — widok dokumentacji','Backend organizacji i kontroli dostępu'))
results.append(m.encode(9,inputs('09-code-tests'),'[1:v]fps=30,setsar=1,setpts=PTS-STARTPTS[screen];[0:v][screen]overlay=90:330[composed]','Kod i testy','Scheduler sceny · 5 PASS / 0 FAIL',''))
(HERE/'live-clips-validation.json').write_text(json.dumps({'date':'2026-11-02','clips':results,'source':'Actual recorded browser pixels, with framing/cropping/labels only.','noUIReconstruction':True},ensure_ascii=False,indent=2))
# One desktop proof, independently retained outside the public site.
c=captures['showroom-desktop'];target=ROOT/'docs/final-website-qa-20261102/showroom-proof/desktop-15s.mp4'
cmd=['ffmpeg','-v','error','-nostdin','-y','-threads','2','-ss',str(c['startSeconds']),'-i',str(ROOT/c['raw']),'-vf','fps=25,format=yuv420p','-frames:v','375','-an','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-movflags','+faststart',str(target)]
p=subprocess.run(cmd,capture_output=True,text=True);assert p.returncode==0,p.stderr
print('Desktopproof15s encoded',target,flush=True)
concat=HERE/'concat.txt';concat.write_text(''.join("file '../clips/%02d.mp4'\n"%n for n in range(1,11)))
preview=KIT/'preview/brand-v1.mp4';p=subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-f','concat','-safe','0','-i',str(concat),'-map','0:v:0','-c','copy','-an','-movflags','+faststart',str(preview)],capture_output=True,text=True);assert p.returncode==0,p.stderr
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_format','-show_streams','-of','json',str(preview)]));(HERE/'brand-v1-ffprobe.json').write_text(json.dumps(probe,ensure_ascii=False,indent=2));v=probe['streams'][0]
assert v['codec_name']=='h264' and v['width']==1080 and v['height']==1920 and v['r_frame_rate']=='30/1' and v['nb_read_frames']=='900' and len(probe['streams'])==1
assert abs(float(probe['format']['duration'])-30)<.001
p=subprocess.run(['ffmpeg','-v','error','-threads','2','-xerror','-i',str(preview),'-map','0:v:0','-f','null','-'],capture_output=True,text=True);assert p.returncode==0,p.stderr
(HERE/'preview-validation.json').write_text(json.dumps({'path':'preview/brand-v1.mp4','sha256':hashlib.sha256(preview.read_bytes()).hexdigest(),'bytes':preview.stat().st_size,'durationSeconds':30,'width':1080,'height':1920,'fps':30,'frames':900,'codec':'h264','audioStreams':0,'ffprobe':'PASS','fullDecode':'PASS','visualReview':'PENDING','ownerVisualApproval':'OPEN','published':False},indent=2));print('30s preview900framesH264silent PASS',flush=True)
