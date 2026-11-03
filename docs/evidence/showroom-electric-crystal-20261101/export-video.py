from pathlib import Path
import json,subprocess
here=Path(__file__).resolve().parent
out=here/'final'
metadata={}
for name in ('desktop','mobile'):
    recording=json.loads((out/f'{name}-recording.json').read_text())
    assert recording['idleProof']['seconds']>=6 and not recording['errors']
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(recording['readyOffset']),'-i',str(out/f'{name}-raw.webm'),'-vf','fps=25,setpts=PTS-STARTPTS','-frames:v','375','-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(out/f'{name}-proof.mp4')],check=True)
    metadata[name]=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(out/f'{name}-proof.mp4')],text=True))
    duration=float(metadata[name]['format']['duration'])
    assert abs(duration-15)<.06,(name,duration)
    for at in (1,6,8,11):
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(at),'-i',str(out/f'{name}-proof.mp4'),'-frames:v','1',str(out/f'{name}-video-{at:02d}s.png')],check=True)
    print(name,duration,recording['idleProof'])
(out/'video-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
