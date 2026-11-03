"""Render only seven authorized source-based clips; leave shots 01/04/09 absent."""
from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[3]
KIT=ROOT/'marketing/brand-launch-2026-11-02'
BASE=ROOT.parent
FONT=ROOT/'assets/brand/monument-serif-bold.ttf'
STILL=KIT/'stills'; CLIPS=KIT/'clips'; QA=KIT/'qa'
LABELS=QA/'labels'; LABELS.mkdir(exist_ok=True)

def path_filter(p):return "'"+str(p).replace('\\','\\\\').replace(':','\\:').replace("'","'\\''")+"'"
def label(name,text):
 p=LABELS/(name+'.txt');p.write_text(text);return p

def title_filter(num,title,subtitle,foot='',tight=False):
 fs=58 if num==8 else 62
 title_y=42 if tight else 110;sub_y=112 if tight else 204
 titlep=label(f'{num:02d}-title',title);subp=label(f'{num:02d}-subtitle',subtitle)
 parts=[f"drawtext=fontfile={path_filter(FONT)}:textfile={path_filter(titlep)}:fontcolor=0xe8edf1:fontsize={fs}:x=80:y={title_y}",f"drawtext=fontfile={path_filter(FONT)}:textfile={path_filter(subp)}:fontcolor=0xaeb8c5:fontsize={27 if tight else 36}:x=80:y={sub_y}"]
 if not tight:parts.append('drawbox=x=80:y=282:w=126:h=3:color=0xa82335:t=fill')
 if foot:
  fp=label(f'{num:02d}-foot',foot);parts.append(f"drawtext=fontfile={path_filter(FONT)}:textfile={path_filter(fp)}:fontcolor=0x8994a4:fontsize=29:x=80:y=1798")
 return ','.join(parts)

def still_input(path):return ['-loop','1','-framerate','30','-i',str(path)]
def foreground(idx,w,h):
 return f"[{idx}:v]scale={w}:{h}:flags=lanczos,zoompan=z='1+0.012*on/89':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={w}x{h}:fps=30,setsar=1[fg{idx}]"

def encode(num,inputs,graph,title,subtitle,foot='',tight=False):
 outfile=CLIPS/f'{num:02d}.mp4'
 cmd=['ffmpeg','-v','error','-nostdin','-y','-threads','2','-filter_threads','1','-filter_complex_threads','1','-f','lavfi','-i','color=c=0x080c13:s=1080x1920:r=30:d=3']
 for i in inputs:cmd+=i
 graph+=';[composed]'+title_filter(num,title,subtitle,foot,tight)+',format=yuv420p[out]'
 cmd+=['-filter_complex',graph,'-map','[out]','-an','-sn','-dn','-frames:v','90','-r','30','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',str(outfile)]
 r=subprocess.run(cmd,capture_output=True,text=True)
 (QA/f'{num:02d}-encode.log').write_text(r.stderr)
 assert r.returncode==0,(num,r.stderr)
 probe=subprocess.run(['ffprobe','-v','error','-count_frames','-show_format','-show_streams','-of','json',str(outfile)],capture_output=True,text=True)
 assert probe.returncode==0
 info=json.loads(probe.stdout);(QA/f'{num:02d}-ffprobe.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
 videos=[s for s in info['streams'] if s['codec_type']=='video'];assert len(videos)==1
 v=videos[0];assert v['codec_name']=='h264' and v['width']==1080 and v['height']==1920 and v['r_frame_rate']=='30/1' and v['nb_read_frames']=='90'
 assert not any(s['codec_type']=='audio' for s in info['streams'])
 assert abs(float(info['format']['duration'])-3)<.001
 decode=subprocess.run(['ffmpeg','-v','error','-threads','2','-xerror','-i',str(outfile),'-map','0:v:0','-f','null','-'],capture_output=True,text=True)
 assert decode.returncode==0,(num,decode.stderr)
 result={'number':num,'path':str(outfile.relative_to(KIT)),'bytes':outfile.stat().st_size,'sha256':hashlib.sha256(outfile.read_bytes()).hexdigest(),'codec':'h264','width':1080,'height':1920,'fps':30,'frames':90,'durationSeconds':3,'audioStreams':0,'ffprobe':'PASS','fullDecode':'PASS','visualReview':'PENDING','sourcePolicy':'Only real source pixels/crops on brand background; no generated product UI.'}
 print(json.dumps(result,ensure_ascii=False),flush=True)
 return result

def render_tax_scene():
    parts=[]
    for name,text,y in [('03-filter-label','Filtrowanie spraw',580),('03-approval-label','Zatwierdzanie',1000)]:
        fp=label(name,text)
        parts.append(f"drawtext=fontfile={path_filter(FONT)}:textfile={path_filter(fp)}:fontcolor=0xc6d0da:fontsize=37:x=590:y={y}")
    graph=foreground(1,450,1042)+';'+foreground(2,410,136)+';'+foreground(3,410,110)+';[0:v][fg1]overlay=80:430[a];[a][fg2]overlay=590:650[b];[b][fg3]overlay=590:1070[c];[c]'+','.join(parts)+'[composed]'
    return encode(3,[still_input(STILL/'03-tax-sections-nav.png'),still_input(STILL/'03-tax-country-filter.png'),still_input(STILL/'03-tax-approval-control.png')],graph,'ProgressKit Tax','Sprawy · dokumenty · księgowość','Fragmenty interfejsu · lokalne QA')

def render_authorized_clips():
    out=[]
    # Mail: 45 Android frames, then45Linux provider-header frames. Neither contains correspondence/account values.
    out.append(encode(2,[still_input(STILL/'02-mail-android.png'),still_input(STILL/'02-mail-linux-header.png')],foreground(1,700,1398)+';'+foreground(2,900,256)+";[0:v][fg1]overlay=190:346:enable='lt(t,1.5)'[a];[a][fg2]overlay=90:820:enable='gte(t,1.5)'[composed]",'ProgressKit Mail','Android i Linux · rzeczywiste ekrany','Ekran startowy i fragment wyboru konta'))
    out.append(render_tax_scene())
    out.append(encode(5,[still_input(STILL/'05-community-header-filters.png')],foreground(1,900,362)+';[0:v][fg1]overlay=90:745[composed]','Lud&Pra','Odkrywanie społeczności','Rzeczywisty interfejs · lokalna wersja'))
    video=BASE/'Vaeloria/docs/verification/production-ui-propagation/redmi/candidate6/elemental-screenrecord.mp4'
    out.append(encode(6,[['-ss','3.9','-threads','2','-i',str(video)]],'[1:v]fps=30,scale=780:1734:flags=lanczos,setsar=1,setpts=PTS-STARTPTS[game];[0:v][game]overlay=150:166[composed]','Vaeloria','Rzeczywista rozgrywka · APK 6',tight=True))
    out.append(encode(7,[still_input(STILL/'07-glikemia-language.png')],foreground(1,720,1222)+';[0:v][fg1]overlay=180:410[composed]','Glikemia Premium','Osobisty dziennik pomiarów','Rzeczywisty ekran · bez danych pomiarowych'))
    out.append(encode(8,[still_input(STILL/'08-translator-neutral.png')],foreground(1,650,1288)+';[0:v][fg1]overlay=215:392[composed]','ProgressKit Translator','PL ↔ DE · rzeczywisty ekran aplikacji','Historyczny ekran wersji 0.2.0'))
    out.append(encode(10,[still_input(ROOT/'assets/brand/progressorkit-primary.png')],foreground(1,800,800)+';[0:v][fg1]overlay=140:500[composed]','ProgressKit Systems','progresskit.pl',''))
    (QA/'clips-validation.json').write_text(json.dumps({'date':'2026-11-02','status':'TECHNICAL_PASS_VISUAL_PENDING','clips':out,'clipCount':len(out),'combinedDurationSeconds':21,'missingShots':[1,4,9],'assembled30SecondPreview':False,'audio':'NONE','productionChanged':False},ensure_ascii=False,indent=2)+'\n')

if __name__ == "__main__":
    render_authorized_clips()
