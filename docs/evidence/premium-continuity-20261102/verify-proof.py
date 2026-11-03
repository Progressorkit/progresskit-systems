#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,subprocess,datetime
OUT=Path(__file__).resolve().parent
report=json.loads((OUT/'capture-chrome-report.json').read_text())
checks=[]
for artifact in report['artifacts']:
    file=OUT/artifact['file']
    actual=hashlib.sha256(file.read_bytes()).hexdigest()
    checks.append({'name':'Artifact matches capture SHA256: '+file.name,'status':'PASS' if actual==artifact['sha256'] else 'FAIL'})
for device in ('desktop','mobile'):
    file=OUT/(device+'-full-scroll.mp4')
    p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate,nb_frames','-of','json',str(file)],capture_output=True,text=True)
    assert p.returncode==0,p.stderr
    details=json.loads(p.stdout)
    duration=float(details['format']['duration'])
    valid=20<=duration<=45 and all(s['codec_name']=='h264' for s in details['streams'])
    checks.append({'name':device+' MP4 encoding/duration/no audio','status':'PASS' if valid else 'FAIL','details':details})
    p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(file),'-f','null','-'],capture_output=True,text=True)
    checks.append({'name':device+' MP4 full software decoding','status':'PASS' if p.returncode==0 and not p.stderr.strip() else 'FAIL','errors':p.stderr})
    diagnostics=OUT/'diagnostics';diagnostics.mkdir(exist_ok=True)
    for label,at in [('first',.1),('last',duration-.3)]:
        p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(at),'-i',str(file),'-frames:v','1','-threads','2',str(diagnostics/(device+'-video-'+label+'.png'))],capture_output=True,text=True)
        assert p.returncode==0,p.stderr
result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'PASS':sum(c['status']=='PASS' for c in checks),'FAIL':sum(c['status']=='FAIL' for c in checks),'ownerVisualApproval':'OPEN','physicalMobile':'NOT_RUN'}
(OUT/'proof-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='checks'}))
assert not result['FAIL']
